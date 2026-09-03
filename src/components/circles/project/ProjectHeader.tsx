'use client';

import { useLocale, useTranslations } from 'next-intl';

import { StatusPill, type StatusPillVariant } from '../primitives';
import type {
  CircleProject,
  CircleProjectStatus,
} from '@/services/gql/types/circles';

/**
 * Status → pill variant.
 *
 * `ACTIVE` deliberately has no pill of its own on this screen: the "Project"
 * pill beside it already says what this is, and a second pill reading "Active"
 * on every healthy project is noise that trains the eye to ignore the slot the
 * abnormal states need. Only a state that changes what the reader should expect
 * — finished, abandoned, filed away, not yet started — earns one.
 */
const STATUS_VARIANT: Partial<Record<CircleProjectStatus, StatusPillVariant>> = {
  DRAFT: 'neutral',
  COMPLETED: 'success',
  ABANDONED: 'neutral',
  ARCHIVED: 'neutral',
};

/** Lowercase i18n leaf for a status, e.g. `COMPLETED` → `project.status.completed`. */
function statusKey(status: CircleProjectStatus): string {
  return status.toLowerCase();
}

export interface ProjectHeaderProps {
  project: CircleProject;
  /**
   * Display name of `project.createdBy`, already resolved with its fallback
   * applied. Absent when the project carries no proposer at all — a project
   * enacted from a motion may have none.
   */
  proposerName?: string | null;
}

/**
 * The identity block: what this is, who proposed it, when, and what it is called.
 *
 * The meta line is composed in ONE translated string rather than glued together
 * from a name and a date with a literal "·" in JSX. The separator, and whether
 * the date leads or trails, are language decisions — and a locale that has no
 * proposer to name still needs a sentence that reads, which is why the
 * date-only and name-only cases have their own keys instead of rendering a
 * dangling middot.
 */
export function ProjectHeader({ project, proposerName }: ProjectHeaderProps) {
  const t = useTranslations('circles');
  const locale = useLocale();

  const createdOn = formatCreatedOn(project.createdAt, locale);
  const name = proposerName?.trim() || '';

  const meta = name
    ? createdOn
      ? t('project.meta', { name, date: createdOn })
      : t('common.proposedBy', { name })
    : createdOn || '';

  const statusVariant = STATUS_VARIANT[project.status];

  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={t('project.title')} variant="brand" />
        {statusVariant && (
          <StatusPill
            label={t(`project.status.${statusKey(project.status)}`)}
            variant={statusVariant}
          />
        )}
        {meta && (
          <span className="caption-small text-text-secondary">{meta}</span>
        )}
      </div>

      <h1 className="heading-small mt-3 text-text-primary">{project.title}</h1>

      {project.description && (
        <p className="body-small mt-2 whitespace-pre-line text-text-secondary">
          {project.description}
        </p>
      )}
    </header>
  );
}

/** "1 Sep 2025", or `''` for a missing or unparseable timestamp. */
function formatCreatedOn(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
