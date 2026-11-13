import { LM, type PoseFrame, type PoseLandmark } from '../poseTypes';

export const FRAME_WIDTH = 1000;
export const FRAME_HEIGHT = 2000;
export const DT_MS = 33;

export function lm(x: number, y: number, visibility = 1): PoseLandmark {
  return { x, y, visibility };
}

export type BodyPose = {
  nose?: PoseLandmark;
  leftShoulder?: PoseLandmark;
  rightShoulder?: PoseLandmark;
  leftElbow?: PoseLandmark;
  rightElbow?: PoseLandmark;
  leftWrist?: PoseLandmark;
  rightWrist?: PoseLandmark;
  leftHip?: PoseLandmark;
  rightHip?: PoseLandmark;
  leftKnee?: PoseLandmark;
  rightKnee?: PoseLandmark;
  leftAnkle?: PoseLandmark;
  rightAnkle?: PoseLandmark;
};

const DEFAULT_BODY: Required<BodyPose> = {
  nose: lm(0.5, 0.18),
  leftShoulder: lm(0.4, 0.3),
  rightShoulder: lm(0.6, 0.3),
  leftElbow: lm(0.35, 0.42),
  rightElbow: lm(0.65, 0.42),
  leftWrist: lm(0.38, 0.36),
  rightWrist: lm(0.62, 0.36),
  leftHip: lm(0.43, 0.55),
  rightHip: lm(0.57, 0.55),
  leftKnee: lm(0.44, 0.72),
  rightKnee: lm(0.56, 0.72),
  leftAnkle: lm(0.4, 0.9),
  rightAnkle: lm(0.6, 0.9),
};

export function frameAt(tMs: number, override: BodyPose = {}): PoseFrame {
  const body = { ...DEFAULT_BODY, ...override };
  const landmarks = Array.from({ length: 33 }, () => lm(0.5, 0.5, 0));
  landmarks[LM.NOSE] = body.nose;
  landmarks[LM.LEFT_SHOULDER] = body.leftShoulder;
  landmarks[LM.RIGHT_SHOULDER] = body.rightShoulder;
  landmarks[LM.LEFT_ELBOW] = body.leftElbow;
  landmarks[LM.RIGHT_ELBOW] = body.rightElbow;
  landmarks[LM.LEFT_WRIST] = body.leftWrist;
  landmarks[LM.RIGHT_WRIST] = body.rightWrist;
  landmarks[LM.LEFT_HIP] = body.leftHip;
  landmarks[LM.RIGHT_HIP] = body.rightHip;
  landmarks[LM.LEFT_KNEE] = body.leftKnee;
  landmarks[LM.RIGHT_KNEE] = body.rightKnee;
  landmarks[LM.LEFT_ANKLE] = body.leftAnkle;
  landmarks[LM.RIGHT_ANKLE] = body.rightAnkle;
  return {
    landmarks,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    tMs,
  };
}

/** Pixel delta → normalized using FRAME_WIDTH/HEIGHT. */
export function moveNorm(dxPx: number, dyPx: number): { x: number; y: number } {
  return { x: dxPx / FRAME_WIDTH, y: dyPx / FRAME_HEIGHT };
}
