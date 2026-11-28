// Offline candidate snapshot format. No network or remote restore.
import {verifyRestore} from './restore-integrity.mjs';
import {paths} from '../backend/firestore-orders.mjs';
import {documentFields} from '../backend/firestore-rest.mjs';
import {publicSettings} from '../backend/firestore-aux.mjs';
import {publicBannerSnapshot} from '../backend/firestore-isolation.mjs';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const map=()=>Object.create(null);
const ok=v=>{if(!v)throw new Error('Invalid candidate backup');};
const segment=v=>{const raw=decodeURIComponent(v);ok(raw.length>0&&raw.length<=100&&!['__proto__','constructor','prototype'].includes(raw));return raw;};
export const CANDIDATE_BACKUP_FORMAT='n99-firestore-candidate-v1';
export function verifyCandidateBackup(snapshot){
 ok(rec(snapshot)&&snapshot.format===CANDIDATE_BACKUP_FORMAT&&snapshot.project==='optovik-n99-staging'&&Array.isArray(snapshot.documents)&&snapshot.documents.length<=20000);
 ok(typeof snapshot.capturedAt==='string'&&Number.isFinite(Date.parse(snapshot.capturedAt)));
 const root={tovarlar:map(),orders:map(),orderIndex:map()};
 const seen=new Set();let customers=0,admins=0,banners=0,markers=0;
 for(const doc of snapshot.documents){
  ok(rec(doc)&&Object.keys(doc).length===2&&typeof doc.path==='string'&&Object.hasOwn(doc,'value')&&!seen.has(doc.path));
  const {path,value}=doc;seen.add(path);
  const parts=path.split('/'),[collection,a,,b]=parts;
  const payload=JSON.stringify(value);
  ok(typeof payload==='string'&&Buffer.byteLength(payload)<=900000);
  if(collection==='n99Categories'&&parts.length===4&&parts[2]==='products'){
   const cat=segment(a),id=segment(b);ok(paths.product(cat,id)===path&&rec(value)&&Number.isSafeInteger(value.revision??0)&&(value.revision??0)>=0&&value.qoldiq<=1000000&&value.narxi<=1000000000);
   root.tovarlar[cat]??=map();root.tovarlar[cat][id]=value;
  }else if(collection==='n99Orders'&&parts.length===2){
   ok(paths.order(a)===path&&rec(value)&&rec(value.order)&&rec(value.index)&&typeof value.index.uid==='string');
   const uid=value.index.uid;paths.customer(uid);segment(encodeURIComponent(uid));
   root.orders[uid]??=map();root.orders[uid][a]=value.order;root.orderIndex[a]=value.index;
  }else if(collection==='n99Customers'&&parts.length===2){
   ok(paths.customer(segment(a))===path&&rec(value));customers++;
  }else if(collection==='n99Admins'&&parts.length===2){
   ok(paths.admin(segment(a))===path&&value===true);admins++;
  }else if(collection==='n99Abandoned'&&parts.length===2){
   ok(paths.abandoned(segment(a))===path&&rec(value)&&Object.keys(value).length<=20);
   for(const [id,m] of Object.entries(value)){paths.order(id);ok(rec(m)&&Number.isSafeInteger(m.at)&&m.at>=0&&Number.isInteger(m.raqam)&&m.raqam>=100000&&m.raqam<=999999);}
   markers+=Object.keys(value).length;
  }else if(path===paths.dataset){
   ok(rec(value)&&value.kind==='synthetic-only'&&value.version===1);
  }else if(path===paths.settings){
   ok(rec(value));publicSettings(value);
  }else if(path===paths.banners){
   ok(rec(value));publicBannerSnapshot(value);banners=Object.keys(value).length;
  }else throw new Error('Unsupported candidate document');
  documentFields(path,value,payload);
 }
 for(const p of [paths.dataset,paths.settings,paths.banners])ok(seen.has(p));
 for(const {path,value} of snapshot.documents)if(path.startsWith('n99Abandoned/')){
  const uid=segment(path.split('/')[1]);
  for(const id of Object.keys(value))ok(!root.orders[uid]?.[id]);
 }
 return {...verifyRestore(root),documents:seen.size,customers,admins,banners,markers};
}
export function makeCandidateBackup(documents,capturedAt=new Date().toISOString()){
 const snapshot={format:CANDIDATE_BACKUP_FORMAT,project:'optovik-n99-staging',capturedAt,documents:[...documents].map(([path,value])=>({path,value:structuredClone(value)})).sort((a,b)=>a.path.localeCompare(b.path))};
 verifyCandidateBackup(snapshot);return snapshot;
}
