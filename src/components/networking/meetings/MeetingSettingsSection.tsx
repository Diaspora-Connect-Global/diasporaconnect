'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import MeetingSettingsEditor from './MeetingSettingsEditor';
import { useMeetingSettings } from './useMeetings';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';

/** Organiser meeting settings on the manage page. Renders nothing, and runs nothing, until MEETINGS_UI_ENABLED. */
export default function MeetingSettingsSection({ eventId }: { eventId: string }) {
  const enabled = NETWORKING_FEATURES.meetings;
  const t = useTranslations('networking.meetings.settings');
  const te = useTranslations('networking.errors');
  const q = useMeetingSettings(eventId, enabled);
  if (!enabled) return null;
  if (q.loading && !q.settings) return <Loader2 className="mx-auto size-5 animate-spin text-text-brand" aria-label={t('loading')} />;
  if (!q.settings) return <p role="alert" className="rounded-lg border border-border-subtle p-4 text-sm text-text-secondary">{te(q.failureKey ?? 'generic')}</p>;
  return (
    <MeetingSettingsEditor
      key={q.settings.version}
      settings={q.settings}
      onSave={async (input) => {
        const r = await q.save(input);
        return r.ok ? { ok: true } : r;
      }}
    />
  );
}
