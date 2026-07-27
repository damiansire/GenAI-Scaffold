import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Executable architecture gate (AGENTS.md: "Ninguna llamada de red sale fuera de
 * la capa de fetching declarada. Cero `fetch(` crudo en features").
 *
 * This is the regression net for a bug that shipped: five features called
 * `fetch` directly, none of them attached `X-API-Key`, and every one of them
 * 401'd against the fail-closed gateway. A grep is what makes the rule a fact
 * instead of a convention.
 */

const SRC_ROOT = join(process.cwd(), 'src');

/** The single module allowed to call `fetch`, plus test files. */
const FETCH_ALLOWLIST = ['app/core/services/gateway-http.service.ts'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Strips block and line comments so prose like "remote schema fetch (…)" in a
 * doc comment is not mistaken for a call.
 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Repo-relative, forward-slashed path for stable assertions across platforms. */
function rel(file: string): string {
  return relative(SRC_ROOT, file).split(sep).join('/');
}

describe('network access is confined to the gateway service', () => {
  const files = sourceFiles(SRC_ROOT);

  it('finds source files to scan (the gate is not vacuously green)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('no module other than GatewayHttpService calls fetch()', () => {
    const offenders = files.filter((file) => {
      if (FETCH_ALLOWLIST.includes(rel(file))) return false;
      return /(^|[^.\w])fetch\s*\(/.test(code(file));
    });

    expect(offenders.map(rel)).toEqual([]);
  });

  it('no module opens an EventSource (it cannot send X-API-Key)', () => {
    const offenders = files.filter((file) => /new\s+EventSource\s*\(/.test(code(file)));

    expect(offenders.map(rel)).toEqual([]);
  });
});
