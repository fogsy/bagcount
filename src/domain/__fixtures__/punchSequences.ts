import { DT_MS, FRAME_HEIGHT, FRAME_WIDTH, frameAt, lm, type BodyPose } from './poseBuilders';
import type { PoseFrame } from '../poseTypes';

function sequence(startMs: number, steps: BodyPose[]): PoseFrame[] {
  return steps.map((pose, i) => frameAt(startMs + i * DT_MS, pose));
}

/**
 * Build a peak-then-decel wrist path.
 * speeds: shoulder-widths / sec for each step after the seed frame.
 */
function wristBurst(options: {
  hand: 'left' | 'right';
  start: { x: number; y: number };
  dir: { x: number; y: number }; // unit-ish direction in px space
  speedsSw: number[]; // last is decelerating
  elbow: { x: number; y: number };
  shoulderScalePx?: number;
}): BodyPose[] {
  const scale = options.shoulderScalePx ?? 0.2 * FRAME_WIDTH;
  const frames: BodyPose[] = [];
  let x = options.start.x;
  let y = options.start.y;
  const mag = Math.hypot(options.dir.x, options.dir.y) || 1;
  const ux = options.dir.x / mag;
  const uy = options.dir.y / mag;

  for (const swPerSec of options.speedsSw) {
    const px = swPerSec * scale * (DT_MS / 1000);
    x += (ux * px) / FRAME_WIDTH;
    y += (uy * px) / FRAME_HEIGHT;
    if (options.hand === 'left') {
      frames.push({
        leftWrist: lm(x, y),
        leftElbow: lm(options.elbow.x, options.elbow.y),
      });
    } else {
      frames.push({
        rightWrist: lm(x, y),
        rightElbow: lm(options.elbow.x, options.elbow.y),
      });
    }
  }
  return frames;
}

const RAMP = [2.2, 3.0, 3.8, 4.2, 1.2];

function holdThenBurst(
  hand: 'left' | 'right',
  start: { x: number; y: number },
  elbow: { x: number; y: number },
  dir: { x: number; y: number },
  extra: BodyPose = {},
): BodyPose[] {
  const hold: BodyPose =
    hand === 'left'
      ? { ...extra, leftWrist: lm(start.x, start.y), leftElbow: lm(elbow.x, elbow.y) }
      : {
          ...extra,
          rightWrist: lm(start.x, start.y),
          rightElbow: lm(elbow.x, elbow.y),
        };
  return [
    hold,
    hold,
    ...wristBurst({
      hand,
      start,
      dir,
      speedsSw: RAMP,
      elbow,
    }).map((step) => ({ ...extra, ...step })),
  ];
}

// Elbow on shoulder–wrist line (high extension). Mild inward + slight up = straight.
export const jabSequence = sequence(
  0,
  holdThenBurst('left', { x: 0.42, y: 0.34 }, { x: 0.41, y: 0.32 }, {
    x: 18,
    y: -6,
  }),
);

export const crossSequence = sequence(
  0,
  holdThenBurst('right', { x: 0.58, y: 0.34 }, { x: 0.59, y: 0.32 }, {
    x: -18,
    y: -6,
  }),
);

export const hookSequence = sequence(
  0,
  holdThenBurst('left', { x: 0.38, y: 0.36 }, { x: 0.4, y: 0.48 }, {
    x: 55,
    y: 0,
  }),
);

export const uppercutSequence = sequence(
  0,
  holdThenBurst('right', { x: 0.58, y: 0.58 }, { x: 0.58, y: 0.5 }, {
    x: 0,
    y: -60,
  }),
);

export function scaledJabSequence(shoulderHalfWidthNorm = 0.05): PoseFrame[] {
  const mid = 0.5;
  const ls = mid - shoulderHalfWidthNorm;
  const rs = mid + shoulderHalfWidthNorm;
  const scalePx = (rs - ls) * FRAME_WIDTH;
  const body = {
    leftShoulder: lm(ls, 0.3),
    rightShoulder: lm(rs, 0.3),
  };
  const start = { x: ls + shoulderHalfWidthNorm * 0.4, y: 0.34 };
  const elbow = { x: ls + shoulderHalfWidthNorm * 0.2, y: 0.32 };
  const hold = {
    ...body,
    leftWrist: lm(start.x, start.y),
    leftElbow: lm(elbow.x, elbow.y),
  };
  return sequence(0, [
    hold,
    hold,
    ...wristBurst({
      hand: 'left',
      start,
      dir: { x: 18, y: -6 },
      speedsSw: RAMP,
      elbow,
      shoulderScalePx: scalePx,
    }).map((step) => ({ ...body, ...step })),
  ]);
}

export function doubleJabTooFast(): PoseFrame[] {
  const first = jabSequence;
  const second = sequence(
    first[first.length - 1]!.tMs + DT_MS,
    holdThenBurst('left', { x: 0.42, y: 0.34 }, { x: 0.41, y: 0.32 }, {
      x: 18,
      y: -6,
    }),
  );
  return [...first, ...second];
}
