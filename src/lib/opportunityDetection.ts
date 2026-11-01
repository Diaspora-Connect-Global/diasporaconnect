/**
 * On-device "does this post look like a job / opportunity?" heuristic.
 *
 * Pure and dependency-free on purpose: the same file is copied byte-identical into the
 * admin consoles. The text never leaves the device (no network, no processor).
 *
 * It is a scored heuristic, not a classifier: hiring-INTENT phrases (en/de/fr/it/nl) and
 * hiring hashtags add points, supporting cues ("apply", "deadline", "CV" ...) add a little,
 * and a post matches at THRESHOLD. A bare topic word ("scholarship", "internship") is not
 * enough on its own ("I received a scholarship!") and neither is "I got the job".
 */

export type OpportunitySuggestedType =
  | 'EMPLOYMENT'
  | 'CONTRACT'
  | 'VOLUNTEER'
  | 'SCHOLARSHIP'
  | 'GRANT'
  | 'FELLOWSHIP'
  | 'PROGRAM';

export interface OpportunityDetection {
  match: boolean;
  suggestedType: OpportunitySuggestedType | null;
}

const THRESHOLD = 3;
const CUE_CAP = 2;
const HASHTAG_CAP = 4;

/** Lower-case, strip accents, turn apostrophes/punctuation noise into spaces. */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’ʼ'`]/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Whole-word match on already-normalised text (the pattern may contain regex syntax). */
function word(pattern: string): RegExp {
  return new RegExp(`(?<![a-z0-9])(?:${pattern})(?![a-z0-9])`);
}

interface Signal {
  re: RegExp;
  weight: number;
  type?: OpportunitySuggestedType;
}

const s = (pattern: string, weight: number, type?: OpportunitySuggestedType): Signal => ({
  re: word(pattern),
  weight,
  type,
});

const SIGNALS: Signal[] = [
  // ---- English
  s('(?:we|we re|we are) (?:are )?(?:now )?hiring', 3),
  s('now hiring', 3),
  s('job openings?', 3),
  s('job vacanc(?:y|ies)', 3),
  s('vacanc(?:y|ies)', 3),
  s('open positions?', 3),
  s('positions? (?:is|are) (?:now )?open', 3),
  s('apply (?:now|today)', 3),
  s('send (?:us )?your (?:cv|resume)', 3),
  s('volunteers? (?:needed|wanted)', 3, 'VOLUNTEER'),
  s('we need volunteers?', 3, 'VOLUNTEER'),
  s('call for applications?', 3),
  s('grant applications?', 3, 'GRANT'),
  s('applications? (?:are )?(?:now )?open', 3),
  s('(?:we|we re|we are) (?:are )?looking for', 2),
  s('join our team', 2),
  s('internships?', 2),
  s('scholarships?', 2, 'SCHOLARSHIP'),
  s('fellowships?', 2, 'FELLOWSHIP'),
  s('freelancers? (?:needed|wanted)', 3, 'CONTRACT'),
  s('(?:contract|freelance|gig) (?:role|position|opportunity)', 2, 'CONTRACT'),
  s('fixed[- ]term contract', 2, 'CONTRACT'),
  s('funding opportunity', 2, 'GRANT'),
  s('grants? (?:available|for)', 1, 'GRANT'),
  s('(?:training )?programm?e applications?', 2, 'PROGRAM'),
  // ---- German
  s('wir stellen ein', 3),
  s('stellenangebote?', 3),
  s('stellenanzeigen?', 3),
  s('freie stelle', 3),
  s('jetzt bewerben', 3),
  s('bewirb dich', 3),
  s('(?:helfer|mitarbeiter|ehrenamtliche)\\w* gesucht', 3, 'VOLUNTEER'),
  s('wir suchen', 2),
  s('praktikum', 2),
  s('praktikanten?', 2),
  s('stipendium|stipendien', 2, 'SCHOLARSHIP'),
  // ---- French
  s('nous recrutons', 3),
  s('on recrute', 3),
  s('nous embauchons', 3),
  s('offres? d emploi', 3),
  s('offre de stage', 3),
  s('poste a pourvoir', 3),
  s('postulez', 3),
  s('appel a candidatures?', 3),
  s('benevoles? recherches?', 3, 'VOLUNTEER'),
  s('nous cherchons', 2),
  s('recrutement', 2),
  s('stagiaires?', 2),
  s('bourses? d etudes?', 3, 'SCHOLARSHIP'),
  s('bourses?', 2, 'SCHOLARSHIP'),
  // ---- Italian
  s('stiamo assumendo', 3),
  s('offerte? di lavoro', 3),
  s('posizione aperta', 3),
  s('candidati ora', 3),
  s('invia il tuo cv', 3),
  s('cerchiamo volontari', 3, 'VOLUNTEER'),
  s('cerchiamo', 2),
  s('tirocinio', 2),
  s('bors[ae] di studio', 3, 'SCHOLARSHIP'),
  // ---- Dutch
  s('vacatures?', 3),
  s('solliciteer', 3),
  s('wij nemen aan', 3),
  s('vrijwilligers gezocht', 3, 'VOLUNTEER'),
  s('wij zoeken|we zoeken', 2),
  s('stagiairs?|stageplekken?|stageplaats(?:en)?', 2),
  s('beurzen|studiebeurs|beurs', 2, 'SCHOLARSHIP'),
];

/** "stage" is English for a platform / phase. Only a hiring word when the text reads French or Dutch. */
const STAGE = word('stage');
const STAGE_SUPPORT = word(
  'stage (?:de|d|chez|bij|van|aan|en)|stagiaires?|offre|postul\\w*|solliciteer|stageplek\\w*|candidature\\w*|mois|maanden|duree|remunere\\w*|vergoeding',
);

/** Supporting cues: each adds 1 point (capped), and only counts once something else matched. */
const CUES = [
  word('apply|applying|applications?|application form'),
  word('deadline|closing date|apply by'),
  word('cv|resume|cover letter'),
  word('requirements?|qualifications?|responsibilities|salary|stipend'),
  word('full[- ]time|part[- ]time|remote|per month'),
  word('bewerb\\w*|bewerbung\\w*|lebenslauf|gehalt|frist|vollzeit|teilzeit'),
  word('candidature\\w*|candidat\\w*|postuler|date limite|salaire|mois|cv'),
  word('candidati|scadenza|stipendio|retribuzione|candidatura'),
  word('sollicit\\w*|uiterlijk|salaris|vergoeding|maanden|cv'),
];

/** Hashtags that announce an opening (3) or merely hint at one (2). */
const HASHTAG_STRONG = new Set([
  'hiring', 'nowhiring', 'wearehiring', 'vacancy', 'vacancies', 'jobopening', 'jobopenings',
  'jobvacancy', 'stellenangebot', 'stellenangebote', 'wirstellenein', 'recrutement', 'nousrecrutons',
  'offredemploi', 'offertadilavoro', 'stiamoassumendo', 'vacature', 'vacatures',
]);
const HASHTAG_WEAK = new Set([
  'jobs', 'job', 'jobalert', 'jobsearch', 'careers', 'career', 'internship', 'internships',
  'scholarship', 'scholarships', 'fellowship', 'fellowships', 'grants', 'grant', 'volunteer',
  'volunteers', 'praktikum', 'stipendium', 'emploi', 'stage', 'bourse', 'lavoro', 'tirocinio',
  'borsadistudio', 'beurs', 'vrijwilliger', 'jobsuche', 'ehrenamt', 'opportunity', 'opportunities',
]);
const HASHTAG_TYPE: Record<string, OpportunitySuggestedType> = {
  scholarship: 'SCHOLARSHIP', scholarships: 'SCHOLARSHIP', stipendium: 'SCHOLARSHIP', bourse: 'SCHOLARSHIP',
  borsadistudio: 'SCHOLARSHIP', beurs: 'SCHOLARSHIP',
  fellowship: 'FELLOWSHIP', fellowships: 'FELLOWSHIP',
  grant: 'GRANT', grants: 'GRANT',
  volunteer: 'VOLUNTEER', volunteers: 'VOLUNTEER', vrijwilliger: 'VOLUNTEER', ehrenamt: 'VOLUNTEER',
};

export function detectOpportunity(text: string | null | undefined): OpportunityDetection {
  const none: OpportunityDetection = { match: false, suggestedType: null };
  if (!text || typeof text !== 'string') return none;
  const t = normalise(text);

  let score = 0;
  const typeVotes = new Map<OpportunitySuggestedType, number>();
  const vote = (type: OpportunitySuggestedType | undefined, w: number) => {
    if (type) typeVotes.set(type, (typeVotes.get(type) ?? 0) + w);
  };

  for (const sig of SIGNALS) {
    if (sig.re.test(t)) {
      score += sig.weight;
      vote(sig.type, sig.weight);
    }
  }

  if (STAGE.test(t) && STAGE_SUPPORT.test(t)) score += 2;

  let tagScore = 0;
  const seenTags = new Set<string>();
  for (const m of t.matchAll(/#([a-z0-9_]{2,40})/g)) {
    const tag = m[1].replace(/_/g, '');
    if (seenTags.has(tag)) continue;
    seenTags.add(tag);
    const w = HASHTAG_STRONG.has(tag) ? 3 : HASHTAG_WEAK.has(tag) ? 2 : 0;
    if (w) {
      tagScore += w;
      vote(HASHTAG_TYPE[tag], w);
    }
  }
  score += Math.min(tagScore, HASHTAG_CAP * 2);

  if (score > 0) {
    let cues = 0;
    for (const cue of CUES) if (cue.test(t)) cues++;
    score += Math.min(cues, CUE_CAP);
  }

  if (score < THRESHOLD) return none;

  let best: OpportunitySuggestedType = 'EMPLOYMENT';
  let bestVotes = 0;
  for (const [type, votes] of typeVotes) {
    if (votes > bestVotes) {
      best = type;
      bestVotes = votes;
    }
  }
  return { match: true, suggestedType: best };
}
