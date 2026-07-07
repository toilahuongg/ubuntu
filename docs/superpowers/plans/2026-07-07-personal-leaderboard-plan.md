# Personal Leaderboard Result Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the logged-in user's personal result (or their region/zone result) as a sticky bar at the bottom of the global leaderboard page, positioned above the BottomNav.

**Architecture:** Create a service helper to calculate the user's rank/score based on active board tab, import it in the server component page, and render a sticky div at the bottom of the page wrapper with responsive offsets.

**Tech Stack:** Next.js (React), MongoDB (Mongoose), TailwindCSS, Lucide Icons.

---

### Task 1: Create `getUserLeaderboardResult` in `src/lib/services/leaderboard-service.ts`

**Files:**
- Modify: [leaderboard-service.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/services/leaderboard-service.ts)
- Test: [leaderboard-service.test.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/services/leaderboard-service.test.ts)

- [ ] **Step 1: Write tests for `getUserLeaderboardResult`**
  Modify `src/lib/services/leaderboard-service.test.ts` to add tests for `getUserLeaderboardResult` at the end of the file.
  Wait, first update the mocks definition around line 64:
  ```typescript
    UserModel: {
      find: mocks.userFind,
      findById: mocks.userFindById,
    },
  ```
  And add mock reset to `beforeEach`:
  ```typescript
    mocks.userFindById.mockReset();
  ```
  Then append the test suite at the bottom:
  ```typescript
  describe("getUserLeaderboardResult", () => {
    it("returns null if user not found", async () => {
      mocks.userFindById.mockReturnValue({
        lean: () => Promise.resolve(null),
      });
      const res = await getUserLeaderboardResult("user-id", "members");
      expect(res).toBeNull();
    });

    it("returns user role ranking and entry correctly", async () => {
      mocks.userFindById.mockReturnValue({
        lean: () => Promise.resolve({
          _id: objectId("user-id"),
          fullName: "User A",
          role: "MEMBER",
          gender: "male",
          level: 3,
        }),
      });
      mocks.aggregate.mockResolvedValue([
        { _id: objectId("other-id"), monthlyXp: 200 },
        { _id: objectId("user-id"), monthlyXp: 150 },
      ]);

      const res = await getUserLeaderboardResult("user-id", "members");
      expect(res).toEqual({
        type: "user",
        rank: 2,
        totalXp: 150,
        userEntry: {
          fullName: "User A",
          id: "user-id",
          level: 3,
          levelInfo: {
            icon: "/levels/3.png",
            nameVi: "Cấp 3",
          },
          rank: 2,
          totalXp: 150,
        },
      });
    });

    it("returns region ranking and entry correctly", async () => {
      mocks.userFindById.mockReturnValue({
        lean: () => Promise.resolve({
          _id: objectId("user-id"),
          fullName: "User A",
          role: "MEMBER",
          regionId: objectId("region-a"),
        }),
      });
      mocks.aggregate.mockResolvedValue([
        { _id: objectId("region-b"), memberCount: 1, totalXp: 500 },
        { _id: objectId("region-a"), memberCount: 1, totalXp: 300 },
      ]);
      mocks.regionFind.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: objectId("region-a"), code: "KVA", name: "Khu vực A" },
            { _id: objectId("region-b"), code: "KVB", name: "Khu vực B" },
          ]),
        }),
      });

      const res = await getUserLeaderboardResult("user-id", "regions");
      expect(res).toEqual({
        type: "region",
        rank: 2,
        totalXp: 300,
        regionEntry: {
          id: "region-a",
          name: "Khu vực A",
          code: "KVA",
          rank: 2,
          totalXp: 300,
          memberCount: 1,
        },
      });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/lib/services/leaderboard-service.test.ts`
  Expected: fails with compilation errors (functions/types not defined) or failing asserts.

- [ ] **Step 3: Implement `getUserLeaderboardResult` in `src/lib/services/leaderboard-service.ts`**
  Add the types and function implementation at the end of `src/lib/services/leaderboard-service.ts`:
  ```typescript
  const BOARD_TO_ROLE: Record<string, string> = {
    tdm: "TDM",
    members: "MEMBER",
    ngv: "NGV",
    "zone-leads": "ZONE_LEAD",
    leads: "REGIONAL_LEAD",
  };

  export type PersonalLeaderboardResult = {
    type: "user" | "region" | "zone";
    rank: number;
    totalXp: number;
    userEntry?: LeaderboardEntry;
    regionEntry?: RegionLeaderboardEntry;
    zoneEntry?: ZoneLeaderboardEntry;
  };

  async function getRoleLeaderboardRankAndScore(
    user: UserRecord,
    role: string,
  ): Promise<{ rank: number; totalXp: number; entry: LeaderboardEntry } | null> {
    const userId = user._id.toString();
    await connectToDatabase();
    const yearMonth = getCurrentYearMonth();

    const aggregated = (await PointTransactionModel.aggregate([
      ...buildMonthlyPointsPipeline(yearMonth),
      {
        $lookup: {
          as: "user",
          foreignField: "_id",
          from: "users",
          localField: "_id",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": role,
          "user.status": "ACTIVE",
        },
      },
      { $sort: { monthlyXp: -1 } },
    ])) as { _id: unknown; monthlyXp: number }[];

    const userIndex = aggregated.findIndex(
      (row) => (row._id as { toString(): string }).toString() === userId,
    );

    let rank: number;
    let totalXp: number;

    if (userIndex !== -1) {
      rank = userIndex + 1;
      totalXp = aggregated[userIndex].monthlyXp;
    } else {
      rank = aggregated.length + 1;
      totalXp = 0;
    }

    const entry = toLeaderboardEntry(user, totalXp, rank);
    const equippedMap = await getEquippedPayloadsForUsers([userId]);
    const eq = equippedMap.get(userId);
    if (eq) {
      entry.equipped = serializeEquipped(eq);
    }

    return { rank, totalXp, entry };
  }

  export async function getUserLeaderboardResult(
    userId: string,
    activeBoard: string,
  ): Promise<PersonalLeaderboardResult | null> {
    await connectToDatabase();
    const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
    if (!user) return null;

    if (activeBoard === "regions") {
      if (!user.regionId) return null;
      const allRegions = await getTopRegions(999);
      const userRegion = allRegions.find((r) => r.id === user.regionId?.toString());
      if (!userRegion) {
        const region = await RegionModel.findById(user.regionId)
          .select({ code: 1, name: 1 })
          .lean();
        if (!region) return null;
        return {
          type: "region",
          rank: allRegions.length + 1,
          totalXp: 0,
          regionEntry: {
            id: (region._id as { toString(): string }).toString(),
            name: region.name,
            code: region.code,
            rank: allRegions.length + 1,
            totalXp: 0,
            memberCount: 0,
          },
        };
      }
      return {
        type: "region",
        rank: userRegion.rank,
        totalXp: userRegion.totalXp,
        regionEntry: userRegion,
      };
    }

    if (activeBoard === "zones") {
      if (!user.zoneId) return null;
      const allZones = await getTopZones(999);
      const userZone = allZones.find((z) => z.id === user.zoneId?.toString());
      if (!userZone) {
        const zone = await ZoneModel.findById(user.zoneId)
          .select({ code: 1, name: 1 })
          .lean();
        if (!zone) return null;
        return {
          type: "zone",
          rank: allZones.length + 1,
          totalXp: 0,
          zoneEntry: {
            id: (zone._id as { toString(): string }).toString(),
            name: zone.name,
            code: zone.code,
            rank: allZones.length + 1,
            totalXp: 0,
            memberCount: 0,
          },
        };
      }
      return {
        type: "zone",
        rank: userZone.rank,
        totalXp: userZone.totalXp,
        zoneEntry: userZone,
      };
    }

    // Always fetch user's personal rank for their own actual role, regardless of board
    const userRole = user.role;
    // Supported roles for leaderboard
    if (!["TDM", "MEMBER", "NGV", "ZONE_LEAD", "REGIONAL_LEAD"].includes(userRole)) {
      return null;
    }

    const res = await getRoleLeaderboardRankAndScore(user, userRole);
    if (!res) return null;

    return {
      type: "user",
      rank: res.rank,
      totalXp: res.totalXp,
      userEntry: res.entry,
    };
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/lib/services/leaderboard-service.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit service changes**
  ```bash
  git add src/lib/services/leaderboard-service.ts src/lib/services/leaderboard-service.test.ts
  git commit -m "feat: implement getUserLeaderboardResult for personal leaderboard ranking"
  ```

---

### Task 2: Implement UI on `/leaderboard` Page

**Files:**
- Modify: [page.tsx](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/app/(app)/leaderboard/page.tsx)
- Modify: [page.test.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/app/(app)/leaderboard/page.test.ts)

- [ ] **Step 1: Write failing tests for UI**
  Add mock assertions or updates to `src/app/(app)/leaderboard/page.test.ts` that verify `getUserLeaderboardResult` is called and its result is rendered.
  Wait, let's read the test file first to see what functions are mocked.
  Let's look at `src/app/(app)/leaderboard/page.test.ts` to mock `getUserLeaderboardResult`.
  Wait, let's view it first.
  
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/app/(app)/leaderboard/page.test.ts`
  Expected: FAIL (or verify mock calls).

- [ ] **Step 3: Modify page component**
  Import `getUserLeaderboardResult` at the top of `src/app/(app)/leaderboard/page.tsx`:
  ```typescript
  import {
    getLeaderboardMonthLabel,
    getTopMembers,
    getTopNgv,
    getTopRegionalLeads,
    getTopRegions,
    getTopTdm,
    getTopZoneLeads,
    getTopZones,
    getUserLeaderboardResult, // import this
    type RegionLeaderboardEntry,
    type ZoneLeaderboardEntry,
  } from "@/lib/services/leaderboard-service";
  ```
  In `LeaderboardPage` main function:
  Fetch `personalResult` under `entries` fetching:
  ```typescript
  const personalResult = await getUserLeaderboardResult(session.id, activeBoard);
  ```
  Then append the sticky component below `<Section ...>`:
  ```tsx
      {personalResult && (
        <div
          className="sticky bottom-[53px] z-30 w-full max-w-2xl border-t border-primary/20 bg-background/95 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_-8px_30px_rgb(0,0,0,0.12)] transition-all rounded-t-xl"
          style={{ bottom: "calc(53px + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto px-4 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-primary font-bold block mb-1">
              {personalResult.type === "region"
                ? "Khu vực của bạn"
                : personalResult.type === "zone"
                ? "Địa vực của bạn"
                : "Vị trí của bạn"}
            </span>

            {personalResult.type === "user" && personalResult.userEntry && (
              <div className="flex items-center gap-3">
                <RankBadge rank={personalResult.rank} />
                <LevelAvatar
                  src={personalResult.userEntry.levelInfo.icon}
                  alt={personalResult.userEntry.levelInfo.nameVi}
                  equipped={personalResult.userEntry.equipped}
                  size={44}
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                  imageClassName="rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground flex items-center">
                    <CosmeticName
                      fullName={personalResult.userEntry.fullName}
                      equipped={personalResult.userEntry.equipped}
                    />
                    <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">(bạn)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Lv.{personalResult.userEntry.level} — {personalResult.userEntry.levelInfo.nameVi}
                  </p>
                </div>
                <XpValue xp={personalResult.totalXp} />
              </div>
            )}

            {personalResult.type === "region" && personalResult.regionEntry && (
              <div className="flex items-center gap-3">
                <RankBadge rank={personalResult.rank} />
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {personalResult.regionEntry.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {personalResult.regionEntry.code} — {personalResult.regionEntry.memberCount} thành viên
                  </p>
                </div>
                <XpValue xp={personalResult.totalXp} />
              </div>
            )}

            {personalResult.type === "zone" && personalResult.zoneEntry && (
              <div className="flex items-center gap-3">
                <RankBadge rank={personalResult.rank} />
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {personalResult.zoneEntry.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {personalResult.zoneEntry.code} — {personalResult.zoneEntry.memberCount} thành viên
                  </p>
                </div>
                <XpValue xp={personalResult.totalXp} />
              </div>
            )}
          </div>
        </div>
      )}
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/app/(app)/leaderboard/page.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit frontend changes**
  ```bash
  git add src/app/(app)/leaderboard/page.tsx src/app/(app)/leaderboard/page.test.ts
  git commit -m "feat: display sticky personal results bar on leaderboard page"
  ```
