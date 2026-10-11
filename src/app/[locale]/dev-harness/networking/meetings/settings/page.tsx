import { Suspense } from 'react';
import { SettingsHarness } from '@/components/networking/meetings/harness/MeetingsHarnesses';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsHarness />
    </Suspense>
  );
}
