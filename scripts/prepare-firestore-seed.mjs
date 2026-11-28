// Offline only. Generates create-only synthetic REST commit body; does not transmit it.
import {writeFile} from 'node:fs/promises';
import {syntheticSeedCommit} from '../backend/firestore-seed.mjs';
try{
 if(process.argv.length!==4||!process.argv[3].endsWith('-seed.json'))throw new Error('Expected test admin UID and new *-seed.json file');
 const seed=syntheticSeedCommit(process.argv[2]);
 await writeFile(process.argv[3],JSON.stringify(seed,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('Synthetic seed prepared. No remote data written.');
}catch{console.error('Seed preparation failed. No remote data written.');process.exitCode=1;}
