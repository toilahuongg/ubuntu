import "server-only";

import type { Role, TaskScope } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import { safeSendWebPush } from "@/lib/notifications/web-push";
import { toObjectId } from "@/lib/utils/ids";

type NotificationUser = {
  id: string;
  role: Role;
  teamId?: string | null;
  zoneId?: string | null;
  regionId?: string | null;
};

type NotificationScope = {
  scope?: TaskScope | null;
  teamId?: string | null;
  zoneId?: string | null;
  regionId?: string | null;
};

function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

export function formatGroupSubmissionMessage(input: {
  fullName: string;
  taskTitle: string;
  xpAwarded: number;
  completionCount: number;
  template?: string;
}): string {
  if (input.template) {
    return renderTemplate(input.template, {
      name: input.fullName,
      task: input.taskTitle,
      xp: Math.max(0, Math.floor(input.xpAwarded)),
      count: input.completionCount,
    });
  }
  const xp = Math.max(0, Math.floor(input.xpAwarded));
  const countSuffix =
    input.completionCount > 1 ? ` (×${input.completionCount})` : "";
  const xpSuffix = xp > 0 ? ` (+${xp} XP)` : "";
  return `${input.fullName} vừa hoàn thành "${input.taskTitle}"${countSuffix}${xpSuffix}`;
}

function addMatchingUserIds(
  target: Set<string>,
  users: NotificationUser[],
  predicate: (user: NotificationUser) => boolean,
) {
  for (const user of users) {
    if (predicate(user)) target.add(user.id);
  }
}

export function resolveNotificationRecipientIds(input: {
  excludeUserId?: string | null;
  scope: NotificationScope;
  subjectRole?: Role | null;
  users: NotificationUser[];
}): string[] {
  const recipientIds = new Set<string>();
  const { regionId, scope, teamId, zoneId } = input.scope;

  if (teamId) {
    addMatchingUserIds(
      recipientIds,
      input.users,
      (user) => user.role === "TEAM_LEAD" && user.teamId === teamId,
    );
  }

  if (zoneId) {
    addMatchingUserIds(
      recipientIds,
      input.users,
      (user) => user.role === "ZONE_LEAD" && user.zoneId === zoneId,
    );
  }

  if (regionId) {
    addMatchingUserIds(
      recipientIds,
      input.users,
      (user) => user.role === "REGIONAL_LEAD" && user.regionId === regionId,
    );
  }

  const horizontalRole =
    input.subjectRole ??
    (scope === "TEAM"
      ? "TEAM_LEAD"
      : scope === "ZONE"
        ? "ZONE_LEAD"
        : scope === "REGION"
          ? "REGIONAL_LEAD"
          : null);

  if (horizontalRole === "TEAM_LEAD" && teamId) {
    addMatchingUserIds(
      recipientIds,
      input.users,
      (user) => user.role === "TEAM_LEAD" && user.teamId === teamId,
    );
  }

  if (horizontalRole === "ZONE_LEAD" && teamId) {
    addMatchingUserIds(
      recipientIds,
      input.users,
      (user) => user.role === "ZONE_LEAD" && user.teamId === teamId,
    );
  }

  if (horizontalRole === "REGIONAL_LEAD" && zoneId) {
    addMatchingUserIds(
      recipientIds,
      input.users,
      (user) => user.role === "REGIONAL_LEAD" && user.zoneId === zoneId,
    );
  }

  if (input.excludeUserId) {
    recipientIds.delete(input.excludeUserId);
  }

  return [...recipientIds];
}

async function findNotificationRecipientUserIds(input: {
  excludeUserId?: string | null;
  scope: NotificationScope;
  subjectRole?: Role | null;
}): Promise<string[]> {
  const teamId = input.scope.teamId ? toObjectId(input.scope.teamId) : null;
  const zoneId = input.scope.zoneId ? toObjectId(input.scope.zoneId) : null;
  const regionId = input.scope.regionId ? toObjectId(input.scope.regionId) : null;
  if (!teamId && !zoneId && !regionId) return [];

  const query = {
    $or: [
      ...(teamId ? [{ teamId }] : []),
      ...(zoneId ? [{ zoneId }] : []),
      ...(regionId ? [{ regionId }] : []),
    ],
  };

  const users = await UserModel.find(query)
    .select({ _id: 1, regionId: 1, role: 1, teamId: 1, zoneId: 1 })
    .lean();

  return resolveNotificationRecipientIds({
    excludeUserId: input.excludeUserId,
    scope: input.scope,
    subjectRole: input.subjectRole,
    users: (
      users as Array<{
        _id: unknown;
        role: Role;
        teamId?: unknown;
        zoneId?: unknown;
        regionId?: unknown;
      }>
    ).map((user) => ({
      id: String(user._id),
      role: user.role,
      teamId: user.teamId ? String(user.teamId) : null,
      zoneId: user.zoneId ? String(user.zoneId) : null,
      regionId: user.regionId ? String(user.regionId) : null,
    })),
  });
}

export async function notifySubmissionToGroups(input: {
  subject: {
    id?: string | null;
    fullName: string;
    role: Role;
    teamId?: string | null;
    zoneId?: string | null;
    regionId?: string | null;
  };
  taskTitle: string;
  xpAwarded: number;
  completionCount: number;
  template?: string;
}): Promise<void> {
  await connectToDatabase();

  const userIds = await findNotificationRecipientUserIds({
    excludeUserId: input.subject.id,
    scope: input.subject,
    subjectRole: input.subject.role,
  });
  if (userIds.length === 0) return;

  const body = formatGroupSubmissionMessage({
    fullName: input.subject.fullName,
    taskTitle: input.taskTitle,
    xpAwarded: input.xpAwarded,
    completionCount: input.completionCount,
    template: input.template,
  });

  await Promise.allSettled(
    userIds.map((userId) =>
      safeSendWebPush(userId, {
        title: "Nhiệm vụ hoàn thành",
        body,
        url: "/",
        tag: `submission:${input.subject.id ?? ""}`,
      }),
    ),
  );
}

export async function notifyTaskCompletionToGroups(input: {
  scope: {
    scope: TaskScope;
    teamId?: string | null;
    zoneId?: string | null;
    regionId?: string | null;
  };
  excludeUserId?: string | null;
  taskTitle: string;
  targetCount: number;
  template?: string;
}): Promise<void> {
  await connectToDatabase();

  const userIds = await findNotificationRecipientUserIds({
    excludeUserId: input.excludeUserId,
    scope: input.scope,
  });
  if (userIds.length === 0) return;

  const body = input.template
    ? renderTemplate(input.template, {
        task: input.taskTitle,
        target: input.targetCount,
      })
    : `Nhiệm vụ "${input.taskTitle}" đã đạt mục tiêu ${input.targetCount}!`;

  await Promise.allSettled(
    userIds.map((userId) =>
      safeSendWebPush(userId, {
        title: "Nhiệm vụ đạt mục tiêu",
        body,
        url: "/",
        tag: `task-complete:${input.scope.teamId ?? ""}`,
      }),
    ),
  );
}
