import "server-only";

import type { SessionUser } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  TaskTemplateModel,
  type TaskTemplateRecord,
} from "@/lib/models";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
} from "@/lib/tasks/constants";
import {
  canManageTemplate,
  resolveActorScope,
  type OccurrenceScope,
} from "@/lib/tasks/policy";
import type { TemplateSummary } from "@/lib/tasks/types";
import { toObjectId } from "@/lib/utils/ids";

function templateToScope(record: TaskTemplateRecord): OccurrenceScope {
  return {
    scope: record.scope,
    teamId: record.teamId.toString(),
    zoneId: record.zoneId?.toString() ?? null,
    regionId: record.regionId?.toString() ?? null,
  };
}

export function mapTemplate(record: TaskTemplateRecord): TemplateSummary {
  return {
    id: record._id.toString(),
    title: record.title,
    description: record.description,
    deadlineTime: record.deadlineTime,
    expReward: record.expReward ?? DEFAULT_EXP_REWARD,
    lateWindowDays: record.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    scope: record.scope,
    isActive: record.isActive,
    teamId: record.teamId.toString(),
    zoneId: record.zoneId?.toString() ?? null,
    regionId: record.regionId?.toString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export type CreateTemplateInput = {
  title: string;
  description?: string;
  deadlineTime: string;
  expReward?: number;
  lateWindowDays?: number;
  isActive?: boolean;
};

export async function createTemplate(
  actor: SessionUser,
  input: CreateTemplateInput,
): Promise<string> {
  // The actor's role determines the template's scope — we never trust an
  // inbound `scope` field, preventing a lead from creating broader
  // templates than they're authorized for.
  const actorScope = resolveActorScope(actor);

  await connectToDatabase();

  const created = await TaskTemplateModel.create({
    createdBy: toObjectId(actor.id),
    deadlineTime: input.deadlineTime,
    description: input.description?.trim() ?? "",
    expReward: input.expReward ?? DEFAULT_EXP_REWARD,
    lateWindowDays: input.lateWindowDays ?? DEFAULT_LATE_WINDOW_DAYS,
    isActive: input.isActive ?? true,
    regionId: actorScope.regionId ? toObjectId(actorScope.regionId) : null,
    scope: actorScope.scope,
    teamId: toObjectId(actorScope.teamId),
    title: input.title,
    zoneId: actorScope.zoneId ? toObjectId(actorScope.zoneId) : null,
  });

  await AuditLogModel.create({
    action: "task-template.created",
    actorUserId: toObjectId(actor.id),
    entityId: created._id.toString(),
    entityType: "TaskTemplate",
    metadata: {
      scope: actorScope.scope,
      teamId: actorScope.teamId,
      title: input.title,
    },
  });

  return created._id.toString();
}

export async function toggleTemplate(
  actor: SessionUser,
  templateId: string,
): Promise<void> {
  await connectToDatabase();

  const record = (await TaskTemplateModel.findById(
    templateId,
  ).lean()) as TaskTemplateRecord | null;

  if (!record || !canManageTemplate(actor, templateToScope(record))) {
    throw new Error("Không tìm thấy template phù hợp.");
  }

  await TaskTemplateModel.updateOne(
    { _id: record._id },
    { $set: { isActive: !record.isActive } },
  );

  await AuditLogModel.create({
    action: "task-template.toggled",
    actorUserId: toObjectId(actor.id),
    entityId: templateId,
    entityType: "TaskTemplate",
    metadata: { isActive: !record.isActive },
  });
}

export async function listTemplatesForActor(
  actor: SessionUser,
): Promise<TemplateSummary[]> {
  if (!actor.teamId) {
    return [];
  }

  await connectToDatabase();
  const all = (await TaskTemplateModel.find({
    teamId: toObjectId(actor.teamId),
  })
    .sort({ createdAt: -1 })
    .lean()) as TaskTemplateRecord[];

  const filtered = all.filter((record) => {
    if (record.scope === "TEAM") return true;
    if (record.scope === "ZONE") {
      return !!actor.zoneId && record.zoneId?.toString() === actor.zoneId;
    }
    if (record.scope === "REGION") {
      return !!actor.regionId && record.regionId?.toString() === actor.regionId;
    }
    return false;
  });

  return filtered.map(mapTemplate);
}
