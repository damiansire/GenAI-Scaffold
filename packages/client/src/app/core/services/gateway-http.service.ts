import { Injectable, inject } from '@angular/core';
import { API_CONFIG } from '../tokens/api-config';

/**
 * The ONE place raw `fetch` is allowed to talk to the gateway.
 *
 * `apiKeyInterceptor` only covers the `HttpClient` path, so every feature that
 * reached for `fetch` directly (streaming, and five plain POSTs) shipped without
 * `X-API-Key` against a fail-closed gateway: a guaranteed 401. Duplicating the
 * header at each call site is what let them drift apart, so the header and the
 * base URL live here and every network call goes through this service.
 *
 * `path` is relative to the gateway base URL (`/tools/search`, not the full URL)
 * so no call site can accidentally send the key to a third-party host.
 */
/** `RequestInit` with headers pinned to a plain record. */
export type GatewayRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

@Injectable({ providedIn: 'root' })
export class GatewayHttpService {
  private readonly apiConfig = inject(API_CONFIG);

  /**
   * Same condition as the interceptor: only attach the key when there is one.
   * A plain record (not a `Headers` instance) so the outgoing header set stays
   * directly inspectable by callers and tests.
   */
  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    if (this.apiConfig.apiKey) {
      headers['X-API-Key'] = this.apiConfig.apiKey;
    }
    return headers;
  }

  /** Absolute URL for a gateway-relative path. */
  url(path: string): string {
    return `${this.apiConfig.baseUrl}${path}`;
  }

  /**
   * Authenticated `fetch` against the gateway. Returns the raw Response so
   * callers keep full control (streaming bodies included).
   */
  fetch(path: string, init: GatewayRequestInit = {}): Promise<Response> {
    return fetch(this.url(path), { ...init, headers: this.authHeaders(init.headers) });
  }

  /** Authenticated JSON POST; the JSON content type is set here, not per caller. */
  postJson(path: string, body: unknown, init: GatewayRequestInit = {}): Promise<Response> {
    const headers = this.authHeaders(init.headers);
    headers['Content-Type'] = 'application/json';
    return fetch(this.url(path), {
      ...init,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  /** Authenticated JSON PUT. */
  putJson(path: string, body: unknown, init: GatewayRequestInit = {}): Promise<Response> {
    const headers = this.authHeaders(init.headers);
    headers['Content-Type'] = 'application/json';
    return fetch(this.url(path), {
      ...init,
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  }
}
