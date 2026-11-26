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

/** Keep emulator identity independent from any live Firebase project. */
export function selectRuntimeConfig(production: PublicFirebaseConfig, mode: string | undefined, stagingJson: string | undefined, emulatorHost: string | undefined): PublicFirebaseConfig {
  if (!emulatorHost) return selectFirebaseConfig(production, mode, stagingJson);
  if (mode && mode !== 'production') throw new Error('Do not mix staging and emulator');
  if (!/^(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(emulatorHost)) throw new Error('Invalid local emulator host');
  return { projectId: 'demo-n99', apiKey: 'demo-n99-local', appId: 'demo-n99-local', authDomain: 'demo-n99.firebaseapp.com', databaseURL: 'https://demo-n99-default-rtdb.firebaseio.com' };
}
