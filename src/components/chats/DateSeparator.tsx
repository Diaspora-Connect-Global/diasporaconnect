/** Centered pill label between messages of different calendar days ("Today", "Yesterday", or a date). */
export function DateSeparator({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-center my-3">
            <span className="text-xs text-text-secondary bg-surface-hover px-3 py-1 rounded-full">
                {label}
            </span>
        </div>
    );
}
