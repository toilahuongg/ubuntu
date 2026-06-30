import { describe, expect, it } from "vitest";

import type { SessionUser } from "@/lib/domain";

import { getScopedProgressItem } from "./progress-links";

const baseUser: SessionUser = {
  id: "user-1",
  fullName: "User One",
  role: "MEMBER",
  status: "ACTIVE",
};

describe("getScopedProgressItem", () => {
  it("links zone leads to their zone progress page", () => {
    expect(
      getScopedProgressItem({
        ...baseUser,
        role: "ZONE_LEAD",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toMatchObject({
      href: "/admin/zones/zone-a",
      label: "Tiến độ địa vực",
    });
  });

  it("links team leads to their team progress page", () => {
    expect(
      getScopedProgressItem({
        ...baseUser,
        role: "TEAM_LEAD",
        teamId: "team-a",
      }),
    ).toMatchObject({
      href: "/admin/teams/team-a",
      label: "Tiến độ chi hội",
    });
  });

  it("keeps regional leads on their region progress page", () => {
    expect(
      getScopedProgressItem({
        ...baseUser,
        role: "REGIONAL_LEAD",
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: "region-a",
      }),
    ).toMatchObject({
      href: "/admin/regions/region-a",
      label: "Tiến độ khu vực",
    });
  });

  it("returns null when a scoped lead is missing the required scope id", () => {
    expect(
      getScopedProgressItem({
        ...baseUser,
        role: "ZONE_LEAD",
      }),
    ).toBeNull();
  });
});
