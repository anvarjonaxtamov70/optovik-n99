// Read-only staging export. Never writes to Firebase; never writes plaintext to disk.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeCandidateBackup,verifyCandidateBackup} from './firestore-backup-format.mjs';
import {documentFields} from '../backend/firestore-rest.mjs';
import {parseBackupKey,sealBackup,openBackup,MAX_BACKUP_BYTES} from './backup-crypto.mjs';
const project='optovik-n99-staging';
const base='projects/'+project+'/databases/(default)/documents';
const origin='https://firestore.googleapis.com/v1/';
const roots=['n99Settings','n99Orders','n99Customers','n99Admins','n99Abandoned','n99Categories'];
const ok=v=>{if(!v)throw new Error('Invalid or incomplete staging snapshot');};
const sort=v=>Object.keys(v).sort().map(k=>[k,v[k]]);
export async function exportCandidate({token,fetcher=fetch,clock=Date.now}){
 ok(typeof token==='string'&&token.length>0);
 // All reads share one timestamp, not a sequence of different current snapshots.
 const readTime=new Date(clock()-5000).toISOString();
 const docs=new Map();let requests=0,bytes=0;
 const deadline=clock()+120000;
 async function post(method,body){
  ok(++requests<=250&&clock()<deadline);
  const res=await fetcher(origin+base+':'+method,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,'X-Goog-User-Project':project,'Content-Type':'application/json'},body:JSON.stringify({...body,readTime}),signal:AbortSignal.timeout(Math.min(15000,deadline-clock()))});
  if(!res.ok)throw new Error('Snapshot read failed: HTTP '+res.status);
  return res.json();
 }
 let pageToken;const seenCollections=new Set();
 do{
  const result=await post('listCollectionIds',{pageSize:100,...(pageToken?{pageToken}:{})});
  ok(result&&Array.isArray(result.collectionIds??[]));
  for(const id of result.collectionIds??[]){ok(roots.includes(id)&&!seenCollections.has(id));seenCollections.add(id);}
  ok(!result.nextPageToken||typeof result.nextPageToken==='string'&&result.nextPageToken!==pageToken);
  pageToken=result.nextPageToken;
 }while(pageToken);
 // Explicit known schema. Query all product documents including archived and orphan-parent products.
 for(const collectionId of [...roots,'products']){
  let cursor;
  for(;;){
   const rows=await post('runQuery',{structuredQuery:{from:[{collectionId,allDescendants:collectionId==='products'}],orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:100,...(cursor?{startAt:{values:[{referenceValue:cursor}],before:false}}:{})}});
   ok(Array.isArray(rows)&&rows.length>0&&rows.length<=101);
   let count=0,last=cursor;
   for(const row of rows){
    if(!row.document){ok(typeof row.readTime==='string');continue;}
    const {name,fields}=row.document;
    ok(typeof name==='string'&&name.startsWith(base+'/')&&name!==last&&typeof fields?.payload?.stringValue==='string');
    const path=name.slice(base.length+1);
    ok(collectionId==='products'?/^n99Categories\/[^/]+\/products\/[^/]+$/.test(path):path.split('/').length===2&&path.startsWith(collectionId+'/'));
    ok(!docs.has(path)&&docs.size<20000);
    const payload=fields.payload.stringValue;
    bytes+=Buffer.byteLength(payload)+Buffer.byteLength(path)+100;ok(bytes<=MAX_BACKUP_BYTES);
    const value=JSON.parse(payload);
    // Derived query metadata must match payload; no unknown field is silently discarded.
    const expected=documentFields(path,value,payload);
    ok(JSON.stringify(sort(fields))===JSON.stringify(sort(expected)));
    docs.set(path,value);last=name;count++;
   }
   ok(count<=100);
   if(count<100)break;
   ok(last&&last!==cursor);cursor=last;
  }
 }
 return makeCandidateBackup(docs,readTime);
}
async function main(){
 let key;
 try{
  const [keyFile,output,...extra]=process.argv.slice(2);
  ok(!extra.length&&keyFile?.endsWith('.key')&&output?.endsWith('.n99backup')&&resolve(keyFile)!==resolve(output));
  ok((await stat(keyFile)).isFile()&&(await stat(keyFile)).size<=100);
  key=parseBackupKey(await readFile(keyFile,'utf8'));
  const token=execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','ignore']}).trim();
  const snapshot=await exportCandidate({token});
  const sealed=sealBackup(Buffer.from(JSON.stringify(snapshot)),key);
  const verified=openBackup(sealed,key);
  await writeFile(output,sealed,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({capturedAt:snapshot.capturedAt,...verified.counts}));
 }catch(e){console.error(/^Snapshot read failed: HTTP \d{3}$/.test(e?.message)?e.message:'Candidate backup failed. Check project access, key, schema, size and output path.');process.exitCode=1;}
 finally{key?.fill(0);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
