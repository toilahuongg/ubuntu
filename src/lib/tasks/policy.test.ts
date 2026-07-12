import { describe, expect, it } from "vitest";

import {
  appliesToUser,
  isWithinTaskOrgScope,
  type ScopeContext,
} from "@/lib/tasks/policy";

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

});

describe("task org scope policy", () => {
  it("matches organization scope independently from target roles", () => {
    expect(
      isWithinTaskOrgScope(
        regionTask,
        member,
      ),
    ).toBe(true);
    expect(
      isWithinTaskOrgScope(
        regionTask,
        { ...member, regionId: "region-b" },
      ),
    ).toBe(false);
  });
});
