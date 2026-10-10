'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import PageLoader from '@/components/custom/PageLoader';
import PageFrame from './PageFrame';
import GateMessage from './GateMessage';
import SetupWizard, { CONSENT_VERSION } from './SetupWizard';
import { NetworkingHeader } from './NetworkingShell';
import { draftFromParticipation, preferencesInput, profileInput, type NetworkingDraft } from './draft';
import { useNetworkingBase, useReportRefusal, useSuggest } from './useNetworking';
import { eventDays } from '@/lib/networkingAvailability';
import { hasFailure } from '@/lib/networkingRefusal';
import {
  NETWORKING_CONTEXT,
  NETWORKING_JOIN,
  NETWORKING_MUTATION,
  NETWORKING_PREFILL,
  NETWORKING_SAVE_DRAFT,
  NETWORKING_SET_AVAILABILITY,
  type PrefillData,
} from '@/services/gql/networking';

export default function NetworkingSetup({ eventId }: { eventId: string }) {
  const t = useTranslations('networking');
  const router = useRouter();
  const base = useNetworkingBase(eventId);
  const report = useReportRefusal();
  const canSetUp = base.gate === 'needsSetup' || base.gate === 'withdrawn';
  const [draft, setDraft] = useState<NetworkingDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const prefillQ = useQuery<{ eventNetworkingPrefill: PrefillData | null }>(NETWORKING_PREFILL, { variables: { eventId }, skip: !canSetUp, ...NETWORKING_CONTEXT });
  const [saveDraft] = useMutation(NETWORKING_SAVE_DRAFT, NETWORKING_MUTATION);
  const [join] = useMutation(NETWORKING_JOIN, NETWORKING_MUTATION);
  const [setAvailability] = useMutation(NETWORKING_SET_AVAILABILITY, NETWORKING_MUTATION);

  const aiConsent = base.mine?.participation?.aiAssistConsent ?? false;
  const { suggest, enableAi } = useSuggest(eventId, base.taxonomy, aiConsent);

  useEffect(() => {
    if (canSetUp && base.mine && !draft) setDraft(draftFromParticipation(base.mine));
  }, [canSetUp, base.mine, draft]);

  // Already in: the hub is the place to be.
  useEffect(() => {
    if (base.gate === 'ready' || base.gate === 'paused') router.replace(`/events/${eventId}/networking`);
  }, [base.gate, eventId, router]);

  const timeZone = base.event?.timezone || 'UTC';
  const days = useMemo(() => (base.event?.startAt ? eventDays(base.event.startAt, base.event.endAt, timeZone) : []), [base.event?.startAt, base.event?.endAt, timeZone]);

  if (base.gate === 'loading' || base.gate === 'ready' || base.gate === 'paused' || (canSetUp && !draft)) return <PageLoader />;
  if (!canSetUp) {
    return (
      <PageFrame>
        <NetworkingHeader event={base.context} />
        <GateMessage state={base.gate as never} eventId={eventId} onRetry={() => void base.refetchMine()} />
      </PageFrame>
    );
  }
  const current = draft as NetworkingDraft;

  const saveLater = async () => {
    setSaving(true);
    try {
      const res = await saveDraft({ variables: { eventId, profile: profileInput(current), preferences: preferencesInput(current) } });
      if (hasFailure(res)) return report(res);
      toast.success(t('wizard.draftSaved'));
      router.push(`/events/${eventId}`);
    } catch (err) {
      report(err);
    } finally {
      setSaving(false);
    }
  };

  const doJoin = async (consent: boolean) => {
    if (!consent) return;
    setSaving(true);
    try {
      const res = await join({ variables: { eventId, consent: true, consentVersion: CONSENT_VERSION, profile: profileInput(current), preferences: preferencesInput(current) } });
      if (hasFailure(res)) return report(res);
      if (current.availability.length > 0) {
        const a = await setAvailability({ variables: { eventId, slots: current.availability } });
        if (hasFailure(a)) report(a);
      }
      toast.success(t('wizard.joined'));
      router.replace(`/events/${eventId}/networking`);
    } catch (err) {
      report(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageFrame>
      <NetworkingHeader event={base.context} title={t('wizard.pageTitle')} />
      <SetupWizard
        draft={current}
        onDraft={setDraft}
        taxonomy={base.taxonomy}
        labelOf={base.labelOf}
        prefill={prefillQ.data?.eventNetworkingPrefill ?? null}
        allowedVisibility={base.mine?.allowedVisibilityModes ?? []}
        aiConsent={aiConsent}
        onEnableAi={() => void enableAi().then((ok) => ok && base.refetchMine())}
        suggest={suggest}
        days={days}
        timeZone={timeZone}
        saving={saving}
        onSaveLater={() => void saveLater()}
        onJoin={(c) => void doJoin(c)}
      />
    </PageFrame>
  );
}
