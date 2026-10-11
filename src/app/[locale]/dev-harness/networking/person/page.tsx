import { Suspense } from 'react';
import { PersonHarness } from '@/components/networking/harness/Harnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PersonHarness />
    </Suspense>
  );
}
