export type PoseLandmark = {
  x: number;
  y: number;
  visibility: number;
};

export type PoseFrame = {
  landmarks: PoseLandmark[];
  frameWidth: number;
  frameHeight: number;
  tMs: number;
};

export type NormalizedBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HandSide = 'left' | 'right';

export type HandImpactCandidate = {
  timestampMs: number;
  hand: HandSide;
};

export type HandImpactDetectorParams = {
  speedThreshold?: number;
};

export type HandImpactDetector = {
  processFrame: (frame: PoseFrame) => void;
  setBagBox: (box: NormalizedBox) => void;
  setParams: (params: HandImpactDetectorParams) => void;
  reset: () => void;
};

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const VISIBILITY_MIN = 0.3;
const BOX_EXPAND_SHOULDERS = 0.6;
const DECEL_RATIO = 0.6;
const REFRACTORY_MS = 90;
const DEFAULT_SPEED_THRESHOLD = 3;
const SCALE_EPS = 1e-6;
const MAX_DT_MS = 250;

type HandState = {
  seeded: boolean;
  prevPx: number;
  prevPy: number;
  prevTMs: number;
  prevVisibility: number;
  prevSpeed: number | null;
  prevPrevSpeed: number | null;
  lastCandidateMs: number;
};

function freshHand(): HandState {
  return {
    seeded: false,
    prevPx: 0,
    prevPy: 0,
    prevTMs: 0,
    prevVisibility: 0,
    prevSpeed: null,
    prevPrevSpeed: null,
    lastCandidateMs: Number.NEGATIVE_INFINITY,
  };
}

function toPixels(
  landmark: PoseLandmark,
  frameWidth: number,
  frameHeight: number,
): { px: number; py: number } {
  return {
    px: landmark.x * frameWidth,
    py: landmark.y * frameHeight,
  };
}

function pointInExpandedBox(
  px: number,
  py: number,
  box: NormalizedBox,
  frameWidth: number,
  frameHeight: number,
  expandPx: number,
): boolean {
  const left = box.x * frameWidth - expandPx;
  const top = box.y * frameHeight - expandPx;
  const right = (box.x + box.width) * frameWidth + expandPx;
  const bottom = (box.y + box.height) * frameHeight + expandPx;
  return px >= left && px <= right && py >= top && py <= bottom;
}

export function createHandImpactDetector(
  params: HandImpactDetectorParams = {},
  onCandidate: (event: HandImpactCandidate) => void = () => {},
): HandImpactDetector {
  let speedThreshold = params.speedThreshold ?? DEFAULT_SPEED_THRESHOLD;
  let bagBox: NormalizedBox | null = null;
  let left = freshHand();
  let right = freshHand();

  function processHand(
    hand: HandState,
    side: HandSide,
    wrist: PoseLandmark,
    frame: PoseFrame,
    scale: number,
  ): void {
    const { px, py } = toPixels(wrist, frame.frameWidth, frame.frameHeight);

    if (!hand.seeded) {
      hand.seeded = true;
      hand.prevPx = px;
      hand.prevPy = py;
      hand.prevTMs = frame.tMs;
      hand.prevVisibility = wrist.visibility;
      hand.prevSpeed = null;
      hand.prevPrevSpeed = null;
      return;
    }

    const dtMs = frame.tMs - hand.prevTMs;
    if (dtMs <= 0) {
      return;
    }
    if (dtMs > MAX_DT_MS) {
      hand.prevPx = px;
      hand.prevPy = py;
      hand.prevTMs = frame.tMs;
      hand.prevVisibility = wrist.visibility;
      hand.prevSpeed = null;
      hand.prevPrevSpeed = null;
      return;
    }

    const distPx = Math.hypot(px - hand.prevPx, py - hand.prevPy);
    const currentSpeed = distPx / (dtMs / 1000) / scale;
    const peak = hand.prevSpeed;
    const beforePeak = hand.prevPrevSpeed;

    if (
      bagBox != null &&
      peak != null &&
      beforePeak != null &&
      peak >= beforePeak &&
      peak > speedThreshold &&
      currentSpeed < DECEL_RATIO * peak &&
      hand.prevVisibility > VISIBILITY_MIN &&
      hand.prevTMs - hand.lastCandidateMs >= REFRACTORY_MS &&
      pointInExpandedBox(
        hand.prevPx,
        hand.prevPy,
        bagBox,
        frame.frameWidth,
        frame.frameHeight,
        BOX_EXPAND_SHOULDERS * scale,
      )
    ) {
      hand.lastCandidateMs = hand.prevTMs;
      onCandidate({ timestampMs: hand.prevTMs, hand: side });
    }

    hand.prevPrevSpeed = peak;
    hand.prevSpeed = currentSpeed;
    hand.prevPx = px;
    hand.prevPy = py;
    hand.prevTMs = frame.tMs;
    hand.prevVisibility = wrist.visibility;
  }

  function processFrame(frame: PoseFrame): void {
    const { landmarks, frameWidth, frameHeight } = frame;
    if (landmarks.length <= LEFT_WRIST) {
      left = freshHand();
      right = freshHand();
      return;
    }

    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    if (leftShoulder == null || rightShoulder == null) {
      return;
    }

    const leftShoulderPx = toPixels(leftShoulder, frameWidth, frameHeight);
    const rightShoulderPx = toPixels(rightShoulder, frameWidth, frameHeight);
    const scale = Math.hypot(
      leftShoulderPx.px - rightShoulderPx.px,
      leftShoulderPx.py - rightShoulderPx.py,
    );
    if (scale < SCALE_EPS) {
      return;
    }

    const leftWrist = landmarks[LEFT_WRIST];
    const rightWrist = landmarks[RIGHT_WRIST];
    if (leftWrist != null) {
      processHand(left, 'left', leftWrist, frame, scale);
    }
    if (rightWrist != null) {
      processHand(right, 'right', rightWrist, frame, scale);
    }
  }

  function setBagBox(box: NormalizedBox): void {
    bagBox = box;
  }

  function setParams(next: HandImpactDetectorParams): void {
    if (next.speedThreshold !== undefined) {
      speedThreshold = next.speedThreshold;
    }
  }

  function reset(): void {
    left = freshHand();
    right = freshHand();
  }

  return { processFrame, setBagBox, setParams, reset };
}
