import { EmailAuthProvider, linkWithCredential, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, app, readServerJson } from '../lib/firebase';
import { IS_WEB } from '../lib/platform';
import { readLocalStrict, saveLocal } from '../lib/storage';
import { accountStore, replaceCustomerProfile, emptyProfile } from './account';
import { resetDeliveryDraft } from './delivery';
import { withCustomerIdentityChange } from './orders';
import { maySwitchGuest, validAccountEmail, validAccountPassword } from '../domain/customerIdentity';

export const customerIdentityEnabled=!IS_WEB&&process.env.EXPO_PUBLIC_N99_ENV==='staging'&&app.options.projectId==='optovik-n99-staging';
function assertEnabled(){if(!customerIdentityEnabled)throw new Error('Unavailable');}
function requireCredentials(email:string,password:string){
  if(!validAccountEmail(email)||!validAccountPassword(password))throw new Error('Invalid credentials');
}
function publishIdentity(){
  const user=auth.currentUser;
  if(!user)return;
  accountStore.set(s=>s.uid===user.uid?{...s,anonymous:user.isAnonymous,email:user.email,emailVerified:user.emailVerified}:s);
}
export async function linkCustomerEmail(email:string,password:string){
  assertEnabled();requireCredentials(email,password);
  return withCustomerIdentityChange(async()=>{
    const user=auth.currentUser;
    if(!user?.isAnonymous)throw new Error('Guest required');
    const uid=user.uid;
    const result=await linkWithCredential(user,EmailAuthProvider.credential(email.trim(),password));
    if(result.user.uid!==uid||auth.currentUser?.uid!==uid)throw new Error('Account changed');
    publishIdentity();
    // Linking is already committed; a failed verification email must not claim link failure.
    try{await sendEmailVerification(result.user);return true;}catch{return false;}
  });
}
export async function signInCustomerEmail(email:string,password:string){
  assertEnabled();requireCredentials(email,password);
  return withCustomerIdentityChange(async()=>{
    const user=auth.currentUser;
    if(!user?.isAnonymous)throw new Error('Guest required');
    const uid=user.uid;
    const pending=await readLocalStrict(`pendingOrder:${uid}`);
    const orders=await readServerJson(`orders/${uid}`,uid);
    if(!maySwitchGuest(pending,orders))throw Object.assign(new Error('Guest history must be preserved'),{code:'guest-history'});
    if(auth.currentUser?.uid!==uid)throw new Error('Account changed');
    // Clear device contact/delivery before switching; no implicit guest-history merge.
    await saveLocal('profile',emptyProfile);
    accountStore.set(s=>({...s,profile:emptyProfile}));
    resetDeliveryDraft();
    const result=await signInWithEmailAndPassword(auth,email.trim(),password);
    await replaceCustomerProfile(result.user.uid);
    publishIdentity();
  });
}
export async function resendCustomerVerification(){
  assertEnabled();
  const user=auth.currentUser;
  if(!user||user.isAnonymous||!user.email)throw new Error('Account required');
  await sendEmailVerification(user);
}
export async function refreshCustomerVerification(){
  assertEnabled();
  const user=auth.currentUser;
  if(!user||user.isAnonymous)throw new Error('Account required');
  await reload(user);
  if(auth.currentUser?.uid!==user.uid)throw new Error('Account changed');
  publishIdentity();
  return user.emailVerified;
}
export async function resetCustomerPassword(email:string){
  assertEnabled();
  if(!validAccountEmail(email))throw new Error('Invalid email');
  await sendPasswordResetEmail(auth,email.trim());
}
