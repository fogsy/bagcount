import { createFusion } from './fusion';

function visionAt(timestampMs: number) {
  return { timestampMs, hand: 'left' as const };
}

function audioAt(timestampMs: number) {
  return { timestampMs, levelDb: -30, slowDb: -55 };
}

test('pair within the window gives 1 hit', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  fusion.pushVision(visionAt(0));
  now = 80;
  fusion.pushAudio(audioAt(80));
  expect(fusion.getStats().hits).toBe(1);
  expect(fusion.getStats().visionOnly).toBe(0);
  expect(fusion.getStats().audioOnly).toBe(0);
});

test('audio alone becomes audioOnly after expiry', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  fusion.pushAudio(audioAt(0));
  now = 191;
  fusion.tick();
  const stats = fusion.getStats();
  expect(stats.audioOnly).toBe(1);
  expect(stats.hits).toBe(0);
  expect(stats.visionOnly).toBe(0);
});

test('vision alone becomes visionOnly after expiry', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  fusion.pushVision(visionAt(0));
  now = 191;
  fusion.tick();
  const stats = fusion.getStats();
  expect(stats.visionOnly).toBe(1);
  expect(stats.hits).toBe(0);
  expect(stats.audioOnly).toBe(0);
});

test('two punches 120 ms apart give 2 hits', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  fusion.pushVision(visionAt(0));
  fusion.pushAudio(audioAt(0));
  now = 120;
  fusion.pushVision(visionAt(120));
  fusion.pushAudio(audioAt(120));
  expect(fusion.getStats().hits).toBe(2);
});

test('audioOffsetMs shifts matching correctly', () => {
  let now = 0;
  const unshifted = createFusion({}, () => now);
  unshifted.pushVision(visionAt(0));
  now = 180;
  unshifted.pushAudio(audioAt(180));
  expect(unshifted.getStats().hits).toBe(0);

  now = 0;
  const shifted = createFusion({ audioOffsetMs: -60 }, () => now);
  shifted.pushVision(visionAt(0));
  now = 180;
  shifted.pushAudio(audioAt(180));
  expect(shifted.getStats().hits).toBe(1);
});

test('event log includes vision, audio, and hit rows', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  fusion.pushVision(visionAt(0));
  now = 80;
  fusion.pushAudio({ timestampMs: 80, levelDb: -30, slowDb: -55 });
  const log = fusion.getEventLog();
  expect(log.map((entry) => entry.kind)).toEqual(['vision', 'audio', 'hit']);
  expect(log[0]).toMatchObject({ kind: 'vision', timestampMs: 0, matched: true, hand: 'left' });
  expect(log[1]).toMatchObject({
    kind: 'audio',
    timestampMs: 80,
    matched: true,
    levelDb: -30,
    slowDb: -55,
  });
  expect(log[2]).toMatchObject({
    kind: 'hit',
    timestampMs: 80,
    hand: 'left',
    visionTimestampMs: 0,
    audioTimestampMs: 80,
  });
});

test('unmatched expiry appends audioOnly and visionOnly', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  fusion.pushAudio({ timestampMs: 0, levelDb: -28, slowDb: -50 });
  fusion.pushVision({ timestampMs: 400, hand: 'right' });
  now = 591;
  fusion.tick();
  expect(fusion.getEventLog().map((entry) => entry.kind)).toEqual([
    'audio',
    'vision',
    'visionOnly',
    'audioOnly',
  ]);
  expect(fusion.getEventLog()[2]).toMatchObject({
    kind: 'visionOnly',
    timestampMs: 400,
    hand: 'right',
  });
  expect(fusion.getEventLog()[3]).toMatchObject({
    kind: 'audioOnly',
    timestampMs: 0,
    levelDb: -28,
    slowDb: -50,
  });
});

test('reset clears the event log', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  fusion.pushVision(visionAt(0));
  fusion.pushAudio(audioAt(0));
  expect(fusion.getEventLog().length).toBeGreaterThan(0);
  fusion.reset();
  expect(fusion.getEventLog()).toEqual([]);
});

test('event log is not capped at 64', () => {
  let now = 0;
  const fusion = createFusion({}, () => now);
  for (let i = 0; i < 80; i += 1) {
    now = i * 300;
    fusion.pushAudio({ timestampMs: now, levelDb: -32, slowDb: -58 });
    now += 191;
    fusion.tick();
  }
  const log = fusion.getEventLog();
  expect(log.filter((entry) => entry.kind === 'audio')).toHaveLength(80);
  expect(log.filter((entry) => entry.kind === 'audioOnly')).toHaveLength(80);
  expect(log.length).toBe(160);
});
