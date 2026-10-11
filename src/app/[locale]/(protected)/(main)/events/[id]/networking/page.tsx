import { Suspense } from 'react';
import PageLoader from '@/components/custom/PageLoader';
import NetworkingHub from '@/components/networking/NetworkingHub';

/** `/events/[id]/networking` — goals editor, people to meet, directory (and the interest / circle tabs once released). */
export default async function NetworkingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageLoader />}>
      <NetworkingHub eventId={id} />
    </Suspense>
  );
}
