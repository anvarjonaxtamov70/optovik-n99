// Offline inspection only; never writes exports, credentials or customer rows.
import {readFile} from 'node:fs/promises';
import {planFirestoreImport} from '../backend/firestore-migration.mjs';
try{
 if(process.argv.length!==3)throw new Error('Expected local JSON export');
 const plan=planFirestoreImport(JSON.parse(await readFile(process.argv[2],'utf8')));
 console.log(JSON.stringify({counts:plan.counts,excludedRoots:plan.excludedRoots,excludedSettings:plan.excludedSettings},null,2));
}catch{console.error('Migration validation failed. No data was written.');process.exitCode=1;}
