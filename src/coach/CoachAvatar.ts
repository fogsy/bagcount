import type { PunchType } from '../domain/punchDetector';

export type CoachAvatarState =
  | 'idle'
  | 'jab'
  | 'cross'
  | 'hook'
  | 'uppercut'
  | 'celebrate';

/** Imperative coach character API — swap Animated / Lottie / 3D later. */
export type CoachAvatarController = {
  setState: (state: CoachAvatarState) => void;
  reset: () => void;
};

export function punchTypeToAvatarState(move: PunchType): CoachAvatarState {
  switch (move) {
    case 'JAB':
      return 'jab';
    case 'CROSS':
      return 'cross';
    case 'HOOK':
      return 'hook';
    case 'UPPERCUT':
      return 'uppercut';
    default:
      return 'idle';
  }
}
