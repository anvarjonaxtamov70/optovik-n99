// Firestore REST transaction runner for the isolated staging project only.
// No service key, client token or credentials are stored here. Never import from the app.
const STAGING_DATABASE='projects/optovik-n99-staging/databases/(default)';
const fail=(message,status=503)=>{throw Object.assign(new Error(message),{status});};
const documentPath=path=>{
  if(typeof path!=='string'||!/^n99[A-Za-z]+\/[A-Za-z0-9_%.!~*'()-]+(?:\/products\/[A-Za-z0-9_%.!~*'()-]+)?$/.test(path))fail('invalid-document-path',400);
  return path.split('/').map(encodeURIComponent).join('/');
};
export function firestoreRunner({token,deadline,fetcher=fetch,clock=Date.now}){
  return makeRunner({token,deadline,fetcher,clock,database:STAGING_DATABASE,origin:'https://firestore.googleapis.com'});
}
// Explicit disposable emulator only; cannot select a remote endpoint or project.
export function localFirestoreRunner({host,deadline}){
  if(!/^(127\\.0\\.0\\.1|localhost):8080$/.test(host??''))fail('local-emulator-required');
  return makeRunner({token:'owner',deadline,fetcher:fetch,clock:Date.now,database:'projects/demo-n99-firestore/databases/(default)',origin:'http://'+host});
}
function makeRunner({token,deadline,fetcher,clock,database,origin}){
  const BASE=origin+'/v1/'+database+'/documents';
  const name=path=>database+'/documents/'+path;
  if(typeof token!=='string'||!token||!Number.isSafeInteger(deadline))fail('invalid-runner');
  async function request(url,body,method='POST'){
    const ms=Math.min(8000,deadline-clock());
    if(ms<=0)fail('request-deadline');
    const response=await fetcher(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(ms)});
    return response;
  }
  return async task=>{
    for(let attempt=0;attempt<4;attempt++){
      let transaction,committing=false;
      try{
        const begin=await request(BASE+':beginTransaction',{options:{readWrite:{}}});
        if(!begin.ok)fail('transaction-start');
        transaction=(await begin.json()).transaction;
        if(typeof transaction!=='string'||!transaction)fail('transaction-start');
        const writes=new Map();
        let reads=0;
        const value=await task({
          get:async path=>{
            if(writes.size)fail('read-after-write');
            if(++reads>56)fail('read-limit');
            const res=await request(BASE+'/'+documentPath(path)+'?transaction='+encodeURIComponent(transaction),undefined,'GET');
            if(res.status===404)return null;
            if(!res.ok){if(res.status===409)fail('transaction-conflict',409);fail('document-read');}
            const doc=await res.json();
            if(doc.name!==name(path)||typeof doc.fields?.payload?.stringValue!=='string')fail('invalid-document');
            return JSON.parse(doc.fields.payload.stringValue);
          },
          set:(path,value)=>{
            documentPath(path);
            const payload=JSON.stringify(value);
            if(typeof payload!=='string'||new TextEncoder().encode(payload).length>900000)fail('document-size');
            writes.set(path,{update:{name:name(path),fields:documentFields(path,value,payload)}});
            if(writes.size>52)fail('write-limit');
          },
        });
        if(!writes.size){await request(BASE+':rollback',{transaction});return value;}
        committing=true;
        const res=await request(BASE+':commit',{transaction,writes:[...writes.values()]});
        if(res.status===409){
          const detail=await res.json().catch(()=>null);
          if(detail?.error?.status==='ABORTED'){committing=false;fail('transaction-conflict',409);}
        }
        if(!res.ok)fail('transaction-commit');
        return value;
      }catch(error){
        if(transaction&&!committing){try{await request(BASE+':rollback',{transaction});}catch{/* preserve original failure */}}
        if(!committing&&error?.status===409&&error.message==='transaction-conflict'&&attempt<3)continue;
        throw error;
      }
    }
    fail('transaction-conflict');
  };
}

/** Query metadata is derived from the authoritative payload in the same document write. */
export function documentFields(path,value,payload=JSON.stringify(value)){
  const fields={payload:{stringValue:payload}};
  const str=(k,v)=>{if(typeof v!=='string')fail('invalid-query-field');fields[k]={stringValue:v};};
  const int=(k,v)=>{if(!Number.isSafeInteger(v))fail('invalid-query-field');fields[k]={integerValue:String(v)};};
  if(path.startsWith('n99Orders/')&&value?.index){
    str('uid',value.index.uid);str('status',value.index.holat);int('createdAt',value.index.createdAt);int('raqam',value.index.raqam);
  }
  if(path.startsWith('n99Categories/')){
    str('name',value.nomi);int('price',value.narxi);int('stock',value.qoldiq);
    fields.archived={booleanValue:value.archived===true};
  }
  return fields;
}
