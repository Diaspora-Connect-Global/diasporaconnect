/**
 * Locale parity check for messages/{en,de,fr,it,nl}.json.
 *
 * Three things, because a missing key and a mistranslated placeholder fail
 * differently and only one of them is visible:
 *   1. KEY PARITY      — every locale has exactly the key set `en` has.
 *   2. PLACEHOLDERS    — every translation uses the same {args} as `en`.
 *                        A dropped {date} renders a sentence with a hole; a
 *                        renamed one makes next-intl throw at runtime.
 *   3. EMPTY VALUES    — a key that exists but says nothing is a missing
 *                        translation wearing a present one.
 *
 * Also reports the two namespaces this change owns, so their coverage is
 * visible rather than merely included in a global total.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parse } from '@formatjs/icu-messageformat-parser';

const LOCALES = ['en', 'de', 'fr', 'it', 'nl'];
const BASE = 'en';
const ROOT =
  process.argv[2] ??
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
const OWNED = ['circles.members.invite', 'circles.members.past', 'circles.invites'];

const load = (l) => JSON.parse(readFileSync(`${ROOT}/${l}.json`, 'utf8'));

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

/**
 * ICU argument names, via the real parser rather than a regex.
 *
 * A regex cannot do this correctly, and the failure is not theoretical: the
 * body of a plural option is syntactically identical to an argument reference.
 * In `{count, plural, =1 {reply} other {replies}}` the words `reply` and
 * `replies` are LITERAL TEXT, but `{reply}` reads exactly like `{count}`, so
 * every pattern-matching version of this check reported a placeholder mismatch
 * on a string that is perfectly correct in all five locales. `parse` knows the
 * difference, and it is already in the tree as a next-intl dependency.
 *
 * An unparseable message is reported as such — a malformed ICU string throws at
 * render time, which is strictly worse than failing this check.
 */
function placeholders(value) {
  if (typeof value !== 'string') return new Set();

  let ast;
  try {
    ast = parse(value);
  } catch {
    return new Set(['<<UNPARSEABLE ICU>>']);
  }

  const names = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      // Every node that NAMES an argument carries it on `value`: argument,
      // number, date, time, select and plural. Literals and `#` do not.
      if (node.type >= 1 && node.type <= 6 && typeof node.value === 'string') {
        names.add(node.value);
      }
      // Recurse so an argument used inside a plural option still counts.
      if (node.options) {
        for (const option of Object.values(node.options)) walk(option.value ?? []);
      }
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  walk(ast);
  return names;
}

const flat = Object.fromEntries(LOCALES.map((l) => [l, flatten(load(l))]));
const baseKeys = [...flat[BASE].keys()];
let failures = 0;

console.log(`base locale: ${BASE} — ${baseKeys.length} keys\n`);

for (const locale of LOCALES) {
  const keys = flat[locale];
  const missing = baseKeys.filter((k) => !keys.has(k));
  const extra = [...keys.keys()].filter((k) => !flat[BASE].has(k));

  const badArgs = [];
  const empty = [];
  for (const k of baseKeys) {
    if (!keys.has(k)) continue;
    const v = keys.get(k);
    if (typeof v === 'string' && v.trim() === '') empty.push(k);
    const want = [...placeholders(flat[BASE].get(k))].sort().join(',');
    const got = [...placeholders(v)].sort().join(',');
    if (want !== got) badArgs.push(`${k}  (en: {${want}}  ${locale}: {${got}})`);
  }

  const ok = !missing.length && !extra.length && !badArgs.length && !empty.length;
  if (!ok) failures++;

  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${locale}  keys=${keys.size}  missing=${missing.length}  extra=${extra.length}  placeholderMismatch=${badArgs.length}  empty=${empty.length}`,
  );
  for (const k of missing.slice(0, 20)) console.log(`        missing: ${k}`);
  for (const k of extra.slice(0, 20)) console.log(`          extra: ${k}`);
  for (const k of badArgs.slice(0, 20)) console.log(`    placeholder: ${k}`);
  for (const k of empty.slice(0, 20)) console.log(`          empty: ${k}`);
}

console.log('\nnamespaces owned by this change:');
for (const ns of OWNED) {
  const counts = LOCALES.map((l) => {
    const n = [...flat[l].keys()].filter((k) => k === ns || k.startsWith(`${ns}.`)).length;
    return `${l}=${n}`;
  });
  const uniq = new Set(counts.map((c) => c.split('=')[1]));
  console.log(`  ${uniq.size === 1 ? 'PASS' : 'FAIL'}  ${ns}  ${counts.join(' ')}`);
  if (uniq.size !== 1) failures++;
}

console.log(`\n${failures === 0 ? 'ALL LOCALES IN PARITY' : `${failures} check(s) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
