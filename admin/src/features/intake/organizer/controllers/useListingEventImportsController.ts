import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useRef, useState} from "react";
import {
  listListingEventImports,
  publishListingEvents,
  refreshOrganizerEvents,
  withdrawImportedEvent,
  type ListingEventPublishInput,
} from "../api/listingEventImportRepository";

const pageSize = 5;
const listKey = ["organizer-intake", "listing-event-imports"] as const;

export type ListingEventPublishRequest = Omit<ListingEventPublishInput, "idempotencyKey" | "executionMode">;

export function useListingEventImportsController({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>([]);
  // A retry of the same request keeps its key, so the server replays it.
  const pendingKeys = useRef(new Map<string, string>());
  const keyFor = (input: unknown) => {
    const signature = JSON.stringify(input);
    const key = pendingKeys.current.get(signature) ?? `admin:${crypto.randomUUID()}`;
    pendingKeys.current.set(signature, key);
    return {signature, key};
  };
  const page = useQuery({
    queryKey: [...listKey, cursor],
    queryFn: () => listListingEventImports({limit: pageSize, cursor}),
  });
  const publishing = useMutation({mutationFn: publishListingEvents});
  const withdrawing = useMutation({mutationFn: withdrawImportedEvent});
  const refreshing = useMutation({mutationFn: refreshOrganizerEvents});

  const refresh = useCallback(async (organizerId: string): Promise<boolean> => {
    const {signature, key} = keyFor({refresh: organizerId});
    onError(null);
    try {
      const result = await refreshing.mutateAsync({requestId: key.replace(/^admin:/u, "refresh-"), organizerId,
        urls: []});
      pendingKeys.current.delete(signature);
      onNotice(`Reading ${result.urls.length} page${result.urls.length === 1 ? "" : "s"} for new events. ` +
        "They appear here when the read finishes.");
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [onError, onNotice, refreshing]);

  const publish = useCallback(async (input: ListingEventPublishRequest): Promise<boolean> => {
    const {signature, key} = keyFor(input);
    onError(null);
    try {
      const result = await publishing.mutateAsync({...input, executionMode: "apply", idempotencyKey: key});
      pendingKeys.current.delete(signature);
      const published = result.counts.published + result.counts.alreadyPublished;
      onNotice(result.counts.blocked > 0 ?
        `${published} published. ${result.counts.blocked} still blocked: ${result.results
          .filter((entry) => entry.outcome === "blocked").flatMap((entry) => entry.blockers).join(", ")}.` :
        `${published} event${published === 1 ? "" : "s"} published on the organizer's page.`);
      await queryClient.invalidateQueries({queryKey: listKey});
      return result.counts.blocked === 0;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [onError, onNotice, publishing, queryClient]);

  const withdraw = useCallback(async (input: {eventId: string; reviewNote: string}): Promise<boolean> => {
    const {signature, key} = keyFor(input);
    onError(null);
    try {
      await withdrawing.mutateAsync({...input, idempotencyKey: key});
      pendingKeys.current.delete(signature);
      onNotice("The event is off the website and the app. Its record stays.");
      await queryClient.invalidateQueries({queryKey: listKey});
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [onError, onNotice, queryClient, withdrawing]);

  return {
    page,
    rows: page.data?.rows ?? [],
    policy: page.data?.policy ?? null,
    unavailableCount: page.data?.unavailableCount ?? 0,
    hasPreviousPage: previousCursors.length > 0,
    hasNextPage: Boolean(page.data?.nextCursor),
    nextPage: () => {
      if (!page.data?.nextCursor) return;
      setPreviousCursors((stack) => [...stack, cursor]);
      setCursor(page.data.nextCursor);
    },
    previousPage: () => {
      setPreviousCursors((stack) => {
        setCursor(stack.at(-1) ?? null);
        return stack.slice(0, -1);
      });
    },
    publish,
    withdraw,
    refresh,
    isPublishing: publishing.isPending,
    isWithdrawing: withdrawing.isPending,
    isRefreshing: refreshing.isPending,
  };
}

export type ListingEventImportsController = ReturnType<typeof useListingEventImportsController>;
