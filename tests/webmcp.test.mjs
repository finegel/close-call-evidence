import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicFilter } from '../lib/webmcp.ts';
test('public filter accepts empty and DID fragments', () => {
  assert.equal(publicFilter({ query: '' }), '');
  assert.equal(publicFilter({ query: 'did:key:z6Mk' }), 'did:key:z6Mk');
});
test('public filter rejects invalid schema and characters', () => {
  for (const value of [
    null,
    [],
    {},
    { query: 7 },
    { query: 'hello world' },
    { query: 'a', extra: true },
    { query: 'a'.repeat(101) },
  ])
    assert.throws(() => publicFilter(value));
});
