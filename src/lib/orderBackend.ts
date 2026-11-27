import { app, auth, withTimeout } from './firebase';

const enabled = process.env.EXPO_PUBLIC_N99_BACKEND === 'worker';
export const usesOrderBackend = enabled;
const endpoint = 'https://optovik-n99-staging.anvarjonaxtamov.workers.dev';
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

async function requestBackend(path: '/v1/orders' | '/v1/transition' | '/v1/abandon', body: unknown, uid: string): Promise<unknown> {
  const user = auth.currentUser;
  if (!enabled || !user || user.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
  const token = await withTimeout(user.getIdToken(), 8000);
  if (auth.currentUser?.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(endpoint + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error('Order service rejected request'), { code: response.status === 429 ? 'too-many-requests' : response.status < 500 ? 'permission-denied' : 'network' });
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
    throw Object.assign(new Error('Order service failed'), { code: code === 'permission-denied' || code === 'too-many-requests' ? code : 'network' });
  } finally { clearTimeout(timer); }
}
