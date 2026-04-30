import { describe, expect, it } from "vitest";

import type { SessionUser } from "@/lib/domain";
import {
  canAccessRegionStructure,
  canAccessTeamStructure,
  canAccessUserManagement,
  canAccessZoneStructure,
  canCreateRegionStructure,
  canCreateTeamStructure,
  canCreateZoneStructure,
  canAssignUserRole,
  canManageUser,
  getAssignableUserRoles,
} from "@/lib/permissions";

const baseUser = {
  fullName: "User",
  id: "user",
  status: "ACTIVE",
} satisfies Pick<SessionUser, "fullName" | "id" | "status">;

describe("user management permissions", () => {
  it("grants scoped access to management roles only", () => {
    expect(
      canAccessUserManagement({
        ...baseUser,
        id: "admin",
        role: "ADMIN",
      }),
    ).toBe(true);
    expect(
      canAccessUserManagement({
        ...baseUser,
        id: "zone",
        role: "ZONE_LEAD",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);
    expect(
      canAccessUserManagement({
        ...baseUser,
        id: "regional",
        regionId: "region-a",
        role: "REGIONAL_LEAD",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);
    expect(
      canAccessUserManagement({
        ...baseUser,
        id: "member",
        role: "MEMBER",
        regionId: "region-a",
      }),
    ).toBe(false);
    expect(
      canAccessUserManagement({
        ...baseUser,
        id: "unscoped-zone",
        role: "ZONE_LEAD",
      }),
    ).toBe(false);
  });

  it("limits manageable users to member-like roles in scope", () => {
    const teamLead: SessionUser = {
      ...baseUser,
      id: "team",
      role: "TEAM_LEAD",
      teamId: "team-a",
    };
    const zoneLead: SessionUser = {
      ...baseUser,
      id: "zone",
      role: "ZONE_LEAD",
      teamId: "team-a",
      zoneId: "zone-a",
    };

    expect(
      canManageUser(teamLead, {
        ...baseUser,
        id: "zone-lead",
        role: "ZONE_LEAD",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);
    expect(
      canManageUser(teamLead, {
        ...baseUser,
        id: "regional-lead",
        role: "REGIONAL_LEAD",
        regionId: "region-a",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);
    expect(
      canManageUser(teamLead, {
        ...baseUser,
        id: "other-team-member",
        regionId: "region-b",
        role: "MEMBER",
        teamId: "team-b",
        zoneId: "zone-b",
      }),
    ).toBe(false);
    expect(
      canManageUser(teamLead, {
        ...baseUser,
        id: "team-member",
        regionId: "region-a",
        role: "MEMBER",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);
    expect(
      canManageUser(zoneLead, {
        ...baseUser,
        id: "regional",
        regionId: "region-a",
        role: "REGIONAL_LEAD",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(false);
    expect(
      canManageUser(zoneLead, {
        ...baseUser,
        id: "member",
        regionId: "region-a",
        role: "MEMBER",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);
    expect(
      canManageUser(zoneLead, {
        ...baseUser,
        id: "other-zone-lead",
        role: "ZONE_LEAD",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(false);
    expect(
      canManageUser(zoneLead, {
        ...baseUser,
        id: "other-zone-member",
        regionId: "region-b",
        role: "MEMBER",
        teamId: "team-a",
        zoneId: "zone-b",
      }),
    ).toBe(false);
  });

  it("limits assignable roles by actor role", () => {
    const teamLead: SessionUser = {
      ...baseUser,
      id: "team",
      role: "TEAM_LEAD",
      teamId: "team-a",
    };
    const regionalLead: SessionUser = {
      ...baseUser,
      id: "regional",
      regionId: "region-a",
      role: "REGIONAL_LEAD",
    };

    expect(canAssignUserRole(teamLead, "ADMIN")).toBe(false);
    expect(canAssignUserRole(teamLead, "ZONE_LEAD")).toBe(true);
    expect(canAssignUserRole(teamLead, "REGIONAL_LEAD")).toBe(true);
    expect(getAssignableUserRoles(teamLead)).toEqual([
      "ZONE_LEAD",
      "REGIONAL_LEAD",
      "NGV",
      "TDM",
      "MEMBER",
    ]);
    expect(getAssignableUserRoles(regionalLead)).toEqual(["NGV", "TDM", "MEMBER"]);
  });
});

describe("structure management permissions", () => {
  const admin: SessionUser = { ...baseUser, id: "admin", role: "ADMIN" };
  const teamLead: SessionUser = {
    ...baseUser,
    id: "team",
    role: "TEAM_LEAD",
    teamId: "team-a",
  };
  const zoneLead: SessionUser = {
    ...baseUser,
    id: "zone",
    role: "ZONE_LEAD",
    teamId: "team-a",
    zoneId: "zone-a",
  };
  const regionalLead: SessionUser = {
    ...baseUser,
    id: "regional",
    regionId: "region-a",
    role: "REGIONAL_LEAD",
    teamId: "team-a",
    zoneId: "zone-a",
  };
  const member: SessionUser = {
    ...baseUser,
    id: "member",
    regionId: "region-a",
    role: "MEMBER",
    teamId: "team-a",
    zoneId: "zone-a",
  };

  it("gates structure pages by organization level", () => {
    expect(canAccessTeamStructure(admin)).toBe(true);
    expect(canAccessTeamStructure(teamLead)).toBe(true);
    expect(canAccessTeamStructure(zoneLead)).toBe(false);
    expect(canAccessTeamStructure(regionalLead)).toBe(false);

    expect(canAccessZoneStructure(admin)).toBe(true);
    expect(canAccessZoneStructure(teamLead)).toBe(true);
    expect(canAccessZoneStructure(zoneLead)).toBe(true);
    expect(canAccessZoneStructure(regionalLead)).toBe(false);

    expect(canAccessRegionStructure(admin)).toBe(true);
    expect(canAccessRegionStructure(teamLead)).toBe(true);
    expect(canAccessRegionStructure(zoneLead)).toBe(true);
    expect(canAccessRegionStructure(regionalLead)).toBe(true);
    expect(canAccessRegionStructure(member)).toBe(false);
  });

  it("limits structure creation to parent-level roles", () => {
    expect(canCreateTeamStructure(admin)).toBe(true);
    expect(canCreateTeamStructure(teamLead)).toBe(false);

    expect(canCreateZoneStructure(admin)).toBe(true);
    expect(canCreateZoneStructure(teamLead)).toBe(true);
    expect(canCreateZoneStructure(zoneLead)).toBe(false);

    expect(canCreateRegionStructure(admin)).toBe(true);
    expect(canCreateRegionStructure(teamLead)).toBe(true);
    expect(canCreateRegionStructure(zoneLead)).toBe(true);
    expect(canCreateRegionStructure(regionalLead)).toBe(false);
  });

  it("fails closed for unscoped leads", () => {
    expect(
      canAccessTeamStructure({
        ...baseUser,
        id: "team",
        role: "TEAM_LEAD",
      }),
    ).toBe(false);
    expect(
      canAccessZoneStructure({
        ...baseUser,
        id: "zone",
        role: "ZONE_LEAD",
      }),
    ).toBe(false);
    expect(
      canAccessRegionStructure({
        ...baseUser,
        id: "regional",
        role: "REGIONAL_LEAD",
      }),
    ).toBe(false);
  });
});
