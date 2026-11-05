'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { CreateProjectForm } from '@/components/circles/project';
import { CircleFormScreen } from '@/components/circles/shell';

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
    <CircleFormScreen title={t('newProject.title')} subtitle={t('newProject.subtitle')}>
      <CreateProjectForm circleId={circleId} />
    </CircleFormScreen>
  );
}
