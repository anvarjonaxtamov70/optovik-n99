import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAudit, auditExit } from '../scripts/audit-report.mjs';
const clean={info:0,low:0,moderate:0,high:0,critical:0,total:0};
const report=(counts=clean,vulnerabilities={})=>JSON.stringify({metadata:{vulnerabilities:counts},vulnerabilities});
test('audit verifies clean report and refuses missing or inconsistent metadata',()=>{
  assert.equal(auditExit(parseAudit(report()).metadata.vulnerabilities,true),0);
  for(const raw of ['','{}','{"error":{"code":"E503"}}',report({...clean,high:1,total:1}),report({...clean,total:1})]) assert.throws(()=>parseAudit(raw));
});
test('high findings block strict release even when ordinary CI is green',()=>{
  const counts=parseAudit(report({...clean,high:1,total:1},{example:{severity:'high',via:[]}})).metadata.vulnerabilities;
  assert.equal(auditExit(counts),0);assert.equal(auditExit(counts,true),1);
});
