import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radii } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, style, disabled }: Props) {
  return (
    <Pressable
      style={[styles.btn, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
