import { createOnsetDetector } from './onsetDetector';

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

function loudSteadySine(ms: number, frequencyHz = 200, amplitude = 0.5): Float32Array {
  const n = samplesForMs(ms);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    out[i] = amplitude * Math.cos(2 * Math.PI * frequencyHz * t);
  }
  return out;
}

function place(dest: Float32Array, src: Float32Array, startMs: number): void {
  dest.set(src, samplesForMs(startMs));
}

function collectOnsets(pcm: Float32Array, chunkMs = 10): number[] {
  const onsets: number[] = [];
  const detector = createOnsetDetector({}, (event) => {
    onsets.push(event.timestampMs);
  });
  const chunkSize = samplesForMs(chunkMs);
  let chunkStartMs = 0;
  for (let i = 0; i < pcm.length; i += chunkSize) {
    const slice = pcm.subarray(i, Math.min(i + chunkSize, pcm.length));
    detector.processChunk(slice, SAMPLE_RATE, chunkStartMs);
    chunkStartMs += (slice.length / SAMPLE_RATE) * 1000;
  }
  return onsets;
}

test('steady loud noise gives 0 onsets', () => {
  const pcm = loudSteadySine(1000);
  expect(collectOnsets(pcm)).toHaveLength(0);
});

test('a decaying ~80 Hz burst over a quiet floor gives 1 onset', () => {
  const pcm = quietFloor(600);
  place(pcm, decayingBurst(12), 300);
  expect(collectOnsets(pcm)).toHaveLength(1);
});

test('two bursts 50 ms apart give 1 onset', () => {
  const pcm = quietFloor(700);
  place(pcm, decayingBurst(12), 300);
  place(pcm, decayingBurst(12), 350);
  expect(collectOnsets(pcm)).toHaveLength(1);
});

test('two bursts 150 ms apart give 2 onsets', () => {
  const pcm = quietFloor(800);
  place(pcm, decayingBurst(12), 300);
  place(pcm, decayingBurst(12), 450);
  expect(collectOnsets(pcm)).toHaveLength(2);
});
