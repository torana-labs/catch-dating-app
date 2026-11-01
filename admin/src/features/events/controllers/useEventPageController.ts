import {useQuery} from "@tanstack/react-query";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import type {
  AdminEventDetails,
  AdminExternalEventListRow,
} from "../../../shared/types/adminTypes";
import {
  listExternalEventProfiles,
  loadEventProfile,
} from "../api/eventPublishingRepository";

export type EventPageSource = "catch" | "imported";

export type EventPageRecord =
  | {source: "catch"; event: AdminEventDetails}
  | {source: "imported"; event: AdminExternalEventListRow};

export interface EventPageController {
  record: EventPageRecord | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  refresh: () => void;
}

/**
 * One event's page. A Catch event reads its full record; an imported event is read from the
 * external events list, which searches by event id, since imports have no record read of their own.
 */
export async function loadEventPageRecord(
  source: EventPageSource,
  eventId: string
): Promise<EventPageRecord> {
  if (source === "catch") {
    return {source, event: (await loadEventProfile({eventId})).event};
  }
  const response = await listExternalEventProfiles({query: eventId, timeWindow: "all", limit: 25});
  const event = response.rows.find((row) => row.eventId === eventId);
  if (!event) throw new Error("Imported event not found.");
  return {source, event};
}

export function useEventPageController(
  source: EventPageSource,
  eventId: string
): EventPageController {
  const query = useQuery({
    queryKey: adminQueryKeys.events.page(source, eventId),
    queryFn: () => loadEventPageRecord(source, eventId),
    retry: false,
  });
  return {
    record: query.data ?? null,
    loadState: query.isError ? "error" : query.data ? "ready" : "loading",
    loadError: query.error instanceof Error ? query.error.message : null,
    refresh: () => void query.refetch(),
  };
}
