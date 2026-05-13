"use client";

interface TypingDotsProps {
    /** Tailwind background-color class for each dot. */
    dotClassName?: string;
    /** Tailwind size class applied to each dot (defaults to small, w-1.5 h-1.5). */
    sizeClassName?: string;
}

/** Three sequentially bouncing dots used in chat typing indicators. */
export function TypingDots({
    dotClassName = "bg-text-secondary",
    sizeClassName = "w-1.5 h-1.5",
}: TypingDotsProps) {
    return (
        <span className="inline-flex items-center gap-0.5">
            {[0, 150, 300].map((delay) => (
                <span
                    key={delay}
                    className={`${sizeClassName} ${dotClassName} rounded-full animate-bounce`}
                    style={{ animationDelay: `${delay}ms` }}
                />
            ))}
        </span>
    );
}
