type AudioModeOptions = {
  playsInSilentMode?: boolean;
  interruptionMode?: string;
  shouldPlayInBackground?: boolean;
};

export type SafeAudioPlayer = {
  volume: number;
  seekTo: (position: number) => Promise<void>;
  play: () => void;
  remove?: () => void;
};

type ExpoAudioModule = {
  setAudioModeAsync: (options: AudioModeOptions) => Promise<void>;
  createAudioPlayer: (source: number) => SafeAudioPlayer;
};

function loadExpoAudio(): ExpoAudioModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-audio') as ExpoAudioModule;
  } catch {
    return null;
  }
}

const expoAudio = loadExpoAudio();

export function isExpoAudioAvailable(): boolean {
  return expoAudio != null;
}

export async function setAudioModeAsyncSafe(
  options: AudioModeOptions,
): Promise<void> {
  if (expoAudio == null) {
    return;
  }
  await expoAudio.setAudioModeAsync(options);
}

const STUB_PLAYER: SafeAudioPlayer = {
  volume: 0,
  seekTo: async () => {},
  play: () => {},
};

/** Imperative player — no hooks, safe when ExpoAudio native is missing. */
export function createAudioPlayerSafe(source: number): SafeAudioPlayer {
  if (expoAudio == null) {
    return STUB_PLAYER;
  }
  return expoAudio.createAudioPlayer(source);
}
