"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * BottomSheet — a bottom-anchored modal built on Radix Dialog.
 *
 * Why not just use `Dialog`? Dialog renders centered with a zoom-in animation; bottom
 * sheets slide up from the bottom edge, have rounded top corners only, and show a drag
 * handle indicator. Same primitives underneath (overlay, focus trap, ESC to close,
 * backdrop click to close), different positioning and motion.
 *
 * Visual drag-to-dismiss is not implemented (would need gesture handling). The handle is
 * a visual affordance only — users still close via the X button, backdrop tap, or ESC.
 *
 * Usage mirrors Dialog:
 *   <BottomSheet open={open} onOpenChange={setOpen}>
 *     <BottomSheetContent>
 *       <BottomSheetHeader>
 *         <BottomSheetTitle>...</BottomSheetTitle>
 *       </BottomSheetHeader>
 *       ...
 *     </BottomSheetContent>
 *   </BottomSheet>
 */
function BottomSheet({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="bottom-sheet" {...props} />;
}

function BottomSheetTrigger({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />;
}

function BottomSheetClose({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot="bottom-sheet-close" {...props} />;
}

function BottomSheetOverlay({
    className,
    scoped = false,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay> & { scoped?: boolean }) {
    return (
        <DialogPrimitive.Overlay
            data-slot="bottom-sheet-overlay"
            className={cn(
                // `scoped` confines the dim layer to the portal container's bounds
                // (e.g. the chat area only). Default covers the whole viewport.
                scoped ? "absolute inset-0 z-40 bg-black/40" : "fixed inset-0 z-50 bg-black/50",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                className,
            )}
            {...props}
        />
    );
}

function BottomSheetContent({
    className,
    children,
    showCloseButton = true,
    showDragHandle = true,
    containerRef,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
    showDragHandle?: boolean;
    /**
     * When provided, the sheet portals into the referenced element instead of `document.body`
     * and switches to `position: absolute` so it spans that container (e.g. the chat area)
     * rather than the full viewport. The container MUST have `position: relative` set.
     */
    containerRef?: React.RefObject<HTMLElement | null>;
}) {
    const scoped = !!containerRef;
    return (
        <DialogPrimitive.Portal data-slot="bottom-sheet-portal" container={containerRef?.current}>
            <BottomSheetOverlay scoped={scoped} />
            <DialogPrimitive.Content
                data-slot="bottom-sheet-content"
                className={cn(
                    // Positioning: scoped sheets anchor to a `relative` parent and span its width;
                    // viewport sheets are fixed to the bottom with a max-width cap.
                    scoped
                        ? "absolute inset-x-0 bottom-0 z-50 max-h-[90%]"
                        : "fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full sm:max-w-md max-h-[90vh]",
                    // Visual: rounded TOP corners only
                    "bg-surface-default text-text-primary",
                    "rounded-t-2xl shadow-2xl",
                    "overflow-y-auto",
                    // Padding: leaves room for safe-area + drag handle
                    "px-4 pb-6 pt-2 sm:px-6",
                    // Slide-up animation
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                    "duration-200",
                    className,
                )}
                {...props}
            >
                {showDragHandle && (
                    <div
                        aria-hidden
                        className="mx-auto mt-1 mb-2 h-1 w-10 rounded-full bg-text-tertiary/30"
                    />
                )}
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close
                        data-slot="bottom-sheet-close"
                        className={cn(
                            "absolute right-4 top-4 rounded-full p-1.5",
                            "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                            "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand",
                        )}
                    >
                        <XIcon className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

function BottomSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="bottom-sheet-header"
            className={cn("flex flex-col gap-1 pr-8 pb-3", className)}
            {...props}
        />
    );
}

function BottomSheetTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="bottom-sheet-title"
            className={cn("text-base font-semibold leading-none", className)}
            {...props}
        />
    );
}

function BottomSheetDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="bottom-sheet-description"
            className={cn("text-sm text-text-secondary", className)}
            {...props}
        />
    );
}

export {
    BottomSheet,
    BottomSheetTrigger,
    BottomSheetClose,
    BottomSheetOverlay,
    BottomSheetContent,
    BottomSheetHeader,
    BottomSheetTitle,
    BottomSheetDescription,
};
