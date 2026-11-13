import type { PunchType } from '../domain/punchDetector';

export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type Drill = {
  id: string;
  name: string;
  targetMoves: PunchType[];
  comboSequence: PunchType[];
  durationSec: number;
  rounds: number;
  difficulty: DrillDifficulty;
  description: string;
};

export type MoveAccuracy = {
  move: PunchType;
  prompted: number;
  hit: number;
  accuracy: number;
};

export type DrillResults = {
  drillId: string;
  drillName: string;
  score: number;
  xpEarned: number;
  accuracyOverall: number;
  speedScore: number;
  combosCompleted: number;
  perMove: MoveAccuracy[];
  durationSec: number;
};
