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
        },
      ),
    ).toBe(true);
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
        },
        {
          fullName: "Member",
          id: "member",
          regionId: "region-a",
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-a",
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
        },
        {
          fullName: "Another lead",
          id: "lead-b",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
      ),
    ).toBe(false);
  });
});
