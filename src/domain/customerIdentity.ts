export function validAccountEmail(value:string):boolean {
  const email=value.trim();
  return email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function validAccountPassword(value:string):boolean {
  return value.length>=8 && value.length<=128;
}
/** Do not interpret malformed or unavailable order state as an empty guest history. */
export function maySwitchGuest(pending:unknown,orders:unknown):boolean {
  return pending===null && (orders===null || (!!orders && typeof orders==='object' && !Array.isArray(orders) && Object.keys(orders).length===0));
}

/** A shared device cache is only readable by its recorded owner. Legacy unowned data is ignored. */
export function ownedProfile(raw:unknown,uid:string):unknown {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const entry=raw as Record<string,unknown>;
  return entry.uid===uid&&entry.profile&&typeof entry.profile==='object'&&!Array.isArray(entry.profile)?entry.profile:null;
}
export function maySignOutCustomer(verified:boolean,pending:unknown):boolean {
  return verified===true&&pending===null;
}

/** Only fixed error categories; never expose Firebase messages, credentials or account identifiers. */
export function identityErrorKey(error:unknown,mode:'link'|'login'|'resend'|'refresh'|'reset'|'logout'|'changeEmail'){
 const code=(error as {code?:unknown}|null)?.code;
 if(code==='guest-history')return 'identity.guestHistory';
 if(code==='signout-blocked')return 'identity.logoutBlocked';
 if(code==='auth/invalid-email')return 'identity.invalidEmail';
 if(code==='auth/weak-password'||code==='auth/password-does-not-meet-requirements')return 'identity.invalidPassword';
 if(code==='auth/operation-not-allowed'||code==='auth/admin-restricted-operation'||code==='auth/configuration-not-found')return 'identity.providerError';
 if(code==='auth/network-request-failed'||code==='network'||code==='timeout')return 'identity.networkError';
 if(code==='auth/too-many-requests')return 'identity.rateError';
 if(mode==='link'&&(code==='auth/email-already-in-use'||code==='auth/credential-already-in-use'||code==='auth/account-exists-with-different-credential'||code==='auth/provider-already-linked'))return 'identity.linkConflict';
 if(mode==='changeEmail'&&(code==='auth/email-already-in-use'||code==='auth/credential-already-in-use'))return 'identity.linkConflict';
 if(mode==='changeEmail'&&(code==='auth/invalid-credential'||code==='auth/invalid-login-credentials'||code==='auth/wrong-password'||code==='auth/requires-recent-login'))return 'identity.changePasswordError';
 if(mode==='login'&&(code==='auth/invalid-credential'||code==='auth/invalid-login-credentials'||code==='auth/wrong-password'||code==='auth/user-not-found'))return 'identity.loginError';
 return 'common.error';
}

/** Correction must target a different valid mailbox, never sign out or unlink the current identity. */
export function validEmailCorrection(current:string|null,next:string):boolean{
 return !!current&&validAccountEmail(next)&&current.trim().toLowerCase()!==next.trim().toLowerCase();
}
