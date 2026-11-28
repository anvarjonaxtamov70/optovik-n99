import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export function inspectBackup(root) {
  if (!record(root) || !record(root.tovarlar)) throw new Error('Missing catalog root');
  let products = 0, orders = 0;
  for (const category of Object.values(root.tovarlar)) {
    if (!record(category)) throw new Error('Invalid catalog category');
    for (const p of Object.values(category)) {
      if (!record(p) || typeof p.nomi !== 'string' || !p.nomi.trim() || !Number.isSafeInteger(p.narxi) || p.narxi < 0 || !Number.isSafeInteger(p.qoldiq) || p.qoldiq < 0) throw new Error('Invalid catalog product');
      products++;
    }
  }
  if (root.orders !== undefined) {
    if (!record(root.orders)) throw new Error('Invalid orders root');
    for (const customer of Object.values(root.orders)) {
      if (!record(customer)) throw new Error('Invalid order group');
      for (const order of Object.values(customer)) {
        if (!record(order)) throw new Error('Invalid order');
        orders++;
      }
    }
  }
  return { products, orders };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Expected one local JSON file');
    const result = inspectBackup(JSON.parse(await readFile(process.argv[2], 'utf8')));
    console.log(JSON.stringify(result));
  } catch {
    console.error('Backup verification failed: unreadable JSON or invalid structure.');
    process.exitCode = 1;
  }
}
