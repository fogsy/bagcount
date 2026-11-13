export type {
  HandSide,
  PoseFrame,
  PoseLandmark,
} from './poseTypes';
export { LM } from './poseTypes';

export {
  angleDeg,
  clamp,
  dist,
  elbowExtensionDeg,
  isVisible,
  shoulderScalePx,
  toPx,
} from './poseMath';
export type { Vec2 } from './poseMath';

export {
  DEFAULT_PUNCH_CONFIG,
  PunchDetector,
} from './punchDetector';
export type {
  BoxingStance,
  PunchDetectorConfig,
  PunchEvent,
  PunchKinematics,
  PunchPeak,
  PunchType,
} from './punchDetector';

export { HybridPunchClassifier } from './hybridPunchClassifier';
export type { PunchClassifyFn } from './hybridPunchClassifier';

export {
  JEV_CHOICE_CONFIDENCE_MIN,
  JEV_IS_PUNCH_MIN,
  mergePunchClassification,
} from './punchMerge';
export type { PunchMergeOutcome, RemotePunchClassify } from './punchMerge';

export {
  DEFAULT_STANCE_DEFENSE_CONFIG,
  StanceDefenseTracker,
} from './stanceDefense';
export type {
  DefenseEvent,
  DefenseEventType,
  StanceDefenseConfig,
} from './stanceDefense';

export {
  addLocalDays,
  applyStreakDay,
  daysBetween,
  levelFromXp,
  localDayFromDate,
  parseLocalDay,
  xpFloorForLevel,
  xpFloorForNextLevel,
  xpProgressInLevel,
} from './progression';
export type { LocalDay, StreakState } from './progression';

export { deriveFighterProfile } from './fighterProfile';
export type { FighterProfile } from './fighterProfile';
