/**
 * Incremental SSE record reader over a `fetch` ReadableStream.
 *
 * Why this exists instead of the native `EventSource`: `EventSource` cannot send
 * request headers, so it can never carry `X-API-Key` against a fail-closed
 * gateway — a stream opened that way never connects. `fetch` + `ReadableStream`
 * can, and passing the key by query string is not an option (it would land in
 * access logs).
 *
 * Framework-agnostic on purpose so it is unit-testable without the UI.
 */

/** One parsed SSE record: its event name and the joined `data:` payload. */
export interface SseRecord {
  event: string;
  data: string;
}

/**
 * Parses one complete SSE record (a block of `field: value` lines).
 * Returns null when the block carries no `data:` line (keep-alive comments).
 */
export function parseSseRecord(raw: string): SseRecord | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) continue; // comment / keep-alive noise
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n').trim() };
}

/**
 * Yields complete SSE records from a response body.
 *
 * Records are separated by a blank line and a record can be split across network
 * packets, so a partial tail is carried forward between reads and only complete
 * records are emitted.
 */
export async function* readSseRecords(
  body: NonNullable<Response['body']>,
  abortSignal?: AbortSignal,
): AsyncGenerator<SseRecord> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (abortSignal?.aborted) return;
      if (value) buffer += value;

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const record = parseSseRecord(raw);
        if (record) yield record;
      }

      if (done) {
        // Trailing record without a final blank line.
        if (buffer.trim()) {
          const record = parseSseRecord(buffer);
          if (record) yield record;
        }
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
