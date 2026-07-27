export const environment = {
  production: true,
  // Same-origin by default: the production deployment fronts the gateway with a
  // reverse proxy, so no absolute localhost URL gets baked into the bundle.
  apiUrl: '/api',
  // NEVER a key here. A browser bundle is public, so any key compiled into it is
  // published with the app; the proxy injects `X-API-Key` server-side. The dev
  // build keeps a local key in `environment.ts` so `ng serve` can authenticate
  // against the fail-closed gateway.
  apiKey: '',
};
