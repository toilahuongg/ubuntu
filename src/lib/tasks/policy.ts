import { fromZonedTime } from "date-fns-tz";

import {
  normalizeTargetRoles,
  type Role,
  type SessionUser,
  type TaskScope,
  type TaskTargetRole,
} from "@/lib/domain";
import { getAppTimezone, getTodayDateKey } from "@/lib/dates";
import { canManageTasks } from "@/lib/permissions";

export type ScopeContext = {
  scope: TaskScope;
  teamId: string;
  zoneId: string | null;
  regionId: string | null;
  targetRoles?: TaskTargetRole[] | null;
  isDtt?: boolean;
};

type UserScope = Pick<SessionUser, "teamId" | "zoneId" | "regionId"> & {
  role?: Role;
  isDttUser?: boolean;
};

export function resolveActorScope(actor: SessionUser): ScopeContext {
  if (actor.role === "ADMIN") {
    throw new Error("Admin không có phạm vi mặc định để tạo nhiệm vụ.");
  }
  if (actor.role === "REGIONAL_LEAD" && actor.regionId && actor.teamId) {
    return {
      scope: "REGION",
      teamId: actor.teamId,
      zoneId: actor.zoneId ?? null,
      regionId: actor.regionId,
    };
  }
  if (actor.role === "ZONE_LEAD" && actor.zoneId && actor.teamId) {
    return {
      scope: "ZONE",
      teamId: actor.teamId,
      zoneId: actor.zoneId,
      regionId: null,
    };
  }
  if (actor.role === "TEAM_LEAD" && actor.teamId) {
    return {
      scope: "TEAM",
      teamId: actor.teamId,
      zoneId: null,
      regionId: null,
    };
  }
  throw new Error("Bạn không có phạm vi để tạo nhiệm vụ.");
}

export function appliesToUser(
  task: ScopeContext,
  user: UserScope,
): boolean {
  if (!user.teamId) return false;
  const targetRoles = normalizeTargetRoles(task.targetRoles, task.scope);
  if (user.role === "ADMIN") return false;

  // logic mới
  const roleMatches = user.role && targetRoles.includes(user.role);
  const dttMatches = !!task.isDtt && !!user.isDttUser;

  if (!roleMatches && !dttMatches) return false;

  // So khớp scope (giữ nguyên)
  if (task.scope === "TEAM") return task.teamId === user.teamId;
  if (task.scope === "ZONE") {
    if (user.role === "TEAM_LEAD") return task.teamId === user.teamId;
    return !!user.zoneId && task.zoneId === user.zoneId;
  }
  if (task.scope === "REGION") {
    if (user.role === "TEAM_LEAD") return task.teamId === user.teamId;
    if (user.role === "ZONE_LEAD") {
      return !!user.zoneId && task.zoneId === user.zoneId;
    }
    return !!user.regionId && task.regionId === user.regionId;
  }
  return false;
}

export function canManageTask(
  actor: SessionUser,
  task: ScopeContext,
): boolean {
  if (!canManageTasks(actor)) return false;
  if (actor.role === "ADMIN") return true;
  if (actor.role === "TEAM_LEAD") {
    return !!actor.teamId && task.teamId === actor.teamId;
  }
  if (actor.role === "ZONE_LEAD") {
    return !!actor.zoneId && task.zoneId === actor.zoneId;
  }
  if (actor.role === "REGIONAL_LEAD") {
    return !!actor.regionId && task.regionId === actor.regionId;
  }
  return false;
}

export function isWithinLateWindow(
  dateKey: string,
  lateWindowDays: number,
  now: Date = new Date(),
): boolean {
  const tz = getAppTimezone();
  const startInstant = fromZonedTime(`${dateKey}T00:00:00`, tz);
  const todayKey = getTodayDateKey(now);
  const todayInstant = fromZonedTime(`${todayKey}T00:00:00`, tz);
  const diffDays = Math.floor(
    (todayInstant.getTime() - startInstant.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffDays >= 0 && diffDays <= lateWindowDays;
}
