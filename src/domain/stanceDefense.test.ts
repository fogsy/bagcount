import {
  blockSequence,
  goodStanceFrame,
  guardSequence,
  poorStanceFrame,
  slipSequence,
} from './__fixtures__/defenseSequences';
import {
  StanceDefenseTracker,
  type DefenseEvent,
} from './stanceDefense';

describe('StanceDefenseTracker', () => {
  it('emits GUARD when both hands stay near the chin', () => {
    const events: DefenseEvent[] = [];
    const tracker = new StanceDefenseTracker({}, (e) => events.push(e));
    for (const frame of guardSequence()) {
      tracker.processFrame(frame);
    }
    expect(events.some((e) => e.type === 'GUARD')).toBe(true);
  });

  it('emits SLIP on lateral head movement vs hips', () => {
    const events: DefenseEvent[] = [];
    const tracker = new StanceDefenseTracker({}, (e) => events.push(e));
    for (const frame of slipSequence()) {
      tracker.processFrame(frame);
    }
    expect(events.some((e) => e.type === 'SLIP')).toBe(true);
  });

  it('emits BLOCK when hands rise to cover the head', () => {
    const events: DefenseEvent[] = [];
    const tracker = new StanceDefenseTracker({}, (e) => events.push(e));
    for (const frame of blockSequence()) {
      tracker.processFrame(frame);
    }
    expect(events.some((e) => e.type === 'BLOCK')).toBe(true);
  });

  it('returns formScore between 0 and 100', () => {
    const tracker = new StanceDefenseTracker();
    const good = tracker.processFrame(goodStanceFrame());
    const poor = tracker.processFrame(poorStanceFrame());
    expect(good).toBeGreaterThanOrEqual(0);
    expect(good).toBeLessThanOrEqual(100);
    expect(poor).toBeGreaterThanOrEqual(0);
    expect(poor).toBeLessThanOrEqual(100);
    expect(good).toBeGreaterThan(poor);
  });
});
