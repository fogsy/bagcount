import AsyncStorage from '@react-native-async-storage/async-storage';

import { SEED_DRILLS } from '../coach/seedDrills';
import type { Drill } from '../coach/drill';

const KEY = '@bagcount/premium/v1';
const FREE_DRILL_IDS = new Set(['jab-builder', 'cross-control']);
const FREE_PLAN_DAYS = 7;

export type PremiumState = {
  isPremium: boolean;
  /** Dev override when RevenueCat keys missing. */
  mockPremium: boolean;
};

const DEFAULT: PremiumState = { isPremium: false, mockPremium: false };

let cached: PremiumState = { ...DEFAULT };
let purchasesConfigured = false;

export async function loadPremiumState(): Promise<PremiumState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw != null) {
      cached = { ...DEFAULT, ...(JSON.parse(raw) as PremiumState) };
    }
  } catch {
    cached = { ...DEFAULT };
  }
  return { ...cached };
}

export async function savePremiumState(state: PremiumState): Promise<void> {
  cached = state;
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export function hasPremium(): boolean {
  return cached.isPremium || cached.mockPremium;
}

export async function initPurchases(): Promise<void> {
  await loadPremiumState();
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (apiKey == null || apiKey.length === 0) {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default as typeof import('react-native-purchases').default;
    Purchases.configure({ apiKey });
    purchasesConfigured = true;
    const info = await Purchases.getCustomerInfo();
    const active = Boolean(info.entitlements.active.premium);
    await savePremiumState({ ...cached, isPremium: active });
  } catch {
    purchasesConfigured = false;
  }
}

export async function purchasePremium(): Promise<boolean> {
  if (!purchasesConfigured) {
    await savePremiumState({ ...cached, mockPremium: true, isPremium: true });
    return true;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default as typeof import('react-native-purchases').default;
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages[0];
    if (pkg == null) {
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = Boolean(customerInfo.entitlements.active.premium);
    await savePremiumState({ ...cached, isPremium: active });
    return active;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!purchasesConfigured) {
    return hasPremium();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default as typeof import('react-native-purchases').default;
    const info = await Purchases.restorePurchases();
    const active = Boolean(info.entitlements.active.premium);
    await savePremiumState({ ...cached, isPremium: active });
    return active;
  } catch {
    return false;
  }
}

export function filterDrillsForTier(drills: Drill[] = SEED_DRILLS): Drill[] {
  if (hasPremium()) {
    return drills;
  }
  return drills.filter((d) => FREE_DRILL_IDS.has(d.id));
}

export function isDrillLocked(drillId: string): boolean {
  if (hasPremium()) {
    return false;
  }
  return !FREE_DRILL_IDS.has(drillId);
}

export function isPlanDayLocked(dayIndex: number): boolean {
  if (hasPremium()) {
    return false;
  }
  return dayIndex >= FREE_PLAN_DAYS;
}

export { FREE_PLAN_DAYS };
