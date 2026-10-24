import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useRef, useState} from "react";
import {
  approveOrganizerListing,
  listOrganizerListingReviews,
  type ListingApproval,
  type ListingApprovalInput,
} from "../api/organizerListingReviewRepository";

const pageSize = 10;
const queueKey = ["organizer-intake", "listing-reviews"] as const;

export function useOrganizerListingReviewController({onError, onNotice, onApproved}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
  onApproved?: (approval: ListingApproval) => void;
}) {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>([]);
  const pendingRequestIds = useRef(new Map<string, string>());
  const page = useQuery({
    queryKey: [...queueKey, cursor],
    queryFn: () => listOrganizerListingReviews({limit: pageSize, cursor}),
  });
  const approval = useMutation({mutationFn: approveOrganizerListing});

  const approve = useCallback(async (input: Omit<ListingApprovalInput, "requestId">): Promise<boolean> => {
    // A retry of the same approval keeps its request id, so the server replays it.
    const key = JSON.stringify(input);
    const requestId = pendingRequestIds.current.get(key) ?? crypto.randomUUID();
    pendingRequestIds.current.set(key, requestId);
    onError(null);
    try {
      const result = await approval.mutateAsync({...input, requestId});
      pendingRequestIds.current.delete(key);
      onNotice(result.created ?
        `${input.name} is published as an unclaimed page, not yet indexed. Its Sales work is open.` :
        `${input.name} was already approved.`);
      await queryClient.invalidateQueries({queryKey: queueKey});
      onApproved?.(result);
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [approval, onApproved, onError, onNotice, queryClient]);

  return {
    page,
    rows: page.data?.rows ?? [],
    canApprove: page.data?.canApprove ?? false,
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
        const previous = stack.at(-1) ?? null;
        setCursor(previous);
        return stack.slice(0, -1);
      });
    },
    approve,
    isApproving: approval.isPending,
  };
}

export type OrganizerListingReviewController = ReturnType<typeof useOrganizerListingReviewController>;
