import type { Drill } from '../coach/drill';
import { SEED_DRILLS, getDrillById } from '../coach/seedDrills';
import type { OnboardingProfile } from '../data/onboardingRepo';
import { moveAccuracy, type SessionStats } from '../data/sessionStatsRepo';
import type { BoxingStance, PunchType } from './punchDetector';

const ALL_MOVES: PunchType[] = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'];

const WEAKNESS_TO_DRILL: Record<PunchType, string> = {
  JAB: 'jab-builder',
  CROSS: 'cross-control',
  HOOK: 'speed-hands',
  UPPERCUT: 'speed-hands',
};

export type FighterProfile = {
  displayName: string;
  stance: BoxingStance;
  goal: string | null;
  experience: string | null;
  strengths: PunchType[];
  weaknesses: PunchType[];
  suggestedDrills: Drill[];
  drillsCompleted: number;
};

export function deriveFighterProfile(
  onboarding: OnboardingProfile,
  stats: SessionStats,
): FighterProfile {
  const ranked = ALL_MOVES.map((move) => ({
    move,
    accuracy: moveAccuracy(stats.byMove[move]),
    prompted: stats.byMove[move]?.prompted ?? 0,
  })).filter((row) => row.prompted > 0);

  let strengths: PunchType[] = [];
  let weaknesses: PunchType[] = [];

  if (ranked.length === 0) {
    strengths = ['JAB'];
    weaknesses = ['CROSS', 'HOOK'];
  } else {
    const sorted = [...ranked].sort((a, b) => b.accuracy - a.accuracy);
    strengths = sorted.slice(0, 2).map((r) => r.move);
    weaknesses = [...sorted]
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 2)
      .map((r) => r.move);
  }

  const suggestedIds = [
    ...new Set(weaknesses.map((w) => WEAKNESS_TO_DRILL[w])),
  ];
  const suggestedDrills = suggestedIds
    .map((id) => getDrillById(id))
    .filter((d): d is Drill => d != null);

  if (suggestedDrills.length === 0) {
    suggestedDrills.push(SEED_DRILLS[0]!);
  }

  return {
    displayName: onboarding.displayName || 'Fighter',
    stance: onboarding.stance ?? 'orthodox',
    goal: onboarding.goal,
    experience: onboarding.experience,
    strengths,
    weaknesses,
    suggestedDrills,
    drillsCompleted: stats.drillsCompleted,
  };
}
