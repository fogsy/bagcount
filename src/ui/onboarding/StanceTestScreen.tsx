import { useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StanceDefenseTracker } from '../../domain';
import MediaPipePoseView from '../../native/MediaPipePoseView';
import { createPoseSource } from '../../native/poseSource';
import { colors, spacing } from '../theme';

type Props = {
  onPass: () => void;
  onSkip: () => void;
};

const HOLD_MS = 2000;
const FORM_MIN = 60;

export default function StanceTestScreen({ onPass, onSkip }: Props) {
  useKeepAwake();
  const [permission, requestPermission] = useCameraPermissions();
  const [source] = useState(() => createPoseSource());
  const [form, setForm] = useState(0);
  const [heldMs, setHeldMs] = useState(0);
  const goodSince = useRef<number | null>(null);

  const granted = permission?.granted === true;

  useEffect(() => {
    if (!granted) {
      return;
    }
    const tracker = new StanceDefenseTracker({}, undefined, (score) => {
      setForm(score);
      const now = Date.now();
      if (score >= FORM_MIN) {
        if (goodSince.current == null) {
          goodSince.current = now;
        }
        setHeldMs(now - goodSince.current);
      } else {
        goodSince.current = null;
        setHeldMs(0);
      }
    });

    const unsub = source.subscribe((frame) => {
      tracker.processFrame(frame);
    });
    source.start();
    return () => {
      unsub();
      source.stop();
    };
  }, [granted, source]);

  useEffect(() => {
    if (heldMs >= HOLD_MS) {
      onPass();
    }
  }, [heldMs, onPass]);

  if (!granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Stance check</Text>
        <Text style={styles.body}>
          Allow camera to check your guard and feet for a few seconds.
        </Text>
        <Pressable style={styles.btn} onPress={() => requestPermission()}>
          <Text style={styles.btnLabel}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={onSkip}>
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MediaPipePoseView
        source={source}
        cameraFacing="front"
        style={styles.camera}
      />
      <View style={styles.hud}>
        <Text style={styles.title}>Hold a solid stance</Text>
        <Text style={styles.body}>
          Form {form} · hold {Math.min(HOLD_MS, heldMs)}/{HOLD_MS}ms
        </Text>
        <Pressable onPress={onSkip}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  camera: { flex: 1 },
  hud: {
    position: 'absolute',
    top: 56,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnLabel: { color: colors.onAccent, fontWeight: '700' },
  skip: { color: colors.textMuted, fontWeight: '600', marginTop: 8 },
});
