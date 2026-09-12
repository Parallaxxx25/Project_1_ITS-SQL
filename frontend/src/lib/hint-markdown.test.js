/**
 * Run: npm test   (node --test, stdlib — no vitest, no jsdom, no config)
 *
 * The parser is the only non-trivial logic in the hint-rendering change, and
 * it is split out from the JSX precisely so it can be checked without a DOM.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseHint } from './hint-markdown.js';

const text = (parts) => ({ type: 'text', parts });
const plain = (value) => ({ bold: false, value });
const bold = (value) => ({ bold: true, value });

test('the inline one-line fence the LLM actually emits', () => {
  const blocks = parseHint(
    'you would write: ```sql SELECT first_name FROM staffs; ``` How does this help?'
  );
  assert.deepEqual(blocks, [
    text([plain('you would write: ')]),
    { type: 'code', value: 'SELECT first_name FROM staffs;' },
    text([plain(' How does this help?')]),
  ]);
});

test('the well-formed multi-line fence', () => {
  const blocks = parseHint('Try this:\n\n```sql\nSELECT 1;\n```\n\nMake sense?');
  assert.deepEqual(blocks, [
    text([plain('Try this:')]),
    { type: 'code', value: 'SELECT 1;' },
    text([plain('Make sense?')]),
  ]);
});

test('inline backticks become bold parts', () => {
  assert.deepEqual(parseHint('the `staffs` table and `email` column'), [
    text([
      plain('the '),
      bold('staffs'),
      plain(' table and '),
      bold('email'),
      plain(' column'),
    ]),
  ]);
});

test('a backtick inside a fence stays literal code', () => {
  const blocks = parseHint('```sql\nSELECT `weird`;\n```');
  assert.deepEqual(blocks, [{ type: 'code', value: 'SELECT `weird`;' }]);
});

test('an unterminated fence does not eat the rest of the hint', () => {
  const raw = 'Check ```sql SELECT 1; and keep reading.';
  assert.deepEqual(parseHint(raw), [text([plain(raw)])]);
});

test('plain text passes through untouched', () => {
  assert.deepEqual(parseHint('Syntax Error: queries must end with a semicolon (;).'), [
    text([plain('Syntax Error: queries must end with a semicolon (;).')]),
  ]);
});

test('interior paragraph breaks survive', () => {
  const blocks = parseHint('First line.\n\nSecond line.');
  assert.deepEqual(blocks, [text([plain('First line.\n\nSecond line.')])]);
});

test('empty and nullish input', () => {
  assert.deepEqual(parseHint(''), []);
  assert.deepEqual(parseHint(null), []);
  assert.deepEqual(parseHint(undefined), []);
});

test('two fences in one hint', () => {
  const blocks = parseHint('Bad:\n```sql\nSELECT a b;\n```\nGood:\n```sql\nSELECT a, b;\n```');
  assert.deepEqual(blocks, [
    text([plain('Bad:')]),
    { type: 'code', value: 'SELECT a b;' },
    text([plain('Good:')]),
    { type: 'code', value: 'SELECT a, b;' },
  ]);
});

test('repeated calls are not affected by regex lastIndex state', () => {
  const raw = 'the `staffs` table';
  assert.deepEqual(parseHint(raw), parseHint(raw));
});
