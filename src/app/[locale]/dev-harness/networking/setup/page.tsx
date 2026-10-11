import { Suspense } from 'react';
import { SetupHarness } from '@/components/networking/harness/Harnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SetupHarness />
    </Suspense>
  );
}
