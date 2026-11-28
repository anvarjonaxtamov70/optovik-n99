// No network. No overwrite. Keep the key outside GitHub and separate from the encrypted copy.
import {readFile,writeFile,stat} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {parseBackupKey,sealBackup,openBackup,MAX_BACKUP_BYTES} from './backup-crypto.mjs';
const save=(path,value)=>writeFile(path,value,{flag:'wx',mode:0o600});
async function bounded(path,max){
 const info=await stat(path);
 if(!info.isFile()||info.size>max)throw new Error('Invalid file size');
 const result=await readFile(path);
 if(result.length>max)throw new Error('Invalid file size');
 return result;
}
let key;
try{
 const [cmd,...args]=process.argv.slice(2);
 if(cmd==='keygen'&&args.length===1&&args[0].endsWith('.key')){
  key=randomBytes(32);await save(args[0],key.toString('base64')+'\n');
  console.log('Backup key created. Store separately.');
 }else if((cmd==='seal'||cmd==='verify'||cmd==='open')&&args.length===(cmd==='verify'?2:3)){
  const [keyFile,input,output]=args;
  if(!keyFile.endsWith('.key')||new Set(args.map(p=>resolve(p))).size!==args.length)throw new Error('Invalid file paths');
  key=parseBackupKey((await bounded(keyFile,100)).toString('utf8'));
  const raw=await bounded(input,MAX_BACKUP_BYTES+64);
  if(cmd==='seal'){if(!output.endsWith('.n99backup'))throw new Error('Invalid output');await save(output,sealBackup(raw,key));console.log('Encrypted backup created.');}
  else{const result=openBackup(raw,key);if(cmd==='open'){if(!output.endsWith('-export.json'))throw new Error('Invalid output');await save(output,result.bytes);}console.log(JSON.stringify(result.counts));}
 }else throw new Error('Invalid command');
}catch{console.error('Backup operation failed. Check paths, key, integrity and output existence.');process.exitCode=1;}
finally{key?.fill(0);}
