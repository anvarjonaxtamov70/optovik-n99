import { readFile } from 'node:fs/promises';
import { verifyRestore } from './restore-integrity.mjs';
try {
  if(process.argv.length!==3)throw new Error('Expected one JSON file');
  const root=JSON.parse(await readFile(process.argv[2],'utf8'));
  console.log(JSON.stringify(verifyRestore(root)));
} catch {
  console.error('Restore verification failed: invalid snapshot or inconsistent order/index/inventory.');
  process.exitCode=1;
}
