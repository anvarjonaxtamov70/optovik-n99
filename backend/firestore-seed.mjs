// Synthetic fixture only. No network or real export inputs.
import {paths} from './firestore-orders.mjs';
import {DATASET_VERSION} from './firestore-isolation.mjs';
import {documentFields} from './firestore-rest.mjs';
export function syntheticSeed(adminUid){
 if(typeof adminUid!=='string'||!/^[-_A-Za-z0-9]{1,100}$/.test(adminUid))throw new Error('Invalid test admin UID');
 const docs=new Map([
  [paths.dataset,{kind:'synthetic-only',version:DATASET_VERSION}],
  [paths.admin(adminUid),true],
  [paths.settings,{name:'N99 SYNTHETIC TEST',pickupEnabled:true,courierEnabled:true,courierFee:10000,freeDeliveryFrom:1000000}],
  [paths.banners,{}],
  [paths.product('optika','synthetic-fara'),{nomi:'TEST Cobalt fara',narxi:100000,qoldiq:6,revision:1,archived:false}],
  [paths.product('dvigatel','synthetic-filter'),{nomi:'TEST filtr',narxi:50000,qoldiq:10,revision:1,archived:false}],
 ]);
 return docs;
}
export function syntheticSeedCommit(adminUid){
 const database='projects/optovik-n99-staging/databases/(default)';
 return {writes:[...syntheticSeed(adminUid)].map(([path,value])=>({update:{name:database+'/documents/'+path,fields:documentFields(path,value)},currentDocument:{exists:false}}))};
}
