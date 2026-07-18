import { describe, expect, it, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  connectToDatabase: vi.fn(),
  dttClassTaskDeleteMany: vi.fn(),
  monthlyGoalDeleteMany: vi.fn(),
  submissionDeleteMany: vi.fn(),
  taskDeleteOne: vi.fn(),
  taskFindById: vi.fn(),
  taskReminderPreferenceDeleteMany: vi.fn(),
}));

vi.mock("@/lib/mongoose", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/lib/models", () => ({
  AuditLogModel: {
    create: mocks.auditCreate,
  },
  DttClassTaskModel: {
    deleteMany: mocks.dttClassTaskDeleteMany,
  },
  DttEnrollmentModel: {},
  MonthlyGoalModel: {
    deleteMany: mocks.monthlyGoalDeleteMany,
  },
  SubmissionModel: {
    deleteMany: mocks.submissionDeleteMany,
  },
  TaskModel: {
    deleteOne: mocks.taskDeleteOne,
    findById: mocks.taskFindById,
  },
  TaskReminderPreferenceModel: {
    deleteMany: mocks.taskReminderPreferenceDeleteMany,
  },
  UserTaskVisibilityModel: {},
}));

const { deleteTask } = await import("./task-service");

describe("deleteTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.auditCreate.mockResolvedValue({});
    mocks.dttClassTaskDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.monthlyGoalDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.submissionDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.taskDeleteOne.mockResolvedValue({ deletedCount: 1 });
    mocks.taskReminderPreferenceDeleteMany.mockResolvedValue({ deletedCount: 0 });
  });

  it("removes DTT class-task assignments for the deleted task", async () => {
    const teamId = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    const actorId = new Types.ObjectId();

    mocks.taskFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: taskId,
        teamId,
        zoneId: null,
        regionId: null,
        scope: "TEAM",
        targetRoles: ["MEMBER"],
        title: "Nhiệm vụ chung đã xoá",
        taskType: "DAILY_PER_MEMBER",
      }),
    });

    await deleteTask(
      {
        id: actorId.toString(),
        fullName: "Team Lead",
        role: "TEAM_LEAD",
        status: "ACTIVE",
        teamId: teamId.toString(),
      },
      taskId.toString(),
    );

    expect(mocks.dttClassTaskDeleteMany).toHaveBeenCalledWith({ taskId });
    expect(mocks.taskDeleteOne).toHaveBeenCalledWith({ _id: taskId });
  });
});
