import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();
const db = admin.firestore();

const openRouterApiKey = defineSecret('OPENROUTER_API_KEY');

const MAX_XP_PER_HOUR = 5000;
const MAX_SCORE = 100;
const JEV_MODEL = 'typesafe/jev-1.14';
const PUNCH_TYPES = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'] as const;
type PunchType = (typeof PUNCH_TYPES)[number];
type HandSide = 'left' | 'right';
type BoxingStance = 'orthodox' | 'southpaw';

type PunchKinematicsPayload = {
  stance?: BoxingStance;
  hand?: HandSide;
  leadHand?: HandSide;
  pathDxSw?: number;
  pathDySw?: number;
  peakSpeedSwPerSec?: number;
  elbowExtensionDeg?: number;
  localGuess?: PunchType;
  localConfidence?: number;
};

type SubmitPayload = {
  xp?: number;
  score?: number;
  city?: string;
  displayName?: string;
  weekId?: string;
};

export const submitScore = onCall(async (request) => {
  if (request.auth == null) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const data = request.data as SubmitPayload;
  const xp = Math.max(0, Math.floor(Number(data.xp) || 0));
  const score = Math.min(MAX_SCORE, Math.max(0, Math.floor(Number(data.score) || 0)));
  const city = String(data.city ?? 'Unknown').slice(0, 64);
  const displayName = String(data.displayName ?? 'Fighter').slice(0, 40);
  const weekId = String(data.weekId ?? '').slice(0, 16);
  if (!/^\d{4}-W\d{2}$/.test(weekId)) {
    throw new HttpsError('invalid-argument', 'Invalid weekId.');
  }

  const userRef = db.collection('users').doc(uid);
  const scoreRef = db.collection('weeks').doc(weekId).collection('scores').doc(uid);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const prev = userSnap.data() as
      | { lastSubmitAt?: number; lastSubmitXp?: number }
      | undefined;
    const lastSubmitAt = prev?.lastSubmitAt ?? 0;
    const lastSubmitXp = prev?.lastSubmitXp ?? 0;
    const hours = Math.max(1 / 60, (now - lastSubmitAt) / (1000 * 60 * 60));
    const deltaXp = Math.max(0, xp - lastSubmitXp);
    if (deltaXp / hours > MAX_XP_PER_HOUR) {
      throw new HttpsError(
        'resource-exhausted',
        'XP rate limit exceeded. Try again later.',
      );
    }
    // Never allow score/xp to go backwards for the week.
    const existing = await tx.get(scoreRef);
    const existingData = existing.data() as
      | { xp?: number; score?: number }
      | undefined;
    const finalXp = Math.max(existingData?.xp ?? 0, xp);
    const finalScore = Math.max(existingData?.score ?? 0, score);

    tx.set(
      scoreRef,
      {
        uid,
        displayName,
        city,
        xp: finalXp,
        score: finalScore,
        updatedAt: new Date(now).toISOString(),
      },
      { merge: true },
    );
    tx.set(
      userRef,
      {
        lastSubmitAt: now,
        lastSubmitXp: finalXp,
        displayName,
        city,
      },
      { merge: true },
    );
  });

  return { ok: true };
});

export const classifyPunch = onCall(
  { secrets: [openRouterApiKey] },
  async (request) => {
    if (request.auth == null) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    const apiKey = openRouterApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenRouter is not configured.');
    }

    const raw = (request.data ?? {}) as PunchKinematicsPayload;
    const state = sanitizeKinematics(raw);

    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/alpha/decisions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://boxingai.app',
          'X-Title': 'BoxingAI Punch Classify',
        },
        body: JSON.stringify({
          model: JEV_MODEL,
          state,
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
    } catch {
      throw new HttpsError('unavailable', 'OpenRouter request failed.');
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      if (response.status === 429) {
        throw new HttpsError('resource-exhausted', 'OpenRouter rate limited.');
      }
      throw new HttpsError(
        'internal',
        `OpenRouter error ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const body = (await response.json()) as {
      answers?: {
        is_punch?: { type?: string; noul?: number };
        punch_type?: {
          type?: string;
          choice?: string;
          confidence?: number;
          probabilities?: Record<string, number>;
        };
      };
    };

    const isPunch = Number(body.answers?.is_punch?.noul ?? 0);
    const choice = String(body.answers?.punch_type?.choice ?? '');
    const type = PUNCH_TYPES.includes(choice as PunchType)
      ? (choice as PunchType)
      : state.localGuess;
    const confidence = clamp01(Number(body.answers?.punch_type?.confidence ?? 0));
    const probabilities = body.answers?.punch_type?.probabilities ?? {};

    return {
      type,
      confidence,
      isPunch: clamp01(isPunch),
      probabilities,
      source: 'jev' as const,
    };
  },
);

export const weeklyReset = onSchedule('0 0 * * 0', async () => {
  const metaRef = db.collection('meta').doc('league');
  const metaSnap = await metaRef.get();
  const activeWeek = (metaSnap.data()?.activeWeek as string | undefined) ?? null;
  if (activeWeek == null) {
    await metaRef.set({ activeWeek: currentWeekIdUtc() }, { merge: true });
    return;
  }

  const scoresSnap = await db.collection('weeks').doc(activeWeek).collection('scores').get();
  const archiveBatch = db.batch();
  const podium = scoresSnap.docs
    .map((d) => d.data())
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 3);
  archiveBatch.set(db.collection('archives').doc(activeWeek), {
    archivedAt: new Date().toISOString(),
    podium,
    count: scoresSnap.size,
  });
  await archiveBatch.commit();

  const nextWeek = currentWeekIdUtc();
  await metaRef.set({ activeWeek: nextWeek, lastResetAt: new Date().toISOString() });
});

function currentWeekIdUtc(date = new Date()): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function finiteOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeKinematics(raw: PunchKinematicsPayload) {
  const stance: BoxingStance = raw.stance === 'southpaw' ? 'southpaw' : 'orthodox';
  const hand: HandSide = raw.hand === 'right' ? 'right' : 'left';
  const leadHand: HandSide =
    raw.leadHand === 'right' || raw.leadHand === 'left'
      ? raw.leadHand
      : stance === 'orthodox'
        ? 'left'
        : 'right';
  const localGuess: PunchType = PUNCH_TYPES.includes(raw.localGuess as PunchType)
    ? (raw.localGuess as PunchType)
    : hand === leadHand
      ? 'JAB'
      : 'CROSS';

  return {
    sport: 'boxing',
    stance,
    hand,
    leadHand,
    pathDxSw: Number(finiteOr(raw.pathDxSw, 0).toFixed(4)),
    pathDySw: Number(finiteOr(raw.pathDySw, 0).toFixed(4)),
    peakSpeedSwPerSec: Number(finiteOr(raw.peakSpeedSwPerSec, 0).toFixed(4)),
    elbowExtensionDeg: Number(finiteOr(raw.elbowExtensionDeg, 0).toFixed(1)),
    localGuess,
    localConfidence: Number(clamp01(finiteOr(raw.localConfidence, 0)).toFixed(3)),
  };
}
