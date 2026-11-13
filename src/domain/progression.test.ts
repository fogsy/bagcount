import {
  applyStreakDay,
  daysBetween,
  levelFromXp,
  localDayFromDate,
  xpProgressInLevel,
} from './progression';

describe('progression', () => {
  it('computes levels from XP curve', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
  });

  it('reports progress within a level', () => {
    const p = xpProgressInLevel(100);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(0);
    expect(p.ratio).toBe(0);
  });

  it('starts streak on first activity', () => {
    const next = applyStreakDay(
      { streakCount: 0, lastActiveDay: null },
      '2026-10-27',
    );
    expect(next).toEqual({ streakCount: 1, lastActiveDay: '2026-10-27' });
  });

  it('is a no-op on the same local day', () => {
    const state = { streakCount: 3, lastActiveDay: '2026-10-27' };
    expect(applyStreakDay(state, '2026-10-27')).toEqual(state);
  });

  it('increments streak across consecutive days', () => {
    const next = applyStreakDay(
      { streakCount: 3, lastActiveDay: '2026-10-26' },
      '2026-10-27',
    );
    expect(next.streakCount).toBe(4);
  });

  it('resets streak after a break', () => {
    const next = applyStreakDay(
      { streakCount: 5, lastActiveDay: '2026-10-20' },
      '2026-10-27',
    );
    expect(next).toEqual({ streakCount: 1, lastActiveDay: '2026-10-27' });
  });

  it('formats local days and measures gaps', () => {
    const day = localDayFromDate(new Date(2026, 9, 27));
    expect(day).toBe('2026-10-27');
    expect(daysBetween('2026-10-26', '2026-10-27')).toBe(1);
    expect(daysBetween('2026-10-20', '2026-10-27')).toBe(7);
  });
});
