import { StyleSheet, Text, View } from 'react-native';

import type { CoachAvatarState } from '../coach/CoachAvatar';
import { colors } from './theme';

type Props = {
  state: CoachAvatarState;
};

/**
 * Stub for a future Lottie/3D coach. Same props as AnimatedCoachAvatar
 * so DrillSessionScreen can swap implementations behind CoachAvatar.
 */
export default function LottieCoachAvatar({ state }: Props) {
  return (
    <View style={styles.box} pointerEvents="none">
      <Text style={styles.text}>Lottie: {state}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  text: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
