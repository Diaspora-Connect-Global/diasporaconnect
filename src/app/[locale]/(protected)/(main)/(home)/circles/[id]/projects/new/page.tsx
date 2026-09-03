'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { CreateProjectForm } from '@/components/circles/project';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Start a project.
 *
 * A full route rather than a dialog on the circle home: the form asks four
 * questions and then a fifth — whether this is the member's to do or the
 * circle's to vote on — and that last one deserves to be read rather than
 * dismissed. It is also linkable, so "propose a project" can be handed to
 * someone in a message.
 *
 * `CIRCLE_COLUMN_CLASS`, not `FEED_COLUMN_CLASS`: the feed column is tuned for
 * post cards and would size this form to the wrong width inside the `(home)`
 * sidebar shell.
 */
export default function NewCircleProjectPage() {
  const t = useTranslations('circles');
  const params = useParams();
  const circleId = String(params?.id ?? '');

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={`${CIRCLE_COLUMN_CLASS} overflow-y-auto`}>
        <div className="mx-auto w-full max-w-md pb-8">
          <div className="mb-4 flex items-center">
            <Link
              href={`/circles/${circleId}`}
              aria-label={t('common.back')}
              className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="heading-small text-text-primary">{t('newProject.title')}</h1>
            <p className="body-small mt-1 text-text-secondary">
              {t('newProject.subtitle')}
            </p>
          </div>

          <CreateProjectForm circleId={circleId} />
        </div>
      </div>
    </div>
  );
}
