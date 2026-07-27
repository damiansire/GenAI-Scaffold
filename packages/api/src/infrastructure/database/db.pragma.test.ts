// Stability: 1 - Experimental (node:test)
//
// WAL without `synchronous=NORMAL` leaves SQLite at the FULL default, which
// fsyncs the WAL on every commit — a cost this gateway paid synchronously on
// the event loop once per request. This pins the WAL+NORMAL pairing so a
// refactor of initialize() cannot silently reintroduce the per-request fsync.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from './db.js';

describe('DatabaseService — SQLite durability/latency pairing', () => {
  before(() => {
    process.env['DB_PATH'] = ':memory:';
    dbService.initialize();
  });

  after(() => {
    dbService.close();
  });

  it('runs with synchronous=NORMAL (1), not the FULL default (2)', () => {
    const row = (
      dbService as unknown as {
        proxiedDb: { prepare: (sql: string) => { get: () => { synchronous: number } } };
      }
    ).proxiedDb
      .prepare('PRAGMA synchronous')
      .get();
    assert.equal(row.synchronous, 1, 'WAL must be paired with synchronous=NORMAL');
  });
});
