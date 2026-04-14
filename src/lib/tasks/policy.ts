import { fromZonedTime } from "date-fns-tz";

import type { SessionUser, TemplateScope } from "@/lib/domain";
import { getAppTimezone, getTodayDateKey } from "@/lib/dates";
import { canManageTemplates } from "@/lib/permissions";

export type OccurrenceScope = {
  scope: TemplateScope;
  teamId: string;
  zoneId: string | null;
  regionId: string | null;
};

type UserScope = Pick<SessionUser, "teamId" | "zoneId" | "regionId">;

export function resolveActorScope(actor: SessionUser): OccurrenceScope {
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

export function canAccessOccurrence(
  actor: SessionUser,
  occ: OccurrenceScope,
): boolean {
  if (actor.role === "REGIONAL_LEAD" && actor.regionId) {
    return occ.regionId === actor.regionId;
  }
  if (actor.role === "ZONE_LEAD" && actor.zoneId) {
    return occ.zoneId === actor.zoneId;
  }
  return !!actor.teamId && occ.teamId === actor.teamId;
}

export function appliesToUser(
  occ: OccurrenceScope,
  user: UserScope,
): boolean {
  if (!user.teamId || occ.teamId !== user.teamId) return false;
  if (occ.scope === "TEAM") return true;
  if (occ.scope === "ZONE") {
    return !!user.zoneId && occ.zoneId === user.zoneId;
  }
  if (occ.scope === "REGION") {
    return !!user.regionId && occ.regionId === user.regionId;
  }
  return false;
}

export function canManageTemplate(
  actor: SessionUser,
  tpl: OccurrenceScope,
): boolean {
  if (!canManageTemplates(actor)) return false;
  if (actor.role === "TEAM_LEAD") {
    return !!actor.teamId && tpl.teamId === actor.teamId;
  }
  if (actor.role === "ZONE_LEAD") {
    return !!actor.zoneId && tpl.zoneId === actor.zoneId;
  }
  if (actor.role === "REGIONAL_LEAD") {
    return !!actor.regionId && tpl.regionId === actor.regionId;
  }
  return false;
}

/**
 * Check whether `now` is still within the late window for occurrence
 * `dateKey`. Comparison is done via VN timezone date keys so a client
 * clock that's a few hours off doesn't flip the decision.
 */
export function isWithinLateWindow(
  dateKey: string,
  lateWindowDays: number,
  now: Date = new Date(),
): boolean {
  const tz = getAppTimezone();
  // Midnight of occurrence date in VN, converted to UTC instant.
  const startInstant = fromZonedTime(`${dateKey}T00:00:00`, tz);
  // End is dateKey + lateWindowDays (inclusive of whole day). Compute
  // the date string of today in VN, parse it the same way.
  const todayKey = getTodayDateKey(now);
  const todayInstant = fromZonedTime(`${todayKey}T00:00:00`, tz);
  const diffDays = Math.floor(
    (todayInstant.getTime() - startInstant.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffDays >= 0 && diffDays <= lateWindowDays;
}
