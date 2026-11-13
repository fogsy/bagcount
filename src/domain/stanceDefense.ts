import { angleDeg, clamp, dist, isVisible, shoulderScalePx, toPx } from './poseMath';
import { LM, type PoseFrame, type PoseLandmark } from './poseTypes';

export type DefenseEventType = 'GUARD' | 'SLIP' | 'BLOCK';

export type DefenseEvent = {
  type: DefenseEventType;
  tMs: number;
  confidence: number;
};

export type StanceDefenseConfig = {
  visibilityMin: number;
  scaleEpsPx: number;
  guardWristToNoseMaxSw: number;
  guardSustainMs: number;
  guardCooldownMs: number;
  slipLateralMinSw: number;
  slipWindowMs: number;
  slipCooldownMs: number;
  blockRiseMinSw: number;
  blockHeadBandSw: number;
  blockSustainMs: number;
  blockCooldownMs: number;
  stanceWidthMin: number;
  stanceWidthMax: number;
  kneeBendIdealDeg: number;
  kneeBendToleranceDeg: number;
};

export const DEFAULT_STANCE_DEFENSE_CONFIG: StanceDefenseConfig = {
  visibilityMin: 0.3,
  scaleEpsPx: 1e-3,
  guardWristToNoseMaxSw: 0.55,
  guardSustainMs: 280,
  guardCooldownMs: 900,
  slipLateralMinSw: 0.18,
  slipWindowMs: 280,
  slipCooldownMs: 700,
  blockRiseMinSw: 0.12,
  blockHeadBandSw: 0.7,
  blockSustainMs: 200,
  blockCooldownMs: 800,
  stanceWidthMin: 0.95,
  stanceWidthMax: 1.45,
  kneeBendIdealDeg: 155,
  kneeBendToleranceDeg: 25,
};

export class StanceDefenseTracker {
  private config: StanceDefenseConfig;
  private readonly onEvent: (event: DefenseEvent) => void;
  private readonly onForm: (score: number, tMs: number) => void;

  private guardSinceMs: number | null = null;
  private blockSinceMs: number | null = null;
  private lastGuardMs = Number.NEGATIVE_INFINITY;
  private lastSlipMs = Number.NEGATIVE_INFINITY;
  private lastBlockMs = Number.NEGATIVE_INFINITY;

  private noseAnchorX: number | null = null;
  private noseAnchorTMs = 0;
  private prevWristYSw: { left: number; right: number } | null = null;
  private prevTMs = 0;

  constructor(
    config: Partial<StanceDefenseConfig> = {},
    onEvent: (event: DefenseEvent) => void = () => {},
    onForm: (score: number, tMs: number) => void = () => {},
  ) {
    this.config = { ...DEFAULT_STANCE_DEFENSE_CONFIG, ...config };
    this.onEvent = onEvent;
    this.onForm = onForm;
  }

  setConfig(partial: Partial<StanceDefenseConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  reset(): void {
    this.guardSinceMs = null;
    this.blockSinceMs = null;
    this.lastGuardMs = Number.NEGATIVE_INFINITY;
    this.lastSlipMs = Number.NEGATIVE_INFINITY;
    this.lastBlockMs = Number.NEGATIVE_INFINITY;
    this.noseAnchorX = null;
    this.noseAnchorTMs = 0;
    this.prevWristYSw = null;
    this.prevTMs = 0;
  }

  processFrame(frame: PoseFrame): number {
    const cfg = this.config;
    const ls = frame.landmarks[LM.LEFT_SHOULDER];
    const rs = frame.landmarks[LM.RIGHT_SHOULDER];
    const nose = frame.landmarks[LM.NOSE];
    const lw = frame.landmarks[LM.LEFT_WRIST];
    const rw = frame.landmarks[LM.RIGHT_WRIST];
    const lh = frame.landmarks[LM.LEFT_HIP];
    const rh = frame.landmarks[LM.RIGHT_HIP];

    if (!isVisible(ls, cfg.visibilityMin) || !isVisible(rs, cfg.visibilityMin)) {
      this.onForm(0, frame.tMs);
      return 0;
    }

    const scale = shoulderScalePx(frame, ls, rs);
    if (scale < cfg.scaleEpsPx) {
      this.onForm(0, frame.tMs);
      return 0;
    }

    const formScore = this.computeFormScore(frame, scale);
    this.onForm(formScore, frame.tMs);

    if (
      isVisible(nose, cfg.visibilityMin) &&
      isVisible(lw, cfg.visibilityMin) &&
      isVisible(rw, cfg.visibilityMin)
    ) {
      this.trackGuard(frame, scale, nose, lw, rw);
      this.trackBlock(frame, scale, nose, lw, rw);
    }

    if (
      isVisible(nose, cfg.visibilityMin) &&
      isVisible(lh, cfg.visibilityMin) &&
      isVisible(rh, cfg.visibilityMin)
    ) {
      this.trackSlip(frame, scale, nose, lh, rh);
    }

    return formScore;
  }

  private trackGuard(
    frame: PoseFrame,
    scale: number,
    nose: PoseLandmark,
    lw: PoseLandmark,
    rw: PoseLandmark,
  ): void {
    const cfg = this.config;
    const nosePx = toPx(nose, frame);
    const leftDist = dist(toPx(lw, frame), nosePx) / scale;
    const rightDist = dist(toPx(rw, frame), nosePx) / scale;
    const guarding =
      leftDist <= cfg.guardWristToNoseMaxSw &&
      rightDist <= cfg.guardWristToNoseMaxSw;

    if (guarding) {
      if (this.guardSinceMs == null) {
        this.guardSinceMs = frame.tMs;
      } else if (
        frame.tMs - this.guardSinceMs >= cfg.guardSustainMs &&
        frame.tMs - this.lastGuardMs >= cfg.guardCooldownMs
      ) {
        this.lastGuardMs = frame.tMs;
        this.onEvent({
          type: 'GUARD',
          tMs: frame.tMs,
          confidence: clamp(1 - (leftDist + rightDist) / 2, 0.4, 1),
        });
      }
    } else {
      this.guardSinceMs = null;
    }
  }

  private trackBlock(
    frame: PoseFrame,
    scale: number,
    nose: PoseLandmark,
    lw: PoseLandmark,
    rw: PoseLandmark,
  ): void {
    const cfg = this.config;
    const noseY = toPx(nose, frame).y;
    const leftY = toPx(lw, frame).y;
    const rightY = toPx(rw, frame).y;
    const leftYSw = leftY / scale;
    const rightYSw = rightY / scale;
    const nearHead =
      Math.abs(leftY - noseY) / scale <= cfg.blockHeadBandSw &&
      Math.abs(rightY - noseY) / scale <= cfg.blockHeadBandSw;

    let rising = false;
    if (this.prevWristYSw != null && frame.tMs > this.prevTMs) {
      const dLeft = this.prevWristYSw.left - leftYSw;
      const dRight = this.prevWristYSw.right - rightYSw;
      rising = dLeft >= cfg.blockRiseMinSw && dRight >= cfg.blockRiseMinSw;
    }

    if (nearHead && (rising || this.blockSinceMs != null)) {
      if (this.blockSinceMs == null) {
        this.blockSinceMs = frame.tMs;
      } else if (
        nearHead &&
        frame.tMs - this.blockSinceMs >= cfg.blockSustainMs &&
        frame.tMs - this.lastBlockMs >= cfg.blockCooldownMs
      ) {
        this.lastBlockMs = frame.tMs;
        this.onEvent({ type: 'BLOCK', tMs: frame.tMs, confidence: 0.75 });
        this.blockSinceMs = null;
      }
    } else if (!nearHead) {
      this.blockSinceMs = null;
    }

    this.prevWristYSw = { left: leftYSw, right: rightYSw };
    this.prevTMs = frame.tMs;
  }

  private trackSlip(
    frame: PoseFrame,
    scale: number,
    nose: PoseLandmark,
    lh: PoseLandmark,
    rh: PoseLandmark,
  ): void {
    const cfg = this.config;
    const hipMidX = (toPx(lh, frame).x + toPx(rh, frame).x) / 2;
    const noseX = toPx(nose, frame).x;
    const offsetSw = (noseX - hipMidX) / scale;

    if (this.noseAnchorX == null || frame.tMs - this.noseAnchorTMs > cfg.slipWindowMs) {
      this.noseAnchorX = offsetSw;
      this.noseAnchorTMs = frame.tMs;
      return;
    }

    const delta = Math.abs(offsetSw - this.noseAnchorX);
    if (
      delta >= cfg.slipLateralMinSw &&
      frame.tMs - this.lastSlipMs >= cfg.slipCooldownMs
    ) {
      this.lastSlipMs = frame.tMs;
      this.onEvent({
        type: 'SLIP',
        tMs: frame.tMs,
        confidence: clamp(delta / (cfg.slipLateralMinSw * 2), 0.5, 1),
      });
      this.noseAnchorX = offsetSw;
      this.noseAnchorTMs = frame.tMs;
    }
  }

  private computeFormScore(frame: PoseFrame, scale: number): number {
    const cfg = this.config;
    let score = 55;

    const la = frame.landmarks[LM.LEFT_ANKLE];
    const ra = frame.landmarks[LM.RIGHT_ANKLE];
    if (isVisible(la, cfg.visibilityMin) && isVisible(ra, cfg.visibilityMin)) {
      const widthRatio = dist(toPx(la, frame), toPx(ra, frame)) / scale;
      const mid = (cfg.stanceWidthMin + cfg.stanceWidthMax) / 2;
      const span = (cfg.stanceWidthMax - cfg.stanceWidthMin) / 2;
      const stancePts = 25 * (1 - clamp(Math.abs(widthRatio - mid) / span, 0, 1));
      score += stancePts;
    }

    const lk = frame.landmarks[LM.LEFT_KNEE];
    const rk = frame.landmarks[LM.RIGHT_KNEE];
    const lh = frame.landmarks[LM.LEFT_HIP];
    const rh = frame.landmarks[LM.RIGHT_HIP];
    if (
      isVisible(lh, cfg.visibilityMin) &&
      isVisible(lk, cfg.visibilityMin) &&
      isVisible(la, cfg.visibilityMin) &&
      isVisible(rh, cfg.visibilityMin) &&
      isVisible(rk, cfg.visibilityMin) &&
      isVisible(ra, cfg.visibilityMin)
    ) {
      const leftKnee = angleDeg(toPx(lh, frame), toPx(lk, frame), toPx(la, frame));
      const rightKnee = angleDeg(toPx(rh, frame), toPx(rk, frame), toPx(ra, frame));
      const avg = (leftKnee + rightKnee) / 2;
      const kneePts =
        15 *
        (1 -
          clamp(
            Math.abs(avg - cfg.kneeBendIdealDeg) / cfg.kneeBendToleranceDeg,
            0,
            1,
          ));
      score += kneePts;
    }

    const nose = frame.landmarks[LM.NOSE];
    const lw = frame.landmarks[LM.LEFT_WRIST];
    const rw = frame.landmarks[LM.RIGHT_WRIST];
    if (
      isVisible(nose, cfg.visibilityMin) &&
      isVisible(lw, cfg.visibilityMin) &&
      isVisible(rw, cfg.visibilityMin)
    ) {
      const nosePx = toPx(nose, frame);
      const leftDist = dist(toPx(lw, frame), nosePx) / scale;
      const rightDist = dist(toPx(rw, frame), nosePx) / scale;
      if (
        leftDist <= cfg.guardWristToNoseMaxSw &&
        rightDist <= cfg.guardWristToNoseMaxSw
      ) {
        score += 10;
      }
    }

    return Math.round(clamp(score, 0, 100));
  }
}
