import type { PunchType } from '../domain/punchDetector';

export type CoachIntensity = 'low' | 'med' | 'high';

export type FeedbackKind = 'miss' | 'guard' | 'good' | 'celebrate';

const MOVE_WORDS: Record<PunchType, string> = {
  JAB: 'Jab',
  CROSS: 'Cross',
  HOOK: 'Hook',
  UPPERCUT: 'Uppercut',
};

const MISS: Record<CoachIntensity, string[]> = {
  low: ['Again.', 'Reset.'],
  med: ['Missed it — reset and go.', 'Keep your eyes up.'],
  high: [
    'That one slipped — chin tucked, hands up, fire again!',
    'Reset your feet and throw it clean!',
  ],
};

const GUARD: Record<CoachIntensity, string[]> = {
  low: ['Guard up.'],
  med: ['Keep your guard up.'],
  high: ['Hands high — protect that chin!'],
};

const GOOD: Record<CoachIntensity, string[]> = {
  low: ['Nice.'],
  med: ['Clean shot.', 'Yes — that’s it.'],
  high: ['Beautiful — that’s the one!', 'Sharp! Keep that power coming!'],
};

const ENCOURAGE: Record<CoachIntensity, string[]> = {
  low: ['Breathe.', 'Next round.'],
  med: ['Shake it out — next round.', 'You’re working. Stay ready.'],
  high: [
    'Big breath — you’re still in this fight!',
    'Champions rest between rounds — then we go again!',
  ],
};

const CELEBRATE: Record<CoachIntensity, string[]> = {
  low: ['Done.', 'Good work.'],
  med: ['Session complete — solid work.', 'That’s a wrap. Nice session.'],
  high: [
    'That’s a fighter’s session — take the win!',
    'You showed up and finished. Proud of that work!',
  ],
};

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0]!;
}

export function phraseForMove(move: PunchType): string {
  return MOVE_WORDS[move];
}

export function phraseForCombo(moves: PunchType[], intensity: CoachIntensity): string {
  const words = moves.map((m) => MOVE_WORDS[m]);
  if (intensity === 'low') {
    return words.join(', ');
  }
  if (intensity === 'med') {
    return `${words.join(', ')}!`;
  }
  return `${words.join(', ')}! Let’s go!`;
}

export function phraseForFeedback(
  kind: FeedbackKind,
  intensity: CoachIntensity,
): string {
  switch (kind) {
    case 'miss':
      return pick(MISS[intensity]);
    case 'guard':
      return pick(GUARD[intensity]);
    case 'good':
      return pick(GOOD[intensity]);
    case 'celebrate':
      return pick(CELEBRATE[intensity]);
    default:
      return '';
  }
}

export function phraseForEncourage(intensity: CoachIntensity): string {
  return pick(ENCOURAGE[intensity]);
}

export function speechOptionsForIntensity(intensity: CoachIntensity): {
  rate: number;
  pitch: number;
} {
  switch (intensity) {
    case 'low':
      return { rate: 0.95, pitch: 1 };
    case 'high':
      return { rate: 1.1, pitch: 1.05 };
    default:
      return { rate: 1, pitch: 1 };
  }
}
