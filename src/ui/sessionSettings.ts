import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NormalizedBox } from '../core/handImpactDetector';

export const COUNT_SETTINGS_KEY = '@bagcount/countSettings';

export type SessionSettings = {
  k: number;
  noiseGateDb: number;
  speedThreshold: number;
  matchWindowMs: number;
  audioOffsetMs: number;
  bagBox: NormalizedBox | null;
};

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  k: 4,
  noiseGateDb: -50,
  speedThreshold: 3,
  matchWindowMs: 130,
  audioOffsetMs: 0,
  bagBox: null,
};

const SAVE_DEBOUNCE_MS = 300;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseBagBox(value: unknown): NormalizedBox | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }
  const box = value as Partial<NormalizedBox>;
  if (
    !isFiniteNumber(box.x) ||
    !isFiniteNumber(box.y) ||
    !isFiniteNumber(box.width) ||
    !isFiniteNumber(box.height) ||
    box.width <= 0 ||
    box.height <= 0
  ) {
    return null;
  }
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseSessionSettings(raw: string | null): SessionSettings {
  if (raw == null) {
    return { ...DEFAULT_SESSION_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SessionSettings>;
    return {
      k: isFiniteNumber(parsed.k) ? clamp(parsed.k, 1, 12) : DEFAULT_SESSION_SETTINGS.k,
      noiseGateDb: isFiniteNumber(parsed.noiseGateDb)
        ? clamp(parsed.noiseGateDb, -80, -20)
        : DEFAULT_SESSION_SETTINGS.noiseGateDb,
      speedThreshold: isFiniteNumber(parsed.speedThreshold)
        ? clamp(parsed.speedThreshold, 0.5, 10)
        : DEFAULT_SESSION_SETTINGS.speedThreshold,
      matchWindowMs: isFiniteNumber(parsed.matchWindowMs)
        ? clamp(parsed.matchWindowMs, 40, 300)
        : DEFAULT_SESSION_SETTINGS.matchWindowMs,
      audioOffsetMs: isFiniteNumber(parsed.audioOffsetMs)
        ? clamp(parsed.audioOffsetMs, -200, 200)
        : DEFAULT_SESSION_SETTINGS.audioOffsetMs,
      bagBox: parseBagBox(parsed.bagBox),
    };
  } catch {
    return { ...DEFAULT_SESSION_SETTINGS };
  }
}

export async function loadSessionSettings(): Promise<SessionSettings> {
  try {
    const raw = await AsyncStorage.getItem(COUNT_SETTINGS_KEY);
    return parseSessionSettings(raw);
  } catch {
    return { ...DEFAULT_SESSION_SETTINGS };
  }
}

export async function saveSessionSettings(settings: SessionSettings): Promise<void> {
  await AsyncStorage.setItem(COUNT_SETTINGS_KEY, JSON.stringify(settings));
}

export function scheduleSaveSessionSettings(settings: SessionSettings): void {
  if (saveTimer != null) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveSessionSettings(settings).catch(() => {});
  }, SAVE_DEBOUNCE_MS);
}

export function saveSessionSettingsNow(settings: SessionSettings): void {
  if (saveTimer != null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveSessionSettings(settings).catch(() => {});
}
