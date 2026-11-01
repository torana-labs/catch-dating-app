import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {getSalesAccount, listSalesAccounts} from "../api/salesRepository";

export type HostTab = "overview" | "conversations" | "deals" | "notes";

/**
 * Hosts: the accounts a sales associate works (or the team's), searchable,
 * and one host's page with four tabs: overview, conversations, deals, notes.
 */
export function useSalesHostsController({ownerUid, selectedOrganizerId}: {
  ownerUid: string | null;
  selectedOrganizerId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [tab, setTab] = useState<HostTab>("overview");
  const cursor = cursors.at(-1);
  const hosts = useQuery({
    queryKey: ["sales", "hosts", ownerUid, query.trim(), cursor ?? null],
    queryFn: () => listSalesAccounts({limit: 25, ...(cursor ? {cursor} : {}), ...(ownerUid ? {ownerUid} : {}),
      ...(query.trim() ? {query: query.trim()} : {})}),
  });
  const host = useQuery({
    queryKey: ["sales", "account", selectedOrganizerId],
    queryFn: () => getSalesAccount(selectedOrganizerId as string),
    enabled: selectedOrganizerId !== null,
  });
  return {
    query,
    setQuery: (value: string) => { setQuery(value); setCursors([undefined]); },
    rows: hosts.data?.rows ?? [],
    isLoading: hosts.isLoading,
    error: hosts.error,
    hasNextPage: Boolean(hosts.data?.nextCursor),
    hasPreviousPage: cursors.length > 1,
    nextPage: () => { const next = hosts.data?.nextCursor; if (next) setCursors((stack) => [...stack, next]); },
    previousPage: () => setCursors((stack) => stack.length > 1 ? stack.slice(0, -1) : stack),
    tab, setTab,
    host: host.data ?? null,
    hostError: host.error,
  };
}

export type SalesHostsController = ReturnType<typeof useSalesHostsController>;
