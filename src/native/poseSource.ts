import type { PoseFrame, PoseLandmark } from '../core/handImpactDetector';

export type { PoseFrame, PoseLandmark };

export type NativePosePayload = {
  landmarks: readonly {
    x: number;
    y: number;
    visibility?: number;
  }[];
  additionalData: {
    width: number;
    height: number;
  };
};

export type PoseSource = {
  start: () => void;
  stop: () => void;
  subscribe: (listener: (frame: PoseFrame) => void) => () => void;
};

export type PoseSourceController = PoseSource & {
  getIsActive: () => boolean;
  subscribeActive: (listener: () => void) => () => void;
  ingestNativeFrame: (native: NativePosePayload) => void;
};

export type CreatePoseSourceOptions = {
  clock?: () => number;
};

export function mapNativePoseFrame(
  native: NativePosePayload,
  tMs: number,
): PoseFrame {
  const landmarks: PoseLandmark[] = native.landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    visibility: landmark.visibility ?? 0,
  }));
  return {
    landmarks,
    frameWidth: native.additionalData.width,
    frameHeight: native.additionalData.height,
    tMs,
  };
}

export function createPoseSource(
  options: CreatePoseSourceOptions = {},
): PoseSourceController {
  const clock = options.clock ?? (() => performance.now());
  let active = false;
  const frameListeners = new Set<(frame: PoseFrame) => void>();
  const activeListeners = new Set<() => void>();

  function setActive(next: boolean): void {
    if (active === next) {
      return;
    }
    active = next;
    for (const listener of activeListeners) {
      listener();
    }
  }

  return {
    start: () => {
      setActive(true);
    },
    stop: () => {
      setActive(false);
    },
    subscribe: (listener) => {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },
    getIsActive: () => active,
    subscribeActive: (listener) => {
      activeListeners.add(listener);
      return () => {
        activeListeners.delete(listener);
      };
    },
    ingestNativeFrame: (native) => {
      if (!active) {
        return;
      }
      const frame = mapNativePoseFrame(native, clock());
      for (const listener of frameListeners) {
        listener(frame);
      }
    },
  };
}
