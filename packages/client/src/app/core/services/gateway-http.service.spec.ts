import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, type ApiConfig } from '../tokens/api-config';
import { GatewayHttpService } from './gateway-http.service';
import { AiOrchestratorService } from './ai-orchestrator.service';

const BASE_URL = 'http://localhost:3000/api';
const KEY = 'secret-key';

function configure<T>(token: new (...args: never[]) => T, config: Partial<ApiConfig> = {}): T {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: API_CONFIG, useValue: { baseUrl: BASE_URL, ...config } }],
  });
  return TestBed.inject(token);
}

function okJson() {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
  } as unknown as Response;
}

describe('GatewayHttpService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(okJson());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('prefixes the gateway base URL and attaches X-API-Key', async () => {
    const gateway = configure(GatewayHttpService, { apiKey: KEY });

    await gateway.fetch('/tools/search');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/tools/search`);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe(KEY);
  });

  it('omits the header when no key is configured (same rule as the interceptor)', async () => {
    const gateway = configure(GatewayHttpService);

    await gateway.fetch('/tools/search');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-API-Key']).toBeUndefined();
  });

  it('postJson sends the key, the JSON content type and the serialized body', async () => {
    const gateway = configure(GatewayHttpService, { apiKey: KEY });

    await gateway.postJson('/domain/security/analyze', { logs: 'boot ok' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/domain/security/analyze`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe(KEY);
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ logs: 'boot ok' });
  });

  it('putJson sends the key and the serialized body', async () => {
    const gateway = configure(GatewayHttpService, { apiKey: KEY });

    await gateway.putJson('/admin/prompts/generate_code', { content: 'c', description: 'd' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/admin/prompts/generate_code`);
    expect(init.method).toBe('PUT');
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe(KEY);
  });

  it('keeps caller-supplied headers alongside the key', async () => {
    const gateway = configure(GatewayHttpService, { apiKey: KEY });

    await gateway.fetch('/domain/telemetry/stream', {
      headers: { Accept: 'text/event-stream' },
    });

    const headers = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<
      string,
      string
    >;
    expect(headers['Accept']).toBe('text/event-stream');
    expect(headers['X-API-Key']).toBe(KEY);
  });
});

describe('feature services route through the gateway (no raw fetch, no missing key)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(okJson());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('AiOrchestratorService.cacheContext sends X-API-Key', async () => {
    const service = configure(AiOrchestratorService, { apiKey: KEY });

    await service.cacheContext('doc.txt', 'text/plain', 'hello');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/domain/context-cache`);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe(KEY);
  });

  it('AiOrchestratorService.generateCode sends X-API-Key', async () => {
    const service = configure(AiOrchestratorService, { apiKey: KEY });

    await service.generateCode('build a parser', 'typescript');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/domain/code/generate`);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe(KEY);
  });
});
