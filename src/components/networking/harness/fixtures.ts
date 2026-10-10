/**
 * Fixture data for the dev-harness pages ONLY (`/dev-harness/networking/*`).
 * Never imported by a real route: production screens run on gateway data and
 * on nothing else. The people below are invented.
 */
import type { CircleDetail, CircleMessage, CircleSummary, NetworkingCard, NetworkingPerson, ProfileFields, TaxonomyItem } from '@/services/gql/networking';
import type { NetworkingEventContext } from '../NetworkingShell';

const KINDS: Array<[TaxonomyItem['kind'], string, string[]]> = [
  ['ROLE', 'role', ['founder', 'investor', 'business_owner', 'professional', 'public_sector', 'researcher', 'student', 'service_provider', 'nonprofit', 'other']],
  ['INTEREST', 'interest', ['african_startups', 'fintech', 'agritech', 'real_estate', 'investment', 'govtech', 'digital_transformation', 'international_trade', 'healthcare_innovation', 'creative_industries', 'employment', 'partnerships', 'mentorship', 'research_collaboration', 'other']],
  ['CAPABILITY', 'capability', ['investment', 'funding', 'partnerships', 'technology', 'distribution', 'market_access', 'customers', 'suppliers', 'talent', 'mentorship', 'expertise', 'institutional', 'research', 'introductions', 'knowledge_exchange', 'other']],
  ['INDUSTRY', 'industry', ['agriculture', 'financial_services', 'technology', 'healthcare', 'education', 'real_estate_construction', 'energy_utilities', 'manufacturing', 'trade_logistics', 'media_creative', 'tourism_hospitality', 'public_sector', 'nonprofit_development', 'professional_services', 'retail_consumer', 'telecommunications', 'other']],
  ['MARKET', 'market', ['europe', 'uk_ireland', 'west_africa', 'east_africa', 'southern_africa', 'north_africa', 'central_africa', 'north_america', 'middle_east', 'asia_pacific', 'latin_america_caribbean', 'global']],
  ['LANGUAGE', 'language', ['en', 'fr', 'de', 'nl', 'it', 'es', 'pt', 'ar', 'sw', 'tw']],
];

export const TAXONOMY: TaxonomyItem[] = KINDS.flatMap(([kind, prefix, codes]) =>
  codes.map((c, i) => ({ code: `${prefix}.${c}`, kind, labelKey: `networking.taxonomy.${prefix}.${c}`, relatedCodes: [], sortOrder: (i + 1) * 10 })),
);

export const EVENT: NetworkingEventContext = {
  id: '00000000-0000-4000-8000-00000000e001',
  title: 'Diaspora Business Summit 2026',
  startAt: '2030-11-20T09:00:00.000Z',
  endAt: '2030-11-21T17:00:00.000Z',
  timezone: 'Africa/Accra',
  venue: 'Accra International Conference Centre, Accra, Ghana',
};

export const ME: ProfileFields = {
  headline: 'Founder and CEO',
  organization: 'Kente Labs',
  locationLabel: 'Berlin, Germany',
  intro: 'Building payment rails between Germany and Ghana.',
  roles: ['role.founder'],
  interests: ['interest.fintech', 'interest.investment', 'interest.african_startups'],
  needs: ['capability.funding', 'capability.market_access', 'capability.introductions'],
  offers: ['capability.technology', 'capability.expertise'],
  industries: ['industry.financial_services', 'industry.technology'],
  markets: ['market.west_africa', 'market.europe'],
  languages: ['language.en', 'language.de'],
  needsNote: null,
  offersNote: null,
  attendanceFormat: 'EITHER',
};

function card(over: Partial<NetworkingPerson> & { handle: string; displayName: string }): NetworkingPerson {
  return {
    avatarUrl: null, username: null, headline: null, organization: null, locationLabel: null, tier: 'SHARED_INTERESTS', mutualFit: false, reasons: [],
    roles: [], interests: [], needs: [], offers: [], industries: [], markets: [], languages: [], attendanceFormat: 'EITHER', connectionStatus: null, decision: null, isSelf: false,
    ...over,
  };
}

export const CARDS: NetworkingPerson[] = [
  card({ handle: 'h-ama-3f9', displayName: 'Ama Mensah', headline: 'Founder and CEO', organization: 'GreenTech Solutions', locationLabel: 'Accra, Ghana', tier: 'DIRECT_OPPORTUNITY', mutualFit: true, attendanceFormat: 'IN_PERSON', reasons: ['OFFERS_WHAT_YOU_NEED', 'NEEDS_WHAT_YOU_OFFER', 'SHARED_INTEREST', 'SHARED_MARKET'], roles: ['role.founder'], interests: ['interest.fintech', 'interest.investment', 'interest.govtech'], needs: ['capability.technology', 'capability.expertise', 'capability.institutional'], offers: ['capability.funding', 'capability.market_access'], industries: ['industry.technology', 'industry.public_sector'], markets: ['market.west_africa'], languages: ['language.en', 'language.tw'], intro: 'Scaling sustainable technology for the public sector across West Africa.' }),
  card({ handle: 'h-david-71c', displayName: 'David Owusu', headline: 'Investment Manager', organization: 'AfricInvest', locationLabel: 'Accra, Ghana', tier: 'STRONG_FIT', reasons: ['OFFERS_WHAT_YOU_NEED', 'SHARED_INDUSTRY'], interests: ['interest.investment', 'interest.agritech'], needs: ['capability.technology'], offers: ['capability.investment', 'capability.funding'], industries: ['industry.financial_services'], markets: ['market.west_africa'], languages: ['language.en'] }),
  card({ handle: 'h-sarah-a02', displayName: 'Sarah Mensah', headline: 'Policy Analyst', organization: 'Ghana Policy Institute', locationLabel: 'Accra, Ghana', tier: 'SHARED_INTERESTS', reasons: ['SHARED_INTEREST', 'SHARED_LANGUAGE'], interests: ['interest.govtech', 'interest.digital_transformation', 'interest.fintech'], needs: ['capability.research'], offers: ['capability.institutional'], industries: ['industry.public_sector'], languages: ['language.en'] }),
  card({ handle: 'h-kwame-9d4', displayName: 'Kwame Asante', headline: 'Tech Entrepreneur', organization: 'InnovateGH', locationLabel: 'Kumasi, Ghana', tier: 'STRONG_FIT', reasons: ['NEEDS_WHAT_YOU_OFFER', 'SHARED_MARKET'], interests: ['interest.fintech', 'interest.african_startups'], needs: ['capability.technology', 'capability.mentorship'], offers: ['capability.distribution'], industries: ['industry.technology'], markets: ['market.west_africa', 'market.europe'], languages: ['language.en', 'language.tw'] }),
  card({ handle: 'h-ama-b-c18', displayName: 'Ama Boakye', headline: 'Project Lead', organization: 'Partnerships Hub', locationLabel: 'Accra, Ghana', tier: 'BROADER_COMPATIBILITY', reasons: ['SHARED_LANGUAGE', 'COMPATIBLE_FORMAT'], interests: ['interest.partnerships'], needs: ['capability.partnerships'], offers: ['capability.introductions'], languages: ['language.en', 'language.de'] }),
  card({ handle: 'h-felix-e55', displayName: 'Felix Mensah', headline: 'Venture Capitalist', organization: 'Africa Venture Hub', locationLabel: 'Lagos, Nigeria', tier: 'DIRECT_OPPORTUNITY', reasons: ['OFFERS_WHAT_YOU_NEED', 'SHARED_INTEREST'], interests: ['interest.investment', 'interest.african_startups'], needs: ['capability.technology'], offers: ['capability.funding', 'capability.introductions'], industries: ['industry.financial_services'], markets: ['market.west_africa'], languages: ['language.en'] }),
];

export const CIRCLES: CircleSummary[] = [
  { id: 'c1', title: 'Investing in African Startups', purpose: 'For investors, founders and people exploring African startup opportunities.', category: 'Investment', hostName: 'Emmanuel Mensah', hostHeadline: 'Founder, Africa Venture Hub', startsAt: 'Thu 20 Nov, 14:00', format: 'In person', venue: 'Networking Hall', capacity: 10, memberCount: 8, joinPolicy: 'OPEN', myStatus: 'ACTIVE', whyRecommended: 'You are looking for funding and this circle matches your goals.', tags: ['Investment', 'Startups', 'Venture Capital', 'Africa'] },
  { id: 'c2', title: 'Looking for Business Partners in Europe', purpose: 'Meet people interested in partnerships between Africa and Europe.', category: 'Partnerships', hostName: 'Aisha Bello', hostHeadline: 'CEO, Global Bridge Partners', startsAt: 'Thu 20 Nov, 15:30', format: 'In person', venue: 'Meeting Room B', capacity: 8, memberCount: 6, joinPolicy: 'APPROVAL', myStatus: 'NONE', whyRecommended: 'You are interested in market access in Europe.', tags: ['Partnerships', 'Europe'] },
  { id: 'c3', title: 'Technology and Digital Transformation', purpose: 'Founders, technologists and public-sector innovators.', category: 'Technology', hostName: 'Kwame Adjei', hostHeadline: 'CTO, TechBridge Africa', startsAt: 'Fri 21 Nov, 10:00', format: 'Hybrid', venue: 'Online and in person', capacity: 12, memberCount: 10, joinPolicy: 'OPEN', myStatus: 'NONE', whyRecommended: 'You are interested in technology and government innovation.', tags: ['Technology'] },
  { id: 'c4', title: 'Sustainable Agriculture', purpose: 'Agritech, farming innovation and food systems.', category: 'Agriculture', capacity: 15, memberCount: 12, joinPolicy: 'OPEN', myStatus: 'NONE', tags: ['Agriculture'] },
  { id: 'c5', title: 'Government and Policy Innovation', purpose: 'Public-sector partnerships and policy.', category: 'Public sector', capacity: 9, memberCount: 7, joinPolicy: 'INVITE_ONLY', myStatus: 'NONE', tags: ['Policy'] },
];

export const CIRCLE_DETAIL: CircleDetail = {
  ...CIRCLES[0],
  focusAreas: ['Early-stage investment', 'Growth-stage funding', 'Impact investment', 'Cross-border opportunities'],
  agenda: 'Introductions, then open discussion on funding routes into African startups.',
  members: [
    { handle: 'm1', displayName: 'Emmanuel Mensah', headline: 'Founder, Africa Venture Hub', isHost: true },
    { handle: 'm2', displayName: 'Kwame Asante', headline: 'Founder, FintechStart', isMe: true },
    { handle: 'm3', displayName: 'Ama Mensah', headline: 'Investor, GreenTech Capital' },
    { handle: 'm4', displayName: 'David Owusu', headline: 'Angel Investor' },
  ],
  resources: [
    { id: 'r1', title: 'Pitch Deck Template', kind: 'PDF', sizeLabel: '2.4 MB' },
    { id: 'r2', title: 'Investment Checklist', kind: 'PDF', sizeLabel: '1.1 MB' },
  ],
};

export const CIRCLE_MESSAGES: CircleMessage[] = [
  { id: 'x1', authorName: 'Kwame Asante', authorHeadline: 'Founder', body: 'Great to be here. I am looking for seed investment for my fintech startup in Ghana.', sentAt: '2030-11-20T10:05:00.000Z', isMe: true },
  { id: 'x2', authorName: 'Ama Mensah', authorHeadline: 'Investor', body: 'This sounds interesting, Kwame. Could you share a short pitch deck?', sentAt: '2030-11-20T10:12:00.000Z' },
  { id: 'x3', authorName: 'Emmanuel Mensah', authorHeadline: 'Host', isHost: true, body: 'Welcome everyone. Introduce yourself and what you are working on.', sentAt: '2030-11-20T10:01:00.000Z' },
];
