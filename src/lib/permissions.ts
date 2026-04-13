import type { SessionUser } from "@/lib/domain";

export function isAdmin(user: SessionUser) {
  return user.role === "ADMIN";
}

export function canManageTemplates(user: SessionUser) {
  return user.role === "TEAM_LEAD";
}

export function canAccessAdmin(user: SessionUser) {
  return isAdmin(user);
}

export function canViewTeamDashboard(user: SessionUser) {
  return user.role === "TEAM_LEAD" || isAdmin(user);
}

export function canViewRegionDashboard(user: SessionUser) {
  return user.role === "REGIONAL_LEAD" || canViewTeamDashboard(user);
}

export function canManageUser(actor: SessionUser, subject: SessionUser) {
  if (isAdmin(actor)) {
    return true;
  }

  return actor.id === subject.id;
}

export function canProxySubmit(actor: SessionUser, subject: SessionUser) {
  if (actor.id === subject.id) {
    return true;
  }

  if (isAdmin(actor)) {
    return true;
  }

  if (actor.role === "TEAM_LEAD" && actor.teamId && actor.teamId === subject.teamId) {
    return true;
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
