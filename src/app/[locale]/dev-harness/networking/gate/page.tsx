import { Suspense } from 'react';
import { GateHarness } from '@/components/networking/harness/Harnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GateHarness />
    </Suspense>
  );
}
