import "server-only";

import mongoose from "mongoose";

import type { SessionUser } from "@/lib/domain";
import { getTodayDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  PointTransactionModel,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
  UserModel,
  type UserRecord,
  XpTransactionModel,
  UserTaskVisibilityModel,
} from "@/lib/models";
import { assertCanProxySubmit } from "@/lib/permissions";
import {
  getDecoratedFullName,
  grantLevelUnlocks,
} from "@/lib/services/cosmetics-service";
import { getLevelFromXp } from "@/lib/xp";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
  isDailyTaskType,
  normalizeTaskType,
  type TaskType,
} from "@/lib/tasks/constants";
import { appliesToUser, isWithinLateWindow } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import {
  calculateTaskStreakBonus,
  EMPTY_TASK_STREAK_BONUS,
  type TaskStreakBonusResult,
} from "@/lib/tasks/streaks";
import { sumTaskCompletions, taskToScope } from "@/lib/tasks/task-service";
import {
  notifySubmissionToGroups,
  notifyTaskCompletionToGroups,
} from "@/lib/notifications/submission-notifier";
import { toObjectId } from "@/lib/utils/ids";

export type SaveSubmissionResult = {
  submissionId: string;
  completionCount: number;
  isFirstSubmission: boolean;
  xpAwarded: number;
  streakBonus: TaskStreakBonusResult;
  newLevel: number | null;
  leveledUp: boolean;
  taskJustCompleted: boolean;
};

type SubmissionMode = "increment" | "set";

export function clampSubmissionCountForTaskType(
  taskType: TaskType,
  requestedCount: number,
): number {
  return taskType === "DAILY_PER_MEMBER" || taskType === "MONTHLY_PER_MEMBER"
    ? Math.min(1, requestedCount)
    : requestedCount;
}

export function shouldIgnoreDuplicateSingleCompletionTask({
  existingCompletionCount,
  mode,
  taskType,
}: {
  existingCompletionCount: number;
  mode: SubmissionMode;
  taskType: TaskType;
}): boolean {
  return (
    (taskType === "DAILY_PER_MEMBER" || taskType === "MONTHLY_PER_MEMBER") &&
    mode === "increment" &&
    existingCompletionCount > 0
  );
}

export async function saveSubmission(
  actor: SessionUser,
  taskId: string,
  subjectUserId: string,
  dateKey: string = getTodayDateKey(),
  options: {
    notify?: boolean;
    count?: number;
    mode?: SubmissionMode;
  } = {},
): Promise<SaveSubmissionResult> {
  const shouldNotify = options.notify ?? true;
  const mode = options.mode ?? "increment";
  const rawCount = Math.floor(options.count ?? (mode === "set" ? 0 : 1));
  const requestedCount = Math.max(0, Math.min(100, rawCount));
  await connectToDatabase();

  const [taskRaw, subjectRaw] = await Promise.all([
    TaskModel.findById(taskId).lean() as Promise<TaskRecord | null>,
    UserModel.findById(subjectUserId).lean() as Promise<UserRecord | null>,
  ]);

  if (!taskRaw) {
    throw new Error("Nhiệm vụ không còn tồn tại.");
  }
  if (!subjectRaw) {
    throw new Error("Người dùng đích không tồn tại.");
  }

  const subjectSession: SessionUser = {
    id: subjectRaw._id.toString(),
    fullName: subjectRaw.fullName,
    role: subjectRaw.role,
    status: subjectRaw.status,
    gender: subjectRaw.gender ?? "male",
    bio: subjectRaw.bio ?? "",
    telegramId: subjectRaw.telegramId ?? null,
    username: subjectRaw.username ?? null,
    teamId: subjectRaw.teamId?.toString() ?? null,
    zoneId: subjectRaw.zoneId?.toString() ?? null,
    regionId: subjectRaw.regionId?.toString() ?? null,
  };

  const scope = taskToScope(taskRaw);

  const override = await UserTaskVisibilityModel.findOne({
    userId: toObjectId(subjectSession.id),
    taskId: taskRaw._id,
  }).lean();
  const isApplicable = override ? override.isVisible : appliesToUser(scope, subjectSession);
  if (!isApplicable) {
    throw new Error("Nhiệm vụ này không áp dụng cho người dùng đã chọn.");
  }

  assertCanProxySubmit(actor, subjectSession);

  const taskType = normalizeTaskType(taskRaw.taskType);
  const isDailyTask = isDailyTaskType(taskType);
  const count = clampSubmissionCountForTaskType(taskType, requestedCount);
  const isClearingSubmission = mode === "set" && count === 0;

  if (taskType === "COUNT_TOTAL" && taskRaw.completedAt && !isClearingSubmission) {
    throw new Error("Nhiệm vụ đã hoàn thành — không thể nộp thêm.");
  }

  const lateWindowDays = taskRaw.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS;
  if (!isTaskScheduledForDate(taskRaw, dateKey)) {
    throw new Error("Nhiệm vụ này không được lên lịch cho ngày đã chọn.");
  }
  if (!isWithinLateWindow(dateKey, lateWindowDays)) {
    throw new Error("Đã qua cửa sổ nhập bù cho nhiệm vụ này.");
  }

  const expReward = taskRaw.expReward ?? DEFAULT_EXP_REWARD;
  const pointReward = taskRaw.pointReward ?? 0;

  const supportsTransactions = (() => {
    try {
      const client = mongoose.connection.getClient();
      const topo = (client as unknown as {
        topology?: { description?: { type?: string } };
      }).topology?.description?.type;
      return topo ? topo !== "Single" : false;
    } catch {
      return false;
    }
  })();

  const runBody = async (
    session?: mongoose.ClientSession,
  ): Promise<SaveSubmissionResult> => {
    const filter = {
      date: dateKey,
      subjectUserId: subjectRaw._id,
      taskId: taskRaw._id,
    };

    const existing = (await SubmissionModel.findOne(filter)
      .session(session ?? null)
      .lean()) as SubmissionRecordModel | null;

    if (taskType === "MONTHLY_PER_MEMBER" && count > 0) {
      const yearMonth = dateKey.slice(0, 7);
      const monthSubmissions = (await SubmissionModel.find({
        completionCount: { $gt: 0 },
        date: { $regex: `^${yearMonth}` },
        subjectUserId: subjectRaw._id,
        taskId: taskRaw._id,
      })
        .session(session ?? null)
        .select({ date: 1 })
        .lean()) as Array<{ date: string }>;

      const hasOtherMonthlyCompletion = monthSubmissions.some(
        (submission) => submission.date !== dateKey,
      );
      if (hasOtherMonthlyCompletion) {
        throw new Error("Nhiệm vụ tháng đã được hoàn thành trong tháng này.");
      }
    }

    if (mode !== "set" && count === 0) {
      return {
        submissionId: existing?._id.toString() ?? "",
        completionCount: existing?.completionCount ?? 0,
        isFirstSubmission: false,
        xpAwarded: 0,
        streakBonus: EMPTY_TASK_STREAK_BONUS,
        newLevel: null,
        leveledUp: false,
        taskJustCompleted: false,
      };
    }

    if (mode === "set" && count === 0) {
      if (!existing) {
        return {
          submissionId: "",
          completionCount: 0,
          isFirstSubmission: false,
          xpAwarded: 0,
          streakBonus: EMPTY_TASK_STREAK_BONUS,
          newLevel: null,
          leveledUp: false,
          taskJustCompleted: false,
        };
      }
      await SubmissionModel.deleteOne(filter, session ? { session } : undefined);

      let newLevel: number | null = null;
      let leveledUp = false;
      if (expReward > 0 || pointReward > 0) {
        if (expReward > 0) {
          await XpTransactionModel.create(
            [
              {
                amount: -expReward,
                description: `Huỷ hoàn thành: ${taskRaw.title}`,
                source: "task_completion",
                sourceId: taskRaw._id,
                userId: subjectRaw._id,
              },
            ],
            session ? { session } : undefined,
          );
        }
        if (pointReward > 0) {
          await PointTransactionModel.create(
            [
              {
                amount: -pointReward,
                description: `Huỷ thưởng nhiệm vụ: ${taskRaw.title}`,
                source: "task_reward",
                sourceId: taskRaw._id,
                userId: subjectRaw._id,
              },
            ],
            session ? { session } : undefined,
          );
        }

        let updatedUser = (await UserModel.findByIdAndUpdate(
          subjectRaw._id,
          {
            $inc: {
              totalXp: -expReward,
              pointBalance: -pointReward,
            },
          },
          { new: true, session },
        ).lean()) as UserRecord | null;

        if (
          updatedUser &&
          (updatedUser.totalXp < 0 ||
            ((updatedUser as UserRecord & { pointBalance?: number })
              .pointBalance ?? 0) < 0)
        ) {
          updatedUser = (await UserModel.findByIdAndUpdate(
            subjectRaw._id,
            {
              $max: {
                totalXp: 0,
                pointBalance: 0,
              },
            },
            { new: true, session },
          ).lean()) as UserRecord | null;
        }

        if (updatedUser) {
          newLevel = getLevelFromXp(updatedUser.totalXp);
          if (newLevel !== updatedUser.level) {
            leveledUp = newLevel > updatedUser.level;
            await UserModel.updateOne(
              { _id: subjectRaw._id },
              { $set: { level: newLevel } },
              session ? { session } : undefined,
            );
          }
        }
      }

      if (taskType === "COUNT_TOTAL" && taskRaw.targetCount) {
        const total = await sumTaskCompletions(taskRaw._id.toString());
        if (total < taskRaw.targetCount) {
          await TaskModel.updateOne(
            { _id: taskRaw._id },
            { $set: { completedAt: null } },
            session ? { session } : undefined,
          );
        }
      }

      await AuditLogModel.create(
        [
          {
            action: "submission.cleared",
            actorUserId: toObjectId(actor.id),
            entityId: existing._id.toString(),
            entityType: "Submission",
            metadata: { date: dateKey, taskId },
            subjectUserId: subjectRaw._id,
          },
        ],
        session ? { session } : undefined,
      );
      return {
        submissionId: existing._id.toString(),
        completionCount: 0,
        isFirstSubmission: false,
        xpAwarded: -expReward,
        streakBonus: EMPTY_TASK_STREAK_BONUS,
        newLevel,
        leveledUp,
        taskJustCompleted: false,
      };
    }

    if (
      shouldIgnoreDuplicateSingleCompletionTask({
        existingCompletionCount: existing?.completionCount ?? 0,
        mode,
        taskType,
      }) &&
      existing
    ) {
      await AuditLogModel.create(
        [
          {
            action: "submission.duplicate-ignored",
            actorUserId: toObjectId(actor.id),
            entityId: existing._id.toString(),
            entityType: "Submission",
            metadata: {
              completionCount: existing.completionCount,
              date: dateKey,
              taskId,
              taskType,
            },
            subjectUserId: subjectRaw._id,
          },
        ],
        session ? { session } : undefined,
      );

      return {
        submissionId: existing._id.toString(),
        completionCount: existing.completionCount,
        isFirstSubmission: false,
        xpAwarded: 0,
        streakBonus: EMPTY_TASK_STREAK_BONUS,
        newLevel: null,
        leveledUp: false,
        taskJustCompleted: false,
      };
    }

    const isFirstSubmission = !existing;

    const updateOp =
      mode === "set"
        ? {
            $set: {
              completionCount: count,
              actorUserId: toObjectId(actor.id),
              updatedAt: new Date(),
            },
            $setOnInsert: { submittedAt: new Date() },
          }
        : {
            $inc: { completionCount: count },
            $set: {
              actorUserId: toObjectId(actor.id),
              updatedAt: new Date(),
            },
            $setOnInsert: { submittedAt: new Date() },
          };

    const updated = (await SubmissionModel.findOneAndUpdate(
      filter,
      updateOp,
      {
        new: true,
        upsert: true,
        session,
      },
    )) as unknown as SubmissionRecordModel;

    let newLevel: number | null = null;
    let leveledUp = false;
    let xpAwarded = 0;
    let streakBonus: TaskStreakBonusResult = EMPTY_TASK_STREAK_BONUS;

    const previousCount = existing?.completionCount ?? 0;
    const countAwarded = mode === "set"
      ? Math.max(0, updated.completionCount - previousCount)
      : count;

    if (countAwarded > 0 && (expReward > 0 || pointReward > 0)) {
      const totalExp = countAwarded * expReward;
      const totalPoints = countAwarded * pointReward;
      xpAwarded = totalExp;
      if (totalExp > 0) {
        await XpTransactionModel.create(
          [
            {
              amount: totalExp,
              description: `Hoàn thành: ${taskRaw.title}`,
              source: "task_completion",
              sourceId: taskRaw._id,
              userId: subjectRaw._id,
            },
          ],
          session ? { session } : undefined,
        );
      }
      if (totalPoints > 0) {
        await PointTransactionModel.create(
          [
            {
              amount: totalPoints,
              description: `Thưởng nhiệm vụ: ${taskRaw.title}`,
              source: "task_reward",
              sourceId: taskRaw._id,
              userId: subjectRaw._id,
            },
          ],
          session ? { session } : undefined,
        );
      }

      if (isDailyTask) {
        const yearMonth = dateKey.slice(0, 7);
        const monthSubmissions = (await SubmissionModel.find({
          completionCount: { $gt: 0 },
          date: { $regex: `^${yearMonth}` },
          subjectUserId: subjectRaw._id,
          taskId: taskRaw._id,
        })
          .session(session ?? null)
          .select({ date: 1 })
          .lean()) as Array<{ date: string }>;

        const nextStreakBonus = calculateTaskStreakBonus({
          completedDateKeys: monthSubmissions.map((submission) => submission.date),
          dateKey,
          expReward,
          pointReward,
          task: taskRaw,
        });

        if (nextStreakBonus.awarded && nextStreakBonus.milestone) {
          const description = `Thưởng chuỗi ${nextStreakBonus.milestone} ngày: ${taskRaw.title}`;
          const [existingXpBonus, existingPointBonus] = await Promise.all([
            XpTransactionModel.findOne({
              description,
              source: "task_streak_bonus",
              sourceId: taskRaw._id,
              userId: subjectRaw._id,
            })
              .session(session ?? null)
              .lean(),
            PointTransactionModel.findOne({
              description,
              source: "task_streak_bonus_reward",
              sourceId: taskRaw._id,
              userId: subjectRaw._id,
            })
              .session(session ?? null)
              .lean(),
          ]);

          if (!existingXpBonus && !existingPointBonus) {
            streakBonus = nextStreakBonus;
          } else {
            streakBonus = {
              ...nextStreakBonus,
              awarded: false,
              bonusExp: 0,
              bonusPoints: 0,
            };
          }
        } else {
          streakBonus = nextStreakBonus;
        }
      }

      if (streakBonus.awarded && streakBonus.bonusExp > 0) {
        await XpTransactionModel.create(
          [
            {
              amount: streakBonus.bonusExp,
              description: `Thưởng chuỗi ${streakBonus.milestone} ngày: ${taskRaw.title}`,
              source: "task_streak_bonus",
              sourceId: taskRaw._id,
              userId: subjectRaw._id,
            },
          ],
          session ? { session } : undefined,
        );
      }
      if (streakBonus.awarded && streakBonus.bonusPoints > 0) {
        await PointTransactionModel.create(
          [
            {
              amount: streakBonus.bonusPoints,
              description: `Thưởng chuỗi ${streakBonus.milestone} ngày: ${taskRaw.title}`,
              source: "task_streak_bonus_reward",
              sourceId: taskRaw._id,
              userId: subjectRaw._id,
            },
          ],
          session ? { session } : undefined,
        );
      }

      xpAwarded += streakBonus.bonusExp;

      const updatedUser = (await UserModel.findByIdAndUpdate(
        subjectRaw._id,
        {
          $inc: {
            totalXp: totalExp + streakBonus.bonusExp,
            pointBalance: totalPoints + streakBonus.bonusPoints,
          },
        },
        { new: true, session },
      ).lean()) as UserRecord | null;

      if (updatedUser) {
        newLevel = getLevelFromXp(updatedUser.totalXp);
        if (newLevel !== updatedUser.level) {
          leveledUp = true;
          await UserModel.updateOne(
            { _id: subjectRaw._id },
            { $set: { level: newLevel } },
            session ? { session } : undefined,
          );
          try {
            await grantLevelUnlocks(subjectRaw._id, newLevel, session);
          } catch (err) {
            console.error("[cosmetics] grantLevelUnlocks failed", err);
          }
        }
      }
    }

    await AuditLogModel.create(
      [
        {
          action: isFirstSubmission
            ? actor.id === subjectSession.id
              ? "submission.saved"
              : "submission.proxy-saved"
            : "submission.duplicate-ignored",
          actorUserId: toObjectId(actor.id),
          entityId: updated._id.toString(),
          entityType: "Submission",
          metadata: {
            completionCount: updated.completionCount,
            date: dateKey,
            taskId: taskId,
          },
          subjectUserId: subjectRaw._id,
        },
      ],
      session ? { session } : undefined,
    );

    let taskJustCompleted = false;
    if (
      taskType === "COUNT_TOTAL" &&
      taskRaw.targetCount &&
      !taskRaw.completedAt
    ) {
      const total = await sumTaskCompletions(taskRaw._id.toString());
      if (total >= taskRaw.targetCount) {
        const res = await TaskModel.updateOne(
          { _id: taskRaw._id, completedAt: null },
          { $set: { completedAt: new Date() } },
          session ? { session } : undefined,
        );
        if (res.modifiedCount > 0) {
          taskJustCompleted = true;
        }
      }
    }

    return {
      submissionId: updated._id.toString(),
      completionCount: updated.completionCount,
      isFirstSubmission,
      xpAwarded,
      streakBonus,
      newLevel,
      leveledUp,
      taskJustCompleted,
    };
  };

  let result: SaveSubmissionResult;
  if (supportsTransactions) {
    const session = await mongoose.startSession();
    try {
      result = await session.withTransaction(() => runBody(session));
    } finally {
      await session.endSession();
    }
  } else {
    result = await runBody();
  }

  const shouldSendNotification =
    shouldNotify &&
    !(
      (taskType === "DAILY_PER_MEMBER" || taskType === "MONTHLY_PER_MEMBER") &&
      !result.isFirstSubmission &&
      mode === "increment"
    );

  if (shouldSendNotification) {
    const decoratedSubjectName = await getDecoratedFullName(
      subjectRaw._id,
      subjectRaw.fullName,
    ).catch(() => subjectRaw.fullName);

    void notifySubmissionToGroups({
      subject: {
        id: subjectSession.id,
        fullName: decoratedSubjectName,
        role: subjectSession.role,
        teamId: subjectSession.teamId,
        zoneId: subjectSession.zoneId,
        regionId: subjectSession.regionId,
      },
      taskTitle: taskRaw.title,
      xpAwarded: result.xpAwarded,
      completionCount: result.completionCount,
      template: taskRaw.submissionMessage || undefined,
      taskType,
    }).catch((err) => {
      console.error("[submission-notifier]", err);
    });

    if (result.taskJustCompleted && taskRaw.targetCount) {
      void notifyTaskCompletionToGroups({
        excludeUserId: subjectSession.id,
        scope: {
          scope: taskRaw.scope,
          teamId: taskRaw.teamId.toString(),
          zoneId: taskRaw.zoneId?.toString() ?? null,
          regionId: taskRaw.regionId?.toString() ?? null,
        },
        taskTitle: taskRaw.title,
        targetCount: taskRaw.targetCount,
        template: taskRaw.completionMessage || undefined,
        taskType,
      }).catch((err) => {
        console.error("[submission-notifier]", err);
      });
    }
  }

  return result;
}
