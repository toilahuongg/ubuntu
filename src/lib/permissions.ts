import type { Role, SessionUser } from "@/lib/domain";

function isMemberLike(user: SessionUser) {
  return user.role === "MEMBER" || user.role === "NGV" || user.role === "TDM";
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
  if (isAdmin(user)) return true;
  if (isTeamLead(user)) return !!user.teamId;
  if (isZoneLead(user)) return !!user.zoneId;
  return false;
}

export function canPersonalizeTasks(actor: SessionUser, subject: SessionUser) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor)) {
    return !!actor.teamId && actor.teamId === subject.teamId;
  }
  if (isZoneLead(actor)) {
    return (
      isMemberLike(subject) &&
      !!actor.zoneId &&
      actor.zoneId === subject.zoneId
    );
  }
  return false;
}

export function canAccessManagement(user: SessionUser) {
  return isAdmin(user) || (isTeamLead(user) && !!user.teamId);
}

export function canAccessUserManagement(user: SessionUser) {
  if (isAdmin(user)) return true;
  if (isTeamLead(user)) return !!user.teamId;
  if (isZoneLead(user)) return !!user.teamId && !!user.zoneId;
  if (isRegionalLead(user)) return !!user.teamId && !!user.zoneId && !!user.regionId;
  return false;
}

export function canAccessZoneManagement(user: SessionUser) {
  return user.role === "ZONE_LEAD" && !!user.zoneId;
}

export function canAccessRegionManagement(user: SessionUser) {
  return user.role === "REGIONAL_LEAD" && !!user.regionId;
}

export function canAccessTeamStructure(user: SessionUser) {
  return isAdmin(user) || (isTeamLead(user) && !!user.teamId);
}

export function canAccessZoneStructure(user: SessionUser) {
  if (isAdmin(user)) return true;
  if (isTeamLead(user)) return !!user.teamId;
  if (isZoneLead(user)) return !!user.zoneId;
  return false;
}

export function canAccessRegionStructure(user: SessionUser) {
  if (canAccessZoneStructure(user)) return true;
  return isRegionalLead(user) && !!user.regionId;
}

export function canCreateTeamStructure(user: SessionUser) {
  return isAdmin(user);
}

export function canCreateZoneStructure(user: SessionUser) {
  return isAdmin(user) || (isTeamLead(user) && !!user.teamId);
}

export function canCreateRegionStructure(user: SessionUser) {
  if (canCreateZoneStructure(user)) return true;
  return isZoneLead(user) && !!user.zoneId;
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

  if (isZoneLead(actor)) {
    return (
      isMemberLike(subject) &&
      !!actor.zoneId &&
      actor.zoneId === subject.zoneId
    );
  }

  if (isRegionalLead(actor)) {
    return (
      isMemberLike(subject) &&
      !!actor.regionId &&
      actor.regionId === subject.regionId
    );
  }

  return false;
}

export function canAssignUserRole(actor: SessionUser, role: Role) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor)) {
    return (
      role === "ZONE_LEAD" ||
      role === "REGIONAL_LEAD" ||
      role === "NGV" ||
      role === "TDM" ||
      role === "MEMBER"
    );
  }
  if (isZoneLead(actor) || isRegionalLead(actor)) {
    return role === "NGV" || role === "TDM" || role === "MEMBER";
  }
  return false;
}

export function getAssignableUserRoles(actor: SessionUser): Role[] {
  const roles: Role[] = [
    "ADMIN",
    "TEAM_LEAD",
    "ZONE_LEAD",
    "REGIONAL_LEAD",
    "NGV",
    "MEMBER",
    "TDM",
  ];
  return roles.filter((role) => canAssignUserRole(actor, role));
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
      subject.role !== "TDM" &&
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

export type CustomerView = {
  caregiverIds: string[];
  regionId: string | null;
  teamId: string | null;
  zoneId: string | null;
};

export function canViewCustomer(actor: SessionUser, customer: CustomerView) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor) && actor.teamId && actor.teamId === customer.teamId) return true;
  if (isZoneLead(actor) && actor.zoneId && actor.zoneId === customer.zoneId) return true;
  if (isRegionalLead(actor) && actor.regionId && actor.regionId === customer.regionId) return true;
  if (customer.caregiverIds.includes(actor.id)) return true;
  return false;
}

export function canManageCustomer(actor: SessionUser, customer?: CustomerView) {
  if (isAdmin(actor)) return true;
  if (customer) {
    if (isTeamLead(actor) && actor.teamId && actor.teamId === customer.teamId) return true;
    if (isZoneLead(actor) && actor.zoneId && actor.zoneId === customer.zoneId) return true;
    if (isRegionalLead(actor) && actor.regionId && actor.regionId === customer.regionId) return true;
    if (customer.caregiverIds.includes(actor.id)) return true;
  } else {
    return true;
  }
  return false;
}

export function canCreateInteraction(actor: SessionUser, customer: CustomerView) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor) && actor.teamId && actor.teamId === customer.teamId) return true;
  if (isZoneLead(actor) && actor.zoneId && actor.zoneId === customer.zoneId) return true;
  if (isRegionalLead(actor) && actor.regionId && actor.regionId === customer.regionId) return true;
  if (customer.caregiverIds.includes(actor.id)) return true;
  return false;
}
