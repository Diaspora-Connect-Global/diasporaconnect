"use client";

import { useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Loader2, Download } from "lucide-react";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  GET_EVENT,
  type GetEventData,
  getEventLocationDisplay,
} from "@/services/gql/events";
import { useUserStore } from "@/store/useUserStore";

function formatTicketDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventTicketPage() {
  const params = useParams();
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const tHomeEvents = useTranslations("home.events");
  const eventId = params.id as string;
  const ticketRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadTicket = () => {
    if (!ticketRef.current) return;
    window.print();
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

  return (
    <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="print:hidden flex items-center justify-between gap-3">
          <Link href={`/events/${event.id}`} className="text-surface-brand hover:underline">
            {tCommon("previousPage")}
          </Link>
          <ButtonType2
            onClick={handleDownloadTicket}
            className="flex items-center gap-2"
            size="lg"
          >
            <Download className="w-4 h-4" />
            Download ticket
          </ButtonType2>
        </div>

        <div
          ref={ticketRef}
          className="bg-surface-default border border-border-subtle rounded-2xl p-6 md:p-8"
        >
          <p className="text-text-brand font-caption-large uppercase tracking-wide mb-2">
            {tHomeEvents("events")}
          </p>
          <h1 className="heading-small text-text-primary mb-6">{event.title}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border-subtle p-4">
              <p className="text-sm text-text-secondary mb-1">Ticket Holder</p>
              <p className="font-label-large text-text-primary">{holderName}</p>
            </div>
            <div className="rounded-lg border border-border-subtle p-4">
              <p className="text-sm text-text-secondary mb-1">Event Date</p>
              <p className="font-label-large text-text-primary">
                {formatTicketDate(event.startAt, locale)}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle p-4">
              <p className="text-sm text-text-secondary mb-1">Location</p>
              <p className="font-label-large text-text-primary">
                {getEventLocationDisplay(event)}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle p-4">
              <p className="text-sm text-text-secondary mb-1">Ticket ID</p>
              <p className="font-label-large text-text-primary break-all">{event.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

