import test from 'node:test';
import assert from 'node:assert/strict';
import {exportCandidate} from '../scripts/firestore-backup-export.mjs';
import {syntheticSeed} from '../backend/firestore-seed.mjs';
import {documentFields} from '../backend/firestore-rest.mjs';
import {verifyCandidateBackup} from '../scripts/firestore-backup-format.mjs';
const base='projects/optovik-n99-staging/databases/(default)/documents',now=1800000000000;
function fixture({unknown=false,wrongFields=false,paginate=false}={}){
 const docs=syntheticSeed('testadmin'),calls=[];
 if(paginate)for(let i=0;i<101;i++)docs.set('n99Customers/test-'+String(i).padStart(3,'0'),{name:'Synthetic'});
 const fetcher=async(url,opt)=>{
  const b=JSON.parse(opt.body);calls.push({url,b});
  assert.equal(opt.method,'POST');assert.equal(opt.redirect,'error');
  assert.equal(b.readTime,new Date(now-5000).toISOString());
  assert.equal(opt.headers['X-Goog-User-Project'],'optovik-n99-staging');
  assert.ok(url.startsWith('https://firestore.googleapis.com/v1/'+base+':'));
  if(url.endsWith(':listCollectionIds'))return Response.json({collectionIds:unknown?['unexpected']:['n99Settings','n99Categories','n99Admins']});
  assert.ok(url.endsWith(':runQuery'));
  const q=b.structuredQuery,c=q.from[0].collectionId,after=q.startAt?.values[0].referenceValue;
  const rows=[...docs].filter(([p])=>c==='products'?p.includes('/products/'):p.startsWith(c+'/')&&p.split('/').length===2).sort(([a],[b])=>a.localeCompare(b)).filter(([p])=>!after||base+'/'+p>after).slice(0,q.limit).map(([p,v])=>({document:{name:base+'/'+p,fields:{...documentFields(p,v),...(wrongFields?{extra:{stringValue:'x'}}:{})}}}));
  return Response.json(rows.length?rows:[{readTime:b.readTime}]);
 };
 return {docs,calls,fetcher};
}
test('read-only export uses a single snapshot time, pages and preserves archived products',async()=>{
 const f=fixture({paginate:true});
 const out=await exportCandidate({token:'synthetic',fetcher:f.fetcher,clock:()=>now});
 assert.equal(verifyCandidateBackup(out).documents,f.docs.size);
 assert.equal(f.calls.filter(c=>c.b.structuredQuery?.from[0].collectionId==='n99Customers').length,2);
 assert.deepEqual(new Map(out.documents.map(d=>[d.path,d.value])),f.docs);
});
test('unknown root or unexpected fields fail closed',async()=>{
 for(const opts of [{unknown:true},{wrongFields:true}]){
  const f=fixture(opts);
  await assert.rejects(exportCandidate({token:'synthetic',fetcher:f.fetcher,clock:()=>now}));
 }
});
