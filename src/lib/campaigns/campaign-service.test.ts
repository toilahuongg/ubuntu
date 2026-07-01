import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_TARGET_ROLES,
  isCampaignRole,
} from "@/lib/campaigns/constants";
import {
  assertCanManageDailyCampaign,
  normalizeCampaignTaskIds,
} from "@/lib/campaigns/campaign-service";
import type { SessionUser } from "@/lib/domain";
import { createCampaignOnlyTaskInput } from "@/lib/tasks/task-service";

describe("campaign constants", () => {
  it("uses the approved campaign roles", () => {
    expect(CAMPAIGN_TARGET_ROLES).toEqual([
      "NGV",
      "REGIONAL_LEAD",
      "ZONE_LEAD",
      "TEAM_LEAD",
    ]);
  });

  it("recognizes only campaign roles", () => {
    expect(isCampaignRole("NGV")).toBe(true);
    expect(isCampaignRole("REGIONAL_LEAD")).toBe(true);
    expect(isCampaignRole("ZONE_LEAD")).toBe(true);
    expect(isCampaignRole("TEAM_LEAD")).toBe(true);
    expect(isCampaignRole("MEMBER")).toBe(false);
    expect(isCampaignRole("ADMIN")).toBe(false);
  });
});

const activeTeamLead: SessionUser = {
  fullName: "Lead",
  id: new Types.ObjectId().toString(),
  role: "TEAM_LEAD",
  status: "ACTIVE",
  teamId: new Types.ObjectId().toString(),
};

describe("campaign management permissions", () => {
  it("allows team leads with a team", () => {
    expect(() => assertCanManageDailyCampaign(activeTeamLead)).not.toThrow();
  });

  it("rejects non team leads", () => {
    expect(() =>
      assertCanManageDailyCampaign({ ...activeTeamLead, role: "ZONE_LEAD" }),
    ).toThrow("Chỉ CS - ĐL");
  });

  it("deduplicates selected task ids in order", () => {
    expect(normalizeCampaignTaskIds(["a", "b", "a", "", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("campaign-only task input", () => {
  it("forces campaign-only tasks to daily team tasks", () => {
    const input = createCampaignOnlyTaskInput({
      title: "Special",
      description: "",
      deadlineTime: "20:00",
      expReward: 20,
      pointReward: 5,
      lateWindowDays: 1,
      targetRoles: ["NGV"],
      submissionMessage: "",
      completionMessage: "",
    });

    expect(input).toMatchObject({
      campaignOnly: true,
      taskType: "DAILY_PER_MEMBER",
      scheduleType: "EVERY_DAY",
      scheduledWeekdays: [],
      scheduledMonthDays: [],
      targetCount: null,
    });
  });
});
