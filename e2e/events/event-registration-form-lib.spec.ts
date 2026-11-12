/** The pure rules behind organiser-built registration forms: answer checks, links, defaults, CSV cells. No browser. */
import { test, expect } from '@playwright/test';
import { escapeCsvCell, toCsv } from '../../src/lib/csv';
import { stripAnswersFromPersisted } from '../../src/lib/answersCache';
import { DEFAULT_FIELDS, answersToJson, normaliseRegistrationLink, serverMessageOf, validateAnswer, withDefaultsRestored } from '../../src/lib/eventRegistrationForm';

const f = (type: string, required = false, options?: string[]) => ({ id: 'x', label: 'X', type, required, options });

test('answer checks mirror the server', () => {
    expect(validateAnswer(f('text', true), '  ')).toBe('required');
    expect(validateAnswer(f('checkbox', true), 'false')).toBe('required');
    expect(validateAnswer(f('checkbox', true), 'true')).toBeNull();
    expect(validateAnswer(f('email'), 'a@b')).toBe('email');
    expect(validateAnswer(f('email'), 'a@b.co')).toBeNull();
    expect(validateAnswer(f('phone'), 'abc')).toBe('phone');
    expect(validateAnswer(f('phone'), '+233 20 123 4567')).toBeNull();
    expect(validateAnswer(f('phone'), '12345')).toBe('phone');
    expect(validateAnswer(f('number'), '3.5')).toBeNull();
    expect(validateAnswer(f('number'), 'abc')).toBe('number');
    expect(validateAnswer(f('date'), '2030-02-30')).toBe('date');
    expect(validateAnswer(f('date'), '2030-02-28')).toBeNull();
    expect(validateAnswer(f('select', false, ['A', 'B']), 'C')).toBe('option');
    expect(validateAnswer(f('multiselect', true, ['A', 'B']), [])).toBe('required');
    expect(validateAnswer(f('multiselect', false, ['A', 'B']), ['A', 'Z'])).toBe('options');
    expect(validateAnswer(f('text'), '')).toBeNull();
});

test('answers go out in their wire shapes', () => {
    const fields = [{ ...f('checkbox'), id: 'c' }, { ...f('multiselect', false, ['A']), id: 'm' }, { ...f('number'), id: 'n' }];
    expect(JSON.parse(answersToJson(fields, { c: 'true', m: ['A'], n: ' 3 ' }))).toEqual({ c: true, m: ['A'], n: '3' });
});

test('registration links: https is added, only http(s) is accepted', () => {
    expect(normaliseRegistrationLink('example.org/signup')).toBe('https://example.org/signup');
    expect(normaliseRegistrationLink('http://example.org/a')).toBe('http://example.org/a');
    expect(normaliseRegistrationLink('javascript:alert(1)')).toBeNull();
    expect(normaliseRegistrationLink('data:text/html,hi')).toBeNull();
    expect(normaliseRegistrationLink('ftp://example.org')).toBeNull();
    expect(normaliseRegistrationLink('localhost')).toBeNull();
    expect(normaliseRegistrationLink('  ')).toBeNull();
});

test('restoring defaults puts each one back at its place and keeps the organiser order', () => {
    const make = (d: (typeof DEFAULT_FIELDS)[number]) => ({ id: d.id, builtin: d.id, label: d.label, type: d.type, required: d.required });
    const custom = { id: 'q1', builtin: null, label: 'Q', type: 'text', required: false };
    const out = withDefaultsRestored([make(DEFAULT_FIELDS[0]), custom, make(DEFAULT_FIELDS[3])], make);
    expect(out.map((x) => x.id)).toEqual(['full_name', 'q1', 'email', 'phone', 'job_title']);
    expect(out.map((x) => x.id).filter((i) => i !== 'q1')).toEqual(['full_name', 'email', 'phone', 'job_title']);
    expect(withDefaultsRestored([], make).map((x) => x.id)).toEqual(['full_name', 'email', 'phone', 'job_title']);
});

test('server refusals lose their code prefix', () => {
    expect(serverMessageOf({ errors: [{ message: 'EVENT_REGISTRATION_FORM_INCOMPLETE: Please answer "Full name"' }] })).toBe('Please answer "Full name"');
    expect(serverMessageOf({ error: { errors: [{ message: 'EVENT_X: nope' }] } })).toBe('nope');
    expect(serverMessageOf(new Error('EVENT_Y: bad'))).toBe('bad');
});

test('csv cells: RFC 4180 quoting, formulas defused, BOM on request', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    for (const lead of ['=1+1', '+1', '-1', '@x', '\tx', '\rx']) expect(escapeCsvCell(lead).replace(/^"/, '').startsWith("'")).toBe(true);
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(toCsv([['a', 'b']], { bom: true })).toBe('﻿a,b\r\n');
    expect(toCsv([['a']])).toBe('a\r\n');
});

test('attendee answers are never written to the persisted Apollo cache', () => {
    const cache = JSON.stringify({ 'EventRegistration:1': { __typename: 'EventRegistration', status: 'confirmed', formResponsesJson: '{"email":"a@b.co"}' }, ROOT_QUERY: { x: 1 } });
    const out = JSON.parse(stripAnswersFromPersisted(cache));
    expect(out['EventRegistration:1']).toEqual({ __typename: 'EventRegistration', status: 'confirmed' });
    expect(out.ROOT_QUERY).toEqual({ x: 1 });
});
