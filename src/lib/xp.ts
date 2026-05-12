const LEVEL_XP_THRESHOLDS = [
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
] as const;

const MAX_LEVEL = LEVEL_XP_THRESHOLDS.length;

export function xpForLevel(level: number): number {
  const safeLevel = Math.min(Math.max(Math.floor(level), 1), MAX_LEVEL);
  return LEVEL_XP_THRESHOLDS[safeLevel - 1]!;
}

export function getLevelFromXp(totalXp: number): number {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level) <= safeXp) {
    level++;
  }
  return level;
}

export function getProgressToNextLevel(totalXp: number) {
  const currentLevel = getLevelFromXp(totalXp);
  const currentLevelXp = currentLevel > 1 ? xpForLevel(currentLevel - 1) : 0;
  const nextLevelXp = xpForLevel(currentLevel);
  return {
    currentLevel,
    currentLevelXp,
    nextLevelXp,
    progressXp: totalXp - currentLevelXp,
  };
}
