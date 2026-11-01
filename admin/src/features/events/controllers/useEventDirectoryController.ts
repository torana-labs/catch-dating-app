import {useInfiniteQuery} from "@tanstack/react-query";
import {useCallback, useMemo, useState} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadEventDirectory,
  type EventDirectoryPage,
  type EventDirectoryQuery,
  type EventDirectoryRow,
} from "../api/eventDirectoryRepository";

export type EventDirectoryView = NonNullable<EventDirectoryQuery["view"]>;
export type EventSourceFilter = NonNullable<EventDirectoryQuery["source"]>;

export interface EventDirectoryFilters {
  view: EventDirectoryView;
  query: string;
  citySlug: string | null;
  source: EventSourceFilter | null;
  needsCheck: boolean;
  thisWeek: boolean;
}

export interface EventDirectoryController {
  filters: EventDirectoryFilters;
  rows: EventDirectoryRow[];
  total: number | null;
  views: EventDirectoryPage["views"] | null;
  facets: EventDirectoryPage["facets"] | null;
  complete: boolean;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  setView: (view: EventDirectoryView) => void;
  setQuery: (query: string) => void;
  toggleCity: (citySlug: string) => void;
  toggleSource: (source: EventSourceFilter) => void;
  toggleNeedsCheck: () => void;
  toggleThisWeek: () => void;
  loadMore: () => void;
  refresh: () => void;
}

const pageSize = 50;
export const initialEventDirectoryFilters: EventDirectoryFilters = {
  view: "upcoming", query: "", citySlug: null, source: null,
  needsCheck: false, thisWeek: false,
};

/**
 * The Events directory: Catch and imported events in one table. Pass an
 * organizer to read only its events, as the organizer page's Events tab.
 */
export function useEventDirectoryController({
  organizerId = null,
  initial = {},
}: {
  organizerId?: string | null;
  initial?: Partial<EventDirectoryFilters>;
} = {}): EventDirectoryController {
  const [filters, setFilters] = useState<EventDirectoryFilters>({
    ...initialEventDirectoryFilters, ...initial,
  });
  const payload = useMemo<EventDirectoryQuery>(() => ({
    view: filters.view,
    query: filters.query.trim() || null,
    citySlug: filters.citySlug,
    source: filters.source,
    organizerId,
    needsCheck: filters.needsCheck,
    thisWeek: filters.thisWeek,
    limit: pageSize,
  }), [filters, organizerId]);
  const query = useInfiniteQuery({
    queryKey: adminQueryKeys.events.directory(JSON.stringify(payload)),
    queryFn: ({pageParam}) => loadEventDirectory({...payload,
      cursor: pageParam}),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: false,
  });
  const pages = query.data?.pages ?? [];
  const first = pages[0] ?? null;
  const patch = useCallback((next: Partial<EventDirectoryFilters>) =>
    setFilters((current) => ({...current, ...next})), []);
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
    toggleCity: (citySlug) => setFilters((current) => ({...current,
      citySlug: current.citySlug === citySlug ? null : citySlug})),
    toggleSource: (source) => setFilters((current) => ({...current,
      source: current.source === source ? null : source})),
    toggleNeedsCheck: () => setFilters((current) => ({...current,
      needsCheck: !current.needsCheck})),
    toggleThisWeek: () => setFilters((current) => ({...current,
      thisWeek: !current.thisWeek})),
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    refresh: () => void refetch(),
  };
}
