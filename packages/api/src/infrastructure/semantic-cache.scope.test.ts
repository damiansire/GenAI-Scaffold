// Stability: 1 - Experimental (node:test)
//
// The semantic cache (Tier 1) answers BEFORE the exact-match cache (Tier 2).
// Until the claim was scoped, a KNN candidate stored by tenant A was served to
// tenant B (and an entry cached for model X was served for model Y). These
// tests pin the scoping contract at the metadata layer, which is exactly the
// filter `findSemanticMatch` applies to every KNN candidate before serving it.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from './database/db.js';

describe('Semantic cache metadata — hits are scoped to tenant AND model', () => {
  before(() => {
    process.env['DB_PATH'] = ':memory:';
    dbService.initialize();
    dbService.storeSemanticMeta(
      101,
      'hash-tenant-a',
      { text: 'answer generated for tenant A' },
      'model-x',
      'tenant-a',
    );
  });

  after(() => {
    dbService.close();
  });

  it('does NOT serve the entry to another tenant (same model, same vector)', () => {
    const hit = dbService.claimSemanticHit(101, 'model-x', 'tenant-b');
    assert.equal(hit, null, 'a nearby vector cached for tenant A must be a MISS for tenant B');
  });

  it('does NOT serve the entry for another model (same tenant, same vector)', () => {
    const hit = dbService.claimSemanticHit(101, 'model-y', 'tenant-a');
    assert.equal(hit, null, 'an entry cached for model X must be a MISS when invoking model Y');
  });

  it('serves the entry to its owner and increments hit_count only then', () => {
    const hit = dbService.claimSemanticHit(101, 'model-x', 'tenant-a');
    assert.ok(hit, 'the owning tenant+model combination is a HIT');
    assert.deepEqual(hit.response, { text: 'answer generated for tenant A' });
    assert.equal(hit.modelId, 'model-x');
    assert.equal(
      hit.hitCount,
      1,
      'the two scoped misses above must not have incremented hit_count',
    );
  });
});
