// npm audit exits 1 when findings exist. A failed or incomplete audit is not a clean report.
export function parseAudit(raw) {
  const report = JSON.parse(raw);
  const counts = report?.metadata?.vulnerabilities;
  const levels = ['info','low','moderate','high','critical'];
  if (report?.error || !counts || !report.vulnerabilities || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities) || !levels.every(k => Number.isSafeInteger(counts[k]) && counts[k] >= 0)) throw new Error('Invalid npm audit report');
  const actual = Object.fromEntries(levels.map(k=>[k,0]));
  for (const v of Object.values(report.vulnerabilities)) {
    if (!v || !levels.includes(v.severity) || !Array.isArray(v.via)) throw new Error('Invalid npm audit finding');
    actual[v.severity]++;
  }
  if (!levels.every(k=>counts[k]===actual[k]) || counts.total !== levels.reduce((n,k)=>n+counts[k],0)) throw new Error('Incomplete npm audit report');
  return report;
}
export function auditExit(counts, strict=false) {
  return counts.critical > 0 || (strict && counts.high > 0) ? 1 : 0;
}
