'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { CommunityPostPreview } from '@/components/redesign/CommunityPostPreview';
import { useCommunityPostPreview } from '@/hooks/redesign/useCommunityPostPreview';

/** Up to three recent posts from the viewer's own communities; hidden when there are none. */
export function CommunityPosts({ href = '/community', testId = 'home-community-posts', titleKey = 'title', subtitleKey = 'subtitle', ns = 'redesign.communityPosts' }: { href?: string; testId?: string; titleKey?: string; subtitleKey?: string; ns?: string }) {
  const t = useTranslations(ns);
  const tAll = useTranslations('redesign.communityPosts');
  const { posts } = useCommunityPostPreview(3);
  if (posts.length === 0) return null;
  return (
    <Section labelledBy={`${testId}-title`} testId={testId}>
      <SectionHeader id={`${testId}-title`} title={t(titleKey)} subtitle={t(subtitleKey)} href={href} viewAllLabel={tAll('viewCommunity')} />
      <ul className="grid gap-3 md:grid-cols-3">
        {posts.map((p) => (
          <li key={p.id} className="min-w-0">
            <CommunityPostPreview post={p} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
