import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  DttClassTaskModel,
  type DttClassTaskRecord,
  TaskModel,
  type TaskRecord,
  SubmissionModel,
  DttEnrollmentModel,
  type SubmissionRecordModel,
} from "@/lib/models";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_POINT_REWARD,
} from "@/lib/tasks/constants";
import { computeTaskStatus } from "@/lib/tasks/task-service";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import type { TaskCard } from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

// Types for populated query results

type PopulatedClassId = { _id: Types.ObjectId; name: string };

type EnrollmentWithClass = {
  classId: PopulatedClassId;
};

type PopulatedUserId = { _id: Types.ObjectId; fullName: string; role: string };

type EnrollmentWithUser = {
  userId: PopulatedUserId;
};

type DttClassTaskWithTask = {
  taskId: TaskRecord;
  isInherited: boolean;
};

/**
 * Check if a taskId is assigned to any DTT class.
 * Pass the pre-fetched set of assigned task IDs for O(1) lookup.
 */
export function isTaskAssignedToAnyDttClass(
  taskId: string,
  assignedTaskIds: Set<string>,
): boolean {
  return assignedTaskIds.has(taskId);
}

/**
 * Get all unique task IDs for a user's enrolled classes.
 */
export function getDttClassTaskIdsForUser(
  userClasses: Array<{ classId: string }>,
  classTasksMap: Map<string, string[]>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const uc of userClasses) {
    const taskIds = classTasksMap.get(uc.classId) ?? [];
    for (const tid of taskIds) {
      if (!seen.has(tid)) {
        seen.add(tid);
        result.push(tid);
      }
    }
  }
  return result;
}

/**
 * Build a TaskCard for a DTT class task.
 * Custom tasks (isInherited: false) have pointReward = 0.
 */
export function buildClassTaskCard(
  task: TaskRecord,
  dateKey: string,
  isInherited: boolean,
  myCompletionCount: number,
): TaskCard {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    date: dateKey,
    deadlineAt: new Date(`${dateKey}T${task.deadlineTime}`).toISOString(),
    notificationTime: task.deadlineTime,
    expReward: task.expReward ?? DEFAULT_EXP_REWARD,
    pointReward: isInherited ? (task.pointReward ?? DEFAULT_POINT_REWARD) : 0,
    status: computeTaskStatus(task, dateKey),
    completionCount: 0,
    totalCount: 1,
    myCompletionCount,
    taskType: task.taskType,
    isApplicableToActor: true,
    progress: {
      kind: "DAILY_MEMBER" as const,
      current: myCompletionCount,
      target: 1,
      unitLabel: "ngày",
      isGoalMissing: false,
      isGoalComplete: myCompletionCount > 0,
    },
    weeklyCompletion: 0,
    maxPerWeek: task.maxPerWeek ?? null,
  };
}

/**
 * Load all task IDs assigned to any DTT class for the given team.
 * Returns a Set for O(1) exclusivity checks.
 */
export async function loadAllDttClassTaskIdsForTeam(
  teamId: string,
): Promise<Set<string>> {
  await connectToDatabase();
  const assignments = (await DttClassTaskModel.find({
    teamId: toObjectId(teamId),
  })
    .select("taskId")
    .lean()) as Array<Pick<DttClassTaskRecord, "_id" | "taskId">>;
  return new Set(assignments.map((a) => a.taskId.toString()));
}

/**
 * Load class -> task IDs mapping for a team.
 * Returns Map<classId, taskId[]>
 */
export async function loadClassTasksMapForTeam(
  teamId: string,
): Promise<Map<string, string[]>> {
  await connectToDatabase();
  const assignments = (await DttClassTaskModel.find({
    teamId: toObjectId(teamId),
  })
    .select("classId taskId")
    .lean()) as Array<Pick<DttClassTaskRecord, "classId" | "taskId">>;

  const map = new Map<string, string[]>();
  for (const a of assignments) {
    const classId = a.classId.toString();
    if (!map.has(classId)) map.set(classId, []);
    map.get(classId)!.push(a.taskId.toString());
  }
  return map;
}

/**
 * Get the classes a user is enrolled in.
 */
export async function getUserEnrolledClasses(
  userId: string,
  teamId: string,
): Promise<Array<{ classId: string; className: string }>> {
  await connectToDatabase();
  const enrollments = (await DttEnrollmentModel.find({
    userId: toObjectId(userId),
    teamId: toObjectId(teamId),
  })
    .populate("classId", "name")
    .lean()) as unknown as EnrollmentWithClass[];

  return enrollments.map((e) => ({
    classId: e.classId._id.toString(),
    className: e.classId.name,
  }));
}

/**
 * Build DTT class task cards for a user's dashboard.
 * Returns { cards: TaskCard[], classNames: string[] }
 */
export async function buildDttClassTaskView(
  userId: string,
  teamId: string,
  dateKey: string,
): Promise<{
  cards: TaskCard[];
  classNames: string[];
} | null> {
  await connectToDatabase();

  // 1. Find user's enrolled classes
  const enrollments = (await DttEnrollmentModel.find({
    userId: toObjectId(userId),
    teamId: toObjectId(teamId),
  })
    .populate("classId", "name")
    .lean()) as unknown as EnrollmentWithClass[];

  if (enrollments.length === 0) return null;

  const userClasses = enrollments.map((e) => ({
    classId: e.classId._id.toString(),
    className: e.classId.name,
  }));
  const classNames = userClasses.map((c) => c.className);
  const classIds = userClasses.map((c) => c.classId);

  // 2. Get task assignments for these classes
  const assignments = (await DttClassTaskModel.find({
    classId: { $in: classIds.map(toObjectId) },
    teamId: toObjectId(teamId),
  })
    .populate("taskId")
    .lean()) as unknown as DttClassTaskWithTask[];

  if (assignments.length === 0) return { cards: [], classNames };

  // Deduplicate tasks (same task may appear in multiple classes)
  const taskMap = new Map<string, boolean>(); // taskId -> isInherited
  for (const a of assignments) {
    const taskId = a.taskId._id.toString();
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, a.isInherited ?? false);
    }
  }

  // 3. Load task records
  const taskIds = Array.from(taskMap.keys()).map(toObjectId);
  const tasks = (await TaskModel.find({
    _id: { $in: taskIds },
    isActive: true,
  }).lean()) as TaskRecord[];

  const taskById = new Map(tasks.map((t) => [t._id.toString(), t]));

  // 4. Get today's submissions
  const submissions = (await SubmissionModel.find({
    date: dateKey,
    subjectUserId: toObjectId(userId),
    taskId: { $in: taskIds },
  }).lean()) as unknown as SubmissionRecordModel[];

  const submissionCount = new Map<string, number>();
  for (const s of submissions) {
    submissionCount.set(s.taskId.toString(), s.completionCount ?? 0);
  }

  // 5. Build cards
  const cards: TaskCard[] = [];
  for (const [taskId, isInherited] of taskMap) {
    const task = taskById.get(taskId);
    if (!task) continue;
    if (!isTaskScheduledForDate(task, dateKey)) continue;

    const count = submissionCount.get(taskId) ?? 0;
    cards.push(buildClassTaskCard(task, dateKey, isInherited, count));
  }

  return { cards, classNames };
}

/**
 * Build report data for a specific class on a specific date.
 */
export async function buildClassReport(
  classId: string,
  teamId: string,
  dateKey: string,
): Promise<{
  className: string;
  date: string;
  entries: Array<{
    userId: string;
    fullName: string;
    role: string;
    taskId: string;
    taskTitle: string;
    isInherited: boolean;
    completed: boolean;
    completionCount: number;
  }>;
  totalStudents: number;
  completedStudents: number;
}> {
  await connectToDatabase();

  // 1. Load class info
  const { DttClassModel } = await import("@/lib/models/dtt-class");
  const dttClass = (await DttClassModel.findById(toObjectId(classId)).lean()) as {
    _id: Types.ObjectId;
    name: string;
  } | null;
  if (!dttClass) throw new Error("Lớp học không tồn tại.");

  // 2. Load task assignments for this class
  const assignments = (await DttClassTaskModel.find({
    classId: toObjectId(classId),
    teamId: toObjectId(teamId),
  })
    .populate("taskId")
    .lean()) as unknown as DttClassTaskWithTask[];

  const taskIds = assignments.map((a) => a.taskId._id);
  const taskById = new Map(
    assignments.map((a) => [a.taskId._id.toString(), { title: a.taskId.title, isInherited: a.isInherited ?? false }])
  );

  // 3. Load enrolled students
  const enrollments = (await DttEnrollmentModel.find({
    classId: toObjectId(classId),
    teamId: toObjectId(teamId),
  })
    .populate("userId", "fullName role")
    .lean()) as unknown as EnrollmentWithUser[];

  // 4. Load submissions for today
  const submissions = taskIds.length > 0 && enrollments.length > 0
    ? (await SubmissionModel.find({
        date: dateKey,
        taskId: { $in: taskIds },
        subjectUserId: { $in: enrollments.map((e) => e.userId._id) },
      }).lean()) as unknown as SubmissionRecordModel[]
    : [];

  const submissionMap = new Map<string, Map<string, number>>();
  for (const s of submissions) {
    const userId = s.subjectUserId.toString();
    const taskId = s.taskId.toString();
    if (!submissionMap.has(userId)) submissionMap.set(userId, new Map());
    submissionMap.get(userId)!.set(taskId, s.completionCount ?? 0);
  }

  // 5. Build entries
  const entries: Array<{
    userId: string;
    fullName: string;
    role: string;
    taskId: string;
    taskTitle: string;
    isInherited: boolean;
    completed: boolean;
    completionCount: number;
  }> = [];
  let completedCount = 0;

  for (const enrollment of enrollments) {
    const userId = enrollment.userId._id.toString();
    const fullName = enrollment.userId.fullName;
    const role = enrollment.userId.role;
    const userSubs = submissionMap.get(userId) ?? new Map();

    let studentCompleted = 0;

    for (const assignment of assignments) {
      const taskId = assignment.taskId._id.toString();
      const taskInfo = taskById.get(taskId)!;
      const count = userSubs.get(taskId) ?? 0;
      const isCompleted = count > 0;
      if (isCompleted) studentCompleted++;

      entries.push({
        userId,
        fullName,
        role,
        taskId,
        taskTitle: taskInfo.title,
        isInherited: taskInfo.isInherited,
        completed: isCompleted,
        completionCount: count,
      });
    }

    if (studentCompleted === assignments.length && assignments.length > 0) {
      completedCount++;
    }
  }

  return {
    className: dttClass.name,
    date: dateKey,
    entries,
    totalStudents: enrollments.length,
    completedStudents: completedCount,
  };
}
