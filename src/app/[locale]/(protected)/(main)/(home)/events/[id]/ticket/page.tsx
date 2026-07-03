"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Loader2, Download } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { ButtonType2 } from "@/components/custom/button";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  GET_EVENT,
  type GetEventData,
  type Event,
  getEventLocationDisplay,
  getEventVenueLines,
} from "@/services/gql/events";
import { useUserStore } from "@/store/useUserStore";
import { downloadEventTicketPdf } from "@/lib/eventTicketPdf";

function formatTicketDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Start → end. Single-day events collapse to one date with a time range. */
function formatDateRange(startIso: string, endIso: string | undefined | null, locale: string) {
  const start = formatTicketDate(startIso, locale);
  if (!endIso) return start;
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  if (startDate.toDateString() === endDate.toDateString()) {
    const endTime = new Date(endIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
    return `${start} – ${endTime}`;
  }
  return `${start} – ${formatTicketDate(endIso, locale)}`;
}

/** The ticket the attendee holds: first paid tier, else the first tier. */
function getPrimaryTicket(event: Event) {
  return event.tickets?.find((t) => (t?.priceInCents ?? 0) > 0) ?? event.tickets?.[0] ?? null;
}

function formatMoney(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function EventTicketPage() {
  const params = useParams();
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const tHomeEvents = useTranslations("home.events");
  const eventId = params.id as string;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const user = useUserStore((state) => state.user);

  const { data, loading, error } = useQuery<GetEventData>(GET_EVENT, {
    variables: { id: eventId },
    skip: !eventId,
  });

  const event = data?.getEvent ?? null;

  const holderName = useMemo(() => {
    if (!user) return "Guest User";
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "Guest User";
  }, [user]);

  const reference = event?.myRegistrationId || event?.id || "";

  const primaryTicket = event ? getPrimaryTicket(event) : null;
  const currency = (primaryTicket?.currency || event?.currency || "USD").toUpperCase();
  const unitCents = event?.isPaid ? primaryTicket?.priceInCents ?? 0 : 0;

  // Render the scannable check-in QR for the on-screen ticket.
  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    QRCode.toDataURL(reference, { margin: 0, width: 320, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const handleDownloadTicket = async () => {
    if (!event) return;
    setGenerating(true);
    try {
      const venue = getEventVenueLines(event);
      const eventUrl =
        typeof window !== "undefined" ? `${window.location.origin}/${locale}/events/${event.id}` : undefined;
      await downloadEventTicketPdf({
        eventTitle: event.title,
        eventId: event.id,
        registrationId: event.myRegistrationId,
        holderName,
        holderEmail: user?.email ?? null,
        dateLine: formatDateRange(event.startAt, event.endAt, locale),
        timezone: event.timezone,
        location: getEventLocationDisplay(event),
        venueName: venue.venueName,
        addressLines: venue.addressLines,
        virtualLink: venue.virtualLink,
        platform: venue.platform,
        category: event.eventCategory,
        ticketName: primaryTicket?.name,
        isPaid: event.isPaid,
        unitPriceInCents: unitCents,
        currency,
        quantity: 1,
        issuedAt: new Date().toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }),
        eventUrl,
      });
    } catch {
      toast.error("Could not generate the ticket PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!eventId) {
    return <div className="p-4 text-center text-text-secondary">Invalid event ID.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-text-brand" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-4 text-center text-text-secondary">
        Ticket could not be loaded for this event.
      </div>
    );
  }

  const venue = getEventVenueLines(event);
  const venueLines = [
    venue.venueName,
    ...(venue.addressLines ?? []),
    venue.platform,
    venue.virtualLink,
  ].filter(Boolean) as string[];
  const locationDisplay = venueLines.length > 0 ? venueLines : [getEventLocationDisplay(event)];

  return (
    <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/events/${event.id}`} className="text-surface-brand hover:underline">
            {tCommon("previousPage")}
          </Link>
          <ButtonType2
            onClick={handleDownloadTicket}
            disabled={generating}
            className="flex items-center gap-2"
            size="lg"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download ticket
          </ButtonType2>
        </div>

        <div className="bg-surface-default border border-border-subtle rounded-2xl overflow-hidden">
          {/* Brand header */}
          <div className="bg-surface-brand text-white px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm/none opacity-90">Diaspoplug</p>
              <p className="caption-large uppercase tracking-wide opacity-80">
                {tHomeEvents("events")} · Ticket & Receipt
              </p>
            </div>
            {qrDataUrl && (
              <Image
                src={qrDataUrl}
                alt="Ticket check-in code"
                width={72}
                height={72}
                className="rounded bg-white p-1"
                unoptimized
              />
            )}
          </div>

          <div className="p-6 md:p-8">
            <h1 className="heading-small text-text-primary mb-6">{event.title}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border-subtle p-4">
                <p className="text-sm text-text-secondary mb-1">Ticket Holder</p>
                <p className="label-large text-text-primary">{holderName}</p>
                {user?.email && <p className="text-sm text-text-secondary break-all">{user.email}</p>}
              </div>
              <div className="rounded-lg border border-border-subtle p-4">
                <p className="text-sm text-text-secondary mb-1">Date & Time</p>
                <p className="label-large text-text-primary">
                  {formatDateRange(event.startAt, event.endAt, locale)}
                </p>
                {event.timezone && <p className="text-sm text-text-secondary">{event.timezone}</p>}
              </div>
              <div className="rounded-lg border border-border-subtle p-4">
                <p className="text-sm text-text-secondary mb-1">Location</p>
                {locationDisplay.map((line, i) => (
                  <p key={i} className="label-large text-text-primary break-words">
                    {line}
                  </p>
                ))}
              </div>
              <div className="rounded-lg border border-border-subtle p-4">
                <p className="text-sm text-text-secondary mb-1">Ticket Type</p>
                <p className="label-large text-text-primary">
                  {primaryTicket?.name || (event.isPaid ? "Event ticket" : "Free admission")}
                </p>
                <p className="text-sm text-text-secondary">
                  {event.isPaid ? formatMoney(unitCents, currency) : "Free"}
                </p>
              </div>
            </div>

            {/* Order summary */}
            <div className="mt-4 rounded-lg border border-border-subtle overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface-subtle text-sm text-text-secondary">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-text-primary">
                  {primaryTicket?.name || (event.isPaid ? "Event ticket" : "Free admission")} × 1
                </span>
                <span className="text-text-primary">
                  {event.isPaid ? formatMoney(unitCents, currency) : "Free"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
                <span className="label-large text-text-primary">Total paid</span>
                <span className="label-large text-surface-brand">
                  {event.isPaid ? formatMoney(unitCents, currency) : "Free"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border-subtle p-4">
                <p className="text-sm text-text-secondary mb-1">Booking Reference</p>
                <p className="label-large text-text-primary break-all">{reference}</p>
              </div>
              <div className="rounded-lg border border-border-subtle p-4">
                <p className="text-sm text-text-secondary mb-1">Event ID</p>
                <p className="label-large text-text-primary break-all">{event.id}</p>
              </div>
            </div>

            <p className="mt-6 text-sm text-text-secondary">
              Present this ticket (printed or on your phone) at entry. This document is your proof of
              registration and receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
