/** Pure unit checks for the composer's attached-job helpers and the applications page parser (no browser). */
import { test, expect } from '@playwright/test';
import {
    buildCreateOpportunityInput,
    categoryForType,
    emptyFormValues,
    majorInputToMinor,
    minorToMajorInput,
    opportunityRefusal,
    parseAttachedOpportunity,
    parseMajorInput,
    titleFromPost,
    toAttached,
    toFormValues,
    validateOpportunityForm,
    type OpportunityFormValues,
} from '../../src/lib/opportunityDraft';
import { humaniseKey, parseCustomAnswers } from '../../src/lib/applicationAnswers';

const NOW = new Date('2026-11-01T10:00:00');
const base = (over: Partial<OpportunityFormValues> = {}): OpportunityFormValues => ({
    ...emptyFormValues('We are hiring a developer\nApply now', 'EMPLOYMENT'),
    ...over,
});

test('the title is the first non-empty line, capped at 200 characters', () => {
    expect(titleFromPost('\n\n  Senior developer wanted  \nmore text')).toBe('Senior developer wanted');
    expect(titleFromPost('x'.repeat(300))).toHaveLength(200);
    expect(titleFromPost('')).toBe('');
});

test('typed pay converts to integer minor units exactly once', () => {
    expect(majorInputToMinor('1500')).toBe(150000);
    expect(majorInputToMinor('1,500.50')).toBe(150050);
    expect(majorInputToMinor('12,5')).toBe(1250);
    expect(majorInputToMinor('19.99')).toBe(1999);
    expect(majorInputToMinor('')).toBeNull();
    expect(majorInputToMinor('abc')).toBeNull();
    expect(majorInputToMinor('-5')).toBeNull();
    expect(Number.isNaN(parseMajorInput('1.234'))).toBe(true);
    expect(minorToMajorInput(150000)).toBe('1500');
    expect(minorToMajorInput(150050)).toBe('1500.50');
    expect(minorToMajorInput(null)).toBe('');
});

test('type maps to the backend category', () => {
    expect(categoryForType('EMPLOYMENT')).toBe('EMPLOYMENT_CAREER');
    expect(categoryForType('SCHOLARSHIP')).toBe('EDUCATION_TRAINING');
    expect(categoryForType('GRANT')).toBe('FUNDING_GRANTS');
    expect(categoryForType('FELLOWSHIP')).toBe('FELLOWSHIPS_LEADERSHIP');
    expect(categoryForType('VOLUNTEER')).toBe('VOLUNTEERING_SOCIAL_IMPACT');
});

test.describe('validation', () => {
    test('a default form with a title is valid', () => {
        expect(validateOpportunityForm(base(), NOW)).toEqual({});
    });
    test('title is required', () => {
        expect(validateOpportunityForm(base({ title: '   ' }), NOW).title).toBe('titleRequired');
        expect(validateOpportunityForm(base({ title: 'x'.repeat(201) }), NOW).title).toBe('titleTooLong');
    });
    test('pay must be a valid range', () => {
        expect(validateOpportunityForm(base({ payMin: 'abc' }), NOW).pay).toBe('payInvalid');
        expect(validateOpportunityForm(base({ payMin: '500', payMax: '100' }), NOW).pay).toBe('payRange');
        expect(validateOpportunityForm(base({ payMin: '100', payMax: '500' }), NOW).pay).toBeUndefined();
    });
    test('a deadline in the past is refused, today and later are fine', () => {
        expect(validateOpportunityForm(base({ deadline: '2026-10-31' }), NOW).deadline).toBe('deadlinePast');
        expect(validateOpportunityForm(base({ deadline: '2026-11-01' }), NOW).deadline).toBeUndefined();
        expect(validateOpportunityForm(base({ deadline: '2027-01-01' }), NOW).deadline).toBeUndefined();
        expect(validateOpportunityForm(base({ deadline: 'soon' }), NOW).deadline).toBe('deadlineInvalid');
    });
    test('link must be http(s), email must be an address, only for their method', () => {
        expect(validateOpportunityForm(base({ applicationMethod: 'EXTERNAL_LINK', externalLink: 'javascript:alert(1)' }), NOW).externalLink).toBe('linkInvalid');
        expect(validateOpportunityForm(base({ applicationMethod: 'EXTERNAL_LINK', externalLink: 'ftp://x.org' }), NOW).externalLink).toBe('linkInvalid');
        expect(validateOpportunityForm(base({ applicationMethod: 'EXTERNAL_LINK', externalLink: 'https://jobs.example.org/1' }), NOW)).toEqual({});
        expect(validateOpportunityForm(base({ applicationMethod: 'EMAIL_REQUEST', applicationEmail: 'nope' }), NOW).applicationEmail).toBe('emailInvalid');
        expect(validateOpportunityForm(base({ applicationMethod: 'EMAIL_REQUEST', applicationEmail: 'hr@example.org' }), NOW)).toEqual({});
        expect(validateOpportunityForm(base({ applicationMethod: 'IN_PLATFORM_FORM', externalLink: 'junk', applicationEmail: 'junk' }), NOW)).toEqual({});
    });
});

test('the mutation input is a USER-owned public listing in minor units', () => {
    const att = toAttached(base({ payMin: '1000', payMax: '2500.50', currency: 'USD', deadline: '2027-01-31', location: ' Accra ', deliveryMode: 'HYBRID', commitmentType: 'FULL_TIME' }));
    const input = buildCreateOpportunityInput(att, '  We are hiring a developer\nApply now  ', 'user-1');
    expect(input).toMatchObject({
        ownerType: 'USER',
        ownerId: 'user-1',
        type: 'EMPLOYMENT',
        category: 'EMPLOYMENT_CAREER',
        title: 'We are hiring a developer',
        description: 'We are hiring a developer\nApply now',
        visibility: 'PUBLIC',
        applicationMethod: 'IN_PLATFORM_FORM',
        location: 'Accra',
        deliveryMode: 'HYBRID',
        commitmentType: 'FULL_TIME',
        compensationMin: 100000,
        compensationMax: 250050,
        compensationCurrency: 'USD',
        compensationType: 'SALARY',
        deadline: '2027-01-31T23:59:59.000Z',
    });
    expect(input).not.toHaveProperty('externalLink');
    expect(input).not.toHaveProperty('applicationEmail');
});

test('no pay means no compensation fields at all', () => {
    const input = buildCreateOpportunityInput(toAttached(base()), 'text', 'u');
    for (const k of ['compensationMin', 'compensationMax', 'compensationCurrency', 'compensationType', 'deadline', 'location']) {
        expect(input).not.toHaveProperty(k);
    }
});

test('an attached job survives the draft round trip and edit form', () => {
    const att = toAttached(base({ payMin: '10.5', applicationMethod: 'EXTERNAL_LINK', externalLink: 'https://a.example/x' }));
    expect(parseAttachedOpportunity(JSON.parse(JSON.stringify(att)))).toEqual(att);
    expect(toAttached(toFormValues(att))).toEqual(att);
});

test('a tampered stored draft job is dropped or sanitised, never trusted', () => {
    const good = toAttached(base());
    expect(parseAttachedOpportunity(null)).toBeNull();
    expect(parseAttachedOpportunity('x')).toBeNull();
    expect(parseAttachedOpportunity({ ...good, type: 'HACK' })).toBeNull();
    expect(parseAttachedOpportunity({ ...good, applicationMethod: 'WEBHOOK' })).toBeNull();
    expect(parseAttachedOpportunity({ ...good, title: '' })).toBeNull();
    expect(parseAttachedOpportunity({ ...good, applicationMethod: 'EXTERNAL_LINK', externalLink: 'javascript:1' })).toBeNull();
    const cleaned = parseAttachedOpportunity({ ...good, compensationMin: -5, compensationMax: 1.5, compensationCurrency: 'XXX', deadline: 'bad', deliveryMode: 'MARS' });
    expect(cleaned).toMatchObject({ compensationMin: null, compensationMax: null, compensationCurrency: 'GHS', deadline: '', deliveryMode: '' });
});

test('gateway refusal codes map to the translated toast keys', () => {
    const wrap = (code: string) => ({ error: { errors: [{ extensions: { code } }] } });
    expect(opportunityRefusal(wrap('OPPORTUNITY_POST_OWNER_MISMATCH'))).toBe('ownerMismatch');
    expect(opportunityRefusal(wrap('OPPORTUNITY_POST_FAILED'))).toBe('postFailed');
    expect(opportunityRefusal(wrap('OPPORTUNITY_SELF_APPLY'))).toBe('selfApply');
    expect(opportunityRefusal(wrap('RATE_LIMITED'))).toBe('rateLimited');
    expect(opportunityRefusal({ graphQLErrors: [{ extensions: { code: 'RATE_LIMIT_UNAVAILABLE' } }] })).toBe('rateLimited');
    expect(opportunityRefusal(wrap('SOMETHING_ELSE'))).toBeNull();
    expect(opportunityRefusal(undefined)).toBeNull();
});

test('custom answers parse to label/value rows and tolerate junk', () => {
    expect(parseCustomAnswers('{"years_of_experience":"5","portfolioUrl":"https://x.example","empty":"","n":3,"nested":{"a":1}}')).toEqual([
        { label: 'Years of experience', value: '5' },
        { label: 'Portfolio url', value: 'https://x.example' },
        { label: 'N', value: '3' },
    ]);
    expect(parseCustomAnswers('not json')).toEqual([]);
    expect(parseCustomAnswers('[1,2]')).toEqual([]);
    expect(parseCustomAnswers(null)).toEqual([]);
    expect(humaniseKey('yearsOfExperience')).toBe('Years of experience');
});
