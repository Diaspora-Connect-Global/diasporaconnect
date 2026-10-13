import { Suspense } from 'react';
import EventDayHarness from '@/components/networking/eventday/harness/EventDayHarness';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventDayHarness />
    </Suspense>
  );
}
