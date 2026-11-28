import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('studio is web-only with native stub and editor reset after save-next',()=>{
 const screen=read('src/screens/admin/AdminProductEdit.tsx');
 assert.equal((screen.match(/IS_WEB && <ProductStudio key=\{studioVersion\}/g)||[]).length,2);
 assert.match(screen,/setStudioVersion\(v => v \+ 1\)/);
 assert.match(read('src/components/admin/ProductStudio.tsx'),/return null/);
});
test('studio preview requires explicit review and never saves or uploads products',()=>{
 const ui=read('src/components/admin/ProductStudio.web.tsx');
 assert.match(ui,/if\(!source\|\|active.current\|\|!review\)return/);
 assert.match(ui,/fitmentConfirmed:fit/);
 assert.match(ui,/download="optovik-n99-reklama.png"/);
 assert.doesNotMatch(ui,/saveProduct|uploadToImgbb|candidateRequest|fetch\(/);
});
test('studio uses local worker only on loopback and cleans up work and object URLs',()=>{
 const ui=read('src/components/admin/ProductStudio.web.tsx');
 assert.match(ui,/\['localhost','127\.0\.0\.1','\[::1\]'\]/);
 assert.match(ui,/localModel&&/);
 assert.match(ui,/active.current\?\.abort\(\)/);
 assert.match(ui,/engine.current\?\.dispose\(\)/);
 assert.match(ui,/URL.revokeObjectURL/);
});
