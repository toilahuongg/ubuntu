export function xpForLevel(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level) <= totalXp) {
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
