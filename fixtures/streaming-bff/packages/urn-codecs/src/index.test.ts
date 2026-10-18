import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeUrn, decodeUrnOfType, encodeUrn, isLegacyUrn } from './index';

test('encodes and decodes a title URN', () => {
  const urn = encodeUrn('title', 'tt-42');
  assert.equal(urn, 'urn:stream:title:tt-42');
  assert.deepEqual(decodeUrn(urn), { type: 'title', id: 'tt-42' });
});

test('rejects a URN of the wrong type', () => {
  assert.throws(() => decodeUrnOfType('urn:stream:person:p-1', 'title'));
});

test('recognises legacy URNs', () => {
  assert.equal(isLegacyUrn('urn:stream-v1:title:42'), true);
});

test('does not treat current URNs as legacy', () => {
  assert.equal(isLegacyUrn(encodeUrn('title', '42')), false);
});
