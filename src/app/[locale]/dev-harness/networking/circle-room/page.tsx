import { Suspense } from 'react';
import { CircleRoomHarness } from '@/components/networking/harness/Harnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CircleRoomHarness />
    </Suspense>
  );
}
