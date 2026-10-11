import { Suspense } from 'react';
import { CirclesHarness } from '@/components/networking/harness/Harnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CirclesHarness />
    </Suspense>
  );
}
