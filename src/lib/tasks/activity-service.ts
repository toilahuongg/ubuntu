import "server-only";

import { getCurrentYearMonth } from "@/lib/dates";
import type { SessionUser } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import {
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
  UserModel,
  type UserRecord,
} from "@/lib/models";
import {
  listTeamMembersForViewing,
  listVisibleUsersForActor,
} from "@/lib/services/organization-service";
import { DEFAULT_EXP_REWARD } from "@/lib/tasks/constants";
import { toObjectId } from "@/lib/utils/ids";

export type ActivityEntry = {
  id: string;
  taskId: string;
  taskTitle: string;
  expReward: number;
  completionCount: number;
  submittedAt: string;
  date: string;
  subject: { id: string; fullName: string };
  actor: { id: string; fullName: string } | null;
  selfSubmitted: boolean;
};

export async function listRecentActivities(
  actor: SessionUser,
  limit = 50,
): Promise<ActivityEntry[]> {
  await connectToDatabase();

  const visibleUsers =
    actor.role === "ADMIN"
      ? await listVisibleUsersForActor(actor)
      : await listTeamMembersForViewing(actor);
  if (visibleUsers.length === 0) return [];

  const visibleIds = visibleUsers.map((u) => toObjectId(u.id));

  const submissions = (await SubmissionModel.find({
    subjectUserId: { $in: visibleIds },
  })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .lean()) as SubmissionRecordModel[];

  if (submissions.length === 0) return [];

  const taskIds = Array.from(
    new Set(submissions.map((s) => s.taskId.toString())),
  ).map(toObjectId);

  const actorIds = Array.from(
    new Set(submissions.map((s) => s.actorUserId.toString())),
  ).map(toObjectId);

  const [tasks, actors] = await Promise.all([
    TaskModel.find({ _id: { $in: taskIds } }).lean() as Promise<TaskRecord[]>,
    UserModel.find({ _id: { $in: actorIds } })
      .select({ fullName: 1 })
      .lean() as Promise<UserRecord[]>,
  ]);

  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));
  const actorMap = new Map(
    actors.map((a) => [a._id.toString(), a.fullName ?? ""]),
  );
  const subjectMap = new Map(visibleUsers.map((u) => [u.id, u.fullName]));

  return submissions.map((s) => {
    const taskId = s.taskId.toString();
    const subjectId = s.subjectUserId.toString();
    const actorId = s.actorUserId.toString();
    const task = taskMap.get(taskId);
    return {
      id: s._id.toString(),
      taskId,
      taskTitle: task?.title ?? "Nhiệm vụ đã xoá",
      expReward: task?.expReward ?? DEFAULT_EXP_REWARD,
      completionCount: s.completionCount ?? 1,
      submittedAt: (s.submittedAt ?? s.createdAt ?? new Date()).toISOString(),
      date: s.date,
      subject: {
        id: subjectId,
        fullName: subjectMap.get(subjectId) ?? "TĐ",
      },
      actor:
        actorMap.has(actorId)
          ? { id: actorId, fullName: actorMap.get(actorId) ?? "" }
          : null,
      selfSubmitted: actorId === subjectId,
    };
  });
}

export async function listTaskActivitiesThisMonth(
  actor: SessionUser,
  taskId: string,
): Promise<ActivityEntry[]> {
  await connectToDatabase();

  const yearMonth = getCurrentYearMonth();

  const visibleUsers =
    actor.role === "ADMIN"
      ? await listVisibleUsersForActor(actor)
      : await listTeamMembersForViewing(actor);

  if (visibleUsers.length === 0) return [];

  const visibleIds = visibleUsers.map((u) => toObjectId(u.id));

  const submissions = (await SubmissionModel.find({
    taskId: toObjectId(taskId),
    subjectUserId: { $in: visibleIds },
    date: { $regex: `^${yearMonth}` },
  })
    .sort({ submittedAt: -1 })
    .lean()) as SubmissionRecordModel[];

  if (submissions.length === 0) return [];

  const task = (await TaskModel.findById(taskId).lean()) as TaskRecord | null;

  const actorIds = Array.from(
    new Set(submissions.map((s) => s.actorUserId.toString())),
  ).map(toObjectId);

  const actors = (await UserModel.find({ _id: { $in: actorIds } })
    .select({ fullName: 1 })
    .lean()) as UserRecord[];

  const actorMap = new Map(
    actors.map((a) => [a._id.toString(), a.fullName ?? ""]),
  );
  const subjectMap = new Map(visibleUsers.map((u) => [u.id, u.fullName]));

  return submissions.map((s) => {
    const subjectId = s.subjectUserId.toString();
    const actorId = s.actorUserId.toString();
    return {
      id: s._id.toString(),
      taskId,
      taskTitle: task?.title ?? "Nhiệm vụ đã xoá",
      expReward: task?.expReward ?? DEFAULT_EXP_REWARD,
      completionCount: s.completionCount ?? 1,
      submittedAt: (s.submittedAt ?? s.createdAt ?? new Date()).toISOString(),
      date: s.date,
      subject: {
        id: subjectId,
        fullName: subjectMap.get(subjectId) ?? "TĐ",
      },
      actor: actorMap.has(actorId)
        ? { id: actorId, fullName: actorMap.get(actorId) ?? "" }
        : null,
      selfSubmitted: actorId === subjectId,
    };
  });
}
