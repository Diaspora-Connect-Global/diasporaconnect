import { Suspense } from 'react';
import { HubHarness } from '@/components/networking/harness/Harnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HubHarness />
    </Suspense>
  );
}
