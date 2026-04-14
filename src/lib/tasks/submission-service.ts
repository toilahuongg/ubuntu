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
import { taskToScope } from "@/lib/tasks/task-service";
import { safeSendTelegramMessage } from "@/lib/telegram-bot";
import { notifySubmissionToGroups } from "@/lib/notifications/submission-notifier";
import { toObjectId } from "@/lib/utils/ids";

export type SaveSubmissionResult = {
  submissionId: string;
  completionCount: number;
  isFirstSubmission: boolean;
  xpAwarded: number;
  newLevel: number | null;
  leveledUp: boolean;
};

export async function saveSubmission(
  actor: SessionUser,
  taskId: string,
  subjectUserId: string,
  dateKey: string = getTodayDateKey(),
): Promise<SaveSubmissionResult> {
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

    const isFirstSubmission = !existing;

    const updated = (await SubmissionModel.findOneAndUpdate(
      filter,
      {
        $inc: { completionCount: 1 },
        $set: {
          actorUserId: toObjectId(actor.id),
          updatedAt: new Date(),
        },
        $setOnInsert: { submittedAt: new Date() },
      },
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

    return {
      submissionId: updated._id.toString(),
      completionCount: updated.completionCount,
      isFirstSubmission,
      xpAwarded,
      newLevel,
      leveledUp,
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

  if (result.isFirstSubmission) {
    void notifySubmissionToGroups({
      subject: {
        fullName: subjectRaw.fullName,
        teamId: subjectSession.teamId,
        zoneId: subjectSession.zoneId,
        regionId: subjectSession.regionId,
      },
      taskTitle: taskRaw.title,
      xpAwarded: result.xpAwarded,
    }).catch((err) => {
      console.error("[submission-notifier]", err);
    });
  }

  if (result.isFirstSubmission && subjectRaw.telegramId) {
    const selfSubmit = actor.id === subjectSession.id;
    const text = selfSubmit
      ? `🎉 Bạn đã hoàn thành "${taskRaw.title}" — +${expReward} XP!`
      : `🎉 ${actor.fullName} đã ghi nhận "${taskRaw.title}" cho bạn — +${expReward} XP!`;
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
