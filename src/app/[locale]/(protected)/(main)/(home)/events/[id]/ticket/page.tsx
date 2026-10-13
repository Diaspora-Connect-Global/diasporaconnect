"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { ArrowLeft, CalendarDays, CalendarPlus, Download, Loader2, MapPin, Ticket, User } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  type Event,
  getEventLocationDisplay,
  getEventVenueLines,
} from "@/services/gql/events";
import { GET_EVENT_PAGE, type GetEventPageData } from "@/services/gql/eventsM2";
import { buildGoogleCalendarUrl, downloadIcs, timezoneLabel } from "@/lib/eventCalendar";
import { deriveRegistrationState } from "@/lib/eventRegistrationState";
import { useUserStore } from "@/store/useUserStore";
import { downloadEventTicketPdf } from "@/lib/eventTicketPdf";
import PageLoader from "@/components/custom/PageLoader";
import { CATEGORY_PHOTOS } from "@/lib/redesignImages";

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
  const eventId = params.id as string;
  // QR image keyed by the reference it encodes, so "ready" is exact: the
  // ticket's header shows the QR, and the page waits for it rather than
  // popping it in after first paint.
  const [qr, setQr] = useState<{ ref: string; url: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const user = useUserStore((state) => state.user);
  const tTicket = useTranslations("eventPage.ticket");
  const { data, loading, error } = useQuery<GetEventPageData>(GET_EVENT_PAGE, {
    variables: { id: eventId },
    skip: !eventId,
  });

  const event = data?.getEvent ?? null;
  const regState = event ? deriveRegistrationState(event) : null;

  const holderName = useMemo(() => {
    if (!user) return tTicket("guest");
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || tTicket("guest");
  }, [user, tTicket]);

  const reference = event?.myRegistrationId || event?.id || "";
  const qrReady = !reference || qr?.ref === reference;
  const qrDataUrl = qr?.ref === reference ? qr.url : "";

  const primaryTicket = event ? getPrimaryTicket(event) : null;
  const currency = (primaryTicket?.currency || event?.currency || "USD").toUpperCase();
  const unitCents = event?.isPaid ? primaryTicket?.priceInCents ?? 0 : 0;

  // Render the scannable check-in QR for the on-screen ticket.
  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    QRCode.toDataURL(reference, { margin: 0, width: 320, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setQr({ ref: reference, url });
      })
      .catch(() => {
        // Failure still counts as "ready" — the ticket renders without the QR.
        if (!cancelled) setQr({ ref: reference, url: "" });
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
      toast.error(tTicket("pdfFailed"));
    } finally {
      setGenerating(false);
    }
  };

  if (!eventId) {
    return <div className="p-4 text-center text-text-secondary">{tTicket("loadFailed")}</div>;
  }

  if ((loading && !data) || (event && !qrReady)) {
    return (
      <div className="h-app-inner flex">
        <PageLoader />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-4 text-center text-text-secondary">
        {tTicket("loadFailed")}
      </div>
    );
  }

  if (regState !== "confirmed") {
    return (
      <div className="h-app-inner overflow-y-auto scrollbar-hide px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-6 text-center shadow-sm" data-testid="ticket-unavailable">
          <p className="text-text-primary">{tTicket("notConfirmed")}</p>
          <Link href={`/events/${event.id}?tab=register`} className="text-surface-brand hover:underline">
            {tTicket("backToEvent")}
          </Link>
        </div>
      </div>
    );
  }

  const calendar = {
    uid: event.id,
    title: event.title,
    description: event.description,
    location: getEventLocationDisplay(event),
    startIso: event.startAt,
    endIso: event.endAt,
    url: typeof window !== "undefined" ? `${window.location.origin}/${locale}/events/${event.id}` : null,
  };
  const venue = getEventVenueLines(event);
  const venueLines = [
    venue.venueName,
    ...(venue.addressLines ?? []),
    venue.platform,
    venue.virtualLink,
  ].filter(Boolean) as string[];
  const locationDisplay = venueLines.length > 0 ? venueLines : [getEventLocationDisplay(event)];

  const ticketName = primaryTicket?.name || (event.isPaid ? tTicket("eventTicket") : tTicket("freeAdmission"));
  const price = event.isPaid ? formatMoney(unitCents, currency) : tTicket("free");
  const cover = event.coverImageUrl?.trim() ? event.coverImageUrl : CATEGORY_PHOTOS.event.src;
  const start = new Date(event.startAt);
  const month = Number.isNaN(start.getTime()) ? "" : new Intl.DateTimeFormat(locale, { month: "short" }).format(start).replace(".", "").toUpperCase();
  const day = Number.isNaN(start.getTime()) ? "" : new Intl.DateTimeFormat(locale, { day: "numeric" }).format(start);
  const pill = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:opacity-60";

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 pb-10 lg:px-0 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/events/${event.id}`} className="inline-flex items-center gap-2 rounded-md text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
            <ArrowLeft className="size-4" aria-hidden />
            {tTicket("backToEvent")}
          </Link>
          <button type="button" onClick={handleDownloadTicket} disabled={generating} className={`${pill} bg-surface-brand text-white hover:opacity-90`}>
            {generating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {tTicket("download")}
          </button>
        </div>

        {/* The ticket: cover + title, then the details and the tear-off stub with the check-in code. */}
        <article aria-labelledby="ticket-title" data-testid="ticket" className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-default shadow-sm">
          <div className="relative h-36 sm:h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-slate-900/10" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 text-white sm:p-6">
              {month && (
                <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-center shadow-sm">
                  <span className="block text-[11px] font-bold leading-none text-text-danger">{month}</span>
                  <span className="block text-xl font-bold leading-none text-slate-900">{day}</span>
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{tTicket("kicker")}</p>
                <h1 id="ticket-title" className="line-clamp-2 text-xl font-bold leading-tight sm:text-2xl">{event.title}</h1>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1fr)_15rem]">
            <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary"><User className="size-3.5" aria-hidden />{tTicket("holder")}</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-text-primary">{holderName}</dd>
                {user?.email && <dd className="break-all text-xs text-text-secondary">{user.email}</dd>}
              </div>
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary"><CalendarDays className="size-3.5" aria-hidden />{tTicket("dateTime")}</dt>
                <dd className="mt-1 text-sm font-semibold text-text-primary">{formatDateRange(event.startAt, event.endAt, locale)}</dd>
                {event.timezone && <dd className="text-xs text-text-secondary">{tTicket("timesIn", { zone: timezoneLabel(event.startAt, locale, event.timezone) || event.timezone })}</dd>}
              </div>
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary"><MapPin className="size-3.5" aria-hidden />{tTicket("location")}</dt>
                {locationDisplay.map((line, i) => (
                  <dd key={i} className={`break-words text-sm text-text-primary ${i === 0 ? "mt-1 font-semibold" : ""}`}>{line}</dd>
                ))}
              </div>
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary"><Ticket className="size-3.5" aria-hidden />{tTicket("ticketType")}</dt>
                <dd className="mt-1 text-sm font-semibold text-text-primary">{ticketName}</dd>
                <dd className="text-xs text-text-secondary">{price}</dd>
              </div>
            </dl>

            {/* Tear-off stub: dashed edge with notches, the check-in code and the status. */}
            <div className="relative flex flex-col items-center justify-center gap-3 border-t-2 border-dashed border-border-subtle p-6 md:border-l-2 md:border-t-0">
              <span aria-hidden className="absolute -top-3 left-0 size-6 -translate-x-1/2 rounded-full border border-border-subtle bg-background md:-left-3 md:-top-3 md:translate-x-0" />
              <span aria-hidden className="absolute -top-3 right-0 size-6 translate-x-1/2 rounded-full border border-border-subtle bg-background md:-bottom-3 md:-left-3 md:right-auto md:top-auto md:translate-x-0" />
              {qrDataUrl && <Image src={qrDataUrl} alt={tTicket("qrAlt")} width={168} height={168} className="rounded-xl bg-white p-2 shadow-sm" unoptimized />}
              <p className="text-center text-xs text-text-secondary">{tTicket("showAtEntry")}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-success px-3 py-1 text-xs font-semibold text-text-success" data-testid="ticket-status">
                {tTicket("registration")}: {tTicket("confirmed")}
              </span>
            </div>
          </div>

          {/* Receipt */}
          <div className="border-t border-border-subtle px-5 py-4 sm:px-6">
            <h2 className="text-sm font-bold text-text-primary">{tTicket("receipt")}</h2>
            <table className="mt-2 w-full text-sm">
              <thead className="sr-only">
                <tr><th scope="col">{tTicket("description")}</th><th scope="col">{tTicket("amount")}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 text-text-secondary">{ticketName} × 1</td>
                  <td className="py-1.5 text-right text-text-primary">{price}</td>
                </tr>
                <tr className="border-t border-border-subtle">
                  <th scope="row" className="pt-2 text-left font-semibold text-text-primary">{tTicket("totalPaid")}</th>
                  <td className="pt-2 text-right font-bold text-text-brand">{price}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-5 py-4 sm:px-6">
            <a href={buildGoogleCalendarUrl(calendar)} target="_blank" rel="noopener noreferrer" className={`${pill} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle`}>
              <CalendarPlus className="size-4" aria-hidden />
              {tTicket("googleCalendar")}
            </a>
            <button type="button" onClick={() => downloadIcs(calendar)} className={`${pill} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle`}>
              <CalendarDays className="size-4" aria-hidden />
              {tTicket("icsFile")}
            </button>
          </div>
        </article>

        <p className="px-1 text-xs text-text-secondary">{tTicket("proofNote")}</p>
      </div>
    </div>
  );
}
