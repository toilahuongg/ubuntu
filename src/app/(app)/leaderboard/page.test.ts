import { describe, expect, it, vi, beforeEach } from "vitest";
import LeaderboardPage from "./page";
import {
  getCurrentPeriodKey,
  getLeaderboardPeriodLabel,
} from "@/lib/services/leaderboard-service";
import type * as LeaderboardServiceModule from "@/lib/services/leaderboard-service";

// Define mock functions
const mockGetSessionUser = vi.fn();
const mockCanManageDtt = vi.fn();
const mockRedirect = vi.fn();
const mockEnrollmentFindOne = vi.fn();
const mockGetUserLeaderboardResult = vi.fn();
const mockGetTopRegions = vi.fn();
const mockGetTopZones = vi.fn();
const mockGetTopTdm = vi.fn();
const mockGetTopMembers = vi.fn();
const mockGetTopNgv = vi.fn();
const mockGetTopZoneLeads = vi.fn();
const mockGetTopRegionalLeads = vi.fn();
const mockGetTopTeamLeads = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@/lib/permissions", () => ({
  canManageDtt: (user: unknown) => mockCanManageDtt(user),
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

vi.mock("@/lib/services/leaderboard-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof LeaderboardServiceModule>();
  return {
    ...actual,
    getTopRegions: (...args: unknown[]) => mockGetTopRegions(...args),
    getTopZones: (...args: unknown[]) => mockGetTopZones(...args),
    getTopTdm: (...args: unknown[]) => mockGetTopTdm(...args),
    getTopMembers: (...args: unknown[]) => mockGetTopMembers(...args),
    getTopNgv: (...args: unknown[]) => mockGetTopNgv(...args),
    getTopZoneLeads: (...args: unknown[]) => mockGetTopZoneLeads(...args),
    getTopRegionalLeads: (...args: unknown[]) => mockGetTopRegionalLeads(...args),
    getTopTeamLeads: (...args: unknown[]) => mockGetTopTeamLeads(...args),
    getUserLeaderboardResult: () => mockGetUserLeaderboardResult(),
  };
});

// Helper to recursively search for text in React element tree
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      } catch {
        // ignore
      }
    }
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findComponent(node: any, componentName: string): any {
  if (!node) return null;
  if (node.type && (node.type.name === componentName || node.type === componentName)) return node;
  if (node.props && node.props.children) {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
    for (const child of children) {
      const found = findComponent(child, componentName);
      if (found) return found;
    }
  }
  return null;
}

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserLeaderboardResult.mockResolvedValue(null);
    mockGetTopRegions.mockResolvedValue([]);
    mockGetTopZones.mockResolvedValue([]);
    mockGetTopTdm.mockResolvedValue([]);
    mockGetTopMembers.mockResolvedValue([]);
    mockGetTopNgv.mockResolvedValue([]);
    mockGetTopZoneLeads.mockResolvedValue([]);
    mockGetTopRegionalLeads.mockResolvedValue([]);
    mockGetTopTeamLeads.mockResolvedValue([]);
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

  it("renders the personal leaderboard results if available", async () => {
    const session = { id: "user_1", role: "MEMBER", status: "ACTIVE" };
    mockGetSessionUser.mockResolvedValue(session);
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockGetUserLeaderboardResult.mockResolvedValue({
      type: "user",
      rank: 4,
      totalXp: 120,
      userEntry: {
        id: "user_1",
        fullName: "User One",
        level: 5,
        levelInfo: { icon: "/levels/5.png", nameVi: "Cấp 5" },
        rank: 4,
        totalXp: 120,
      },
    });

    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    expect(result).toBeDefined();
    expect(hasText(result, "Vị trí của bạn")).toBe(true);
    expect(hasText(result, "(bạn)")).toBe(true);

    const cosmeticNameNode = findComponent(result, "CosmeticName");
    expect(cosmeticNameNode).toBeDefined();
    expect(cosmeticNameNode.props.fullName).toBe("User One");

    const levelAvatarNode = findComponent(result, "LevelAvatar");
    expect(levelAvatarNode).toBeDefined();
    expect(levelAvatarNode.props.src).toBe("/levels/5.png");
  });
  it("scopes member boards to the viewer's team", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "user_1",
      role: "MEMBER",
      status: "ACTIVE",
      teamId: "team-1",
    });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);

    await LeaderboardPage({
      searchParams: Promise.resolve({ board: "members" }),
    });

    expect(mockGetTopMembers).toHaveBeenCalledWith(
      10,
      "month",
      getCurrentPeriodKey("month"),
      "team-1",
    );
  });

  it("falls back to system-wide member boards for viewers without a team", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "user_1",
      role: "MEMBER",
      status: "ACTIVE",
    });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);

    await LeaderboardPage({ searchParams: Promise.resolve({ board: "tdm" }) });

    expect(mockGetTopTdm).toHaveBeenCalledWith(
      10,
      "month",
      getCurrentPeriodKey("month"),
      null,
    );
  });

  it("labels the personal result as team-scoped for viewers with a team", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "user_1",
      role: "MEMBER",
      status: "ACTIVE",
      teamId: "team-1",
    });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockGetUserLeaderboardResult.mockResolvedValue({
      type: "user",
      rank: 4,
      totalXp: 120,
      userEntry: {
        id: "user_1",
        fullName: "User One",
        level: 5,
        levelInfo: { icon: "/levels/5.png", nameVi: "Cấp 5" },
        rank: 4,
        totalXp: 120,
      },
    });

    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    expect(hasText(result, "Vị trí của bạn trong nhóm")).toBe(true);
  });
  function orgEntry(id: string) {
    return {
      id,
      name: `Org ${id}`,
      code: id.toUpperCase(),
      rank: 1,
      totalXp: 10,
      memberCount: 2,
    };
  }

  it("orders boards TĐM, TĐ, NTĐ, KVT, KV, ĐVT, ĐV, CS-NQL", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "user_1", role: "MEMBER", status: "ACTIVE" });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockGetTopZones.mockResolvedValueOnce([orgEntry("zone-1"), orgEntry("zone-2")]);
    mockGetTopZoneLeads.mockResolvedValueOnce([orgEntry("zl-1"), orgEntry("zl-2")]);
    mockGetTopTeamLeads.mockResolvedValueOnce([orgEntry("tl-1"), orgEntry("tl-2")]);

    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    const boardSelect = findComponent(result, "LeaderboardBoardSelect");
    expect(boardSelect).toBeDefined();
    expect(boardSelect.props.boards.map((b: { label: string }) => b.label)).toEqual([
      "Top TĐM",
      "Top TĐ",
      "Top NTĐ",
      "Top KVT",
      "Top Khu vực",
      "Top ĐVT - NQL",
      "Top Địa vực",
      "Top CS - NQL",
    ]);
  });

  it("hides sparse org boards and falls back to the first visible board", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "user_1", role: "MEMBER", status: "ACTIVE" });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockGetTopZones.mockResolvedValueOnce([orgEntry("zone-1")]);

    const result = await LeaderboardPage({ searchParams: Promise.resolve({}) });
    const boardSelect = findComponent(result, "LeaderboardBoardSelect");
    const values = boardSelect.props.boards.map((b: { value: string }) => b.value);
    expect(values).not.toContain("zones");
    expect(values).not.toContain("zone-leads");
    expect(values).not.toContain("team-leads");
    expect(values).toContain("regions");
    expect(boardSelect.props.activeBoard).toBe("tdm");
    expect(hasText(result, "Top Địa vực")).toBe(false);
  });

  it("passes the viewer's teamId to the team leads board", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "user_1",
      role: "MEMBER",
      status: "ACTIVE",
      teamId: "team-1",
    });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockGetTopTeamLeads.mockResolvedValue([
      orgEntry("tl-1"),
      orgEntry("tl-2"),
    ]);

    await LeaderboardPage({
      searchParams: Promise.resolve({ board: "team-leads" }),
    });

    expect(mockGetTopTeamLeads).toHaveBeenCalledWith(
      10,
      "month",
      getCurrentPeriodKey("month"),
      "team-1",
    );
  });

  it("scopes org aggregate boards to the viewer's team", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "user_1",
      role: "MEMBER",
      status: "ACTIVE",
      teamId: "team-1",
    });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockGetTopRegions.mockResolvedValue([
      orgEntry("region-1"),
      orgEntry("region-2"),
    ]);

    await LeaderboardPage({
      searchParams: Promise.resolve({ board: "regions" }),
    });

    expect(mockGetTopRegions).toHaveBeenCalledWith(
      10,
      "month",
      getCurrentPeriodKey("month"),
      "team-1",
    );
  });

  it("keeps member boards visible even when empty", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "user_1", role: "MEMBER", status: "ACTIVE" });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);
    mockGetTopRegions.mockResolvedValueOnce([orgEntry("region-1")]);

    const result = await LeaderboardPage({ searchParams: Promise.resolve({ board: "members" }) });
    const boardSelect = findComponent(result, "LeaderboardBoardSelect");
    const values = boardSelect.props.boards.map((b: { value: string }) => b.value);
    expect(values).toContain("members");
    expect(values).toContain("tdm");
    expect(values).toContain("ngv");
    expect(values).toContain("leads");
  });

  it("clamps unknown period keys to the current period", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "user_1", role: "MEMBER", status: "ACTIVE" });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);

    const result = await LeaderboardPage({
      searchParams: Promise.resolve({ period: "month", key: "2020-01" }),
    });
    const expectedLabel = getLeaderboardPeriodLabel("month", getCurrentPeriodKey("month"));
    expect(hasText(result, expectedLabel)).toBe(true);
    expect(hasText(result, "Tháng 01/2020")).toBe(false);
  });

  it("renders a selectable past month label", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "user_1", role: "MEMBER", status: "ACTIVE" });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);

    const year = new Date().getFullYear();
    const result = await LeaderboardPage({
      searchParams: Promise.resolve({ period: "month", key: `${year}-01` }),
    });
    expect(hasText(result, `Tháng 01/${year}`)).toBe(true);
  });

  it("renders week period labels for the current week", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "user_1", role: "MEMBER", status: "ACTIVE" });
    mockCanManageDtt.mockReturnValue(false);
    mockEnrollmentFindOne.mockResolvedValue(null);

    const result = await LeaderboardPage({
      searchParams: Promise.resolve({ period: "week" }),
    });
    const expectedLabel = getLeaderboardPeriodLabel("week", getCurrentPeriodKey("week"));
    expect(hasText(result, expectedLabel)).toBe(true);
  });

});
