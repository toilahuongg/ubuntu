import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  classExists: vi.fn(),
  classTaskCreate: vi.fn(),
  classTaskExists: vi.fn(),
  classTaskFindOneAndDelete: vi.fn(),
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  createTask: vi.fn(),
  getSessionUser: vi.fn(),
  redirect: vi.fn().mockImplementation((path) => {
    throw new Error(`Redirected to ${path}`);
  }),
  revalidatePath: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("@/lib/mongoose", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: vi.fn(),
}));

vi.mock("@/lib/models/dtt-class", () => ({
  DttClassModel: {
    exists: mocks.classExists,
  },
}));

vi.mock("@/lib/models/dtt-class-task", () => ({
  DttClassTaskModel: {
    create: mocks.classTaskCreate,
    exists: mocks.classTaskExists,
    findOneAndDelete: mocks.classTaskFindOneAndDelete,
  },
}));

vi.mock("@/lib/models/task", () => ({
  TaskModel: {},
}));

vi.mock("@/lib/tasks/task-service", () => ({
  createTask: mocks.createTask,
  updateTask: mocks.updateTask,
}));

import { updateCustomClassTaskAction } from "./class-task-actions";

const teamLeadSession = {
  id: "507f1f77bcf86cd799439012",
  fullName: "Team Lead",
  role: "TEAM_LEAD",
  status: "ACTIVE",
  teamId: "507f1f77bcf86cd799439022",
} as const;

function editFormData(overrides: Record<string, string | string[]> = {}) {
  const formData = new FormData();
  const fields: Record<string, string | string[]> = {
    title: " Đọc kinh Sáng ",
    description: "Theo tài liệu của lớp",
    deadlineTime: "06:30",
    expReward: "15",
    lateWindowDays: "3",
    targetRoles: ["MEMBER", "TDM"],
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

describe("DTT class task actions", () => {
  const classId = "507f1f77bcf86cd799439031";
  const taskId = "507f1f77bcf86cd799439099";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue(teamLeadSession);
    mocks.classExists.mockResolvedValue(true);
    mocks.classTaskExists.mockResolvedValue(true);
    mocks.updateTask.mockResolvedValue(undefined);
  });

  it("updates custom class tasks while keeping them EXP-only daily tasks", async () => {
    const result = await updateCustomClassTaskAction(
      classId,
      taskId,
      editFormData(),
    );

    expect(result.ok).toBe(true);
    expect(mocks.classTaskExists).toHaveBeenCalledWith({
      classId: expect.any(Object),
      taskId: expect.any(Object),
      teamId: expect.any(Object),
      isInherited: false,
    });
    expect(mocks.updateTask).toHaveBeenCalledWith(
      teamLeadSession,
      taskId,
      expect.objectContaining({
        title: "Đọc kinh Sáng",
        description: "Theo tài liệu của lớp",
        deadlineTime: "06:30",
        expReward: 15,
        pointReward: 0,
        lateWindowDays: 3,
        targetRoles: ["MEMBER", "TDM"],
        taskType: "DAILY_PER_MEMBER",
        scheduleType: "EVERY_DAY",
        submissionMessage: "Đã hoàn thành",
        completionMessage: "",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/tasks/${taskId}`);
  });

  it("rejects editing inherited class tasks from the DTT custom editor", async () => {
    mocks.classTaskExists.mockResolvedValueOnce(false);

    const result = await updateCustomClassTaskAction(
      classId,
      taskId,
      editFormData(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Không tìm thấy nhiệm vụ custom của lớp.");
    }
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });
});
