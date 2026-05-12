import { describe, expect, it } from "vitest";

import { getLevelFromXp, getProgressToNextLevel, xpForLevel } from "@/lib/xp";

describe("xp", () => {
  it("uses the 12-level cumulative XP thresholds from the reference", () => {
    expect(Array.from({ length: 12 }, (_, index) => xpForLevel(index + 1))).toEqual([
      1_000,
      2_000,
      4_000,
      7_000,
      12_000,
      19_000,
      29_000,
      44_000,
      64_000,
      94_000,
      144_000,
      144_000,
    ]);
  });

  it("calculates levels from XP and caps at level 12", () => {
    expect(getLevelFromXp(999)).toBe(1);
    expect(getLevelFromXp(1_000)).toBe(2);
    expect(getLevelFromXp(93_999)).toBe(10);
    expect(getLevelFromXp(94_000)).toBe(11);
    expect(getLevelFromXp(143_999)).toBe(11);
    expect(getLevelFromXp(144_000)).toBe(12);
    expect(getLevelFromXp(999_999)).toBe(12);
  });

  it("returns max-level progress without a next-level span", () => {
    expect(getProgressToNextLevel(144_000)).toEqual({
      currentLevel: 12,
      currentLevelXp: 144_000,
      nextLevelXp: 144_000,
      progressXp: 0,
    });
  });
});
