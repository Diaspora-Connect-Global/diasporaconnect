'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SET_ONBOARDING_INTERESTS } from '@/services/gql/postsFeed';
import type {
  SetOnboardingInterestsData,
  SetOnboardingInterestsVars,
} from '@/services/gql/types/recommendation';
import { ButtonType1, ButtonType3 } from '@/components/custom/button';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';

/**
 * localStorage key used to remember that the user dismissed (or completed) the
 * cold-start interests prompt, so we don't nag them on every visit. Cleared
 * only by clearing site data.
 */
export const INTERESTS_PROMPT_DISMISSED_KEY = 'home:interestsPromptDismissed';

/**
 * Topic chips offered by the cold-start prompt. Keys mirror the onboarding
 * Step6 topic list so the same i18n strings (`onboarding.topics.*`) and the
 * same lowercase slugs reach `setOnboardingInterests`.
 */
const TOPIC_KEYS = [
  'technology',
  'science',
  'artsCulture',
  'sports',
  'healthWellness',
  'business',
  'entertainment',
  'education',
  'travel',
  'foodCooking',
  'politics',
  'environment',
] as const;

interface InterestsPromptCardProps {
  /** Fired after the card finishes (saved or dismissed) so the parent can hide it. */
  onDismiss: () => void;
}

/**
 * Cold-start "Set your interests" prompt rendered at the top of the "You" feed.
 *
 * Visibility is gated by the parent (page.tsx) on `myInterestProfile.coldStart`
 * + a thin feed + the localStorage dismissal flag. This component owns only the
 * chip selection + the `setOnboardingInterests` mutation.
 *
 * `setOnboardingInterests` is first-time-only server-side (it rejects once the
 * profile is warm). We treat any rejection as "already set" and just dismiss —
 * the card never blocks the feed.
 */
export function InterestsPromptCard({ onDismiss }: InterestsPromptCardProps) {
  const tTopics = useTranslations('onboarding.topics');
  const t = useTranslations('home.interestsPrompt');

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [setOnboardingInterests, { loading }] = useMutation<
    SetOnboardingInterestsData,
    SetOnboardingInterestsVars
  >(SET_ONBOARDING_INTERESTS);

  const topics = useMemo(
    () => TOPIC_KEYS.map((key) => ({ key, label: tTopics(key) })),
    [tTopics],
  );

  const persistDismissal = () => {
    try {
      localStorage.setItem(INTERESTS_PROMPT_DISMISSED_KEY, '1');
    } catch {
      /* localStorage may be unavailable — non-fatal. */
    }
  };

  const handleDismiss = () => {
    persistDismissal();
    onDismiss();
  };

  const toggleTopic = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    const topicsToSend = Array.from(selected).map((k) => k.toLowerCase());
    if (topicsToSend.length === 0) return;
    try {
      const result = await setOnboardingInterests({ variables: { topics: topicsToSend } });
      const outcome = readMutationOutcome(result, (d) => d.setOnboardingInterests);
      if (!outcome.ok) {
        // Server rejects once the profile is warm — treat as already set and
        // dismiss silently. Never surface an error here.
        console.warn('[InterestsPrompt] setOnboardingInterests failed; dismissing.', outcome.message);
        return;
      }
      toast.success(t('saved'));
    } catch (err) {
      console.error('[InterestsPrompt] unexpected error:', err);
    } finally {
      handleDismiss();
    }
  };

  return (
    <div className="relative mb-3 rounded-xl border border-border-subtle bg-surface-subtle p-4">
      <ButtonType3
        onClick={handleDismiss}
        aria-label={t('dismiss')}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent text-text-tertiary transition-colors hover:bg-surface-default min-w-0"
      >
        <X className="h-4 w-4" />
      </ButtonType3>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-brand/10 text-text-brand">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-text-primary">{t('title')}</h3>
          <p className="mt-0.5 text-sm text-text-secondary">{t('description')}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => {
          const isOn = selected.has(topic.key);
          return (
            <button
              key={topic.key}
              type="button"
              onClick={() => toggleTopic(topic.key)}
              aria-pressed={isOn}
              className={`rounded-full border px-3 py-1.5 text-sm transition-all cursor-pointer ${
                isOn
                  ? 'border-border-brand text-text-brand bg-surface-brand/10'
                  : 'border-border-subtle bg-surface-default text-text-primary hover:border-border-brand'
              }`}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ButtonType1
          onClick={handleSave}
          disabled={loading || selected.size === 0}
          className="px-4 py-2 text-sm"
        >
          {loading ? t('saving') : t('save')}
        </ButtonType1>
        <ButtonType3
          onClick={handleDismiss}
          className="border-0 bg-transparent px-2 py-2 text-sm text-text-secondary hover:text-text-primary min-w-0"
        >
          {t('notNow')}
        </ButtonType3>
      </div>
    </div>
  );
}
