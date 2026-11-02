import {useQuery} from "@tanstack/react-query";
import {useMemo, useState} from "react";
import {listSalesAccounts, listSalesOpportunities} from "../api/salesRepository";
import type {SalesOpportunity} from "../api/salesTypes";
import {dealColumn, dealColumns} from "./salesLabels";

const maxPages = 4;

/** Pages a cursor list until it ends or reaches the bound, so the board shows every deal it can. */
async function collect<T>(load: (cursor: string | undefined) => Promise<{rows: T[]; nextCursor: string | null}>) {
  const rows: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await load(cursor);
    rows.push(...result.rows);
    if (!result.nextCursor) return {rows, truncated: false};
    cursor = result.nextCursor;
  }
  return {rows, truncated: true};
}

export interface DealCard {
  deal: SalesOpportunity;
  name: string;
}

/**
 * The Deals board: every open opportunity in one of five columns (New,
 * Talking, Demo, Pilot, Paying), named by its host. Team or just mine.
 */
export function useSalesDealsController({uid}: {uid: string | null}) {
  const [scope, setScope] = useState<"team" | "mine">("team");
  const [search, setSearch] = useState("");
  const deals = useQuery({
    queryKey: ["sales", "deals"],
    queryFn: () => collect((cursor) => listSalesOpportunities({limit: 50, ...(cursor ? {cursor} : {})})),
  });
  const accounts = useQuery({
    queryKey: ["sales", "deal-names"],
    queryFn: () => collect((cursor) => listSalesAccounts({limit: 50, ...(cursor ? {cursor} : {})})),
  });
  const names = useMemo(() => new Map((accounts.data?.rows ?? []).map((row) => [row.organizerId, row.name])), [accounts.data]);
  const all = useMemo(() => deals.data?.rows ?? [], [deals.data]);
  const mine = all.filter((deal) => deal.ownerUid === uid);
  const visible = (scope === "mine" ? mine : all).filter((deal) => {
    const query = search.trim().toLowerCase();
    return !query || (names.get(deal.organizerId) ?? deal.organizerId).toLowerCase().includes(query);
  });
  const columns = dealColumns.map((column) => ({
    ...column,
    cards: visible.filter((deal) => dealColumn(deal) === column.value)
      .map((deal): DealCard => ({deal, name: names.get(deal.organizerId) ?? deal.organizerId})),
  }));
  return {
    scope, setScope, search, setSearch, columns,
    counts: {team: all.filter((deal) => dealColumn(deal) !== null).length, mine: mine.filter((deal) => dealColumn(deal) !== null).length},
    isLoading: deals.isLoading,
    error: deals.error ?? accounts.error,
    truncated: deals.data?.truncated === true,
  };
}

export type SalesDealsController = ReturnType<typeof useSalesDealsController>;

/** Host names by organizer id, for lists that hold only ids (tasks, deals). */
export function useSalesHostNames() {
  const accounts = useQuery({
    queryKey: ["sales", "deal-names"],
    queryFn: () => collect((cursor) => listSalesAccounts({limit: 50, ...(cursor ? {cursor} : {})})),
  });
  return useMemo(() => new Map((accounts.data?.rows ?? []).map((row) => [row.organizerId, row.name])), [accounts.data]);
}
