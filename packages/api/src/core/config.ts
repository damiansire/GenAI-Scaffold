export const config = {
  env: process.env['NODE_ENV'] || 'development',
  isDevelopment: process.env['NODE_ENV'] === 'development',
  isProduction: process.env['NODE_ENV'] === 'production',
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    // Defaults cover both the Angular dev server (ng serve :4200) and the
    // containerized client (compose maps it to :8080). Override via ALLOWED_ORIGINS.
    allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || [
      'http://localhost:4200',
      'http://localhost:8080',
    ],
  },
  /**
   * Load limits are EXPLICIT, named config fields (never implicit constants
   * duplicated per call site): `server.ts` wires the limiters from here and
   * `/api/user/quota` reports against the same numbers, so the dashboard can
   * never drift from the budget actually enforced.
   */
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000', 10),
    maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
    maxTokens: parseInt(process.env['RATE_LIMIT_MAX_TOKENS'] || '50000', 10),
  },
};
