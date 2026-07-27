// Integration test for two authorization boundaries that Express middleware
// alone does not cover:
//   - POST /api/tools/register writes definitions that are injected verbatim
//     into the LLM context, so it must require the `admin` permission.
//   - The WebSocket upgrade never passes through Express, so it needs its own
//     API-key and Origin checks or it is an anonymous, cross-site-reachable
//     socket.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';

const READ_KEY = 'authz-itest-read';
const ADMIN_KEY = 'authz-itest-admin';

process.env['DB_PATH'] = ':memory:';
process.env['PORT'] = '0';
process.env['NODE_ENV'] = 'test';
process.env['ALLOWED_ORIGINS'] = 'http://localhost:4200';
process.env['API_KEY_1'] = `${READ_KEY}:read,write`;
process.env['API_KEY_2'] = `${ADMIN_KEY}:read,write,admin`;

const { Server } = await import('./server.ts');

const NO_KEEPALIVE = { connection: 'close' } as const;

/**
 * Performs a raw WebSocket handshake and resolves with the status line the
 * server replied with (e.g. "HTTP/1.1 401 Unauthorized").
 */
function upgradeStatusLine(port: number, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      const lines = [
        'GET /api/ws HTTP/1.1',
        `Host: 127.0.0.1:${port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version: 13',
        ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
        '',
        '',
      ];
      socket.write(lines.join('\r\n'));
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('handshake timed out'));
    });
    socket.once('data', (chunk) => {
      const statusLine = chunk.toString('utf8').split('\r\n')[0] ?? '';
      socket.destroy();
      resolve(statusLine);
    });
    socket.once('error', reject);
  });
}

describe('Authorization boundaries', () => {
  let server: InstanceType<typeof Server>;
  let base: string;
  let port: number;

  before(async () => {
    server = new Server();
    await server.start();
    port = server.getPort() as number;
    base = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await server.stop();
  });

  const registerBody = JSON.stringify({
    name: 'itest_tool',
    description: 'registered from a test',
    schema: { type: 'object', properties: {} },
  });

  it('rejects POST /api/tools/register from a key without the admin permission', async () => {
    const res = await fetch(`${base}/api/tools/register`, {
      method: 'POST',
      headers: { ...NO_KEEPALIVE, 'content-type': 'application/json', 'x-api-key': READ_KEY },
      body: registerBody,
    });
    assert.equal(res.status, 403, 'a read/write key must not rewrite tool definitions');
  });

  it('accepts POST /api/tools/register from an admin key', async () => {
    const res = await fetch(`${base}/api/tools/register`, {
      method: 'POST',
      headers: { ...NO_KEEPALIVE, 'content-type': 'application/json', 'x-api-key': ADMIN_KEY },
      body: registerBody,
    });
    assert.equal(res.status, 201, 'the admin path still works');
  });

  it('rejects a WebSocket upgrade with no API key', async () => {
    assert.match(await upgradeStatusLine(port, {}), /401/);
  });

  it('rejects a WebSocket upgrade with an invalid API key', async () => {
    assert.match(await upgradeStatusLine(port, { 'X-API-Key': 'not-a-key' }), /401/);
  });

  it('rejects a WebSocket upgrade from a disallowed Origin', async () => {
    const status = await upgradeStatusLine(port, {
      'X-API-Key': READ_KEY,
      Origin: 'https://evil.example',
    });
    assert.match(status, /403/);
  });

  it('completes the handshake for an authenticated, allowed Origin', async () => {
    const status = await upgradeStatusLine(port, {
      'X-API-Key': READ_KEY,
      Origin: 'http://localhost:4200',
    });
    assert.match(status, /101/);
  });
});
