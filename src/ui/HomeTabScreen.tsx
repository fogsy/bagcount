import { useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Drill, DrillResults } from '../coach';
import {
  applyDrillResults,
  getHomeSnapshot,
  loadOnboarding,
  type HomeProgressSnapshot,
} from '../data';
import { t } from '../i18n';
import { getMicPermission, requestMicPermission } from '../native/audioSource';
import { track } from '../services/analytics';
import { isPlanDayLocked } from '../services/premium';
import AudioDebugScreen from './AudioDebugScreen';
import CalibrationScreen from './CalibrationScreen';
import { PrimaryButton, Screen, StatTile } from './components';
import CountScreen from './CountScreen';
import DrillResultsScreen from './DrillResultsScreen';
import DrillSessionScreen from './DrillSessionScreen';
import PadCamScreen from './PadCamScreen';
import {
  describeDeniedPermission,
  openAppSettings,
  toPermissionStatus,
  type PermissionFlags,
  type PermissionStatus,
} from './permissions';
import PoseDebugScreen from './PoseDebugScreen';
import { BoltIcon, FlameIcon, LeagueTabIcon } from './tabIcons';
import { colors, radii, spacing, typography } from './theme';
import { useForeground } from './useForeground';

type Overlay =
  | 'padcam'
  | 'count'
  | 'audio'
  | 'pose'
  | 'calibration'
  | 'mission'
  | 'mission-results'
  | null;

type Props = {
  onFullscreenChange?: (fullscreen: boolean) => void;
  onOpenPaywall?: () => void;
  onOpenPadCam?: () => void;
};

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export default function HomeTabScreen({
  onFullscreenChange,
  onOpenPaywall,
  onOpenPadCam,
}: Props) {
  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    useCameraPermissions();
  const [micPermission, setMicPermission] = useState<PermissionFlags | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [missionDrill, setMissionDrill] = useState<Drill | null>(null);
  const [missionResults, setMissionResults] = useState<DrillResults | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState<HomeProgressSnapshot | null>(null);
  const [displayName, setDisplayName] = useState('Fighter');
  const [toolsOpen, setToolsOpen] = useState(false);
  const foreground = useForeground();
  const greeting = useMemo(() => greetingForNow(), []);

  const refreshProgress = useCallback(async () => {
    const next = await getHomeSnapshot();
    setSnapshot(next);
  }, []);

  useEffect(() => {
    onFullscreenChange?.(overlay != null);
  }, [onFullscreenChange, overlay]);

  useEffect(() => {
    if (!foreground) {
      return;
    }
    let cancelled = false;
    getCameraPermission().catch(() => {});
    getMicPermission()
      .then((result) => {
        if (!cancelled) {
          setMicPermission(result);
        }
      })
      .catch(() => {});
    Promise.all([getHomeSnapshot(), loadOnboarding()])
      .then(([next, onboarding]) => {
        if (!cancelled) {
          setSnapshot(next);
          setDisplayName(onboarding.displayName || 'Fighter');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [foreground, getCameraPermission]);

  const cameraStatus: PermissionStatus = toPermissionStatus(cameraPermission);
  const micStatus: PermissionStatus = toPermissionStatus(micPermission);
  const cameraGranted = cameraStatus === 'granted';
  const micGranted = micStatus === 'granted';
  const showSettings =
    cameraStatus === 'blocked' || micStatus === 'blocked';

  const askMicPermission = useCallback(async () => {
    const result = await requestMicPermission();
    setMicPermission(result);
    return result;
  }, []);

  const ensureCamera = useCallback(async () => {
    if (cameraGranted) {
      return true;
    }
    const result = await requestCameraPermission();
    if (result?.granted !== true) {
      setActionError(
        describeDeniedPermission('Camera', {
          granted: false,
          canAskAgain: result?.canAskAgain,
        }),
      );
      return false;
    }
    return true;
  }, [cameraGranted, requestCameraPermission]);

  const ensureMic = useCallback(async () => {
    if (micGranted) {
      return true;
    }
    const result = await askMicPermission();
    if (!result.granted) {
      setActionError(describeDeniedPermission('Mic', result));
      return false;
    }
    return true;
  }, [askMicPermission, micGranted]);

  const openPadCam = useCallback(async () => {
    setActionError(null);
    if (!(await ensureCamera())) {
      return;
    }
    if (onOpenPadCam != null) {
      onOpenPadCam();
      return;
    }
    setOverlay('padcam');
  }, [ensureCamera, onOpenPadCam]);

  const openCount = useCallback(async () => {
    setActionError(null);
    if (!(await ensureCamera()) || !(await ensureMic())) {
      return;
    }
    setOverlay('count');
  }, [ensureCamera, ensureMic]);

  const openCalibration = useCallback(async () => {
    setActionError(null);
    if (!(await ensureMic())) {
      return;
    }
    setOverlay('calibration');
  }, [ensureMic]);

  const openAudioDebug = useCallback(async () => {
    setActionError(null);
    if (!(await ensureMic())) {
      return;
    }
    setOverlay('audio');
  }, [ensureMic]);

  const openPoseDebug = useCallback(async () => {
    setActionError(null);
    if (!(await ensureCamera())) {
      return;
    }
    setOverlay('pose');
  }, [ensureCamera]);

  const startMission = useCallback(async () => {
    setActionError(null);
    const drill = snapshot?.mission;
    if (drill == null) {
      setActionError('No mission available yet.');
      return;
    }
    if (!(await ensureCamera())) {
      return;
    }
    setMissionDrill(drill);
    setOverlay('mission');
  }, [ensureCamera, snapshot?.mission]);

  if (overlay === 'padcam') {
    return <PadCamScreen onBack={() => setOverlay(null)} />;
  }
  if (overlay === 'count') {
    return <CountScreen onBack={() => setOverlay(null)} />;
  }
  if (overlay === 'audio') {
    return <AudioDebugScreen onBack={() => setOverlay(null)} />;
  }
  if (overlay === 'pose') {
    return <PoseDebugScreen onBack={() => setOverlay(null)} />;
  }
  if (overlay === 'calibration') {
    return <CalibrationScreen onBack={() => setOverlay(null)} />;
  }
  if (overlay === 'mission' && missionDrill != null) {
    return (
      <DrillSessionScreen
        drill={missionDrill}
        onCancel={() => {
          setOverlay(null);
          setMissionDrill(null);
        }}
        onComplete={async (results) => {
          setMissionResults(results);
          await applyDrillResults(results);
          await refreshProgress();
          setOverlay('mission-results');
        }}
      />
    );
  }
  if (overlay === 'mission-results' && missionResults != null) {
    return (
      <DrillResultsScreen
        results={missionResults}
        onDone={() => {
          setOverlay(null);
          setMissionDrill(null);
          setMissionResults(null);
          refreshProgress().catch(() => {});
        }}
      />
    );
  }

  const xpBar = snapshot?.xpBar;
  const progress = snapshot?.progress;
  const plan = snapshot?.plan;
  const todayIndex = snapshot?.todayIndex ?? 0;
  const planPct = Math.round(((todayIndex + 1) / 30) * 100);
  const weekStart = Math.floor(todayIndex / 7) * 7;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
      </View>

      <View style={styles.missionCard}>
        <View style={styles.missionCopy}>
          <View style={styles.missionPill}>
            <Text style={styles.missionPillText}>{t('home.mission')}</Text>
          </View>
          <Text style={styles.missionTitle}>
            {(snapshot?.mission?.name ?? 'Loading…').toUpperCase()}
          </Text>
          <Text style={styles.missionBody} numberOfLines={2}>
            {snapshot?.mission?.description ??
              'Your level-matched drill for today.'}
          </Text>
          <PrimaryButton
            label={
              isPlanDayLocked(todayIndex)
                ? t('drills.locked')
                : `▶ ${t('home.startMission')}`
            }
            onPress={() => {
              if (isPlanDayLocked(todayIndex)) {
                onOpenPaywall?.();
                return;
              }
              track('drill_start', { source: 'mission' });
              startMission().catch(() => {});
            }}
          />
        </View>
        <Image
          source={require('../../assets/ui/mission-boxer.jpg')}
          style={styles.missionArt}
          resizeMode="cover"
        />
      </View>

      <View style={styles.statsRow}>
        <StatTile
          icon={<FlameIcon />}
          value={`${progress?.streakCount ?? 0}`}
          label="days"
        />
        <StatTile
          icon={<LeagueTabIcon color={colors.gold} size={16} />}
          value={`${xpBar?.level ?? 1}`}
          label="level"
          valueColor={colors.gold}
        />
        <StatTile
          icon={<BoltIcon />}
          value={formatXp(progress?.totalXp ?? 0)}
          label="XP"
          valueColor={colors.gold}
        />
      </View>

      <View style={styles.xpTrack}>
        <View
          style={[
            styles.xpFill,
            { width: `${Math.round((xpBar?.ratio ?? 0) * 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.xpHint}>
        {xpBar != null
          ? `${Math.max(0, xpBar.xpForLevel - xpBar.xpIntoLevel)} to Level ${xpBar.level + 1}`
          : 'Train to earn XP'}
      </Text>

      <View style={styles.campCard}>
        <View style={styles.campHeader}>
          <Text style={styles.campTitle}>FIGHT CAMP</Text>
          <Text style={styles.campWeek}>
            {Math.min(7, (todayIndex % 7) + 1)} / 7 this week
          </Text>
        </View>
        <Text style={styles.campDay}>
          DAY {todayIndex + 1} of 30
        </Text>
        <View style={styles.campBarRow}>
          <View style={styles.campTrack}>
            <View style={[styles.campFill, { width: `${planPct}%` }]} />
          </View>
          <Text style={styles.campPct}>{planPct}%</Text>
        </View>
        <View style={styles.weekRow}>
          {WEEK_LABELS.map((label, i) => {
            const dayIndex = weekStart + i;
            const day = plan?.days?.[dayIndex];
            const isToday = dayIndex === todayIndex;
            const done = day?.completed === true;
            return (
              <View key={`${label}-${i}`} style={styles.weekItem}>
                <View
                  style={[
                    styles.weekDot,
                    done && styles.weekDotDone,
                    isToday && !done && styles.weekDotToday,
                  ]}
                >
                  {done ? <Text style={styles.weekCheck}>✓</Text> : null}
                </View>
                <Text style={styles.weekLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {actionError != null ? (
        <Text style={styles.error}>{actionError}</Text>
      ) : null}

      <Pressable
        style={styles.toolsToggle}
        onPress={() => setToolsOpen((open) => !open)}
      >
        <Text style={styles.toolsLabel}>{t('home.tools')}</Text>
        <Text style={styles.toolsChevron}>{toolsOpen ? '▾' : '▸'}</Text>
      </Pressable>

      {toolsOpen ? (
        <View style={styles.toolsBlock}>
          <Pressable style={styles.secondaryButton} onPress={openPadCam}>
            <Text style={styles.secondaryButtonLabel}>{t('home.padCam')}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={openCount}>
            <Text style={styles.secondaryButtonLabel}>Start session</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={openCalibration}>
            <Text style={styles.secondaryButtonLabel}>Calibrate</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={openPoseDebug}>
            <Text style={styles.secondaryButtonLabel}>Pose debug</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={openAudioDebug}>
            <Text style={styles.secondaryButtonLabel}>Audio debug</Text>
          </Pressable>
          {showSettings ? (
            <Pressable style={styles.secondaryButton} onPress={openAppSettings}>
              <Text style={styles.secondaryButtonLabel}>Open Settings</Text>
            </Pressable>
          ) : null}
          <Text style={styles.meta}>
            Camera: {cameraStatus} · Mic: {micStatus}
          </Text>
        </View>
      ) : null}

      <StatusBar style="light" />
    </Screen>
  );
}

function formatXp(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(xp);
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  name: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  missionCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 168,
  },
  missionCopy: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  missionPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  missionPillText: {
    ...typography.eyebrow,
    color: colors.accent,
    fontSize: 10,
  },
  missionTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.text,
    letterSpacing: -0.3,
  },
  missionBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  missionArt: {
    width: 118,
    alignSelf: 'stretch',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  xpTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    marginTop: -4,
  },
  xpFill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  xpHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
  },
  campCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  campHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campTitle: {
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 1,
  },
  campWeek: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  campDay: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  campBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  campTrack: {
    flex: 1,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  campFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  campPct: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  weekItem: {
    alignItems: 'center',
    gap: 6,
  },
  weekDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekDotToday: {
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  weekCheck: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 12,
  },
  weekLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  toolsToggle: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolsLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  toolsChevron: {
    color: colors.textMuted,
    fontSize: 16,
  },
  toolsBlock: {
    gap: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  meta: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
