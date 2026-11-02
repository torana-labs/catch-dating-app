import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useRef, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {createSalesAccount, nominateSalesOrganizer, searchCanonicalOrganizers} from "../api/salesRepository";
import type {SalesNominateOrganizerInput} from "../api/salesTypes";
import {salesErrorMessage} from "./salesLabels";

export type NominationDetails = Omit<SalesNominateOrganizerInput, "requestId">;

/**
 * Adding an organizer Catch already lists to Sales, or nominating one it doesn't. A retry of the same
 * details keeps its request id, so the server replays it.
 */
export function useSalesAddHostController({canAddExisting, onError, onNotice}: {
  /** A sales associate can nominate but not add an existing organizer, so nothing is searched for them. */
  canAddExisting: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const requestIds = useRef(new Map<string, string>());
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const matches = useQuery({
    enabled: canAddExisting && debounced.length >= 2,
    queryKey: ["sales", "canonical-matches", debounced],
    queryFn: () => searchCanonicalOrganizers(debounced),
  });
  const adding = useMutation({mutationFn: createSalesAccount});
  const nominating = useMutation({mutationFn: nominateSalesOrganizer});

  const run = useCallback(async (kind: string, material: unknown, invoke: (requestId: string) => Promise<unknown>, notice: string) => {
    const token = beginOperation();
    if (!token) return false;
    const key = JSON.stringify([kind, material]);
    const requestId = requestIds.current.get(key) ?? crypto.randomUUID();
    requestIds.current.set(key, requestId);
    onError(null);
    try {
      await invoke(requestId);
      requestIds.current.delete(key);
      onNotice(notice);
      await queryClient.invalidateQueries({queryKey: ["sales"]});
      return true;
    } catch (error) {
      onError(salesErrorMessage(error));
      return false;
    } finally {
      endOperation(token);
    }
  }, [beginOperation, endOperation, onError, onNotice, queryClient]);

  return {
    search,
    setSearch,
    matches: matches.data ?? [],
    isSearching: matches.isFetching,
    searchFailed: matches.isError,
    addExisting: (organizerId: string) => run("add", organizerId, (requestId) => adding.mutateAsync({organizerId, requestId}), "Host added to Sales."),
    nominate: (input: NominationDetails) => run("nominate", input, (requestId) => nominating.mutateAsync({...input, requestId}),
      "Nomination queued. Its listing appears in the Inbox for review."),
    isSaving: adding.isPending || nominating.isPending,
  };
}
