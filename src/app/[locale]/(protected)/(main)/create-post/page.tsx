'use client';

import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { PostComposerForm } from '@/components/posts/PostComposerForm';

/** Deep-link route: the same form the composer modal shows, full page. */
export default function CreatePostPage() {
  const router = useRouter();
  // Short pause so the success toast is seen before the redirect (unchanged behaviour).
  const onPosted = useCallback(() => {
    setTimeout(() => router.push('/home'), 1000);
  }, [router]);
  return <PostComposerForm variant="page" onPosted={onPosted} />;
}
