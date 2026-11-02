import {useMutation, useQuery} from "@tanstack/react-query";
import {useRef} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadOrganizerOverview,
  refreshOrganizerEvents,
  type OrganizerOverview,
} from "../api/organizerRecordsRepository";

export interface OrganizerOverviewController {
  overview: OrganizerOverview | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  refresh: () => void;
  /** Reads new events from the organizer's calendar links; they go through the publication policy. */
  checkForEvents: () => Promise<void>;
  isCheckingForEvents: boolean;
}

/** The Overview tab of one organizer page. */
export function useOrganizerOverviewController(
  organizerId: string,
  {onError, onNotice}: {onError: (message: string | null) => void; onNotice: (message: string) => void}
): OrganizerOverviewController {
  const query = useQuery({
    queryKey: adminQueryKeys.organizers.overview(organizerId),
    queryFn: () => loadOrganizerOverview(organizerId),
    retry: false,
  });
  const checking = useMutation({mutationFn: refreshOrganizerEvents});
  // A retry of the same check keeps its request id, so the server replays it.
  const requestId = useRef<string | null>(null);
  const checkForEvents = async () => {
    requestId.current ??= `refresh-${crypto.randomUUID()}`;
    onError(null);
    try {
      const result = await checking.mutateAsync({requestId: requestId.current, organizerId, urls: []});
      requestId.current = null;
      onNotice(`Reading ${result.urls.length} page${result.urls.length === 1 ? "" : "s"} for new events. ` +
        "Any that need a person reach the Inbox when the read finishes.");
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };
  return {
    checkForEvents,
    isCheckingForEvents: checking.isPending,
    overview: query.data ?? null,
    loadState: query.isError ? "error" : query.data ? "ready" : "loading",
    loadError: query.error instanceof Error ? query.error.message : null,
    refresh: () => void query.refetch(),
  };
}
