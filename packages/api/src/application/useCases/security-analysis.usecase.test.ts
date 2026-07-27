// Stability: 1 - Experimental (node:test)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { securityAnalysisUseCase, MAX_SCANNED_LINE_CHARS } from './security-analysis.usecase.js';

describe('SecurityAnalysisUseCase — detection still works', () => {
  it('flags SQL injection as CRITICAL', async () => {
    const report = await securityAnalysisUseCase.execute(
      'GET /items?id=1 UNION SELECT password FROM users\nGET /ok HTTP/1.1 200',
    );
    const sqli = report.threats.find((t) => t.category === 'SQL Injection');
    assert.ok(sqli, 'a union select payload must be detected');
    assert.equal(sqli?.severity, 'CRITICAL');
    assert.equal(report.overallSeverity, 'CRITICAL');
  });

  it('flags SSH brute force and reports the matching evidence line', async () => {
    const line = 'Failed password for invalid user root from 10.0.0.9:22 ssh2';
    const report = await securityAnalysisUseCase.execute([line, line, 'all quiet'].join('\n'));
    const brute = report.threats.find((t) => t.category === 'Brute Force');
    assert.ok(brute, 'repeated ssh auth failures must be detected');
    assert.equal(brute?.evidence[0], line);
  });

  it('reports INFO and no threats on clean logs', async () => {
    const report = await securityAnalysisUseCase.execute('service started\nservice healthy');
    assert.equal(report.threats.length, 0);
    assert.equal(report.overallSeverity, 'INFO');
    assert.equal(report.riskScore, 0);
  });
});

describe('SecurityAnalysisUseCase — no catastrophic backtracking (ReDoS)', () => {
  // The reproducer: one giant line with no newline, crafted for the
  // `POST … \d{6,} … bytes` pattern. Before bounding the wildcards this class of
  // payload took tens of seconds on the event loop for a few KB, and the route
  // accepts up to 500 KB.
  const buildPayload = (chars: number) => 'POST ' + '1234567890'.repeat(Math.ceil(chars / 10));

  it('analyzes a 500 KB single-line payload in well under a second', async () => {
    const start = performance.now();
    const report = await securityAnalysisUseCase.execute(buildPayload(500_000));
    const elapsed = performance.now() - start;

    assert.ok(report.analysisId.length > 0, 'the analysis completes and returns a report');
    assert.ok(
      elapsed < 1_000,
      `a 500KB adversarial line must not block the event loop (took ${Math.round(elapsed)}ms)`,
    );
  });

  it('scales linearly, not quadratically, with payload size', async () => {
    const time = async (chars: number) => {
      const start = performance.now();
      await securityAnalysisUseCase.execute(buildPayload(chars));
      return performance.now() - start;
    };

    const small = await time(50_000);
    const large = await time(400_000);

    // 8x the input must not cost anywhere near 64x the time (the quadratic
    // signature). A generous 16x ceiling still fails loudly on a regression.
    assert.ok(
      large < Math.max(50, small * 16),
      `8x input took ${Math.round(large)}ms vs ${Math.round(small)}ms: looks super-linear`,
    );
  });

  it('caps how much of a single line is scanned', async () => {
    const marker = 'union select';
    // The injection marker sits far beyond the scan limit, so it must NOT be
    // reported: the cap is a real, observable limit, not a comment.
    const line = 'x'.repeat(MAX_SCANNED_LINE_CHARS + 500) + ' ' + marker;
    const report = await securityAnalysisUseCase.execute(line);

    assert.equal(
      report.threats.find((t) => t.category === 'SQL Injection'),
      undefined,
      'content past MAX_SCANNED_LINE_CHARS is not scanned',
    );
  });
});
