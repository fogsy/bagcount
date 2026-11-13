export {
  DEFAULT_PROGRESS,
  loadProgress,
  saveProgress,
} from './progressRepo';
export type { ProgressRecord } from './progressRepo';

export {
  buildThirtyDayPlan,
  ensurePlan,
  loadPlan,
  markPlanDayComplete,
  planDayIndex,
  savePlan,
} from './planRepo';
export type { PlanDay, TrainingPlan } from './planRepo';

export {
  applyDrillResults,
  getHomeSnapshot,
  loadVoiceSettings,
  updateVoiceSettings,
} from './progressionService';
export type { HomeProgressSnapshot } from './progressionService';

export {
  DEFAULT_SESSION_STATS,
  loadSessionStats,
  recordDrillStats,
  saveSessionStats,
  moveAccuracy,
} from './sessionStatsRepo';
export type { MoveAggregate, SessionStats } from './sessionStatsRepo';

export {
  DEFAULT_ONBOARDING,
  completeOnboarding,
  loadOnboarding,
  loadWelcomeSeen,
  markWelcomeSeen,
  saveOnboarding,
  stanceFromHand,
} from './onboardingRepo';
export type {
  DominantHand,
  OnboardingProfile,
  TrainingGoal,
} from './onboardingRepo';
