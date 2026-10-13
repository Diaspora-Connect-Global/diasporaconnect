import { Suspense } from 'react';
import RecapHarness from '@/components/networking/recap/harness/RecapHarness';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RecapHarness />
    </Suspense>
  );
}
