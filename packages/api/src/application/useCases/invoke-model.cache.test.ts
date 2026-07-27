// Stability: 1 - Experimental (node:test)
//
// The exact-match (Tier 2) response cache is keyed by a hash of the request.
// Until the caller identity was part of that hash, two tenants sending the same
// prompt shared one entry and the second one read the first one's answer.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { InvokeModelUseCase } from './invoke-model.usecase.js';
import { ModelFactory } from '../../infrastructure/ai/factory.js';
import { dbService } from '../../infrastructure/database/db.js';

const MODEL_ID = 'cache-probe';
const BODY = { messages: [{ role: 'user', content: 'what is the capital of Uruguay?' }] };

describe('InvokeModelUseCase — exact-match cache is scoped to the caller', () => {
  before(() => {
    process.env['DB_PATH'] = ':memory:';
    dbService.initialize();
  });

  after(() => {
    dbService.close();
  });

  it('does not serve tenant A the answer cached for tenant B', async () => {
    const factory = new ModelFactory();
    let calls = 0;
    factory.register(MODEL_ID, () => ({
      process: async () => {
        calls++;
        return { text: `answer #${calls}`, metadata: {} };
      },
    }));
    const useCase = new InvokeModelUseCase(factory);

    const first = await useCase.execute({
      modelId: MODEL_ID,
      body: structuredClone(BODY),
      context: { userId: 'tenant-a', apiKey: 'tenant-a' },
    });

    const otherTenant = await useCase.execute({
      modelId: MODEL_ID,
      body: structuredClone(BODY),
      context: { userId: 'tenant-b', apiKey: 'tenant-b' },
    });

    assert.equal(calls, 2, 'a different tenant must reach the model, not the shared cache');
    assert.notEqual(
      otherTenant.text,
      first.text,
      'tenant B must not receive the response generated for tenant A',
    );
    assert.notEqual(otherTenant.cached, true);
  });

  it('still caches within the SAME caller (the win is not lost)', async () => {
    const factory = new ModelFactory();
    let calls = 0;
    factory.register(MODEL_ID, () => ({
      process: async () => {
        calls++;
        return { text: 'stable answer', metadata: {} };
      },
    }));
    const useCase = new InvokeModelUseCase(factory);

    await useCase.execute({
      modelId: MODEL_ID,
      body: structuredClone(BODY),
      context: { userId: 'tenant-c', apiKey: 'tenant-c' },
    });
    const second = await useCase.execute({
      modelId: MODEL_ID,
      body: structuredClone(BODY),
      context: { userId: 'tenant-c', apiKey: 'tenant-c' },
    });

    assert.equal(calls, 1, 'the second identical call for the same tenant is a cache HIT');
    assert.equal(second.cached, true, 'a cache hit is marked for downstream metrics');
  });
});
