import { Suspense } from 'react';
import { DetailHarness } from '@/components/networking/meetings/harness/MeetingsHarnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DetailHarness />
    </Suspense>
  );
}
