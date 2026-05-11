import { describe, expect, it } from "vitest";

import type { Role } from "@/lib/domain";
import { resolveNotificationRecipientIds } from "@/lib/notifications/submission-notifier";

type UserInput = {
  id: string;
  role: Role;
  teamId?: string | null;
  zoneId?: string | null;
  regionId?: string | null;
};

const users: UserInput[] = [
  { id: "nt-a", role: "TEAM_LEAD", teamId: "team-a" },
  { id: "nt-b", role: "TEAM_LEAD", teamId: "team-b" },
  { id: "dvt-a1", role: "ZONE_LEAD", teamId: "team-a", zoneId: "zone-a" },
  { id: "dvt-a2", role: "ZONE_LEAD", teamId: "team-a", zoneId: "zone-b" },
  { id: "dvt-b", role: "ZONE_LEAD", teamId: "team-b", zoneId: "zone-c" },
  {
    id: "kvt-a1",
    role: "REGIONAL_LEAD",
    teamId: "team-a",
    zoneId: "zone-a",
    regionId: "region-a",
  },
  {
    id: "kvt-a2",
    role: "REGIONAL_LEAD",
    teamId: "team-a",
    zoneId: "zone-a",
    regionId: "region-b",
  },
  {
    id: "kvt-a3",
    role: "REGIONAL_LEAD",
    teamId: "team-a",
    zoneId: "zone-b",
    regionId: "region-c",
  },
  {
    id: "member-a",
    role: "MEMBER",
    teamId: "team-a",
    zoneId: "zone-a",
    regionId: "region-a",
  },
];

describe("resolveNotificationRecipientIds", () => {
  it("sends member submissions vertically to NT, DVT, and KVT in the same scope", () => {
    const recipientIds = resolveNotificationRecipientIds({
      excludeUserId: "member-a",
      scope: {
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: "region-a",
      },
      subjectRole: "MEMBER",
      users,
    });

    expect(recipientIds).toEqual(["nt-a", "dvt-a1", "kvt-a1"]);
  });

  it("sends DVT submissions vertically and horizontally to DVT in the same team", () => {
    const recipientIds = resolveNotificationRecipientIds({
      excludeUserId: "dvt-a1",
      scope: {
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: null,
      },
      subjectRole: "ZONE_LEAD",
      users,
    });

    expect(recipientIds).toEqual(["nt-a", "dvt-a2"]);
  });

  it("sends KVT submissions vertically and horizontally to KVT in the same zone", () => {
    const recipientIds = resolveNotificationRecipientIds({
      excludeUserId: "kvt-a1",
      scope: {
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: "region-a",
      },
      subjectRole: "REGIONAL_LEAD",
      users,
    });

    expect(recipientIds).toEqual(["nt-a", "dvt-a1", "kvt-a2"]);
  });

  it("uses task scope as the horizontal level for task completion notifications", () => {
    const recipientIds = resolveNotificationRecipientIds({
      scope: {
        scope: "REGION",
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: "region-a",
      },
      users,
    });

    expect(recipientIds).toEqual(["nt-a", "dvt-a1", "kvt-a1", "kvt-a2"]);
  });

  it("dedupes users and removes the subject from the recipient list", () => {
    const recipientIds = resolveNotificationRecipientIds({
      excludeUserId: "dvt-a1",
      scope: {
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: null,
      },
      subjectRole: "ZONE_LEAD",
      users,
    });

    expect(recipientIds).toHaveLength(new Set(recipientIds).size);
    expect(recipientIds).not.toContain("dvt-a1");
  });
});
