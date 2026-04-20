import "server-only";

import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import { safeSendWebPush } from "@/lib/notifications/web-push";
import { toObjectId } from "@/lib/utils/ids";

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

async function findTeammateUserIds(input: {
  teamId?: string | null;
  excludeUserId?: string | null;
}): Promise<string[]> {
  const teamId = input.teamId ? toObjectId(input.teamId) : null;
  if (!teamId) return [];

  const query: Record<string, unknown> = { teamId };
  if (input.excludeUserId) {
    const exclude = toObjectId(input.excludeUserId);
    if (exclude) query._id = { $ne: exclude };
  }

  const users = await UserModel.find(query).select({ _id: 1 }).lean();
  return (users as Array<{ _id: unknown }>).map((u) => String(u._id));
}

export async function notifySubmissionToGroups(input: {
  subject: {
    id?: string | null;
    fullName: string;
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

  const userIds = await findTeammateUserIds({
    teamId: input.subject.teamId,
    excludeUserId: input.subject.id,
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
    teamId?: string | null;
    zoneId?: string | null;
    regionId?: string | null;
  };
  taskTitle: string;
  targetCount: number;
  template?: string;
}): Promise<void> {
  await connectToDatabase();

  const userIds = await findTeammateUserIds({ teamId: input.scope.teamId });
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
