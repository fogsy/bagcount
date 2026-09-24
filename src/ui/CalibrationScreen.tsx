import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  measureNoiseFloorDb,
  suggestOnsetParams,
  type OnsetSuggestion,
  type PunchMeasurement,
} from '../core/onsetCalibration';
import { createOnsetDetector, type OnsetDetector } from '../core/onsetDetector';
import {
  requestMicPermission,
  startAudioSource,
  stopAudioSource,
} from '../native/audioSource';
import {
  describeDeniedPermission,
  openAppSettings,
} from './permissions';
import {
  DEFAULT_SESSION_SETTINGS,
  loadSessionSettings,
  saveSessionSettings,
  type SessionSettings,
} from './sessionSettings';
import { useForeground } from './useForeground';

const QUIET_MS = 5000;
const TARGET_PUNCHES = 10;
const CAPTURE_K = 1.5;
const CAPTURE_GATE_ABOVE_FLOOR_DB = 1;

type Props = {
  onBack: () => void;
};

type Step = 'quiet' | 'punches' | 'results';

function formatDb(value: number): string {
  return `${value.toFixed(1)} dB`;
}

export default function CalibrationScreen({ onBack }: Props) {
  const [step, setStep] = useState<Step>('quiet');
  const [recording, setRecording] = useState(false);
  const [levelDb, setLevelDb] = useState(-80);
  const [quietLeftMs, setQuietLeftMs] = useState(QUIET_MS);
  const [punchCount, setPunchCount] = useState(0);
  const [suggestion, setSuggestion] = useState<OnsetSuggestion | null>(null);
  const [currentSettings, setCurrentSettings] = useState<SessionSettings>({
    ...DEFAULT_SESSION_SETTINGS,
  });
  const [error, setError] = useState<string | null>(null);
  const [settingsNeeded, setSettingsNeeded] = useState(false);
  const foreground = useForeground();

  const recordingRef = useRef(false);
  const ignoreInterruptRef = useRef(false);
  const detectorRef = useRef<OnsetDetector | null>(null);
  const quietLevelsRef = useRef<number[]>([]);
  const punchesRef = useRef<PunchMeasurement[]>([]);
  const quietDeadlineRef = useRef<number | null>(null);
  const punchCountRef = useRef(0);
  const finishPunchesRef = useRef<() => void>(() => {});

  useEffect(() => {
    loadSessionSettings().then(setCurrentSettings).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        stopAudioSource().catch(() => {});
      }
    };
  }, []);

  const stopMic = useCallback(async () => {
    ignoreInterruptRef.current = true;
    try {
      await stopAudioSource();
    } finally {
      recordingRef.current = false;
      setRecording(false);
      ignoreInterruptRef.current = false;
    }
  }, []);

  const startMic = useCallback(async () => {
    setSettingsNeeded(false);
    const permission = await requestMicPermission();
    if (!permission.granted) {
      setError(describeDeniedPermission('Mic', permission));
      setSettingsNeeded(permission.canAskAgain === false);
      return false;
    }
    await startAudioSource({
      onChunk: (chunk) => {
        const durationMs = (chunk.samples.length / chunk.sampleRate) * 1000;
        detectorRef.current?.processChunk(
          chunk.samples,
          chunk.sampleRate,
          performance.now() - durationMs,
        );
      },
      onInterrupted: () => {
        if (ignoreInterruptRef.current) {
          return;
        }
        ignoreInterruptRef.current = true;
        stopAudioSource()
          .catch(() => {})
          .finally(() => {
            recordingRef.current = false;
            setRecording(false);
            setError('Mic unavailable.');
            ignoreInterruptRef.current = false;
          });
      },
    });
    recordingRef.current = true;
    setRecording(true);
    return true;
  }, []);

  const finishPunches = useCallback(async () => {
    await stopMic();
    const next = suggestOnsetParams(quietLevelsRef.current, punchesRef.current);
    setSuggestion(next);
    setStep('results');
  }, [stopMic]);

  useEffect(() => {
    finishPunchesRef.current = finishPunches;
  }, [finishPunches]);

  useEffect(() => {
    const detector = createOnsetDetector(
      { k: CAPTURE_K, noiseGateDb: -80 },
      (event) => {
        if (punchCountRef.current >= TARGET_PUNCHES) {
          return;
        }
        punchesRef.current.push({ peakDb: event.levelDb, slowDb: event.slowDb });
        punchCountRef.current += 1;
        setPunchCount(punchCountRef.current);
        if (punchCountRef.current >= TARGET_PUNCHES) {
          finishPunchesRef.current();
        }
      },
      (event) => {
        setLevelDb(event.levelDb);
        if (quietDeadlineRef.current != null) {
          quietLevelsRef.current.push(event.levelDb);
        }
      },
    );
    detectorRef.current = detector;
    return () => {
      detectorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (foreground || !recordingRef.current) {
      return;
    }
    quietDeadlineRef.current = null;
    stopMic()
      .then(() => {
        setError('Paused — app left the screen.');
      })
      .catch(() => {});
  }, [foreground, stopMic]);

  const handleStartQuiet = useCallback(async () => {
    setError(null);
    setSettingsNeeded(false);
    quietLevelsRef.current = [];
    punchesRef.current = [];
    punchCountRef.current = 0;
    setPunchCount(0);
    setSuggestion(null);
    setQuietLeftMs(QUIET_MS);
    detectorRef.current?.reset();
    detectorRef.current?.setParams({ k: CAPTURE_K, noiseGateDb: -80 });
    try {
      const started = await startMic();
      if (!started) {
        return;
      }
      quietDeadlineRef.current = performance.now() + QUIET_MS;
    } catch (err) {
      recordingRef.current = false;
      setRecording(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [startMic]);

  useEffect(() => {
    if (step !== 'quiet' || !recording || quietDeadlineRef.current == null) {
      return;
    }
    const id = setInterval(() => {
      const deadline = quietDeadlineRef.current;
      if (deadline == null) {
        return;
      }
      const left = Math.max(0, deadline - performance.now());
      setQuietLeftMs(left);
      if (left > 0) {
        return;
      }
      quietDeadlineRef.current = null;
      clearInterval(id);
      const floorDb = measureNoiseFloorDb(quietLevelsRef.current);
      const captureGate = Math.min(-20, Math.max(-80, floorDb + CAPTURE_GATE_ABOVE_FLOOR_DB));
      stopMic()
        .then(async () => {
          detectorRef.current?.reset();
          detectorRef.current?.setParams({ k: CAPTURE_K, noiseGateDb: captureGate });
          setStep('punches');
          setPunchCount(0);
          punchCountRef.current = 0;
          punchesRef.current = [];
          await startMic();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
        });
    }, 100);
    return () => {
      clearInterval(id);
    };
  }, [recording, startMic, step, stopMic]);

  const handleBack = useCallback(() => {
    const leave = () => {
      onBack();
    };
    if (recordingRef.current) {
      stopMic().then(leave).catch(leave);
      return;
    }
    leave();
  }, [onBack, stopMic]);

  const handleApply = useCallback(async () => {
    if (suggestion == null) {
      return;
    }
    const loaded = await loadSessionSettings();
    await saveSessionSettings({
      ...loaded,
      k: suggestion.k,
      noiseGateDb: suggestion.noiseGateDb,
    });
    onBack();
  }, [onBack, suggestion]);

  const meterWidth = Math.max(0, Math.min(100, ((levelDb + 80) / 80) * 100));
  const quietSeconds = Math.ceil(quietLeftMs / 1000);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calibrate audio</Text>
      <Pressable style={styles.back} onPress={handleBack}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      {error != null ? <Text style={styles.error}>{error}</Text> : null}
      {settingsNeeded ? (
        <Pressable onPress={openAppSettings}>
          <Text style={styles.settingsLink}>Open Settings</Text>
        </Pressable>
      ) : null}

      {step !== 'results' ? (
        <>
          <Text style={styles.meterLabel}>Bass {levelDb.toFixed(0)} dB</Text>
          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, { width: `${meterWidth}%` }]} />
          </View>
        </>
      ) : null}

      {step === 'quiet' ? (
        <>
          <Text style={styles.heading}>Stand quiet for 5 seconds</Text>
          <Text style={styles.body}>
            Keep the phone still. This measures the gym noise floor.
          </Text>
          {recording ? (
            <Text style={styles.counter}>{quietSeconds}</Text>
          ) : (
            <Pressable style={styles.button} onPress={handleStartQuiet}>
              <Text style={styles.buttonLabel}>Start quiet</Text>
            </Pressable>
          )}
        </>
      ) : null}

      {step === 'punches' ? (
        <>
          <Text style={styles.heading}>Throw 10 punches at the bag</Text>
          <Text style={styles.body}>Audio only. Hit your bag, not someone else&apos;s.</Text>
          <Text style={styles.counter}>
            {punchCount} / {TARGET_PUNCHES}
          </Text>
          {!recording ? (
            <Pressable
              style={styles.button}
              onPress={() => {
                setError(null);
                startMic().catch((err) => {
                  setError(err instanceof Error ? err.message : String(err));
                });
              }}
            >
              <Text style={styles.buttonLabel}>Resume mic</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.button} onPress={finishPunches}>
            <Text style={styles.buttonLabel}>Done</Text>
          </Pressable>
        </>
      ) : null}

      {step === 'results' && suggestion != null ? (
        <>
          <Text style={styles.heading}>Suggested settings</Text>
          <Text style={styles.body}>
            Floor {formatDb(suggestion.floorDb)} · punches {suggestion.punchesUsed}
          </Text>
          <Text style={styles.row}>
            noise gate  current {formatDb(currentSettings.noiseGateDb)}  →  suggested{' '}
            {formatDb(suggestion.noiseGateDb)}
          </Text>
          <Text style={styles.row}>
            k  current {currentSettings.k.toFixed(1)}  →  suggested {suggestion.k.toFixed(1)}
          </Text>
          <Text style={styles.body}>
            Nothing is saved until you apply. Ignore leaves your current values.
          </Text>
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.buttonGrow]} onPress={handleApply}>
              <Text style={styles.buttonLabel}>Apply</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonGrow]} onPress={onBack}>
              <Text style={styles.buttonLabel}>Ignore</Text>
            </Pressable>
          </View>
        </>
      ) : null}

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
    gap: 10,
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
  error: {
    fontSize: 14,
    color: '#b91c1c',
  },
  settingsLink: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    color: '#374151',
  },
  row: {
    fontSize: 16,
    color: '#111827',
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
    fontSize: 48,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonGrow: {
    flex: 1,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
