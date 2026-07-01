import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_TARGET_ROLES,
  isCampaignRole,
} from "@/lib/campaigns/constants";
import {
  assertCampaignOnlyTaskCanSubmit,
  assertCanManageDailyCampaign,
  buildCampaignReportRows,
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

describe("campaign report rows", () => {
  it("marks a user complete only when all applicable campaign tasks are complete", () => {
    const rows = buildCampaignReportRows({
      taskIds: ["task-a", "task-b"],
      users: [
        { id: "u1", fullName: "A", role: "NGV" },
        { id: "u2", fullName: "B", role: "NGV" },
      ],
      applicableUserIdsByTaskId: new Map([
        ["task-a", new Set(["u1", "u2"])],
        ["task-b", new Set(["u1", "u2"])],
      ]),
      completionByTaskUser: new Map([
        ["task-a:u1", 1],
        ["task-b:u1", 1],
        ["task-a:u2", 1],
      ]),
    });

    expect(rows).toEqual([
      {
        id: "u1",
        fullName: "A",
        role: "NGV",
        completed: 2,
        total: 2,
        isComplete: true,
        statuses: [
          { taskId: "task-a", applicable: true, completionCount: 1 },
          { taskId: "task-b", applicable: true, completionCount: 1 },
        ],
      },
      {
        id: "u2",
        fullName: "B",
        role: "NGV",
        completed: 1,
        total: 2,
        isComplete: false,
        statuses: [
          { taskId: "task-a", applicable: true, completionCount: 1 },
          { taskId: "task-b", applicable: true, completionCount: 0 },
        ],
      },
    ]);
  });
});

describe("campaign-only submission guard", () => {
  it("rejects campaign-only tasks outside the campaign", () => {
    expect(() =>
      assertCampaignOnlyTaskCanSubmit({
        campaignOnly: true,
        taskId: "task-a",
        campaignTaskIds: ["task-b"],
      }),
    ).toThrow(
      "Nhiệm vụ chiến dịch chỉ được nộp khi nằm trong chiến dịch ngày này.",
    );
  });

  it("allows normal tasks and included campaign-only tasks", () => {
    expect(() =>
      assertCampaignOnlyTaskCanSubmit({
        campaignOnly: false,
        taskId: "task-a",
        campaignTaskIds: [],
      }),
    ).not.toThrow();
    expect(() =>
      assertCampaignOnlyTaskCanSubmit({
        campaignOnly: true,
        taskId: "task-a",
        campaignTaskIds: ["task-a"],
      }),
    ).not.toThrow();
  });
});
