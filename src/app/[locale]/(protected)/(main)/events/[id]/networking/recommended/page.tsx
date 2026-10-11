import NetworkingRecommended from '@/components/networking/NetworkingRecommended';

/** `/events/[id]/networking/recommended` — one recommended person at a time. */
export default async function NetworkingRecommendedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NetworkingRecommended eventId={id} />;
}
