export type OnsetDetectorParams = {
  k?: number;
  noiseGateDb?: number;
};

export type OnsetEvent = {
  timestampMs: number;
  levelDb: number;
  slowDb: number;
};

export type LevelEvent = {
  timestampMs: number;
  levelDb: number;
};

export type OnsetDetector = {
  processChunk: (
    samples: Int16Array | Float32Array,
    sampleRate: number,
    chunkStartMs: number,
  ) => void;
  setParams: (params: OnsetDetectorParams) => void;
  reset: () => void;
};

const LOWPASS_HZ = 400;
const FAST_TAU_SEC = 0.003;
const SLOW_TAU_SEC = 0.5;
const REFRACTORY_MS = 80;
const LEVEL_INTERVAL_MS = 50;
const LEVEL_FLOOR_DB = -80;
const DEFAULT_K = 4;
const DEFAULT_NOISE_GATE_DB = -50;

function dbToPower(db: number): number {
  return 10 ** (db / 10);
}

function energyToDb(energy: number): number {
  if (energy <= 0) {
    return LEVEL_FLOOR_DB;
  }
  return Math.max(LEVEL_FLOOR_DB, 10 * Math.log10(energy));
}

export function createOnsetDetector(
  params: OnsetDetectorParams = {},
  onOnset: (event: OnsetEvent) => void = () => {},
  onLevel: (event: LevelEvent) => void = () => {},
): OnsetDetector {
  let k = params.k ?? DEFAULT_K;
  let noiseGate = dbToPower(params.noiseGateDb ?? DEFAULT_NOISE_GATE_DB);

  let lpfY = 0;
  let lpfPrimed = false;
  let fast = 0;
  let slow = 0;
  let lastOnsetMs = Number.NEGATIVE_INFINITY;
  let samplesSinceLevel = 0;
  let configuredRate = 0;
  let lpfAlpha = 0;
  let fastCoeff = 0;
  let slowCoeff = 0;
  let levelIntervalSamples = 0;

  function configure(sampleRate: number): void {
    if (configuredRate === sampleRate) {
      return;
    }
    configuredRate = sampleRate;
    lpfAlpha = 1 - Math.exp((-2 * Math.PI * LOWPASS_HZ) / sampleRate);
    fastCoeff = 1 - Math.exp(-1 / (FAST_TAU_SEC * sampleRate));
    slowCoeff = 1 - Math.exp(-1 / (SLOW_TAU_SEC * sampleRate));
    levelIntervalSamples = Math.max(
      1,
      Math.round((LEVEL_INTERVAL_MS / 1000) * sampleRate),
    );
  }

  function processChunk(
    samples: Int16Array | Float32Array,
    sampleRate: number,
    chunkStartMs: number,
  ): void {
    configure(sampleRate);
    const isInt16 = samples instanceof Int16Array;

    for (let i = 0; i < samples.length; i += 1) {
      const raw = samples[i] ?? 0;
      const x = isInt16 ? raw / 32768 : raw;

      if (!lpfPrimed) {
        lpfY = x;
        lpfPrimed = true;
      } else {
        lpfY += lpfAlpha * (x - lpfY);
      }

      const energy = lpfY * lpfY;
      fast += fastCoeff * (energy - fast);

      if (slow === 0) {
        slow = energy;
      } else {
        const target = Math.min(energy, 3 * slow);
        slow += slowCoeff * (target - slow);
      }

      const nowMs = chunkStartMs + (i / sampleRate) * 1000;
      if (
        fast > noiseGate &&
        fast > k * slow &&
        nowMs - lastOnsetMs >= REFRACTORY_MS
      ) {
        lastOnsetMs = nowMs;
        onOnset({
          timestampMs: nowMs,
          levelDb: energyToDb(fast),
          slowDb: energyToDb(slow),
        });
      }

      samplesSinceLevel += 1;
      if (samplesSinceLevel >= levelIntervalSamples) {
        samplesSinceLevel = 0;
        onLevel({ timestampMs: nowMs, levelDb: energyToDb(fast) });
      }
    }
  }

  function setParams(next: OnsetDetectorParams): void {
    if (next.k !== undefined) {
      k = next.k;
    }
    if (next.noiseGateDb !== undefined) {
      noiseGate = dbToPower(next.noiseGateDb);
    }
  }

  function reset(): void {
    lpfY = 0;
    lpfPrimed = false;
    fast = 0;
    slow = 0;
    lastOnsetMs = Number.NEGATIVE_INFINITY;
    samplesSinceLevel = 0;
    configuredRate = 0;
  }

  return { processChunk, setParams, reset };
}
