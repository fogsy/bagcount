import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DrillResults } from '../coach';
import { colors, spacing } from './theme';

type Props = {
  results: DrillResults;
  onDone: () => void;
};

export default function DrillResultsScreen({ results, onDone }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.kicker}>Drill complete</Text>
      <Text style={styles.title}>{results.drillName}</Text>

      <View style={styles.scoreBlock}>
        <Text style={styles.scoreValue}>{results.score}</Text>
        <Text style={styles.scoreLabel}>Score</Text>
      </View>

      <Text style={styles.xp}>+{results.xpEarned} XP</Text>

      <View style={styles.row}>
        <Stat
          label="Accuracy"
          value={`${Math.round(results.accuracyOverall * 100)}%`}
        />
        <Stat
          label="Speed"
          value={`${Math.round(results.speedScore * 100)}%`}
        />
        <Stat label="Combos" value={String(results.combosCompleted)} />
      </View>

      <Text style={styles.section}>Accuracy per move</Text>
      {results.perMove.map((move) => (
        <View key={move.move} style={styles.moveRow}>
          <Text style={styles.moveName}>{move.move}</Text>
          <Text style={styles.moveMeta}>
            {move.hit}/{move.prompted} · {Math.round(move.accuracy * 100)}%
          </Text>
        </View>
      ))}

      <Pressable style={styles.button} onPress={onDone}>
        <Text style={styles.buttonLabel}>Done</Text>
      </Pressable>
      <StatusBar style="light" />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  kicker: {
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  scoreBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  scoreValue: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '800',
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  xp: {
    textAlign: 'center',
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  moveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moveName: {
    color: colors.text,
    fontWeight: '700',
  },
  moveMeta: {
    color: colors.textSecondary,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonLabel: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
});
