import {
  crossSequence,
  doubleJabTooFast,
  hookSequence,
  jabSequence,
  scaledJabSequence,
  uppercutSequence,
} from './__fixtures__/punchSequences';
import { PunchDetector, type PunchEvent } from './punchDetector';

function collect(frames: Parameters<PunchDetector['processFrame']>[0][], config = {}) {
  const events: PunchEvent[] = [];
  const detector = new PunchDetector(config, (e) => events.push(e));
  for (const frame of frames) {
    detector.processFrame(frame);
  }
  return events;
}

describe('PunchDetector', () => {
  it('classifies a left lead extension as JAB (orthodox)', () => {
    const events = collect(jabSequence);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('JAB');
    expect(events[0]?.hand).toBe('left');
  });

  it('classifies a right rear extension as CROSS (orthodox)', () => {
    const events = collect(crossSequence);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('CROSS');
    expect(events[0]?.hand).toBe('right');
  });

  it('classifies lateral bent-arm as HOOK', () => {
    const events = collect(hookSequence);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('HOOK');
  });

  it('classifies upward motion as UPPERCUT', () => {
    const events = collect(uppercutSequence);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('UPPERCUT');
  });

  it('flips jab/cross with southpaw stance', () => {
    const events = collect(jabSequence, { stance: 'southpaw' });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('CROSS');
  });

  it('applies cooldown to avoid double-counting', () => {
    const events = collect(doubleJabTooFast(), { cooldownMs: 500 });
    expect(events.length).toBe(1);
  });

  it('detects jab when shoulder width is scaled (distance-normalized)', () => {
    const events = collect(scaledJabSequence(0.05));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('JAB');
  });
});
