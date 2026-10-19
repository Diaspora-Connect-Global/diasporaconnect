'use client';

import { useMutation, useApolloClient } from '@apollo/client/react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { ADMIN_DELETE_POST } from '@/services/gql/postsFeed';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';

interface AdminDeletePostDialogProps {
  open: boolean;
  onCancel: () => void;
  postId: string;
  /** Called after the server confirmed the delete, so the card's list can drop it. */
  onDeleted?: (postId: string) => void;
}

/**
 * Confirm-and-delete for a super admin removing SOMEONE ELSE's post. Rendered
 * only when useIsSuperAdmin() is true; a refused call (any other role) is
 * shown as an error and the post stays.
 */
export function AdminDeletePostDialog({ open, onCancel, postId, onDeleted }: AdminDeletePostDialogProps) {
  const t = useTranslations('feed.adminDelete');
  const tRoot = useTranslations();
  const client = useApolloClient();
  const [adminDeletePost, { loading }] = useMutation(ADMIN_DELETE_POST);

  const confirm = async () => {
    try {
      const result = await adminDeletePost({
        variables: { input: { postId } },
        // We show our own translated message; the global link would add a second toast.
        context: { silentErrors: true },
      });
      // Under errorPolicy 'all' a refusal RESOLVES with data:null, and
      // `success:false` is a refusal too.
      const outcome = readMutationOutcome(result, (d) => (d.adminDeletePost?.success ? true : null));
      if (!outcome.ok) {
        toast.error(tRoot(refusalMessageKey(outcome.message, 'feed.errors')));
        return;
      }
      // Lists that read straight from the Apollo cache (profile tabs) drop the post too.
      const cacheId = client.cache.identify({ __typename: 'Post', id: postId });
      if (cacheId) {
        client.cache.evict({ id: cacheId });
        client.cache.gc();
      }
      onCancel();
      toast.success(t('deleted'));
      onDeleted?.(postId);
    } catch {
      toast.error(t('failed'));
    }
  };

  return (
    <ConfirmationModal
      open={open}
      onCancel={onCancel}
      onConfirm={confirm}
      title={t('title')}
      description={t('description')}
      confirmText={t('confirm')}
      confirmVariant="destructive"
      isLoading={loading}
    />
  );
}
