import type { PoseFrame, PoseLandmark } from './poseTypes';

export type Vec2 = { x: number; y: number };

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function toPx(
  landmark: PoseLandmark,
  frame: PoseFrame,
): Vec2 {
  return {
    x: landmark.x * frame.frameWidth,
    y: landmark.y * frame.frameHeight,
  };
}

export function isVisible(
  landmark: PoseLandmark | undefined,
  min: number,
): landmark is PoseLandmark {
  return landmark != null && landmark.visibility > min;
}

export function shoulderScalePx(
  frame: PoseFrame,
  leftShoulder: PoseLandmark,
  rightShoulder: PoseLandmark,
): number {
  return dist(toPx(leftShoulder, frame), toPx(rightShoulder, frame));
}

/** Interior angle at `vertex` in degrees (0–180). */
export function angleDeg(a: Vec2, vertex: Vec2, c: Vec2): number {
  const bax = a.x - vertex.x;
  const bay = a.y - vertex.y;
  const bcx = c.x - vertex.x;
  const bcy = c.y - vertex.y;
  const denom = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (denom < 1e-9) {
    return 0;
  }
  const cos = Math.min(1, Math.max(-1, (bax * bcx + bay * bcy) / denom));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function elbowExtensionDeg(
  frame: PoseFrame,
  shoulder: PoseLandmark,
  elbow: PoseLandmark,
  wrist: PoseLandmark,
): number {
  return angleDeg(toPx(shoulder, frame), toPx(elbow, frame), toPx(wrist, frame));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
