import "server-only";

import type {
  SerializedUser,
  SessionUser,
} from "@/lib/domain";
import { createDeadlineAt } from "@/lib/dates";
import { assertCanProxySubmit, canManageTemplates } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  SubmissionModel,
  type SubmissionRecordModel,
  TaskOccurrenceModel,
  type TaskOccurrenceRecord,
  TaskTemplateModel,
  type TaskTemplateRecord,
  UserModel,
  type UserRecord,
  XpTransactionModel,
} from "@/lib/models";
import { listVisibleUsersForActor } from "@/lib/services/organization-service";
import { toObjectId } from "@/lib/utils/ids";
import { getLevelFromXp } from "@/lib/xp";
import { getLevelInfo } from "@/lib/level-utils";
import { safeSendTelegramMessage } from "@/lib/telegram-bot";

type TemplateSummary = {
  createdAt: string;
  deadlineTime: string;
  description: string;
  expReward: number;
  id: string;
  isActive: boolean;
  title: string;
};

type TaskCard = {
  completionCount: number;
  date: string;
  deadlineAt: string;
  description: string;
  expReward: number;
  id: string;
  myCompletionCount: number;
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
  expReward: number;
  id: string;
  myCompletionCount: number;
  roster: Array<{
    completionCount: number;
    fullName: string;
    id: string;
    role: string;
  }>;
  selectedSubject: SerializedUser;
  status: "OPEN" | "CLOSED";
  title: string;
};

function mapTemplate(record: TaskTemplateRecord): TemplateSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    deadlineTime: record.deadlineTime,
    description: record.description,
    expReward: (record as TaskTemplateRecord & { expReward: number }).expReward ?? 10,
    id: record._id.toString(),
    isActive: record.isActive,
    title: record.title,
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
    expReward: (template as TaskTemplateRecord & { expReward: number }).expReward ?? 10,
    id: occurrence._id.toString(),
    myCompletionCount: (mySubmission as SubmissionRecordModel & { completionCount?: number })?.completionCount ?? 0,
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
    expReward?: number;
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
    expReward: input.expReward ?? 10,
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

  if (
    !(actor.role === "TEAM_LEAD" && !actor.teamId) &&
    occurrence.teamId.toString() !== actor.teamId
  ) {
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

  const allTeamUsers = actor.teamId
    ? await getTeamScopedUsers(actor.teamId)
    : await getTeamScopedUsers(occurrence.teamId.toString());

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
    expReward: (template as TaskTemplateRecord & { expReward: number }).expReward ?? 10,
    id: occurrence._id.toString(),
    myCompletionCount: (selectedSubmission as SubmissionRecordModel & { completionCount?: number })?.completionCount ?? 0,
    roster: allTeamUsers.map((user) => {
      const submission = submissions.find(
        (item) => item.subjectUserId.toString() === user.id,
      );

      return {
        completionCount: (submission as SubmissionRecordModel & { completionCount?: number })?.completionCount ?? 0,
        fullName: user.fullName,
        id: user.id,
        role: user.role,
      };
    }),
    selectedSubject,
    status: occurrence.status,
    title: template.title,
  } satisfies OccurrenceDetail;
}

export async function saveSubmission(
  actor: SessionUser,
  occurrenceId: string,
  subjectUserId: string,
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

  const submission = await SubmissionModel.findOneAndUpdate(
    {
      occurrenceId: typedOccurrence._id,
      subjectUserId: typedSubject._id,
    },
    {
      $inc: { completionCount: 1 },
      $set: {
        actorUserId: toObjectId(actor.id),
        updatedAt: new Date(),
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

  const expReward = (template as TaskTemplateRecord & { expReward: number }).expReward ?? 10;

  let newLevel: number | null = null;
  let leveledUp = false;

  if (expReward > 0) {
    await XpTransactionModel.create({
      amount: expReward,
      description: `Hoàn thành: ${template.title}`,
      source: "task_completion",
      sourceId: typedOccurrence._id,
      userId: typedSubject._id,
    });

    const updatedUser = await UserModel.findByIdAndUpdate(
      typedSubject._id,
      { $inc: { totalXp: expReward } },
      { new: true },
    ).lean() as UserRecord | null;

    if (updatedUser) {
      newLevel = getLevelFromXp(updatedUser.totalXp);
      if (newLevel !== updatedUser.level) {
        leveledUp = true;
        await UserModel.updateOne(
          { _id: typedSubject._id },
          { $set: { level: newLevel } },
        );
      }
    }
  }

  await AuditLogModel.create({
    action:
      actor.id === serializedSubject.id
        ? "submission.saved"
        : "submission.proxy-saved",
    actorUserId: toObjectId(actor.id),
    entityId: submission._id.toString(),
    entityType: "Submission",
    metadata: {
      completionCount: (submission as unknown as { completionCount: number }).completionCount,
      date: typedOccurrence.date,
      occurrenceId,
    },
    subjectUserId: typedSubject._id,
  });

  if (typedSubject.telegramId) {
    const selfSubmit = actor.id === serializedSubject.id;
    const congratsText = selfSubmit
      ? `🎉 Bạn đã hoàn thành "${template.title}" — +${expReward} XP!`
      : `🎉 ${actor.fullName} đã ghi nhận "${template.title}" cho bạn — +${expReward} XP!`;

    await safeSendTelegramMessage({
      chatId: typedSubject.telegramId,
      text: congratsText,
    });

    if (leveledUp && newLevel !== null) {
      const levelInfo = getLevelInfo(
        newLevel,
        (typedSubject as UserRecord & { gender?: string }).gender,
      );
      await safeSendTelegramMessage({
        chatId: typedSubject.telegramId,
        text: `🎖 Chúc mừng! Bạn đã lên cấp ${newLevel} — ${levelInfo.nameVi}.`,
      });
    }
  }

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

export type RegionDashboardData = {
  date: string;
  occurrences: Array<{
    deadlineAt: string;
    expReward: number;
    id: string;
    status: "OPEN" | "CLOSED";
    title: string;
  }>;
  members: Array<{
    completed: number;
    fullName: string;
    id: string;
    role: string;
    status: Array<{
      completionCount: number;
      occurrenceId: string;
    }>;
  }>;
  summary: {
    completionPercent: number;
    completedSlots: number;
    memberCount: number;
    pendingSlots: number;
  };
};

export async function getRegionDashboardData(
  actor: SessionUser,
  dateKey: string,
): Promise<RegionDashboardData> {
  if (actor.role !== "REGIONAL_LEAD" || !actor.regionId || !actor.teamId) {
    throw new Error("Bạn không có khu vực để quản lý.");
  }

  await connectToDatabase();

  const [members, occurrences] = await Promise.all([
    listVisibleUsersForActor(actor),
    TaskOccurrenceModel.find({
      date: dateKey,
      teamId: toObjectId(actor.teamId),
    })
      .sort({ deadlineAt: 1 })
      .lean() as Promise<TaskOccurrenceRecord[]>,
  ]);

  const templates = (await TaskTemplateModel.find({
    _id: { $in: occurrences.map((o) => o.taskTemplateId) },
  }).lean()) as TaskTemplateRecord[];

  const templateMap = new Map(templates.map((t) => [t._id.toString(), t]));

  const submissions = (await SubmissionModel.find({
    occurrenceId: { $in: occurrences.map((o) => o._id) },
    subjectUserId: { $in: members.map((m) => toObjectId(m.id)) },
  }).lean()) as SubmissionRecordModel[];

  const occurrenceSummaries = occurrences.map((occurrence) => {
    const template = templateMap.get(occurrence.taskTemplateId.toString());
    return {
      deadlineAt: occurrence.deadlineAt.toISOString(),
      expReward:
        (template as (TaskTemplateRecord & { expReward?: number }) | undefined)
          ?.expReward ?? 10,
      id: occurrence._id.toString(),
      status: occurrence.status,
      title: template?.title ?? "(đã xoá)",
    };
  });

  const memberRows = members.map((member) => {
    const status = occurrences.map((occurrence) => {
      const submission = submissions.find(
        (s) =>
          s.occurrenceId.toString() === occurrence._id.toString() &&
          s.subjectUserId.toString() === member.id,
      );
      return {
        completionCount:
          (submission as (SubmissionRecordModel & { completionCount?: number }) | undefined)
            ?.completionCount ?? 0,
        occurrenceId: occurrence._id.toString(),
      };
    });

    const completed = status.filter((s) => s.completionCount > 0).length;

    return {
      completed,
      fullName: member.fullName,
      id: member.id,
      role: member.role,
      status,
    };
  });

  const totalSlots = occurrences.length * Math.max(members.length, 1);
  const completedSlots = memberRows.reduce((sum, row) => sum + row.completed, 0);

  return {
    date: dateKey,
    occurrences: occurrenceSummaries,
    members: memberRows,
    summary: {
      completionPercent:
        totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0,
      completedSlots,
      memberCount: members.length,
      pendingSlots: Math.max(totalSlots - completedSlots, 0),
    },
  };
}

export async function getTemplateCollectionForActor(actor: SessionUser) {
  if (!actor.teamId) {
    return [];
  }

  return getTemplatesForTeam(actor.teamId);
}

async function findActiveUserByTelegramId(telegramId: number) {
  await connectToDatabase();
  const user = (await UserModel.findOne({ telegramId }).lean()) as UserRecord | null;
  if (!user) {
    return null;
  }
  if (user.status !== "ACTIVE") {
    return user;
  }
  return user;
}

export async function getTelegramTodayDigest(
  telegramId: number,
  dateKey: string,
): Promise<string> {
  const user = await findActiveUserByTelegramId(telegramId);

  if (!user) {
    return "Bạn chưa có tài khoản trong hệ thống. Vui lòng đăng nhập qua web app trước.";
  }

  if (user.status === "PENDING") {
    return "Tài khoản của bạn đang chờ duyệt. Vui lòng liên hệ quản trị viên.";
  }

  if (user.status === "INACTIVE") {
    return "Tài khoản của bạn đã bị khóa.";
  }

  if (!user.teamId) {
    return "Bạn chưa được gán vào nhóm nào.";
  }

  const [occurrences, submissions] = await Promise.all([
    TaskOccurrenceModel.find({
      date: dateKey,
      teamId: user.teamId,
    })
      .sort({ deadlineAt: 1 })
      .lean() as Promise<TaskOccurrenceRecord[]>,
    SubmissionModel.find({
      subjectUserId: user._id,
    }).lean() as Promise<SubmissionRecordModel[]>,
  ]);

  if (occurrences.length === 0) {
    return `📅 ${dateKey}\nHôm nay chưa có nhiệm vụ nào.`;
  }

  const templates = (await TaskTemplateModel.find({
    _id: { $in: occurrences.map((o) => o.taskTemplateId) },
  }).lean()) as TaskTemplateRecord[];
  const templateMap = new Map(templates.map((t) => [t._id.toString(), t]));

  const submittedOccurrenceIds = new Set(
    submissions
      .filter((s) =>
        occurrences.some((o) => o._id.toString() === s.occurrenceId.toString()),
      )
      .map((s) => s.occurrenceId.toString()),
  );

  const lines = occurrences.map((occurrence) => {
    const template = templateMap.get(occurrence.taskTemplateId.toString());
    const title = template?.title ?? "(đã xoá)";
    const done = submittedOccurrenceIds.has(occurrence._id.toString());
    const mark = done ? "✅" : "⏳";
    return `${mark} ${title}`;
  });

  const doneCount = submittedOccurrenceIds.size;
  const total = occurrences.length;

  return [
    `📅 Nhiệm vụ hôm nay (${dateKey}) — ${doneCount}/${total}`,
    "",
    ...lines,
  ].join("\n");
}

export async function getTelegramProfile(telegramId: number): Promise<string> {
  const user = await findActiveUserByTelegramId(telegramId);

  if (!user) {
    return "Bạn chưa có tài khoản trong hệ thống.";
  }

  const totalXp = user.totalXp ?? 0;
  const level = user.level ?? getLevelFromXp(totalXp);
  const gender = (user as UserRecord & { gender?: string }).gender;
  const info = getLevelInfo(level, gender);

  return [
    `👤 ${user.fullName}`,
    `🎖 Cấp ${level} — ${info.nameVi}`,
    `⭐ Tổng XP: ${totalXp}`,
    `📌 Trạng thái: ${user.status}`,
  ].join("\n");
}

export async function getTelegramLeaderboard(
  telegramId: number,
): Promise<string> {
  const user = await findActiveUserByTelegramId(telegramId);

  if (!user) {
    return "Bạn chưa có tài khoản trong hệ thống.";
  }

  if (!user.teamId) {
    return "Bạn chưa được gán vào nhóm nào.";
  }

  const members = (await UserModel.find({
    status: "ACTIVE",
    teamId: user.teamId,
  })
    .sort({ totalXp: -1, level: -1 })
    .limit(10)
    .lean()) as UserRecord[];

  if (members.length === 0) {
    return "Chưa có thành viên nào trong bảng xếp hạng.";
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines = members.map((member, index) => {
    const marker = medals[index] ?? `${index + 1}.`;
    const isMe = member._id.toString() === user._id.toString();
    const name = isMe ? `${member.fullName} (bạn)` : member.fullName;
    return `${marker} ${name} — ${member.totalXp ?? 0} XP (Lv.${member.level ?? 1})`;
  });

  return ["🏆 Bảng xếp hạng nhóm (Top 10)", "", ...lines].join("\n");
}

export async function getSessionUserByTelegramId(
  telegramId: number,
): Promise<SessionUser | null> {
  const user = await findActiveUserByTelegramId(telegramId);
  if (!user || user.status !== "ACTIVE") {
    return null;
  }
  return {
    bio: (user as UserRecord & { bio?: string }).bio ?? "",
    fullName: user.fullName,
    gender:
      ((user as UserRecord & { gender?: string }).gender as SessionUser["gender"]) ??
      "male",
    id: user._id.toString(),
    regionId: user.regionId?.toString() || null,
    role: user.role,
    status: user.status,
    teamId: user.teamId?.toString() || null,
    telegramId: user.telegramId,
    username: user.username,
  };
}
