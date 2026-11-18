import { describe, expect, it } from 'vitest';

import { evaluateAudit } from './dependency-audit.mjs';

const url = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const node = 'node_modules/picomatch';
const beforeExpiry = Date.parse('2026-11-18T00:00:00Z');
const packages = { [node]: { version: '4.0.7' } };
const report = (extra = []) => ({
  auditReportVersion: 2,
  vulnerabilities: {
    picomatch: {
      name: 'picomatch',
      severity: 'high',
      nodes: [node],
      via: [{ severity: 'high', url }, ...extra],
    },
    vite: { name: 'vite', severity: 'high', via: ['picomatch'] },
  },
});

describe('temporary dependency audit exception', () => {
  it('accepts the approved advisory and its inherited findings', () => {
    expect(evaluateAudit(report(), packages, beforeExpiry)).toEqual({
      blockers: [],
      exceptionApplied: true,
    });
  });

  it('keeps an unrelated high advisory in the same dependency chain blocking', () => {
    const unrelated = 'https://github.com/advisories/GHSA-test-test-test';
    expect(
      evaluateAudit(
        report([{ severity: 'high', url: unrelated }]),
        packages,
        beforeExpiry,
      ).blockers,
    ).toEqual([unrelated]);
  });

  it('blocks the advisory from the expiry instant onward', () => {
    expect(
      evaluateAudit(report(), packages, Date.parse('2026-12-02T00:00:00Z'))
        .blockers,
    ).toEqual([url]);
  });

  it('blocks a version outside the approved lockfile scope', () => {
    expect(
      evaluateAudit(report(), { [node]: { version: '4.0.6' } }, beforeExpiry)
        .blockers,
    ).toEqual([url]);
  });

  it('blocks a critical report of the same advisory', () => {
    const critical = report();
    critical.vulnerabilities.picomatch.via[0].severity = 'critical';
    expect(evaluateAudit(critical, packages, beforeExpiry).blockers).toEqual([
      url,
    ]);
  });

  it('fails closed on an npm failure or an incomplete report', () => {
    expect(() =>
      evaluateAudit({ error: {} }, packages, beforeExpiry),
    ).toThrow();
    const broken = report();
    broken.vulnerabilities.vite.via = ['missing-dependency'];
    expect(() => evaluateAudit(broken, packages, beforeExpiry)).toThrow();
  });
});
