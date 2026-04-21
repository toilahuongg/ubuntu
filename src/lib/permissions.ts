import type { SessionUser } from "@/lib/domain";

function isMemberLike(user: SessionUser) {
  return user.role === "MEMBER" || user.role === "NGV";
}

export function isAdmin(user: SessionUser) {
  return user.role === "ADMIN";
}

export function isTeamLead(user: SessionUser) {
  return user.role === "TEAM_LEAD";
}

export function isZoneLead(user: SessionUser) {
  return user.role === "ZONE_LEAD";
}

export function isRegionalLead(user: SessionUser) {
  return user.role === "REGIONAL_LEAD";
}

export function canManageTasks(user: SessionUser) {
  return isAdmin(user);
}

export function canAccessManagement(user: SessionUser) {
  return isAdmin(user) || isTeamLead(user);
}

export function canAccessZoneManagement(user: SessionUser) {
  return user.role === "ZONE_LEAD" && !!user.zoneId;
}

export function canAccessRegionManagement(user: SessionUser) {
  return user.role === "REGIONAL_LEAD" && !!user.regionId;
}

export function canAccessAnalytics(user: SessionUser) {
  if (user.role === "ZONE_LEAD") return !!user.zoneId;
  if (user.role === "REGIONAL_LEAD") return !!user.regionId;
  return false;
}

export function canViewTeamDashboard(user: SessionUser) {
  return isTeamLead(user);
}

export function canManageUser(actor: SessionUser, subject: SessionUser) {
  if (isAdmin(actor)) {
    return true;
  }

  if (isTeamLead(actor)) {
    return !!actor.teamId && actor.teamId === subject.teamId;
  }

  return actor.id === subject.id;
}

export function canProxySubmit(actor: SessionUser, subject: SessionUser) {
  if (actor.id === subject.id) {
    return true;
  }

  if (actor.role === "TEAM_LEAD") {
    // Fail-closed: TEAM_LEAD must be scoped to a team to proxy-submit.
    if (!actor.teamId) {
      return false;
    }
    return actor.teamId === subject.teamId;
  }

  if (actor.role === "ZONE_LEAD" && actor.zoneId) {
    if (
      subject.role !== "REGIONAL_LEAD" &&
      subject.role !== "NGV" &&
      subject.role !== "MEMBER"
    ) {
      return false;
    }
    return actor.zoneId === subject.zoneId;
  }

  if (actor.role === "REGIONAL_LEAD" && actor.regionId) {
    if (!isMemberLike(subject)) {
      return false;
    }
    return actor.regionId === subject.regionId;
  }

  return false;
}

export function assertCanProxySubmit(actor: SessionUser, subject: SessionUser) {
  if (!canProxySubmit(actor, subject)) {
    throw new Error("Bạn không có quyền nộp thay người này.");
  }
}

export function canManageTeamTelegram(actor: SessionUser, teamId: string) {
  if (isAdmin(actor)) return true;
  return isTeamLead(actor) && !!actor.teamId && actor.teamId === teamId;
}

export function canManageZoneTelegram(
  actor: SessionUser,
  zone: { id: string; teamId: string },
) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor)) {
    return !!actor.teamId && actor.teamId === zone.teamId;
  }
  if (actor.role === "ZONE_LEAD") {
    return !!actor.zoneId && actor.zoneId === zone.id;
  }
  return false;
}

export function canManageRegionTelegram(
  actor: SessionUser,
  region: { id: string; teamId: string; zoneId: string },
) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor)) {
    return !!actor.teamId && actor.teamId === region.teamId;
  }
  if (actor.role === "ZONE_LEAD") {
    return !!actor.zoneId && actor.zoneId === region.zoneId;
  }
  if (actor.role === "REGIONAL_LEAD") {
    return !!actor.regionId && actor.regionId === region.id;
  }
  return false;
}
