import "server-only";

import mongoose from "mongoose";

import type { SessionUser } from "@/lib/domain";
import { getTodayDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
  UserModel,
  type UserRecord,
  XpTransactionModel,
} from "@/lib/models";
import { assertCanProxySubmit } from "@/lib/permissions";
import { getLevelInfo } from "@/lib/level-utils";
import { getLevelFromXp } from "@/lib/xp";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
} from "@/lib/tasks/constants";
import { appliesToUser, isWithinLateWindow } from "@/lib/tasks/policy";
import { DEFAULT_TASK_TYPE } from "@/lib/tasks/constants";
import { sumTaskCompletions, taskToScope } from "@/lib/tasks/task-service";
import { safeSendTelegramMessage } from "@/lib/telegram-bot";
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
  newLevel: number | null;
  leveledUp: boolean;
  taskJustCompleted: boolean;
};

export async function saveSubmission(
  actor: SessionUser,
  taskId: string,
  subjectUserId: string,
  dateKey: string = getTodayDateKey(),
  options: {
    notify?: boolean;
    count?: number;
    mode?: "increment" | "set";
  } = {},
): Promise<SaveSubmissionResult> {
  const shouldNotify = options.notify ?? true;
  const mode = options.mode ?? "increment";
  const rawCount = Math.floor(options.count ?? (mode === "set" ? 0 : 1));
  const count = Math.max(0, Math.min(100, rawCount));
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

  if (!appliesToUser(scope, subjectSession)) {
    throw new Error("Nhiệm vụ này không áp dụng cho người dùng đã chọn.");
  }

  assertCanProxySubmit(actor, subjectSession);

  const taskType = taskRaw.taskType ?? DEFAULT_TASK_TYPE;

  if (taskType === "COUNT_TOTAL" && taskRaw.completedAt) {
    throw new Error("Nhiệm vụ đã hoàn thành — không thể nộp thêm.");
  }

  const lateWindowDays = taskRaw.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS;
  if (!isWithinLateWindow(dateKey, lateWindowDays)) {
    throw new Error("Đã qua cửa sổ nhập bù cho nhiệm vụ này.");
  }

  const expReward = taskRaw.expReward ?? DEFAULT_EXP_REWARD;

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

    if (mode === "set" && count === 0) {
      if (!existing) {
        return {
          submissionId: "",
          completionCount: 0,
          isFirstSubmission: false,
          xpAwarded: 0,
          newLevel: null,
          leveledUp: false,
          taskJustCompleted: false,
        };
      }
      await SubmissionModel.deleteOne(filter, session ? { session } : undefined);
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
        xpAwarded: 0,
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

    if (isFirstSubmission && expReward > 0) {
      xpAwarded = expReward;
      await XpTransactionModel.create(
        [
          {
            amount: expReward,
            description: `Hoàn thành: ${taskRaw.title}`,
            source: "task_completion",
            sourceId: taskRaw._id,
            userId: subjectRaw._id,
          },
        ],
        session ? { session } : undefined,
      );

      const updatedUser = (await UserModel.findByIdAndUpdate(
        subjectRaw._id,
        { $inc: { totalXp: expReward } },
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

  if (shouldNotify) {
    void notifySubmissionToGroups({
      subject: {
        fullName: subjectRaw.fullName,
        teamId: subjectSession.teamId,
        zoneId: subjectSession.zoneId,
        regionId: subjectSession.regionId,
      },
      taskTitle: taskRaw.title,
      xpAwarded: result.xpAwarded,
      completionCount: result.completionCount,
    }).catch((err) => {
      console.error("[submission-notifier]", err);
    });

    if (result.taskJustCompleted && taskRaw.targetCount) {
      void notifyTaskCompletionToGroups({
        scope: {
          teamId: taskRaw.teamId.toString(),
          zoneId: taskRaw.zoneId?.toString() ?? null,
          regionId: taskRaw.regionId?.toString() ?? null,
        },
        taskTitle: taskRaw.title,
        targetCount: taskRaw.targetCount,
      }).catch((err) => {
        console.error("[submission-notifier]", err);
      });
    }
  }

  if (shouldNotify && subjectRaw.telegramId) {
    const selfSubmit = actor.id === subjectSession.id;
    const countSuffix =
      result.completionCount > 1 ? ` (lần ${result.completionCount})` : "";
    const xpSuffix = result.xpAwarded > 0 ? ` — +${result.xpAwarded} XP!` : "!";
    const text = selfSubmit
      ? `🎉 Bạn đã hoàn thành "${taskRaw.title}"${countSuffix}${xpSuffix}`
      : `🎉 ${actor.fullName} đã ghi nhận "${taskRaw.title}"${countSuffix} cho bạn${xpSuffix}`;
    await safeSendTelegramMessage({
      chatId: subjectRaw.telegramId,
      text,
    });

    if (result.leveledUp && result.newLevel !== null) {
      const info = getLevelInfo(result.newLevel, subjectRaw.gender);
      await safeSendTelegramMessage({
        chatId: subjectRaw.telegramId,
        text: `🎖 Chúc mừng! Bạn đã lên cấp ${result.newLevel} — ${info.nameVi}.`,
      });
    }
  }

  return result;
}
