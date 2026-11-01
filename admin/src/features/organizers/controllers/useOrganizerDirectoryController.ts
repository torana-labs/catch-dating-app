import {useInfiniteQuery} from "@tanstack/react-query";
import {useCallback, useMemo, useState} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadOrganizerDirectory,
  type OrganizerDirectoryPage,
  type OrganizerDirectoryQuery,
  type OrganizerDirectoryRow,
} from "../api/organizerRecordsRepository";

export type OrganizerDirectoryView = NonNullable<
  OrganizerDirectoryQuery["view"]>;
export type OrganizerClaimFilter = NonNullable<
  OrganizerDirectoryQuery["claimState"]>;

export interface OrganizerDirectoryFilters {
  view: OrganizerDirectoryView;
  query: string;
  citySlug: string | null;
  kind: string | null;
  claimState: OrganizerClaimFilter | null;
  mine: boolean;
}

export interface OrganizerDirectoryController {
  filters: OrganizerDirectoryFilters;
  rows: OrganizerDirectoryRow[];
  total: number | null;
  views: OrganizerDirectoryPage["views"] | null;
  facets: OrganizerDirectoryPage["facets"] | null;
  /** False when the directory read only part of a very large collection. */
  complete: boolean;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  setView: (view: OrganizerDirectoryView) => void;
  setQuery: (query: string) => void;
  toggleCity: (citySlug: string) => void;
  toggleKind: (kind: string) => void;
  toggleClaimState: (claimState: OrganizerClaimFilter) => void;
  toggleMine: () => void;
  loadMore: () => void;
  refresh: () => void;
}

const pageSize = 50;
export const initialOrganizerDirectoryFilters: OrganizerDirectoryFilters = {
  view: "all", query: "", citySlug: null, kind: null, claimState: null,
  mine: false,
};

/** The Organizers directory: one view, its chips, and pages of rows. */
export function useOrganizerDirectoryController(
  initial: Partial<OrganizerDirectoryFilters> = {}
): OrganizerDirectoryController {
  const [filters, setFilters] = useState<OrganizerDirectoryFilters>({
    ...initialOrganizerDirectoryFilters, ...initial,
  });
  const payload = useMemo<OrganizerDirectoryQuery>(() => ({
    view: filters.view,
    query: filters.query.trim() || null,
    citySlug: filters.citySlug,
    kind: filters.kind,
    claimState: filters.claimState,
    mine: filters.mine,
    limit: pageSize,
  }), [filters]);
  const query = useInfiniteQuery({
    queryKey: adminQueryKeys.organizers.directory(JSON.stringify(payload)),
    queryFn: ({pageParam}) => loadOrganizerDirectory({...payload,
      cursor: pageParam}),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  });
  const pages = query.data?.pages ?? [];
  const first = pages[0] ?? null;
  const patch = useCallback((next: Partial<OrganizerDirectoryFilters>) =>
    setFilters((current) => ({...current, ...next})), []);
  const toggle = <K extends keyof OrganizerDirectoryFilters>(key: K,
    value: OrganizerDirectoryFilters[K]) => setFilters((current) => ({
    ...current, [key]: current[key] === value ? null : value,
  }));
  const {fetchNextPage, hasNextPage, isFetchingNextPage, refetch} = query;

  return {
    filters,
    rows: pages.flatMap((page) => page.rows),
    total: first?.total ?? null,
    views: first?.views ?? null,
    facets: first?.facets ?? null,
    complete: first?.scan.complete ?? true,
    loadState: query.isError ? "error" : first ? "ready" : "loading",
    loadError: query.error instanceof Error ? query.error.message : null,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    setView: (view) => patch({view}),
    setQuery: (text) => patch({query: text}),
    toggleCity: (citySlug) => toggle("citySlug", citySlug),
    toggleKind: (kind) => toggle("kind", kind),
    toggleClaimState: (claimState) => toggle("claimState", claimState),
    toggleMine: () => setFilters((current) => ({...current,
      mine: !current.mine})),
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    refresh: () => void refetch(),
  };
}
