import { Suspense } from 'react';
import { RequestHarness } from '@/components/networking/meetings/harness/MeetingsHarnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RequestHarness />
    </Suspense>
  );
}
