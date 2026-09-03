import { Skeleton } from "@/components/ui/skeleton";
import { CIRCLE_COLUMN_CLASS } from "@/lib/feedColumnLayout";

/**
 * Loading skeleton for the invite-link redeem screen.
 *
 * Mirrors the single centred `JoinCard` the page always renders — icon disc,
 * heading, one line of explanation, one button — rather than a generic spinner,
 * so the layout does not jump when the real card arrives.
 *
 * This is the ROUTE boundary and is usually invisible: the page's own
 * `working` state (a spinning icon inside the same card) is what covers the
 * redemption round trip. This covers only the moment before the page's
 * JavaScript is running.
 *
 * Like the other boundaries under `circles/`, it sits INSIDE `(home)/layout.tsx`,
 * so the real sidebar is already on screen and only the main column is drawn.
 */
export default function CircleJoinLoading() {
  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={`${CIRCLE_COLUMN_CLASS} justify-center`}>
        <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-xl border border-border-subtle p-6">
          {/* Icon disc */}
          <Skeleton className="mb-4 size-12 rounded-full" />
          {/* Heading */}
          <Skeleton className="h-7 w-48" />
          {/* Explanation */}
          <Skeleton className="mt-3 h-4 w-64" />
          <Skeleton className="mt-2 h-4 w-40" />
          {/* Primary action */}
          <Skeleton className="mt-6 h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
