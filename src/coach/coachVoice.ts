import type { PunchType } from '../domain/punchDetector';
import {
  phraseForCombo,
  phraseForEncourage,
  phraseForFeedback,
  phraseForMove,
  speechOptionsForIntensity,
  type CoachIntensity,
  type FeedbackKind,
} from './coachPhrases';
import type { SpeechEngine } from './speechEngine';

export type { CoachIntensity, FeedbackKind };

export class CoachVoice {
  private muted = false;
  private intensity: CoachIntensity = 'med';
  private readonly engine: SpeechEngine;

  constructor(engine: SpeechEngine, options: {
    muted?: boolean;
    intensity?: CoachIntensity;
  } = {}) {
    this.engine = engine;
    this.muted = options.muted ?? false;
    this.intensity = options.intensity ?? 'med';
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get coachIntensity(): CoachIntensity {
    return this.intensity;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.engine.stop();
    }
  }

  setIntensity(intensity: CoachIntensity): void {
    this.intensity = intensity;
  }

  speakMove(move: PunchType): void {
    this.speak(phraseForMove(move));
  }

  speakCombo(moves: PunchType[]): void {
    if (moves.length === 0) {
      return;
    }
    if (moves.length === 1) {
      this.speakMove(moves[0]!);
      return;
    }
    this.speak(phraseForCombo(moves, this.intensity));
  }

  speakFeedback(kind: FeedbackKind): void {
    if (this.intensity === 'low' && kind === 'good') {
      return;
    }
    this.speak(phraseForFeedback(kind, this.intensity));
  }

  speakEncourage(): void {
    this.speak(phraseForEncourage(this.intensity));
  }

  stop(): void {
    this.engine.stop();
  }

  private speak(text: string): void {
    if (this.muted || text.length === 0) {
      return;
    }
    this.engine.speak(text, speechOptionsForIntensity(this.intensity));
  }
}
