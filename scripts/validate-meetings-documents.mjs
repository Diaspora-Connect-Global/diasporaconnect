#!/usr/bin/env node
/**
 * Validates the M5 meetings documents (src/services/gql/networkingMeetings.ts)
 * against the SDL printed from the gateway's built schema
 * (docs/networking/meetings.graphql) with graphql-js: buildSchema + parse + validate.
 *
 * The live gateway does not have these operations yet, so `npm run validate:graphql`
 * lists them as broken; that is expected. This is the check that applies until deploy.
 *
 * Usage: node scripts/validate-meetings-documents.mjs [--sdl <path>]
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildSchema, parse, validate, print } from 'graphql';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const sdlPath = args.includes('--sdl') ? args[args.indexOf('--sdl') + 1] : join(ROOT, 'docs/networking/meetings.graphql');

// The SDL file only prints the meetings additions; scalars/ID/String/Int/Boolean are built in.
const schema = buildSchema(readFileSync(sdlPath, 'utf8'));

// Evaluate the .ts module with `gql` replaced by plain string assembly.
const source = readFileSync(join(ROOT, 'src/services/gql/networkingMeetings.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const gql = (strings, ...vals) => strings.reduce((acc, s, i) => acc + s + (i < vals.length ? vals[i] : ''), '');
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, (id) => (id === '@apollo/client' ? { gql } : createRequire(import.meta.url)(id)));

let failed = 0;
let count = 0;
for (const [name, text] of Object.entries(mod.exports)) {
  if (typeof text !== 'string' || !/\b(query|mutation)\b/.test(text)) continue;
  count += 1;
  let errors;
  try {
    errors = validate(schema, parse(text));
  } catch (e) {
    errors = [e];
  }
  if (errors.length) {
    failed += 1;
    console.error(`BROKEN ${name}`);
    for (const e of errors) console.error(`  - ${e.message}`);
  } else {
    console.log(`ok     ${name}`);
  }
}
console.log(`\n${count - failed}/${count} documents valid against ${sdlPath}`);
process.exit(failed ? 1 : 0);
