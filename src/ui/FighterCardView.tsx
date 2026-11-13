import { forwardRef, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FighterProfile } from '../domain/fighterProfile';
import { colors, radii, spacing, typography } from './theme';

type Props = {
  profile: FighterProfile;
  level: number;
  streak: number;
  totalXp: number;
};

export type FighterCardViewRef = ComponentRef<typeof View>;

const FighterCardView = forwardRef<FighterCardViewRef, Props>(function FighterCardView(
  { profile, level, streak, totalXp },
  ref,
) {
  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <Text style={styles.brand}>BOXINGAI</Text>
      <Text style={styles.name}>{profile.displayName}</Text>
      <Text style={styles.meta}>
        {profile.stance.toUpperCase()} · Lv {level} · {streak} day streak
      </Text>
      <Text style={styles.xp}>{totalXp} XP</Text>

      <Text style={styles.section}>Strengths</Text>
      <View style={styles.row}>
        {profile.strengths.map((s) => (
          <Text key={s} style={styles.chipGood}>
            {s}
          </Text>
        ))}
      </View>

      <Text style={styles.section}>Work on</Text>
      <View style={styles.row}>
        {profile.weaknesses.map((s) => (
          <Text key={s} style={styles.chipWeak}>
            {s}
          </Text>
        ))}
      </View>

      <Text style={styles.section}>Next drills</Text>
      {profile.suggestedDrills.map((d) => (
        <Text key={d.id} style={styles.drill}>
          → {d.name}
        </Text>
      ))}
    </View>
  );
});

export default FighterCardView;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: spacing.lg,
    gap: spacing.sm,
    minWidth: 300,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  brand: {
    ...typography.eyebrow,
    color: colors.accent,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  xp: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 18,
  },
  section: {
    marginTop: spacing.sm,
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipGood: {
    backgroundColor: colors.accentMuted,
    color: colors.accent,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  chipWeak: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  drill: {
    color: colors.text,
    fontWeight: '600',
  },
});
