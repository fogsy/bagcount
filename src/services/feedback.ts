import * as Haptics from 'expo-haptics';

import { loadVoiceSettings } from '../data/progressionService';

let sfxMuted = false;

export async function refreshSfxMute(): Promise<void> {
  const settings = await loadVoiceSettings();
  sfxMuted = settings.mute;
}

export function setSfxMuted(muted: boolean): void {
  sfxMuted = muted;
}

export async function hapticHit(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // ignore
  }
}

export async function hapticMiss(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // ignore
  }
}

export async function hapticPrompt(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // ignore
  }
}

export async function hapticLevelUp(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
}

/** SFX hook — wire bundled audio later; respects mute. */
export async function playHitSfx(): Promise<void> {
  if (sfxMuted) {
    return;
  }
  // Intentionally no-op until assets/sfx is added.
}
