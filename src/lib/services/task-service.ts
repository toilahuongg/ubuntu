import "server-only";

import type {
  SerializedUser,
  SessionUser,
  SubmissionRecord,
  TaskFieldDefinition,
} from "@/lib/domain";
import { createDeadlineAt } from "@/lib/dates";
import { assertCanProxySubmit, canManageTemplates } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  RegionModel,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskOccurrenceModel,
  type TaskOccurrenceRecord,
  TaskTemplateModel,
  type TaskTemplateRecord,
  TeamModel,
  UserModel,
  type UserRecord,
} from "@/lib/models";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import { toObjectId } from "@/lib/utils/ids";
import { validateSubmissionValues } from "@/lib/validation";

type TemplateSummary = {
  createdAt: string;
  deadlineTime: string;
  description: string;
  formSchema: TaskFieldDefinition[];
  id: string;
  isActive: boolean;
  title: string;
};

type TaskCard = {
  completionCount: number;
  date: string;
  deadlineAt: string;
  description: string;
  formSchema: TaskFieldDefinition[];
  id: string;
  mySubmissionId?: string;
  status: "OPEN" | "CLOSED";
  title: string;
  totalCount: number;
};

export type DashboardData = {
  cards: TaskCard[];
  date: string;
  highlights: {
    completionPercent: number;
    completed: number;
    pending: number;
    visibleUsers: number;
  };
  roster: Array<{
    completed: number;
    fullName: string;
    id: string;
    pending: number;
    role: string;
  }>;
  templates: TemplateSummary[];
};

export type OccurrenceDetail = {
  allowedSubjects: SerializedUser[];
  date: string;
  deadlineAt: string;
  description: string;
  formSchema: TaskFieldDefinition[];
  id: string;
  roster: Array<{
    fullName: string;
    id: string;
    role: string;
    submitted: boolean;
    submissionId?: string;
  }>;
  selectedSubmission?: {
    id: string;
    submittedAt: string;
    updatedAt: string;
    values: SubmissionRecord;
  };
  selectedSubject: SerializedUser;
  status: "OPEN" | "CLOSED";
  title: string;
};

function mapTemplate(record: TaskTemplateRecord): TemplateSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    deadlineTime: record.deadlineTime,
    description: record.description,
    formSchema: record.formSchema as TaskFieldDefinition[],
    id: record._id.toString(),
    isActive: record.isActive,
    title: record.title,
  };
}

function mapSubmission(record: SubmissionRecordModel) {
  return {
    id: record._id.toString(),
    submittedAt: record.submittedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    values: record.values as SubmissionRecord,
  };
}

function serializeOccurrenceCard(
  occurrence: TaskOccurrenceRecord,
  template: TaskTemplateRecord,
  visibleUsers: SerializedUser[],
  submissions: SubmissionRecordModel[],
  actorId: string,
): TaskCard {
  const teamSubmissions = submissions.filter(
    (submission) => submission.occurrenceId.toString() === occurrence._id.toString(),
  );
  const mySubmission = teamSubmissions.find(
    (submission) => submission.subjectUserId.toString() === actorId,
  );

  return {
    completionCount: teamSubmissions.length,
    date: occurrence.date,
    deadlineAt: occurrence.deadlineAt.toISOString(),
    description: template.description,
    formSchema: template.formSchema as TaskFieldDefinition[],
    id: occurrence._id.toString(),
    mySubmissionId: mySubmission?._id.toString(),
    status: occurrence.status,
    title: template.title,
    totalCount: visibleUsers.length,
  };
}

async function getTemplatesForTeam(teamId: string) {
  await connectToDatabase();
  const templates = (await TaskTemplateModel.find({
    teamId: toObjectId(teamId),
  })
    .sort({ createdAt: -1 })
    .lean()) as TaskTemplateRecord[];

  return templates.map(mapTemplate);
}

async function getTeamScopedUsers(teamId: string) {
  await connectToDatabase();
  const users = (await UserModel.find({
    status: "ACTIVE",
    teamId: toObjectId(teamId),
  }).lean()) as UserRecord[];

  return users.map((user) => ({
    fullName: user.fullName,
    id: user._id.toString(),
    regionId: user.regionId?.toString() || null,
    role: user.role,
    status: user.status,
    teamId: user.teamId?.toString() || null,
    telegramId: user.telegramId,
    username: user.username,
  }));
}

export async function createTaskTemplate(
  actor: SessionUser,
  input: {
    deadlineTime: string;
    description?: string;
    formSchema: TaskFieldDefinition[];
    isActive: boolean;
    title: string;
  },
) {
  if (!canManageTemplates(actor) || !actor.teamId) {
    throw new Error("Chỉ nhóm trưởng mới được tạo mẫu nhiệm vụ.");
  }

  await connectToDatabase();

  const template = await TaskTemplateModel.create({
    createdBy: toObjectId(actor.id),
    deadlineTime: input.deadlineTime,
    description: input.description || "",
    formSchema: input.formSchema,
    isActive: input.isActive,
    teamId: toObjectId(actor.teamId),
    title: input.title,
  });

  await AuditLogModel.create({
    action: "task-template.created",
    actorUserId: toObjectId(actor.id),
    entityId: template._id.toString(),
    entityType: "TaskTemplate",
    metadata: { teamId: actor.teamId, title: input.title },
  });

  return template._id.toString();
}

export async function toggleTaskTemplate(actor: SessionUser, templateId: string) {
  if (!canManageTemplates(actor) || !actor.teamId) {
    throw new Error("Bạn không có quyền đổi trạng thái template.");
  }

  await connectToDatabase();

  const template = (await TaskTemplateModel.findById(templateId)) as
    | (TaskTemplateRecord & { save: () => Promise<unknown> })
    | null;

  if (!template || template.teamId.toString() !== actor.teamId) {
    throw new Error("Không tìm thấy template phù hợp.");
  }

  template.isActive = !template.isActive;
  await template.save();

  await AuditLogModel.create({
    action: "task-template.toggled",
    actorUserId: toObjectId(actor.id),
    entityId: templateId,
    entityType: "TaskTemplate",
    metadata: { isActive: template.isActive },
  });
}

export async function generateOccurrencesForDate(dateKey: string) {
  await connectToDatabase();

  const templates = (await TaskTemplateModel.find({ isActive: true }).lean()) as TaskTemplateRecord[];

  let createdCount = 0;

  for (const template of templates) {
    const existing = (await TaskOccurrenceModel.findOne({
      date: dateKey,
      taskTemplateId: template._id,
    }).lean()) as TaskOccurrenceRecord | null;

    if (existing) {
      continue;
    }

    await TaskOccurrenceModel.create({
      date: dateKey,
      deadlineAt: createDeadlineAt(dateKey, template.deadlineTime),
      taskTemplateId: template._id,
      teamId: template.teamId,
    });

    createdCount += 1;
  }

  return { createdCount, templateCount: templates.length };
}

export async function getDashboardData(actor: SessionUser, dateKey: string) {
  await connectToDatabase();

  if (actor.role === "ADMIN") {
    const [teamCount, regionCount, userCount, occurrenceCount] = await Promise.all([
      TeamModel.countDocuments(),
      RegionModel.countDocuments(),
      UserModel.countDocuments({ status: "ACTIVE" }),
      TaskOccurrenceModel.countDocuments({ date: dateKey }),
    ]);

    return {
      cards: [],
      date: dateKey,
      highlights: {
        completed: teamCount + regionCount,
        completionPercent: 100,
        pending: occurrenceCount,
        visibleUsers: userCount,
      },
      roster: [
        {
          completed: teamCount,
          fullName: "Nhóm đang hoạt động",
          id: "teams",
          pending: 0,
          role: "Tổng quan",
        },
        {
          completed: regionCount,
          fullName: "Khu vực đã cấu hình",
          id: "regions",
          pending: 0,
          role: "Tổng quan",
        },
      ],
      templates: [],
    } satisfies DashboardData;
  }

  if (!actor.teamId) {
    throw new Error("Người dùng chưa được gán vào nhóm.");
  }

  const [visibleUsers, occurrences, templates] = await Promise.all([
    listVisibleUsersForActor(actor),
    TaskOccurrenceModel.find({ date: dateKey, teamId: toObjectId(actor.teamId) })
      .sort({ deadlineAt: 1 })
      .lean(),
    TaskTemplateModel.find({ teamId: toObjectId(actor.teamId) })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const typedOccurrences = occurrences as TaskOccurrenceRecord[];
  const typedTemplates = templates as TaskTemplateRecord[];

  const submissions = (await SubmissionModel.find({
    occurrenceId: { $in: typedOccurrences.map((occurrence) => occurrence._id) },
    subjectUserId: { $in: visibleUsers.map((user) => toObjectId(user.id)) },
  }).lean()) as SubmissionRecordModel[];

  const templateMap = new Map(typedTemplates.map((template) => [template._id.toString(), template]));

  const cards = typedOccurrences.map((occurrence) =>
    serializeOccurrenceCard(
      occurrence,
      templateMap.get(occurrence.taskTemplateId.toString())!,
      visibleUsers,
      submissions,
      actor.id,
    ),
  );

  const roster = visibleUsers.map((user) => {
    const completed = submissions.filter(
      (submission) => submission.subjectUserId.toString() === user.id,
    ).length;

    return {
      completed,
      fullName: user.fullName,
      id: user.id,
      pending: Math.max(cards.length - completed, 0),
      role: user.role,
    };
  });

  const completedSubmissions = submissions.length;
  const totalSlots = cards.length * Math.max(visibleUsers.length, 1);

  return {
    cards,
    date: dateKey,
    highlights: {
      completed: completedSubmissions,
      completionPercent:
        totalSlots > 0 ? Math.round((completedSubmissions / totalSlots) * 100) : 0,
      pending: Math.max(totalSlots - completedSubmissions, 0),
      visibleUsers: visibleUsers.length,
    },
    roster,
    templates: typedTemplates.map(mapTemplate),
  } satisfies DashboardData;
}

export async function getOccurrenceDetail(
  actor: SessionUser,
  occurrenceId: string,
  selectedSubjectId?: string,
) {
  await connectToDatabase();

  const occurrence = (await TaskOccurrenceModel.findById(occurrenceId).lean()) as
    | TaskOccurrenceRecord
    | null;

  if (!occurrence) {
    throw new Error("Không tìm thấy nhiệm vụ trong ngày.");
  }

  if (actor.role !== "ADMIN" && occurrence.teamId.toString() !== actor.teamId) {
    throw new Error("Bạn không có quyền xem nhiệm vụ này.");
  }

  const template = (await TaskTemplateModel.findById(occurrence.taskTemplateId).lean()) as
    | TaskTemplateRecord
    | null;

  if (!template) {
    throw new Error("Template của nhiệm vụ không còn tồn tại.");
  }

  const allowedSubjects = await listVisibleUsersForActor(actor);
  const selectedSubject =
    allowedSubjects.find((user) => user.id === selectedSubjectId) ||
    allowedSubjects.find((user) => user.id === actor.id) ||
    allowedSubjects[0];

  if (!selectedSubject) {
    throw new Error("Bạn chưa có đối tượng để nộp nhiệm vụ.");
  }

  const allTeamUsers =
    actor.role === "ADMIN"
      ? await getTeamScopedUsers(occurrence.teamId.toString())
      : actor.teamId
        ? await getTeamScopedUsers(actor.teamId)
        : [];

  const submissions = (await SubmissionModel.find({
    occurrenceId: occurrence._id,
  }).lean()) as SubmissionRecordModel[];

  const selectedSubmission = submissions.find(
    (submission) => submission.subjectUserId.toString() === selectedSubject.id,
  );

  return {
    allowedSubjects,
    date: occurrence.date,
    deadlineAt: occurrence.deadlineAt.toISOString(),
    description: template.description,
    formSchema: template.formSchema as TaskFieldDefinition[],
    id: occurrence._id.toString(),
    roster: allTeamUsers.map((user) => {
      const submission = submissions.find(
        (item) => item.subjectUserId.toString() === user.id,
      );

      return {
        fullName: user.fullName,
        id: user.id,
        role: user.role,
        submitted: Boolean(submission),
        submissionId: submission?._id.toString(),
      };
    }),
    selectedSubmission: selectedSubmission ? mapSubmission(selectedSubmission) : undefined,
    selectedSubject,
    status: occurrence.status,
    title: template.title,
  } satisfies OccurrenceDetail;
}

export async function saveSubmission(
  actor: SessionUser,
  occurrenceId: string,
  subjectUserId: string,
  formData: FormData,
) {
  await connectToDatabase();

  const [occurrence, subject] = await Promise.all([
    TaskOccurrenceModel.findById(occurrenceId).lean(),
    UserModel.findById(subjectUserId).lean(),
  ]);

  const typedOccurrence = occurrence as TaskOccurrenceRecord | null;
  const typedSubject = subject as UserRecord | null;

  if (!typedOccurrence) {
    throw new Error("Nhiệm vụ trong ngày không tồn tại.");
  }

  if (!typedSubject) {
    throw new Error("Người dùng đích không tồn tại.");
  }

  const serializedSubject: SerializedUser = {
    fullName: typedSubject.fullName,
    id: typedSubject._id.toString(),
    regionId: typedSubject.regionId?.toString() || null,
    role: typedSubject.role,
    status: typedSubject.status,
    teamId: typedSubject.teamId?.toString() || null,
    telegramId: typedSubject.telegramId,
    username: typedSubject.username,
  };

  if (typedOccurrence.teamId.toString() !== serializedSubject.teamId) {
    throw new Error("Người dùng này không thuộc nhóm của nhiệm vụ.");
  }

  assertCanProxySubmit(actor, serializedSubject);

  const template = (await TaskTemplateModel.findById(typedOccurrence.taskTemplateId).lean()) as
    | TaskTemplateRecord
    | null;

  if (!template) {
    throw new Error("Template gốc không còn tồn tại.");
  }

  const values = validateSubmissionValues(
    template.formSchema as TaskFieldDefinition[],
    formData,
  );

  const submission = await SubmissionModel.findOneAndUpdate(
    {
      occurrenceId: typedOccurrence._id,
      subjectUserId: typedSubject._id,
    },
    {
      $set: {
        actorUserId: toObjectId(actor.id),
        updatedAt: new Date(),
        values,
      },
      $setOnInsert: {
        submittedAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
    },
  );

  await AuditLogModel.create({
    action:
      actor.id === serializedSubject.id
        ? "submission.saved"
        : "submission.proxy-saved",
    actorUserId: toObjectId(actor.id),
    entityId: submission._id.toString(),
    entityType: "Submission",
    metadata: {
      date: typedOccurrence.date,
      occurrenceId,
      values,
    },
    subjectUserId: typedSubject._id,
  });

  return submission._id.toString();
}

export async function getReminderCandidates(dateKey: string) {
  await connectToDatabase();

  const occurrences = (await TaskOccurrenceModel.find({
    date: dateKey,
    reminderSentAt: null,
    status: "OPEN",
  }).lean()) as TaskOccurrenceRecord[];

  const reminders: Array<{
    chatId: number;
    occurrenceId: string;
    text: string;
  }> = [];

  for (const occurrence of occurrences) {
    const [template, users, submissions] = await Promise.all([
      TaskTemplateModel.findById(occurrence.taskTemplateId).lean(),
      UserModel.find({
        status: "ACTIVE",
        teamId: occurrence.teamId,
        telegramId: { $ne: null },
      }).lean(),
      SubmissionModel.find({ occurrenceId: occurrence._id }).lean(),
    ]);

    const typedTemplate = template as TaskTemplateRecord | null;
    const typedUsers = users as UserRecord[];
    const typedSubmissions = submissions as SubmissionRecordModel[];

    if (!typedTemplate) {
      continue;
    }

    for (const user of typedUsers) {
      const isSubmitted = typedSubmissions.some(
        (submission) => submission.subjectUserId.toString() === user._id.toString(),
      );

      if (!isSubmitted && user.telegramId) {
        reminders.push({
          chatId: user.telegramId,
          occurrenceId: occurrence._id.toString(),
          text: `Nhac nho: ban chua cap nhat nhiem vu "${typedTemplate.title}" cho ngay ${dateKey}. Mo WebApp de dien ngay.`,
        });
      }
    }
  }

  return reminders;
}

export async function markReminderSent(occurrenceIds: string[]) {
  if (!occurrenceIds.length) {
    return;
  }

  await connectToDatabase();
  await TaskOccurrenceModel.updateMany(
    { _id: { $in: occurrenceIds.map((value) => toObjectId(value)) } },
    { $set: { reminderSentAt: new Date() } },
  );
}

export async function getTemplateCollectionForActor(actor: SessionUser) {
  if (!actor.teamId) {
    return [];
  }

  return getTemplatesForTeam(actor.teamId);
}
