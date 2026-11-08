import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {invokeHostBillingCallable, watchWebsiteAccountAuthState, type User} from "../../firebase";
import {
  parseBills,
  parsePlanStatus,
  parsePlanView,
  parseTrial,
  type Bill,
  type PlanStatus,
  type PlanView,
  type TrialStatus,
} from "./hostBillingModel";

export interface BillingOrganizer {
  organizerId: string;
  organizerName: string;
}

export type HostBillingPhase = "loading" | "signedOut" | "noOrganizers" | "notOwner" | "failed" | "ready";

export interface HostBillingController {
  phase: HostBillingPhase;
  user: User | null;
  organizers: BillingOrganizer[];
  organizerId: string | null;
  selectOrganizer: (organizerId: string) => void;
  trial: TrialStatus | null;
  plan: PlanStatus | null;
  planView: PlanView | null;
  bills: Bill[];
  acting: boolean;
  actionError: "changed" | "failed" | null;
  buyToolsOnly: () => void;
  cancelToolsOnly: () => void;
  openPayment: (url: string) => void;
  refresh: () => void;
  nowMillis: number;
}

/** Firebase callable errors carry their code; permission-denied means not the owner. */
function errorCode(error: unknown): string | null {
  const code = (error as {code?: unknown} | null)?.code;
  return typeof code === "string" ? code.replace(/^functions\//u, "") : null;
}

function initialOrganizerId(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("organizerId");
  return id && /^[A-Za-z0-9_-]{1,180}$/u.test(id) ? id : null;
}

/**
 * The signed-in owner's billing: which organizer, its trial and plan (status
 * from getOrganizerBillingStatus, prices from manageOrganizerBillingPlan) and
 * its bills. Buying tools-only opens Razorpay's payment page on Catch's
 * account; the plan becomes active when Razorpay reports it paid.
 */
export function useHostBillingController(): HostBillingController {
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState<{user: User | null; loaded: boolean}>({user: null, loaded: false});
  const [chosen, setChosen] = useState<string | null>(initialOrganizerId);
  const [actionError, setActionError] = useState<"changed" | "failed" | null>(null);
  useEffect(() => watchWebsiteAccountAuthState((user) => setIdentity({user, loaded: true})), []);
  const uid = identity.user?.uid ?? null;

  const organizersQuery = useQuery({queryKey: ["host-billing", uid, "organizers"], enabled: Boolean(uid),
    retry: false, gcTime: 0, queryFn: async (): Promise<BillingOrganizer[]> => {
      const reply = await invokeHostBillingCallable("listMyOrganizerJourneys", {}) as {journeys?: unknown};
      const journeys = Array.isArray(reply?.journeys) ? reply.journeys : [];
      return journeys.flatMap((entry: unknown) => {
        const journey = entry as {organizerId?: unknown; organizerName?: unknown; waitingClaim?: unknown};
        return typeof journey.organizerId === "string" && journey.waitingClaim !== true ?
          [{organizerId: journey.organizerId, organizerName: String(journey.organizerName ?? journey.organizerId)}] : [];
      });
    }});
  const organizers = organizersQuery.data ?? [];
  const organizerId = chosen && (organizers.length === 0 || organizers.some((item) => item.organizerId === chosen)) ?
    chosen : organizers[0]?.organizerId ?? null;

  const billingQuery = useQuery({queryKey: ["host-billing", uid, organizerId], enabled: Boolean(uid && organizerId),
    retry: false, gcTime: 0, queryFn: async () => {
      const payload = {organizerId: organizerId!};
      const [status, planView, bills] = await Promise.all([
        invokeHostBillingCallable("getOrganizerBillingStatus", payload),
        invokeHostBillingCallable("manageOrganizerBillingPlan", {...payload, action: "read", expectedRevision: null}),
        invokeHostBillingCallable("listOrganizerBills", payload)]);
      const statusRaw = status as {trial?: unknown; plan?: unknown};
      return {trial: parseTrial(statusRaw?.trial), plan: parsePlanStatus(statusRaw?.plan),
        planView: parsePlanView(planView), bills: parseBills(bills)};
    }});

  const action = useMutation({retry: false, gcTime: 0, mutationFn: async (kind: "buyToolsOnly" | "cancelToolsOnly") => {
    const view = billingQuery.data?.planView;
    return parsePlanView(await invokeHostBillingCallable("manageOrganizerBillingPlan",
      {organizerId, action: kind, expectedRevision: view?.revision ?? 0}));
  }, onSuccess: (view, kind) => {
    setActionError(null);
    void queryClient.invalidateQueries({queryKey: ["host-billing", uid, organizerId]});
    // A new purchase goes straight to Razorpay's payment page.
    if (kind === "buyToolsOnly" && view.paymentUrl) openPayment(view.paymentUrl);
  }, onError: (error) => {
    setActionError(errorCode(error) === "aborted" ? "changed" : "failed");
    void queryClient.invalidateQueries({queryKey: ["host-billing", uid, organizerId]});
  }});

  function openPayment(url: string) {
    if (!url.startsWith("https://") || typeof window === "undefined") return;
    window.location.assign(url);
  }

  const failure = organizersQuery.error ?? billingQuery.error;
  const phase: HostBillingPhase = !identity.loaded ? "loading" :
    !uid ? "signedOut" :
      organizersQuery.isPending ? "loading" :
        failure ? errorCode(failure) === "permission-denied" ? "notOwner" : "failed" :
          !organizerId ? "noOrganizers" :
            billingQuery.isPending ? "loading" : "ready";
  return {
    phase, user: identity.user, organizers, organizerId,
    selectOrganizer: (id) => {
      setChosen(id); setActionError(null);
    },
    trial: billingQuery.data?.trial ?? null,
    plan: billingQuery.data?.plan ?? null,
    planView: billingQuery.data?.planView ?? null,
    bills: billingQuery.data?.bills ?? [],
    acting: action.isPending,
    actionError,
    buyToolsOnly: () => action.mutate("buyToolsOnly"),
    cancelToolsOnly: () => action.mutate("cancelToolsOnly"),
    openPayment,
    refresh: () => {
      void queryClient.invalidateQueries({queryKey: ["host-billing", uid]});
    },
    nowMillis: Date.now(),
  };
}
