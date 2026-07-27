// Stability: 1 - Experimental (node:test)
//
// Contract suite for the TokenStore implementations. The point is NOT to test
// SQLite: it is to run the SAME contract against the store that is actually
// deployed (SqliteTokenStore) and not only against a hand-written fake. The
// previous suite proved "fail-closed" with a fake that throws, while the real
// store swallowed every DB error and therefore failed OPEN — the exact gap this
// file closes.
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { dbService } from '../database/db.js';
import { InMemoryTokenStore } from './InMemoryTokenStore.js';
import { SqliteTokenStore } from './SqliteTokenStore.js';
import { tokenRateLimiter } from '../../api/middleware/tokenRateLimiter.js';
import type { TokenStore } from '../../core/interfaces/TokenStore.js';

const WINDOW_MS = 60_000;

describe('TokenStore contract (every implementation)', () => {
  before(() => {
    process.env['DB_PATH'] = ':memory:';
    dbService.initialize();
  });

  after(() => {
    dbService.close();
  });

  const implementations: Array<[string, () => TokenStore]> = [
    ['InMemoryTokenStore', () => new InMemoryTokenStore()],
    ['SqliteTokenStore', () => new SqliteTokenStore()],
  ];

  for (const [name, make] of implementations) {
    describe(name, () => {
      it('reports 0 consumed tokens for an unknown identifier', async () => {
        const store = make();
        assert.equal(await store.getConsumedTokens(`unknown-${name}`, WINDOW_MS), 0);
      });

      it('accumulates consumption within the same window', async () => {
        const store = make();
        const id = `acc-${name}`;
        await store.consume(id, 100, WINDOW_MS);
        await store.consume(id, 250, WINDOW_MS);
        assert.equal(await store.getConsumedTokens(id, WINDOW_MS), 350);
      });

      it('starts a fresh budget once the window has expired', async () => {
        const store = make();
        const id = `expired-${name}`;
        // 1ms window, then wait past it: the next read must see a fresh budget.
        await store.consume(id, 500, 1);
        await new Promise((resolve) => setTimeout(resolve, 15));
        assert.equal(await store.getConsumedTokens(id, 1), 0);
      });
    });
  }
});

describe('SqliteTokenStore fails CLOSED when the database is unavailable', () => {
  before(() => {
    process.env['DB_PATH'] = ':memory:';
    dbService.initialize();
    // Drop the connection: prepared statements are nulled, so every store call
    // hits the "not initialized" path. This is the real-world DB outage.
    dbService.close();
  });

  it('getConsumedTokens rejects instead of reporting 0 consumed', async () => {
    const store = new SqliteTokenStore();
    await assert.rejects(() => store.getConsumedTokens('any', WINDOW_MS), /not initialized/);
  });

  it('consume rejects instead of silently dropping the budget write', async () => {
    const store = new SqliteTokenStore();
    await assert.rejects(() => store.consume('any', 10, WINDOW_MS), /not initialized/);
  });

  it('tokenRateLimiter denies with 503 when the real store is down (no next())', async () => {
    const statusCalls: number[] = [];
    const req = {
      user: { apiKeyId: 'k1', authenticated: true },
      ip: '127.0.0.1',
      path: '/api/models/x/invoke',
    } as unknown as Request;
    const res = {
      locals: {} as Record<string, unknown>,
      status(code: number) {
        statusCalls.push(code);
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response;
    const next = mock.fn<NextFunction>();

    await tokenRateLimiter(new SqliteTokenStore(), {
      windowMs: WINDOW_MS,
      maxTokens: 50_000,
    })(req, res, next);

    assert.equal(next.mock.callCount(), 0, 'a DB outage must NOT let the request through');
    assert.deepEqual(statusCalls, [503]);
  });
});
