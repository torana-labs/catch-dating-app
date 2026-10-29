import {createContext, useContext, useEffect, useMemo} from "react";
import {skipToken, useQuery, useQueryClient} from "@tanstack/react-query";
import {subscribePublicCatchEvents} from "../../firebase";
import type {OrganizerPageRecord} from "./organizerPage";
import {projectPublicCatchEventSnapshot, type LivePublicCatchEvent} from "./publicCatchEventProjection";
import {hostListings} from "./data";
import type {HostListing} from "./types";

export interface PublicEventFeed {
  phase: "loading" | "ready" | "unavailable";
  rows: readonly LivePublicCatchEvent[];
}
const emptyFeed: PublicEventFeed = {phase: "loading", rows: []};
const queryKey = ["public-catch-event-feed"] as const;
export const publicEventListingsContext = createContext<{listings: readonly HostListing[]; phase: PublicEventFeed["phase"]; readAt?: number;
  organizerPage?: OrganizerPageRecord | null}>({
  listings: hostListings as readonly HostListing[], phase: "loading" as PublicEventFeed["phase"],
});

/** One live subscription owns the Query cache; cached/offline data is withheld. */
export function usePublicEventListingsController(enabled: boolean) {
  const client = useQueryClient();
  const {data = emptyFeed} = useQuery<PublicEventFeed>({
    queryKey, queryFn: skipToken, gcTime: 0, initialData: emptyFeed,
  });
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    client.setQueryData(queryKey, emptyFeed);
    if (enabled) {
      void subscribePublicCatchEvents((snapshot) => {
        if (!active) return;
        const rows = projectPublicCatchEventSnapshot(snapshot);
        client.setQueryData<PublicEventFeed>(queryKey, rows === null
          ? {phase: "unavailable", rows: []} : {phase: "ready", rows});
      }, () => {
        if (active) client.setQueryData<PublicEventFeed>(queryKey, {phase: "unavailable", rows: []});
      }).then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      }).catch(() => {
        if (active) client.setQueryData<PublicEventFeed>(queryKey, {phase: "unavailable", rows: []});
      });
    }
    return () => {
      active = false;
      unsubscribe?.();
      client.setQueryData(queryKey, emptyFeed);
    };
  }, [client, enabled]);
  const rows = enabled && data.phase === "ready" ? data.rows : emptyFeed.rows;
  const listings = useMemo(() => mergePublicCatchEvents(hostListings, rows), [rows]);
  return {listings, phase: enabled ? data.phase : "unavailable" as const};
}

export function usePublicHostListings() {
  return useContext(publicEventListingsContext);
}

export function mergePublicCatchEvents(listings: readonly HostListing[],
  rows: readonly LivePublicCatchEvent[]): HostListing[] {
  const byOrganizer = new Map<string, HostListing["catchEvents"]>();
  for (const row of rows) {
    const events = byOrganizer.get(row.organizerId) ?? [];
    events.push(row.event);
    byOrganizer.set(row.organizerId, events);
  }
  return listings.map((listing) => ({...listing,
    catchEvents: byOrganizer.get(listing.id) ?? []}));
}
