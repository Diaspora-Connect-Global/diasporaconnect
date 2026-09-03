import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors `CircleHome`'s column geometry: a fixed-height flex column whose
 * middle band is the only thing that scrolls. Kept in step by hand rather than
 * imported, because a route-level `loading.tsx` must not pull in the client
 * component it is standing in for.
 */
const CHAT_COLUMN_CLASS =
  'mx-4 flex w-full min-w-0 flex-1 flex-col lg:w-[40vw] lg:min-w-[40vw] lg:max-w-[40vw] lg:flex-none';

/**
 * Loading skeleton for circle home.
 *
 * The boundary sits INSIDE `(home)/layout.tsx`, so the real `HomeSidebar` is
 * already on screen — only the chat column is mirrored here, the same split
 * `circles/loading.tsx` documents for the index.
 *
 * It draws the three bands of the real screen (header, conversation, composer)
 * so the layout does not jump when the data lands, and it includes one
 * full-width block among the bubbles because artefact cards sit inline in the
 * conversation.
 */
export default function CircleHomeLoading() {
  return (
    <div className="flex h-app-inner overflow-hidden">
      <div className={CHAT_COLUMN_CLASS}>
        {/* Header: avatar, name, member count, tab strip */}
        <div className="shrink-0 border-b border-border-subtle px-4 pt-2">
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-3 flex gap-4 pb-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </div>

        {/* Conversation */}
        <div className="min-h-0 flex-1 space-y-4 overflow-hidden px-4 py-4">
          <div className="flex gap-2">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-14 w-52 rounded-2xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="flex justify-end">
            <Skeleton className="h-12 w-40 rounded-2xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-14 w-60 rounded-2xl" />
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border-subtle p-4">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
