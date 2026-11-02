import { ApplicantsView } from '@/components/opportunities/ApplicantsView';

/** `/opportunities/{id}/applicants` — review applications to a listing you posted. */
export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicantsView opportunityId={id} />;
}
