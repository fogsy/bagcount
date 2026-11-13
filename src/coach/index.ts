export type {
  Drill,
  DrillDifficulty,
  DrillResults,
  MoveAccuracy,
} from './drill';

export { getDrillById, SEED_DRILLS } from './seedDrills';

export {
  DEFAULT_DRILL_SESSION_CONFIG,
  DrillSession,
} from './drillSession';
export type {
  DrillSessionCallbacks,
  DrillSessionConfig,
} from './drillSession';

export { CoachVoice } from './coachVoice';
export type { CoachIntensity, FeedbackKind } from './coachVoice';

export {
  phraseForCombo,
  phraseForEncourage,
  phraseForFeedback,
  phraseForMove,
  speechOptionsForIntensity,
} from './coachPhrases';

export { createExpoSpeechEngine } from './speechEngine';
export type { SpeechEngine, SpeechOptions } from './speechEngine';

export { punchTypeToAvatarState } from './CoachAvatar';
export type {
  CoachAvatarController,
  CoachAvatarState,
} from './CoachAvatar';
