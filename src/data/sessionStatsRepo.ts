import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DrillResults } from '../coach/drill';
import type { PunchType } from '../domain/punchDetector';

const KEY = '@bagcount/sessionStats/v1';

export type MoveAggregate = {
  prompted: number;
  hit: number;
};

export type SessionStats = {
  drillsCompleted: number;
  totalXpEarned: number;
  byMove: Partial<Record<PunchType, MoveAggregate>>;
  lastDrillId: string | null;
  updatedAt: string | null;
};

export const DEFAULT_SESSION_STATS: SessionStats = {
  drillsCompleted: 0,
  totalXpEarned: 0,
  byMove: {},
  lastDrillId: null,
  updatedAt: null,
};

export async function loadSessionStats(): Promise<SessionStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) {
      return { ...DEFAULT_SESSION_STATS, byMove: {} };
    }
    const parsed = JSON.parse(raw) as SessionStats;
    return {
      ...DEFAULT_SESSION_STATS,
      ...parsed,
      byMove: parsed.byMove ?? {},
    };
  } catch {
    return { ...DEFAULT_SESSION_STATS, byMove: {} };
  }
}

export async function saveSessionStats(stats: SessionStats): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(stats));
}

export async function recordDrillStats(
  results: DrillResults,
): Promise<SessionStats> {
  const prev = await loadSessionStats();
  const byMove: SessionStats['byMove'] = { ...prev.byMove };
  for (const row of results.perMove) {
    const cur = byMove[row.move] ?? { prompted: 0, hit: 0 };
    byMove[row.move] = {
      prompted: cur.prompted + row.prompted,
      hit: cur.hit + row.hit,
    };
  }
  const next: SessionStats = {
    drillsCompleted: prev.drillsCompleted + 1,
    totalXpEarned: prev.totalXpEarned + Math.max(0, results.xpEarned),
    byMove,
    lastDrillId: results.drillId,
    updatedAt: new Date().toISOString(),
  };
  await saveSessionStats(next);
  return next;
}

export function moveAccuracy(agg: MoveAggregate | undefined): number {
  if (agg == null || agg.prompted <= 0) {
    return 0;
  }
  return agg.hit / agg.prompted;
}
