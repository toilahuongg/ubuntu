import { fromZonedTime } from "date-fns-tz";

import type { Role, SessionUser, TaskScope } from "@/lib/domain";
import { getAppTimezone, getTodayDateKey } from "@/lib/dates";
import { canManageTasks } from "@/lib/permissions";

export type ScopeContext = {
  scope: TaskScope;
  teamId: string;
  zoneId: string | null;
  regionId: string | null;
};

type UserScope = Pick<SessionUser, "teamId" | "zoneId" | "regionId"> & {
  role?: Role;
};

export function resolveActorScope(actor: SessionUser): ScopeContext {
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
