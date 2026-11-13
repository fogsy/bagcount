import type {
  AndroidConfig,
  RecordingInterruptionEvent,
  StartRecordingResult,
} from '@siteed/audio-studio';
import { LegacyEventEmitter, type EventSubscription } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

export type AudioSourceSetting = NonNullable<AndroidConfig['audioSource']>;
export type ResolvedAudioSource = NonNullable<
  StartRecordingResult['androidAudioSource']
>;

export type MicPermission = {
  granted: boolean;
  canAskAgain: boolean;
  status?: string;
};

export type PcmChunk = {
  samples: Float32Array;
  sampleRate: number;
  chunkStartMs: number;
};

export type StartAudioResult = {
  requestedSource: AudioSourceSetting;
  resolvedSource: ResolvedAudioSource | undefined;
  sampleRate: number;
};

type AudioDataNativeEvent = {
  pcmFloat32?: Float32Array | number[];
  position?: number;
  deltaSize?: number;
};

type PermissionResult = {
  granted?: boolean;
  canAskAgain?: boolean;
  status?: string;
};

type AudioStudioModuleType = {
  getPermissionsAsync?: () => Promise<PermissionResult>;
  requestPermissionsAsync: () => Promise<PermissionResult>;
  startRecording: (options: Record<string, unknown>) => Promise<StartRecordingResult>;
  stopRecording: () => Promise<unknown>;
};

const SAMPLE_RATE = 16000;
const INTERVAL_MS = 10;
const CHUNK_WATCHDOG_MS = 1500;
const WATCHDOG_TICK_MS = 500;
const MISSING_NATIVE_MSG =
  'AudioStudio native module missing. Rebuild the development client (npx expo run:android|ios).';

const LOSS_REASONS = new Set<RecordingInterruptionEvent['reason']>([
  'audioFocusLoss',
  'phoneCall',
  'recordingStopped',
  'deviceDisconnected',
  'deviceSwitchFailed',
]);

function loadAudioStudioModule(): AudioStudioModuleType | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@siteed/audio-studio') as {
      AudioStudioModule?: AudioStudioModuleType;
    };
    return mod.AudioStudioModule ?? null;
  } catch {
    return null;
  }
}

const AudioStudioModule = loadAudioStudioModule();

let dataSubscription: EventSubscription | null = null;
let interruptSubscription: EventSubscription | null = null;
let watchdog: ReturnType<typeof setInterval> | null = null;
let lastChunkMs = 0;
let stopping = false;

export function isAudioStudioAvailable(): boolean {
  return AudioStudioModule != null;
}

function toFloat32(samples: Float32Array | number[]): Float32Array {
  return samples instanceof Float32Array ? samples : new Float32Array(samples);
}

function toMicPermission(result: PermissionResult): MicPermission {
  return {
    granted: result.granted === true,
    canAskAgain: result.canAskAgain !== false,
    status: result.status,
  };
}

function clearWatchdog(): void {
  if (watchdog != null) {
    clearInterval(watchdog);
    watchdog = null;
  }
}

function clearSubscriptions(): void {
  dataSubscription?.remove();
  interruptSubscription?.remove();
  dataSubscription = null;
  interruptSubscription = null;
}

function isRecordingLoss(event: RecordingInterruptionEvent): boolean {
  return event.isPaused === true || LOSS_REASONS.has(event.reason);
}

async function getMicPermissionFallback(): Promise<MicPermission> {
  if (Platform.OS !== 'android') {
    return { granted: false, canAskAgain: true, status: 'unavailable' };
  }
  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return { granted, canAskAgain: true, status: granted ? 'granted' : 'denied' };
}

async function requestMicPermissionFallback(): Promise<MicPermission> {
  if (Platform.OS !== 'android') {
    return { granted: false, canAskAgain: true, status: 'unavailable' };
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  const granted = result === PermissionsAndroid.RESULTS.GRANTED;
  return {
    granted,
    canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    status: granted ? 'granted' : 'denied',
  };
}

export async function getMicPermission(): Promise<MicPermission> {
  if (AudioStudioModule == null) {
    return getMicPermissionFallback();
  }
  if (typeof AudioStudioModule.getPermissionsAsync === 'function') {
    return toMicPermission(await AudioStudioModule.getPermissionsAsync());
  }
  return getMicPermissionFallback();
}

export async function requestMicPermission(): Promise<MicPermission> {
  if (AudioStudioModule == null) {
    return requestMicPermissionFallback();
  }
  return toMicPermission(await AudioStudioModule.requestPermissionsAsync());
}

export async function startAudioSource(options: {
  audioSource?: AudioSourceSetting;
  onChunk: (chunk: PcmChunk) => void;
  onInterrupted?: (reason: string) => void;
}): Promise<StartAudioResult> {
  if (AudioStudioModule == null) {
    throw new Error(MISSING_NATIVE_MSG);
  }

  clearWatchdog();
  clearSubscriptions();

  const requestedSource = options.audioSource ?? 'auto';
  const emitter = new LegacyEventEmitter(AudioStudioModule as never);
  lastChunkMs = performance.now();

  dataSubscription = emitter.addListener(
    'AudioData',
    (event: AudioDataNativeEvent) => {
      if (event.deltaSize === 0 || event.pcmFloat32 == null) {
        return;
      }
      lastChunkMs = performance.now();
      options.onChunk({
        samples: toFloat32(event.pcmFloat32),
        sampleRate: SAMPLE_RATE,
        chunkStartMs: event.position ?? 0,
      });
    },
  );

  interruptSubscription = emitter.addListener(
    'onRecordingInterrupted',
    (event: RecordingInterruptionEvent) => {
      if (!isRecordingLoss(event)) {
        return;
      }
      options.onInterrupted?.(event.reason);
    },
  );

  watchdog = setInterval(() => {
    if (performance.now() - lastChunkMs < CHUNK_WATCHDOG_MS) {
      return;
    }
    clearWatchdog();
    options.onInterrupted?.('timeout');
  }, WATCHDOG_TICK_MS);

  try {
    const result: StartRecordingResult = await AudioStudioModule.startRecording({
      sampleRate: SAMPLE_RATE,
      channels: 1,
      encoding: 'pcm_16bit',
      streamFormat: 'float32',
      interval: INTERVAL_MS,
      bufferDurationSeconds: 0.01,
      output: { primary: { enabled: false } },
      android: { audioSource: requestedSource },
    });

    lastChunkMs = performance.now();
    return {
      requestedSource,
      resolvedSource: result.androidAudioSource,
      sampleRate: result.sampleRate ?? SAMPLE_RATE,
    };
  } catch (error) {
    clearWatchdog();
    clearSubscriptions();
    throw error;
  }
}

export async function stopAudioSource(): Promise<void> {
  if (stopping) {
    return;
  }
  stopping = true;
  clearWatchdog();
  clearSubscriptions();
  try {
    if (AudioStudioModule != null) {
      await AudioStudioModule.stopRecording();
    }
  } finally {
    stopping = false;
  }
}
