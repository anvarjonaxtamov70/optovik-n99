import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const reports = resolve(root, 'reports');
mkdirSync(reports, { recursive: true });
let failed = false;
let summary = '# Dependency security\n\n';

for (const [name, directory] of [['mobile', root], ['server', resolve(root, 'functions')]]) {
  const result = spawnSync('npm', ['audit', '--package-lock-only', '--omit=dev', '--json', '--audit-level=high'], { cwd: directory, encoding: 'utf8' });
  writeFileSync(resolve(reports, `${name}.json`), result.stdout || '{}');
  const report = JSON.parse(result.stdout || '{}');
  const vulns = Object.entries(report.vulnerabilities || {}).filter(([pkg, v]) => pkg !== '@expo/ngrok' && pkg !== 'ngrok' && !(v.nodes || []).every(n => n.includes('ngrok')));
  const high = vulns.filter(([, v]) => v.severity === 'high' || v.severity === 'critical');
  summary += `## ${name}: ${high.length} runtime high/critical\n\n`;
  if (high.length > 0) failed = true;
}

writeFileSync(resolve(reports, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
process.exitCode = failed ? 1 : 0;
