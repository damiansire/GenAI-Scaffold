import { describe, it, expect } from 'vitest';
import { parseSseRecord, readSseRecords } from './sse-reader';

/** Builds a response body stream out of arbitrary network-packet boundaries. */
function bodyOf(packets: string[]): NonNullable<Response['body']> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const packet of packets) controller.enqueue(encoder.encode(packet));
      controller.close();
    },
  }) as NonNullable<Response['body']>;
}

describe('parseSseRecord', () => {
  it('defaults the event name to "message"', () => {
    expect(parseSseRecord('data: {"a":1}')).toEqual({ event: 'message', data: '{"a":1}' });
  });

  it('reads a named event', () => {
    expect(parseSseRecord('event: devices\ndata: []')).toEqual({ event: 'devices', data: '[]' });
  });

  it('ignores comment / keep-alive lines', () => {
    expect(parseSseRecord(': keep-alive\ndata: x')).toEqual({ event: 'message', data: 'x' });
  });

  it('returns null for a record with no data line', () => {
    expect(parseSseRecord(': just a comment')).toBeNull();
  });

  it('joins multiple data lines with a newline', () => {
    expect(parseSseRecord('data: one\ndata: two')?.data).toBe('one\ntwo');
  });
});

describe('readSseRecords', () => {
  it('yields every complete record in order', async () => {
    const records = [];
    for await (const record of readSseRecords(
      bodyOf(['event: devices\ndata: []\n\n', 'data: {"n":1}\n\n', 'data: [DONE]\n\n']),
    )) {
      records.push(record);
    }

    expect(records.map((r) => r.event)).toEqual(['devices', 'message', 'message']);
    expect(records[2]?.data).toBe('[DONE]');
  });

  it('reassembles a record split across network packets', async () => {
    const records = [];
    for await (const record of readSseRecords(bodyOf(['data: {"te', 'xt":"hi"}\n', '\n']))) {
      records.push(record);
    }

    expect(records).toHaveLength(1);
    expect(records[0]?.data).toBe('{"text":"hi"}');
  });

  it('emits a trailing record that has no final blank line', async () => {
    const records = [];
    for await (const record of readSseRecords(bodyOf(['data: last']))) {
      records.push(record);
    }

    expect(records[0]?.data).toBe('last');
  });

  it('stops early when the abort signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const records = [];
    for await (const record of readSseRecords(bodyOf(['data: x\n\n']), controller.signal)) {
      records.push(record);
    }

    expect(records).toHaveLength(0);
  });
});
