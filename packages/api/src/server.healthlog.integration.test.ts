// Integration test: health probes are served but NOT persisted to request_logs.
//
// Liveness/readiness probes fire every few seconds forever; until this was
// excluded, every probe paid a synchronous SQLite write on the event loop and
// grew request_logs without bound.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env['DB_PATH'] = ':memory:';
process.env['PORT'] = '0';
process.env['NODE_ENV'] = 'test';
process.env['API_KEY_1'] = 'healthlog-itest:read';

const { Server } = await import('./server.ts');
const { getRecentLogs } = await import('./infrastructure/database/db.ts');
const { shutdownWorkerPools } = await import('./infrastructure/workers/workerPool.ts');

describe('Request logging — health probes are not persisted', () => {
  let server: InstanceType<typeof Server>;
  let base: string;

  before(async () => {
    server = new Server();
    await server.start();
    base = `http://127.0.0.1:${server.getPort()}`;
  });

  after(async () => {
    await server.stop();
    await shutdownWorkerPools();
  });

  it('persists ordinary API requests but not /health/*', async () => {
    await fetch(`${base}/health/live`, { headers: { connection: 'close' } });
    await fetch(`${base}/api/info`, { headers: { connection: 'close' } });

    // The write happens in res.on('finish'); yield once so it has run.
    await new Promise((resolve) => setImmediate(resolve));

    const paths = (getRecentLogs(50) as Array<{ path: string }>).map((row) => row.path);
    assert.ok(paths.includes('/api/info'), 'ordinary requests keep being persisted');
    assert.ok(
      !paths.some((p) => p.startsWith('/health')),
      `health probes must not be persisted, got: ${paths.join(', ')}`,
    );
  });
});
