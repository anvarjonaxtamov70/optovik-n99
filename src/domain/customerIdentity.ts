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
