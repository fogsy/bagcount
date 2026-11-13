import AsyncStorage from '@react-native-async-storage/async-storage';

import { SEED_DRILLS } from '../coach/seedDrills';
import {
  daysBetween,
  localDayFromDate,
  type LocalDay,
} from '../domain/progression';

const KEY = '@bagcount/plan/v1';

export type PlanDay = {
  dayIndex: number; // 0..29
  drillId: string;
  completed: boolean;
};

export type TrainingPlan = {
  startDay: LocalDay;
  days: PlanDay[];
};

function drillRotationForLevel(level: number): string[] {
  const ids = SEED_DRILLS.map((d) => d.id);
  if (level <= 2) {
    return ['jab-builder', 'cross-control', 'jab-builder', 'one-two-combo'];
  }
  if (level <= 5) {
    return ['jab-builder', 'one-two-combo', 'cross-control', 'speed-hands'];
  }
  return ids.length > 0 ? ids : ['jab-builder'];
}

export function buildThirtyDayPlan(
  startDay: LocalDay,
  level: number,
): TrainingPlan {
  const rotation = drillRotationForLevel(level);
  const days: PlanDay[] = [];
  for (let i = 0; i < 30; i += 1) {
    days.push({
      dayIndex: i,
      drillId: rotation[i % rotation.length]!,
      completed: false,
    });
  }
  return { startDay, days };
}

export async function loadPlan(): Promise<TrainingPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) {
      return null;
    }
    return JSON.parse(raw) as TrainingPlan;
  } catch {
    return null;
  }
}

export async function savePlan(plan: TrainingPlan): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(plan));
}

export async function ensurePlan(level: number): Promise<TrainingPlan> {
  const existing = await loadPlan();
  if (existing != null && existing.days.length === 30) {
    return existing;
  }
  const plan = buildThirtyDayPlan(localDayFromDate(), level);
  await savePlan(plan);
  return plan;
}

export function planDayIndex(plan: TrainingPlan, today: LocalDay): number {
  const delta = daysBetween(plan.startDay, today);
  if (delta < 0) {
    return 0;
  }
  if (delta > 29) {
    return 29;
  }
  return delta;
}

export async function markPlanDayComplete(
  plan: TrainingPlan,
  dayIndex: number,
): Promise<TrainingPlan> {
  const days = plan.days.map((d) =>
    d.dayIndex === dayIndex ? { ...d, completed: true } : d,
  );
  const next = { ...plan, days };
  await savePlan(next);
  return next;
}
