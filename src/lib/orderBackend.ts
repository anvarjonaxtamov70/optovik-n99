import { app, auth, withTimeout } from './firebase';

import {candidateBackendEnabled} from '../domain/candidateBackend';
import {isBannerRoute,safeBannerError} from '../domain/bannerUi';
import {safeCandidateError} from '../domain/candidateError';

export const usesFirestoreCandidate=candidateBackendEnabled(process.env.EXPO_PUBLIC_N99_BACKEND,process.env.EXPO_PUBLIC_N99_ENV,app.options.projectId,process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST);
const enabled = process.env.EXPO_PUBLIC_N99_BACKEND === 'worker'||usesFirestoreCandidate;
export const usesOrderBackend = enabled;
const endpoint = usesFirestoreCandidate?'https://optovik-n99-firestore-candidate.anvarjonaxtamov.workers.dev':'https://optovik-n99-staging.anvarjonaxtamov.workers.dev';
if (enabled && (process.env.EXPO_PUBLIC_N99_ENV !== 'staging' || app.options.projectId !== 'optovik-n99-staging')) {
  throw new Error('Worker backend is staging only');
}
export async function orderBackend(path: '/v1/orders' | '/v1/transition', body: unknown, uid: string): Promise<void> {
  await requestBackend(path,body,uid);
}

export async function abandonOrderBackend(body: {id:string;raqam:number},uid:string): Promise<'exists'|'abandoned'> {
  const result=await requestBackend('/v1/abandon',body,uid);
  return (result as {outcome:'exists'|'abandoned'}).outcome;
}

export type CandidateRoute='/v1/transition'|'/v1/catalog/list'|'/v1/orders/list'|'/v1/admin/orders/list'|'/v1/orders/get'|'/v1/admin/product'|'/v1/admin/note'|'/v1/admin/shop'|'/v1/shop/get'|'/v1/account/role'|'/v1/profile/get'|'/v1/profile/save'|'/v1/quote'|'/v1/banners/list'|'/v1/admin/banners/list'|'/v1/admin/banner';
export async function candidateRequest<T>(path:CandidateRoute,body:unknown,uid:string):Promise<T>{
 if(!usesFirestoreCandidate)throw new Error('Candidate disabled');
 return await requestBackend(path,body,uid) as T;
}
async function requestBackend(path: '/v1/orders' | '/v1/transition' | '/v1/abandon' | CandidateRoute, body: unknown, uid: string): Promise<unknown> {
  const user = auth.currentUser;
  if (!enabled || !user || user.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
  const started=Date.now();
  const token = await withTimeout(user.getIdToken(), 8000);
  const tokenMs=Date.now()-started;
  if (auth.currentUser?.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(endpoint + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    if(__DEV__&&usesFirestoreCandidate&&path==='/v1/transition')console.info('[N99 performance]',{tokenMs,httpMs:Date.now()-started-tokenMs,status:response.status,server:response.headers.get('Server-Timing')});
    if(usesFirestoreCandidate&&response.headers.get('X-N99-Backend')!=='firestore-candidate')throw new Error('Wrong backend');
    if(usesFirestoreCandidate&&isBannerRoute(path)){
      const detail=!response.ok?await response.json().catch(()=>null):null;
      const bannerError=safeBannerError(detail?.error);
      if(__DEV__)console.info('[N99 banners]',{route:path,status:response.status,ms:Date.now()-started,error:bannerError,server:response.headers.get('Server-Timing')});
      if(!response.ok)throw Object.assign(new Error('Banner request failed'),{code:response.status===429?'too-many-requests':response.status<500?'permission-denied':'network',bannerError});
    }
    if (!response.ok) {
      const detail=usesFirestoreCandidate?await response.json().catch(()=>null):null;
      throw Object.assign(new Error('Order service rejected request'), { code: response.status === 429 ? 'too-many-requests' : response.status < 500 ? 'permission-denied' : 'network',candidateError:safeCandidateError(detail?.error) });
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || (path === '/v1/transition' && (result as {ok?: unknown}).ok !== true) || (path === '/v1/orders' && ((result as {id?: unknown}).id !== (body as {id?: unknown})?.id || (result as {raqam?: unknown}).raqam !== (body as {raqam?: unknown})?.raqam || typeof (result as {recovered?: unknown}).recovered !== 'boolean'))) throw new Error('Invalid acknowledgement');
    if (path === '/v1/abandon') {
      const ack=result as {id?:unknown;raqam?:unknown;outcome?:unknown};
      const sent=body as {id:string;raqam:number};
      if(ack.id!==sent.id||ack.raqam!==sent.raqam||(ack.outcome!=='exists'&&ack.outcome!=='abandoned'))throw new Error('Invalid acknowledgement');
    }
    if (auth.currentUser?.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
    return result;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    throw Object.assign(new Error('Order service failed'), { code: code === 'permission-denied' || code === 'too-many-requests' ? code : 'network',...(isBannerRoute(path)?{bannerError:safeBannerError((error as {bannerError?:unknown})?.bannerError)}:{}),candidateError:safeCandidateError((error as {candidateError?:unknown})?.candidateError) });
  } finally { clearTimeout(timer); }
}
