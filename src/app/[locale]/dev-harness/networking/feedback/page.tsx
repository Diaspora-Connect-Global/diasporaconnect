import { Suspense } from 'react';
import FeedbackHarness from '@/components/networking/feedback/harness/FeedbackHarness';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FeedbackHarness />
    </Suspense>
  );
}
