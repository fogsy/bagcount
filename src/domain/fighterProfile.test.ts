import type { OnboardingProfile } from '../data/onboardingRepo';
import type { SessionStats } from '../data/sessionStatsRepo';
import { deriveFighterProfile } from './fighterProfile';

const baseOnboarding: OnboardingProfile = {
  complete: true,
  goal: 'skill',
  experience: 'beginner',
  dominantHand: 'right',
  stance: 'orthodox',
  displayName: 'Test',
  city: 'NYC',
  stanceTestPassed: true,
};

describe('deriveFighterProfile', () => {
  it('uses defaults when no move stats exist', () => {
    const stats: SessionStats = {
      drillsCompleted: 0,
      totalXpEarned: 0,
      byMove: {},
      lastDrillId: null,
      updatedAt: null,
    };
    const profile = deriveFighterProfile(baseOnboarding, stats);
    expect(profile.stance).toBe('orthodox');
    expect(profile.strengths).toContain('JAB');
    expect(profile.suggestedDrills.length).toBeGreaterThan(0);
  });

  it('ranks strengths and weaknesses by accuracy', () => {
    const stats: SessionStats = {
      drillsCompleted: 3,
      totalXpEarned: 100,
      byMove: {
        JAB: { prompted: 10, hit: 9 },
        CROSS: { prompted: 10, hit: 2 },
        HOOK: { prompted: 5, hit: 4 },
      },
      lastDrillId: 'jab-builder',
      updatedAt: '2026-10-27',
    };
    const profile = deriveFighterProfile(baseOnboarding, stats);
    expect(profile.strengths[0]).toBe('JAB');
    expect(profile.weaknesses[0]).toBe('CROSS');
  });
});
