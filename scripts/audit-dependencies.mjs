// Haqiqiy `npm audit` hisoboti (oldingi versiya tekshirmasdan "OK" yozardi).
// Faqat "critical" topilsa CI yiqiladi; qolganlari reports/summary.md da ro'yxat qilinadi.
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseAudit, auditExit } from './audit-report.mjs';

let raw;
try {
  raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  if (e.status !== 1 || !e.stdout) throw new Error('npm audit did not complete');
  raw = e.stdout;
}
const report = parseAudit(raw);
const counts = report.metadata.vulnerabilities;
const rows = Object.entries(report.vulnerabilities ?? {}).map(([name, v]) => {
  const via = (v.via ?? []).map((x) => (typeof x === 'string' ? x : x.title)).join('; ');
  return `| ${v.severity} | ${name} | ${via.replace(/\|/g, '/').slice(0, 160)} |`;
});
const md = [
  '# Dependency audit (production)',
  '',
  `critical: ${counts.critical ?? 0}, high: ${counts.high ?? 0}, moderate: ${counts.moderate ?? 0}, low: ${counts.low ?? 0}`,
  '',
  `Release gate (critical or high): ${auditExit(counts, true) ? 'BLOCKED' : 'PASS'}`,
  '',
  rows.length ? '| severity | package | advisory |\n| --- | --- | --- |\n' + rows.join('\n') : 'No known vulnerabilities.',
  '',
].join('\n');
mkdirSync('reports', { recursive: true });
writeFileSync('reports/summary.md', md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
process.exitCode = auditExit(counts, process.env.N99_STRICT_AUDIT === '1');
