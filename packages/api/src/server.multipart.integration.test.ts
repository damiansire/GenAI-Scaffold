// Integration test for the MULTIPART (multimodal) invoke path, over real HTTP.
//
// The regression pinned here: multer (`upload.any()`) leaves files in
// `req.files` and never touches `req.body`, but the model schema requires the
// file field IN the body and the plugin reads it from `params.<fieldName>`.
// Until the route bridged the two, every real upload was rejected with a
// validation 400 — and even without the schema requirement the plugin would
// have received no file at all.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const KEY = 'multipart-itest';
const MODEL_ID = 'itest-vision';

process.env['DB_PATH'] = ':memory:';
process.env['PORT'] = '0';
process.env['NODE_ENV'] = 'test';
process.env['API_KEY_1'] = `${KEY}:read,write`;

// Imported after the env is set: `config` snapshots these values at load time.
const { Server } = await import('./server.ts');
const { modelFactory } = await import('./infrastructure/ai/factory.ts');
const { schemaRegistry } = await import('./infrastructure/ai/registry.ts');
const { shutdownWorkerPools } = await import('./infrastructure/workers/workerPool.ts');

const NO_KEEPALIVE = { connection: 'close' } as const;

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

describe('Multimodal invoke — the uploaded file reaches the plugin', () => {
  let server: InstanceType<typeof Server>;
  let base: string;

  before(async () => {
    // Same contract as google-vision-ocr: the schema REQUIRES a binary field
    // and the strategy reads it from params.<fieldName>. The process() echoes
    // what it received so the assertions inspect the real end-to-end payload.
    modelFactory.register(MODEL_ID, () => ({
      process: async (params: { imageFile?: UploadedFile; prompt?: string }) => ({
        result: {
          receivedFile: Boolean(params.imageFile && params.imageFile.buffer?.length),
          originalname: params.imageFile?.originalname ?? null,
          mimetype: params.imageFile?.mimetype ?? null,
          size: params.imageFile?.size ?? 0,
        },
        metadata: {},
      }),
    }));
    schemaRegistry.register(MODEL_ID, {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        imageFile: { type: 'string', format: 'binary' },
      },
      required: ['imageFile'],
      additionalProperties: true,
    });

    server = new Server();
    await server.start();
    base = `http://127.0.0.1:${server.getPort()}`;
  });

  after(async () => {
    await server.stop();
    await shutdownWorkerPools();
  });

  it('delivers the multipart file to the plugin under its declared field name', async () => {
    const pixels = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    const form = new FormData();
    form.set('prompt', 'describe this image');
    form.set('imageFile', new Blob([pixels], { type: 'image/png' }), 'photo.png');

    const res = await fetch(`${base}/api/models/${MODEL_ID}/invoke`, {
      method: 'POST',
      headers: { ...NO_KEEPALIVE, 'x-api-key': KEY },
      body: form,
    });

    assert.equal(res.status, 200, 'a well-formed upload must not be rejected');
    const body = (await res.json()) as {
      success: boolean;
      data: {
        result: { receivedFile: boolean; originalname: string; mimetype: string; size: number };
      };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.result.receivedFile, true, 'the plugin must receive the file buffer');
    assert.equal(body.data.result.originalname, 'photo.png');
    assert.equal(body.data.result.mimetype, 'image/png');
    assert.equal(body.data.result.size, pixels.length);
  });

  it('still rejects a multipart request that omits the required file (400)', async () => {
    const form = new FormData();
    form.set('prompt', 'no file attached');

    const res = await fetch(`${base}/api/models/${MODEL_ID}/invoke`, {
      method: 'POST',
      headers: { ...NO_KEEPALIVE, 'x-api-key': KEY },
      body: form,
    });

    assert.equal(res.status, 400, 'the schema requirement on the file field still gates');
  });
});
