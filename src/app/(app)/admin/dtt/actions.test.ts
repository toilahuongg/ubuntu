import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  revalidatePath: vi.fn(),
  redirect: vi.fn().mockImplementation((path) => {
    throw new Error(`Redirected to ${path}`);
  }),
  // DttClassModel
  classCreate: vi.fn(),
  classFindByIdAndUpdate: vi.fn(),
  classFindByIdAndDelete: vi.fn(),
  // DttEnrollmentModel
  enrollmentCreate: vi.fn(),
  enrollmentExists: vi.fn(),
  enrollmentFindOneAndDelete: vi.fn(),
  enrollmentFindOneAndUpdate: vi.fn(),
  // TaskModel
  taskFindByIdAndUpdate: vi.fn(),
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
}));

vi.mock("@/lib/models/dtt-class", () => ({
  DttClassModel: {
    create: mocks.classCreate,
    findByIdAndUpdate: mocks.classFindByIdAndUpdate,
    findByIdAndDelete: mocks.classFindByIdAndDelete,
  },
}));

vi.mock("@/lib/models/dtt-enrollment", () => ({
  DttEnrollmentModel: {
    create: mocks.enrollmentCreate,
    exists: mocks.enrollmentExists,
    findOneAndDelete: mocks.enrollmentFindOneAndDelete,
    findOneAndUpdate: mocks.enrollmentFindOneAndUpdate,
  },
}));

vi.mock("@/lib/models/task", () => ({
  TaskModel: {
    findByIdAndUpdate: mocks.taskFindByIdAndUpdate,
  },
}));

import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  enrollStudentAction,
  unenrollStudentAction,
  changeStudentClassAction,
  toggleTaskDttAction,
} from "./actions";

describe("DTT Server Actions", () => {
  const adminSession = {
    id: "507f1f77bcf86cd799439011",
    fullName: "Admin User",
    role: "ADMIN",
    status: "ACTIVE",
  };

  const teamLeadSession = {
    id: "507f1f77bcf86cd799439012",
    fullName: "Team Lead",
    role: "TEAM_LEAD",
    status: "ACTIVE",
    teamId: "507f1f77bcf86cd799439022",
  };

  const zoneLeadSession = {
    id: "507f1f77bcf86cd799439013",
    fullName: "Zone Lead",
    role: "ZONE_LEAD",
    status: "ACTIVE",
    zoneId: "507f1f77bcf86cd799439023",
  };

  const regionalLeadSession = {
    id: "507f1f77bcf86cd799439014",
    fullName: "Regional Lead",
    role: "REGIONAL_LEAD",
    status: "ACTIVE",
    regionId: "507f1f77bcf86cd799439024",
  };

  const memberSession = {
    id: "507f1f77bcf86cd799439015",
    fullName: "Member User",
    role: "MEMBER",
    status: "ACTIVE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication and Permissions", () => {
    it("redirects to login if session is missing", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(null);

      const res = await createClassAction("Lớp A");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Redirected to /login");
      }
    });

    it("rejects non-management roles", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(memberSession);

      const res = await createClassAction("Lớp A");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Bạn không có quyền quản lý.");
      }
    });

    it("rejects unscoped TEAM_LEAD", async () => {
      mocks.getSessionUser.mockResolvedValueOnce({
        ...teamLeadSession,
        teamId: undefined,
      });

      const res = await createClassAction("Lớp A");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Bạn không có quyền quản lý.");
      }
    });

    it("rejects unscoped ZONE_LEAD", async () => {
      mocks.getSessionUser.mockResolvedValueOnce({
        ...zoneLeadSession,
        zoneId: undefined,
      });

      const res = await createClassAction("Lớp A");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Bạn không có quyền quản lý.");
      }
    });

    it("rejects unscoped REGIONAL_LEAD", async () => {
      mocks.getSessionUser.mockResolvedValueOnce({
        ...regionalLeadSession,
        regionId: undefined,
      });

      const res = await createClassAction("Lớp A");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Bạn không có quyền quản lý.");
      }
    });

    it("allows ADMIN, REGIONAL_LEAD, ZONE_LEAD, TEAM_LEAD", async () => {
      const roles = [
        { session: adminSession, teamId: "507f1f77bcf86cd799439022" },
        { session: regionalLeadSession, teamId: "507f1f77bcf86cd799439022" },
        { session: zoneLeadSession, teamId: "507f1f77bcf86cd799439022" },
        { session: teamLeadSession, teamId: "507f1f77bcf86cd799439022" },
      ];

      for (const item of roles) {
        mocks.getSessionUser.mockResolvedValueOnce({
          ...item.session,
          teamId: item.teamId,
        });
        mocks.classCreate.mockResolvedValueOnce({});

        const res = await createClassAction("Lớp A");
        expect(res.ok).toBe(true);
      }
    });
  });

  describe("createClassAction", () => {
    it("creates a class with trimmed name and revalidates path", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.classCreate.mockResolvedValueOnce({ _id: "new-class-id" });

      const res = await createClassAction("  Lớp ĐTT K01  ");

      expect(res.ok).toBe(true);
      expect(mocks.connectToDatabase).toHaveBeenCalled();
      expect(mocks.classCreate).toHaveBeenCalledWith({
        name: "Lớp ĐTT K01",
        teamId: expect.any(Object),
        createdBy: expect.any(Object),
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
    });
  });

  describe("updateClassAction", async () => {
    it("updates class name and revalidates path", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.classFindByIdAndUpdate.mockResolvedValueOnce({});

      const classId = "507f1f77bcf86cd799439019";
      const res = await updateClassAction(classId, "  Lớp ĐTT K02  ");

      expect(res.ok).toBe(true);
      expect(mocks.classFindByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { name: "Lớp ĐTT K02" }
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
    });
  });

  describe("deleteClassAction", () => {
    const classId = "507f1f77bcf86cd799439019";

    it("fails if the class has enrolled students", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.enrollmentExists.mockResolvedValueOnce(true);

      const res = await deleteClassAction(classId);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Không thể xóa lớp học đang có học viên.");
      }
      expect(mocks.classFindByIdAndDelete).not.toHaveBeenCalled();
    });

    it("deletes the class if it has no students", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.enrollmentExists.mockResolvedValueOnce(false);
      mocks.classFindByIdAndDelete.mockResolvedValueOnce({});

      const res = await deleteClassAction(classId);

      expect(res.ok).toBe(true);
      expect(mocks.classFindByIdAndDelete).toHaveBeenCalledWith(expect.any(Object));
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
    });
  });

  describe("enrollStudentAction", () => {
    const studentId = "507f1f77bcf86cd79943901a";
    const classId = "507f1f77bcf86cd799439019";

    it("fails if the student is already enrolled in another class", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.enrollmentExists.mockResolvedValueOnce(true);

      const res = await enrollStudentAction(studentId, classId);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Thành viên đã tham gia một lớp học ĐTT khác.");
      }
      expect(mocks.enrollmentCreate).not.toHaveBeenCalled();
    });

    it("enrolls the student if not already enrolled", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.enrollmentExists.mockResolvedValueOnce(false);
      mocks.enrollmentCreate.mockResolvedValueOnce({});

      const res = await enrollStudentAction(studentId, classId);

      expect(res.ok).toBe(true);
      expect(mocks.enrollmentCreate).toHaveBeenCalledWith({
        userId: expect.any(Object),
        classId: expect.any(Object),
        teamId: expect.any(Object),
        enrolledBy: expect.any(Object),
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("unenrollStudentAction", () => {
    it("unenrolls the student and revalidates dashboard", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.enrollmentFindOneAndDelete.mockResolvedValueOnce({});

      const studentId = "507f1f77bcf86cd79943901a";
      const res = await unenrollStudentAction(studentId);

      expect(res.ok).toBe(true);
      expect(mocks.enrollmentFindOneAndDelete).toHaveBeenCalledWith({
        userId: expect.any(Object),
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("changeStudentClassAction", () => {
    it("updates student enrollment to new class", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.enrollmentFindOneAndUpdate.mockResolvedValueOnce({});

      const studentId = "507f1f77bcf86cd79943901a";
      const classId = "507f1f77bcf86cd79943901b";
      const res = await changeStudentClassAction(studentId, classId);

      expect(res.ok).toBe(true);
      expect(mocks.enrollmentFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: expect.any(Object) },
        { classId: expect.any(Object) }
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("toggleTaskDttAction", () => {
    it("updates task isDtt flag", async () => {
      mocks.getSessionUser.mockResolvedValueOnce(teamLeadSession);
      mocks.taskFindByIdAndUpdate.mockResolvedValueOnce({});

      const taskId = "507f1f77bcf86cd79943901c";
      const res = await toggleTaskDttAction(taskId, true);

      expect(res.ok).toBe(true);
      expect(mocks.taskFindByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { isDtt: true }
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/dtt");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/templates");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });
});
