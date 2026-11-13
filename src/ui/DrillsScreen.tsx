import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SEED_DRILLS, type Drill, type DrillResults } from '../coach';
import { applyDrillResults } from '../data';
import { t } from '../i18n';
import { track } from '../services/analytics';
import { isDrillLocked } from '../services/premium';
import { PrimaryButton, Screen, SectionHeader } from './components';
import DrillResultsScreen from './DrillResultsScreen';
import DrillSessionScreen from './DrillSessionScreen';
import { BoltIcon } from './tabIcons';
import { colors, radii, spacing } from './theme';

type Props = {
  onFullscreenChange?: (fullscreen: boolean) => void;
  onOpenPaywall?: () => void;
};

type Mode =
  | { kind: 'catalog' }
  | { kind: 'session'; drill: Drill }
  | { kind: 'results'; results: DrillResults };

const THUMBS: ImageSourcePropType[] = [
  require('../../assets/ui/drill-jab.jpg'),
  require('../../assets/ui/drill-cross.jpg'),
  require('../../assets/ui/drill-combo.jpg'),
  require('../../assets/ui/drill-speed.jpg'),
];

export default function DrillsScreen({
  onFullscreenChange,
  onOpenPaywall,
}: Props) {
  const [mode, setMode] = useState<Mode>({ kind: 'catalog' });

  const setModeAndFullscreen = useCallback(
    (next: Mode) => {
      setMode(next);
      onFullscreenChange?.(next.kind !== 'catalog');
    },
    [onFullscreenChange],
  );

  if (mode.kind === 'session') {
    return (
      <DrillSessionScreen
        drill={mode.drill}
        onCancel={() => setModeAndFullscreen({ kind: 'catalog' })}
        onComplete={async (results) => {
          track('drill_complete', {
            drillId: results.drillId,
            score: results.score,
          });
          await applyDrillResults(results);
          setModeAndFullscreen({ kind: 'results', results });
        }}
      />
    );
  }

  if (mode.kind === 'results') {
    return (
      <DrillResultsScreen
        results={mode.results}
        onDone={() => setModeAndFullscreen({ kind: 'catalog' })}
      />
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <SectionHeader eyebrow="PRACTICE" title="DRILLS" />
        <View style={styles.xpChip}>
          <BoltIcon size={12} />
          <Text style={styles.xpChipText}>+5% XP</Text>
        </View>
      </View>

      {SEED_DRILLS.map((drill, index) => {
        const locked = isDrillLocked(drill.id);
        const thumb = THUMBS[index % THUMBS.length]!;
        return (
          <View
            key={drill.id}
            style={[styles.card, locked && styles.cardLocked]}
          >
            <View style={styles.cardTop}>
              <Image source={thumb} style={styles.thumb} resizeMode="cover" />
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{drill.name}</Text>
                <Text style={styles.cardMeta}>
                  {Math.max(1, Math.round(drill.durationSec / 60))} min ·{' '}
                  {locked ? t('drills.locked') : drill.difficulty}
                </Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {drill.description}
                </Text>
              </View>
            </View>
            <PrimaryButton
              label={locked ? t('drills.locked') : '▶ PRACTICE'}
              onPress={() => {
                if (locked) {
                  onOpenPaywall?.();
                  return;
                }
                track('drill_start', { drillId: drill.id });
                setModeAndFullscreen({ kind: 'session', drill });
              }}
            />
          </View>
        );
      })}
      <StatusBar style="light" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.goldMuted,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 18,
  },
  xpChipText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardLocked: {
    opacity: 0.75,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
