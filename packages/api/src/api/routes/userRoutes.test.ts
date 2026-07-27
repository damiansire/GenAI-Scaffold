// Stability: 1 - Experimental (node:test)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuotaView } from './userRoutes.js';
import { InMemoryTokenStore } from '../../infrastructure/rate-limit/InMemoryTokenStore.js';

const MAX = 50_000;
const WINDOW = 60_000;

describe('buildQuotaView — quota accounting', () => {
  it('reports nothing used on a fresh budget', () => {
    const view = buildQuotaView('key-1', 0, MAX, WINDOW);
    assert.equal(view.usedTokens, 0);
    assert.equal(view.availableTokens, MAX);
    assert.equal(view.usagePercentage, 0);
  });

  it('spending 2% of the budget reports 2% used, not 98%', () => {
    const view = buildQuotaView('key-1', 1_000, MAX, WINDOW);
    assert.equal(view.usedTokens, 1_000);
    assert.equal(view.availableTokens, 49_000);
    assert.equal(view.usagePercentage, 2);
  });

  it('clamps an over-budget identifier to the maximum (never negative available)', () => {
    const view = buildQuotaView('key-1', MAX + 10_000, MAX, WINDOW);
    assert.equal(view.usedTokens, MAX);
    assert.equal(view.availableTokens, 0);
    assert.equal(view.usagePercentage, 100);
  });
});

describe('quota view against the store the limiter actually writes to', () => {
  it('consuming N tokens makes the view report exactly N used', async () => {
    const store = new InMemoryTokenStore();
    await store.consume('key-1', 1_234, WINDOW);

    const consumed = await store.getConsumedTokens('key-1', WINDOW);
    const view = buildQuotaView('key-1', consumed, MAX, WINDOW);

    assert.equal(view.usedTokens, 1_234);
    assert.equal(view.availableTokens, MAX - 1_234);
  });

  it('an expired window resets the reported usage to zero', async () => {
    const store = new InMemoryTokenStore();
    await store.consume('key-1', 1_234, 1);
    await new Promise((resolve) => setTimeout(resolve, 15));

    const consumed = await store.getConsumedTokens('key-1', 1);
    assert.equal(buildQuotaView('key-1', consumed, MAX, 1).usedTokens, 0);
  });
});
