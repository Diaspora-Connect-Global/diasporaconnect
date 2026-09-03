"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    BottomSheet,
    BottomSheetContent,
    BottomSheetHeader,
    BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import {
    formatCurrentTime,
    getCountryTimezone,
    isGoodTimeToMessage,
    resolveCountryName,
} from "@/lib/countryTimezone";
import { useUserStore } from "@/store/useUserStore";

interface OtherProfileLike {
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    residenceCountry?: string | null;
    location?: string | null;
}

interface TimeDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    other: OtherProfileLike | null;
    /** Display name of the other user (already resolved by parent). */
    otherDisplayName: string;
    /**
     * Optional ref to a `position: relative` ancestor (e.g. the chat area). When provided,
     * the sheet portals into that element and spans its width instead of the viewport.
     */
    containerRef?: React.RefObject<HTMLElement | null>;
}

/** Compose a "City, Country" string from profile fields with sensible fallbacks. */
function buildLocationLabel(p: { city?: string | null; residenceCountry?: string | null; location?: string | null }): string {
    if (p.location?.trim()) return p.location.trim();
    const country = p.residenceCountry ? resolveCountryName(p.residenceCountry) : "";
    return [p.city, country].filter(Boolean).join(", ");
}

/** Best-effort timezone abbreviation (e.g. "CEST", "GMT"). Returns "" if not derivable. */
function timezoneAbbreviation(timeZone: string): string {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            timeZoneName: "short",
        }).formatToParts(new Date());
        return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
        return "";
    }
}

/** "May 20, 2025" rendered in the given timezone. */
function formatTzDate(timeZone: string): string {
    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone,
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(new Date());
    } catch {
        return "";
    }
}

interface TimeRowProps {
    iconBgClass: string;
    iconColorClass: string;
    label: string;
    sublabel: string;
    time: string;
    date: string;
    timeColorClass: string;
}

function TimeRow({ iconBgClass, iconColorClass, label, sublabel, time, date, timeColorClass }: TimeRowProps) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-hover/40 p-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}>
                <Clock className={`h-5 w-5 ${iconColorClass}`} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{label}</p>
                {sublabel && <p className="truncate text-xs text-text-secondary">{sublabel}</p>}
            </div>
            <div className="flex flex-col items-end whitespace-nowrap">
                <p className={`text-base font-semibold ${timeColorClass}`}>{time || "—"}</p>
                {date && <p className="text-xs text-text-secondary">{date}</p>}
            </div>
        </div>
    );
}

export function TimeDetailsModal({ open, onOpenChange, other, otherDisplayName, containerRef }: TimeDetailsModalProps) {
    const t = useTranslations("chat.direct.timeDetails");
    const user = useUserStore((s) => s.user);

    // The modal stays mounted with the parent chat, so without a refresh trigger the
    // memoized times would freeze at first mount and drift while the chat is open.
    // Bump `tick` on open and every 30s while open to force a re-derive.
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (!open) return;
        setTick((n) => n + 1);
        const id = setInterval(() => setTick((n) => n + 1), 30_000);
        return () => clearInterval(id);
    }, [open]);

    const detail = useMemo(() => {
        const fallbackTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const myTz =
            (user?.residenceCountry && getCountryTimezone(user.residenceCountry)) ||
            user?.timezone ||
            user?.timeZone ||
            fallbackTz;

        const theirTz = other?.residenceCountry ? getCountryTimezone(other.residenceCountry) : null;

        const myLocation = buildLocationLabel({
            city: user?.city,
            residenceCountry: user?.residenceCountry,
            location: user?.location,
        });
        const theirLocation = other
            ? buildLocationLabel({
                  city: other.city,
                  residenceCountry: other.residenceCountry,
                  location: other.location,
              })
            : "";

        const myAbbr = timezoneAbbreviation(myTz);
        const theirAbbr = theirTz ? timezoneAbbreviation(theirTz) : "";

        return {
            myTz,
            theirTz,
            myLocation,
            theirLocation,
            mySubLabel: [myLocation, myAbbr ? `(${myAbbr})` : ""].filter(Boolean).join(" "),
            theirSubLabel: [theirLocation, theirAbbr ? `(${theirAbbr})` : ""].filter(Boolean).join(" "),
            myTime: formatCurrentTime(myTz),
            theirTime: theirTz ? formatCurrentTime(theirTz) : "",
            myDate: formatTzDate(myTz),
            theirDate: theirTz ? formatTzDate(theirTz) : "",
            theirCity: other?.city ?? "",
            isGoodTime: theirTz ? isGoodTimeToMessage(theirTz) : false,
        };
        // `tick` intentionally included to force re-derivation of "current time" values
        // (formatCurrentTime / formatTzDate / isGoodTimeToMessage internally call new Date()).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, other, tick]);

    const goodTimeReason = detail.theirCity
        ? t("goodTimeReason", { city: detail.theirCity })
        : t("goodTimeReasonGeneric");
    const nightReason = detail.theirCity
        ? t("nightReason", { city: detail.theirCity })
        : t("nightReasonGeneric");

    return (
        <BottomSheet open={open} onOpenChange={onOpenChange}>
            <BottomSheetContent containerRef={containerRef}>
                <BottomSheetHeader>
                    <BottomSheetTitle>{t("title")}</BottomSheetTitle>
                </BottomSheetHeader>

                <div className="flex flex-col gap-3">
                    <TimeRow
                        iconBgClass="bg-chat-bubble-me-bg"
                        iconColorClass="text-chat-bubble-me-text"
                        label={t("yourLocalTime")}
                        sublabel={detail.mySubLabel}
                        time={detail.myTime}
                        date={detail.myDate}
                        timeColorClass="text-chat-bubble-me-text"
                    />

                    <TimeRow
                        iconBgClass="bg-chat-bubble-them-bg"
                        iconColorClass="text-chat-good-time-text"
                        label={t("theirLocalTime", { name: otherDisplayName })}
                        sublabel={detail.theirSubLabel}
                        time={detail.theirTime}
                        date={detail.theirDate}
                        timeColorClass="text-chat-good-time-text"
                    />

                    {detail.theirTz && (
                        <div
                            className={`flex items-start gap-3 rounded-2xl p-3 ${
                                detail.isGoodTime
                                    ? "bg-chat-good-time-bg"
                                    : "bg-surface-hover/60 dark:bg-surface-hover/40"
                            }`}
                        >
                            <div
                                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                                    detail.isGoodTime
                                        ? "bg-chat-online-dot text-white"
                                        : "bg-text-tertiary/40 text-text-secondary"
                                }`}
                            >
                                {detail.isGoodTime ? (
                                    <Sun className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                    <Moon className="h-4 w-4" aria-hidden="true" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-text-primary">
                                    {detail.isGoodTime
                                        ? t("goodTimeBanner", { name: otherDisplayName })
                                        : t("nightBanner")}
                                </p>
                                <p className="text-xs text-text-secondary">
                                    {detail.isGoodTime ? goodTimeReason : nightReason}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </BottomSheetContent>
        </BottomSheet>
    );
}
