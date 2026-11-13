import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { CoachAvatarState } from '../coach/CoachAvatar';
import { colors, spacing } from './theme';

type Props = {
  state: CoachAvatarState;
};

const LABELS: Record<CoachAvatarState, string> = {
  idle: 'COACH',
  jab: 'JAB',
  cross: 'CROSS',
  hook: 'HOOK',
  uppercut: 'UPPER',
  celebrate: 'YES!',
};

export default function AnimatedCoachAvatar({ state }: Props) {
  const [pulse] = useState(() => new Animated.Value(1));
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (state === 'idle') {
      Animated.timing(pulse, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    const x =
      state === 'jab' || state === 'hook'
        ? -12
        : state === 'cross' || state === 'uppercut'
          ? 12
          : 0;
    const scale = state === 'celebrate' ? 1.18 : 1.1;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(pulse, {
          toValue: scale,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: x,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [pulse, slide, state]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.avatar,
          {
            transform: [{ translateX: slide }, { scale: pulse }],
            borderColor: state === 'idle' ? colors.border : colors.accent,
          },
        ]}
      >
        <Text style={styles.face}>◎</Text>
        <Text style={styles.label}>{LABELS[state]}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  face: {
    fontSize: 28,
    color: colors.accent,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
});
