import { describe, expect, it } from "vitest";

import { appliesToUser, type ScopeContext } from "@/lib/tasks/policy";

const regionTask: ScopeContext = {
  regionId: "region-a",
  scope: "REGION",
  teamId: "team-a",
  zoneId: "zone-a",
};

const regionalLead = {
  regionId: "region-a",
  role: "REGIONAL_LEAD" as const,
  teamId: "team-a",
  zoneId: "zone-a",
};

const zoneLead = {
  regionId: null,
  role: "ZONE_LEAD" as const,
  teamId: "team-a",
  zoneId: "zone-a",
};

const teamLead = {
  regionId: null,
  role: "TEAM_LEAD" as const,
  teamId: "team-a",
  zoneId: null,
};

const ngv = {
  regionId: "region-a",
  role: "NGV" as const,
  teamId: "team-a",
  zoneId: "zone-a",
};

const member = {
  regionId: "region-a",
  role: "MEMBER" as const,
  teamId: "team-a",
  zoneId: "zone-a",
};

describe("task targeting policy", () => {
  it("treats missing and empty target roles as all roles", () => {
    expect(appliesToUser(regionTask, regionalLead)).toBe(true);
    expect(appliesToUser({ ...regionTask, targetRoles: [] }, ngv)).toBe(true);
    expect(appliesToUser(regionTask, teamLead)).toBe(false);
    expect(appliesToUser(regionTask, zoneLead)).toBe(false);
  });

  it("applies NGV-only tasks only to NGV in scope", () => {
    const task = { ...regionTask, targetRoles: ["NGV" as const] };

    expect(appliesToUser(task, ngv)).toBe(true);
    expect(appliesToUser(task, member)).toBe(false);
    expect(appliesToUser(task, { ...ngv, regionId: "region-b" })).toBe(false);
  });

  it("can target members and NGV while excluding regional leads", () => {
    const task = {
      ...regionTask,
      targetRoles: ["MEMBER" as const, "NGV" as const],
    };

    expect(appliesToUser(task, member)).toBe(true);
    expect(appliesToUser(task, ngv)).toBe(true);
    expect(appliesToUser(task, regionalLead)).toBe(false);
  });

  describe("appliesToUser", () => {
    it("should return true if task is for DTT and user is in DTT, even if roles do not match", () => {
      const taskContext = {
        scope: "TEAM" as const,
        teamId: "team-a",
        zoneId: null,
        regionId: null,
        targetRoles: ["NGV" as const],
        isDtt: true,
      };
      const userScope = {
        teamId: "team-a",
        zoneId: null,
        regionId: null,
        role: "MEMBER" as const, // Vai trò không khớp targetRoles
        isDttUser: true,          // Nhưng là học viên ĐTT
      };
      expect(appliesToUser(taskContext, userScope)).toBe(true);
    });

    it("should return false if task is for DTT but user is NOT in DTT and role doesn't match", () => {
      const taskContext = {
        scope: "TEAM" as const,
        teamId: "team-a",
        zoneId: null,
        regionId: null,
        targetRoles: ["NGV" as const],
        isDtt: true,
      };
      const userScope = {
        teamId: "team-a",
        zoneId: null,
        regionId: null,
        role: "MEMBER" as const,
        isDttUser: false,
      };
      expect(appliesToUser(taskContext, userScope)).toBe(false);
    });
  });
});
