import type { SessionUser } from "@/lib/domain";

export function isTeamLead(user: SessionUser) {
  return user.role === "TEAM_LEAD";
}

export function isZoneLead(user: SessionUser) {
  return user.role === "ZONE_LEAD";
}

export function isRegionalLead(user: SessionUser) {
  return user.role === "REGIONAL_LEAD";
}

export function canManageTemplates(user: SessionUser) {
  return (
    user.role === "TEAM_LEAD" ||
    user.role === "ZONE_LEAD" ||
    user.role === "REGIONAL_LEAD"
  );
}

export function canAccessManagement(user: SessionUser) {
  return isTeamLead(user);
}

export function canAccessZoneManagement(user: SessionUser) {
  return user.role === "ZONE_LEAD" && !!user.zoneId;
}

export function canAccessRegionManagement(user: SessionUser) {
  return user.role === "REGIONAL_LEAD" && !!user.regionId;
}

export function canViewTeamDashboard(user: SessionUser) {
  return isTeamLead(user);
}

export function canManageUser(actor: SessionUser, subject: SessionUser) {
  if (isTeamLead(actor)) {
    return true;
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
    if (subject.role !== "REGIONAL_LEAD" && subject.role !== "MEMBER") {
      return false;
    }
    return actor.zoneId === subject.zoneId;
  }

  if (actor.role === "REGIONAL_LEAD" && actor.regionId) {
    if (subject.role !== "MEMBER") {
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
