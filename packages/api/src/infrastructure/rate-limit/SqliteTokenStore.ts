import { TokenStore } from '../../core/interfaces/TokenStore.js';
import { updateRateLimitTokenOrThrow, getRateLimitTokenOrThrow } from '../database/db.js';

/**
 * SQLite-based Token Store for Rate Limiting.
 * Built-in over dependencies: uses local SQLite to persist budgets across deployments.
 *
 * Fail-closed by construction: every DB call uses the `*OrThrow` variants, so a
 * storage failure surfaces as a rejected promise and `tokenRateLimiter` denies
 * the request with 503. The swallowing variants (`getRateLimitToken` /
 * `updateRateLimitToken`) would report "no consumption recorded", which the
 * limiter cannot distinguish from "under budget" — that is the fail-OPEN hole
 * this class must never reintroduce.
 */
export class SqliteTokenStore implements TokenStore {
  public async consume(identifier: string, tokens: number, windowMs: number): Promise<void> {
    const now = Date.now();
    const record = getRateLimitTokenOrThrow(identifier);

    if (!record || now > parseInt(record.lastRefill, 10)) {
      updateRateLimitTokenOrThrow(identifier, tokens, (now + windowMs).toString());
      return;
    }

    updateRateLimitTokenOrThrow(identifier, record.tokens + tokens, record.lastRefill);
  }

  public async getConsumedTokens(identifier: string, _windowMs: number): Promise<number> {
    const now = Date.now();
    const record = getRateLimitTokenOrThrow(identifier);

    if (!record || now > parseInt(record.lastRefill, 10)) {
      return 0;
    }

    return record.tokens;
  }
}
