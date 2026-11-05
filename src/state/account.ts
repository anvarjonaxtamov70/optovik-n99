import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { onValue, ref, set } from 'firebase/database';

import { auth, classifyError, db, withTimeout, type FirebaseProblem } from '../lib/firebase';
import { createStore, useStore } from '../lib/store';
import { readLocal, saveLocal } from '../lib/storage';

export type Profile = { name: string; phone: string; address: string; landmark: string };
export const emptyProfile: Profile = { name: '', phone: '', address: '', landmark: '' };

export type AccountState = {
  ready: boolean;
  uid: string | null;
  anonymous: boolean;
  email: string | null;
  admin: boolean;
  /** admins/{uid} tekshirib bo'lindi (admin ekranida "yuklanmoqda" va "ruxsat yo'q" ni ajratish uchun). */
  adminChecked: boolean;
  profile: Profile;
  problem: FirebaseProblem | null;
};

export const accountStore = createStore<AccountState>({
  ready: false, uid: null, anonymous: true, email: null, admin: false, adminChecked: false, profile: emptyProfile, problem: null,
});

let started = false;
let pending: Promise<string> | null = null;
let offAdmin: (() => void) | null = null;

function readProfile(v: unknown): Profile {
  const p = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const s = (k: keyof Profile, max: number) => (typeof p[k] === 'string' ? (p[k] as string).slice(0, max) : '');
  return { name: s('name', 80), phone: /^\+998\d{9}$/.test(String(p.phone ?? '')) ? String(p.phone) : '', address: s('address', 300), landmark: s('landmark', 200) };
}

export async function startAccount() {
  if (started) return;
  started = true;
  const local = await readLocal('profile');
  accountStore.set((s) => ({ ...s, profile: readProfile(local) }));
  onAuthStateChanged(auth, (user) => {
    offAdmin?.();
    offAdmin = null;
    accountStore.set((s) => ({
      ...s, ready: true, uid: user?.uid ?? null, anonymous: user?.isAnonymous ?? true, email: user?.email ?? null, admin: false,
      adminChecked: !user || user.isAnonymous, problem: user ? null : s.problem,
    }));
    if (user && !user.isAnonymous) {
      offAdmin = onValue(ref(db, `admins/${user.uid}`), (snap) => {
        accountStore.set((s) => (s.uid === user.uid ? { ...s, admin: snap.val() === true, adminChecked: true } : s));
      }, () => accountStore.set((s) => ({ ...s, admin: false, adminChecked: true })));
    }
    if (!user) void ensureCustomer().catch(() => {});
  });
}

/** Mijoz uchun Firebase hisobini tayyorlaydi (anonim). Buyurtma va tarix shu UID ga bog'lanadi. */
export function ensureCustomer(): Promise<string> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
  if (pending) return pending;
  pending = withTimeout(signInAnonymously(auth), 15000)
    .then((cred) => {
      accountStore.set((s) => ({ ...s, problem: null }));
      return cred.user.uid;
    })
    .catch((e) => {
      accountStore.set((s) => ({ ...s, ready: true, problem: classifyError(e) }));
      throw e;
    })
    .finally(() => { pending = null; });
  return pending;
}

export async function saveProfile(profile: Profile) {
  const clean = readProfile(profile);
  accountStore.set((s) => ({ ...s, profile: clean }));
  await saveLocal('profile', clean).catch(() => {});
  const uid = auth.currentUser?.uid;
  if (uid && clean.name.trim().length >= 2 && clean.phone) {
    await withTimeout(set(ref(db, `customers/${uid}/profile`), { ...clean, updatedAt: Date.now() }), 8000).catch(() => {});
  }
}

export async function adminSignIn(email: string, password: string) {
  await withTimeout(signInWithEmailAndPassword(auth, email.trim(), password), 20000);
}

export async function adminSignOut() {
  await signOut(auth);
}

export const useAccount = () => useStore(accountStore, (s) => s);
export const useProfile = () => useStore(accountStore, (s) => s.profile);
export const useIsAdmin = () => useStore(accountStore, (s) => s.admin);
export const useUid = () => useStore(accountStore, (s) => s.uid);
