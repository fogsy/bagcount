import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createOnsetDetector, type OnsetDetector } from '../core/onsetDetector';
import {
  requestMicPermission,
  startAudioSource,
  stopAudioSource,
  type AudioSourceSetting,
  type ResolvedAudioSource,
} from '../native/audioSource';
import {
  describeDeniedPermission,
  openAppSettings,
} from './permissions';
import { useForeground } from './useForeground';

const SOURCE_KEY = '@bagcount/audioSource';
const SOURCE_OPTIONS: AudioSourceSetting[] = [
  'auto',
  'voiceRecognition',
  'unprocessed',
  'mic',
];

type LogLine = {
  id: number;
  text: string;
};

type Props = {
  onBack: () => void;
};

function formatSource(source: AudioSourceSetting | ResolvedAudioSource | undefined): string {
  return source ?? 'unknown';
}

export default function AudioDebugScreen({ onBack }: Props) {
  const [requestedSource, setRequestedSource] = useState<AudioSourceSetting>('auto');
  const [resolvedSource, setResolvedSource] = useState<ResolvedAudioSource | undefined>();
  const [recording, setRecording] = useState(false);
  const [k, setK] = useState(4);
  const [noiseGateDb, setNoiseGateDb] = useState(-50);
  const [levelDb, setLevelDb] = useState(-80);
  const [onsetCount, setOnsetCount] = useState(0);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsNeeded, setSettingsNeeded] = useState(false);
  const foreground = useForeground();

  const logIdRef = useRef(0);
  const recordingRef = useRef(false);
  const ignoreInterruptRef = useRef(false);
  const detectorRef = useRef<OnsetDetector | null>(null);

  const appendLog = useCallback((text: string) => {
    logIdRef.current += 1;
    const line = { id: logIdRef.current, text };
    setLogLines((prev) => [...prev.slice(-80), line]);
  }, []);

  useEffect(() => {
    const detector = createOnsetDetector(
      { k: 4, noiseGateDb: -50 },
      (event) => {
        setOnsetCount((count) => count + 1);
        logIdRef.current += 1;
        const line = { id: logIdRef.current, text: `onset ${event.timestampMs.toFixed(1)}ms` };
        setLogLines((prev) => [...prev.slice(-80), line]);
      },
      (event) => {
        setLevelDb(event.levelDb);
      },
    );
    detectorRef.current = detector;
    return () => {
      detectorRef.current = null;
    };
  }, []);

  useEffect(() => {
    detectorRef.current?.setParams({ k, noiseGateDb });
  }, [k, noiseGateDb]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SOURCE_KEY).then((value) => {
      if (
        !cancelled &&
        (value === 'auto' ||
          value === 'voiceRecognition' ||
          value === 'unprocessed' ||
          value === 'mic')
      ) {
        setRequestedSource(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        stopAudioSource().catch(() => {});
      }
    };
  }, []);

  const persistSource = useCallback(
    (next: AudioSourceSetting) => {
      setRequestedSource(next);
      appendLog(`source setting ${next}`);
      AsyncStorage.setItem(SOURCE_KEY, next).catch(() => {});
    },
    [appendLog],
  );

  const handleStop = useCallback(async () => {
    ignoreInterruptRef.current = true;
    try {
      await stopAudioSource();
    } finally {
      recordingRef.current = false;
      setRecording(false);
      appendLog('stop');
      ignoreInterruptRef.current = false;
    }
  }, [appendLog]);

  const pauseMic = useCallback(
    async (reason: string) => {
      if (!recordingRef.current) {
        return;
      }
      ignoreInterruptRef.current = true;
      try {
        await stopAudioSource();
      } finally {
        recordingRef.current = false;
        setRecording(false);
        setNotice(reason);
        appendLog(reason);
        ignoreInterruptRef.current = false;
      }
    },
    [appendLog],
  );

  useEffect(() => {
    if (foreground) {
      return;
    }
    pauseMic('Paused — app left the screen.').catch(() => {});
  }, [foreground, pauseMic]);

  const handleStart = useCallback(async () => {
    setNotice(null);
    setSettingsNeeded(false);
    const permission = await requestMicPermission();
    if (!permission.granted) {
      const message = describeDeniedPermission('Mic', permission);
      setNotice(message);
      setSettingsNeeded(permission.canAskAgain === false);
      appendLog(message);
      return;
    }

    detectorRef.current?.reset();
    detectorRef.current?.setParams({ k, noiseGateDb });
    setOnsetCount(0);
    setLevelDb(-80);
    setResolvedSource(undefined);

    try {
      const result = await startAudioSource({
        audioSource: requestedSource,
        onChunk: (chunk) => {
          detectorRef.current?.processChunk(
            chunk.samples,
            chunk.sampleRate,
            chunk.chunkStartMs,
          );
        },
        onInterrupted: () => {
          if (ignoreInterruptRef.current) {
            return;
          }
          pauseMic('Mic unavailable.').catch(() => {});
        },
      });
      recordingRef.current = true;
      setRecording(true);
      setResolvedSource(result.resolvedSource);
      appendLog(
        `start requested=${result.requestedSource} resolved=${formatSource(result.resolvedSource)}`,
      );
    } catch (error) {
      recordingRef.current = false;
      setRecording(false);
      const message = error instanceof Error ? error.message : String(error);
      setNotice(message);
      appendLog(`start failed: ${message}`);
    }
  }, [appendLog, k, noiseGateDb, pauseMic, requestedSource]);

  const meterWidth = Math.max(0, Math.min(100, ((levelDb + 80) / 80) * 100));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio debug</Text>
      <Pressable
        style={styles.back}
        onPress={() => {
          if (recordingRef.current) {
            handleStop().then(onBack).catch(onBack);
          } else {
            onBack();
          }
        }}
      >
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      {notice != null ? <Text style={styles.notice}>{notice}</Text> : null}
      {settingsNeeded ? (
        <Pressable onPress={openAppSettings}>
          <Text style={styles.settingsLink}>Open Settings</Text>
        </Pressable>
      ) : null}

      <Text style={styles.meterLabel}>Level {levelDb.toFixed(1)} dB</Text>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${meterWidth}%` }]} />
      </View>

      <Text style={styles.counter}>Onsets {onsetCount}</Text>
      <Text style={styles.status}>
        Requested {requestedSource} · In use {formatSource(resolvedSource)}
      </Text>

      <Text style={styles.sliderLabel}>k {k.toFixed(1)}</Text>
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={12}
        step={0.1}
        value={k}
        onValueChange={setK}
      />

      <Text style={styles.sliderLabel}>gate {noiseGateDb.toFixed(0)} dB</Text>
      <Slider
        style={styles.slider}
        minimumValue={-80}
        maximumValue={-20}
        step={1}
        value={noiseGateDb}
        onValueChange={setNoiseGateDb}
      />

      <Text style={styles.section}>Audio source (next start)</Text>
      <View style={styles.sourceRow}>
        {SOURCE_OPTIONS.map((option) => (
          <Pressable
            key={option}
            style={[
              styles.sourceChip,
              requestedSource === option && styles.sourceChipActive,
            ]}
            onPress={() => persistSource(option)}
          >
            <Text
              style={[
                styles.sourceChipLabel,
                requestedSource === option && styles.sourceChipLabelActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.button} onPress={recording ? handleStop : handleStart}>
        <Text style={styles.buttonLabel}>{recording ? 'Stop' : 'Start mic'}</Text>
      </Pressable>

      <Text style={styles.section}>Session log</Text>
      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        {logLines.map((line) => (
          <Text key={line.id} style={styles.logLine}>
            {line.text}
          </Text>
        ))}
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: 16,
    color: '#1d4ed8',
  },
  notice: {
    fontSize: 14,
    color: '#b45309',
  },
  settingsLink: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  meterLabel: {
    fontSize: 14,
  },
  meterTrack: {
    height: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#16a34a',
  },
  counter: {
    fontSize: 28,
    fontWeight: '700',
  },
  status: {
    fontSize: 14,
    color: '#374151',
  },
  sliderLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  section: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  sourceChipLabel: {
    fontSize: 12,
    color: '#111827',
  },
  sourceChipLabelActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  log: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  logContent: {
    padding: 8,
    gap: 4,
  },
  logLine: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
