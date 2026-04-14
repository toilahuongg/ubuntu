import type { SessionUser } from "@/lib/domain";

export function isTeamLead(user: SessionUser) {
  return user.role === "TEAM_LEAD";
}

export function canManageTemplates(user: SessionUser) {
  return user.role === "TEAM_LEAD";
}

export function canAccessManagement(user: SessionUser) {
  return isTeamLead(user);
}

export function canManageTeamRegions(user: SessionUser) {
  return user.role === "TEAM_LEAD" && !!user.teamId;
}

export function canViewTeamDashboard(user: SessionUser) {
  return isTeamLead(user);
}

export function canViewRegionDashboard(user: SessionUser) {
  return user.role === "REGIONAL_LEAD" || canViewTeamDashboard(user);
}

export function canAccessRegionManagement(user: SessionUser) {
  return user.role === "REGIONAL_LEAD" && !!user.regionId;
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
    if (!actor.teamId) {
      return true;
    }
    return actor.teamId === subject.teamId;
  }

  if (
    actor.role === "REGIONAL_LEAD" &&
    subject.role === "MEMBER" &&
    actor.regionId &&
    actor.regionId === subject.regionId
  ) {
    return true;
  }

  return false;
}

export function assertCanProxySubmit(actor: SessionUser, subject: SessionUser) {
  if (!canProxySubmit(actor, subject)) {
    throw new Error("Bạn không có quyền nộp thay người này.");
  }
}
