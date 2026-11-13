import { DT_MS, frameAt, lm } from './poseBuilders';
import type { PoseFrame } from '../poseTypes';

export function guardSequence(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  for (let i = 0; i < 15; i += 1) {
    frames.push(
      frameAt(i * DT_MS, {
        leftWrist: lm(0.48, 0.2),
        rightWrist: lm(0.52, 0.2),
        leftElbow: lm(0.42, 0.32),
        rightElbow: lm(0.58, 0.32),
      }),
    );
  }
  return frames;
}

export function slipSequence(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  // Anchor centered
  for (let i = 0; i < 5; i += 1) {
    frames.push(
      frameAt(i * DT_MS, {
        nose: lm(0.5, 0.18),
        leftHip: lm(0.43, 0.55),
        rightHip: lm(0.57, 0.55),
      }),
    );
  }
  // Lateral slip (~0.25 shoulder widths; shoulders 0.2 norm → 200px, 0.05 norm = 50px = 0.25 sw)
  for (let i = 5; i < 12; i += 1) {
    frames.push(
      frameAt(i * DT_MS, {
        nose: lm(0.56, 0.18),
        leftHip: lm(0.43, 0.55),
        rightHip: lm(0.57, 0.55),
      }),
    );
  }
  return frames;
}

export function blockSequence(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  // Hands low then rise to head
  frames.push(
    frameAt(0, {
      leftWrist: lm(0.4, 0.45),
      rightWrist: lm(0.6, 0.45),
    }),
  );
  frames.push(
    frameAt(DT_MS, {
      leftWrist: lm(0.45, 0.28),
      rightWrist: lm(0.55, 0.28),
    }),
  );
  for (let i = 2; i < 12; i += 1) {
    frames.push(
      frameAt(i * DT_MS, {
        leftWrist: lm(0.47, 0.2),
        rightWrist: lm(0.53, 0.2),
      }),
    );
  }
  return frames;
}

export function goodStanceFrame(tMs = 0): PoseFrame {
  return frameAt(tMs, {
    leftAnkle: lm(0.4, 0.9),
    rightAnkle: lm(0.6, 0.9),
    leftKnee: lm(0.44, 0.72),
    rightKnee: lm(0.56, 0.72),
    leftWrist: lm(0.48, 0.22),
    rightWrist: lm(0.52, 0.22),
  });
}

export function poorStanceFrame(tMs = 0): PoseFrame {
  return frameAt(tMs, {
    leftAnkle: lm(0.48, 0.9),
    rightAnkle: lm(0.52, 0.9),
    leftKnee: lm(0.48, 0.88),
    rightKnee: lm(0.52, 0.88),
    leftWrist: lm(0.2, 0.55),
    rightWrist: lm(0.8, 0.55),
  });
}
