/** Pure unit checks for the on-device opportunity detector (no browser). */
import { test, expect } from '@playwright/test';
import { detectOpportunity } from '../../src/lib/opportunityDetection';

const matches = (text: string) => detectOpportunity(text).match;
const type = (text: string) => detectOpportunity(text).suggestedType;

test.describe('hiring posts match', () => {
    const positives: Array<[string, string]> = [
        ["We're hiring a frontend developer in Accra. Apply now!", 'en hiring'],
        ['We are hiring! Send your CV to jobs@example.org before Friday.', 'en hiring curly'],
        ['We’re looking for an experienced accountant to join our team. Apply by 30 June.', 'en curly apostrophe'],
        ['Job opening: Programme officer, Brussels. Deadline 15 March.', 'en job opening'],
        ['New vacancy at our school: science teacher, full-time.', 'en vacancy'],
        ['Volunteers needed for the community clean-up this Saturday', 'en volunteers'],
        ['Internship at our startup this summer. Send your CV to apply.', 'en internship + cue'],
        ['Call for applications: the 2027 leadership fellowship is now open', 'en fellowship'],
        ['Scholarship for master students from Ghana, apply before the deadline', 'en scholarship + cue'],
        ['Grant applications are now open for diaspora founders', 'en grant'],
        ['Great team, great mission #hiring', 'hashtag hiring'],
        ['Come and work with us, details in comments #jobs #careers', 'two weak hashtags'],
        ['Wir stellen ein: Projektleiter (m/w/d) in Berlin', 'de'],
        ['Neues Stellenangebot in unserem Büro in Köln', 'de umlaut'],
        ['Praktikum im Marketing ab September, Bewerbung bis 1. Juli', 'de praktikum + cue'],
        ['STIPENDIUM für Studierende – jetzt bewerben', 'de stipendium'],
        ['Nous recrutons un chargé de communication à Paris', 'fr'],
        ["Offre d'emploi : responsable logistique, CDI", 'fr offre emploi'],
        ['Offre de stage de 6 mois à Bruxelles, postulez dès maintenant', 'fr stage'],
        ['Bourse d’études pour étudiants africains, date limite le 1er mai', 'fr bourse'],
        ['Stiamo assumendo: sviluppatore web a Milano', 'it'],
        ['Offerta di lavoro per cameriere, invia il tuo CV', 'it offerta'],
        ['Tirocinio in azienda, candidatura entro il 10 giugno', 'it tirocinio + cue'],
        ['Borsa di studio per giovani ricercatori', 'it borsa'],
        ['Vacature: administratief medewerker in Antwerpen', 'nl'],
        ['Wij zoeken een stagiair voor het najaar, solliciteer nu', 'nl wij zoeken'],
        ['Studiebeurs voor studenten, uiterlijk 1 juni aanvragen en solliciteer', 'nl beurs'],
        ['Vrijwilligers gezocht voor ons festival in Gent', 'nl vrijwilligers'],
    ];
    for (const [text, label] of positives) {
        test(label, () => expect(matches(text), text).toBe(true));
    }
});

test.describe('ordinary posts do not match', () => {
    const negatives: Array<[string, string]> = [
        ['I got the job! So grateful to everyone who helped me prepare.', 'got the job'],
        ['My job is so stressful this week, I need a holiday.', 'stressful job'],
        ['Just received a scholarship, thank you all for the support!', 'received scholarship'],
        ['We were looking for a flat in Berlin and finally found one.', 'looking for a flat'],
        ['The stage was packed and the band was amazing last night.', 'stage english'],
        ['We are at the final stage of the application for the visa, wish me luck', 'stage + application'],
        ['She is in her first internship and loves it', 'internship, no ask'],
        ['Has anyone been hiring a lawyer for a tenancy dispute?', 'hiring a lawyer'],
        ['Happy birthday to my brother, many happy returns!', 'unrelated'],
        ['Heute war ein schöner Tag in Hamburg mit viel Sonne', 'de unrelated'],
        ['La bourse a chuté de deux pour cent ce matin', 'fr stock exchange'],
        ['Ik heb een nieuwe fiets gekocht, wat een mooie dag', 'nl unrelated'],
        ['Oggi abbiamo cucinato una cena fantastica con tutta la famiglia', 'it unrelated'],
        ['', 'empty'],
        ['#blessed #sunday', 'harmless hashtags'],
        ['#jobs', 'one weak hashtag'],
    ];
    for (const [text, label] of negatives) {
        test(label, () => expect(matches(text), text).toBe(false));
    }
});

test('null, undefined and non-strings are safe', () => {
    expect(detectOpportunity(null)).toEqual({ match: false, suggestedType: null });
    expect(detectOpportunity(undefined)).toEqual({ match: false, suggestedType: null });
    expect(detectOpportunity(42 as unknown as string)).toEqual({ match: false, suggestedType: null });
});

test('accent and case insensitive, and word-boundary safe', () => {
    expect(matches('NOUS RECRUTONS UN DÉVELOPPEUR')).toBe(true);
    expect(matches('nous recrutons un developpeur')).toBe(true);
    expect(matches('devacancy revacancyed is not a word we use')).toBe(false);
    expect(matches('applynow is a brand name')).toBe(false);
});

test('suggested type follows the strongest signal', () => {
    expect(type("We're hiring a designer. Apply now")).toBe('EMPLOYMENT');
    expect(type('Scholarship for master students, apply before the deadline')).toBe('SCHOLARSHIP');
    expect(type('Call for applications: fellowship programme 2027')).toBe('FELLOWSHIP');
    expect(type('Grant applications are now open for founders')).toBe('GRANT');
    expect(type('Volunteers needed for our festival')).toBe('VOLUNTEER');
    expect(type('Freelancers needed for a three month contract role, apply now')).toBe('CONTRACT');
    expect(type('Borsa di studio per giovani ricercatori')).toBe('SCHOLARSHIP');
    expect(type('Stipendium für Studierende – jetzt bewerben')).toBe('SCHOLARSHIP');
    expect(type('Vrijwilligers gezocht voor ons festival')).toBe('VOLUNTEER');
    expect(type('Nothing to see here')).toBeNull();
});
