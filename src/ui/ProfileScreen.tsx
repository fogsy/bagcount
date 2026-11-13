import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CoachIntensity } from '../coach';
import {
  getHomeSnapshot,
  loadOnboarding,
  loadSessionStats,
  loadVoiceSettings,
  updateVoiceSettings,
} from '../data';
import { deriveFighterProfile } from '../domain/fighterProfile';
import { hasPremium, loadPremiumState } from '../services/premium';
import { Screen, SectionHeader } from './components';
import FighterCardView from './FighterCardView';
import { shareFighterCardCapture } from './shareFighterCard';
import { colors, radii } from './theme';

const INTENSITY_CYCLE: CoachIntensity[] = ['low', 'med', 'high'];

type Props = {
  onOpenPaywall?: () => void;
};

type ViewRef = ComponentRef<typeof View>;

export default function ProfileScreen({ onOpenPaywall }: Props) {
  const cardRef = useRef<ViewRef>(null);
  const [mute, setMute] = useState(false);
  const [intensity, setIntensity] = useState<CoachIntensity>('med');
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [premium, setPremium] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState(() =>
    deriveFighterProfile(
      {
        complete: false,
        goal: null,
        experience: null,
        dominantHand: null,
        stance: 'orthodox',
        displayName: 'Fighter',
        city: '',
        stanceTestPassed: false,
      },
      {
        drillsCompleted: 0,
        totalXpEarned: 0,
        byMove: {},
        lastDrillId: null,
        updatedAt: null,
      },
    ),
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadVoiceSettings(),
      getHomeSnapshot(),
      loadOnboarding(),
      loadSessionStats(),
      loadPremiumState(),
    ])
      .then(([voice, home, onboarding, stats]) => {
        if (cancelled) {
          return;
        }
        setMute(voice.mute);
        setIntensity(voice.coachIntensity);
        setLevel(home.progress.level);
        setXp(home.progress.totalXp);
        setStreak(home.progress.streakCount);
        setProfile(deriveFighterProfile(onboarding, stats));
        setPremium(hasPremium());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Screen>
      <SectionHeader eyebrow="FIGHTER" title="PROFILE" />
      <Text style={styles.subtitle}>Card · coach settings</Text>

      <View ref={cardRef} collapsable={false}>
        <FighterCardView
          profile={profile}
          level={level}
          streak={streak}
          totalXp={xp}
        />
      </View>

      <Pressable
        style={styles.button}
        onPress={async () => {
          const result = await shareFighterCardCapture(cardRef);
          setShareMsg(result.message);
        }}
      >
        <Text style={styles.buttonLabel}>Share fighter card</Text>
      </Pressable>
      {shareMsg != null ? <Text style={styles.meta}>{shareMsg}</Text> : null}

      <Pressable
        style={styles.button}
        onPress={async () => {
          const next = !mute;
          setMute(next);
          await updateVoiceSettings({ mute: next });
        }}
      >
        <Text style={styles.buttonLabel}>
          Voice coach: {mute ? 'Muted' : 'On'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={async () => {
          const idx = INTENSITY_CYCLE.indexOf(intensity);
          const next = INTENSITY_CYCLE[(idx + 1) % INTENSITY_CYCLE.length]!;
          setIntensity(next);
          await updateVoiceSettings({ coachIntensity: next });
        }}
      >
        <Text style={styles.buttonLabel}>Coach intensity: {intensity}</Text>
      </Pressable>

      <Pressable style={styles.premiumBtn} onPress={onOpenPaywall}>
        <Text style={styles.premiumLabel}>
          {premium ? 'Premium active' : 'Upgrade to Premium'}
        </Text>
      </Pressable>

      <StatusBar style="light" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: -8,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  premiumBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  premiumLabel: {
    color: colors.onAccent,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  meta: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
