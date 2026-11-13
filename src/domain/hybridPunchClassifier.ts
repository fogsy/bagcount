import { mergePunchClassification } from './punchMerge';
import {
  PunchDetector,
  type PunchDetectorConfig,
  type PunchEvent,
  type PunchKinematics,
} from './punchDetector';
import type { PoseFrame } from './poseTypes';

export type PunchClassifyFn = (
  kinematics: PunchKinematics,
) => Promise<RemoteLike | null>;

type RemoteLike = {
  type: PunchEvent['type'];
  confidence: number;
  isPunch: number;
};

/**
 * Local peak detection + optional remote Jev classify.
 * Pose loop stays sync; classify runs async and does not block frames.
 */
export class HybridPunchClassifier {
  private readonly detector: PunchDetector;
  private readonly onEvent: (event: PunchEvent) => void;
  private readonly classify: PunchClassifyFn | null;
  private inFlight = 0;
  private disposed = false;

  constructor(
    config: Partial<PunchDetectorConfig> = {},
    onEvent: (event: PunchEvent) => void = () => {},
    classify: PunchClassifyFn | null = null,
  ) {
    this.onEvent = onEvent;
    this.classify = classify;
    this.detector = new PunchDetector(config, () => {}, (peak) => {
      this.handlePeak(peak.event, peak.kinematics);
    });
  }

  setConfig(partial: Partial<PunchDetectorConfig>): void {
    this.detector.setConfig(partial);
  }

  getConfig(): PunchDetectorConfig {
    return this.detector.getConfig();
  }

  reset(): void {
    this.detector.reset();
  }

  dispose(): void {
    this.disposed = true;
  }

  processFrame(frame: PoseFrame): void {
    this.detector.processFrame(frame);
  }

  private handlePeak(event: PunchEvent, kinematics: PunchKinematics): void {
    if (this.classify == null) {
      this.onEvent(event);
      return;
    }

    // Avoid stampeding the network during flurries — fall back to local.
    if (this.inFlight >= 2) {
      this.onEvent(event);
      return;
    }

    this.inFlight += 1;
    void this.classify(kinematics)
      .then((remote) => {
        if (this.disposed) {
          return;
        }
        const outcome = mergePunchClassification(event, remote);
        if (outcome.emit) {
          this.onEvent(outcome.event);
        }
      })
      .catch(() => {
        if (!this.disposed) {
          this.onEvent(event);
        }
      })
      .finally(() => {
        this.inFlight = Math.max(0, this.inFlight - 1);
      });
  }
}
