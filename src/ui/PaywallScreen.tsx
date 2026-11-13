import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { track } from '../services/analytics';
import {
  purchasePremium,
  restorePurchases,
} from '../services/premium';
import { colors, spacing } from './theme';

type Props = {
  onClose: () => void;
  onPurchased?: () => void;
};

export default function PaywallScreen({ onClose, onPurchased }: Props) {
  useEffect(() => {
    track('paywall_view');
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>PREMIUM</Text>
      <Text style={styles.title}>Train like fight camp</Text>
      <Text style={styles.body}>
        Unlock every drill, the full 30-day plan, and unlimited missions.
        Pad Cam pose tracking stays free.
      </Text>
      {[
        'All drills unlocked',
        'Full 30-day training plan',
        'Priority coach intensity presets',
      ].map((line) => (
        <Text key={line} style={styles.bullet}>
          ✓ {line}
        </Text>
      ))}

      <Pressable
        style={styles.primary}
        onPress={async () => {
          const ok = await purchasePremium();
          if (ok) {
            track('purchase_success');
            onPurchased?.();
            onClose();
          }
        }}
      >
        <Text style={styles.primaryLabel}>Start Premium</Text>
      </Pressable>
      <Pressable
        style={styles.secondary}
        onPress={async () => {
          await restorePurchases();
          onPurchased?.();
        }}
      >
        <Text style={styles.secondaryLabel}>Restore purchases</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onClose}>
        <Text style={styles.secondaryLabel}>Not now</Text>
      </Pressable>
      <StatusBar style="light" />
    </View>
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
  kicker: {
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  bullet: {
    color: colors.text,
    fontWeight: '600',
  },
  primary: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 16,
  },
  secondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
