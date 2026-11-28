import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const old=read('candidate-report/original-lock.json');
const next=read('package-lock.json');
const original=read('candidate-report/original-package.json');
const manifest=read('package.json');
if(old.lockfileVersion!==next.lockfileVersion) throw new Error('Unexpected lockfile format change');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const expected=structuredClone(original);
if(expected.dependencies['@expo/ngrok']){
  expected.devDependencies['@expo/ngrok']=expected.dependencies['@expo/ngrok'];
  delete expected.dependencies['@expo/ngrok'];
}
expected.overrides??={};
for(const [parent,child,major] of [['@firebase/firestore','@grpc/grpc-js',1],['@expo/fingerprint','minimatch',10]]){
  const value=manifest.overrides?.[parent]?.[child];
  if(typeof value!=='string'||!/^\d+\.\d+\.\d+$/.test(value)||Number(value.split('.')[0])!==major)throw new Error('Unexpected override');
  expected.overrides[parent]={...expected.overrides[parent],[child]:value};
}
if(!same(manifest,expected)) throw new Error('Candidate unexpectedly changed declared dependencies');
const changes={};
for(const key of new Set([...Object.keys(old.packages),...Object.keys(next.packages)])){
  if(!same(old.packages[key],next.packages[key]))changes[key]=next.packages[key]??null;
}
const delta={lockfileVersion:next.lockfileVersion,manifest,changes};
writeFileSync('candidate-report/lock-delta.json',JSON.stringify(delta,null,2)+'\n');
const summary=Object.entries(changes).map(([name,v])=>({name,before:old.packages[name]?.version??null,after:v?.version??null,dev:v?.dev??false}));
console.log('Candidate changed entries:',summary.length);
console.log(JSON.stringify(summary));
const compact=JSON.stringify(delta);
const encoded=Buffer.from(compact,'utf8').toString('base64');
const chunks=encoded.match(/.{1,5000}/g)??[];
console.log('N99_CANDIDATE_SHA256 '+createHash('sha256').update(compact).digest('hex'));
for(const [i,chunk] of chunks.entries())console.log('N99_CANDIDATE_CHUNK '+i+'/'+chunks.length+' '+chunk);
