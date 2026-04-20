import { describe, expect, it } from "vitest";

import { canAccessAnalytics, canProxySubmit } from "@/lib/permissions";

describe("canProxySubmit", () => {
  it("lets team leads submit for all users in their team", () => {
    expect(
      canProxySubmit(
        {
          fullName: "Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(true);
  });

  it("rejects team leads without a team scope (fail-closed)", () => {
    expect(
      canProxySubmit(
        {
          fullName: "Unscoped Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
        },
        {
          fullName: "Someone",
          id: "someone",
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-x",
        },
      ),
    ).toBe(false);
  });

  it("lets zone leads submit for members and regional leads in their zone", () => {
    const actor = {
      fullName: "Zone",
      id: "zone-lead",
      role: "ZONE_LEAD" as const,
      status: "ACTIVE" as const,
      teamId: "team-a",
      zoneId: "zone-a",
    };

    expect(
      canProxySubmit(actor, {
        fullName: "Member",
        id: "m",
        regionId: "region-a",
        role: "MEMBER",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);

    expect(
      canProxySubmit(actor, {
        fullName: "NGV",
        id: "ngv",
        regionId: "region-a",
        role: "NGV",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);

    expect(
      canProxySubmit(actor, {
        fullName: "Regional",
        id: "r",
        regionId: "region-a",
        role: "REGIONAL_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);

    // not another zone lead
    expect(
      canProxySubmit(actor, {
        fullName: "Other Zone",
        id: "z2",
        role: "ZONE_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(false);

    // not a member in another zone
    expect(
      canProxySubmit(actor, {
        fullName: "Other Member",
        id: "m2",
        regionId: "region-b",
        role: "MEMBER",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-b",
      }),
    ).toBe(false);
  });

  it("lets regional leads submit only for members in their region", () => {
    expect(
      canProxySubmit(
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "Member",
          id: "member",
          regionId: "region-a",
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(true);

    expect(
      canProxySubmit(
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "NGV",
          id: "ngv",
          regionId: "region-a",
          role: "NGV",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(true);

    expect(
      canProxySubmit(
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "Another lead",
          id: "lead-b",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(false);
  });

  it("does not let NGV proxy-submit for other users", () => {
    expect(
      canProxySubmit(
        {
          fullName: "NGV",
          id: "ngv",
          regionId: "region-a",
          role: "NGV",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "Member",
          id: "member",
          regionId: "region-a",
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(false);
  });
});

describe("canAccessAnalytics", () => {
  it("allows scoped lead roles", () => {
    expect(
      canAccessAnalytics({
        fullName: "Team",
        id: "team-lead",
        role: "TEAM_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
      }),
    ).toBe(true);

    expect(
      canAccessAnalytics({
        fullName: "Zone",
        id: "zone-lead",
        role: "ZONE_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);

    expect(
      canAccessAnalytics({
        fullName: "Regional",
        id: "regional-lead",
        regionId: "region-a",
        role: "REGIONAL_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);
  });

  it("rejects members and unscoped leads", () => {
    expect(
      canAccessAnalytics({
        fullName: "Member",
        id: "member",
        role: "MEMBER",
        status: "ACTIVE",
        teamId: "team-a",
      }),
    ).toBe(false);

    expect(
      canAccessAnalytics({
        fullName: "NGV",
        id: "ngv",
        role: "NGV",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: "region-a",
      }),
    ).toBe(false);

    expect(
      canAccessAnalytics({
        fullName: "Unscoped",
        id: "lead",
        role: "TEAM_LEAD",
        status: "ACTIVE",
      }),
    ).toBe(false);
  });
});
