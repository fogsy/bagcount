export type LocalDay = string; // YYYY-MM-DD in local timezone

export function localDayFromDate(date: Date = new Date()): LocalDay {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDay(day: LocalDay): Date {
  const [y, m, d] = day.split('-').map((n) => Number(n));
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addLocalDays(day: LocalDay, delta: number): LocalDay {
  const date = parseLocalDay(day);
  date.setDate(date.getDate() + delta);
  return localDayFromDate(date);
}

export function daysBetween(a: LocalDay, b: LocalDay): number {
  const ms =
    parseLocalDay(b).getTime() - parseLocalDay(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/** level = floor(sqrt(xp / 100)) + 1 */
export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpFloorForLevel(level: number): number {
  const lvl = Math.max(1, level);
  return 100 * (lvl - 1) * (lvl - 1);
}

export function xpFloorForNextLevel(level: number): number {
  return xpFloorForLevel(level + 1);
}

export function xpProgressInLevel(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  ratio: number;
} {
  const level = levelFromXp(totalXp);
  const floor = xpFloorForLevel(level);
  const next = xpFloorForNextLevel(level);
  const xpForLevel = Math.max(1, next - floor);
  const xpIntoLevel = Math.max(0, totalXp - floor);
  return {
    level,
    xpIntoLevel,
    xpForLevel,
    ratio: Math.min(1, xpIntoLevel / xpForLevel),
  };
}

export type StreakState = {
  streakCount: number;
  lastActiveDay: LocalDay | null;
};

/**
 * Apply activity on `today`.
 * - same day → no change
 * - yesterday → streak + 1
 * - gap > 1 → streak resets to 1
 * - first activity → streak = 1
 */
export function applyStreakDay(
  state: StreakState,
  today: LocalDay,
): StreakState {
  if (state.lastActiveDay == null) {
    return { streakCount: 1, lastActiveDay: today };
  }
  if (state.lastActiveDay === today) {
    return state;
  }
  const gap = daysBetween(state.lastActiveDay, today);
  if (gap === 1) {
    return {
      streakCount: state.streakCount + 1,
      lastActiveDay: today,
    };
  }
  if (gap > 1) {
    return { streakCount: 1, lastActiveDay: today };
  }
  // today is before lastActiveDay (clock skew) — keep last, don't regress
  return state;
}
