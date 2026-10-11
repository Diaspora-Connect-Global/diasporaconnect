import type { TaxonomyItem } from '@/services/gql/networking';

/**
 * Offline keyword -> taxonomy suggester. Used when the person has not turned
 * on AI assistance, or the assistant is unavailable / over its limit. It only
 * reads text already typed in the browser; nothing leaves the device.
 *
 * Keywords are lower-case stems matched as substrings of the normalised text,
 * in the five site languages. A code is suggested when any of its stems occurs.
 */
const KEYWORDS: Record<string, string[]> = {
  'capability.investment': ['invest', 'investor', 'investisse', 'investeer', 'investit', 'venture', 'capital'],
  'capability.funding': ['fund', 'grant', 'financ', 'funding', 'förder', 'subvention', 'finanzier', 'fondi', 'subsid'],
  'capability.partnerships': ['partner', 'collab', 'partenar', 'samenwerk', 'kooperation', 'collabora', 'alliance'],
  'capability.technology': ['tech', 'software', 'digital', 'saas', 'app', 'logiciel', 'programm'],
  'capability.distribution': ['distribut', 'logist', 'supply', 'vertrieb', 'distribuzione', 'levering'],
  'capability.market_access': ['market access', 'export', 'expand', 'expansion', 'marktzugang', 'accès au marché', 'accesso al mercato', 'markttoegang'],
  'capability.customers': ['customer', 'client', 'buyer', 'kunde', 'klant', 'cliente'],
  'capability.suppliers': ['supplier', 'sourcing', 'lieferant', 'fournisseur', 'leverancier', 'fornitore'],
  'capability.talent': ['talent', 'hire', 'hiring', 'recruit', 'job', 'employ', 'stelle', 'emploi', 'baan', 'lavoro'],
  'capability.mentorship': ['mentor', 'coach', 'guidance', 'begleit', 'accompagn', 'begeleid'],
  'capability.expertise': ['expert', 'advice', 'consult', 'berat', 'conseil', 'advies', 'consulenz', 'know-how'],
  'capability.institutional': ['government', 'ministry', 'public sector', 'embassy', 'regierung', 'gouvernement', 'overheid', 'governo', 'institution'],
  'capability.research': ['research', 'universit', 'academ', 'forschung', 'recherche', 'onderzoek', 'ricerca'],
  'capability.introductions': ['introduc', 'connect me', 'network', 'vorstell', 'présent', 'kennismak', 'presentaz'],
  'capability.knowledge_exchange': ['learn', 'knowledge', 'workshop', 'lernen', 'apprendre', 'leren', 'imparare'],
  'interest.african_startups': ['startup', 'start-up', 'founder'],
  'interest.fintech': ['fintech', 'payment', 'mobile money', 'bank', 'zahlung', 'paiement', 'betaling', 'pagament'],
  'interest.agritech': ['agri', 'farm', 'crop', 'landwirt', 'agricult', 'landbouw'],
  'interest.real_estate': ['real estate', 'property', 'housing', 'immobil', 'vastgoed'],
  'interest.investment': ['invest'],
  'interest.govtech': ['govtech', 'e-government', 'civic tech', 'public service'],
  'interest.digital_transformation': ['digital transformation', 'digitali', 'digitaal', 'transformation numérique'],
  'interest.international_trade': ['trade', 'export', 'import', 'handel', 'commerce', 'commercio'],
  'interest.healthcare_innovation': ['health', 'medic', 'gesundheit', 'santé', 'gezondheid', 'salute'],
  'interest.creative_industries': ['creative', 'film', 'music', 'media', 'design', 'fashion', 'kreativ', 'créatif'],
  'interest.employment': ['employ', 'career', 'job', 'karriere', 'carrière', 'carriera'],
  'interest.partnerships': ['partner'],
  'interest.mentorship': ['mentor'],
  'interest.research_collaboration': ['research', 'forschung', 'recherche', 'onderzoek', 'ricerca'],
  'role.founder': ['founder', 'co-founder', 'gründer', 'fondateur', 'oprichter', 'fondatore'],
  'role.investor': ['investor', 'angel', 'vc ', 'investisseur', 'investeerder', 'investitore'],
  'role.business_owner': ['business owner', 'entrepreneur', 'unternehmer', 'ondernemer', 'imprenditore'],
  'role.public_sector': ['civil servant', 'public sector', 'government official', 'ministry', 'öffentlich'],
  'role.researcher': ['researcher', 'scientist', 'professor', 'forscher', 'chercheur', 'onderzoeker', 'ricercatore'],
  'role.student': ['student', 'étudiant', 'studente'],
  'market.europe': ['europe', 'europa', 'eu ', 'european'],
  'market.uk_ireland': ['uk', 'united kingdom', 'britain', 'ireland', 'royaume-uni'],
  'market.west_africa': ['west africa', 'ghana', 'nigeria', 'senegal', 'afrique de l'],
  'market.east_africa': ['east africa', 'kenya', 'tanzania', 'uganda', 'rwanda', 'ethiopia'],
  'market.southern_africa': ['southern africa', 'south africa', 'zambia', 'zimbabwe', 'botswana'],
  'market.north_america': ['north america', 'usa', 'canada', 'united states', 'amerika'],
  'market.global': ['global', 'worldwide', 'international', 'weltweit', 'mondial', 'wereldwijd'],
  'industry.agriculture': ['agri', 'farm', 'landwirt', 'agricol'],
  'industry.financial_services': ['bank', 'insurance', 'financial', 'versicher', 'assurance', 'verzeker'],
  'industry.technology': ['software', 'it ', 'tech', 'digital'],
  'industry.healthcare': ['health', 'hospital', 'pharma', 'gesundheit', 'santé'],
  'industry.education': ['education', 'school', 'university', 'bildung', 'éducation', 'onderwijs', 'istruzione'],
  'industry.energy_utilities': ['energy', 'solar', 'power', 'energie', 'énergie'],
  'industry.media_creative': ['media', 'film', 'music', 'design'],
  'industry.tourism_hospitality': ['tourism', 'hotel', 'travel', 'tourisme', 'toerisme'],
  'industry.trade_logistics': ['logistic', 'shipping', 'freight', 'logistik', 'logistiek'],
  'industry.real_estate_construction': ['construct', 'real estate', 'building', 'bau', 'bouw'],
};

function normalise(s: string): string {
  return ` ${s.toLowerCase().normalize('NFC')} `;
}

/**
 * Codes (from `available`, most keyword hits first, max 6) whose stems occur in `text`.
 * Optionally restricted to codes with one of `prefixes` (e.g. ['capability.']).
 */
export function suggestOffline(text: string, available: TaxonomyItem[], prefixes?: string[]): string[] {
  const hay = normalise(text);
  if (hay.trim().length < 3) return [];
  const known = new Set(available.map((i) => i.code));
  const scored: Array<{ code: string; hits: number }> = [];
  for (const [code, stems] of Object.entries(KEYWORDS)) {
    if (!known.has(code)) continue;
    if (prefixes && !prefixes.some((p) => code.startsWith(p))) continue;
    const hits = stems.reduce((n, stem) => (hay.includes(stem) ? n + 1 : n), 0);
    if (hits > 0) scored.push({ code, hits });
  }
  scored.sort((a, b) => b.hits - a.hits || a.code.localeCompare(b.code));
  return scored.slice(0, 6).map((s) => s.code);
}
