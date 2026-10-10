import NetworkingSetup from '@/components/networking/NetworkingSetup';

/** `/events/[id]/networking/setup` — the six-step opt-in wizard. */
export default async function NetworkingSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NetworkingSetup eventId={id} />;
}
