"use client";

import { Check } from "lucide-react";

import type { ApiMessage } from "@/store/ChatStore";

interface MessageStatusIconProps {
    status: ApiMessage["status"];
    /** Tailwind classes for the read-state color. Default matches WhatsApp blue. */
    readClassName?: string;
    /** Tailwind classes for the sent/delivered color. */
    unreadClassName?: string;
}

/**
 * WhatsApp-style delivery status:
 *   sending  → nothing (caller decides whether to render a spinner)
 *   sent     → single check, gray
 *   delivered → double check, gray
 *   read     → double check, blue
 *
 * Returns null for `sending` so callers can fall through to their own placeholder UI.
 */
export function MessageStatusIcon({
    status,
    readClassName = "text-chat-read-receipt",
    unreadClassName = "text-gray-400",
}: MessageStatusIconProps) {
    if (!status || status === "sending") return null;

    const isRead = status === "read";
    const isDoubleCheck = status === "read" || status === "delivered";

    return (
        <span className={isRead ? readClassName : unreadClassName}>
            {isDoubleCheck ? (
                <span className="inline-flex">
                    <Check className="w-3 h-3 -ml-0.5" />
                    <Check className="w-3 h-3 -ml-1" />
                </span>
            ) : (
                <Check className="w-3 h-3" />
            )}
        </span>
    );
}
