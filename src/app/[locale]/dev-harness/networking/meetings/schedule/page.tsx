import { Suspense } from 'react';
import { ScheduleHarness } from '@/components/networking/meetings/harness/MeetingsHarnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScheduleHarness />
    </Suspense>
  );
}
