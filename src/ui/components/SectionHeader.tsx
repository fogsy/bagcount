import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

type Props = {
  eyebrow?: string;
  title: string;
  right?: string;
};

export function SectionHeader({ eyebrow, title, right }: Props) {
  return (
    <View style={styles.wrap}>
      {eyebrow != null ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {right != null ? <Text style={styles.right}>{right}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...typography.title,
    color: colors.text,
    flex: 1,
  },
  right: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
