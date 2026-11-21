import {useLayoutEffect, useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {salesPartnerAccessApi, type PartnerRevokeInput, type SalesPartnerAccessApi} from "../api/salesPartnerAccess";

/** "host" ends this host's reservation only; "partner" ends their whole partner membership. */
export type PartnerRevokeScope = "host" | "partner";

const definitive = ["aborted", "invalid-argument", "permission-denied", "unauthenticated",
  "failed-precondition", "already-exists", "not-found", "resource-exhausted"];
function rejection(code: string, failure: unknown): string {
  if (code === "aborted") return "Someone changed this partner's access while you were revoking. Check what it shows now, then revoke again if you still need to.";
  if (code === "not-found") return "That partner access no longer exists. Check what it shows now.";
  if (code === "permission-denied" || code === "unauthenticated") {
    return "Only an admin or the owner can revoke partner access. Sign in again if your role just changed.";
  }
  if (code === "resource-exhausted") return "Too many changes in a minute. Wait a minute, then revoke again.";
  return failure instanceof Error ? failure.message : "The revoke was refused. Check what it shows now.";
}

/**
 * One host's referral partner reservation and that partner's membership, and revoking either at the exact
 * revision read. An unconfirmed revoke freezes its request, so a retry can only repeat it, never revoke twice.
 */
export function useSalesPartnerAccessController(actorUid: string, organizerId: string,
  api: SalesPartnerAccessApi = salesPartnerAccessApi) {
  const client = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const key = adminQueryKeys.sales.partnerAccess(organizerId);
  const query = useQuery({queryKey: key, queryFn: () => api.get(organizerId), retry: false, staleTime: 0, gcTime: 0});
  const mutation = useMutation({mutationFn: (input: PartnerRevokeInput) => api.revoke(input), retry: false, gcTime: 0});
  const epoch = useRef(0); const pending = useRef<PartnerRevokeInput | null>(null); const busy = useRef(false);
  const [ticket, setTicket] = useState<PartnerRevokeInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState<PartnerRevokeScope | null>(null);
  useLayoutEffect(() => {
    epoch.current += 1; pending.current = null; busy.current = false;
    setTicket(null); setError(null); setRevoked(null);
    return () => {epoch.current += 1; pending.current = null;};
  }, [actorUid, organizerId]);
  const refresh = () => client.invalidateQueries({queryKey: key});
  const run = async (input: PartnerRevokeInput) => {
    if (busy.current || (pending.current && pending.current !== input)) return false;
    const lease = beginOperation(); if (!lease) return false;
    busy.current = true; pending.current = input; setTicket(input); setError(null); setRevoked(null);
    const generation = epoch.current;
    try {
      await mutation.mutateAsync(input);
      if (generation !== epoch.current) return false;
      pending.current = null; setTicket(null); setRevoked(input.organizerId === null ? "partner" : "host");
      void refresh();
      return true;
    } catch (failure) {
      if (generation !== epoch.current) return false;
      const code = failure && typeof failure === "object" && "code" in failure ?
        String(failure.code).replace(/^functions\//u, "") : "";
      if (definitive.includes(code)) {pending.current = null; setTicket(null); void refresh();}
      setError(definitive.includes(code) ? rejection(code, failure) :
        "We couldn't confirm the revoke. Retry the same request: it can't revoke twice.");
      return false;
    } finally {
      if (generation === epoch.current) {busy.current = false; mutation.reset();}
      endOperation(lease);
    }
  };
  const revoke = (scope: PartnerRevokeScope, reason: string) => {
    const access = query.data;
    if (pending.current || busy.current || !access || query.isFetching) return Promise.resolve(false);
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > 1000) {
      setError("Say why, in up to 1,000 characters.");
      return Promise.resolve(false);
    }
    const target = scope === "host" ? access.assignment : access.membership;
    if (!target) {
      setError(scope === "host" ? "This host has no partner reservation to revoke." : "This partner has no membership to revoke.");
      return Promise.resolve(false);
    }
    return run({requestId: crypto.randomUUID(), organizerId: scope === "host" ? organizerId : null,
      partnerUid: target.partnerUid, expectedRevision: target.revision, reason: trimmed});
  };
  return {
    access: query.data ?? null,
    loading: query.isPending,
    loadError: query.isError ? "Partner access could not load. Try again." : null,
    refresh,
    revoke,
    retry: () => pending.current ? run(pending.current) : Promise.resolve(false),
    ticket, error, revoked, busy: mutation.isPending,
  };
}
