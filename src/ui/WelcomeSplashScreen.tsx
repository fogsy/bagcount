import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { colors, spacing } from './theme';

type Props = {
  onContinue: () => void;
};

export default function WelcomeSplashScreen({ onContinue }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <View style={styles.glow} pointerEvents="none" />

      <Text style={styles.brand}>{t('brand.name')}</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{t('welcome.eyebrow')}</Text>
      </View>

      <View style={styles.headlineBlock}>
        <Text style={styles.headline}>{t('welcome.line1')}</Text>
        <Text style={styles.headline}>{t('welcome.line2')}</Text>
        <Text style={[styles.headline, styles.headlineAccent]}>
          {t('welcome.line3')}
        </Text>
      </View>

      <Text style={styles.sub}>{t('welcome.sub')}</Text>

      <View style={styles.spacer} />

      <Pressable
        style={styles.cta}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={t('welcome.cta')}
      >
        <Text style={styles.ctaLabel}>{t('welcome.cta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  glow: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.accentMuted,
    opacity: 0.85,
  },
  brand: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  pillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headlineBlock: {
    gap: 2,
  },
  headline: {
    fontSize: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 46,
  },
  headlineAccent: {
    color: colors.accent,
  },
  sub: {
    marginTop: spacing.lg,
    maxWidth: 340,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  cta: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaLabel: {
    color: colors.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
