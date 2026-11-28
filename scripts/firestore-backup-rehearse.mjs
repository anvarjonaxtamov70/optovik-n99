// Restore a verified encrypted candidate backup ONLY into a disposable local emulator.
import {readFile,stat} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseBackupKey,openBackup,MAX_BACKUP_BYTES} from './backup-crypto.mjs';
import {verifyCandidateBackup} from './firestore-backup-format.mjs';
import {documentFields,isLocalFirestoreHost} from '../backend/firestore-rest.mjs';
const ok=v=>{if(!v)throw Error('Local restore rehearsal failed');};
export async function rehearseCandidate(snapshot,{host,fetcher=fetch,namespace='demo-n99-rehearsal-'+randomBytes(6).toString('hex')}={}){
 ok(isLocalFirestoreHost(host)&&/^demo-n99-rehearsal-[a-f0-9]{12}$/.test(namespace));
 const counts=verifyCandidateBackup(snapshot);
 const target='projects/'+namespace+'/databases/(default)/documents';
 // Always use loopback, never follow a redirect. No credentials from gcloud or the environment.
 const base='http://127.0.0.1:8080/v1/'+target;
 const deadline=Date.now()+180000;
 async function post(method,body){
  const remaining=deadline-Date.now();ok(remaining>0);
  const response=await fetcher(base+':'+method,{method:'POST',redirect:'error',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(Math.min(remaining,15000))});
  ok(response.ok);return response.json();
 }
 // Limit request bytes as well as count, preserving create-only semantics.
 let batch=[],size=0;
 const flush=async()=>{
  if(!batch.length)return;
  const writes=batch.map(d=>({update:{name:target+'/'+d.path,fields:documentFields(d.path,d.value)},currentDocument:{exists:false}}));
  const result=await post('commit',{writes});
  ok(Array.isArray(result.writeResults)&&result.writeResults.length===batch.length);
  const expected=new Map(batch.map(d=>[target+'/'+d.path,documentFields(d.path,d.value)]));
  const rows=await post('batchGet',{documents:[...expected.keys()]});
  ok(Array.isArray(rows)&&rows.length===expected.size);
  for(const row of rows){
   const doc=row?.found;
   ok(doc&&expected.has(doc.name)&&isDeepStrictEqual(doc.fields,expected.get(doc.name)));
   expected.delete(doc.name);
  }
  ok(expected.size===0);batch=[];size=0;
 };
 for(const doc of snapshot.documents){
  const bytes=Buffer.byteLength(JSON.stringify(documentFields(doc.path,doc.value)))+Buffer.byteLength(doc.path)+512;
  if(batch.length>=100||size+bytes>4*1024*1024)await flush();
  batch.push(doc);size+=bytes;
 }
 await flush();
 return {...counts,restored:snapshot.documents.length,verified:snapshot.documents.length,environment:'local-emulator'};
}
async function bounded(path,max){
 const info=await stat(path);ok(info.isFile()&&info.size<=max);
 const data=await readFile(path);ok(data.length<=max);return data;
}
async function main(){
 let key;
 try{
  const [keyFile,backup,...extra]=process.argv.slice(2);
  ok(!extra.length&&keyFile?.endsWith('.key')&&backup?.endsWith('.n99backup')&&isLocalFirestoreHost(process.env.FIRESTORE_EMULATOR_HOST));
  key=parseBackupKey((await bounded(keyFile,100)).toString('utf8'));
  const data=openBackup(await bounded(backup,MAX_BACKUP_BYTES+64),key);
  try{
   const snapshot=JSON.parse(data.bytes.toString('utf8'));
   console.log(JSON.stringify(await rehearseCandidate(snapshot,{host:process.env.FIRESTORE_EMULATOR_HOST})));
  }finally{data.bytes.fill(0);}
 }catch{console.error('Local restore rehearsal failed. Check encrypted backup, key and disposable emulator. No remote restore attempted.');process.exitCode=1;}
 finally{key?.fill(0);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
