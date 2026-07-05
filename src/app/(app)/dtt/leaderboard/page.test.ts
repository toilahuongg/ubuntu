import { describe, expect, it, vi, beforeEach } from "vitest";
import DttLeaderboardPage from "./page";

// Define mock functions
const mockGetSessionUser = vi.fn();
const mockCanManageDtt = vi.fn();
const mockRedirect = vi.fn();
const mockGetDttClassLeaderboard = vi.fn();

const mockClassFind = vi.fn();
const mockEnrollmentFindOne = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@/lib/permissions", () => ({
  canManageDtt: (user: unknown) => mockCanManageDtt(user),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("@/lib/services/leaderboard-service", () => ({
  getDttClassLeaderboard: (classId: string, taskId?: string) => mockGetDttClassLeaderboard(classId, taskId),
}));

vi.mock("@/lib/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/models/dtt-class", () => ({
  DttClassModel: {
    find: () => ({
      lean: () => mockClassFind(),
    }),
  },
}));

vi.mock("@/lib/models/dtt-enrollment", () => ({
  DttEnrollmentModel: {
    findOne: () => ({
      lean: () => mockEnrollmentFindOne(),
    }),
  },
}));

describe("DttLeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login if user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    await DttLeaderboardPage({ searchParams: Promise.resolve({}) });
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("shows warning if user is neither manager nor enrolled", async () => {
    const session = { id: "60c72b2f9b1d8b2d88888881", role: "MEMBER", status: "ACTIVE", teamId: "60c72b2f9b1d8b2d88888882" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);

    const result = await DttLeaderboardPage({ searchParams: Promise.resolve({}) });
    
    expect(result).toBeDefined();
    const str = JSON.stringify(result);
    expect(str).toContain("Bạn không tham gia lớp học ĐTT nào.");
  });

  it("shows warning/empty state if manager has no classes in team", async () => {
    const session = { id: "60c72b2f9b1d8b2d88888881", role: "TEAM_LEAD", status: "ACTIVE", teamId: "60c72b2f9b1d8b2d88888882" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(true);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockClassFind.mockResolvedValue([]);

    const result = await DttLeaderboardPage({ searchParams: Promise.resolve({}) });
    
    const str = JSON.stringify(result);
    expect(str).toContain("Chưa có lớp học ĐTT nào.");
  });

  it("fetches first class leaderboard if manager visits without classId searchParam", async () => {
    const session = { id: "60c72b2f9b1d8b2d88888881", role: "TEAM_LEAD", status: "ACTIVE", teamId: "60c72b2f9b1d8b2d88888882" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(true);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockClassFind.mockResolvedValue([
      { _id: "60c72b2f9b1d8b2d88888883", name: "Class 1", teamId: "60c72b2f9b1d8b2d88888882", startDayOfWeek: 1 },
      { _id: "60c72b2f9b1d8b2d88888884", name: "Class 2", teamId: "60c72b2f9b1d8b2d88888882", startDayOfWeek: 1 },
    ]);
    mockGetDttClassLeaderboard.mockResolvedValue({
      classInfo: { name: "Class 1", startDayOfWeek: 1, startStr: "2026-07-01", endStr: "2026-07-07" },
      entries: [
        { id: "60c72b2f9b1d8b2d88888886", fullName: "Student One", rank: 1, totalXp: 100, level: 1, levelInfo: { nameVi: "Cấp 1", icon: "" } },
      ],
      tasks: [],
    });

    const result = await DttLeaderboardPage({ searchParams: Promise.resolve({}) });
    
    expect(mockGetDttClassLeaderboard).toHaveBeenCalledWith("60c72b2f9b1d8b2d88888883", undefined);
    const str = JSON.stringify(result);
    expect(str).toContain("Class 1");
    expect(str).toContain("Student One");
  });

  it("fetches specified class leaderboard if manager visits with classId searchParam", async () => {
    const session = { id: "60c72b2f9b1d8b2d88888881", role: "TEAM_LEAD", status: "ACTIVE", teamId: "60c72b2f9b1d8b2d88888882" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(true);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockClassFind.mockResolvedValue([
      { _id: "60c72b2f9b1d8b2d88888883", name: "Class 1", teamId: "60c72b2f9b1d8b2d88888882", startDayOfWeek: 1 },
      { _id: "60c72b2f9b1d8b2d88888884", name: "Class 2", teamId: "60c72b2f9b1d8b2d88888882", startDayOfWeek: 1 },
    ]);
    mockGetDttClassLeaderboard.mockResolvedValue({
      classInfo: { name: "Class 2", startDayOfWeek: 1, startStr: "2026-07-01", endStr: "2026-07-07" },
      entries: [],
      tasks: [],
    });

    const result = await DttLeaderboardPage({ searchParams: Promise.resolve({ classId: "60c72b2f9b1d8b2d88888884" }) });
    
    expect(mockGetDttClassLeaderboard).toHaveBeenCalledWith("60c72b2f9b1d8b2d88888884", undefined);
    const str = JSON.stringify(result);
    expect(str).toContain("Class 2");
  });

  it("fetches enrolled class leaderboard if student visits", async () => {
    const session = { id: "60c72b2f9b1d8b2d88888881", role: "MEMBER", status: "ACTIVE", teamId: "60c72b2f9b1d8b2d88888882" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue({ classId: "60c72b2f9b1d8b2d88888885", userId: "60c72b2f9b1d8b2d88888881" });
    mockGetDttClassLeaderboard.mockResolvedValue({
      classInfo: { name: "Enrolled Class", startDayOfWeek: 2, startStr: "2026-07-01", endStr: "2026-07-07" },
      entries: [],
      tasks: [],
    });

    const result = await DttLeaderboardPage({ searchParams: Promise.resolve({}) });
    
    expect(mockGetDttClassLeaderboard).toHaveBeenCalledWith("60c72b2f9b1d8b2d88888885", undefined);
    const str = JSON.stringify(result);
    expect(str).toContain("Enrolled Class");
    expect(str).toContain("Thứ Ba");
  });

  it("falls back to the first class if manager visits with classId that does not belong to team", async () => {
    const session = { id: "60c72b2f9b1d8b2d88888881", role: "TEAM_LEAD", status: "ACTIVE", teamId: "60c72b2f9b1d8b2d88888882" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(true);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockClassFind.mockResolvedValue([
      { _id: "60c72b2f9b1d8b2d88888883", name: "Class 1", teamId: "60c72b2f9b1d8b2d88888882", startDayOfWeek: 1 },
      { _id: "60c72b2f9b1d8b2d88888884", name: "Class 2", teamId: "60c72b2f9b1d8b2d88888882", startDayOfWeek: 1 },
    ]);
    mockGetDttClassLeaderboard.mockResolvedValue({
      classInfo: { name: "Class 1", startDayOfWeek: 1, startStr: "2026-07-01", endStr: "2026-07-07" },
      entries: [],
      tasks: [],
    });

    const result = await DttLeaderboardPage({ searchParams: Promise.resolve({ classId: "60c72b2f9b1d8b2d88888889" }) });
    
    expect(mockGetDttClassLeaderboard).toHaveBeenCalledWith("60c72b2f9b1d8b2d88888883", undefined);
    const str = JSON.stringify(result);
    expect(str).toContain("Class 1");
  });
});
