/**
 * IotDashboard — Patrón 9: IoT Real-time Telemetry (Frontend)
 *
 * Connects to GET /api/domain/telemetry/stream.
 *
 * Transport note: the route is behind `apiKeyAuth`, and the native `EventSource`
 * cannot send request headers, so it could never carry `X-API-Key` and the
 * stream simply never connected. It uses fetch + ReadableStream through
 * `GatewayHttpService` instead, reusing the shared incremental SSE reader.
 * Passing the key by query string was rejected on purpose: it would end up in
 * access logs.
 *
 * Renders live device cards that update in place (no full re-render).
 */
import {
  Component,
  signal,
  computed,
  inject,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { GatewayHttpService } from '../../core/services/gateway-http.service';
import { readSseRecords } from '../../../core/streaming/sse-reader';

type AlertLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

interface TelemetryFrame {
  frameId: string;
  deviceId: string;
  deviceType: string;
  timestamp: string;
  value: number;
  unit: string;
  alertLevel: AlertLevel;
  location: string;
  metadata: { rollingMean: number; rollingStddev: number; zScore: number; sampleCount: number };
}

interface DeviceConfig {
  id: string;
  type: string;
  unit: string;
  location: string;
  baseValue: number;
}

interface DeviceState {
  config: DeviceConfig;
  latest: TelemetryFrame | null;
  history: number[]; // last 20 values for sparkline
  frameCount: number;
}

const HISTORY_SIZE = 20;
const DEVICE_TYPE_ICONS: Record<string, string> = {
  temperature: '🌡️',
  humidity: '💧',
  pressure: '🔵',
  vibration: '〰️',
  power: '⚡',
  gps: '📍',
  default: '📡',
};

@Component({
  selector: 'app-iot-dashboard',
  imports: [],
  templateUrl: './iot-dashboard.html',
  styleUrl: './iot-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IotDashboard implements OnDestroy {
  private readonly gateway = inject(GatewayHttpService);
  /** Aborts the in-flight telemetry stream (stop button, re-entry, destroy). */
  private controller: AbortController | null = null;

  // ─── State ───────────────────────────────────────────────────────────────
  isStreaming = signal(false);
  devices = signal<Map<string, DeviceState>>(new Map());
  totalFrames = signal(0);
  alerts = signal<TelemetryFrame[]>([]);
  connectionError = signal<string | null>(null);

  // ─── Computed ────────────────────────────────────────────────────────────
  readonly deviceList = computed(() => Array.from(this.devices().values()));
  readonly alertCount = computed(() => this.alerts().length);
  readonly criticalCount = computed(
    () => this.alerts().filter((a) => a.alertLevel === 'CRITICAL').length,
  );
  readonly hasAlerts = computed(() => this.alertCount() > 0);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  deviceIcon(type: string): string {
    return DEVICE_TYPE_ICONS[type] ?? DEVICE_TYPE_ICONS['default']!;
  }

  alertClass(level: AlertLevel): string {
    return `alert-badge alert-badge--${level.toLowerCase()}`;
  }

  cardClass(state: DeviceState): string {
    const level = state.latest?.alertLevel ?? 'NORMAL';
    return `device-card device-card--${level.toLowerCase()}`;
  }

  /** Generates an SVG polyline path from history values for a sparkline. */
  sparklinePath(history: number[]): string {
    if (history.length < 2) return '';
    const w = 120,
      h = 32;
    const min = Math.min(...history);
    const max = Math.max(...history) || min + 1;
    const points = history.map((v, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return points.join(' ');
  }

  trackById(_: number, d: DeviceState): string {
    return d.config.id;
  }

  // ─── Stream control ───────────────────────────────────────────────────────
  startStream(): void {
    this.stopStream();

    this.isStreaming.set(true);
    this.connectionError.set(null);
    this.totalFrames.set(0);
    this.alerts.set([]);

    this.controller = new AbortController();
    void this.consumeStream(this.controller.signal);
  }

  private async consumeStream(abortSignal: AbortSignal): Promise<void> {
    try {
      const response = await this.gateway.fetch('/domain/telemetry/stream', {
        headers: { Accept: 'text/event-stream' },
        signal: abortSignal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('Telemetry stream returned no body.');

      for await (const record of readSseRecords(response.body, abortSignal)) {
        if (record.event === 'devices') {
          this.applyDeviceList(JSON.parse(record.data) as DeviceConfig[]);
        } else {
          this.applyFrame(JSON.parse(record.data) as TelemetryFrame);
        }
      }
      this.isStreaming.set(false);
    } catch (err) {
      if (abortSignal.aborted) return; // intentional stop, not a failure
      this.connectionError.set(
        err instanceof Error
          ? `Stream connection lost: ${err.message}. Click Start to reconnect.`
          : 'Stream connection lost. Click Start to reconnect.',
      );
      this.isStreaming.set(false);
    }
  }

  /** First event of the stream: the device roster used to bootstrap the cards. */
  private applyDeviceList(deviceConfigs: DeviceConfig[]): void {
    const map = new Map<string, DeviceState>();
    for (const config of deviceConfigs) {
      map.set(config.id, { config, latest: null, history: [], frameCount: 0 });
    }
    this.devices.set(map);
  }

  private applyFrame(frame: TelemetryFrame): void {
    this.totalFrames.update((n) => n + 1);

    // Update device state immutably (new Map for Signal change detection)
    const map = new Map(this.devices());
    const state = map.get(frame.deviceId);
    if (state) {
      const history = [...state.history, frame.value].slice(-HISTORY_SIZE);
      map.set(frame.deviceId, {
        ...state,
        latest: frame,
        history,
        frameCount: state.frameCount + 1,
      });
      this.devices.set(map);
    }

    // Track alerts
    if (frame.alertLevel !== 'NORMAL') {
      this.alerts.update((prev) => [frame, ...prev].slice(0, 50));
    }
  }

  stopStream(): void {
    this.controller?.abort();
    this.controller = null;
    this.isStreaming.set(false);
  }

  dismissAlerts(): void {
    this.alerts.set([]);
  }

  ngOnDestroy(): void {
    this.stopStream();
  }
}
