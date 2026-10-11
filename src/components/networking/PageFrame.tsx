'use client';

/**
 * The page frame every networking screen shares: the same scroll container and
 * 80vw column the More / Discover pages use, with NO sidebar. `shell={false}`
 * is for the dev harness, which has no app header around it.
 */
export default function PageFrame({ children, shell = true }: { children: React.ReactNode; shell?: boolean }) {
  return (
    <div className={shell ? 'h-app-inner overflow-y-auto scrollbar-hide bg-background' : 'min-h-screen bg-background'}>
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-12 lg:w-[80vw] lg:px-0 lg:py-6">{children}</div>
    </div>
  );
}
