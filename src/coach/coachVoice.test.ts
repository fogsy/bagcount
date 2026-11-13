import { CoachVoice } from './coachVoice';
import type { SpeechEngine } from './speechEngine';

function mockEngine() {
  const spoken: string[] = [];
  const engine: SpeechEngine = {
    speak: (text) => {
      spoken.push(text);
    },
    stop: () => {
      spoken.push('__STOP__');
    },
  };
  return { engine, spoken };
}

describe('CoachVoice', () => {
  it('speaks a single move call', () => {
    const { engine, spoken } = mockEngine();
    const voice = new CoachVoice(engine);
    voice.speakMove('JAB');
    expect(spoken[0]).toBe('Jab');
  });

  it('speaks combo with intensity punctuation', () => {
    const { engine, spoken } = mockEngine();
    const voice = new CoachVoice(engine, { intensity: 'med' });
    voice.speakCombo(['JAB', 'JAB', 'CROSS']);
    expect(spoken[0]).toContain('Jab');
    expect(spoken[0]).toContain('Cross');
    expect(spoken[0]).toContain('!');
  });

  it('respects mute', () => {
    const { engine, spoken } = mockEngine();
    const voice = new CoachVoice(engine, { muted: true });
    voice.speakMove('CROSS');
    expect(spoken).toEqual([]);
  });

  it('stops speech when muted mid-session', () => {
    const { engine, spoken } = mockEngine();
    const voice = new CoachVoice(engine);
    voice.setMuted(true);
    expect(spoken).toContain('__STOP__');
    voice.speakEncourage();
    expect(spoken.filter((s) => s !== '__STOP__')).toEqual([]);
  });

  it('skips good feedback on low intensity', () => {
    const { engine, spoken } = mockEngine();
    const voice = new CoachVoice(engine, { intensity: 'low' });
    voice.speakFeedback('good');
    expect(spoken).toEqual([]);
    voice.speakFeedback('miss');
    expect(spoken.length).toBe(1);
  });
});
