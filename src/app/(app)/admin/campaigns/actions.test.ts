import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTask: vi.fn(),
  deleteCampaignOnlyTask: vi.fn(),
  getSessionUser: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn().mockImplementation((path) => {
    throw new Error(`Redirected to ${path}`);
  }),
  saveDailyCampaign: vi.fn(),
  updateCampaignOnlyTask: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: vi.fn(),
}));

vi.mock("@/lib/campaigns/campaign-service", () => ({
  saveDailyCampaign: mocks.saveDailyCampaign,
}));

vi.mock("@/lib/tasks/task-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/task-service")>();
  return {
    ...actual,
    createTask: mocks.createTask,
    deleteCampaignOnlyTask: mocks.deleteCampaignOnlyTask,
    updateCampaignOnlyTask: mocks.updateCampaignOnlyTask,
  };
});

import {
  deleteCampaignOnlyTaskAction,
  updateCampaignOnlyTaskAction,
} from "./actions";

const teamLeadSession = {
  id: "507f1f77bcf86cd799439012",
  fullName: "Team Lead",
  role: "TEAM_LEAD",
  status: "ACTIVE",
  teamId: "507f1f77bcf86cd799439022",
} as const;

function campaignTaskFormData(overrides: Record<string, string | string[]> = {}) {
  const formData = new FormData();
  const fields: Record<string, string | string[]> = {
    taskId: "507f1f77bcf86cd799439099",
    title: " Gọi chăm sóc 3 người ",
    description: "Theo dõi trong ngày",
    deadlineTime: "20:00",
    expReward: "20",
    pointReward: "5",
    lateWindowDays: "1",
    targetRoles: ["NGV", "MEMBER", "TDM"],
    submissionMessage: "Đã hoàn thành",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, item);
    } else {
      formData.set(key, value);
    }
  }

  return formData;
}

describe("campaign task actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue(teamLeadSession);
    mocks.updateCampaignOnlyTask.mockResolvedValue(undefined);
    mocks.deleteCampaignOnlyTask.mockResolvedValue(undefined);
  });

  it("updates campaign custom tasks with the campaign-only guard", async () => {
    const result = await updateCampaignOnlyTaskAction(campaignTaskFormData());

    expect(result.ok).toBe(true);
    expect(mocks.updateCampaignOnlyTask).toHaveBeenCalledWith(
      teamLeadSession,
      "507f1f77bcf86cd799439099",
      expect.objectContaining({
        campaignOnly: true,
        deadlineTime: "20:00",
        expReward: 20,
        pointReward: 5,
        targetRoles: ["NGV", "MEMBER", "TDM"],
        title: " Gọi chăm sóc 3 người ",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/campaigns/tasks");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("deletes campaign custom tasks through the campaign-only guard", async () => {
    const result = await deleteCampaignOnlyTaskAction("507f1f77bcf86cd799439099");

    expect(result.ok).toBe(true);
    expect(mocks.deleteCampaignOnlyTask).toHaveBeenCalledWith(
      teamLeadSession,
      "507f1f77bcf86cd799439099",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/campaigns/tasks");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
