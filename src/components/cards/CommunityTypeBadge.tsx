'use client';

import * as React from 'react';
import {
  Landmark,
  Church,
  GraduationCap,
  HandHeart,
  Globe,
  Building2,
  Briefcase,
  TrendingUp,
  Palette,
  Users,
  UsersRound,
  Trophy,
  Megaphone,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CommunityTypeBadgeProps {
  /** Community type as returned by the backend; `null`/absent renders nothing. */
  communityType?: { name: string; isEmbassy: boolean } | null;
  /** Visual density. 'card' = inline small pill, 'detail' = larger header chip. */
  size?: 'card' | 'detail';
  /** Allow consumer to add tracking / spacing classes. */
  className?: string;
}

/** Lowercase, trim, normalize apostrophes/whitespace so map keys match the
 *  backend's display name regardless of straight vs curly quotes. */
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Exact icon per seeded community type. Keys are the normalized display names
 * seeded in the backend (see SeedExtendedCommunityTypes migration), plus the
 * original defaults. Unknown/admin-created types fall back to a keyword scan,
 * then a generic tag icon.
 */
const EXACT_ICONS: Readonly<Record<string, LucideIcon>> = {
  'embassy & consulate': Landmark,
  embassy: Landmark,
  'religious organization': Church,
  'education community': GraduationCap,
  'ngo / nonprofit': HandHeart,
  ngo: HandHeart,
  'diaspora community': Globe,
  'business community': Building2,
  'professional community': Briefcase,
  'professional network': Briefcase,
  'investment community': TrendingUp,
  'cultural community': Palette,
  'cultural organization': Palette,
  'youth & student community': Users,
  'sports community': Trophy,
  'advocacy & support community': Megaphone,
  'general community': UsersRound,
};

/** Keyword fallback for custom / admin-created types not in EXACT_ICONS.
 *  Order matters — most specific first. Avoid short ambiguous substrings. */
const ICON_KEYWORDS: ReadonlyArray<readonly [string, LucideIcon]> = [
  ['embassy', Landmark],
  ['consulate', Landmark],
  ['govern', Landmark],
  ['religi', Church],
  ['church', Church],
  ['mosque', Church],
  ['faith', Church],
  ['educat', GraduationCap],
  ['school', GraduationCap],
  ['college', GraduationCap],
  ['universit', GraduationCap],
  ['scholar', GraduationCap],
  ['ngo', HandHeart],
  ['nonprofit', HandHeart],
  ['non-profit', HandHeart],
  ['charit', HandHeart],
  ['volunteer', HandHeart],
  ['humanitarian', HandHeart],
  ['diaspora', Globe],
  ['ethnic', Globe],
  ['hometown', Globe],
  ['business', Building2],
  ['chamber', Building2],
  ['commerce', Building2],
  ['startup', Building2],
  ['entrepreneur', Building2],
  ['professional', Briefcase],
  ['trade', Briefcase],
  ['career', Briefcase],
  ['invest', TrendingUp],
  ['finance', TrendingUp],
  ['cooperative', TrendingUp],
  ['cultur', Palette],
  ['creative', Palette],
  ['art', Palette],
  ['music', Palette],
  ['media', Palette],
  ['film', Palette],
  ['youth', Users],
  ['student', Users],
  ['family', Users],
  ['social', Users],
  ['network', Users],
  ['women', Users],
  ['sport', Trophy],
  ['advocacy', Megaphone],
  ['support', Megaphone],
  ['rights', Megaphone],
  ['politic', Megaphone],
  ['union', Megaphone],
  ['general', UsersRound],
];

function iconFor(name: string, isEmbassy: boolean): LucideIcon {
  if (isEmbassy) return Landmark;
  const normalized = normalize(name);
  const exact = EXACT_ICONS[normalized];
  if (exact) return exact;
  for (const [keyword, icon] of ICON_KEYWORDS) {
    if (normalized.includes(keyword)) return icon;
  }
  return Tag;
}

/**
 * Renders a community's type (e.g. "Embassy & Consulate", "Sports Community")
 * as an icon-only round chip. The type name is hidden — the icon carries a
 * native `title` so hovering it surfaces the name. Type names are free text
 * from the backend, so they are not translated.
 */
export function CommunityTypeBadge({
  communityType,
  size = 'card',
  className,
}: CommunityTypeBadgeProps): React.ReactElement | null {
  if (!communityType?.name) return null;

  const detail = size === 'detail';
  const sizeClass = detail ? 'p-1.5 [&>svg]:size-5' : 'p-1 [&>svg]:size-4';

  const Icon = iconFor(communityType.name, communityType.isEmbassy);

  return (
    <Badge
      variant="outline"
      className={cn(
        sizeClass,
        'rounded-full bg-surface-subtle text-text-secondary border-transparent',
        className,
      )}
    >
      <Icon role="img" aria-label={communityType.name} className="cursor-help">
        <title>{communityType.name}</title>
      </Icon>
    </Badge>
  );
}

export default CommunityTypeBadge;
