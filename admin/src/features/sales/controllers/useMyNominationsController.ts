import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {getNomination, listMyNominations, type MyNominationsFilter} from "../api/myNominationsRepository";

/**
 * A sales associate's nominations: every organizer they sent, newest first,
 * filtered to published, waiting or stuck, with real totals, and the one
 * they opened with every step it took. They cannot approve; ops do.
 */
export function useMyNominationsController({selectedItemId}: {selectedItemId: string | null}) {
  const [filter, setFilter] = useState<MyNominationsFilter>("all");
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const cursor = cursors.at(-1) ?? null;
  const page = useQuery({
    queryKey: ["sales", "nominations", filter, cursor],
    queryFn: () => listMyNominations({filter, limit: 25, cursor}),
  });
  const detail = useQuery({
    queryKey: ["sales", "nomination", selectedItemId],
    queryFn: () => getNomination(selectedItemId as string),
    enabled: selectedItemId !== null,
  });
  return {
    filter,
    setFilter: (next: MyNominationsFilter) => { setFilter(next); setCursors([null]); },
    rows: page.data?.nominations ?? [],
    totals: page.data?.totals ?? null,
    isLoading: page.isLoading,
    error: page.error,
    hasNextPage: Boolean(page.data?.nextCursor),
    hasPreviousPage: cursors.length > 1,
    nextPage: () => { const next = page.data?.nextCursor; if (next) setCursors((stack) => [...stack, next]); },
    previousPage: () => setCursors((stack) => stack.length > 1 ? stack.slice(0, -1) : stack),
    detail: detail.data ?? null,
    detailError: detail.isError,
  };
}

export type MyNominationsController = ReturnType<typeof useMyNominationsController>;
