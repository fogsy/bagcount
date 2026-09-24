import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { projectLandmark } from 'expo-mediapipe-pose';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Svg, { Circle, Rect } from 'react-native-svg';

import {
  createFusion,
  type Fusion,
  type FusionStats,
} from '../core/fusion';
import {
  createHandImpactDetector,
  type HandImpactDetector,
  type NormalizedBox,
  type PoseFrame,
} from '../core/handImpactDetector';
import { createOnsetDetector, type OnsetDetector } from '../core/onsetDetector';
import {
  requestMicPermission,
  startAudioSource,
  stopAudioSource,
} from '../native/audioSource';
import MediaPipePoseView from '../native/MediaPipePoseView';
import { createPoseSource, type PoseSourceController } from '../native/poseSource';
import {
  describeDeniedPermission,
  openAppSettings,
} from './permissions';
import { buildSessionExport, shareSessionExport } from './sessionExport';
import {
  DEFAULT_SESSION_SETTINGS,
  loadSessionSettings,
  saveSessionSettingsNow,
  scheduleSaveSessionSettings,
  type SessionSettings,
} from './sessionSettings';
import { useForeground } from './useForeground';

const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const MIN_BOX_PX = 24;
const FLASH_MS = 150;
const TICK_MS = 50;
const LEVEL_UI_MS = 100;
const FRAME_WATCHDOG_MS = 2000;
const WATCHDOG_TICK_MS = 500;
const BACKGROUND_NOTICE = 'Paused — app left the screen. Tap Start to resume.';
const MIC_NOTICE = 'Mic unavailable. Tap Start to retry.';
const CAMERA_NOTICE = 'Camera unavailable. Tap Start to retry.';
const CAMERA_LOSS_CODES = new Set([
  'cameraConfiguration',
  'cameraPermission',
  'cameraRuntime',
]);
const EMPTY_STATS: FusionStats = {
  hits: 0,
  visionOnly: 0,
  audioOnly: 0,
  hitsPerSecond: 0,
};

type Props = {
  onBack: () => void;
};

type ViewSize = {
  width: number;
  height: number;
};

type ViewRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OverlayProps = {
  source: PoseSourceController;
  viewSize: ViewSize;
  bagBox: NormalizedBox | null;
  draftBox: ViewRect | null;
};

function SessionKeepAwake() {
  useKeepAwake();
  return null;
}

function sameStats(a: FusionStats, b: FusionStats): boolean {
  return (
    a.hits === b.hits &&
    a.visionOnly === b.visionOnly &&
    a.audioOnly === b.audioOnly &&
    a.hitsPerSecond === b.hitsPerSecond
  );
}

function projectPoint(
  x: number,
  y: number,
  frame: PoseFrame,
  view: ViewSize,
): { x: number; y: number } {
  return projectLandmark(
    { x, y, z: 0 },
    { width: frame.frameWidth, height: frame.frameHeight },
    view,
  );
}

function unprojectPoint(
  viewX: number,
  viewY: number,
  image: ViewSize,
  view: ViewSize,
): { x: number; y: number } {
  const scale = Math.max(view.width / image.width, view.height / image.height);
  const offsetX = (view.width - image.width * scale) / 2;
  const offsetY = (view.height - image.height * scale) / 2;
  return {
    x: (viewX - offsetX) / (image.width * scale),
    y: (viewY - offsetY) / (image.height * scale),
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function unprojectRect(rect: ViewRect, image: ViewSize, view: ViewSize): NormalizedBox {
  const start = unprojectPoint(rect.x, rect.y, image, view);
  const end = unprojectPoint(rect.x + rect.width, rect.y + rect.height, image, view);
  const x1 = clamp01(Math.min(start.x, end.x));
  const y1 = clamp01(Math.min(start.y, end.y));
  const x2 = clamp01(Math.max(start.x, end.x));
  const y2 = clamp01(Math.max(start.y, end.y));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function toViewRect(x1: number, y1: number, x2: number, y2: number): ViewRect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

const CountOverlay = memo(function CountOverlay({
  source,
  viewSize,
  bagBox,
  draftBox,
}: OverlayProps) {
  const [frame, setFrame] = useState<PoseFrame | null>(null);

  useEffect(() => {
    return source.subscribe(setFrame);
  }, [source]);

  const overlay = useMemo(() => {
    if (
      frame == null ||
      viewSize.width <= 0 ||
      viewSize.height <= 0 ||
      frame.frameWidth <= 0 ||
      frame.frameHeight <= 0
    ) {
      return {
        box: draftBox,
        wrists: [] as { key: string; x: number; y: number; color: string }[],
      };
    }

    let box = draftBox;
    if (box == null && bagBox != null) {
      const topLeft = projectPoint(bagBox.x, bagBox.y, frame, viewSize);
      const bottomRight = projectPoint(
        bagBox.x + bagBox.width,
        bagBox.y + bagBox.height,
        frame,
        viewSize,
      );
      box = toViewRect(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
    }

    const wrists = [LEFT_WRIST, RIGHT_WRIST].flatMap((index, order) => {
      const landmark = frame.landmarks[index];
      if (landmark == null || landmark.visibility <= 0.3) {
        return [];
      }
      const point = projectPoint(landmark.x, landmark.y, frame, viewSize);
      return [
        {
          key: String(index),
          ...point,
          color: order === 0 ? '#22d3ee' : '#f59e0b',
        },
      ];
    });

    return { box, wrists };
  }, [bagBox, draftBox, frame, viewSize]);

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width={viewSize.width}
      height={viewSize.height}
    >
      {overlay.box != null ? (
        <Rect
          x={overlay.box.x}
          y={overlay.box.y}
          width={overlay.box.width}
          height={overlay.box.height}
          stroke="#fbbf24"
          strokeWidth={3}
          fill="rgba(251,191,36,0.2)"
        />
      ) : null}
      {overlay.wrists.map((wrist) => (
        <Circle
          key={wrist.key}
          cx={wrist.x}
          cy={wrist.y}
          r={8}
          fill={wrist.color}
        />
      ))}
    </Svg>
  );
});

export default function CountScreen({ onBack }: Props) {
  const [source] = useState(() => createPoseSource());
  const [viewSize, setViewSize] = useState<ViewSize>({ width: 0, height: 0 });
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [k, setK] = useState(DEFAULT_SESSION_SETTINGS.k);
  const [noiseGateDb, setNoiseGateDb] = useState(DEFAULT_SESSION_SETTINGS.noiseGateDb);
  const [speedThreshold, setSpeedThreshold] = useState(
    DEFAULT_SESSION_SETTINGS.speedThreshold,
  );
  const [matchWindowMs, setMatchWindowMs] = useState(
    DEFAULT_SESSION_SETTINGS.matchWindowMs,
  );
  const [audioOffsetMs, setAudioOffsetMs] = useState(
    DEFAULT_SESSION_SETTINGS.audioOffsetMs,
  );
  const [bagBox, setBagBox] = useState<NormalizedBox | null>(
    DEFAULT_SESSION_SETTINGS.bagBox,
  );
  const [draftBox, setDraftBox] = useState<ViewRect | null>(null);
  const [levelDb, setLevelDb] = useState(-80);
  const [stats, setStats] = useState<FusionStats>(EMPTY_STATS);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsNeeded, setSettingsNeeded] = useState(false);
  const foreground = useForeground();

  const runningRef = useRef(false);
  const recordingRef = useRef(false);
  const ignoreInterruptRef = useRef(false);
  const sessionStartedAtMsRef = useRef<number | null>(null);
  const sessionEndedAtMsRef = useRef<number | null>(null);
  const fusionRef = useRef<Fusion | null>(null);
  const onsetRef = useRef<OnsetDetector | null>(null);
  const handRef = useRef<HandImpactDetector | null>(null);
  const frameRef = useRef<PoseFrame | null>(null);
  const viewSizeRef = useRef(viewSize);
  const pendingViewBoxRef = useRef<ViewRect | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLevelUiMsRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const sawFrameRef = useRef(false);
  const settingsRef = useRef<SessionSettings>({ ...DEFAULT_SESSION_SETTINGS });

  useEffect(() => {
    settingsRef.current = {
      k,
      noiseGateDb,
      speedThreshold,
      matchWindowMs,
      audioOffsetMs,
      bagBox,
    };
  }, [audioOffsetMs, bagBox, k, matchWindowMs, noiseGateDb, speedThreshold]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    viewSizeRef.current = viewSize;
  }, [viewSize]);

  const applyBagBox = useCallback((box: NormalizedBox) => {
    setBagBox(box);
    handRef.current?.setBagBox(box);
    const next = { ...settingsRef.current, bagBox: box };
    settingsRef.current = next;
    saveSessionSettingsNow(next);
  }, []);

  const tryCommitViewBox = useCallback(
    (rect: ViewRect) => {
      if (rect.width < MIN_BOX_PX || rect.height < MIN_BOX_PX) {
        pendingViewBoxRef.current = null;
        return;
      }
      const currentFrame = frameRef.current;
      if (
        currentFrame == null ||
        currentFrame.frameWidth <= 0 ||
        currentFrame.frameHeight <= 0 ||
        viewSizeRef.current.width <= 0 ||
        viewSizeRef.current.height <= 0
      ) {
        pendingViewBoxRef.current = rect;
        return;
      }
      const next = unprojectRect(rect, {
        width: currentFrame.frameWidth,
        height: currentFrame.frameHeight,
      }, viewSizeRef.current);
      if (next.width < 0.01 || next.height < 0.01) {
        pendingViewBoxRef.current = null;
        return;
      }
      pendingViewBoxRef.current = null;
      applyBagBox(next);
    },
    [applyBagBox],
  );

  const pauseCapture = useCallback(
    async (reason: string) => {
      if (!runningRef.current && !recordingRef.current) {
        return;
      }
      runningRef.current = false;
      setRunning(false);
      setNotice(reason);
      source.stop();
      if (recordingRef.current) {
        ignoreInterruptRef.current = true;
        recordingRef.current = false;
        try {
          await stopAudioSource();
        } catch {
          // already released
        } finally {
          ignoreInterruptRef.current = false;
        }
      }
      fusionRef.current?.tick();
      const next = fusionRef.current?.getStats();
      if (next != null) {
        setStats((prev) => (sameStats(prev, next) ? prev : next));
      }
    },
    [source],
  );

  useEffect(() => {
    const fusion = createFusion(
      {
        matchWindowMs: DEFAULT_SESSION_SETTINGS.matchWindowMs,
        audioOffsetMs: DEFAULT_SESSION_SETTINGS.audioOffsetMs,
      },
      () => performance.now(),
      () => {
        Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick).catch(
          () => {},
        );
        setFlash(true);
        if (flashTimerRef.current != null) {
          clearTimeout(flashTimerRef.current);
        }
        flashTimerRef.current = setTimeout(() => {
          flashTimerRef.current = null;
          setFlash(false);
        }, FLASH_MS);
        setStats(fusion.getStats());
      },
    );
    const onset = createOnsetDetector(
      {
        k: DEFAULT_SESSION_SETTINGS.k,
        noiseGateDb: DEFAULT_SESSION_SETTINGS.noiseGateDb,
      },
      (event) => {
        if (runningRef.current) {
          fusion.pushAudio(event);
        }
      },
      (event) => {
        const now = performance.now();
        if (now - lastLevelUiMsRef.current < LEVEL_UI_MS) {
          return;
        }
        lastLevelUiMsRef.current = now;
        setLevelDb(event.levelDb);
      },
    );
    const hand = createHandImpactDetector(
      { speedThreshold: DEFAULT_SESSION_SETTINGS.speedThreshold },
      (candidate) => {
        if (runningRef.current) {
          fusion.pushVision(candidate);
        }
      },
    );

    fusionRef.current = fusion;
    onsetRef.current = onset;
    handRef.current = hand;

    const unsubscribe = source.subscribe((next) => {
      lastFrameAtRef.current = performance.now();
      sawFrameRef.current = true;
      frameRef.current = next;
      hand.processFrame(next);
      const pending = pendingViewBoxRef.current;
      if (pending != null) {
        tryCommitViewBox(pending);
      }
    });
    source.start();

    let cancelled = false;
    loadSessionSettings().then((loaded) => {
      if (cancelled) {
        return;
      }
      setK(loaded.k);
      setNoiseGateDb(loaded.noiseGateDb);
      setSpeedThreshold(loaded.speedThreshold);
      setMatchWindowMs(loaded.matchWindowMs);
      setAudioOffsetMs(loaded.audioOffsetMs);
      setBagBox(loaded.bagBox);
      settingsRef.current = loaded;
      onset.setParams({ k: loaded.k, noiseGateDb: loaded.noiseGateDb });
      hand.setParams({ speedThreshold: loaded.speedThreshold });
      fusion.setParams({
        matchWindowMs: loaded.matchWindowMs,
        audioOffsetMs: loaded.audioOffsetMs,
      });
      if (loaded.bagBox != null) {
        hand.setBagBox(loaded.bagBox);
      }
      setSettingsReady(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      source.stop();
      ignoreInterruptRef.current = true;
      if (recordingRef.current) {
        stopAudioSource().catch(() => {});
        recordingRef.current = false;
      }
      if (flashTimerRef.current != null) {
        clearTimeout(flashTimerRef.current);
      }
      fusionRef.current = null;
      onsetRef.current = null;
      handRef.current = null;
    };
  }, [source, tryCommitViewBox]);

  useEffect(() => {
    onsetRef.current?.setParams({ k, noiseGateDb });
  }, [k, noiseGateDb]);

  useEffect(() => {
    handRef.current?.setParams({ speedThreshold });
  }, [speedThreshold]);

  useEffect(() => {
    fusionRef.current?.setParams({ matchWindowMs, audioOffsetMs });
  }, [matchWindowMs, audioOffsetMs]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }
    scheduleSaveSessionSettings({
      k,
      noiseGateDb,
      speedThreshold,
      matchWindowMs,
      audioOffsetMs,
      bagBox,
    });
  }, [
    audioOffsetMs,
    bagBox,
    k,
    matchWindowMs,
    noiseGateDb,
    settingsReady,
    speedThreshold,
  ]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => {
      fusionRef.current?.tick();
      const next = fusionRef.current?.getStats();
      if (next != null) {
        setStats((prev) => (sameStats(prev, next) ? prev : next));
      }
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [running]);

  useEffect(() => {
    if (!foreground) {
      if (runningRef.current || recordingRef.current) {
        pauseCapture(BACKGROUND_NOTICE).catch(() => {});
      }
      return;
    }
    source.start();
  }, [foreground, pauseCapture, source]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => {
      if (!runningRef.current || !sawFrameRef.current) {
        return;
      }
      if (performance.now() - lastFrameAtRef.current > FRAME_WATCHDOG_MS) {
        pauseCapture(CAMERA_NOTICE).catch(() => {});
      }
    }, WATCHDOG_TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [pauseCapture, running]);

  const handleGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { x, y, translationX, translationY } = event.nativeEvent;
    setDraftBox(toViewRect(x - translationX, y - translationY, x, y));
  }, []);

  const handleGestureStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      if (
        event.nativeEvent.state !== State.END &&
        event.nativeEvent.state !== State.CANCELLED &&
        event.nativeEvent.state !== State.FAILED
      ) {
        return;
      }
      const { x, y, translationX, translationY } = event.nativeEvent;
      const rect = toViewRect(x - translationX, y - translationY, x, y);
      setDraftBox(null);
      if (event.nativeEvent.state === State.END) {
        tryCommitViewBox(rect);
      }
    },
    [tryCommitViewBox],
  );

  const handleStart = useCallback(async () => {
    setExportError(null);
    setSettingsNeeded(false);
    const permission = await requestMicPermission();
    if (!permission.granted) {
      setNotice(describeDeniedPermission('Mic', permission));
      setSettingsNeeded(permission.canAskAgain === false);
      return;
    }
    onsetRef.current?.setParams({
      k: settingsRef.current.k,
      noiseGateDb: settingsRef.current.noiseGateDb,
    });
    handRef.current?.setParams({
      speedThreshold: settingsRef.current.speedThreshold,
    });
    fusionRef.current?.setParams({
      matchWindowMs: settingsRef.current.matchWindowMs,
      audioOffsetMs: settingsRef.current.audioOffsetMs,
    });
    if (settingsRef.current.bagBox != null) {
      handRef.current?.setBagBox(settingsRef.current.bagBox);
    }
    source.start();
    sawFrameRef.current = false;
    lastFrameAtRef.current = performance.now();
    try {
      await startAudioSource({
        onChunk: (chunk) => {
          const durationMs = (chunk.samples.length / chunk.sampleRate) * 1000;
          onsetRef.current?.processChunk(
            chunk.samples,
            chunk.sampleRate,
            performance.now() - durationMs,
          );
        },
        onInterrupted: () => {
          if (ignoreInterruptRef.current) {
            return;
          }
          pauseCapture(MIC_NOTICE).catch(() => {});
        },
      });
      recordingRef.current = true;
      runningRef.current = true;
      if (sessionStartedAtMsRef.current == null) {
        sessionStartedAtMsRef.current = performance.now();
      }
      sessionEndedAtMsRef.current = null;
      setNotice(null);
      setRunning(true);
    } catch (error) {
      recordingRef.current = false;
      runningRef.current = false;
      setRunning(false);
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }, [pauseCapture, source]);

  const handleStop = useCallback(async () => {
    ignoreInterruptRef.current = true;
    try {
      await stopAudioSource();
    } finally {
      recordingRef.current = false;
      runningRef.current = false;
      sessionEndedAtMsRef.current = performance.now();
      setRunning(false);
      setNotice(null);
      setSettingsNeeded(false);
      source.start();
      fusionRef.current?.tick();
      const next = fusionRef.current?.getStats();
      if (next != null) {
        setStats((prev) => (sameStats(prev, next) ? prev : next));
      }
      ignoreInterruptRef.current = false;
    }
  }, [source]);

  const handleReset = useCallback(() => {
    fusionRef.current?.reset();
    onsetRef.current?.reset();
    handRef.current?.reset();
    if (settingsRef.current.bagBox != null) {
      handRef.current?.setBagBox(settingsRef.current.bagBox);
    }
    sessionStartedAtMsRef.current = null;
    sessionEndedAtMsRef.current = null;
    setLevelDb(-80);
    setStats(EMPTY_STATS);
    setFlash(false);
    setExportError(null);
  }, []);

  const handleExport = useCallback(async () => {
    const fusion = fusionRef.current;
    if (fusion == null) {
      return;
    }
    setExportError(null);
    setExporting(true);
    try {
      fusion.tick();
      const next = fusion.getStats();
      setStats(next);
      const endedAtMs = sessionEndedAtMsRef.current ?? performance.now();
      if (!runningRef.current) {
        sessionEndedAtMsRef.current = endedAtMs;
      }
      const payload = buildSessionExport({
        startedAtMs: sessionStartedAtMsRef.current ?? endedAtMs,
        endedAtMs,
        settings: settingsRef.current,
        stats: next,
        events: fusion.getEventLog(),
      });
      await shareSessionExport(payload);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    const leave = () => {
      source.stop();
      onBack();
    };
    if (runningRef.current || recordingRef.current) {
      handleStop().then(leave).catch(leave);
      return;
    }
    leave();
  }, [handleStop, onBack, source]);

  const handleInferenceError = useCallback(
    (failure: { code: string }) => {
      if (!runningRef.current || !CAMERA_LOSS_CODES.has(failure.code)) {
        return;
      }
      pauseCapture(CAMERA_NOTICE).catch(() => {});
    },
    [pauseCapture],
  );

  const meterWidth = Math.max(0, Math.min(100, ((levelDb + 80) / 80) * 100));

  return (
    <GestureHandlerRootView style={styles.root}>
      {running ? <SessionKeepAwake /> : null}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
      >
        <View
          style={styles.camera}
          collapsable={false}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewSize({ width, height });
          }}
        >
          <MediaPipePoseView
            source={source}
            style={styles.cameraFill}
            onInferenceError={handleInferenceError}
          >
            <CountOverlay
              source={source}
              viewSize={viewSize}
              bagBox={bagBox}
              draftBox={draftBox}
            />
          </MediaPipePoseView>
        </View>
      </PanGestureHandler>

      {flash ? <View pointerEvents="none" style={styles.flash} /> : null}

      <View style={styles.topHud} pointerEvents="box-none">
        <Pressable style={styles.back} onPress={handleBack}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.hits}>{stats.hits}</Text>
        <Text style={styles.hps}>{stats.hitsPerSecond.toFixed(1)} /s</Text>
        <View style={styles.smallRow}>
          <View style={styles.smallStat}>
            <Text style={styles.smallValue}>{stats.hits}</Text>
            <Text style={styles.smallLabel}>counted</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallValue}>{stats.audioOnly}</Text>
            <Text style={styles.smallLabel}>sound only</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallValue}>{stats.visionOnly}</Text>
            <Text style={styles.smallLabel}>motion only</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        {notice != null ? <Text style={styles.notice}>{notice}</Text> : null}
        {settingsNeeded ? (
          <Pressable onPress={openAppSettings}>
            <Text style={styles.settingsLink}>Open Settings</Text>
          </Pressable>
        ) : null}
        {bagBox == null && draftBox == null ? (
          <Text style={styles.hint}>Drag a box over the bag</Text>
        ) : null}
        <Text style={styles.meterLabel}>Bass {levelDb.toFixed(0)} dB</Text>
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${meterWidth}%` }]} />
        </View>
        <ScrollView
          style={styles.sliders}
          contentContainerStyle={styles.slidersContent}
        >
          <Text style={styles.sliderLabel}>sound sensitivity k {k.toFixed(1)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={12}
            step={0.1}
            value={k}
            onValueChange={setK}
          />
          <Text style={styles.sliderLabel}>
            noise gate {noiseGateDb.toFixed(0)} dB
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={-80}
            maximumValue={-20}
            step={1}
            value={noiseGateDb}
            onValueChange={setNoiseGateDb}
          />
          <Text style={styles.sliderLabel}>
            hand speed {speedThreshold.toFixed(1)}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={10}
            step={0.1}
            value={speedThreshold}
            onValueChange={setSpeedThreshold}
          />
          <Text style={styles.sliderLabel}>
            match window {matchWindowMs.toFixed(0)} ms
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={40}
            maximumValue={300}
            step={10}
            value={matchWindowMs}
            onValueChange={setMatchWindowMs}
          />
          <Text style={styles.sliderLabel}>
            audio offset {audioOffsetMs.toFixed(0)} ms
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={-200}
            maximumValue={200}
            step={5}
            value={audioOffsetMs}
            onValueChange={setAudioOffsetMs}
          />
        </ScrollView>
        {exportError != null ? (
          <Text style={styles.exportError}>{exportError}</Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.buttonGrow]}
            onPress={running ? handleStop : handleStart}
          >
            <Text style={styles.buttonLabel}>{running ? 'Stop' : 'Start'}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonGrow]} onPress={handleReset}>
            <Text style={styles.buttonLabel}>Reset</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonGrow, exporting && styles.buttonDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            <Text style={styles.buttonLabel}>{exporting ? 'Exporting' : 'Export'}</Text>
          </Pressable>
        </View>
      </View>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraFill: {
    flex: 1,
  },
  flash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 8,
    borderColor: '#ef4444',
    zIndex: 4,
  },
  topHud: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    zIndex: 2,
    gap: 2,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: 16,
    color: '#93c5fd',
    fontWeight: '600',
  },
  hits: {
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 68,
  },
  hps: {
    fontSize: 22,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  smallRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  smallStat: {
    flex: 1,
  },
  smallValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  smallLabel: {
    fontSize: 12,
    color: '#d1d5db',
  },
  bottom: {
    maxHeight: '48%',
    backgroundColor: 'rgba(0,0,0,0.86)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 6,
  },
  notice: {
    fontSize: 13,
    color: '#fbbf24',
    fontWeight: '600',
  },
  settingsLink: {
    fontSize: 14,
    color: '#93c5fd',
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '600',
  },
  meterLabel: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  meterTrack: {
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  sliders: {
    flexGrow: 0,
    maxHeight: 220,
  },
  slidersContent: {
    paddingBottom: 4,
  },
  sliderLabel: {
    fontSize: 13,
    color: '#e5e7eb',
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  exportError: {
    fontSize: 12,
    color: '#fca5a5',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
