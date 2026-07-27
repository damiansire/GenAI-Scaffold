import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../core/tokens/api-config';
import { IotDashboard } from './iot-dashboard';

const BASE_URL = 'http://localhost:3000/api';
const KEY = 'secret-key';

/**
 * The component has an external templateUrl, which this JIT setup cannot
 * compile (see AGENTS.md), so the class is driven directly inside an injection
 * context — enough to assert the transport, which is what regressed.
 */
function makeComponent(): IotDashboard {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: API_CONFIG, useValue: { baseUrl: BASE_URL, apiKey: KEY } }],
  });
  return TestBed.runInInjectionContext(() => new IotDashboard());
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return {
    ok: true,
    status: 200,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  } as unknown as Response;
}

describe('IotDashboard telemetry transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens the telemetry stream WITH X-API-Key (EventSource could not)', async () => {
    fetchMock.mockResolvedValue(sseResponse(['event: devices\ndata: []\n\n']));
    const component = makeComponent();

    component.startStream();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/domain/telemetry/stream`);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe(KEY);
  });

  it('bootstraps device cards from the first event and applies frames', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: devices\ndata: [{"id":"TEMP-1","type":"temperature","unit":"C","location":"wh","baseValue":20}]\n\n',
        'data: {"frameId":"f1","deviceId":"TEMP-1","deviceType":"temperature","timestamp":"t","value":21,"unit":"C","alertLevel":"NORMAL","location":"wh","metadata":{"rollingMean":20,"rollingStddev":1,"zScore":1,"sampleCount":2}}\n\n',
      ]),
    );
    const component = makeComponent();

    component.startStream();
    await vi.waitFor(() => expect(component.totalFrames()).toBe(1));

    expect(component.deviceList()).toHaveLength(1);
    expect(component.deviceList()[0]?.latest?.value).toBe(21);
    expect(component.alertCount()).toBe(0);
  });

  it('surfaces a connection error instead of failing silently', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 } as unknown as Response);
    const component = makeComponent();

    component.startStream();
    await vi.waitFor(() => expect(component.connectionError()).not.toBeNull());

    expect(component.connectionError()).toContain('401');
    expect(component.isStreaming()).toBe(false);
  });
});
