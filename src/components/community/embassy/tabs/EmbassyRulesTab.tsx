'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { EmbassyCommunity } from '../types';

/**
 * The community's rules / guidelines, as a tab of their own.
 *
 * These used to live in a right-rail card on the Community tab with a dialog
 * behind a "View full guidelines" link — three levels of nesting for the one
 * piece of content a member is most likely to be sent a link to. As a tab they
 * get a shareable `?tab=rules` URL and no longer compete with member
 * highlights for the rail.
 *
 * `communityRules` is a single free-text string; one rule per line is the
 * convention the admin console writes. Blank lines are dropped. When it is
 * empty we say so — there are no fabricated default rules, because a community
 * that has not written any has not agreed to any.
 */
export interface EmbassyRulesTabProps {
  community: EmbassyCommunity;
}

export function EmbassyRulesTab({ community }: EmbassyRulesTabProps) {
  const t = useTranslations('community.embassy.community');

  const ruleItems = useMemo(
    () =>
      (community.communityRules ?? '')
        .split(/\r?\n/)
        .map((r) => r.trim())
        .filter(Boolean),
    [community.communityRules],
  );

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 lg:px-6">
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <h2 className="heading-xsmall flex items-center gap-2 text-text-primary">
            <ShieldCheck className="size-5 flex-shrink-0 text-text-success" aria-hidden />
            {t('guidelinesTitle')}
          </h2>
          <p className="caption-medium mt-1 text-text-secondary">{t('guidelinesSubtitle')}</p>

          {ruleItems.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {ruleItems.map((rule) => (
                <li
                  key={rule}
                  // `items-start`, not `items-center`: a rule that wraps to two
                  // lines would otherwise centre its tick against the whole
                  // block instead of against the first line.
                  className="body-small flex items-start gap-2.5 text-text-primary"
                >
                  <Check className="mt-0.5 size-4 flex-shrink-0 text-text-success" aria-hidden />
                  <span className="min-w-0 break-words">{rule}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="body-small mt-5 text-text-secondary">{t('guidelinesEmpty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmbassyRulesTab;
