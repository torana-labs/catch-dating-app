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
import type {
  GetOrganizerBillingStatusCallablePayload,
  GetOrganizerBillingStatusCallableResponse,
  ListMyOrganizerJourneysCallablePayload,
  ListMyOrganizerJourneysCallableResponse,
  ListOrganizerBillsCallablePayload,
  ManageOrganizerBillingPlanCallablePayload,
} from "./contracts";

type Journey = ListMyOrganizerJourneysCallableResponse["journeys"][number];

export type BillingOrganizer = Pick<Journey, "organizerId" | "organizerName">;

type PlanAction = Exclude<ManageOrganizerBillingPlanCallablePayload["action"], "read">;

/** A reply not yet trusted: only the contract's keys, every value unknown. */
type Untrusted<T> = {[K in keyof T]?: unknown};

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
  const [requested] = useState<string | null>(initialOrganizerId);
  const [chosen, setChosen] = useState<string | null>(requested);
  const [actionError, setActionError] = useState<"changed" | "failed" | null>(null);
  useEffect(() => watchWebsiteAccountAuthState((user) => setIdentity({user, loaded: true})), []);
  const uid = identity.user?.uid ?? null;

  const organizersQuery = useQuery({queryKey: ["host-billing", uid, "organizers", requested], enabled: Boolean(uid),
    retry: false, gcTime: 0, queryFn: async (): Promise<BillingOrganizer[]> => {
      // The contract requires organizerId: the preselected organizer's journey, or null.
      const payload: ListMyOrganizerJourneysCallablePayload = {organizerId: requested};
      const reply = await invokeHostBillingCallable("listMyOrganizerJourneys", {...payload}) as
        Untrusted<ListMyOrganizerJourneysCallableResponse> | null;
      const journeys: unknown[] = Array.isArray(reply?.journeys) ? reply.journeys : [];
      return journeys.flatMap((entry) => {
        const journey = (entry ?? {}) as Untrusted<Journey>;
        return typeof journey.organizerId === "string" && journey.waitingClaim !== true ?
          [{organizerId: journey.organizerId, organizerName: String(journey.organizerName ?? journey.organizerId)}] : [];
      });
    }});
  const organizers = organizersQuery.data ?? [];
  const organizerId = chosen && (organizers.length === 0 || organizers.some((item) => item.organizerId === chosen)) ?
    chosen : organizers[0]?.organizerId ?? null;

  const billingQuery = useQuery({queryKey: ["host-billing", uid, organizerId], enabled: Boolean(uid && organizerId),
    retry: false, gcTime: 0, queryFn: async () => {
      const payload: GetOrganizerBillingStatusCallablePayload & ListOrganizerBillsCallablePayload =
        {organizerId: organizerId!};
      const read: ManageOrganizerBillingPlanCallablePayload = {...payload, action: "read", expectedRevision: null};
      const [status, planView, bills] = await Promise.all([
        invokeHostBillingCallable("getOrganizerBillingStatus", {...payload}),
        invokeHostBillingCallable("manageOrganizerBillingPlan", {...read}),
        invokeHostBillingCallable("listOrganizerBills", {...payload})]);
      const statusRaw = status as Untrusted<GetOrganizerBillingStatusCallableResponse> | null;
      return {trial: parseTrial(statusRaw?.trial), plan: parsePlanStatus(statusRaw?.plan),
        planView: parsePlanView(planView), bills: parseBills(bills)};
    }});

  const action = useMutation({retry: false, gcTime: 0, mutationFn: async (kind: PlanAction) => {
    const view = billingQuery.data?.planView;
    const change: ManageOrganizerBillingPlanCallablePayload =
      {organizerId: organizerId!, action: kind, expectedRevision: view?.revision ?? 0};
    return parsePlanView(await invokeHostBillingCallable("manageOrganizerBillingPlan", {...change}));
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
