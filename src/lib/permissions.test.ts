import { describe, expect, it } from "vitest";

import { canProxySubmit } from "@/lib/permissions";

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
});
