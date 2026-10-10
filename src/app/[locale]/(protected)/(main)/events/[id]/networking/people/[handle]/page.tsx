import NetworkingPersonPage from '@/components/networking/NetworkingPersonPage';

/** `/events/[id]/networking/people/[handle]` — a person by their opaque per-event handle. */
export default async function PersonPage({ params }: { params: Promise<{ id: string; handle: string }> }) {
  const { id, handle } = await params;
  let decoded = handle;
  try {
    decoded = decodeURIComponent(handle);
  } catch {
    /* leave as-is; the gateway answers not-found for anything implausible */
  }
  return <NetworkingPersonPage eventId={id} handle={decoded} />;
}
