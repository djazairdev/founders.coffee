import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const exception = {
  name: 'picomatch',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  version: '4.0.7',
  expiresAt: '2026-12-02T00:00:00Z',
};

const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const isBlocking = (severity) => ['high', 'critical'].includes(severity);
const isAdvisory = (value) =>
  value && typeof value.url === 'string' && severities.includes(value.severity);

export const evaluateAudit = (report, packages, now) => {
  if (
    report?.auditReportVersion !== 2 ||
    report.error ||
    !report.vulnerabilities
  ) {
    throw new Error('npm did not return a valid advisory report');
  }

  const findings = Object.values(report.vulnerabilities);
  if (
    findings.some(
      ({ severity, via }) =>
        !severities.includes(severity) ||
        !Array.isArray(via) ||
        via.length === 0 ||
        via.some((entry) =>
          typeof entry === 'string'
            ? !Object.hasOwn(report.vulnerabilities, entry)
            : !isAdvisory(entry),
        ),
    )
  ) {
    throw new Error('npm returned incomplete advisory information');
  }

  const direct = findings.flatMap(({ name, via }) =>
    via
      .filter((entry) => typeof entry !== 'string')
      .map((entry) => ({ name, entry })),
  );
  const blocking = direct.filter(({ entry }) => isBlocking(entry.severity));
  if (
    !blocking.length &&
    findings.some(({ severity }) => isBlocking(severity))
  ) {
    throw new Error(
      'npm returned blocking findings without an underlying advisory',
    );
  }

  const affected = report.vulnerabilities[exception.name]?.nodes;
  const canApplyException =
    now < Date.parse(exception.expiresAt) &&
    Array.isArray(affected) &&
    affected.length > 0 &&
    affected.every(
      (path) =>
        path.endsWith('/picomatch') &&
        packages[path]?.version === exception.version,
    );
  return {
    blockers: blocking
      .filter(
        ({ name, entry }) =>
          !canApplyException ||
          name !== exception.name ||
          entry.severity !== 'high' ||
          entry.url !== exception.url,
      )
      .map(({ entry }) => entry.url),
    exceptionApplied:
      canApplyException &&
      blocking.some(
        ({ name, entry }) =>
          name === exception.name &&
          entry.severity === 'high' &&
          entry.url === exception.url,
      ),
  };
};

const runAudit = () => {
  const result = spawnSync('npm', ['audit', '--package-lock-only', '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error || ![0, 1].includes(result.status)) {
    throw result.error ?? new Error('npm audit failed to run');
  }
  const report = JSON.parse(result.stdout);
  const { packages } = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const { blockers, exceptionApplied } = evaluateAudit(
    report,
    packages,
    Date.now(),
  );
  if (exceptionApplied) {
    process.stderr.write(
      `::warning::Approved temporary exception for ${exception.url} on Picomatch ${exception.version} expires ${exception.expiresAt} (P1-018).\n`,
    );
  }
  if (blockers.length) {
    process.stderr.write(`Blocking advisories: ${blockers.join(', ')}\n`);
    process.exitCode = 1;
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runAudit();
}
