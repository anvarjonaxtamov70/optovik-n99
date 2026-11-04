import { onIdTokenChanged, type User } from 'firebase/auth';
import { onValue, ref, set } from 'firebase/database';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { db } from '../../firebaseConfig';
import { auth, commerceEnabled } from '../lib/firebase';

export type CustomerProfile = { name: string; phone: string; address: string; car: string };
const emptyProfile: CustomerProfile = { name: '', phone: '', address: '', car: '' };
const AccountContext = createContext<{
  user: User | null; ready: boolean; admin: boolean; profile: CustomerProfile;
  balance: number; problem: string; saveProfile: (value: CustomerProfile) => Promise<void>;
} | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [remoteProfile, setProfile] = useState<{ uid: string; value: CustomerProfile } | null>(null);
  const [remoteBalance, setBalance] = useState<{ uid: string; value: number } | null>(null);
  const [remoteProblem, setProblem] = useState<{ uid: string; value: string } | null>(null);
  const uid = user?.uid;
  const profile = remoteProfile && remoteProfile.uid === uid ? remoteProfile.value : emptyProfile;
  const balance = remoteBalance && remoteBalance.uid === uid ? remoteBalance.value : 0;
  const problem = remoteProblem && remoteProblem.uid === uid ? remoteProblem.value : '';
  useEffect(() => onIdTokenChanged(auth, (next) => {
    setUser(next); setAdmin(false); setReady(true);
    if (next) void next.getIdTokenResult().then((t) => {
      if (auth.currentUser?.uid === next.uid) setAdmin(t.claims.admin === true);
    }).catch(() => {});
  }), []);
  useEffect(() => {
    if (!uid || !commerceEnabled) return;
    const failed = () => setProblem({ uid, value: 'Profilni yuklab bo‘lmadi. Internetni tekshiring.' });
    const offProfile = onValue(ref(db, 'customers/' + uid + '/profile'), (s) => {
      const p = s.val() ?? {};
      setProfile({ uid, value: Object.fromEntries(Object.keys(emptyProfile).map((k) => [k, typeof p[k] === 'string' ? p[k] : ''])) as CustomerProfile });
      setProblem({ uid, value: '' });
    }, failed);
    const offBalance = onValue(ref(db, 'customers/' + uid + '/balance'), (s) => setBalance({ uid, value: Number(s.val()) || 0 }), failed);
    return () => { offProfile(); offBalance(); };
  }, [uid]);
  async function saveProfile(value: CustomerProfile) {
    if (!user || !commerceEnabled) throw new Error('unavailable');
    await set(ref(db, 'customers/' + uid + '/profile'), value);
  }
  return <AccountContext.Provider value={{ user, ready, admin, profile, balance, problem, saveProfile }}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('AccountProvider is missing');
  return value;
}
