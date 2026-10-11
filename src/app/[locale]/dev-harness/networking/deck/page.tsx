import { Suspense } from 'react';
import { DeckHarness } from '@/components/networking/harness/Harnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DeckHarness />
    </Suspense>
  );
}
