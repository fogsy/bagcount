import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loadOnboarding } from '../data/onboardingRepo';
import { loadProgress } from '../data/progressRepo';
import { track } from '../services/analytics';
import {
  addFriendByInviteCode,
  currentWeekId,
  ensureAnonymousUser,
  fetchLeaderboard,
  isFirebaseConfigured,
  signInWithGooglePlaceholder,
  submitWeeklyScore,
  upsertUserProfile,
  type LeagueScore,
  type LeagueUserProfile,
} from '../services/firebase';
import {
  PrimaryButton,
  Screen,
  SectionHeader,
  SegmentedControl,
} from './components';
import { colors, radii, spacing, typography } from './theme';

type Tab = 'city' | 'friends' | 'global';

const AVATAR_COLORS = [
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#16a34a',
  '#d97706',
  '#db2777',
];

export default function LeagueScreen() {
  const [tab, setTab] = useState<Tab>('city');
  const [rows, setRows] = useState<LeagueScore[]>([]);
  const [profile, setProfile] = useState<LeagueUserProfile | null>(null);
  const [city, setCity] = useState('YOUR CITY');
  const [status, setStatus] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [loading, setLoading] = useState(false);

  const countdown = useMemo(() => weekCountdownLabel(), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const onboarding = await loadOnboarding();
      await ensureAnonymousUser();
      const me = await upsertUserProfile({
        displayName: onboarding.displayName,
        city: onboarding.city || 'Unknown',
      });
      setProfile(me);
      setCity((me?.city || onboarding.city || 'YOUR CITY').toUpperCase());
      const board = await fetchLeaderboard({
        scope: tab,
        city: me?.city ?? onboarding.city,
        friendUids: me?.friends,
      });
      setRows(board);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const onboarding = await loadOnboarding();
        await ensureAnonymousUser();
        const me = await upsertUserProfile({
          displayName: onboarding.displayName,
          city: onboarding.city || 'Unknown',
        });
        if (cancelled) {
          return;
        }
        setProfile(me);
        setCity((me?.city || onboarding.city || 'YOUR CITY').toUpperCase());
        const board = await fetchLeaderboard({
          scope: tab,
          city: me?.city ?? onboarding.city,
          friendUids: me?.friends,
        });
        if (!cancelled) {
          setRows(board);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })().catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <Screen>
      <View style={styles.titleRow}>
        <SectionHeader eyebrow="WEEKLY LEAGUE" title={city} />
        <View style={styles.timerChip}>
          <Text style={styles.timerText}>{countdown}</Text>
        </View>
      </View>
      <Text style={styles.weekMeta}>
        Week {currentWeekId()}
        {!isFirebaseConfigured() ? ' · demo board' : ''}
      </Text>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { id: 'city', label: 'My City' },
          { id: 'friends', label: 'Friends' },
          { id: 'global', label: 'Worldwide' },
        ]}
      />

      {profile != null ? (
        <Text style={styles.invite}>Your invite: {profile.inviteCode}</Text>
      ) : null}

      <View style={styles.friendRow}>
        <TextInput
          style={styles.input}
          value={inviteInput}
          onChangeText={setInviteInput}
          placeholder="Friend invite code"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
        <Pressable
          style={styles.smallBtn}
          onPress={async () => {
            const result = await addFriendByInviteCode(inviteInput.trim());
            setStatus(result.message);
            if (result.ok) {
              await refresh();
            }
          }}
        >
          <Text style={styles.smallBtnLabel}>Add</Text>
        </Pressable>
      </View>

      <PrimaryButton
        label="Submit this week"
        onPress={async () => {
          const progress = await loadProgress();
          const onboarding = await loadOnboarding();
          const result = await submitWeeklyScore({
            xp: progress.totalXp,
            score: Math.min(100, progress.level * 10 + progress.streakCount),
            city: onboarding.city || 'Unknown',
            displayName: onboarding.displayName,
          });
          track('league_submit', { ok: result.ok });
          setStatus(result.message);
          await refresh();
        }}
      />

      <Pressable
        style={styles.secondary}
        onPress={async () => {
          const result = await signInWithGooglePlaceholder();
          setStatus(result.message);
        }}
      >
        <Text style={styles.secondaryLabel}>Google sign-in</Text>
      </Pressable>

      {status != null ? <Text style={styles.status}>{status}</Text> : null}
      {loading ? <Text style={styles.status}>Loading…</Text> : null}

      <View style={styles.boardHeader}>
        <Text style={styles.boardHeaderText}>LEADERBOARD</Text>
        <Text style={styles.boardHeaderText}>Weekly XP</Text>
      </View>

      {rows.map((row, index) => {
        const rankColor = index < 3 ? colors.gold : colors.textMuted;
        const avatar = AVATAR_COLORS[index % AVATAR_COLORS.length]!;
        return (
          <View key={`${row.uid}-${index}`} style={styles.row}>
            <Text style={[styles.rank, { color: rankColor }]}>#{index + 1}</Text>
            <View style={[styles.avatar, { backgroundColor: avatar }]}>
              <Text style={styles.avatarText}>
                {row.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{row.displayName}</Text>
              <Text style={styles.rowMeta}>this week</Text>
            </View>
            <Text style={styles.rowScore}>{row.xp}</Text>
          </View>
        );
      })}
      <StatusBar style="light" />
    </Screen>
  );
}

function weekCountdownLabel(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const daysToSunday = (7 - day) % 7;
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysToSunday,
      23,
      59,
      59,
    ),
  );
  const ms = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return `${days}d ${hours}h`;
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  timerChip: {
    marginTop: 18,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timerText: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 12,
  },
  weekMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -8,
  },
  invite: { color: colors.accent, fontWeight: '700' },
  friendRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  smallBtnLabel: { color: colors.onAccent, fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: { color: colors.text, fontWeight: '600' },
  status: { color: colors.textSecondary, textAlign: 'center' },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  boardHeaderText: {
    ...typography.eyebrow,
    color: colors.textMuted,
    fontSize: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rank: { fontWeight: '800', width: 36 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800' },
  rowBody: { flex: 1 },
  rowName: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.textMuted, fontSize: 12 },
  rowScore: { color: colors.text, fontWeight: '800', fontSize: 18 },
});
