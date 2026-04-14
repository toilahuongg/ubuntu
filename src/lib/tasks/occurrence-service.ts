import "server-only";

import type { SessionUser, SerializedUser } from "@/lib/domain";
import { createDeadlineAt, getTodayDateKey } from "@/lib/dates";
import { connectToDatabase } from "@/lib/mongoose";
import {
  SubmissionModel,
  type SubmissionRecordModel,
  TaskOccurrenceModel,
  type TaskOccurrenceRecord,
  TaskTemplateModel,
  type TaskTemplateRecord,
} from "@/lib/models";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
} from "@/lib/tasks/constants";
import {
  appliesToUser,
  canAccessOccurrence,
  isWithinLateWindow,
  type OccurrenceScope,
} from "@/lib/tasks/policy";
import type {
  OccurrenceDetail,
  OccurrenceStatus,
  RosterEntry,
} from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

export function occurrenceToScope(
  occurrence: Pick<
    TaskOccurrenceRecord,
    "scope" | "teamId" | "zoneId" | "regionId"
  >,
): OccurrenceScope {
  return {
    scope: occurrence.scope,
    teamId: occurrence.teamId.toString(),
    zoneId: occurrence.zoneId?.toString() ?? null,
    regionId: occurrence.regionId?.toString() ?? null,
  };
}

/**
 * Idempotent upsert-per-template. The unique index
 * (date + taskTemplateId) guarantees a duplicate insert race collapses
 * into a single document; `bulkWrite` avoids N round-trips.
 */
export async function generateOccurrencesForDate(dateKey: string) {
  await connectToDatabase();

  const templates = (await TaskTemplateModel.find({
    isActive: true,
  }).lean()) as TaskTemplateRecord[];

  if (templates.length === 0) {
    return { createdCount: 0, templateCount: 0 };
  }

  const ops = templates.map((template) => ({
    updateOne: {
      filter: { date: dateKey, taskTemplateId: template._id },
      update: {
        $setOnInsert: {
          date: dateKey,
          deadlineAt: createDeadlineAt(dateKey, template.deadlineTime),
          regionId: template.regionId ?? null,
          reminderSentAt: null,
          scope: template.scope,
          status: "OPEN" as OccurrenceStatus,
          taskTemplateId: template._id,
          teamId: template.teamId,
          zoneId: template.zoneId ?? null,
        },
      },
      upsert: true,
    },
  }));

  const result = await TaskOccurrenceModel.bulkWrite(ops, { ordered: false });
  const createdCount =
    (result.upsertedCount ?? 0) +
    Object.keys(result.upsertedIds ?? {}).length > 0
      ? (result.upsertedCount ?? Object.keys(result.upsertedIds ?? {}).length)
      : 0;

  return { createdCount, templateCount: templates.length };
}

/**
 * Scan OPEN occurrences and lock any whose `date + lateWindowDays`
 * has passed (VN timezone). Cron calls this hourly so submit handlers
 * can trust `status === "OPEN"` without re-computing the window.
 */
export async function lockOverdueOccurrences(now: Date = new Date()) {
  await connectToDatabase();

  const openOccurrences = (await TaskOccurrenceModel.find({
    status: "OPEN",
  })
    .lean()) as TaskOccurrenceRecord[];

  if (openOccurrences.length === 0) {
    return { lockedCount: 0, scannedCount: 0 };
  }

  const templates = (await TaskTemplateModel.find({
    _id: { $in: openOccurrences.map((o) => o.taskTemplateId) },
  }).lean()) as TaskTemplateRecord[];
  const templateMap = new Map(
    templates.map((t) => [t._id.toString(), t] as const),
  );

  const toLock: typeof openOccurrences = [];
  for (const occurrence of openOccurrences) {
    const template = templateMap.get(occurrence.taskTemplateId.toString());
    const windowDays = template?.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS;
    if (!isWithinLateWindow(occurrence.date, windowDays, now)) {
      toLock.push(occurrence);
    }
  }

  if (toLock.length === 0) {
    return { lockedCount: 0, scannedCount: openOccurrences.length };
  }

  const result = await TaskOccurrenceModel.updateMany(
    { _id: { $in: toLock.map((o) => o._id) } },
    { $set: { status: "LOCKED" } },
  );

  return {
    lockedCount: result.modifiedCount ?? toLock.length,
    scannedCount: openOccurrences.length,
  };
}

function userShape(user: SessionUser): Pick<
  SerializedUser,
  "teamId" | "zoneId" | "regionId"
> {
  return {
    teamId: user.teamId ?? null,
    zoneId: user.zoneId ?? null,
    regionId: user.regionId ?? null,
  };
}

export async function getOccurrenceDetail(
  actor: SessionUser,
  occurrenceId: string,
  selectedSubjectId?: string,
): Promise<OccurrenceDetail> {
  await connectToDatabase();

  const occurrence = (await TaskOccurrenceModel.findById(
    occurrenceId,
  ).lean()) as TaskOccurrenceRecord | null;
  if (!occurrence) {
    throw new Error("Không tìm thấy nhiệm vụ trong ngày.");
  }

  const occScope = occurrenceToScope(occurrence);

  if (!canAccessOccurrence(actor, occScope)) {
    throw new Error("Bạn không có quyền xem nhiệm vụ này.");
  }

  const [template, visibleUsers, submissions] = await Promise.all([
    TaskTemplateModel.findById(occurrence.taskTemplateId).lean() as Promise<
      TaskTemplateRecord | null
    >,
    listVisibleUsersForActor(actor),
    SubmissionModel.find({ occurrenceId: occurrence._id }).lean() as Promise<
      SubmissionRecordModel[]
    >,
  ]);

  if (!template) {
    throw new Error("Template của nhiệm vụ không còn tồn tại.");
  }

  const rosterMembers = visibleUsers.filter((user) =>
    appliesToUser(occScope, userShape(user)),
  );

  const selectedSubject =
    (selectedSubjectId &&
      rosterMembers.find((user) => user.id === selectedSubjectId)) ||
    rosterMembers.find((user) => user.id === actor.id) ||
    rosterMembers[0];

  if (!selectedSubject) {
    throw new Error("Bạn chưa có đối tượng để nộp nhiệm vụ.");
  }

  const selectedSubmission = submissions.find(
    (s) => s.subjectUserId.toString() === selectedSubject.id,
  );

  const roster: RosterEntry[] = rosterMembers.map((user) => {
    const sub = submissions.find(
      (s) => s.subjectUserId.toString() === user.id,
    );
    return {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      completionCount: sub?.completionCount ?? 0,
    };
  });

  return {
    id: occurrence._id.toString(),
    title: template.title,
    description: template.description,
    date: occurrence.date,
    deadlineAt: occurrence.deadlineAt.toISOString(),
    expReward: template.expReward ?? DEFAULT_EXP_REWARD,
    status: occurrence.status,
    myCompletionCount: selectedSubmission?.completionCount ?? 0,
    selectedSubject,
    rosterMembers,
    roster,
  };
}

/**
 * Force-lock a single occurrence; used when submit detects the window
 * has closed but cron hasn't caught up yet.
 */
export async function lockOccurrence(occurrenceId: string): Promise<void> {
  await connectToDatabase();
  await TaskOccurrenceModel.updateOne(
    { _id: toObjectId(occurrenceId) },
    { $set: { status: "LOCKED" } },
  );
}

export function todayDateKey() {
  return getTodayDateKey();
}
