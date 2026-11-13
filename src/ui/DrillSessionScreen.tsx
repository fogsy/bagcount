import { useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CoachVoice,
  DrillSession,
  createExpoSpeechEngine,
  punchTypeToAvatarState,
  type CoachAvatarState,
  type CoachIntensity,
  type Drill,
  type DrillResults,
} from '../coach';
import { loadVoiceSettings, updateVoiceSettings } from '../data';
import { HybridPunchClassifier, type PunchType } from '../domain';
import MediaPipePoseView from '../native/MediaPipePoseView';
import { createPoseSource } from '../native/poseSource';
import {
  hapticHit,
  hapticMiss,
  hapticPrompt,
  playHitSfx,
} from '../services/feedback';
import {
  classifyPunchRemote,
  isJevPunchClassifyEnabled,
} from '../services/punchClassify';
import AnimatedCoachAvatar from './AnimatedCoachAvatar';
import {
  describeDeniedPermission,
  openAppSettings,
  toPermissionStatus,
} from './permissions';
import { colors, spacing } from './theme';

type Props = {
  drill: Drill;
  onComplete: (results: DrillResults) => void;
  onCancel: () => void;
};

const INTENSITY_CYCLE: CoachIntensity[] = ['low', 'med', 'high'];

export default function DrillSessionScreen({
  drill,
  onComplete,
  onCancel,
}: Props) {
  useKeepAwake();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [source] = useState(() => createPoseSource());
  const [prompt, setPrompt] = useState<PunchType>(drill.comboSequence[0]!);
  const [remainingSec, setRemainingSec] = useState(
    drill.durationSec * drill.rounds,
  );
  const [round, setRound] = useState(1);
  const [lastHit, setLastHit] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [avatarState, setAvatarState] = useState<CoachAvatarState>('idle');
  const [muted, setMuted] = useState(false);
  const [intensity, setIntensity] = useState<CoachIntensity>('med');

  const onCompleteRef = useRef(onComplete);
  const voiceRef = useRef<CoachVoice | null>(null);
  const lastRoundRef = useRef(1);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    loadVoiceSettings().then((settings) => {
      if (cancelled) {
        return;
      }
      setMuted(settings.mute);
      setIntensity(settings.coachIntensity);
      voiceRef.current?.setMuted(settings.mute);
      voiceRef.current?.setIntensity(settings.coachIntensity);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cameraStatus = toPermissionStatus(cameraPermission);
  const cameraGranted = cameraStatus === 'granted';

  useEffect(() => {
    if (!cameraGranted) {
      return;
    }

    const voice = new CoachVoice(createExpoSpeechEngine(), {
      muted,
      intensity,
    });
    voiceRef.current = voice;
    lastRoundRef.current = 1;

    const session = new DrillSession(drill, {
      onPrompt: (move) => {
        setPrompt(move);
        setAvatarState(punchTypeToAvatarState(move));
        voice.speakMove(move);
        hapticPrompt().catch(() => {});
      },
      onTick: (sec, r) => {
        setRemainingSec(sec);
        setRound(r);
        if (r > lastRoundRef.current) {
          lastRoundRef.current = r;
          setAvatarState('idle');
          voice.speakEncourage();
        }
      },
      onHit: (event) => {
        setLastHit(event.type);
        voice.speakFeedback('good');
        hapticHit().catch(() => {});
        playHitSfx().catch(() => {});
      },
      onMiss: () => {
        voice.speakFeedback('miss');
        hapticMiss().catch(() => {});
      },
      onComplete: (results) => {
        setAvatarState('celebrate');
        voice.speakFeedback('celebrate');
        onCompleteRef.current(results);
      },
    });

    const detector = new HybridPunchClassifier(
      {},
      (event) => {
        session.onPunch({ ...event, tMs: Date.now() });
      },
      isJevPunchClassifyEnabled() ? classifyPunchRemote : null,
    );

    const now = () => Date.now();
    session.start(now());

    const unsubscribe = source.subscribe((frame) => {
      detector.processFrame(frame);
    });

    const interval = setInterval(() => {
      session.tick(now());
    }, 250);

    const idleTimer = setInterval(() => {
      setAvatarState((prev) =>
        prev === 'celebrate' || prev === 'idle' ? prev : 'idle',
      );
    }, 900);

    source.start();
    return () => {
      clearInterval(interval);
      clearInterval(idleTimer);
      detector.dispose();
      unsubscribe();
      source.stop();
      voice.stop();
      voiceRef.current = null;
      if (session.isRunning) {
        session.abort();
      }
    };
    // muted/intensity applied via voiceRef setters; avoid restarting session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraGranted, drill, source]);

  useEffect(() => {
    voiceRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    voiceRef.current?.setIntensity(intensity);
  }, [intensity]);

  const toggleMute = async () => {
    const next = !muted;
    setMuted(next);
    voiceRef.current?.setMuted(next);
    await updateVoiceSettings({ mute: next });
  };

  const cycleIntensity = async () => {
    const idx = INTENSITY_CYCLE.indexOf(intensity);
    const next = INTENSITY_CYCLE[(idx + 1) % INTENSITY_CYCLE.length]!;
    setIntensity(next);
    voiceRef.current?.setIntensity(next);
    await updateVoiceSettings({ coachIntensity: next });
  };

  if (!cameraGranted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.permissionTitle}>{drill.name}</Text>
        <Text style={styles.permissionBody}>
          Camera is required to score this drill on-device.
        </Text>
        {permissionError != null ? (
          <Text style={styles.error}>{permissionError}</Text>
        ) : null}
        <Pressable
          style={styles.primary}
          onPress={async () => {
            setPermissionError(null);
            const result = await requestCameraPermission();
            if (result?.granted !== true) {
              setPermissionError(
                describeDeniedPermission('Camera', {
                  granted: false,
                  canAskAgain: result?.canAskAgain,
                }),
              );
            }
          }}
        >
          <Text style={styles.primaryLabel}>Allow camera</Text>
        </Pressable>
        {cameraStatus === 'blocked' ? (
          <Pressable style={styles.secondary} onPress={openAppSettings}>
            <Text style={styles.secondaryLabel}>Open Settings</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.secondary} onPress={onCancel}>
          <Text style={styles.secondaryLabel}>Cancel</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  const intensityUi =
    intensity === 'low'
      ? 'LIGHT'
      : intensity === 'high'
        ? 'BEAST'
        : 'NORMAL';

  return (
    <View style={styles.container}>
      <MediaPipePoseView
        source={source}
        cameraFacing="front"
        style={styles.camera}
      />
      <View style={styles.hud}>
        <View style={styles.topRow}>
          <Pressable style={styles.closeBtn} onPress={onCancel}>
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.promptTop}>{prompt}</Text>
            <Text style={styles.drillName}>{drill.name.toUpperCase()}</Text>
          </View>
          <Text style={styles.timerTop}>{formatClock(remainingSec)}</Text>
        </View>

        <View style={styles.sideChips}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{Math.max(1, round * 8)}</Text>
            <Text style={styles.statUnit}>KCAL</Text>
          </View>
          <Pressable style={styles.teachChip} onPress={toggleMute}>
            <Text style={styles.teachLabel}>{muted ? 'MUTE' : 'TEACH'}</Text>
          </Pressable>
          <View style={styles.statChip}>
            <Text style={styles.statLabelGold}>ROUND</Text>
            <Text style={styles.statValue}>
              {round}/{drill.rounds}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabelGold}>TIME</Text>
            <Text style={styles.statValue}>{formatClock(remainingSec)}</Text>
          </View>
        </View>

        {lastHit != null ? (
          <Text style={styles.hit}>Hit: {lastHit}</Text>
        ) : null}
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.controls}>
          <Pressable style={styles.ctrlSmall} onPress={cycleIntensity}>
            <Text style={styles.ctrlGlyph}>‹</Text>
          </Pressable>
          <Pressable style={styles.ctrlPause} onPress={onCancel}>
            <Text style={styles.ctrlPauseGlyph}>❚❚</Text>
          </Pressable>
          <Pressable style={styles.ctrlSmall} onPress={cycleIntensity}>
            <Text style={styles.ctrlGlyph}>›</Text>
          </Pressable>
        </View>
        <View style={styles.intensityRow}>
          {(['LIGHT', 'NORMAL', 'BEAST', 'SLOW'] as const).map((label) => {
            const on = label === intensityUi || (label === 'SLOW' && false);
            return (
              <Pressable
                key={label}
                style={[styles.intensityItem, on && styles.intensityOn]}
                onPress={cycleIntensity}
              >
                <Text
                  style={[styles.intensityLabel, on && styles.intensityLabelOn]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.avatarSlot}>
        <AnimatedCoachAvatar state={avatarState} />
      </View>
      <StatusBar style="light" />
    </View>
  );
}

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  hud: {
    position: 'absolute',
    top: 54,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20,20,20,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  promptTop: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  drillName: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  timerTop: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'right',
  },
  sideChips: {
    alignSelf: 'flex-start',
    gap: spacing.sm,
  },
  statChip: {
    backgroundColor: 'rgba(20,20,20,0.78)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
  },
  teachChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  teachLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statUnit: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statLabelGold: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hit: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 28,
    gap: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ctrlSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(28,28,28,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlGlyph: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: -4,
  },
  ctrlPause: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlPauseGlyph: {
    color: colors.onAccent,
    fontSize: 18,
    fontWeight: '800',
  },
  intensityRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.9)',
    borderRadius: 999,
    padding: 4,
    gap: 2,
  },
  intensityItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  intensityOn: {
    backgroundColor: colors.accent,
  },
  intensityLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  intensityLabelOn: {
    color: colors.onAccent,
  },
  avatarSlot: {
    position: 'absolute',
    right: spacing.md,
    bottom: 150,
  },
  permission: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  permissionBody: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.onAccent,
    fontWeight: '700',
  },
  secondary: {
    padding: spacing.sm,
  },
  secondaryLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
