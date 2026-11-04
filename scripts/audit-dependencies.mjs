import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const reports = resolve(root, 'reports');
mkdirSync(reports, { recursive: true });
let failed = false;
let summary = '# Dependency security\n\n';

for (const [name, directory] of [['mobile', root], ['server', resolve(root, 'functions')]]) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['audit', '--json', '--audit-level=high'],
    { cwd: directory, encoding: 'utf8', timeout: 180_000, maxBuffer: 10 * 1024 * 1024, shell: process.platform === 'win32' });
  writeFileSync(resolve(reports, `${name}.json`), result.stdout || '{}');
  try {
    const report = JSON.parse(result.stdout);
    if (result.error || ![0, 1].includes(result.status) || report.error ||
      !report.metadata?.vulnerabilities || !report.vulnerabilities) {
      throw new Error('Registry audit did not return a valid report.');
    }
    const counts = report.metadata.vulnerabilities;
    if (!Number.isInteger(counts.high) || !Number.isInteger(counts.critical)) {
      throw new Error('Registry audit severity counts are missing.');
    }
    const lock = JSON.parse(readFileSync(resolve(directory, 'package-lock.json'), 'utf8'));
    summary += `## ${name}\n\n${JSON.stringify(counts)}\n\n`;
    console.log(`${name}: ${JSON.stringify(counts)}`);
    for (const [pkg, finding] of Object.entries(report.vulnerabilities)) {
      const installed = [...new Set(finding.nodes.map(path => lock.packages[path]?.version ?? 'unknown'))].join(', ');
      const advisories = finding.via.filter(item => typeof item === 'object');
      const detail = { package: pkg, installed, severity: finding.severity,
        direct: finding.isDirect, range: finding.range, fix: finding.fixAvailable,
        via: finding.via.map(item => typeof item === 'string' ? item : { title: item.title, url: item.url, range: item.range }) };
      console.log(JSON.stringify(detail));
      summary += `- **${pkg}** (${installed}): ${finding.severity}. ${advisories.map(item => item.url).join(' ')}\n`;
    }
    if (counts.high > 0 || counts.critical > 0) failed = true;
  } catch (error) {
    failed = true;
    console.error(`${name}: ${error.message}`);
    summary += `## ${name}\n\nAudit unavailable; the check fails closed.\n`;
  }
  summary += '\n';
}

summary += 'High/critical findings block this check. Moderate/low findings remain visible for review. This audit covers locked npm packages, not app logic, device testing, or signing.\n';
writeFileSync(resolve(reports, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
process.exitCode = failed ? 1 : 0;
