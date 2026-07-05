import { describe, expect, it, vi, beforeEach } from "vitest";
import LeaderboardPage from "./page";

// Define mock functions
const mockGetSessionUser = vi.fn();
const mockCanManageDtt = vi.fn();
const mockRedirect = vi.fn();
const mockEnrollmentFindOne = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@/lib/permissions", () => ({
  canManageDtt: (user: any) => mockCanManageDtt(user),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("@/lib/mongoose", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/models/dtt-enrollment", () => ({
  DttEnrollmentModel: {
    findOne: () => ({
      lean: () => mockEnrollmentFindOne(),
    }),
  },
}));

vi.mock("@/lib/services/leaderboard-service", () => ({
  getLeaderboardMonthLabel: () => "07/2026",
  getTopRegions: vi.fn().mockResolvedValue([]),
  getTopZones: vi.fn().mockResolvedValue([]),
  getTopTdm: vi.fn().mockResolvedValue([]),
  getTopMembers: vi.fn().mockResolvedValue([]),
  getTopNgv: vi.fn().mockResolvedValue([]),
  getTopZoneLeads: vi.fn().mockResolvedValue([]),
  getTopRegionalLeads: vi.fn().mockResolvedValue([]),
}));

// Helper to recursively search for text in React element tree
function hasText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === "string") return node.includes(text);
  if (typeof node === "number" || typeof node === "boolean") return String(node).includes(text);
  if (Array.isArray(node)) {
    return node.some(child => hasText(child, text));
  }
  if (typeof node === "object") {
    if (node.props) {
      if (hasText(node.props.children, text)) return true;
    }
    for (const key in node) {
      if (key === "props" || key === "_owner" || key === "type" || key === "_store" || key === "_self" || key === "_source") {
        continue;
      }
      try {
        if (hasText(node[key], text)) return true;
      } catch (e) {
        // ignore
      }
    }
  }
  return false;
}

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login if user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(result).toBeNull();
  });

  it("does not render the DTT leaderboard banner if user is neither enrolled nor a manager", async () => {
    const session = { id: "user_1", role: "MEMBER", status: "ACTIVE" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);

    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    expect(result).toBeDefined();

    expect(hasText(result, "Bảng xếp hạng Lớp học ĐTT")).toBe(false);
  });

  it("renders the DTT leaderboard banner if user is enrolled", async () => {
    const session = { id: "user_1", role: "MEMBER", status: "ACTIVE" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue({ classId: "class_1", userId: "user_1" });

    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    expect(result).toBeDefined();

    expect(hasText(result, "Bảng xếp hạng Lớp học ĐTT")).toBe(true);
  });

  it("renders the DTT leaderboard banner if user is a manager", async () => {
    const session = { id: "user_manager", role: "TEAM_LEAD", status: "ACTIVE" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(true);
    mockEnrollmentFindOne.mockResolvedValue(null);

    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    expect(result).toBeDefined();

    expect(hasText(result, "Bảng xếp hạng Lớp học ĐTT")).toBe(true);
  });
});
