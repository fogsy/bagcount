import { PoseCameraView } from 'expo-mediapipe-pose';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, type ViewProps } from 'react-native';

import type { PoseSourceController } from './poseSource';

type InferenceFailure = {
  code: string;
};

export type CameraFacing = 'front' | 'back';

type Props = ViewProps & {
  source: PoseSourceController;
  cameraFacing?: CameraFacing;
  onInferenceError?: (failure: InferenceFailure) => void;
};

export default function MediaPipePoseView({
  source,
  cameraFacing = 'back',
  children,
  onInferenceError,
  ...viewProps
}: Props) {
  const sourceActive = useSyncExternalStore(
    source.subscribeActive,
    source.getIsActive,
    source.getIsActive,
  );
  const [foreground, setForeground] = useState(
    () => AppState.currentState === 'active',
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
    });
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <PoseCameraView
      {...viewProps}
      cameraFacing={cameraFacing}
      frameLimit={30}
      skeleton={false}
      isActive={sourceActive && foreground}
      onLandmark={source.ingestNativeFrame}
      onInferenceError={onInferenceError}
    >
      {children}
    </PoseCameraView>
  );
}
