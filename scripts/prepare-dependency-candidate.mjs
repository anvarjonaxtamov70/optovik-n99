import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const p=JSON.parse(readFileSync('package.json','utf8'));
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
function latestStable(name,major){
  const raw=JSON.parse(execFileSync('npm',['view',name+'@'+major,'version','--json','--registry=https://registry.npmjs.org'],{encoding:'utf8',timeout:30000}));
  const versions=(Array.isArray(raw)?raw:[raw]).filter(v=>typeof v==='string'&&/^\d+\.\d+\.\d+$/.test(v)&&Number(v.split('.')[0])===major);
  const parts=v=>v.split('.').map(Number);
  versions.sort((a,b)=>{const x=parts(a),y=parts(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];});
  if(!versions.length)throw new Error('No stable registry candidate');
  return versions.at(-1);
}
if(p.dependencies['@expo/ngrok']){
  p.devDependencies['@expo/ngrok']=p.dependencies['@expo/ngrok'];
  delete p.dependencies['@expo/ngrok'];
}
p.overrides??={};
for(const [parent,child,major] of [['@firebase/firestore','@grpc/grpc-js',1],['@expo/fingerprint','minimatch',10]]){
  const existing=lock.packages['node_modules/'+child]?.version;
  if(!existing||Number(existing.split('.')[0])!==major)throw new Error('Dependency major changed; manual review required');
  const version=latestStable(child,major);
  p.overrides[parent]={...p.overrides[parent],[child]:version};
  console.log('Candidate override',parent,child,version);
}
writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
