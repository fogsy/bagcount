import { useCameraPermissions } from 'expo-camera';
import { projectLandmark } from 'expo-mediapipe-pose';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import type { PoseFrame } from '../core/handImpactDetector';
import {
  HybridPunchClassifier,
  StanceDefenseTracker,
  type DefenseEvent,
  type PunchEvent,
} from '../domain';
import MediaPipePoseView from '../native/MediaPipePoseView';
import { POSE_CONNECTIONS, VISIBILITY_MIN } from '../native/poseSkeleton';
import { createPoseSource } from '../native/poseSource';
import {
  classifyPunchRemote,
  isJevPunchClassifyEnabled,
} from '../services/punchClassify';
import {
  describeDeniedPermission,
  openAppSettings,
  toPermissionStatus,
} from './permissions';
import { colors, spacing } from './theme';

type Props = {
  onBack: () => void;
};

type ViewSize = {
  width: number;
  height: number;
};

type ProjectedPoint = {
  key: string;
  x: number;
  y: number;
};

type ProjectedBone = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

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

export default function PadCamScreen({ onBack }: Props) {
  useKeepAwake();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [source] = useState(() => createPoseSource());
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [viewSize, setViewSize] = useState<ViewSize>({ width: 0, height: 0 });
  const [fps, setFps] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [lastPunch, setLastPunch] = useState<PunchEvent | null>(null);
  const [lastDefense, setLastDefense] = useState<DefenseEvent | null>(null);
  const [formScore, setFormScore] = useState(0);

  const frameTimesRef = useRef<number[]>([]);
  const cameraStatus = toPermissionStatus(cameraPermission);
  const cameraGranted = cameraStatus === 'granted';

  const askPermission = useCallback(async () => {
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
  }, [requestCameraPermission]);

  useEffect(() => {
    if (!cameraGranted) {
      return;
    }

    const punchDetector = new HybridPunchClassifier(
      {},
      (event) => {
        setLastPunch(event);
      },
      isJevPunchClassifyEnabled() ? classifyPunchRemote : null,
    );
    const stanceTracker = new StanceDefenseTracker(
      {},
      (event) => {
        setLastDefense(event);
      },
      (score) => {
        setFormScore(score);
      },
    );

    const unsubscribe = source.subscribe((next) => {
      punchDetector.processFrame(next);
      stanceTracker.processFrame(next);
      setFrame(next);
      const times = frameTimesRef.current;
      times.push(next.tMs);
      const cutoff = next.tMs - 1000;
      while (times.length > 0 && (times[0] ?? 0) < cutoff) {
        times.shift();
      }
      setFps(times.length);
    });

    source.start();
    return () => {
      punchDetector.dispose();
      unsubscribe();
      source.stop();
    };
  }, [cameraGranted, source]);

  const overlay = useMemo(() => {
    if (
      frame == null ||
      viewSize.width <= 0 ||
      viewSize.height <= 0 ||
      frame.frameWidth <= 0 ||
      frame.frameHeight <= 0
    ) {
      return null;
    }

    const joints: ProjectedPoint[] = [];
    for (let index = 0; index < frame.landmarks.length; index += 1) {
      const landmark = frame.landmarks[index];
      if (landmark == null || landmark.visibility <= VISIBILITY_MIN) {
        continue;
      }
      const point = projectPoint(landmark.x, landmark.y, frame, viewSize);
      joints.push({ key: `j-${index}`, ...point });
    }

    const bones: ProjectedBone[] = [];
    for (const [a, b] of POSE_CONNECTIONS) {
      const la = frame.landmarks[a];
      const lb = frame.landmarks[b];
      if (
        la == null ||
        lb == null ||
        la.visibility <= VISIBILITY_MIN ||
        lb.visibility <= VISIBILITY_MIN
      ) {
        continue;
      }
      const pa = projectPoint(la.x, la.y, frame, viewSize);
      const pb = projectPoint(lb.x, lb.y, frame, viewSize);
      bones.push({
        key: `b-${a}-${b}`,
        x1: pa.x,
        y1: pa.y,
        x2: pb.x,
        y2: pb.y,
      });
    }

    return { joints, bones };
  }, [frame, viewSize]);

  if (!cameraGranted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Pad Cam</Text>
        <Text style={styles.permissionBody}>
          Camera access is needed to track your stance and punches on-device.
        </Text>
        {permissionError != null ? (
          <Text style={styles.permissionError}>{permissionError}</Text>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={askPermission}>
          <Text style={styles.primaryButtonLabel}>Allow camera</Text>
        </Pressable>
        {cameraStatus === 'blocked' ? (
          <Pressable style={styles.secondaryButton} onPress={openAppSettings}>
            <Text style={styles.secondaryButtonLabel}>Open Settings</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonLabel}>Back</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MediaPipePoseView
        source={source}
        cameraFacing="front"
        style={styles.camera}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setViewSize({ width, height });
        }}
      >
        {overlay != null ? (
          <Svg
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width={viewSize.width}
            height={viewSize.height}
          >
            {overlay.bones.map((bone) => (
              <Line
                key={bone.key}
                x1={bone.x1}
                y1={bone.y1}
                x2={bone.x2}
                y2={bone.y2}
                stroke={colors.accent}
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
            {overlay.joints.map((joint) => (
              <Circle
                key={joint.key}
                cx={joint.x}
                cy={joint.y}
                r={5}
                fill={colors.onAccent}
                stroke={colors.accent}
                strokeWidth={2}
              />
            ))}
          </Svg>
        ) : null}
      </MediaPipePoseView>

      <View style={styles.hud}>
        <View style={styles.topRow}>
          <Pressable style={styles.closeBtn} onPress={onBack}>
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
          <Text style={styles.titleCenter}>PAD CAM</Text>
          <Text style={styles.fpsChip}>{fps.toFixed(0)} FPS</Text>
        </View>
        <View style={styles.sideChips}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{formScore}</Text>
            <Text style={styles.statUnit}>FORM</Text>
          </View>
          {lastPunch != null ? (
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{lastPunch.type}</Text>
              <Text style={styles.statUnit}>{lastPunch.hand}</Text>
            </View>
          ) : null}
          {lastDefense != null ? (
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{lastDefense.type}</Text>
              <Text style={styles.statUnit}>DEFENSE</Text>
            </View>
          ) : null}
        </View>
      </View>
      <StatusBar style="light" />
    </View>
  );
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  titleCenter: {
    color: colors.text,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fpsChip: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    minWidth: 56,
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
    minWidth: 80,
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
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  permissionBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionError: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
