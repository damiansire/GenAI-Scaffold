// Integration test for the SSE emitter: boots the REAL composed app, registers a
// fake plugin whose output text is known byte-for-byte, POSTs to
// /api/models/:id/stream and reconstructs the text with the SAME record parsing
// the Angular client does (split on the blank line, take `data:` lines,
// JSON.parse, concatenate `.text`).
//
// Why this file exists: the wire contract was only ever checked against
// hand-written fixtures on the client, and the two had already diverged — the
// server double-escaped newlines and streamed the whole ModelOutput envelope
// instead of the model's text.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from '../../server.ts';
import { modelFactory } from '../../infrastructure/ai/factory.ts';
import { schemaRegistry } from '../../infrastructure/ai/registry.ts';
import { shutdownWorkerPools } from '../../infrastructure/workers/workerPool.ts';

const VALID_KEY = 'stream-itest-key';
const FAKE_MODEL_ID = 'itest-echo';
const TEXTLESS_MODEL_ID = 'itest-textless';

// Deliberately adversarial for SSE framing: single newlines, a BLANK line (the
// SSE record separator) and a colon-prefixed line (an SSE comment).
const MODEL_TEXT = ['Line one', 'Line two', '', ': not a comment, just text', 'final line'].join(
  '\n',
);

/**
 * Reconstructs the streamed text exactly like the client's `handleSseRecord`.
 * Returns the concatenated text and whether the `[DONE]` sentinel arrived.
 */
function parseSseBody(body: string): { text: string; done: boolean } {
  let text = '';
  let done = false;

  for (const record of body.split('\n\n')) {
    if (!record.trim()) continue;
    const dataLines: string[] = [];
    for (const line of record.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) continue;

    const dataStr = dataLines.join('\n').trim();
    if (dataStr === '[DONE]') {
      done = true;
      continue;
    }
    const parsed = JSON.parse(dataStr) as { text?: string };
    if (typeof parsed.text === 'string') text += parsed.text;
  }

  return { text, done };
}

describe('POST /api/models/:id/stream — SSE wire contract', () => {
  let server: Server;
  let base: string;

  before(async () => {
    process.env['DB_PATH'] = ':memory:';
    process.env['PORT'] = '0';
    process.env['NODE_ENV'] = 'test';
    process.env['API_KEY_1'] = `${VALID_KEY}:read,write`;

    // A plugin returns the ModelOutput envelope `{ result, metadata }` — the
    // shape the controller must reach into to find the text.
    modelFactory.register(FAKE_MODEL_ID, () => ({
      process: async () => ({
        result: { text: MODEL_TEXT },
        metadata: { usageMetadata: { totalTokenCount: 0 } },
      }),
    }));
    schemaRegistry.register(FAKE_MODEL_ID, {
      type: 'object',
      properties: { prompt: { type: 'string' } },
      required: ['prompt'],
    });

    // A plugin that produces no text at all: must surface an explicit error
    // frame, never a JSON envelope disguised as the model's answer.
    modelFactory.register(TEXTLESS_MODEL_ID, () => ({
      process: async () => ({
        result: { imageUrl: 'https://example.invalid/x.png' },
        metadata: {},
      }),
    }));
    schemaRegistry.register(TEXTLESS_MODEL_ID, {
      type: 'object',
      properties: { prompt: { type: 'string' } },
      required: ['prompt'],
    });

    server = new Server();
    await server.start();
    base = `http://127.0.0.1:${server.getPort()}`;
  });

  after(async () => {
    await server.stop();
    // The safety firewall spawns worker threads; without this the process keeps
    // a live handle and the runner never exits.
    await shutdownWorkerPools();
  });

  it('reconstructs the model text byte for byte, newlines included', async () => {
    const res = await fetch(`${base}/api/models/${FAKE_MODEL_ID}/stream`, {
      method: 'POST',
      headers: {
        connection: 'close',
        'content-type': 'application/json',
        'x-api-key': VALID_KEY,
      },
      body: JSON.stringify({ prompt: 'hello' }),
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);

    const { text, done } = parseSseBody(await res.text());

    assert.ok(done, 'the stream must terminate with the [DONE] sentinel');
    assert.equal(text, MODEL_TEXT, 'streamed text must equal the plugin output exactly');
    assert.ok(!text.includes('\\n'), 'newlines must not arrive double-escaped');
    assert.ok(!text.includes('"metadata"'), 'the ModelOutput envelope must never be streamed');
  });

  it('emits an explicit error frame when the plugin returns no text', async () => {
    const res = await fetch(`${base}/api/models/${TEXTLESS_MODEL_ID}/stream`, {
      method: 'POST',
      headers: {
        connection: 'close',
        'content-type': 'application/json',
        'x-api-key': VALID_KEY,
      },
      body: JSON.stringify({ prompt: 'hello' }),
    });

    const body = await res.text();
    assert.match(body, /event: error/, 'a textless plugin must produce an error frame');
    assert.ok(
      !body.includes('imageUrl'),
      'the raw plugin envelope must not be streamed as model text',
    );
  });
});
