export type SpeechOptions = {
  rate?: number;
  pitch?: number;
};

export type SpeechEngine = {
  speak: (text: string, options?: SpeechOptions) => void;
  stop: () => void;
};

export function createExpoSpeechEngine(): SpeechEngine {
  // Lazy require so Jest can mock without loading native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Speech = require('expo-speech') as typeof import('expo-speech');
  return {
    speak(text, options = {}) {
      Speech.stop();
      Speech.speak(text, {
        rate: options.rate ?? 1,
        pitch: options.pitch ?? 1,
      });
    },
    stop() {
      Speech.stop();
    },
  };
}
