/* ── status model ─────────────────────────────────────────────────────────
   The backend returns a free-form status string; we normalize it into one of
   five buckets that drive the filter chips, the status pill, and the 4-step
   progress stepper (Submitted → Review → Approved → Completed).

   Shared by EmbassyTrackRequestsTab (the list) and EmbassyTrackRequestDetail
   (the single-request view) so both stay in lock-step. */
export type Bucket = 'pending' | 'review' | 'approved' | 'completed' | 'rejected';

export const STEP_KEYS = ['submitted', 'review', 'approved', 'completed'] as const;

export function statusBucket(status: string): Bucket {
  const s = (status || '').toUpperCase();
  if (s.includes('REJECT') || s.includes('CANCEL') || s.includes('DENIED') || s.includes('DECLINE'))
    return 'rejected';
  if (s.includes('COMPLETE') || s.includes('CLOSED') || s.includes('FULFILLED') || s.includes('DELIVERED'))
    return 'completed';
  if (s.includes('APPROVE') || s.includes('DECIDED') || s.includes('GRANTED')) return 'approved';
  if (s.includes('REVIEW') || s.includes('PROCESS') || s.includes('PROGRESS') || s.includes('INFO'))
    return 'review';
  return 'pending'; // SUBMITTED / PENDING / DRAFT / AWAITING
}

/** Index of the current step (0-3) for the stepper. */
export function bucketStep(bucket: Bucket): number {
  switch (bucket) {
    case 'pending':
      return 0;
    case 'review':
    case 'rejected':
      return 1;
    case 'approved':
      return 2;
    case 'completed':
      return 3;
  }
}

/** Pill colour per bucket (light surface + matching text). */
export const BUCKET_PILL: Record<Bucket, string> = {
  pending: 'bg-amber-50 text-amber-600',
  review: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-600',
  completed: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-600',
};
