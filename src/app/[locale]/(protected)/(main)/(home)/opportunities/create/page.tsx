'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Create/manage opportunities is restricted to community admins,
 * association admins, and system admins. Normal users cannot access this page.
 */
export default function CreateOpportunityPage() {
  const t = useTranslations('home.opportunities');

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/opportunities" className="text-text-secondary hover:text-text-primary">← Opportunities</Link>
      </div>
      <h1 className="text-2xl font-heading-large mb-4 text-text-primary">{t('create') ?? 'Create opportunity'}</h1>
      <p className="text-text-secondary mb-4">
        {t('createRestricted') ?? 'Creating and managing opportunities is restricted to community admins, association admins, and system admins. If you need to post an opportunity, please contact your community or association admin.'}
      </p>
      <Link href="/opportunities" className="text-text-brand font-medium hover:underline">
        {t('backToOpportunities') ?? 'Back to opportunities'}
      </Link>
    </div>
  );
}
