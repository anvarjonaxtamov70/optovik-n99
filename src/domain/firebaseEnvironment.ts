export type PublicFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

/** Staging never falls back to production, even if configuration is absent or malformed. */
export function selectFirebaseConfig(production: PublicFirebaseConfig, mode: string | undefined, stagingJson: string | undefined): PublicFirebaseConfig {
  if (!mode || mode === 'production') return production;
  if (mode !== 'staging' || !stagingJson) throw new Error('Invalid Firebase environment');
  let candidate: PublicFirebaseConfig;
  try { candidate = JSON.parse(stagingJson); } catch { throw new Error('Invalid staging configuration'); }
  if (!candidate || typeof candidate !== 'object' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(candidate.projectId) || candidate.projectId === production.projectId ||
      typeof candidate.apiKey !== 'string' || !candidate.apiKey || candidate.apiKey === production.apiKey ||
      typeof candidate.appId !== 'string' || !candidate.appId || candidate.appId === production.appId ||
      candidate.authDomain !== candidate.projectId + '.firebaseapp.com' || typeof candidate.databaseURL !== 'string') throw new Error('Invalid staging configuration');
  const url = new URL(candidate.databaseURL);
  const root = candidate.projectId + '-default-rtdb';
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash ||
      !(url.hostname === root + '.firebaseio.com' || (url.hostname.startsWith(root + '.') && url.hostname.endsWith('.firebasedatabase.app')))) throw new Error('Invalid staging database');
  return { apiKey: candidate.apiKey, appId: candidate.appId, projectId: candidate.projectId, authDomain: candidate.authDomain, databaseURL: url.origin };
}
