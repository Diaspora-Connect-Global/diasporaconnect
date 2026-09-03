'use client';

import { Fragment, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { EmbassyCommunity } from '../types';
import { parseRules, inlineRuns } from './parseRules';

/** Render `**bold**` runs without ever touching dangerouslySetInnerHTML. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineRuns(text).map((run, i) => (
        <Fragment key={i}>
          {run.bold ? (
            <strong className="font-semibold text-text-primary">{run.text}</strong>
          ) : (
            run.text
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * The community's rules / guidelines, as a tab of their own.
 *
 * These used to live in a right-rail card on the Community tab with a dialog
 * behind a "View full guidelines" link — three levels of nesting for the one
 * piece of content a member is most likely to be sent a link to. As a tab they
 * get a shareable `?tab=rules` URL and no longer compete with member
 * highlights for the rail.
 *
 * `communityRules` is a single free-text column that admins fill with light
 * Markdown — headings, a numbered list, bold rule titles, indented
 * explanations. `parseRules` turns that into blocks; splitting on `\n` and
 * ticking every line (what this did before, inherited from the rail card)
 * printed the literal `###` and `**`, made the document title look like a
 * rule, and broke each explanation off into a rule of its own.
 *
 * When there are no rules we say so — there are no fabricated defaults,
 * because a community that has not written any has not agreed to any.
 */
export interface EmbassyRulesTabProps {
  community: EmbassyCommunity;
}

export function EmbassyRulesTab({ community }: EmbassyRulesTabProps) {
  const t = useTranslations('community.embassy.community');

  const blocks = useMemo(() => parseRules(community.communityRules), [community.communityRules]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 lg:px-6">
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <h2 className="heading-xsmall flex items-center gap-2 text-text-primary">
            <ShieldCheck className="size-5 flex-shrink-0 text-text-success" aria-hidden />
            {t('guidelinesTitle')}
          </h2>
          <p className="caption-medium mt-1 text-text-secondary">{t('guidelinesSubtitle')}</p>

          {blocks.length > 0 ? (
            <div className="mt-5 space-y-4">
              {blocks.map((block, i) => {
                if (block.kind === 'heading') {
                  return (
                    <h3 key={i} className="label-large pt-1 text-text-primary">
                      <Inline text={block.text} />
                    </h3>
                  );
                }
                if (block.kind === 'paragraph') {
                  return (
                    <p key={i} className="body-small text-text-secondary">
                      <Inline text={block.text} />
                    </p>
                  );
                }
                return (
                  // `items-start`, not `items-center`: a rule that wraps would
                  // otherwise centre its tick against the whole block instead
                  // of against the first line.
                  <div key={i} className="flex items-start gap-2.5">
                    <Check
                      className="mt-1 size-4 flex-shrink-0 text-text-success"
                      aria-hidden
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="body-small break-words text-text-primary">
                        <Inline text={block.title} />
                      </p>
                      {block.body && (
                        <p className="caption-large break-words text-text-secondary">
                          <Inline text={block.body} />
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="body-small mt-5 text-text-secondary">{t('guidelinesEmpty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmbassyRulesTab;
