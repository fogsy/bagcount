import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  loadOnboarding,
  loadWelcomeSeen,
  markWelcomeSeen,
} from '../data/onboardingRepo';
import '../i18n';
import { initCrashReporting } from '../services/crash';
import { initPurchases } from '../services/premium';
import MainTabs from './MainTabs';
import OnboardingFlow from './onboarding/OnboardingFlow';
import WelcomeSplashScreen from './WelcomeSplashScreen';
import { colors } from './theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Gate = 'loading' | 'welcome' | 'onboarding' | 'main';

export default function RootApp() {
  const [gate, setGate] = useState<Gate>('loading');

  useEffect(() => {
    initCrashReporting();
    let cancelled = false;
    (async () => {
      await initPurchases();
      const [welcomeSeen, onboarding] = await Promise.all([
        loadWelcomeSeen(),
        loadOnboarding(),
      ]);
      if (cancelled) {
        return;
      }
      if (!welcomeSeen) {
        setGate('welcome');
      } else if (!onboarding.complete) {
        setGate('onboarding');
      } else {
        setGate('main');
      }
      SplashScreen.hideAsync().catch(() => {});
    })().catch(() => {
      if (!cancelled) {
        setGate('welcome');
        SplashScreen.hideAsync().catch(() => {});
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const body =
    gate === 'loading' ? (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    ) : gate === 'welcome' ? (
      <>
        <WelcomeSplashScreen
          onContinue={() => {
            markWelcomeSeen().catch(() => {});
            loadOnboarding()
              .then((onboarding) => {
                setGate(onboarding.complete ? 'main' : 'onboarding');
              })
              .catch(() => setGate('onboarding'));
          }}
        />
        <StatusBar style="light" />
      </>
    ) : gate === 'onboarding' ? (
      <>
        <OnboardingFlow onFinished={() => setGate('main')} />
        <StatusBar style="light" />
      </>
    ) : (
      <MainTabs />
    );

  return <SafeAreaProvider>{body}</SafeAreaProvider>;
}
