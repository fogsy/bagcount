import { httpsCallable } from 'firebase/functions';

import type { PunchKinematics, PunchType } from '../domain/punchDetector';
import {
  ensureAnonymousUser,
  getFirebase,
  isFirebaseConfigured,
} from './firebase';

export type { PunchKinematics };

export type PunchClassifyResult = {
  type: PunchType;
  confidence: number;
  isPunch: number;
  probabilities: Record<string, number>;
  source: 'jev';
};

export const JEV_PUNCH_CLASSIFY_TIMEOUT_MS = 200;
const JEV_MODEL = 'typesafe/jev-1.14';
const PUNCH_TYPES: PunchType[] = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'];

export function isJevPunchClassifyEnabled(): boolean {
  return process.env.EXPO_PUBLIC_JEV_PUNCH_CLASSIFY === '1';
}

/** Debug: call OpenRouter from the app with EXPO_PUBLIC_OPENROUTER_API_KEY. */
export function isJevPunchDebugMode(): boolean {
  return (
    process.env.EXPO_PUBLIC_JEV_PUNCH_DEBUG === '1' &&
    (process.env.EXPO_PUBLIC_OPENROUTER_API_KEY?.length ?? 0) > 0
  );
}

export async function classifyPunchRemote(
  kinematics: PunchKinematics,
  timeoutMs = JEV_PUNCH_CLASSIFY_TIMEOUT_MS,
): Promise<PunchClassifyResult | null> {
  if (!isJevPunchClassifyEnabled()) {
    return null;
  }

  const work = isJevPunchDebugMode()
    ? classifyViaOpenRouterDirect(kinematics)
    : classifyViaFirebase(kinematics);

  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}

async function classifyViaFirebase(
  kinematics: PunchKinematics,
): Promise<PunchClassifyResult | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }
  const fb = getFirebase();
  if (fb == null) {
    return null;
  }
  await ensureAnonymousUser();
  const callable = httpsCallable(fb.functions, 'classifyPunch');
  const result = await callable(kinematics);
  return parseClassifyResult(result.data);
}

async function classifyViaOpenRouterDirect(
  kinematics: PunchKinematics,
): Promise<PunchClassifyResult | null> {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://boxingai.app',
      'X-Title': 'BoxingAI Punch Classify Debug',
    },
    body: JSON.stringify({
      model: JEV_MODEL,
      state: {
        sport: 'boxing',
        ...kinematics,
      },
      questions: {
        is_punch: {
          type: 'noul',
          instructions:
            'Is the kinematics peak in `state` a real boxing punch (not a recovery, drop, or noise)?',
          criteria: {
            true: 'A committed punch with purposeful extension and impact intent',
            false: 'Hand recovery, guard adjustment, camera noise, or incomplete motion',
          },
        },
        punch_type: {
          type: 'choice',
          instructions:
            'Classify the boxing punch from the kinematics in `state`. Use stance and leadHand: lead-hand straights are jabs, rear-hand straights are crosses. Prefer HOOK when path is mostly lateral with a bent elbow, UPPERCUT when path is mostly upward.',
          criteria: {
            JAB: 'Lead-hand straight punch with forward path and extended elbow',
            CROSS: 'Rear-hand straight punch with forward path and extended elbow',
            HOOK: 'Lateral curved punch with bent elbow and limited upward travel',
            UPPERCUT: 'Upward punch with dominant vertical path',
          },
        },
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    answers?: {
      is_punch?: { noul?: number };
      punch_type?: {
        choice?: string;
        confidence?: number;
        probabilities?: Record<string, number>;
      };
    };
  };

  const choice = String(body.answers?.punch_type?.choice ?? '');
  const type = PUNCH_TYPES.includes(choice as PunchType)
    ? (choice as PunchType)
    : kinematics.localGuess;

  return {
    type,
    confidence: clamp01(Number(body.answers?.punch_type?.confidence ?? 0)),
    isPunch: clamp01(Number(body.answers?.is_punch?.noul ?? 0)),
    probabilities: body.answers?.punch_type?.probabilities ?? {},
    source: 'jev',
  };
}

function parseClassifyResult(data: unknown): PunchClassifyResult | null {
  const parsed = data as Partial<PunchClassifyResult> | undefined;
  if (
    parsed == null ||
    parsed.source !== 'jev' ||
    typeof parsed.type !== 'string' ||
    typeof parsed.confidence !== 'number' ||
    typeof parsed.isPunch !== 'number'
  ) {
    return null;
  }
  return {
    type: parsed.type as PunchType,
    confidence: parsed.confidence,
    isPunch: parsed.isPunch,
    probabilities: parsed.probabilities ?? {},
    source: 'jev',
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
