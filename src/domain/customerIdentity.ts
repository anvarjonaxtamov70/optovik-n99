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
