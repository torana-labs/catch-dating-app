import {useQuery} from "@tanstack/react-query";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadOrganizerOverview,
  type OrganizerOverview,
} from "../api/organizerRecordsRepository";

export interface OrganizerOverviewController {
  overview: OrganizerOverview | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  refresh: () => void;
}

/** The Overview tab of one organizer page. */
export function useOrganizerOverviewController(
  organizerId: string
): OrganizerOverviewController {
  const query = useQuery({
    queryKey: adminQueryKeys.organizers.overview(organizerId),
    queryFn: () => loadOrganizerOverview(organizerId),
    retry: false,
  });
  return {
    overview: query.data ?? null,
    loadState: query.isError ? "error" : query.data ? "ready" : "loading",
    loadError: query.error instanceof Error ? query.error.message : null,
    refresh: () => void query.refetch(),
  };
}
