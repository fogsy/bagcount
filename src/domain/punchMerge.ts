import type { PunchEvent, PunchType } from './punchDetector';

export const JEV_IS_PUNCH_MIN = 0.6;
export const JEV_CHOICE_CONFIDENCE_MIN = 0.55;

const PUNCH_TYPES: PunchType[] = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'];

/** Remote Jev (or mock) answer used by the confidence gate. */
export type RemotePunchClassify = {
  type: PunchType;
  confidence: number;
  isPunch: number;
};

export type PunchMergeOutcome =
  | { emit: true; event: PunchEvent; source: 'jev' | 'local' }
  | { emit: false; reason: 'rejected_as_noise' };

/**
 * Confidence-gate Jev answers against the local heuristic label.
 * - Low is_punch → drop the peak (noise).
 * - High choice confidence → use Jev type.
 * - Otherwise / missing remote → keep local.
 */
export function mergePunchClassification(
  local: PunchEvent,
  remote: RemotePunchClassify | null,
): PunchMergeOutcome {
  if (remote == null) {
    return { emit: true, event: local, source: 'local' };
  }

  if (remote.isPunch < JEV_IS_PUNCH_MIN) {
    return { emit: false, reason: 'rejected_as_noise' };
  }

  if (
    remote.confidence >= JEV_CHOICE_CONFIDENCE_MIN &&
    PUNCH_TYPES.includes(remote.type)
  ) {
    return {
      emit: true,
      source: 'jev',
      event: {
        ...local,
        type: remote.type,
        confidence: Math.max(local.confidence, remote.confidence),
      },
    };
  }

  return { emit: true, event: local, source: 'local' };
}
