// Run only on a trusted workstation with Application Default Credentials.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const uid = process.argv[2];
if (!uid) throw new Error('Usage: node set-admin.mjs FIREBASE_UID');
initializeApp({ credential: applicationDefault(), projectId: 'optovikn99' });
const user = await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid, { ...user.customClaims, admin: true });
console.log('Admin claim set. Sign out and sign in again.');
