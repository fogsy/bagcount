import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DrillDifficulty } from '../../coach/drill';
import {
  completeOnboarding,
  stanceFromHand,
  type DominantHand,
  type TrainingGoal,
} from '../../data/onboardingRepo';
import { t } from '../../i18n';
import { track } from '../../services/analytics';
import StanceTestScreen from './StanceTestScreen';
import { colors, spacing } from '../theme';

type Props = {
  onFinished: () => void;
};

type Step = 0 | 1 | 2 | 3 | 4;

export default function OnboardingFlow({ onFinished }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [experience, setExperience] = useState<DrillDifficulty | null>(null);
  const [hand, setHand] = useState<DominantHand | null>(null);
  const [displayName, setDisplayName] = useState('Fighter');
  const [city, setCity] = useState('');
  const [stancePassed, setStancePassed] = useState(false);

  const canNext = useMemo(() => {
    if (step === 0) return goal != null;
    if (step === 1) return experience != null;
    if (step === 2) return hand != null && displayName.trim().length > 0;
    if (step === 3) return stancePassed;
    return true;
  }, [step, goal, experience, hand, displayName, stancePassed]);

  const finish = async () => {
    await completeOnboarding({
      goal,
      experience,
      dominantHand: hand,
      stance: hand != null ? stanceFromHand(hand) : 'orthodox',
      displayName: displayName.trim() || 'Fighter',
      city: city.trim(),
      stanceTestPassed: stancePassed,
    });
    track('onboarding_complete', { goal, experience, hand });
    onFinished();
  };

  if (step === 3) {
    return (
      <StanceTestScreen
        onPass={() => {
          setStancePassed(true);
          setStep(4);
        }}
        onSkip={() => {
          setStancePassed(false);
          setStep(4);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.progress}>Step {step + 1} / 5</Text>

      {step === 0 ? (
        <>
          <Text style={styles.title}>{"What's your goal?"}</Text>
          <Choice
            label="Get fit"
            selected={goal === 'fitness'}
            onPress={() => setGoal('fitness')}
          />
          <Choice
            label="Build skill"
            selected={goal === 'skill'}
            onPress={() => setGoal('skill')}
          />
          <Choice
            label="Compete"
            selected={goal === 'competition'}
            onPress={() => setGoal('competition')}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text style={styles.title}>Experience level</Text>
          <Choice
            label="Beginner"
            selected={experience === 'beginner'}
            onPress={() => setExperience('beginner')}
          />
          <Choice
            label="Intermediate"
            selected={experience === 'intermediate'}
            onPress={() => setExperience('intermediate')}
          />
          <Choice
            label="Advanced"
            selected={experience === 'advanced'}
            onPress={() => setExperience('advanced')}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={styles.title}>Dominant hand</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Fighter name"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City (for league)"
            placeholderTextColor={colors.textMuted}
          />
          <Choice
            label="Right hand (orthodox)"
            selected={hand === 'right'}
            onPress={() => setHand('right')}
          />
          <Choice
            label="Left hand (southpaw)"
            selected={hand === 'left'}
            onPress={() => setHand('left')}
          />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Text style={styles.title}>{"You're ready"}</Text>
          <Text style={styles.body}>
            {displayName} · {hand ?? '—'} · {goal ?? '—'} ·{' '}
            {experience ?? '—'}
          </Text>
          <Text style={styles.body}>
            Stance test: {stancePassed ? 'passed' : 'skipped'}
          </Text>
        </>
      ) : null}

      <Pressable
        style={[styles.next, !canNext && styles.nextDisabled]}
        disabled={!canNext}
        onPress={() => {
          if (step === 4) {
            finish().catch(() => {});
            return;
          }
          setStep((s) => (s + 1) as Step);
        }}
      >
        <Text style={styles.nextLabel}>
          {step === 4 ? t('onboarding.enter') : t('onboarding.continue')}
        </Text>
      </Pressable>
      <StatusBar style="light" />
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choice, selected && styles.choiceSelected]}
      onPress={onPress}
    >
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 72,
    gap: spacing.md,
  },
  progress: {
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
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
  },
  choice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
  },
  choiceSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  choiceLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  choiceLabelOn: {
    color: colors.text,
  },
  next: {
    marginTop: 'auto',
    marginBottom: 40,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextDisabled: {
    opacity: 0.4,
  },
  nextLabel: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 16,
  },
});
