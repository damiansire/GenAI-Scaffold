import { Router, Request, Response, RequestHandler } from 'express';
import { logger } from '../../core/logger.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { config } from '../../core/config.js';
import type { TokenStore } from '../../core/interfaces/TokenStore.js';

/**
 * Shape returned by GET /api/user/quota — the Token Dashboard contract.
 */
export interface QuotaView {
  tenantId: string;
  maxTokens: number;
  availableTokens: number;
  usedTokens: number;
  windowMs: number;
  usagePercentage: number;
}

/**
 * Derives the quota view from the tokens ALREADY CONSUMED in the current window.
 *
 * The `rate_limit_tokens.tokens` column counts consumption, not remaining
 * budget: reporting it as `availableTokens` inverted the dashboard (2% spent
 * rendered as 98% used). Pure on purpose so the accounting is unit-tested
 * without HTTP.
 */
export function buildQuotaView(
  tenantId: string,
  consumedTokens: number,
  maxTokens: number,
  windowMs: number,
): QuotaView {
  const used = Math.max(0, Math.min(consumedTokens, maxTokens));
  return {
    tenantId,
    maxTokens,
    availableTokens: maxTokens - used,
    usedTokens: used,
    windowMs,
    usagePercentage: maxTokens > 0 ? Math.round((used / maxTokens) * 100) : 0,
  };
}

/**
 * User routes (token quota dashboard).
 *
 * Security (P1 fix): behind `apiKeyAuth`, and the quota identifier is the
 * authenticated key identity — never a hardcoded `'default-tenant'`, so each
 * caller only ever sees their own usage.
 *
 * The route reads through the SAME `TokenStore` abstraction the limiter writes
 * to (window handling included), instead of re-implementing its query in raw
 * SQL — that duplication is what let the two drift apart.
 */
export const createUserRoutes = (
  tokenStore: TokenStore,
  postAuthChain: RequestHandler[] = [],
): Router => {
  const router = Router();

  router.use(apiKeyAuth, ...postAuthChain);

  // GET /api/user/quota — Token Dashboard (scoped to the authenticated key)
  router.get('/quota', async (req: Request, res: Response) => {
    try {
      const identifier = req.user?.apiKeyId;
      if (!identifier) {
        res.status(401).json({ error: 'Authenticated identity is required.' });
        return;
      }

      const { maxTokens, windowMs } = config.rateLimit;
      const consumed = await tokenStore.getConsumedTokens(identifier, windowMs);

      res.json(buildQuotaView(identifier, consumed, maxTokens, windowMs));
    } catch (err) {
      logger.error(
        'Failed to fetch user quota',
        {},
        err instanceof Error ? err : new Error(String(err)),
      );
      res.status(500).json({ error: 'Failed to fetch user quota' });
    }
  });

  return router;
};
