#!/usr/bin/env node
/**
 * Validates every gql`...` document under src/ against the LIVE gateway schema.
 *
 * Why: the e2e specs answer GraphQL from fixtures, and a fixture accepts ANY
 * field, so a document naming a field the gateway does not have passes every
 * mocked spec and then fails in the browser. This asks the real gateway.
 *
 * Safety (the script never needs, sends or reads credentials):
 *  - no Authorization header, no cookies, no variables, ever;
 *  - queries are sent as-is (unauthenticated, no variables);
 *  - mutations are sent ONLY if they declare at least one required (`!`)
 *    variable: GraphQL validates the document first and then fails variable
 *    coercion BEFORE execution, so nothing runs. A mutation with no required
 *    variable could execute, so it is listed as "not checked" and never sent;
 *  - subscriptions are never sent (HTTP cannot validate them safely);
 *  - at most 3 requests/second; only error messages are printed.
 *
 * Usage: node scripts/validate-graphql-against-gateway.mjs [--url <endpoint>] [--all] [--json]
 *   --all  also print OK documents. Exit code 1 if any document is BROKEN.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, print, visit, Kind } from 'graphql';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const argVal = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const URL_ = argVal('--url') || process.env.GRAPHQL_VALIDATE_URL || 'https://api.diaspoplug.net/graphql';
const SHOW_ALL = args.includes('--all');
const MIN_GAP_MS = 350; // <= 3 requests/second

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(extname(p))) out.push(p);
  }
  return out;
}

/** Extract every gql`...` template: { file, line, constName, parts[] } where parts alternate text / ${expr}. */
function extractTemplates(file) {
  const src = readFileSync(file, 'utf8');
  const found = [];
  const re = /\bgql\s*`/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    const parts = [];
    let text = '';
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '\\') { text += src[i + 1] ?? ''; i++; continue; }
      if (c === '`') break;
      if (c === '$' && src[i + 1] === '{') {
        let depth = 1, j = i + 2;
        while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
        parts.push({ text }); text = '';
        parts.push({ expr: src.slice(i + 2, j - 1).trim() });
        i = j - 1;
        continue;
      }
      text += c;
    }
    parts.push({ text });
    const line = src.slice(0, m.index).split('\n').length;
    const before = src.slice(Math.max(0, src.lastIndexOf('\n', m.index)), m.index);
    const nm = before.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*$/);
    found.push({ file, line, constName: nm?.[1], parts });
  }
  return found;
}

const templates = walk(join(ROOT, 'src')).flatMap(extractTemplates);
const byName = new Map();
for (const t of templates) if (t.constName) byName.set(t.constName, t);

function resolve(t, stack = []) {
  let out = '';
  let ok = true;
  for (const p of t.parts) {
    if (p.expr === undefined) { out += p.text; continue; }
    const ref = byName.get(p.expr);
    if (!ref || stack.includes(ref)) { ok = false; continue; }
    const r = resolve(ref, [...stack, t]);
    if (!r.ok) ok = false;
    out += '\n' + r.text + '\n';
  }
  return { text: out, ok };
}

const fragments = new Map(); // name -> FragmentDefinitionNode
const docs = []; // { t, ast }
const unparsed = [];
for (const t of templates) {
  const { text, ok } = resolve(t);
  if (!ok) { unparsed.push({ t, why: 'unresolved ${} interpolation' }); continue; }
  try {
    const ast = parse(text);
    docs.push({ t, ast });
    for (const d of ast.definitions) if (d.kind === Kind.FRAGMENT_DEFINITION) fragments.set(d.name.value, d);
  } catch (e) {
    unparsed.push({ t, why: `parse error: ${e.message}` });
  }
}

function neededFragments(node, acc = new Map()) {
  visit(node, {
    FragmentSpread(n) {
      const f = fragments.get(n.name.value);
      if (f && !acc.has(f.name.value)) { acc.set(f.name.value, f); neededFragments(f, acc); }
    },
  });
  return acc;
}

const ops = [];
const seen = new Set();
for (const { t, ast } of docs) {
  for (const d of ast.definitions) {
    if (d.kind !== Kind.OPERATION_DEFINITION) continue;
    const frs = [...neededFragments(d).values()];
    const text = [print(d), ...frs.map(print)].join('\n\n');
    const key = t.file + '\0' + text;
    if (seen.has(key)) continue;
    seen.add(key);
    const requiredVars = (d.variableDefinitions ?? []).filter((v) => v.type.kind === Kind.NON_NULL_TYPE && !v.defaultValue);
    ops.push({
      name: d.name?.value ?? '(anonymous)',
      operation: d.operation,
      file: relative(ROOT, t.file),
      line: t.line,
      text,
      sendable: d.operation === 'query' || (d.operation === 'mutation' && requiredVars.length > 0),
    });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function check(op) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query: op.text }), // never any variables, never any credentials
  });
  let body;
  try { body = await res.json(); } catch { return { status: 'ERROR', message: `HTTP ${res.status}, non-JSON response` }; }
  const errors = Array.isArray(body?.errors) ? body.errors : [];
  const invalid = errors.filter((e) => e?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED'
    || /Cannot query field|Unknown argument|Unknown type|Unknown directive|Unknown fragment/.test(String(e?.message)));
  if (invalid.length) return { status: 'BROKEN', message: invalid.map((e) => String(e.message).split('\n')[0]).join(' | ') };
  if (!errors.length && !res.ok) return { status: 'ERROR', message: `HTTP ${res.status}` };
  return { status: 'OK' };
}

const results = [];
let last = 0;
for (const op of ops) {
  if (!op.sendable) {
    results.push({ ...op, status: 'NOT_CHECKED', message: op.operation === 'subscription' ? 'subscription (not sent over HTTP)' : 'mutation with no required variable (would execute)' });
    continue;
  }
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  try { results.push({ ...op, ...(await check(op)) }); }
  catch (e) { results.push({ ...op, status: 'ERROR', message: `request failed: ${e.message}` }); }
}

const by = (s) => results.filter((r) => r.status === s);
const fmt = (r) => `  ${r.operation} ${r.name}  ${r.file}:${r.line}${r.message ? `\n      ${r.message}` : ''}`;
if (args.includes('--json')) {
  console.log(JSON.stringify(results.map(({ text, ...r }) => r), null, 2));
} else {
  console.log(`Gateway: ${URL_}\nOperations: ${results.length}  OK: ${by('OK').length}  BROKEN: ${by('BROKEN').length}  NOT CHECKED: ${by('NOT_CHECKED').length}  ERROR: ${by('ERROR').length}  unparsed templates: ${unparsed.length}`);
  if (by('BROKEN').length) console.log('\nBROKEN (the live gateway rejects the document):\n' + by('BROKEN').map(fmt).join('\n'));
  if (by('ERROR').length) console.log('\nERROR (could not get a validation verdict):\n' + by('ERROR').map(fmt).join('\n'));
  if (by('NOT_CHECKED').length) console.log('\nNOT CHECKED (never sent, to avoid executing anything):\n' + by('NOT_CHECKED').map(fmt).join('\n'));
  if (unparsed.length) console.log('\nUNPARSED templates (dynamic interpolation or syntax the script cannot resolve):\n' + unparsed.map((u) => `  ${relative(ROOT, u.t.file)}:${u.t.line}  ${u.why}`).join('\n'));
  if (SHOW_ALL) console.log('\nOK:\n' + by('OK').map(fmt).join('\n'));
}
process.exit(by('BROKEN').length ? 1 : 0);
