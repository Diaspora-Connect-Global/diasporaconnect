"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import PageLoader from "@/components/custom/PageLoader";
import { ButtonType2 } from "@/components/custom/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminOrganisers } from "@/hooks/useAdminOrganisers";
import {
  IS_EVENT_SAVED,
  SAVE_EVENT,
  UNSAVE_EVENT,
  USER_EVENTS,
  getEventLocationDisplay,
  type IsEventSavedData,
  type SaveEventData,
  type UnsaveEventData,
} from "@/services/gql/events";
import {
  EVENT_PROGRAMME,
  EVENT_SPEAKERS,
  EVENT_UPDATES,
  EVENT_VENUE_INFO,
  GET_EVENT_PAGE,
  type EventProgrammeData,
  type EventSpeakersData,
  type EventUpdatesData,
  type EventVenueInfoData,
  type GetEventPageData,
} from "@/services/gql/eventsM2";
import { readMutationOutcome } from "@/lib/mutationOutcome";
import { eventRefusal } from "@/lib/eventRefusal";
import { formatInZone } from "@/lib/eventCalendar";
import { REGISTERED_STATES, deriveRegistrationState } from "@/lib/eventRegistrationState";
import { ManagerEmpty, ProgrammeTab, SpeakersTab, UpdatesTab, VenueTab, hasVenueContent } from "@/components/events/page/ContentTabs";
import { OverviewTab } from "@/components/events/page/OverviewTab";
import EventHero from "@/components/events/page/EventHero";
import NetworkingCtas from "@/components/events/page/NetworkingCtas";
import NetworkingPanel from "@/components/events/page/NetworkingPanels";
import { useEventNetworking } from "@/components/events/page/useEventNetworking";
import MyEventTab from "@/components/events/page/MyEventTab";
import OrganiserCard from "@/components/events/page/OrganiserCard";
import RegisterTab, { type RegistrationResult } from "@/components/events/page/RegisterTab";
import RegistrationCard from "@/components/events/page/RegistrationCard";
import { GrowNetworkCard, RegisterRail, ShareCard, SimilarEvents } from "@/components/events/page/RailExtras";
import { useEventPriceLabel } from "@/components/events/page/useEventPriceLabel";
import { useOrganiser } from "@/components/events/page/useOrganiser";

type TabKey = "overview" | "programme" | "speakers" | "networking" | "circles" | "venue" | "updates" | "register";
const TAB_KEYS: TabKey[] = ["overview", "programme", "speakers", "networking", "circles", "venue", "updates", "register"];

const EMPTY: never[] = [];

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const t = useTranslations("eventPage");
  const tRail = useTranslations("eventPage.rail");
  const tEvents = useTranslations("home.events");
  const tErr = useTranslations("eventPage.errors");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const sessionToken = useAuthStore((s) => s.tokens?.sessionToken);
  // Signed-in state is only trusted after mount, so the server render and the first
  // client render agree (the store reads localStorage); the token selector then
  // re-renders this page as soon as it is there.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && !!sessionToken;

  const { data, loading, error, refetch } = useQuery<GetEventPageData>(GET_EVENT_PAGE, {
    variables: { id: eventId },
    skip: !eventId,
  });
  const event = data?.getEvent ?? null;

  const { organiser } = useOrganiser(event?.ownerType, event?.ownerId);
  const { administers } = useAdminOrganisers();
  const canManage = administers(event?.ownerType, event?.ownerId);

  // Public reads that decide which tabs exist. Cheap, and only after the event is known.
  const skip = !event;
  const programme = useQuery<EventProgrammeData>(EVENT_PROGRAMME, { variables: { eventId }, skip });
  const speakers = useQuery<EventSpeakersData>(EVENT_SPEAKERS, { variables: { eventId }, skip });
  const venue = useQuery<EventVenueInfoData>(EVENT_VENUE_INFO, { variables: { eventId }, skip });
  const updates = useQuery<EventUpdatesData>(EVENT_UPDATES, { variables: { eventId, pageSize: 10 }, skip });
  const sessionList = programme.data?.eventProgramme ?? EMPTY;
  const speakerList = speakers.data?.eventSpeakers ?? EMPTY;
  const updateList = updates.data?.eventUpdates?.updates ?? EMPTY;

  const { data: savedData } = useQuery<IsEventSavedData>(IS_EVENT_SAVED, { variables: { eventId }, skip: !eventId || !signedIn });
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const saved = optimisticSaved ?? savedData?.isEventSaved ?? false;
  const [saveEvent] = useMutation<SaveEventData>(SAVE_EVENT, { refetchQueries: [{ query: IS_EVENT_SAVED, variables: { eventId } }, { query: USER_EVENTS }], awaitRefetchQueries: true });
  const [unsaveEvent] = useMutation<UnsaveEventData>(UNSAVE_EVENT, { refetchQueries: [{ query: IS_EVENT_SAVED, variables: { eventId } }, { query: USER_EVENTS }], awaitRefetchQueries: true });

  const [lastResult, setLastResult] = useState<RegistrationResult | null>(null);
  const priceLabel = useEventPriceLabel(event);
  const tablistRef = useRef<HTMLDivElement>(null);

  const state = event ? deriveRegistrationState(event) : "open";
  const registered = REGISTERED_STATES.has(state);
  const networking = useEventNetworking(eventId, signedIn && !!event);
  const hasVenue = event ? hasVenueContent(event, venue.data?.eventVenueInfo) : false;

  const tabs = useMemo(() => {
    const list: TabKey[] = ["overview"];
    if (sessionList.length > 0 || canManage) list.push("programme");
    if (speakerList.length > 0 || canManage) list.push("speakers");
    if (networking.available) list.push("networking", "circles");
    if (hasVenue || canManage) list.push("venue");
    if (updateList.length > 0 || canManage) list.push("updates");
    list.push("register");
    return list;
  }, [sessionList.length, speakerList.length, hasVenue, updateList.length, canManage, networking.available]);

  const requested = search.get("tab") as TabKey | null;
  const active: TabKey = requested && TAB_KEYS.includes(requested) && tabs.includes(requested) ? requested : "overview";

  const openTab = useCallback(
    (tab: TabKey) => {
      const next = new URLSearchParams(search.toString());
      if (tab === "overview") next.delete("tab");
      else next.set("tab", tab);
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, search],
  );

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const move = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!move) return;
    e.preventDefault();
    const next = tabs[(i + move + tabs.length) % tabs.length];
    openTab(next);
    requestAnimationFrame(() => tablistRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus());
  };

  const toggleSave = async () => {
    if (!signedIn) {
      toast.error(tEvents("saveFailed"));
      return;
    }
    setOptimisticSaved(!saved);
    try {
      const result = saved ? await unsaveEvent({ variables: { eventId } }) : await saveEvent({ variables: { eventId } });
      const outcome = saved ? readMutationOutcome(result, (d) => d.unsaveEvent) : readMutationOutcome(result, (d) => d.saveEvent?.id);
      if (!outcome.ok) toast.error(tErr(eventRefusal(result).key));
      else toast.success(saved ? tEvents("eventRemovedFromSaved") : tEvents("eventSaved"));
    } catch {
      toast.error(tEvents("saveFailed"));
    } finally {
      setOptimisticSaved(null);
    }
  };

  if (!eventId) return <div className="p-4 text-center text-text-secondary">{t("notFound")}</div>;
  if (loading && !data) return <PageLoader />;
  if (error || !event) return <div className="p-4 text-center text-text-secondary">{t("notFound")}</div>;

  const calendar = {
    uid: event.id,
    title: event.title,
    description: event.description,
    location: getEventLocationDisplay(event),
    startIso: event.startAt,
    endIso: event.endAt,
    url: typeof window !== "undefined" ? `${window.location.origin}/${locale}/events/${event.id}` : null,
  };

  const refresh = async () => {
    await refetch();
  };

  const tabLabel = (k: TabKey) => (k === "register" ? (registered || lastResult ? t("tabs.myEvent") : t("tabs.register")) : t(`tabs.${k}`));

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide">
      <div className="mx-auto w-full px-4 pb-24 pt-4 lg:w-[80vw] lg:pb-8">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/events"))}
          className="mb-3 inline-flex min-h-11 items-center gap-2 text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={18} aria-hidden />
          <span className="text-sm font-medium">{t("back")}</span>
        </button>

        <EventHero event={event} canManage={canManage} saved={saved} onToggleSave={toggleSave}>
          {state === "eventCancelled" && <p role="status" className="w-fit rounded-lg bg-surface-danger p-2 text-sm text-text-danger">{tRail("states.eventCancelled")}</p>}
          {/* Phones show the rail below the tabs, so the one action that matters sits up here too. */}
          <div className="lg:hidden">
            <ButtonType2 onClick={() => openTab("register")} className="w-full" size="lg">
              {registered ? tRail("cta.myEvent") : state === "full" ? tRail("cta.joinWaitlist") : state === "open" ? tRail("cta.register") : tRail(`states.${state}`, { date: event.registrationOpensAt ? formatInZone(event.registrationOpensAt, locale, event.timezone) : "" })}
            </ButtonType2>
          </div>
        </EventHero>

        <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="min-w-0 space-y-4">
            <div ref={tablistRef} role="tablist" aria-label={t("tabsLabel")} className="flex gap-1 overflow-x-auto border-b border-border-subtle scrollbar-hide">
              {tabs.map((k, i) => (
                <button
                  key={k}
                  id={`event-tab-${k}`}
                  data-tab={k}
                  role="tab"
                  type="button"
                  aria-selected={active === k}
                  aria-controls="event-tabpanel"
                  tabIndex={active === k ? 0 : -1}
                  onClick={() => openTab(k)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm transition-colors ${
                    active === k ? "border-border-brand font-medium text-text-brand" : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tabLabel(k)}
                </button>
              ))}
            </div>

            <div id="event-tabpanel" role="tabpanel" aria-labelledby={`event-tab-${active}`} tabIndex={0} className="space-y-4 focus:outline-none">
              {active === "overview" && (
                <OverviewTab
                  event={event}
                  priceLabel={priceLabel}
                  organiser={organiser}
                  speakers={speakerList}
                  sessions={sessionList}
                  venueInfo={venue.data?.eventVenueInfo}
                  onOpenTab={openTab}
                />
              )}
              {active === "programme" &&
                (sessionList.length > 0 ? (
                  <ProgrammeTab event={event} sessions={sessionList} speakers={speakerList} />
                ) : (
                  <ManagerEmpty eventId={event.id} section="programme" text={t("empty.programme")} />
                ))}
              {active === "speakers" &&
                (speakerList.length > 0 ? <SpeakersTab speakers={speakerList} /> : <ManagerEmpty eventId={event.id} section="speakers" text={t("empty.speakers")} />)}
              {(active === "networking" || active === "circles") && <NetworkingPanel eventId={event.id} networking={networking} variant={active} />}
              {active === "venue" && <VenueTab event={event} info={venue.data?.eventVenueInfo} canSeeOnlineLink={state === "confirmed" || canManage} />}
              {active === "updates" &&
                (updateList.length > 0 ? <UpdatesTab eventId={event.id} /> : <ManagerEmpty eventId={event.id} section="updates" text={t("empty.updates")} />)}
              {active === "register" &&
                (registered || lastResult ? (
                  <MyEventTab
                    event={event}
                    state={state}
                    organiser={organiser}
                    lastResult={lastResult}
                    calendar={calendar}
                    onChanged={async () => {
                      setLastResult(null);
                      await refresh();
                    }}
                  />
                ) : state === "rejected" ? (
                  <div className="rounded-2xl border border-border-subtle bg-surface-default p-6" data-testid="register-unavailable">
                    <p className="font-medium text-text-primary">{tRail("states.rejected")}</p>
                    <p className="text-sm text-text-secondary">{tRail("hints.rejected")}</p>
                  </div>
                ) : (
                  <RegisterTab
                    event={event}
                    organiser={organiser}
                    state={state}
                    signedIn={signedIn}
                    onDone={async (r) => {
                      setLastResult(r);
                      await refresh();
                    }}
                  />
                ))}
            </div>
          </main>

          <aside className="mt-6 space-y-4 lg:mt-0" aria-label={t("railLabel")}>
            {active === "register" && !registered && !lastResult ? (
              <RegisterRail event={event} state={state} />
            ) : (
              <>
                <RegistrationCard event={event} state={state} waitlistPosition={lastResult?.waitlistPosition} signedIn={signedIn} onOpenTab={openTab} />
                <NetworkingCtas eventId={event.id} networking={networking} />
                {organiser && <OrganiserCard eventId={event.id} organiser={organiser} signedIn={signedIn} />}
                <ShareCard eventId={event.id} title={event.title} />
                <SimilarEvents eventId={event.id} category={event.eventCategory} />
                <GrowNetworkCard organiser={organiser} />
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
