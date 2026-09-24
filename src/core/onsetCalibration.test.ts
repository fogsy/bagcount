import { createOnsetDetector } from './onsetDetector';
import {
  measureNoiseFloorDb,
  punchClearsGateAndK,
  suggestOnsetParams,
  type PunchMeasurement,
} from './onsetCalibration';

const SAMPLE_RATE = 16000;

function samplesForMs(ms: number): number {
  return Math.round((ms / 1000) * SAMPLE_RATE);
}

function quietFloor(ms: number, amplitude = 0.02): Float32Array {
  return new Float32Array(samplesForMs(ms)).fill(amplitude);
}

function decayingBurst(
  ms: number,
  frequencyHz = 80,
  peak = 0.8,
): Float32Array {
  const n = samplesForMs(ms);
  const out = new Float32Array(n);
  const tauSec = ms / 1000 / 3;
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    out[i] = peak * Math.exp(-t / tauSec) * Math.sin(2 * Math.PI * frequencyHz * t);
  }
  return out;
}

function place(dest: Float32Array, src: Float32Array, startMs: number): void {
  dest.set(src, samplesForMs(startMs));
}

function runDetector(
  pcm: Float32Array,
  params: { k?: number; noiseGateDb?: number },
): { levels: number[]; punches: PunchMeasurement[] } {
  const levels: number[] = [];
  const punches: PunchMeasurement[] = [];
  const detector = createOnsetDetector(
    params,
    (event) => {
      punches.push({ peakDb: event.levelDb, slowDb: event.slowDb });
    },
    (event) => {
      levels.push(event.levelDb);
    },
  );
  const chunkSize = samplesForMs(10);
  let chunkStartMs = 0;
  for (let i = 0; i < pcm.length; i += chunkSize) {
    const slice = pcm.subarray(i, Math.min(i + chunkSize, pcm.length));
    detector.processChunk(slice, SAMPLE_RATE, chunkStartMs);
    chunkStartMs += (slice.length / SAMPLE_RATE) * 1000;
  }
  return { levels, punches };
}

test('floor is the 95th percentile when there are enough quiet samples', () => {
  const quiet = Array.from({ length: 20 }, (_, i) => -70 + i * 0.2);
  expect(measureNoiseFloorDb(quiet)).toBeCloseTo(-66.4, 5);
});

test('few quiet samples use the max as the floor', () => {
  expect(measureNoiseFloorDb([-72, -68, -70])).toBe(-68);
});

test('suggested gate stays above the quiet floor', () => {
  const suggestion = suggestOnsetParams(
    Array.from({ length: 20 }, () => -60),
    Array.from({ length: 10 }, () => ({ peakDb: -30, slowDb: -55 })),
  );
  expect(suggestion.floorDb).toBeLessThan(suggestion.noiseGateDb);
});

test('nine of ten mixed punches clear the suggestion', () => {
  const punches: PunchMeasurement[] = [
    { peakDb: -42, slowDb: -50 },
    ...Array.from({ length: 9 }, () => ({ peakDb: -28, slowDb: -52 })),
  ];
  const suggestion = suggestOnsetParams(
    Array.from({ length: 20 }, () => -58),
    punches,
  );
  const detected = punches.filter((punch) =>
    punchClearsGateAndK(punch, suggestion.noiseGateDb, suggestion.k),
  );
  expect(detected).toHaveLength(9);
  expect(suggestion.floorDb).toBeLessThan(suggestion.noiseGateDb);
});

test('loud floor versus quieter punches still keeps the floor below the gate', () => {
  const suggestion = suggestOnsetParams(
    Array.from({ length: 20 }, () => -40),
    Array.from({ length: 10 }, () => ({ peakDb: -35, slowDb: -42 })),
  );
  expect(suggestion.floorDb).toBeLessThan(suggestion.noiseGateDb);
  expect(suggestion.noiseGateDb).toBeLessThan(-35);
});

test('ten synthetic bursts suggest params that detect nine punches and stay quiet on the floor', () => {
  const quietPcm = quietFloor(800);
  const { levels } = runDetector(quietPcm, { k: 1.5, noiseGateDb: -80 });

  const session = quietFloor(2200);
  for (let i = 0; i < 9; i += 1) {
    place(session, decayingBurst(12, 80, 0.8), 300 + i * 180);
  }
  place(session, decayingBurst(12, 80, 0.18), 300 + 9 * 180);

  const captured = runDetector(session, { k: 1.5, noiseGateDb: -80 });
  expect(captured.punches.length).toBeGreaterThanOrEqual(9);

  const suggestion = suggestOnsetParams(levels, captured.punches);
  expect(suggestion.floorDb).toBeLessThan(suggestion.noiseGateDb);

  const quietCheck = runDetector(quietPcm, {
    k: suggestion.k,
    noiseGateDb: suggestion.noiseGateDb,
  });
  expect(quietCheck.punches).toHaveLength(0);

  const punchCheck = runDetector(session, {
    k: suggestion.k,
    noiseGateDb: suggestion.noiseGateDb,
  });
  expect(punchCheck.punches.length).toBeGreaterThanOrEqual(9);
  expect(punchCheck.punches.length).toBeLessThanOrEqual(10);
});
