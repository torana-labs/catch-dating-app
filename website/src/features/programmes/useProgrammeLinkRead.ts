import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {websiteQueryKeys} from "../../shared/query/queryKeys";
import {programmeLinkScreen, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";

export interface ProgrammeLinkRead<T> {
  screen: ProgrammeLinkScreen<T>;
  refresh: () => void;
  refreshing: boolean;
  /** The query key, for a page that writes and then reads again. */
  queryKey: readonly unknown[];
}

/**
 * One programme link's read. A page instance owns its cache and the bearer
 * token never enters a query key; nothing is kept once the page closes.
 */
export function useProgrammeLinkRead<T>(
  kind: string,
  credential: ProgrammeLinkCredential | null,
  read: (credential: ProgrammeLinkCredential) => Promise<T>,
): ProgrammeLinkRead<T> {
  const [instanceId] = useState(() => crypto.randomUUID());
  const queryKey = websiteQueryKeys.programmeLinks.read(kind, instanceId);
  const query = useQuery({
    queryKey,
    enabled: credential !== null,
    queryFn: () => {
      if (!credential) throw new Error("Missing programme link credential");
      return read(credential);
    },
    retry: false, gcTime: 0, staleTime: 0,
    refetchOnWindowFocus: "always", refetchOnReconnect: "always",
  });
  return {
    screen: programmeLinkScreen({credential, view: query.data, pending: query.isPending, error: query.error}),
    refresh: () => { void query.refetch(); },
    refreshing: query.isFetching,
    queryKey,
  };
}
