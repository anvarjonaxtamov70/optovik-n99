// Offline AES-256-GCM backup envelope. Random separate key, no passwords in shell arguments.
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {verifyRestore} from './restore-integrity.mjs';
import {verifyCandidateBackup,CANDIDATE_BACKUP_FORMAT} from './firestore-backup-format.mjs';
const MAGIC=Buffer.from('N99BACKUP1','ascii'),MAX=32*1024*1024;
export const MAX_BACKUP_BYTES=MAX;
export function parseBackupKey(text){
 if(typeof text!=='string'||! /^[A-Za-z0-9+/]{43}=$/.test(text.trim()))throw new Error('Invalid backup key');
 const key=Buffer.from(text.trim(),'base64');
 if(key.length!==32||key.toString('base64')!==text.trim())throw new Error('Invalid backup key');
 return key;
}
function validate(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX)throw new Error('Invalid backup size');
 const snapshot=JSON.parse(bytes.toString('utf8'));
 return snapshot?.format===CANDIDATE_BACKUP_FORMAT?verifyCandidateBackup(snapshot):verifyRestore(snapshot);
}
export function sealBackup(bytes,key){
 validate(bytes);
 if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('Invalid backup key');
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);
 cipher.setAAD(MAGIC);
 const data=Buffer.concat([cipher.update(bytes),cipher.final()]);
 return Buffer.concat([MAGIC,nonce,cipher.getAuthTag(),data]);
}
export function openBackup(envelope,key){
 const offset=MAGIC.length;
 if(!Buffer.isBuffer(envelope)||envelope.length<=offset+28||envelope.length>MAX+offset+28||!envelope.subarray(0,offset).equals(MAGIC)||!Buffer.isBuffer(key)||key.length!==32)throw new Error('Invalid backup envelope');
 const decipher=createDecipheriv('aes-256-gcm',key,envelope.subarray(offset,offset+12));
 decipher.setAAD(MAGIC);decipher.setAuthTag(envelope.subarray(offset+12,offset+28));
 const bytes=Buffer.concat([decipher.update(envelope.subarray(offset+28)),decipher.final()]);
 const counts=validate(bytes);
 return {bytes,counts};
}
