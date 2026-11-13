import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CoachIntensity } from '../coach/coachPhrases';
import { levelFromXp, type LocalDay } from '../domain/progression';

const KEY = '@bagcount/progress/v1';

export type ProgressRecord = {
  totalXp: number;
  level: number;
  streakCount: number;
  lastActiveDay: LocalDay | null;
  mute: boolean;
  coachIntensity: CoachIntensity;
};

export const DEFAULT_PROGRESS: ProgressRecord = {
  totalXp: 0,
  level: 1,
  streakCount: 0,
  lastActiveDay: null,
  mute: false,
  coachIntensity: 'med',
};

export async function loadProgress(): Promise<ProgressRecord> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) {
      return { ...DEFAULT_PROGRESS };
    }
    const parsed = JSON.parse(raw) as Partial<ProgressRecord>;
    const totalXp = Math.max(0, Number(parsed.totalXp) || 0);
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      totalXp,
      level: levelFromXp(totalXp),
      streakCount: Math.max(0, Number(parsed.streakCount) || 0),
      lastActiveDay: parsed.lastActiveDay ?? null,
      mute: Boolean(parsed.mute),
      coachIntensity:
        parsed.coachIntensity === 'low' ||
        parsed.coachIntensity === 'high' ||
        parsed.coachIntensity === 'med'
          ? parsed.coachIntensity
          : 'med',
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveProgress(record: ProgressRecord): Promise<void> {
  const next = {
    ...record,
    level: levelFromXp(record.totalXp),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
