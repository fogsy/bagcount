import { mergePunchClassification } from './punchMerge';
import type { PunchEvent } from './punchDetector';

const local: PunchEvent = {
  type: 'JAB',
  hand: 'left',
  tMs: 1000,
  confidence: 0.5,
};

describe('mergePunchClassification', () => {
  it('keeps local when remote is null', () => {
    const out = mergePunchClassification(local, null);
    expect(out).toEqual({ emit: true, event: local, source: 'local' });
  });

  it('rejects noise when is_punch is low', () => {
    const out = mergePunchClassification(local, {
      type: 'HOOK',
      confidence: 0.9,
      isPunch: 0.2,
    });
    expect(out).toEqual({ emit: false, reason: 'rejected_as_noise' });
  });

  it('overrides type when Jev confidence is high', () => {
    const out = mergePunchClassification(local, {
      type: 'CROSS',
      confidence: 0.8,
      isPunch: 0.9,
    });
    expect(out.emit).toBe(true);
    if (out.emit) {
      expect(out.source).toBe('jev');
      expect(out.event.type).toBe('CROSS');
      expect(out.event.confidence).toBe(0.8);
      expect(out.event.hand).toBe('left');
    }
  });

  it('keeps local when choice confidence is below gate', () => {
    const out = mergePunchClassification(local, {
      type: 'HOOK',
      confidence: 0.4,
      isPunch: 0.9,
    });
    expect(out).toEqual({ emit: true, event: local, source: 'local' });
  });
});
