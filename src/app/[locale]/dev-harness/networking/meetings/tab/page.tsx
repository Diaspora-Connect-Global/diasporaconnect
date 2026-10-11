import { Suspense } from 'react';
import { TabHarness } from '@/components/networking/meetings/harness/MeetingsHarnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TabHarness />
    </Suspense>
  );
}
