import {useMutation, useQueryClient} from "@tanstack/react-query";
import type {RequestOrganizerClaimPayload} from "../../firebase";
import {websiteQueryKeys} from "../../shared/query/queryKeys";
import {readableError} from "./claimModel";

export function useClaimRequestMutation(listingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async (payload: RequestOrganizerClaimPayload) => {
      const {requestOrganizerClaim} = await import("../../firebase");
      return requestOrganizerClaim(payload);
    },
    mutationKey: websiteQueryKeys.claims.request(listingId),
    onSuccess: async (_response, payload: RequestOrganizerClaimPayload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: websiteQueryKeys.claims.lookup(payload.organizerId),
        }),
        queryClient.invalidateQueries({
          queryKey: websiteQueryKeys.claims.requests(),
        }),
      ]);
    },
  });
}
