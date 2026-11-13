import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  signInAnonymously,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

export type LeagueScore = {
  uid: string;
  displayName: string;
  city: string;
  xp: number;
  score: number;
  updatedAt: string;
};

export type LeagueUserProfile = {
  uid: string;
  displayName: string;
  city: string;
  inviteCode: string;
  friends: string[];
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

function firebaseConfigFromEnv() {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = firebaseConfigFromEnv();
  return cfg.apiKey.length > 0 && cfg.projectId.length > 0;
}

function getRnPersistence(): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@firebase/auth/dist/rn/index.js');
    return mod.getReactNativePersistence?.(AsyncStorage);
  } catch {
    return null;
  }
}

export function getFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
} | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (app == null) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfigFromEnv());
    try {
      const persistence = getRnPersistence();
      auth =
        persistence != null
          ? initializeAuth(app, { persistence: persistence as never })
          : getAuth(app);
    } catch {
      auth = getAuth(app);
    }
    db = getFirestore(app);
    functions = getFunctions(app);
  }
  return { app, auth: auth!, db: db!, functions: functions! };
}

export function currentWeekId(date = new Date()): string {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function makeInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function ensureAnonymousUser(): Promise<User | null> {
  const fb = getFirebase();
  if (fb == null) {
    return null;
  }
  if (fb.auth.currentUser != null) {
    return fb.auth.currentUser;
  }
  const cred = await signInAnonymously(fb.auth);
  return cred.user;
}

export async function upsertUserProfile(input: {
  displayName: string;
  city: string;
}): Promise<LeagueUserProfile | null> {
  const fb = getFirebase();
  const user = await ensureAnonymousUser();
  if (fb == null || user == null) {
    return null;
  }
  const ref = doc(fb.db, 'users', user.uid);
  const existing = await getDoc(ref);
  const prev = existing.exists()
    ? (existing.data() as LeagueUserProfile)
    : null;
  const profile: LeagueUserProfile = {
    uid: user.uid,
    displayName: input.displayName || prev?.displayName || 'Fighter',
    city: input.city || prev?.city || 'Unknown',
    inviteCode: prev?.inviteCode ?? makeInviteCode(),
    friends: prev?.friends ?? [],
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}

export async function linkGoogleIdToken(idToken: string): Promise<User | null> {
  const fb = getFirebase();
  if (fb == null) {
    return null;
  }
  const credential = GoogleAuthProvider.credential(idToken);
  if (fb.auth.currentUser != null) {
    const linked = await linkWithCredential(fb.auth.currentUser, credential);
    return linked.user;
  }
  const signed = await signInWithCredential(fb.auth, credential);
  return signed.user;
}

/** Placeholder Google sign-in — wire GoogleSignin native module in a dev build. */
export async function signInWithGooglePlaceholder(): Promise<{
  ok: boolean;
  message: string;
}> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (webClientId == null || webClientId.length === 0) {
    await ensureAnonymousUser();
    return {
      ok: true,
      message: 'Signed in anonymously (Google client id not configured).',
    };
  }
  return {
    ok: false,
    message:
      'Google Sign-In native module not linked yet. Anonymous auth is active.',
  };
}

export async function fetchLeaderboard(options: {
  scope: 'global' | 'city' | 'friends';
  city?: string;
  friendUids?: string[];
  take?: number;
}): Promise<LeagueScore[]> {
  const fb = getFirebase();
  if (fb == null) {
    return mockLeaderboard(options.scope);
  }
  const week = currentWeekId();
  const col = collection(fb.db, 'weeks', week, 'scores');
  const take = options.take ?? 50;
  let q = query(col, orderBy('score', 'desc'), limit(take));
  if (options.scope === 'city' && options.city) {
    q = query(
      col,
      where('city', '==', options.city),
      orderBy('score', 'desc'),
      limit(take),
    );
  }
  const snap = await getDocs(q);
  let rows = snap.docs.map((d) => d.data() as LeagueScore);
  if (options.scope === 'friends' && options.friendUids != null) {
    const set = new Set(options.friendUids);
    rows = rows.filter((r) => set.has(r.uid));
  }
  return rows;
}

export async function submitWeeklyScore(input: {
  xp: number;
  score: number;
  city: string;
  displayName: string;
}): Promise<{ ok: boolean; message: string }> {
  const fb = getFirebase();
  if (fb == null) {
    return {
      ok: true,
      message: 'Submitted locally (Firebase not configured).',
    };
  }
  await ensureAnonymousUser();
  try {
    const callable = httpsCallable(fb.functions, 'submitScore');
    await callable({
      xp: input.xp,
      score: input.score,
      city: input.city,
      displayName: input.displayName,
      weekId: currentWeekId(),
    });
    return { ok: true, message: 'Score submitted.' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Submit failed',
    };
  }
}

export async function addFriendByInviteCode(
  code: string,
): Promise<{ ok: boolean; message: string }> {
  const fb = getFirebase();
  const user = await ensureAnonymousUser();
  if (fb == null || user == null) {
    return { ok: false, message: 'Firebase not configured' };
  }
  const q = query(
    collection(fb.db, 'users'),
    where('inviteCode', '==', code.toUpperCase()),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    return { ok: false, message: 'Invite code not found' };
  }
  const friend = snap.docs[0]!.data() as LeagueUserProfile;
  if (friend.uid === user.uid) {
    return { ok: false, message: 'That is your own code' };
  }
  const meRef = doc(fb.db, 'users', user.uid);
  const meSnap = await getDoc(meRef);
  const me = (meSnap.data() as LeagueUserProfile | undefined) ?? {
    uid: user.uid,
    displayName: 'Fighter',
    city: 'Unknown',
    inviteCode: makeInviteCode(),
    friends: [],
  };
  if (!me.friends.includes(friend.uid)) {
    me.friends = [...me.friends, friend.uid];
    await setDoc(meRef, me, { merge: true });
  }
  return { ok: true, message: `Added ${friend.displayName}` };
}

function mockLeaderboard(scope: string): LeagueScore[] {
  return [
    {
      uid: 'mock1',
      displayName: 'Ring Ghost',
      city: 'NYC',
      xp: 1200,
      score: 98,
      updatedAt: new Date().toISOString(),
    },
    {
      uid: 'mock2',
      displayName: 'Southpaw Sam',
      city: 'LA',
      xp: 900,
      score: 88,
      updatedAt: new Date().toISOString(),
    },
    {
      uid: 'you',
      displayName: 'You',
      city: scope === 'city' ? 'Your City' : 'Global',
      xp: 400,
      score: 70,
      updatedAt: new Date().toISOString(),
    },
  ];
}
