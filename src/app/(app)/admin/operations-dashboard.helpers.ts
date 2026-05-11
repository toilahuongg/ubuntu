import type {
  AdminOperationsRegionNode,
  AdminOperationsSelection,
  AdminOperationsSummary,
  AdminOperationsTeamNode,
  AdminOperationsView,
  AdminOperationsZoneNode,
} from "@/lib/services/admin-operations-types";

export function canSelectTeam(role: AdminOperationsView["scope"]["role"]) {
  return role === "ADMIN";
}

export function canSelectZone(role: AdminOperationsView["scope"]["role"]) {
  return role === "ADMIN" || role === "TEAM_LEAD";
}

export function canSelectRegion(role: AdminOperationsView["scope"]["role"]) {
  return role === "ADMIN" || role === "TEAM_LEAD" || role === "ZONE_LEAD";
}

export function findTeamNode(data: AdminOperationsView, teamId: string | null) {
  if (!teamId) return null;
  return data.tree.teams.find((team) => team.id === teamId) ?? null;
}

export function findZoneNode(data: AdminOperationsView, zoneId: string | null) {
  if (!zoneId) return null;
  for (const team of data.tree.teams) {
    const zone = team.zones.find((entry) => entry.id === zoneId);
    if (zone) return zone;
  }
  return null;
}

export function findRegionNode(
  data: AdminOperationsView,
  regionId: string | null,
) {
  if (!regionId) return null;
  for (const team of data.tree.teams) {
    for (const zone of team.zones) {
      const region = zone.regions.find((entry) => entry.id === regionId);
      if (region) return region;
    }
  }
  return null;
}

export function getZoneOptions(
  data: AdminOperationsView,
  selection: AdminOperationsSelection,
) {
  const team = findTeamNode(data, selection.teamId);
  return team?.zones ?? [];
}

export function getRegionOptions(
  data: AdminOperationsView,
  selection: AdminOperationsSelection,
) {
  const zone = findZoneNode(data, selection.zoneId);
  return zone?.regions ?? [];
}

export function getActiveSummary(
  data: AdminOperationsView,
  selection: AdminOperationsSelection,
) {
  const region = findRegionNode(data, selection.regionId);
  if (region) return region.summary;

  const zone = findZoneNode(data, selection.zoneId);
  if (zone) return zone.summary;

  const team = findTeamNode(data, selection.teamId);
  if (team) return team.summary;

  return data.summary;
}

export function getActiveScopeLabel(
  data: AdminOperationsView,
  selection: AdminOperationsSelection,
) {
  const region = findRegionNode(data, selection.regionId);
  if (region) return region.name;

  const zone = findZoneNode(data, selection.zoneId);
  if (zone) return zone.name;

  const team = findTeamNode(data, selection.teamId);
  if (team) return team.name;

  return data.scope.name;
}

export function filterMembersForSelection(
  data: AdminOperationsView,
  selection: AdminOperationsSelection,
) {
  return data.members.filter((member) => {
    if (selection.regionId) return member.regionId === selection.regionId;
    if (selection.zoneId) return member.zoneId === selection.zoneId;
    if (selection.teamId) return member.teamId === selection.teamId;
    return true;
  });
}

export function normalizeSelection(
  data: AdminOperationsView,
  selection: AdminOperationsSelection,
) {
  const team = findTeamNode(data, selection.teamId);
  const zone = findZoneNode(data, selection.zoneId);
  const region = findRegionNode(data, selection.regionId);

  const normalizedTeamId = team ? team.id : null;
  const normalizedZoneId =
    zone && (!normalizedTeamId || zone.teamId === normalizedTeamId) ? zone.id : null;
  const normalizedRegionId =
    region &&
    (!normalizedZoneId || region.zoneId === normalizedZoneId) &&
    (!normalizedTeamId || region.teamId === normalizedTeamId)
      ? region.id
      : null;

  return {
    regionId: normalizedRegionId,
    teamId: normalizedTeamId,
    zoneId: normalizedZoneId,
  } satisfies AdminOperationsSelection;
}

export function getSelectionEmptyState(
  data: AdminOperationsView,
  selection: AdminOperationsSelection,
) {
  const role = data.scope.role;
  if (canSelectTeam(role) && data.tree.teams.length === 0) {
    return "Chưa có nhóm nào trong hệ thống.";
  }

  if (canSelectZone(role)) {
    if (!selection.teamId && canSelectTeam(role)) {
      return "Chọn nhóm để xem các địa vực và thành viên.";
    }
    if (selection.teamId && getZoneOptions(data, selection).length === 0) {
      return "Nhóm này chưa có địa vực.";
    }
  }

  if (canSelectRegion(role)) {
    if (!selection.zoneId && canSelectZone(role)) {
      return "Chọn địa vực để xem các khu vực.";
    }
    if (selection.zoneId && getRegionOptions(data, selection).length === 0) {
      return "Địa vực này chưa có khu vực.";
    }
  }

  const activeMembers = filterMembersForSelection(data, selection);
  if (activeMembers.length === 0) {
    if (selection.regionId) return "Khu vực này chưa có thành viên.";
    if (selection.zoneId) return "Địa vực này chưa có thành viên.";
    if (selection.teamId) return "Nhóm này chưa có thành viên.";
    return "Phạm vi hiện tại chưa có thành viên.";
  }

  return null;
}

export function getNodeProgressTone(summary: AdminOperationsSummary) {
  if (summary.assigned === 0) return "idle";
  if (summary.pending === 0) return "complete";
  if (summary.completed === 0) return "alert";
  return "progress";
}

export function getRootNodesForRole(
  data: AdminOperationsView,
): Array<AdminOperationsTeamNode | AdminOperationsZoneNode | AdminOperationsRegionNode> {
  if (data.scope.role === "ADMIN") return data.tree.teams;

  if (data.scope.role === "TEAM_LEAD") {
    return getZoneOptions(data, data.selectionDefaults);
  }

  if (data.scope.role === "ZONE_LEAD") {
    return getRegionOptions(data, data.selectionDefaults);
  }

  return [];
}
