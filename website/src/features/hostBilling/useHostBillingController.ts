import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {invokeHostBillingCallable, watchWebsiteAccountAuthState, type User} from "../../firebase";
import {watchOrganizerBillingView, watchOrganizerBills, watchOwnedOrganizers} from "../../firebaseReadModels";
import {liveReadErrorCode, useLiveRead} from "../../shared/query/useLiveRead";
import {
  parseBills,
  parsePlanStatus,
  parsePlanView,
  trialFromView,
  type Bill,
  type PlanStatus,
  type PlanView,
  type TrialStatus,
} from "./hostBillingModel";
import type {ManageOrganizerBillingPlanCallablePayload} from "./contracts";

export interface BillingOrganizer {
  organizerId: string;
  organizerName: string;
}

type PlanAction = Exclude<ManageOrganizerBillingPlanCallablePayload["action"], "read">;

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

/** Callable and Firestore errors carry their code; permission-denied means not the owner. */
const errorCode = liveReadErrorCode;

function initialOrganizerId(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("organizerId");
  return id && /^[A-Za-z0-9_-]{1,180}$/u.test(id) ? id : null;
}

/**
 * The signed-in owner's billing: which organizer, its trial and plan (status
 * from the owner's hostOrganizerBillingViews row, prices from
 * manageOrganizerBillingPlan) and
 * its bills. Buying tools-only opens Razorpay's payment page on Catch's
 * account; the plan becomes active when Razorpay reports it paid.
 */
export function useHostBillingController(): HostBillingController {
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState<{user: User | null; loaded: boolean}>({user: null, loaded: false});
  // A bill email's link preselects its organizer (?organizerId=).
  const [chosen, setChosen] = useState<string | null>(initialOrganizerId);
  const [actionError, setActionError] = useState<"changed" | "failed" | null>(null);
  useEffect(() => watchWebsiteAccountAuthState((user) => setIdentity({user, loaded: true})), []);
  const uid = identity.user?.uid ?? null;

  // Every organizer the signed-in user owns, and the chosen one's bills: the
  // same organizers rows and hostOrganizerBillViews the Host app listens to.
  const organizersRead = useLiveRead<BillingOrganizer[]>(uid, (onValue, onError) =>
    watchOwnedOrganizers(uid!, (rows) => onValue(rows.map((row) =>
      ({organizerId: row.organizerId, organizerName: row.name}))), onError));
  const organizers = organizersRead.data ?? [];
  const organizerId = chosen && (organizers.length === 0 || organizers.some((item) => item.organizerId === chosen)) ?
    chosen : organizers[0]?.organizerId ?? null;
  const billsRead = useLiveRead<Bill[]>(uid && organizerId ? `${uid}/${organizerId}` : null,
    (onValue, onError) => watchOrganizerBills(organizerId!, (bills) => onValue(parseBills({bills})), onError));

  // The trial and plan follow the owner's hostOrganizerBillingViews row
  // (#2306); the trial state and days left come from its instants and this
  // page's clock. Prices and the payment link stay on manageOrganizerBillingPlan.
  const statusRead = useLiveRead<{trial: unknown; plan: unknown} | null>(uid && organizerId ? `${uid}/${organizerId}` :
    null, (onValue, onError) => watchOrganizerBillingView(organizerId!, onValue, onError));
  const billingQuery = useQuery({queryKey: ["host-billing", uid, organizerId], enabled: Boolean(uid && organizerId),
    retry: false, gcTime: 0, queryFn: async () => {
      const read: ManageOrganizerBillingPlanCallablePayload =
        {organizerId: organizerId!, action: "read", expectedRevision: null};
      return {planView: parsePlanView(await invokeHostBillingCallable("manageOrganizerBillingPlan", {...read}))};
    }});
  const status = statusRead.data;

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

  const failure = organizersRead.error ?? statusRead.error ?? billingQuery.error ?? billsRead.error;
  const phase: HostBillingPhase = !identity.loaded ? "loading" :
    !uid ? "signedOut" :
      organizersRead.status === "pending" ? "loading" :
        failure ? errorCode(failure) === "permission-denied" ? "notOwner" : "failed" :
          !organizerId ? "noOrganizers" :
            billingQuery.isPending || statusRead.status === "pending" || billsRead.status === "pending" ?
              "loading" : "ready";
  return {
    phase, user: identity.user, organizers, organizerId,
    selectOrganizer: (id) => {
      setChosen(id); setActionError(null);
    },
    trial: status === undefined ? null : trialFromView(status?.trial, Date.now()),
    plan: status === undefined ? null : parsePlanStatus(status?.plan),
    planView: billingQuery.data?.planView ?? null,
    bills: billsRead.data ?? [],
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
