import {paths} from './firestore-orders.mjs';

// Conservative internal staging limits, not Google's published/account quota.
export const STUDIO_QUOTA = Object.freeze({global:20,admin:5,windowMs:86400000,cooldownMs:60000});
const GLOBAL='n99StudioQuota/global';
const fail=(code,status)=>{throw Object.assign(new Error(code),{code,status});};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
function adminPath(uid){
  if(typeof uid!=='string'||!uid)fail('unauthenticated',401);
  return paths.admin(uid);
}
function history(raw,now,max){
  if(raw===null)return [];
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.attempts)||raw.attempts.length>max)fail('studio-quota-unavailable',503);
  const list=raw.attempts;
  if(list.some((v,i)=>!integer(v)||v>now||(i>0&&v<list[i-1])))fail('studio-quota-unavailable',503);
  return list.filter(v=>now-v<STUDIO_QUOTA.windowMs);
}
export async function checkStudioAdmin(run,uid){
  const path=adminPath(uid);
  return run(async tx=>{
    if(await tx.get(path)!==true)fail('forbidden',403);
  });
}
// Must use a real atomic server transaction. Commit reservation BEFORE provider call.
// Failed/uncertain provider attempts still count. Never call the provider inside a retryable transaction.
export async function reserveStudioAttempt(run,uid,now){
  const rolePath=adminPath(uid);
  if(!integer(now))fail('studio-quota-unavailable',503);
  const personal='n99StudioQuota/admin_'+rolePath.slice('n99Admins/'.length);
  const keys=[rolePath,GLOBAL,personal];
  return run(async tx=>{
    const [role,global,admin]=tx.getAll?await tx.getAll(keys):await Promise.all(keys.map(k=>tx.get(k)));
    if(role!==true)fail('forbidden',403);
    const g=history(global,now,STUDIO_QUOTA.global);
    const a=history(admin,now,STUDIO_QUOTA.admin);
    if(g.length>=STUDIO_QUOTA.global||a.length>=STUDIO_QUOTA.admin)fail('studio-daily-limit',429);
    if(g.length&&now-g[g.length-1]<STUDIO_QUOTA.cooldownMs)fail('studio-cooldown',429);
    tx.set(GLOBAL,{attempts:[...g,now]});
    tx.set(personal,{attempts:[...a,now]});
    return {remainingGlobal:STUDIO_QUOTA.global-g.length-1,remainingAdmin:STUDIO_QUOTA.admin-a.length-1};
  });
}
