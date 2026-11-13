import {
  dist,
  elbowExtensionDeg,
  isVisible,
  shoulderScalePx,
  toPx,
  type Vec2,
} from './poseMath';
import {
  LM,
  type HandSide,
  type PoseFrame,
  type PoseLandmark,
} from './poseTypes';

export type PunchType = 'JAB' | 'CROSS' | 'HOOK' | 'UPPERCUT';

export type PunchEvent = {
  type: PunchType;
  hand: HandSide;
  tMs: number;
  confidence: number;
};

export type BoxingStance = 'orthodox' | 'southpaw';

export type PunchKinematics = {
  stance: BoxingStance;
  hand: HandSide;
  leadHand: HandSide;
  pathDxSw: number;
  pathDySw: number;
  peakSpeedSwPerSec: number;
  elbowExtensionDeg: number;
  localGuess: PunchType;
  localConfidence: number;
};

export type PunchPeak = {
  event: PunchEvent;
  kinematics: PunchKinematics;
};

export type PunchDetectorConfig = {
  stance: BoxingStance;
  visibilityMin: number;
  scaleEpsPx: number;
  maxDtMs: number;
  speedThresholdSwPerSec: number;
  decelRatio: number;
  extensionMinDeg: number;
  hookExtensionMaxDeg: number;
  hookLateralRatio: number;
  uppercutUpRatio: number;
  cooldownMs: number;
  refractoryMs: number;
};

export const DEFAULT_PUNCH_CONFIG: PunchDetectorConfig = {
  stance: 'orthodox',
  visibilityMin: 0.3,
  scaleEpsPx: 1e-3,
  maxDtMs: 250,
  speedThresholdSwPerSec: 2.0,
  decelRatio: 0.65,
  extensionMinDeg: 130,
  hookExtensionMaxDeg: 145,
  hookLateralRatio: 0.7,
  uppercutUpRatio: 0.6,
  cooldownMs: 220,
  refractoryMs: 120,
};

type HandState = {
  seeded: boolean;
  prev: Vec2;
  prevTMs: number;
  prevSpeed: number | null;
  prevPrevSpeed: number | null;
  lastEmitMs: number;
  pathDx: number;
  pathDy: number;
};

function freshHand(): HandState {
  return {
    seeded: false,
    prev: { x: 0, y: 0 },
    prevTMs: 0,
    prevSpeed: null,
    prevPrevSpeed: null,
    lastEmitMs: Number.NEGATIVE_INFINITY,
    pathDx: 0,
    pathDy: 0,
  };
}

function leadHand(stance: BoxingStance): HandSide {
  return stance === 'orthodox' ? 'left' : 'right';
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class PunchDetector {
  private config: PunchDetectorConfig;
  private readonly onEvent: (event: PunchEvent) => void;
  private readonly onPeak: ((peak: PunchPeak) => void) | null;
  private left = freshHand();
  private right = freshHand();
  private lastGlobalEmitMs = Number.NEGATIVE_INFINITY;

  constructor(
    config: Partial<PunchDetectorConfig> = {},
    onEvent: (event: PunchEvent) => void = () => {},
    onPeak: ((peak: PunchPeak) => void) | null = null,
  ) {
    this.config = { ...DEFAULT_PUNCH_CONFIG, ...config };
    this.onEvent = onEvent;
    this.onPeak = onPeak;
  }

  setConfig(partial: Partial<PunchDetectorConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getConfig(): PunchDetectorConfig {
    return { ...this.config };
  }

  reset(): void {
    this.left = freshHand();
    this.right = freshHand();
    this.lastGlobalEmitMs = Number.NEGATIVE_INFINITY;
  }

  processFrame(frame: PoseFrame): void {
    const cfg = this.config;
    const ls = frame.landmarks[LM.LEFT_SHOULDER];
    const rs = frame.landmarks[LM.RIGHT_SHOULDER];
    if (!isVisible(ls, cfg.visibilityMin) || !isVisible(rs, cfg.visibilityMin)) {
      return;
    }

    const scale = shoulderScalePx(frame, ls, rs);
    if (scale < cfg.scaleEpsPx) {
      return;
    }

    this.processHand('left', this.left, frame, scale, ls);
    this.processHand('right', this.right, frame, scale, rs);
  }

  private processHand(
    side: HandSide,
    hand: HandState,
    frame: PoseFrame,
    scale: number,
    shoulder: PoseLandmark,
  ): void {
    const cfg = this.config;
    const wristIdx = side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;
    const elbowIdx = side === 'left' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW;
    const wrist = frame.landmarks[wristIdx];
    const elbow = frame.landmarks[elbowIdx];
    if (!isVisible(wrist, cfg.visibilityMin) || !isVisible(elbow, cfg.visibilityMin)) {
      hand.seeded = false;
      hand.prevSpeed = null;
      hand.prevPrevSpeed = null;
      hand.pathDx = 0;
      hand.pathDy = 0;
      return;
    }

    const pos = toPx(wrist, frame);
    if (!hand.seeded) {
      hand.seeded = true;
      hand.prev = pos;
      hand.prevTMs = frame.tMs;
      hand.prevSpeed = null;
      hand.prevPrevSpeed = null;
      hand.pathDx = 0;
      hand.pathDy = 0;
      return;
    }

    const dtMs = frame.tMs - hand.prevTMs;
    if (dtMs <= 0 || dtMs > cfg.maxDtMs) {
      hand.prev = pos;
      hand.prevTMs = frame.tMs;
      hand.prevSpeed = null;
      hand.prevPrevSpeed = null;
      hand.pathDx = 0;
      hand.pathDy = 0;
      return;
    }

    const dx = pos.x - hand.prev.x;
    const dy = pos.y - hand.prev.y;
    const speed = dist(pos, hand.prev) / scale / (dtMs / 1000);

    if (speed >= cfg.speedThresholdSwPerSec * 0.5) {
      hand.pathDx += dx;
      hand.pathDy += dy;
    }

    const peaked =
      hand.prevSpeed != null &&
      hand.prevPrevSpeed != null &&
      hand.prevSpeed >= cfg.speedThresholdSwPerSec &&
      hand.prevSpeed >= hand.prevPrevSpeed &&
      speed < hand.prevSpeed * cfg.decelRatio;

    if (
      peaked &&
      frame.tMs - hand.lastEmitMs >= cfg.refractoryMs &&
      frame.tMs - this.lastGlobalEmitMs >= cfg.cooldownMs
    ) {
      const extension = elbowExtensionDeg(frame, shoulder, elbow, wrist);
      const peakSpeed = hand.prevSpeed ?? speed;
      const pathDxSw = hand.pathDx / scale;
      const pathDySw = hand.pathDy / scale;
      const event = this.classify(side, pathDxSw, pathDySw, extension, frame.tMs);
      if (event != null) {
        hand.lastEmitMs = frame.tMs;
        this.lastGlobalEmitMs = frame.tMs;
        const kinematics: PunchKinematics = {
          stance: cfg.stance,
          hand: side,
          leadHand: leadHand(cfg.stance),
          pathDxSw,
          pathDySw,
          peakSpeedSwPerSec: peakSpeed,
          elbowExtensionDeg: extension,
          localGuess: event.type,
          localConfidence: event.confidence,
        };
        if (this.onPeak != null) {
          this.onPeak({ event, kinematics });
        } else {
          this.onEvent(event);
        }
      }
      hand.pathDx = 0;
      hand.pathDy = 0;
    }

    hand.prevPrevSpeed = hand.prevSpeed;
    hand.prevSpeed = speed;
    hand.prev = pos;
    hand.prevTMs = frame.tMs;
  }

  private classify(
    side: HandSide,
    dxSw: number,
    dySw: number,
    extensionDeg: number,
    tMs: number,
  ): PunchEvent | null {
    const cfg = this.config;
    const absDx = Math.abs(dxSw);
    const absDy = Math.abs(dySw);
    const mag = Math.hypot(absDx, absDy) || 1e-6;
    const upRatio = Math.max(0, -dySw) / mag;
    const lateralRatio = absDx / mag;

    let type: PunchType;
    if (upRatio >= cfg.uppercutUpRatio && -dySw >= absDx) {
      type = 'UPPERCUT';
    } else if (
      lateralRatio >= cfg.hookLateralRatio &&
      upRatio < 0.2 &&
      extensionDeg <= cfg.hookExtensionMaxDeg
    ) {
      type = 'HOOK';
    } else {
      type = side === leadHand(cfg.stance) ? 'JAB' : 'CROSS';
    }

    const speedFactor = clamp01(mag / 0.35);
    const extFactor = clamp01(
      (extensionDeg - (cfg.extensionMinDeg - 30)) / 60,
    );
    const confidence = clamp01(0.45 + 0.35 * speedFactor + 0.2 * extFactor);
    return { type, hand: side, tMs, confidence };
  }
}
