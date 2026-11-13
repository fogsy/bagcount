import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type Props = {
  icon?: ReactNode;
  value: string;
  label: string;
  valueColor?: string;
};

export function StatTile({ icon, value, label, valueColor }: Props) {
  return (
    <View style={styles.tile}>
      {icon != null ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.value, valueColor != null && { color: valueColor }]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  icon: {
    marginBottom: 2,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
