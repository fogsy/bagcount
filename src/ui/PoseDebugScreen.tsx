import { projectLandmark } from 'expo-mediapipe-pose';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import {
  createHandImpactDetector,
  type NormalizedBox,
  type PoseFrame,
} from '../core/handImpactDetector';
import MediaPipePoseView from '../native/MediaPipePoseView';
import { createPoseSource } from '../native/poseSource';

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

const DEFAULT_BAG_BOX: NormalizedBox = {
  x: 0.35,
  y: 0.25,
  width: 0.3,
  height: 0.5,
};

type Props = {
  onBack: () => void;
};

type ViewSize = {
  width: number;
  height: number;
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

export default function PoseDebugScreen({ onBack }: Props) {
  useKeepAwake();

  const [source] = useState(() => createPoseSource());
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [viewSize, setViewSize] = useState<ViewSize>({ width: 0, height: 0 });
  const [fps, setFps] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);

  const frameTimesRef = useRef<number[]>([]);

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

    const box = projectPoint(DEFAULT_BAG_BOX.x, DEFAULT_BAG_BOX.y, frame, viewSize);
    const boxEnd = projectPoint(
      DEFAULT_BAG_BOX.x + DEFAULT_BAG_BOX.width,
      DEFAULT_BAG_BOX.y + DEFAULT_BAG_BOX.height,
      frame,
      viewSize,
    );
    const joints = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_WRIST, RIGHT_WRIST].flatMap(
      (index, order) => {
        const landmark = frame.landmarks[index];
        if (landmark == null || landmark.visibility <= 0.3) {
          return [];
        }
        const point = projectPoint(landmark.x, landmark.y, frame, viewSize);
        const colors = ['#e5e7eb', '#e5e7eb', '#22d3ee', '#f59e0b'];
        return [{ key: String(index), ...point, color: colors[order] ?? '#fff' }];
      },
    );

    return { box, boxEnd, joints };
  }, [frame, viewSize]);

  useEffect(() => {
    const detector = createHandImpactDetector({}, () => {
      setCandidateCount((count) => count + 1);
    });
    detector.setBagBox(DEFAULT_BAG_BOX);

    const unsubscribe = source.subscribe((next) => {
      detector.processFrame(next);
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
      unsubscribe();
      source.stop();
    };
  }, [source]);

  return (
    <View style={styles.container}>
      <MediaPipePoseView
        source={source}
        style={styles.camera}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setViewSize({ width, height });
        }}
      >
        {overlay != null && (
          <Svg
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width={viewSize.width}
            height={viewSize.height}
          >
            <Rect
              x={overlay.box.x}
              y={overlay.box.y}
              width={overlay.boxEnd.x - overlay.box.x}
              height={overlay.boxEnd.y - overlay.box.y}
              stroke="#22c55e"
              strokeWidth={3}
              fill="rgba(34,197,94,0.15)"
            />
            {overlay.joints.map((joint) => (
              <Circle
                key={joint.key}
                cx={joint.x}
                cy={joint.y}
                r={8}
                fill={joint.color}
              />
            ))}
          </Svg>
        )}
      </MediaPipePoseView>

      <View style={styles.hud}>
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.fps}>{fps.toFixed(0)} FPS</Text>
        <Text style={styles.counter}>Candidates {candidateCount}</Text>
        <Text style={styles.note}>Tracks 1 person only</Text>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  hud: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    gap: 4,
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
  fps: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  counter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  note: {
    fontSize: 13,
    color: '#d1d5db',
  },
});
