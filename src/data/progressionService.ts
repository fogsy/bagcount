import type { Drill, DrillResults } from '../coach/drill';
import { getDrillById } from '../coach/seedDrills';
import type { CoachIntensity } from '../coach/coachPhrases';
import {
  applyStreakDay,
  localDayFromDate,
  levelFromXp,
  xpProgressInLevel,
  type LocalDay,
} from '../domain/progression';
import {
  ensurePlan,
  markPlanDayComplete,
  planDayIndex,
  type TrainingPlan,
} from './planRepo';
import {
  DEFAULT_PROGRESS,
  loadProgress,
  saveProgress,
  type ProgressRecord,
} from './progressRepo';
import { recordDrillStats } from './sessionStatsRepo';

export type HomeProgressSnapshot = {
  progress: ProgressRecord;
  plan: TrainingPlan;
  today: LocalDay;
  todayIndex: number;
  mission: Drill | null;
  xpBar: ReturnType<typeof xpProgressInLevel>;
};

export async function getHomeSnapshot(
  now: Date = new Date(),
): Promise<HomeProgressSnapshot> {
  const today = localDayFromDate(now);
  const progress = await loadProgress();
  const plan = await ensurePlan(progress.level);
  const todayIndex = planDayIndex(plan, today);
  const day = plan.days[todayIndex] ?? plan.days[0]!;
  const mission = getDrillById(day.drillId) ?? getDrillById('jab-builder') ?? null;
  return {
    progress,
    plan,
    today,
    todayIndex,
    mission,
    xpBar: xpProgressInLevel(progress.totalXp),
  };
}

export async function applyDrillResults(
  results: DrillResults,
  now: Date = new Date(),
): Promise<HomeProgressSnapshot> {
  const today = localDayFromDate(now);
  const prev = await loadProgress();
  const streak = applyStreakDay(
    {
      streakCount: prev.streakCount,
      lastActiveDay: prev.lastActiveDay,
    },
    today,
  );
  const totalXp = prev.totalXp + Math.max(0, results.xpEarned);
  const progress: ProgressRecord = {
    ...prev,
    totalXp,
    level: levelFromXp(totalXp),
    streakCount: streak.streakCount,
    lastActiveDay: streak.lastActiveDay,
  };
  await saveProgress(progress);
  await recordDrillStats(results);

  let plan = await ensurePlan(progress.level);
  const todayIndex = planDayIndex(plan, today);
  plan = await markPlanDayComplete(plan, todayIndex);

  const day = plan.days[todayIndex] ?? plan.days[0]!;
  const mission = getDrillById(day.drillId) ?? getDrillById('jab-builder') ?? null;

  return {
    progress,
    plan,
    today,
    todayIndex,
    mission,
    xpBar: xpProgressInLevel(progress.totalXp),
  };
}

export async function updateVoiceSettings(settings: {
  mute?: boolean;
  coachIntensity?: CoachIntensity;
}): Promise<ProgressRecord> {
  const prev = await loadProgress();
  const next: ProgressRecord = {
    ...prev,
    mute: settings.mute ?? prev.mute,
    coachIntensity: settings.coachIntensity ?? prev.coachIntensity,
  };
  await saveProgress(next);
  return next;
}

export async function loadVoiceSettings(): Promise<{
  mute: boolean;
  coachIntensity: CoachIntensity;
}> {
  const p = await loadProgress();
  return { mute: p.mute, coachIntensity: p.coachIntensity };
}

export { DEFAULT_PROGRESS };
