import {useLayoutEffect, useRef, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {offerSalesPartner, type PartnerOfferInput} from "../api/salesPartnerAssignment";

type Offer = Pick<PartnerOfferInput, "partnerUid" | "nextAction" | "reviewAt" | "expiresAt" | "reason">;
/** expectedRevision is the host's current reservation revision (0 when none was ever made). */
export function useSalesPartnerOfferController(actorUid: string, organizerId: string, expectedRevision = 0) {
  const client = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const mutation = useMutation({mutationFn: offerSalesPartner, retry: false, gcTime: 0});
  const epoch = useRef(0); const pending = useRef<PartnerOfferInput | null>(null);
  const busy = useRef(false); const completed = useRef(false);
  const [ticket, setTicket] = useState<PartnerOfferInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offeredTo, setOfferedTo] = useState<string | null>(null);
  useLayoutEffect(() => {
    epoch.current += 1; pending.current = null; completed.current = false; busy.current = false;
    setTicket(null); setError(null); setOfferedTo(null);
    return () => {epoch.current += 1; pending.current = null;};
  }, [actorUid, organizerId]);
  // A new revision (an offer landed, or a revoke reopened the host) allows the next offer;
  // an unconfirmed ticket stays, because its receipt answers a retry whatever the revision.
  const revision = useRef(expectedRevision);
  useLayoutEffect(() => {
    if (revision.current === expectedRevision) return;
    revision.current = expectedRevision; completed.current = false; setOfferedTo(null);
  }, [expectedRevision]);
  const run = async (input: PartnerOfferInput) => {
    if (busy.current || completed.current || (pending.current && pending.current !== input)) return false;
    const lease = beginOperation(); if (!lease) return false;
    busy.current = true; pending.current = input; setTicket(input); setError(null);
    const generation = epoch.current;
    try {
      await mutation.mutateAsync(input);
      if (generation !== epoch.current) return false;
      completed.current = true; pending.current = null; setTicket(null); setOfferedTo(input.partnerUid);
      void client.invalidateQueries({queryKey: adminQueryKeys.sales.partnerAccess(organizerId)});
      return true;
    } catch (failure) {
      if (generation !== epoch.current) return false;
      const code = failure && typeof failure === "object" && "code" in failure ?
        String(failure.code).replace(/^functions\//u, "") : "";
      const rejected = ["aborted", "invalid-argument", "permission-denied", "unauthenticated",
        "failed-precondition", "already-exists", "not-found", "resource-exhausted"].includes(code);
      if (rejected) {
        pending.current = null; setTicket(null);
        void client.invalidateQueries({queryKey: adminQueryKeys.sales.partnerAccess(organizerId)});
      }
      setError(code === "aborted" ? "Someone changed this host's partner reservation while you were offering. Close this, check who has it now, and offer again." :
        rejected ? (failure instanceof Error ? failure.message : "The offer was rejected. Review current access.") :
        "The offer was not confirmed. Retry the unchanged request before making another offer.");
      return false;
    } finally {
      if (generation === epoch.current) {busy.current = false; mutation.reset();}
      endOperation(lease);
    }
  };
  const offer = (value: Offer) => {
    if (pending.current || busy.current || completed.current) return Promise.resolve(false);
    const now = Date.now(), review = Date.parse(value.reviewAt), expiry = Date.parse(value.expiresAt);
    if (!value.partnerUid.trim() || value.partnerUid.trim().length > 128 ||
        !value.nextAction.trim() || value.nextAction.trim().length > 500 ||
        !value.reason.trim() || value.reason.trim().length > 1000 ||
        !Number.isFinite(review) || !Number.isFinite(expiry) || review <= now || expiry < review ||
        review > now + 30 * 86400000 || expiry > now + 90 * 86400000) {
      setError("Choose a partner (up to 128 characters), next action (500), reason (1000) and future review before expiry (review within 30 days; expiry within 90 days).");
      return Promise.resolve(false);
    }
    return run({...value, partnerUid: value.partnerUid.trim(), nextAction: value.nextAction.trim(),
      reason: value.reason.trim(), organizerId, expectedRevision: revision.current, originatorUid: null, requestId: crypto.randomUUID()});
  };
  return {offer, retry: () => pending.current ? run(pending.current) : Promise.resolve(false),
    ticket, error, offeredTo, busy: mutation.isPending};
}
