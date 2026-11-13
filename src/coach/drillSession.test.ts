import type { PunchEvent } from '../domain/punchDetector';
import { getDrillById } from './seedDrills';
import { DrillSession } from './drillSession';

function punch(type: PunchEvent['type'], tMs: number): PunchEvent {
  return {
    type,
    hand: type === 'JAB' || type === 'HOOK' ? 'left' : 'right',
    tMs,
    confidence: 0.9,
  };
}

describe('DrillSession', () => {
  const drill = getDrillById('one-two-combo')!;

  it('prompts jab then cross and advances on hit', () => {
    const prompts: string[] = [];
    const session = new DrillSession(drill, {
      onPrompt: (move) => prompts.push(move),
    });
    session.start(0);
    expect(session.currentPrompt).toBe('JAB');
    session.onPunch(punch('JAB', 200));
    expect(session.currentPrompt).toBe('CROSS');
    session.onPunch(punch('CROSS', 500));
    expect(prompts[0]).toBe('JAB');
    expect(prompts[1]).toBe('CROSS');
    expect(prompts[2]).toBe('JAB');
  });

  it('ignores wrong punch type', () => {
    const hits: string[] = [];
    const session = new DrillSession(drill, {
      onHit: (e) => hits.push(e.type),
    });
    session.start(0);
    session.onPunch(punch('CROSS', 100));
    expect(hits).toEqual([]);
    expect(session.currentPrompt).toBe('JAB');
  });

  it('registers miss on prompt timeout and completes with XP', () => {
    const misses: string[] = [];
    let completed = false;
    const session = new DrillSession(
      { ...drill, durationSec: 1, rounds: 1 },
      {
        onMiss: (m) => misses.push(m),
        onComplete: () => {
          completed = true;
        },
      },
      { promptTimeoutMs: 100 },
    );
    session.start(0);
    session.tick(150);
    expect(misses.length).toBeGreaterThanOrEqual(1);
    session.tick(1100);
    expect(completed).toBe(true);
    const results = session.stop();
    expect(results.xpEarned).toBeGreaterThanOrEqual(0);
    expect(results.score).toBeGreaterThanOrEqual(0);
    expect(results.score).toBeLessThanOrEqual(100);
  });

  it('counts combo completion and awards XP', () => {
    const short = {
      ...drill,
      durationSec: 10,
      rounds: 1,
      comboSequence: ['JAB', 'CROSS'] as PunchEvent['type'][],
    };
    const session = new DrillSession(short, {}, { xpPerCombo: 10, xpScoreFactor: 0.5 });
    session.start(0);
    session.onPunch(punch('JAB', 100));
    session.onPunch(punch('CROSS', 300));
    session.onPunch(punch('JAB', 500));
    session.onPunch(punch('CROSS', 700));
    const results = session.stop();
    expect(results.combosCompleted).toBe(2);
    expect(results.xpEarned).toBeGreaterThanOrEqual(20);
    const jab = results.perMove.find((m) => m.move === 'JAB');
    expect(jab?.hit).toBe(2);
  });
});
