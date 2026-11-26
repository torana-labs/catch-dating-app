import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useMemo, useRef, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  approveListing,
  decideAccess,
  decideClaim,
  getClaimEvidence,
  getInboxItem,
  getListingEventReview,
  getListingReview,
  linkEnquiry,
  searchOrganizers,
  sendLeadFollowUp,
  listInboxItems,
  nominateOrganizer,
  publishListingEvent,
  recommendOrganizerClaim,
  updateInboxItem,
  type ClaimRecommendationInput,
  type InboxItem,
  type InboxScope,
  type InboxType,
  type InboxUpdate,
  type ListingApprovalInput,
  type ListingEventRef,
  type NominationInput,
} from "../api/inboxRepository";
import {blockerLabel, type ListingEventPublishRequest} from "./listingEventPublish";

const pageSize = 25;
const inboxKey = ["inbox"] as const;

export const inboxTypeLabels: Record<InboxType, string> = {
  listing: "Listings", event: "Events", claim: "Claims", enquiry: "Enquiries", lead: "Leads", access: "Launch access", stuck: "Stuck",
  takedown: "Listing requests",
};

/**
 * The inbox queue: which scope, type and city you look at, the page you are
 * on, the item you opened, and the actions on it. After an action the next
 * item opens, so a reviewer moves down the queue without going back.
 */
export function useInboxController({onError, onNotice, selectedItemId, onSelect}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
  selectedItemId: string | null;
  onSelect: (itemId: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [scope, setScopeState] = useState<InboxScope>("waiting");
  const [type, setTypeState] = useState<InboxType | null>(null);
  const [city, setCityState] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const cursor = cursors.at(-1) ?? null;
  const resetPaging = () => setCursors([null]);

  const page = useQuery({
    queryKey: [...inboxKey, "list", scope, type, city, cursor],
    queryFn: () => listInboxItems({scope, type, city, limit: pageSize, cursor}),
  });
  const detail = useQuery({
    queryKey: [...inboxKey, "item", selectedItemId],
    queryFn: () => getInboxItem(selectedItemId as string),
    enabled: selectedItemId !== null,
  });
  const claimRequestId = detail.data?.item.type === "claim" ? detail.data.item.sourceId : null;
  const claimEvidence = useQuery({
    queryKey: [...inboxKey, "claim-evidence", claimRequestId],
    queryFn: () => getClaimEvidence(claimRequestId as string),
    enabled: claimRequestId !== null,
  });
  const update = useMutation({mutationFn: updateInboxItem});
  const recommend = useMutation({mutationFn: recommendOrganizerClaim});
  const claimDecision = useMutation({mutationFn: decideClaim});
  const accessDecision = useMutation({mutationFn: decideAccess});
  const enquiryLink = useMutation({mutationFn: linkEnquiry});
  const followUp = useMutation({mutationFn: sendLeadFollowUp});
  // A retry after a lost answer keeps its request id, so the server replays it instead of sending again.
  const followUpRequestIds = useRef(new Map<string, string>());
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const listingReview = useQuery({
    queryKey: [...inboxKey, "listing-review", reviewRequestId],
    queryFn: () => getListingReview(reviewRequestId as string),
    enabled: reviewRequestId !== null,
  });
  const approval = useMutation({mutationFn: ({input, requestId}: {input: ListingApprovalInput; requestId: string}) =>
    approveListing(input, requestId)});
  // A retry of the same approval keeps its request id, so the server replays it.
  const approvalRequestIds = useRef(new Map<string, string>());
  const [eventRef, setEventRef] = useState<ListingEventRef | null>(null);
  const eventReview = useQuery({
    queryKey: [...inboxKey, "event-review", eventRef?.eventWorkItemId],
    queryFn: () => getListingEventReview(eventRef as ListingEventRef),
    enabled: eventRef !== null,
  });
  const eventPublish = useMutation({mutationFn: publishListingEvent});
  // A retry of the same publish keeps its key, so the server replays it.
  const publishKeys = useRef(new Map<string, string>());
  const nomination = useMutation({mutationFn: nominateOrganizer});
  // A retry of the same details keeps its request id, so Intake builds one listing.
  const nominationRequestIds = useRef(new Map<string, string>());
  const [hostQuery, setHostQuery] = useState("");
  const hostSearch = useQuery({
    queryKey: [...inboxKey, "host-search", hostQuery.trim()],
    queryFn: () => searchOrganizers(hostQuery.trim()),
    enabled: hostQuery.trim().length >= 2,
  });

  const items = useMemo(() => page.data?.items ?? [], [page.data]);
  const index = items.findIndex((item) => item.itemId === selectedItemId);
  const nextItem: InboxItem | null = index >= 0 ? items[index + 1] ?? null : null;
  const previousItem: InboxItem | null = index > 0 ? items[index - 1] ?? null : null;

  const refresh = useCallback(() => queryClient.invalidateQueries({queryKey: inboxKey}), [queryClient]);

  const run = useCallback(async <T>(action: () => Promise<T>, notice: string, moveOn: boolean) => {
    const operation = beginOperation();
    if (!operation) return false;
    onError(null);
    try {
      await action();
      onNotice(notice);
      if (moveOn) onSelect(nextItem?.itemId ?? null);
      await refresh();
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, nextItem, onError, onNotice, onSelect, refresh]);

  return {
    scope,
    type,
    city,
    setScope: (next: InboxScope) => { setScopeState(next); resetPaging(); },
    setType: (next: InboxType | null) => { setTypeState(next); resetPaging(); },
    setCity: (next: string | null) => { setCityState(next); resetPaging(); },
    page,
    items,
    totals: page.data?.totals ?? null,
    oldestWaitingSince: page.data?.oldestWaitingSince ?? null,
    hasNextPage: Boolean(page.data?.nextCursor),
    hasPreviousPage: cursors.length > 1,
    nextPage: () => { if (page.data?.nextCursor) setCursors((stack) => [...stack, page.data?.nextCursor ?? null]); },
    previousPage: () => setCursors((stack) => stack.length > 1 ? stack.slice(0, -1) : stack),
    detail,
    claimEvidence: claimRequestId !== null ? claimEvidence.data ?? null : null,
    claimEvidenceFailed: claimRequestId !== null && claimEvidence.isError,
    position: index >= 0 ? {index: index + 1, of: page.data?.totals.types.all ?? items.length} : null,
    nextItem,
    previousItem,
    selectNext: () => { if (nextItem) onSelect(nextItem.itemId); },
    selectPrevious: () => { if (previousItem) onSelect(previousItem.itemId); },
    updateItem: (input: InboxUpdate, notice: string) => run(() => update.mutateAsync(input), notice,
      input.action === "snooze" || input.action === "dismiss"),
    recommendClaim: (input: ClaimRecommendationInput) => run(() => recommend.mutateAsync(input),
      input.decision === "approve" ? "Recommended for approval. The owner decides." :
        "Recommended for rejection. The owner decides.", true),
    decideClaim: (input: Parameters<typeof decideClaim>[0]) => run(() => claimDecision.mutateAsync(input),
      input.decision === "approve" ? "Claim approved. They run the page now." : "Claim rejected.", true),
    decideAccess: (input: Parameters<typeof decideAccess>[0]) => run(() => accessDecision.mutateAsync(input),
      input.decision === "approve" ? "Launch access approved." : "Marked not selected yet.", true),
    /** Opens the approval sheet for a listing's request; null closes it. */
    openListingReview: setReviewRequestId,
    listingReview: reviewRequestId !== null ? listingReview.data ?? null : null,
    listingReviewFailed: reviewRequestId !== null && listingReview.isError,
    approveListing: async (input: Omit<ListingApprovalInput, "requestId">, requestId: string) => {
      const key = JSON.stringify(input);
      const approvalRequestId = approvalRequestIds.current.get(key) ?? crypto.randomUUID();
      approvalRequestIds.current.set(key, approvalRequestId);
      const done = await run(() => approval.mutateAsync({input: {...input, requestId: approvalRequestId}, requestId}),
        `${input.name} is published as an unclaimed page, not yet indexed. Its Sales work is open.`, true);
      if (done) {
        approvalRequestIds.current.delete(key);
        setReviewRequestId(null);
      }
      return done;
    },
    isApproving: approval.isPending,
    /** Opens the publish sheet for an imported event; null closes it. */
    openEventReview: setEventRef,
    eventReview: eventRef !== null ? eventReview.data ?? null : null,
    eventReviewFailed: eventRef !== null && eventReview.isError,
    publishEvent: async (request: ListingEventPublishRequest, title: string) => {
      const signature = JSON.stringify(request);
      const idempotencyKey = publishKeys.current.get(signature) ?? `admin:${crypto.randomUUID()}`;
      publishKeys.current.set(signature, idempotencyKey);
      const done = await run(async () => {
        const result = await eventPublish.mutateAsync({...request, executionMode: "apply", idempotencyKey});
        const blocked = result.results.filter((entry) => entry.outcome === "blocked");
        if (blocked.length) {
          throw new Error(`${title} is still blocked: ${blocked.flatMap((entry) => entry.blockers).map(blockerLabel).join(", ")}.`);
        }
      }, `${title} is published on the organizer's page.`, true);
      if (done) {
        publishKeys.current.delete(signature);
        setEventRef(null);
      }
      return done;
    },
    isPublishingEvent: eventPublish.isPending,
    /** A stuck nomination starts again from typed details: Intake builds a new listing, and this item closes. */
    fillInByHand: async (input: Pick<NominationInput, "name" | "market" | "urls" | "notes" | "categories" | "formats">, itemId: string) => {
      const key = JSON.stringify([itemId, input]);
      const requestId = nominationRequestIds.current.get(key) ?? crypto.randomUUID();
      nominationRequestIds.current.set(key, requestId);
      const done = await run(async () => {
        await nomination.mutateAsync({...input, requestId});
        await update.mutateAsync({itemId, action: "dismiss", assigneeUid: null, snoozedUntil: null,
          note: "Filled in by hand. Intake is building a new listing."});
      }, "Intake is building a new listing. It comes back here for review.", true);
      if (done) nominationRequestIds.current.delete(key);
      return done;
    },
    isFillingIn: nomination.isPending,
    hostQuery,
    setHostQuery,
    hostMatches: hostQuery.trim().length >= 2 ? hostSearch.data ?? [] : [],
    linkEnquiry: (input: Parameters<typeof linkEnquiry>[0], name: string) => run(() => enquiryLink.mutateAsync(input),
      `Linked to ${name}. Their Sales work is open.`, true),
    /** Sends the approved WhatsApp follow-up template to a host lead; it shows in their Support thread. */
    sendFollowUp: (intentId: string) => {
      const ids = followUpRequestIds.current;
      const clientRequestId = ids.get(intentId) ?? crypto.randomUUID();
      ids.set(intentId, clientRequestId);
      return run(async () => {
        try {
          await followUp.mutateAsync({intentId, clientRequestId});
          ids.delete(intentId);
        } catch (error) {
          if (!uncertain(error)) ids.delete(intentId);
          throw error;
        }
      }, "Follow-up sent on WhatsApp. It's in their Support thread.", false);
    },
    isSendingFollowUp: followUp.isPending,
    isWorking: update.isPending || recommend.isPending || claimDecision.isPending || accessDecision.isPending ||
      enquiryLink.isPending || followUp.isPending,
    refresh,
    /** For panels that take their own steps, such as a listing request: refresh the queue after one. */
    refreshItem: () => void refresh(),
  };
}

/** An answer that never arrived: the send may have happened, so a retry must reuse its request id. */
function uncertain(error: unknown): boolean {
  const code = (error as {code?: unknown} | null)?.code;
  return code === "functions/unavailable" || code === "functions/deadline-exceeded" || code === "functions/internal";
}

export type InboxController = ReturnType<typeof useInboxController>;
