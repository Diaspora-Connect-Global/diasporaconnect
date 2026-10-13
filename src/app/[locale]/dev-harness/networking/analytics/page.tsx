import { Suspense } from 'react';
import { AnalyticsHarness } from '@/components/networking/analytics/harness/AnalyticsHarness';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AnalyticsHarness />
    </Suspense>
  );
}
