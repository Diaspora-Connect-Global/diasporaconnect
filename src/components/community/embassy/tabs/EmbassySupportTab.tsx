'use client';

import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { LifeBuoy, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonType2 } from '@/components/custom/button';
import {
  SUPPORT_CASE_TYPES,
  type SupportCaseTypesResponse,
} from '@/services/gql/embassyServices';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';

interface EmbassySupportTabProps {
  profile: EmbassyProfile;
  community: EmbassyViewProps['community'];
  communityId: string;
}

/** Support = support-service case-type topics + the embassy's contact / emergency info. */
export function EmbassySupportTab({ profile, community, communityId }: EmbassySupportTabProps) {
  const t = useTranslations('community.embassy');

  const { data, loading } = useQuery<SupportCaseTypesResponse>(SUPPORT_CASE_TYPES, {
    variables: { ownerType: 'COMMUNITY', ownerEntityId: communityId },
    fetchPolicy: 'cache-and-network',
  });

  // Backend contact fields fall back to the mock profile when null/empty.
  const phone = community.contactPhone || profile.phone;
  const email = community.contactEmail || profile.email;
  const address = community.address || profile.addressLine;

  const topics = (data?.caseTypes ?? []).filter((c) => c.isActive !== false);

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_20rem] lg:px-6">
      {/* Topics */}
      <div className="min-w-0 space-y-6">
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h2 className="heading-xsmall text-text-primary">{t('support.title')}</h2>
            <p className="body-small mb-4 text-text-secondary">{t('support.subtitle')}</p>

            {loading && topics.length === 0 ? (
              <p className="body-small py-4 text-text-secondary">{t('support.loading')}</p>
            ) : topics.length === 0 ? (
              <p className="body-small py-4 text-text-secondary">{t('support.empty')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-start gap-3 rounded-lg border border-border-subtle p-3"
                  >
                    <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-brand">
                      <LifeBuoy className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="label-medium text-text-primary">{topic.displayName}</p>
                      {topic.description && (
                        <p className="caption-small line-clamp-2 text-text-secondary">
                          {topic.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact / emergency rail */}
      <aside className="space-y-6">
        <div className="rounded-lg border border-border-danger bg-surface-danger p-4">
          <p className="label-medium flex items-center gap-2 text-text-danger">
            <AlertTriangle className="size-4" aria-hidden />
            {t('support.emergencyTitle')}
          </p>
          <p className="body-small mt-1 text-text-secondary">{t('support.emergencyBody')}</p>
          <a href={`tel:${profile.emergencyLine}`} className="mt-3 block">
            <ButtonType2 className="w-full justify-center py-2">{profile.emergencyLine}</ButtonType2>
          </a>
        </div>

        <Card className="border-border-subtle">
          <CardContent className="space-y-3 p-5">
            <h3 className="label-large text-text-primary">{t('support.contactTitle')}</h3>
            <p className="caption-medium flex items-center gap-2 text-text-secondary">
              <Phone className="size-4 flex-shrink-0" aria-hidden />
              {phone}
            </p>
            <p className="caption-medium flex items-center gap-2 break-all text-text-secondary">
              <Mail className="size-4 flex-shrink-0" aria-hidden />
              {email}
            </p>
            <p className="caption-medium flex items-start gap-2 text-text-secondary">
              <MapPin className="size-4 flex-shrink-0" aria-hidden />
              {address}
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export default EmbassySupportTab;
