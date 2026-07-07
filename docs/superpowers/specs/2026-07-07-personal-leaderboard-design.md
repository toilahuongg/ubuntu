# Design Spec: Personal Leaderboard Result Display

This document outlines the design for displaying the logged-in user's personal result (or their region/zone result) as a sticky bar at the bottom of the global leaderboard page.

## 1. Objectives

- Allow users to see their personal ranking and score on the leaderboard even if they are not in the top 10 list.
- Keep the result visible at the bottom of the viewport, sticking just above the mobile BottomNav bar.
- Make the personal result contextual:
  - If viewing "Top Khu vực" (regions), show the user's region rank.
  - If viewing "Top Địa vực" (zones), show the user's zone rank.
  - If viewing any individual board (tdm, members, ngv, zone-leads, leads), show the user's personal user ranking based on their actual role (e.g. MEMBER rank for a MEMBER).

## 2. Technical Design

### A. Backend / Service Changes

We will add a new helper function in [leaderboard-service.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/services/leaderboard-service.ts):

```typescript
export type PersonalLeaderboardResult = {
  type: "user" | "region" | "zone";
  rank: number;
  totalXp: number;
  userEntry?: LeaderboardEntry;
  regionEntry?: RegionLeaderboardEntry;
  zoneEntry?: ZoneLeaderboardEntry;
};

export async function getUserLeaderboardResult(
  userId: string,
  activeBoard: string,
): Promise<PersonalLeaderboardResult | null>
```

#### Logic Flow:
1. Fetch the user details using `UserModel.findById(userId).lean()`. If user not found, return `null`.
2. Determine `activeBoard`:
   - **`regions`**:
     - Check if `user.regionId` exists. If not, return `null`.
     - Fetch all region rankings via `getTopRegions(999)`.
     - Find the user's region.
     - If found, return rank and details. If not found (0 XP), return rank `allRegions.length + 1` with 0 XP.
   - **`zones`**:
     - Check if `user.zoneId` exists. If not, return `null`.
     - Fetch all zone rankings via `getTopZones(999)`.
     - Find the user's zone.
     - If found, return rank and details. If not found (0 XP), return rank `allZones.length + 1` with 0 XP.
   - **Individual boards (`tdm`, `members`, `ngv`, `zone-leads`, `leads`)**:
     - Determine the user's actual role (`user.role`). If it is not one of `TDM`, `MEMBER`, `NGV`, `ZONE_LEAD`, `REGIONAL_LEAD`, return `null`.
     - Retrieve all active users with this role and sum their monthly points.
     - Sort by monthly XP descending.
     - Find the target user's index in this list.
     - Calculate rank (`index + 1`) and score. If not found, rank is `list.length + 1` and score is `0`.
     - Construct a `LeaderboardEntry` including the level info and cosmetics payload.
     - Return the result.

### B. Frontend Changes

We will modify [page.tsx](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/app/(app)/leaderboard/page.tsx):

1. Import `getUserLeaderboardResult` from the leaderboard service.
2. In the `LeaderboardPage` component, call `getUserLeaderboardResult(session.id, activeBoard)` to fetch the personal result.
3. Add a sticky container at the bottom of the page layout, rendering the user's ranking.
4. Position the container just above the BottomNav using `sticky bottom-[53px]` and a fallback calc style `bottom: calc(53px + env(safe-area-inset-bottom))`.
5. Style the sticky container:
   - Outer container: `sticky bottom-[53px] z-30 w-full max-w-2xl border-t border-primary/20 bg-background/95 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_-8px_30px_rgb(0,0,0,0.12)]`
   - Inner item container: Highlighting border/glow, background color of `bg-primary/5 dark:bg-primary/10`, padding, rounded corners, displaying a small text label "Kết quả của bạn" or "Khu vực của bạn" or "Địa vực của bạn" depending on the type.

## 3. Verification Plan

### Automated Tests
- Create unit tests for `getUserLeaderboardResult` in `leaderboard-service.test.ts` or similar.
- Verify that it returns the correct rank for a user with XP.
- Verify that it returns the correct rank for a user with 0 XP.
- Verify that it returns region/zone rank correctly.

### Manual Verification
- Log in with different user accounts (different roles, regions, zones).
- View the leaderboard page and switch between tabs.
- Ensure the sticky bar stays positioned right above the bottom tab bar.
- Ensure the scroll content does not get blocked and is fully viewable when scrolling to the bottom.
