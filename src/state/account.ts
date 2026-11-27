import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { onValue, ref, set } from 'firebase/database';

import { isValidLatLng, roundCoord } from '../domain/geo';
import { IS_WEB, WEB_ADMIN_ONLY } from '../lib/platform';

import { app, auth, classifyError, db, readServerJson, withTimeout, type FirebaseProblem } from '../lib/firebase';
import { createStore, useStore } from '../lib/store';
import { readLocal, saveLocal } from '../lib/storage';
import { candidateRequest,usesFirestoreCandidate } from '../lib/orderBackend';
import { candidateAck } from '../lib/candidateData';
import { ownedProfile } from '../domain/customerIdentity';
import { resetDeliveryDraft } from './delivery';

/** Mijoz ma'lumotlari: keyingi buyurtmada manzil (xaritadagi nuqta bilan) qayta yozilmaydi. */
export type Profile = { name: string; phone: string; address: string; apartment: string; landmark: string; lat: number | null; lng: number | null };
export const emptyProfile: Profile = { name: '', phone: '', address: '', apartment: '', landmark: '', lat: null, lng: null };

export type AccountState = {
  ready: boolean;
  uid: string | null;
  anonymous: boolean;
  email: string | null;
  emailVerified: boolean;
  admin: boolean;
  /** admins/{uid} tekshirib bo'lindi (admin ekranida "yuklanmoqda" va "ruxsat yo'q" ni ajratish uchun). */
  adminChecked: boolean;
  profile: Profile;
  problem: FirebaseProblem | null;
};

export const accountStore = createStore<AccountState>({
  ready: false, uid: null, anonymous: true, email: null, emailVerified: false, admin: false, adminChecked: false, profile: emptyProfile, problem: null,
});

let started = false;
let pending: Promise<string> | null = null;
let offAdmin: (() => void) | null = null;
const scopedProfile = !IS_WEB && process.env.EXPO_PUBLIC_N99_ENV === 'staging' && app.options.projectId === 'optovik-n99-staging';
let profileRevision=0;

function readProfile(v: unknown): Profile {
  const p = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const s = (k: keyof Profile, max: number) => (typeof p[k] === 'string' ? (p[k] as string).slice(0, max) : '');
  const point = isValidLatLng(p) ? { lat: roundCoord(p.lat), lng: roundCoord(p.lng) } : { lat: null, lng: null };
  return {
    name: s('name', 80), phone: /^\+998\d{9}$/.test(String(p.phone ?? '')) ? String(p.phone) : '',
    address: s('address', 200), apartment: s('apartment', 80), landmark: s('landmark', 200), ...point,
  };
}

export async function startAccount() {
  if (started) return;
  started = true;
  if(!scopedProfile){
    const local = await readLocal('profile');
    accountStore.set((s) => ({ ...s, profile: readProfile(local) }));
  }else{
    // Old staging profile has no owner. Never guess which customer owns it.
    await saveLocal('profile',null).catch(()=>{});
  }
  onAuthStateChanged(auth, (user) => {
    offAdmin?.();
    offAdmin = null;
    const changed=accountStore.get().uid!==(user?.uid??null);
    if(scopedProfile&&changed){profileRevision++;resetDeliveryDraft();}
    accountStore.set((s) => ({
      ...s, ready: true, uid: user?.uid ?? null, anonymous: user?.isAnonymous ?? true, email: user?.email ?? null, emailVerified: user?.emailVerified ?? false, admin: false,
      adminChecked: !user || user.isAnonymous, problem: user ? null : s.problem,
      ...(scopedProfile&&changed?{profile:emptyProfile}:{}),
    }));
    if(scopedProfile&&changed&&user)void hydrateOwnedProfile(user.uid);
    if (user && !user.isAnonymous) {
      if(usesFirestoreCandidate){
        let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
        const refresh=async()=>{try{const role=await candidateRequest<{admin:boolean}>('/v1/account/role',{},user.uid);if(!stopped)accountStore.set(s=>s.uid===user.uid?{...s,admin:role.admin===true,adminChecked:true}:s);}catch{if(!stopped)accountStore.set(s=>s.uid===user.uid?{...s,admin:false,adminChecked:true}:s);}finally{if(!stopped)timer=setTimeout(()=>{void refresh();},60000);}};
        offAdmin=()=>{stopped=true;if(timer!==undefined)clearTimeout(timer);};void refresh();
      }else offAdmin = onValue(ref(db, `admins/${user.uid}`), (snap) => {
        accountStore.set((s) => (s.uid === user.uid ? { ...s, admin: snap.val() === true, adminChecked: true } : s));
      }, () => accountStore.set((s) => s.uid===user.uid?{ ...s, admin: false, adminChecked: true }:s));
    }
    // Brauzer — faqat admin paneli: mijoz uchun anonim hisob ochilmaydi.
    if (!user && !WEB_ADMIN_ONLY) void ensureCustomer().catch(() => {});
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

export async function saveProfile(profile: Profile, expectedUid=auth.currentUser?.uid) {
  const uid = auth.currentUser?.uid;
  if(uid!==expectedUid||(scopedProfile&&!uid))throw new Error('Account changed');
  profileRevision++;
  const clean = readProfile(profile);
  accountStore.set((s) => ({ ...s, profile: clean }));
  await saveLocal(scopedProfile?'ownedProfile':'profile', scopedProfile?{uid,profile:clean}:clean).catch(() => {});
  if (uid && auth.currentUser?.uid === uid && clean.name.trim().length >= 2 && clean.phone) {
    // Bazada bo'sh nuqta saqlanmaydi (qoidalar raqam kutadi).
    const { lat, lng, ...rest } = clean;
    const body = { ...rest, ...(lat != null && lng != null ? { lat, lng } : {}), updatedAt: Date.now() };
    if(usesFirestoreCandidate){const {updatedAt: _updatedAt,...profileBody}=body;await candidateAck('/v1/profile/save',profileBody,uid);}
    else await withTimeout(set(ref(db, `customers/${uid}/profile`), body), 8000).catch(() => {});
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

/** Account changes and newer edits invalidate stale reads. */
async function hydrateOwnedProfile(uid:string){
  const revision=++profileRevision;
  const active=()=>auth.currentUser?.uid===uid&&profileRevision===revision;
  const cached=ownedProfile(await readLocal('ownedProfile'),uid);
  if(!active())return;
  if(cached)accountStore.set(s=>({...s,profile:readProfile(cached)}));
  try{
    const raw=usesFirestoreCandidate?(await candidateRequest<{profile:unknown}>('/v1/profile/get',{},uid)).profile:await readServerJson(`customers/${uid}/profile`,uid);
    if(!active()||raw===null)return;
    const clean=readProfile(raw);
    accountStore.set(s=>({...s,profile:clean}));
    await saveLocal('ownedProfile',{uid,profile:clean});
  }catch{/* Keep only the matching local cache when offline. */}
}
export async function replaceCustomerProfile(uid:string){
  if(auth.currentUser?.uid!==uid)throw new Error('Account changed');
  if(scopedProfile)await hydrateOwnedProfile(uid);
}
export async function clearCustomerProfile(){
  profileRevision++;
  accountStore.set(s=>({...s,profile:emptyProfile}));
  resetDeliveryDraft();
  await saveLocal('ownedProfile',null);
}
