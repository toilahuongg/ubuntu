import "server-only";

import { connectToDatabase } from "@/lib/mongoose";
import {
  MonthlyGoalModel,
  type MonthlyGoalRecord,
  ReminderLogModel,
  type ReminderLogRecord,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
  UserModel,
  type UserRecord,
} from "@/lib/models";
import { appliesToUser } from "@/lib/tasks/policy";
import { computeTaskStatus, taskToScope } from "@/lib/tasks/task-service";
import { toObjectId } from "@/lib/utils/ids";

export type ReminderCandidate = {
  chatId: number;
  taskId: string;
  userId: string;
  text: string;
};

export type ReminderRecipient = {
  taskId: string;
  userId: string;
};

export async function getReminderCandidates(
  dateKey: string,
): Promise<ReminderCandidate[]> {
  await connectToDatabase();

  const tasks = (await TaskModel.find({
    isActive: true,
  }).lean()) as TaskRecord[];

  const openTasks = tasks.filter((t) => computeTaskStatus(t, dateKey) === "OPEN");

  if (openTasks.length === 0) return [];

  const [sentLogs, allUsers] = await Promise.all([
    ReminderLogModel.find({
      date: dateKey,
      taskId: { $in: openTasks.map((t) => t._id) },
    }).lean() as Promise<ReminderLogRecord[]>,
    UserModel.find({
      status: "ACTIVE",
      telegramId: { $ne: null },
    }).lean() as Promise<UserRecord[]>,
  ]);

  const sentPairs = new Set(
    sentLogs.map((l) => `${l.taskId.toString()}:${l.userId.toString()}`),
  );

  const submissions = (await SubmissionModel.find({
    date: dateKey,
    taskId: { $in: openTasks.map((t) => t._id) },
  }).lean()) as SubmissionRecordModel[];

  const reminders: ReminderCandidate[] = [];

  for (const task of openTasks) {
    const scope = taskToScope(task);
    const taskId = task._id.toString();
    const taskSubs = submissions.filter(
      (s) => s.taskId.toString() === taskId,
    );
    const submittedIds = new Set(
      taskSubs.map((s) => s.subjectUserId.toString()),
    );

    for (const user of allUsers) {
      const userId = user._id.toString();
      const applies = appliesToUser(scope, {
        teamId: user.teamId?.toString() ?? null,
        zoneId: user.zoneId?.toString() ?? null,
        regionId: user.regionId?.toString() ?? null,
        role: user.role,
      });
      if (!applies) continue;
      if (submittedIds.has(userId)) continue;
      if (!user.telegramId) continue;
      if (sentPairs.has(`${taskId}:${userId}`)) continue;

      reminders.push({
        chatId: user.telegramId,
        taskId,
        userId,
        text: `Nhắc nhở: bạn chưa cập nhật nhiệm vụ "${task.title}" cho ngày ${dateKey}. Mở WebApp để điền ngay.`,
      });
    }
  }

  return reminders;
}

export async function markReminderSent(
  dateKey: string,
  recipients: ReminderRecipient[],
): Promise<void> {
  if (recipients.length === 0) return;
  await connectToDatabase();
  await ReminderLogModel.bulkWrite(
    recipients.map(({ taskId, userId }) => ({
      updateOne: {
        filter: {
          date: dateKey,
          taskId: toObjectId(taskId),
          userId: toObjectId(userId),
        },
        update: {
          $setOnInsert: {
            date: dateKey,
            sentAt: new Date(),
            taskId: toObjectId(taskId),
            userId: toObjectId(userId),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

export async function getMonthlyGoalReminderCandidates(
  yearMonth: string,
): Promise<ReminderCandidate[]> {
  await connectToDatabase();

  const tasks = (await TaskModel.find({
    isActive: true,
    taskType: "MONTHLY_PER_MEMBER",
  }).lean()) as TaskRecord[];

  if (tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t._id);

  const [sentLogs, allUsers, goals] = await Promise.all([
    ReminderLogModel.find({
      date: yearMonth,
      taskId: { $in: taskIds },
    }).lean() as Promise<ReminderLogRecord[]>,
    UserModel.find({
      status: "ACTIVE",
      telegramId: { $ne: null },
    }).lean() as Promise<UserRecord[]>,
    MonthlyGoalModel.find({
      yearMonth,
      taskId: { $in: taskIds },
    }).lean() as Promise<MonthlyGoalRecord[]>,
  ]);

  const sentPairs = new Set(
    sentLogs.map((l) => `${l.taskId.toString()}:${l.userId.toString()}`),
  );
  const goalPairs = new Set(
    goals.map((g) => `${g.taskId.toString()}:${g.userId.toString()}`),
  );

  const reminders: ReminderCandidate[] = [];

  for (const task of tasks) {
    const scope = taskToScope(task);
    const taskId = task._id.toString();

    for (const user of allUsers) {
      const userId = user._id.toString();
      const applies = appliesToUser(scope, {
        teamId: user.teamId?.toString() ?? null,
        zoneId: user.zoneId?.toString() ?? null,
        regionId: user.regionId?.toString() ?? null,
        role: user.role,
      });
      if (!applies) continue;
      if (!user.telegramId) continue;
      const pairKey = `${taskId}:${userId}`;
      if (goalPairs.has(pairKey)) continue;
      if (sentPairs.has(pairKey)) continue;

      reminders.push({
        chatId: user.telegramId,
        taskId,
        userId,
        text: `Nhắc nhở: bạn chưa đặt mục tiêu tháng ${yearMonth} cho nhiệm vụ "${task.title}". Mở WebApp để cập nhật.`,
      });
    }
  }

  return reminders;
}

export async function markMonthlyGoalReminderSent(
  yearMonth: string,
  recipients: ReminderRecipient[],
): Promise<void> {
  await markReminderSent(yearMonth, recipients);
}
