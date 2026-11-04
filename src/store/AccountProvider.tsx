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
  const [profile, setProfile] = useState(emptyProfile);
  const [balance, setBalance] = useState(0);
  const [problem, setProblem] = useState('');
  useEffect(() => onIdTokenChanged(auth, (next) => {
    setUser(next); setAdmin(false); setReady(true);
    if (next) void next.getIdTokenResult().then((t) => {
      if (auth.currentUser?.uid === next.uid) setAdmin(t.claims.admin === true);
    }).catch(() => {});
  }), []);
  useEffect(() => {
    setProfile(emptyProfile); setBalance(0); setProblem('');
    if (!user || !commerceEnabled) return;
    const failed = () => setProblem('Profilni yuklab bo‘lmadi. Internetni tekshiring.');
    const offProfile = onValue(ref(db, 'customers/' + user.uid + '/profile'), (s) => {
      const p = s.val() ?? {};
      setProfile(Object.fromEntries(Object.keys(emptyProfile).map((k) => [k, typeof p[k] === 'string' ? p[k] : ''])) as CustomerProfile);
      setProblem('');
    }, failed);
    const offBalance = onValue(ref(db, 'customers/' + user.uid + '/balance'), (s) => setBalance(Number(s.val()) || 0), failed);
    return () => { offProfile(); offBalance(); };
  }, [user]);
  async function saveProfile(value: CustomerProfile) {
    if (!user || !commerceEnabled) throw new Error('unavailable');
    await set(ref(db, 'customers/' + user.uid + '/profile'), value);
  }
  return <AccountContext.Provider value={{ user, ready, admin, profile, balance, problem, saveProfile }}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('AccountProvider is missing');
  return value;
}
