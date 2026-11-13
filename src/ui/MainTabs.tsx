import { StatusBar } from 'expo-status-bar';
import { useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n';
import DrillsScreen from './DrillsScreen';
import HomeTabScreen from './HomeTabScreen';
import LeagueScreen from './LeagueScreen';
import PadCamScreen from './PadCamScreen';
import PaywallScreen from './PaywallScreen';
import ProfileScreen from './ProfileScreen';
import {
  DrillsTabIcon,
  GloveFabIcon,
  HomeTabIcon,
  LeagueTabIcon,
  ProfileTabIcon,
} from './tabIcons';
import { colors, spacing } from './theme';

type TabId = 'home' | 'league' | 'drills' | 'profile';

type TabIcon = ComponentType<{ color: string; size?: number }>;

const TABS: { id: TabId; labelKey: string; Icon: TabIcon }[] = [
  { id: 'home', labelKey: 'tabs.home', Icon: HomeTabIcon },
  { id: 'league', labelKey: 'tabs.league', Icon: LeagueTabIcon },
  { id: 'drills', labelKey: 'tabs.drills', Icon: DrillsTabIcon },
  { id: 'profile', labelKey: 'tabs.profile', Icon: ProfileTabIcon },
];

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>('home');
  const [fullscreen, setFullscreen] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [padCam, setPadCam] = useState(false);

  if (paywall) {
    return (
      <PaywallScreen
        onClose={() => setPaywall(false)}
        onPurchased={() => setPaywall(false)}
      />
    );
  }

  if (padCam) {
    return <PadCamScreen onBack={() => setPadCam(false)} />;
  }

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {tab === 'home' ? (
          <HomeTabScreen
            onFullscreenChange={setFullscreen}
            onOpenPaywall={() => setPaywall(true)}
            onOpenPadCam={() => setPadCam(true)}
          />
        ) : null}
        {tab === 'drills' ? (
          <DrillsScreen
            onFullscreenChange={setFullscreen}
            onOpenPaywall={() => setPaywall(true)}
          />
        ) : null}
        {tab === 'league' ? <LeagueScreen /> : null}
        {tab === 'profile' ? (
          <ProfileScreen onOpenPaywall={() => setPaywall(true)} />
        ) : null}
      </View>

      {fullscreen ? null : (
        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          {left.map((item) => {
            const selected = item.id === tab;
            const color = selected ? colors.accent : colors.textMuted;
            return (
              <Pressable
                key={item.id}
                style={styles.tabItem}
                onPress={() => setTab(item.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <item.Icon color={color} />
                <Text
                  style={[styles.tabLabel, selected && styles.tabLabelSelected]}
                >
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.fabSlot}>
            <Pressable
              style={styles.fab}
              onPress={() => setPadCam(true)}
              accessibilityRole="button"
              accessibilityLabel="Pad Cam"
            >
              <GloveFabIcon color="#ffffff" size={28} />
            </Pressable>
          </View>

          {right.map((item) => {
            const selected = item.id === tab;
            const color = selected ? colors.accent : colors.textMuted;
            return (
              <Pressable
                key={item.id}
                style={styles.tabItem}
                onPress={() => setTab(item.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <item.Icon color={color} />
                <Text
                  style={[styles.tabLabel, selected && styles.tabLabelSelected]}
                >
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(10,10,10,0.96)',
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tabLabelSelected: {
    color: colors.accent,
  },
  fabSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
