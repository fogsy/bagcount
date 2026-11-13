import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BoxingStance } from '../domain/punchDetector';
import type { DrillDifficulty } from '../coach/drill';

const KEY = '@bagcount/onboarding/v1';
const WELCOME_KEY = '@bagcount/welcomeSeen/v1';

export type TrainingGoal = 'fitness' | 'skill' | 'competition';
export type DominantHand = 'left' | 'right';

export type OnboardingProfile = {
  complete: boolean;
  goal: TrainingGoal | null;
  experience: DrillDifficulty | null;
  dominantHand: DominantHand | null;
  stance: BoxingStance | null;
  displayName: string;
  city: string;
  stanceTestPassed: boolean;
};

export const DEFAULT_ONBOARDING: OnboardingProfile = {
  complete: false,
  goal: null,
  experience: null,
  dominantHand: null,
  stance: null,
  displayName: 'Fighter',
  city: '',
  stanceTestPassed: false,
};

export function stanceFromHand(hand: DominantHand): BoxingStance {
  // Right-hand dominant → orthodox (left lead); left-hand → southpaw.
  return hand === 'right' ? 'orthodox' : 'southpaw';
}

export async function loadOnboarding(): Promise<OnboardingProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) {
      return { ...DEFAULT_ONBOARDING };
    }
    return { ...DEFAULT_ONBOARDING, ...(JSON.parse(raw) as OnboardingProfile) };
  } catch {
    return { ...DEFAULT_ONBOARDING };
  }
}

export async function saveOnboarding(
  profile: OnboardingProfile,
): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}

export async function completeOnboarding(
  partial: Partial<OnboardingProfile>,
): Promise<OnboardingProfile> {
  const prev = await loadOnboarding();
  const next: OnboardingProfile = {
    ...prev,
    ...partial,
    complete: true,
  };
  if (next.dominantHand != null) {
    next.stance = stanceFromHand(next.dominantHand);
  }
  await saveOnboarding(next);
  return next;
}

export async function loadWelcomeSeen(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(WELCOME_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_KEY, '1');
}
