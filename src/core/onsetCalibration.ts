export type PunchMeasurement = {
  peakDb: number;
  slowDb: number;
};

export type OnsetSuggestion = {
  noiseGateDb: number;
  k: number;
  floorDb: number;
  punchesUsed: number;
  punchesAboveGate: number;
};

const GATE_MIN_DB = -80;
const GATE_MAX_DB = -20;
const K_MIN = 1;
const K_MAX = 12;
const DEFAULT_K = 4;
const GATE_ABOVE_FLOOR_DB = 6;
const GATE_BELOW_PUNCH_DB = 1;
const FLOOR_ABOVE_MIN_DB = 0.5;
const K_HEADROOM = 0.95;
const TARGET_DETECT_RATIO = 0.9;
const MIN_SAMPLES_FOR_PERCENTILE = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dbToPower(db: number): number {
  return 10 ** (db / 10);
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) {
    return GATE_MIN_DB;
  }
  const index = Math.round((sortedAsc.length - 1) * p);
  return sortedAsc[index] ?? GATE_MIN_DB;
}

export function measureNoiseFloorDb(quietLevelsDb: number[]): number {
  if (quietLevelsDb.length === 0) {
    return GATE_MIN_DB;
  }
  const sorted = quietLevelsDb.slice().sort((a, b) => a - b);
  if (sorted.length < MIN_SAMPLES_FOR_PERCENTILE) {
    return sorted[sorted.length - 1] ?? GATE_MIN_DB;
  }
  return percentile(sorted, 0.95);
}

function targetDetectCount(punchCount: number): number {
  if (punchCount <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(punchCount * TARGET_DETECT_RATIO));
}

export function requiredK(punch: PunchMeasurement): number {
  const slowPower = dbToPower(punch.slowDb);
  if (slowPower <= 0) {
    return K_MAX;
  }
  return dbToPower(punch.peakDb) / slowPower;
}

export function punchClearsGateAndK(
  punch: PunchMeasurement,
  noiseGateDb: number,
  k: number,
): boolean {
  return punch.peakDb > noiseGateDb && requiredK(punch) > k;
}

export function suggestOnsetParams(
  quietLevelsDb: number[],
  punches: PunchMeasurement[],
): OnsetSuggestion {
  const floorDb = measureNoiseFloorDb(quietLevelsDb);
  let noiseGateDb = floorDb + GATE_ABOVE_FLOOR_DB;

  if (punches.length > 0) {
    const sortedPeaks = punches.map((punch) => punch.peakDb).sort((a, b) => a - b);
    const keepCount = targetDetectCount(punches.length);
    const thresholdIndex = Math.max(0, punches.length - keepCount);
    const punchThreshold = sortedPeaks[thresholdIndex] ?? punchThresholdFallback(sortedPeaks);

    if (noiseGateDb >= punchThreshold) {
      noiseGateDb = punchThreshold - GATE_BELOW_PUNCH_DB;
    }
    if (noiseGateDb <= floorDb) {
      const mid = (floorDb + punchThreshold) / 2;
      noiseGateDb = Math.min(
        punchThreshold - GATE_BELOW_PUNCH_DB,
        Math.max(floorDb + FLOOR_ABOVE_MIN_DB, mid),
      );
    }
  }

  noiseGateDb = clamp(noiseGateDb, GATE_MIN_DB, GATE_MAX_DB);
  if (noiseGateDb <= floorDb && floorDb < GATE_MAX_DB) {
    noiseGateDb = clamp(floorDb + FLOOR_ABOVE_MIN_DB, GATE_MIN_DB, GATE_MAX_DB);
  }

  const aboveGate = punches.filter((punch) => punch.peakDb > noiseGateDb);
  const keepCount = targetDetectCount(punches.length);
  const wantFromAboveGate = Math.min(aboveGate.length, keepCount);

  let k = DEFAULT_K;
  if (wantFromAboveGate > 0) {
    const ratios = aboveGate.map(requiredK).sort((a, b) => a - b);
    const marginalIndex = Math.max(0, aboveGate.length - wantFromAboveGate);
    const marginal = ratios[marginalIndex] ?? DEFAULT_K;
    k = marginal * K_HEADROOM;
  }

  k = clamp(k, K_MIN, K_MAX);

  return {
    noiseGateDb,
    k,
    floorDb,
    punchesUsed: punches.length,
    punchesAboveGate: aboveGate.length,
  };
}

function punchThresholdFallback(sortedPeaks: number[]): number {
  return sortedPeaks[0] ?? GATE_MAX_DB;
}
