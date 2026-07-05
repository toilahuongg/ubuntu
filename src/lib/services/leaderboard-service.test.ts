import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregate: vi.fn(),
  regionFind: vi.fn(),
  zoneFind: vi.fn(),
  dttClassFindById: vi.fn(),
  dttEnrollmentFind: vi.fn(),
  taskFind: vi.fn(),
  userFind: vi.fn(),
}));

vi.mock("@/lib/dates", () => ({
  getAppTimezone: () => "Asia/Ho_Chi_Minh",
  getCurrentYearMonth: () => "2026-06",
  getWeekRangeFromDateKey: () => ({
    startStr: "2026-06-01",
    endStr: "2026-06-07",
  }),
  getTodayDateKey: () => "2026-06-03",
}));

vi.mock("@/lib/mongoose", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/level-utils", () => ({
  getLevelInfo: (level: number) => ({
    icon: `/levels/${level}.png`,
    nameVi: `Cấp ${level}`,
  }),
}));

vi.mock("@/lib/services/cosmetics-service", () => ({
  getEquippedPayloadsForUsers: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/cosmetics/serialize", () => ({
  serializeEquipped: vi.fn(),
}));

vi.mock("@/lib/models", () => ({
  RegionModel: {
    find: mocks.regionFind,
  },
  SubmissionModel: {
    aggregate: mocks.aggregate,
  },
  ZoneModel: {
    find: mocks.zoneFind,
  },
  DttClassModel: {
    findById: mocks.dttClassFindById,
  },
  DttEnrollmentModel: {
    find: mocks.dttEnrollmentFind,
  },
  TaskModel: {
    find: mocks.taskFind,
  },
  UserModel: {
    find: mocks.userFind,
  },
}));

import {
  getTopZoneLeads,
  getTopZones,
  getDttClassLeaderboard,
} from "@/lib/services/leaderboard-service";

function objectId(value: string) {
  return {
    toString: () => value,
  };
}

describe("leaderboard service", () => {
  beforeEach(() => {
    mocks.aggregate.mockReset();
    mocks.regionFind.mockReset();
    mocks.zoneFind.mockReset();
    mocks.dttClassFindById.mockReset();
    mocks.dttEnrollmentFind.mockReset();
    mocks.taskFind.mockReset();
    mocks.userFind.mockReset();
  });

  it("ranks zones by monthly XP from active users in each zone", async () => {
    mocks.aggregate.mockResolvedValue([
      { _id: objectId("zone-a"), memberCount: 3, totalXp: 420 },
      { _id: objectId("zone-b"), memberCount: 2, totalXp: 210 },
    ]);
    mocks.zoneFind.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            { _id: objectId("zone-a"), code: "DVA", name: "Địa vực A" },
            { _id: objectId("zone-b"), code: "DVB", name: "Địa vực B" },
          ]),
      }),
    });

    await expect(getTopZones(10)).resolves.toEqual([
      {
        code: "DVA",
        id: "zone-a",
        memberCount: 3,
        name: "Địa vực A",
        rank: 1,
        totalXp: 420,
      },
      {
        code: "DVB",
        id: "zone-b",
        memberCount: 2,
        name: "Địa vực B",
        rank: 2,
        totalXp: 210,
      },
    ]);

    expect(mocks.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { $match: { "user.status": "ACTIVE", "user.zoneId": { $ne: null } } },
        {
          $group: {
            _id: "$user.zoneId",
            memberCount: { $sum: 1 },
            totalXp: { $sum: "$monthlyXp" },
          },
        },
      ]),
    );
    const zoneFindFilter = mocks.zoneFind.mock.calls[0]?.[0] as {
      _id?: { $in?: Array<{ toString(): string }> };
    };
    expect(zoneFindFilter._id?.$in?.map((id) => id.toString())).toEqual([
      "zone-a",
      "zone-b",
    ]);
  });

  it("ranks active zone leads as ĐVT - NQL entries", async () => {
    mocks.aggregate.mockResolvedValue([
      {
        monthlyXp: 120,
        user: {
          _id: objectId("lead-a"),
          fullName: "ĐVT A",
          gender: "female",
          level: 7,
        },
      },
    ]);

    await expect(getTopZoneLeads(5)).resolves.toMatchObject([
      {
        fullName: "ĐVT A",
        id: "lead-a",
        level: 7,
        rank: 1,
        totalXp: 120,
      },
    ]);

    const pipeline = mocks.aggregate.mock.calls[0]?.[0] ?? [];
    expect(pipeline).toContainEqual({
      $match: {
        "user.role": "ZONE_LEAD",
        "user.status": "ACTIVE",
      },
    });
    expect(pipeline).toContainEqual({ $limit: 5 });
  });

  it("multiplies pointReward by completionCount in monthly points pipeline", async () => {
    mocks.aggregate.mockResolvedValue([]);
    mocks.zoneFind.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    });

    await getTopZones(10);

    expect(mocks.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $group: {
            _id: "$subjectUserId",
            monthlyXp: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$task.pointReward", 0] },
                  { $ifNull: ["$completionCount", 1] },
                ],
              },
            },
          },
        }),
      ]),
    );
  });

  describe("getDttClassLeaderboard", () => {
    it("throws if the class is not found", async () => {
      mocks.dttClassFindById.mockReturnValue({
        lean: () => Promise.resolve(null),
      });

      await expect(getDttClassLeaderboard("60c72b2f9b1d8b2d88888888")).rejects.toThrow("Không tìm thấy lớp học.");
    });
  });
});

