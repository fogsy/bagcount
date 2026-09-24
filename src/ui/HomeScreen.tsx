import { useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getMicPermission, requestMicPermission } from '../native/audioSource';
import AudioDebugScreen from './AudioDebugScreen';
import CalibrationScreen from './CalibrationScreen';
import CountScreen from './CountScreen';
import {
  describeDeniedPermission,
  openAppSettings,
  toPermissionStatus,
  type PermissionFlags,
  type PermissionStatus,
} from './permissions';
import PoseDebugScreen from './PoseDebugScreen';
import { useForeground } from './useForeground';

export default function HomeScreen() {
  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    useCameraPermissions();
  const [micPermission, setMicPermission] = useState<PermissionFlags | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCount, setShowCount] = useState(false);
  const [showAudioDebug, setShowAudioDebug] = useState(false);
  const [showPoseDebug, setShowPoseDebug] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const foreground = useForeground();

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

  const requestPermissions = useCallback(async () => {
    setActionError(null);
    if (!cameraGranted) {
      await requestCameraPermission();
    }
    if (!micGranted) {
      await askMicPermission();
    }
  }, [askMicPermission, cameraGranted, micGranted, requestCameraPermission]);

  const handleStart = useCallback(async () => {
    setActionError(null);
    if (!cameraGranted) {
      const result = await requestCameraPermission();
      if (result?.granted !== true) {
        setActionError(
          describeDeniedPermission('Camera', {
            granted: false,
            canAskAgain: result?.canAskAgain,
          }),
        );
        return;
      }
    }
    if (!micGranted) {
      const result = await askMicPermission();
      if (!result.granted) {
        setActionError(describeDeniedPermission('Mic', result));
        return;
      }
    }
    setShowCount(true);
  }, [askMicPermission, cameraGranted, micGranted, requestCameraPermission]);

  const handleAudioDebug = useCallback(async () => {
    setActionError(null);
    if (!micGranted) {
      const result = await askMicPermission();
      if (!result.granted) {
        setActionError(describeDeniedPermission('Mic', result));
        return;
      }
    }
    setShowAudioDebug(true);
  }, [askMicPermission, micGranted]);

  const handleCalibrate = useCallback(async () => {
    setActionError(null);
    if (!micGranted) {
      const result = await askMicPermission();
      if (!result.granted) {
        setActionError(describeDeniedPermission('Mic', result));
        return;
      }
    }
    setShowCalibration(true);
  }, [askMicPermission, micGranted]);

  const handlePoseDebug = useCallback(async () => {
    setActionError(null);
    if (!cameraGranted) {
      const result = await requestCameraPermission();
      if (result?.granted !== true) {
        setActionError(
          describeDeniedPermission('Camera', {
            granted: false,
            canAskAgain: result?.canAskAgain,
          }),
        );
        return;
      }
    }
    setShowPoseDebug(true);
  }, [cameraGranted, requestCameraPermission]);

  if (showCount) {
    return <CountScreen onBack={() => setShowCount(false)} />;
  }

  if (showAudioDebug) {
    return <AudioDebugScreen onBack={() => setShowAudioDebug(false)} />;
  }

  if (showPoseDebug) {
    return <PoseDebugScreen onBack={() => setShowPoseDebug(false)} />;
  }

  if (showCalibration) {
    return <CalibrationScreen onBack={() => setShowCalibration(false)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BagCount</Text>
      <Text style={styles.status}>Camera: {cameraStatus}</Text>
      <Text style={styles.status}>Mic: {micStatus}</Text>
      {actionError != null ? <Text style={styles.error}>{actionError}</Text> : null}
      <Pressable style={styles.button} onPress={requestPermissions}>
        <Text style={styles.buttonLabel}>Request permissions</Text>
      </Pressable>
      {showSettings ? (
        <Pressable style={styles.button} onPress={openAppSettings}>
          <Text style={styles.buttonLabel}>Open Settings</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonLabel}>Start</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={handleCalibrate}>
        <Text style={styles.buttonLabel}>Calibrate</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={handleAudioDebug}>
        <Text style={styles.buttonLabel}>Audio debug</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={handlePoseDebug}>
        <Text style={styles.buttonLabel}>Pose debug</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
  },
  error: {
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
