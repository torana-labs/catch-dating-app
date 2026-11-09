import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import type {User} from "../../firebase";

const api = vi.hoisted(() => ({call: vi.fn(), watch: vi.fn()}));
vi.mock("../../firebase", () => ({invokeHostBillingCallable: api.call, watchWebsiteAccountAuthState: api.watch}));
import {useHostBillingController} from "./useHostBillingController";

let signIn: (user: User | null) => void = () => undefined;
const assign = vi.fn();

beforeEach(() => {
  api.call.mockReset();
  api.watch.mockImplementation((listener: (user: User | null) => void) => {
    signIn = listener;
    return () => undefined;
  });
  vi.stubGlobal("location", {...window.location, assign, search: ""});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  assign.mockReset();
});

function wrapper({children}: PropsWithChildren) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const status = {organizerId: "lantern", trial: {state: "active", daysLeft: 12, endsAtMillis: 2e12, startsAtMillis: 1e12},
  plan: {plan: "ticketing", status: "none", startsAtMillis: null, endsAtMillis: null}};
const plan = {organizerId: "lantern", plan: status.plan, revision: 0, paymentUrl: null, amountDueMinor: null,
  prices: {toolsOnlyFeeMinor: 500000, commissionRateBasisPoints: 500, commissionCapMinor: 1000000, cycleDays: 30,
    gstRegistered: false, gstRateBasisPoints: 1800}};

function answer(overrides: Record<string, unknown> = {}) {
  api.call.mockImplementation(async (name: string, payload: {action?: string}) => {
    if (name in overrides) {
      const value = overrides[name];
      if (value instanceof Error) throw value;
      return value;
    }
    if (name === "listMyOrganizerJourneys") {
      return {journeys: [{organizerId: "lantern", organizerName: "Lantern Lane", waitingClaim: false},
        {organizerId: "pending", organizerName: "Pending", waitingClaim: true}]};
    }
    if (name === "getOrganizerBillingStatus") return status;
    if (name === "listOrganizerBills") return {bills: []};
    if (name === "manageOrganizerBillingPlan" && payload.action === "buyToolsOnly") {
      return {...plan, revision: 1, paymentUrl: "https://rzp.io/l/tools", amountDueMinor: 500000,
        plan: {plan: "toolsOnly", status: "pendingPayment", startsAtMillis: 3e12, endsAtMillis: null}};
    }
    return plan;
  });
}

it("asks a signed-out visitor to sign in", async () => {
  answer();
  const {result} = renderHook(() => useHostBillingController(), {wrapper});
  expect(result.current.phase).toBe("loading");
  act(() => signIn(null));
  expect(result.current.phase).toBe("signedOut");
  expect(api.call).not.toHaveBeenCalled();
});

it("reads the owned organizer's trial, plan and bills", async () => {
  answer();
  const {result} = renderHook(() => useHostBillingController(), {wrapper});
  act(() => signIn({uid: "owner"} as User));
  await waitFor(() => expect(result.current.phase).toBe("ready"));
  expect(result.current.organizers).toEqual([{organizerId: "lantern", organizerName: "Lantern Lane"}]);
  expect(result.current.trial?.daysLeft).toBe(12);
  expect(result.current.planView?.prices?.toolsOnlyFeeMinor).toBe(500000);
  expect(api.call).toHaveBeenCalledWith("manageOrganizerBillingPlan",
    {organizerId: "lantern", action: "read", expectedRevision: null});
});

it("a manager is told only the owner sees billing", async () => {
  answer({getOrganizerBillingStatus: Object.assign(new Error("denied"), {code: "functions/permission-denied"})});
  const {result} = renderHook(() => useHostBillingController(), {wrapper});
  act(() => signIn({uid: "manager"} as User));
  await waitFor(() => expect(result.current.phase).toBe("notOwner"));
});

it("buying tools-only names the reviewed revision and opens Razorpay's page", async () => {
  answer();
  const {result} = renderHook(() => useHostBillingController(), {wrapper});
  act(() => signIn({uid: "owner"} as User));
  await waitFor(() => expect(result.current.phase).toBe("ready"));
  act(() => result.current.buyToolsOnly());
  await waitFor(() => expect(assign).toHaveBeenCalledWith("https://rzp.io/l/tools"));
  expect(api.call).toHaveBeenCalledWith("manageOrganizerBillingPlan",
    {organizerId: "lantern", action: "buyToolsOnly", expectedRevision: 0});
});

it("no organizer to bill says so", async () => {
  answer({listMyOrganizerJourneys: {journeys: []}});
  const {result} = renderHook(() => useHostBillingController(), {wrapper});
  act(() => signIn({uid: "guest"} as User));
  await waitFor(() => expect(result.current.phase).toBe("noOrganizers"));
});
