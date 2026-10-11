import { notFound } from 'next/navigation';
import NetworkingCircleRoom from '@/components/networking/NetworkingCircleRoom';
import { CIRCLES_UI_ENABLED } from '@/lib/networkingFeatures';

/** `/events/[id]/networking/circles/[circleId]` — a circle's room. Not routable until circles are released. */
export default async function CircleRoomPage({ params }: { params: Promise<{ id: string; circleId: string }> }) {
  if (!CIRCLES_UI_ENABLED) notFound();
  const { id, circleId } = await params;
  return <NetworkingCircleRoom eventId={id} circleId={circleId} />;
}
