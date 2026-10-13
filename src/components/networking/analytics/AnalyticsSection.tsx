'use client';

import AnalyticsPanel from './AnalyticsPanel';
import { useAnalyticsApi } from './useAnalytics';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';

/**
 * The Analytics tab body on the event manage page. Renders nothing, and (because the
 * hooks live in the panel it never mounts) sends nothing, until ANALYTICS_UI_ENABLED.
 */
export default function AnalyticsSection({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const api = useAnalyticsApi(eventId);
  if (!NETWORKING_FEATURES.analytics) return null;
  return <AnalyticsPanel api={api} eventTitle={eventTitle} />;
}
