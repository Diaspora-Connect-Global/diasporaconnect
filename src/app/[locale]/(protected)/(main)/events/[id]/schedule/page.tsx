import { notFound } from 'next/navigation';
import SchedulePage from '@/components/networking/meetings/SchedulePage';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';

/** `/events/[id]/schedule` — meetings, programme and circle sessions on one timeline. A 404 until MEETINGS_UI_ENABLED. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!NETWORKING_FEATURES.meetings) notFound();
  return <SchedulePage eventId={id} />;
}
