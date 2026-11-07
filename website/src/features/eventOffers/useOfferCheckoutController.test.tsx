import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor, render, screen, fireEvent} from "@testing-library/react";
import {StrictMode, type PropsWithChildren} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {User} from "../../firebase";
const api = vi.hoisted(() => ({call: vi.fn(), watch: vi.fn(), otp: vi.fn(), open: vi.fn()}));
vi.mock("../../firebase", () => ({manageEventOfferCheckout: api.call,
  watchPublicFormAuthState: api.watch, beginPublicEventPhoneVerification: api.otp}));
vi.mock("../../shared/payments/razorpayCheckout", () => ({openRazorpayCheckout: api.open}));
import {useOfferCheckoutController} from "./useOfferCheckoutController";

import {EventOfferPage} from "./EventOfferPage";

const credential = {token: "s".repeat(43), instance: "opaque-page"};
const grant = {grantId: "a".repeat(64), eventName: "Morning run", eventId: "event1",
  cancellationPolicy: {refundDeadlineMillis: 8e12, eventStartsAtMillis: 9e12},
  startTimeMillis: 9e12, amountPaise: 10000, currency: "INR", expiresAtMillis: 9e12};
const ready = {paymentId: `ep_${"b".repeat(32)}`, status: "checkoutReady", amountPaise: 10000,
  currency: "INR", mode: "test", refundedAmountPaise: 0, cancellationReason: null, cancellationPolicy: null, cancellationQuote: null, expiresAtMillis: 9e12,
  checkout: {publicToken: "rzp_test_key", orderId: "order_one", amountPaise: 10000,
    currency: "INR", description: "Admission", expiresAtMillis: 9e12}};
let auth: (user: User | null) => void;
let initial: User | null;
let client: QueryClient;
function wrapper({children}: PropsWithChildren) {
  return <StrictMode><QueryClientProvider client={client}>{children}</QueryClientProvider></StrictMode>;
}
function response(payment: unknown) {return {grant: null, payment, serverTimeMillis: 2000};}
beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear(); window.sessionStorage.clear();
  client = new QueryClient({defaultOptions: {mutations: {retry: false}}});
  initial = {uid: "person", phoneNumber: "+919999999999"} as User;
  api.watch.mockImplementation((callback) => {auth = callback; callback(initial); return vi.fn();});
  api.call.mockImplementation(async (input) => input.action === "claim" ?
    {grant, payment: null, serverTimeMillis: 1000} : input.action === "prepare" ?
      response(ready) : response({...ready, status: "admitted", checkout: null}));
  api.open.mockResolvedValue({paymentId: "pay_one", signature: "a".repeat(64)});
});
afterEach(() => {cleanup(); client.clear(); vi.restoreAllMocks();});

describe("offer recipient flow", () => {
  it("requires phone verification before requesting invitation details", async () => {
    initial = null;
    const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
    await waitFor(() => expect(result.current.phase).toBe("phone"));
    expect(api.call).not.toHaveBeenCalled();
    act(() => auth({uid: "person", phoneNumber: "+919999999999"} as User));
    await waitFor(() => expect(result.current.grant?.eventName).toBe("Morning run"));
    expect(JSON.stringify(client.getMutationCache().getAll().map((mutation) => mutation.state.variables))).not.toContain(credential.token);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
  it("claims then pays, but only server admission confirms the guest", async () => {
    const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
    await waitFor(() => expect(result.current.grant).not.toBeNull());
    await act(async () => {await result.current.pay();});
    expect(api.open).toHaveBeenCalledOnce();
    expect(api.call).toHaveBeenLastCalledWith({action: "status", paymentId: ready.paymentId,
      callback: {paymentId: "pay_one", signature: "a".repeat(64)}});
    expect(result.current.payment?.status).toBe("admitted");
  });
  it("uses the same request identity after an uncertain preparation", async () => {
    let attempts = 0;
    api.call.mockImplementation(async (input) => {
      if (input.action === "claim") return {grant, payment: null, serverTimeMillis: 1000};
      if (input.action === "prepare" && ++attempts === 1) throw new Error("Network lost");
      return response(input.action === "prepare" ? ready : {...ready, status: "verifying", checkout: null});
    });
    const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
    await waitFor(() => expect(result.current.grant).not.toBeNull());
    await act(async () => {await result.current.pay();});
    await act(async () => {await result.current.pay();});
    const calls = api.call.mock.calls.filter(([input]) => input.action === "prepare");
    expect(calls[0][0].requestId).toBe(calls[1][0].requestId);
    expect(result.current.payment?.status).toBe("verifying");
  });
  it("discards an old account response before opening checkout", async () => {
    let resolve!: (value: unknown) => void;
    api.call.mockImplementation((input) => input.action === "claim" ?
      Promise.resolve({grant, payment: null, serverTimeMillis: 1000}) :
      new Promise((done) => {resolve = done;}));
    const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
    await waitFor(() => expect(result.current.grant).not.toBeNull());
    let paying!: Promise<void>;
    act(() => {paying = result.current.pay();});
    await waitFor(() => expect(resolve).toBeDefined());
    act(() => auth(null));
    await act(async () => {resolve(response(ready)); await paying;});
    expect(api.open).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("phone");
    expect(result.current.payment).toBeNull();
  });
  it("restores expired payment history without preparing another attempt", async () => {
    api.call.mockResolvedValue(response({...ready, status: "expired", checkout: null}));
    const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
    await waitFor(() => expect(result.current.payment?.status).toBe("expired"));
    expect(result.current.grant).toBeNull();
    expect(api.call).toHaveBeenCalledExactlyOnceWith({action: "claim", token: credential.token});
    expect(api.open).not.toHaveBeenCalled();
  });
  it("recovers an owned payment after a reload without an invitation token", async () => {
    api.call.mockResolvedValue(response({...ready, status: "admitted", checkout: null}));
    const recovery = {paymentId: ready.paymentId, instance: "reload"};
    const {result} = renderHook(() => useOfferCheckoutController(recovery), {wrapper});
    await waitFor(() => expect(result.current.payment?.status).toBe("admitted"));
    expect(api.call).toHaveBeenCalledExactlyOnceWith({action: "status", paymentId: ready.paymentId, callback: null});
    expect(api.open).not.toHaveBeenCalled();
  });
  it("finishes existing OTP and ignores duplicate submission while the challenge is pending", async () => {
    initial = null;
    let resolve!: (value: unknown) => void;
    const confirmation = {clear: vi.fn(), confirm: vi.fn(async () => auth({uid: "person", phoneNumber: "+919999999999"} as User))};
    api.otp.mockImplementation(() => new Promise((done) => {resolve = done;}));
    const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
    await waitFor(() => expect(result.current.phase).toBe("phone"));
    act(() => result.current.setPhone("+919999999999"));
    const event = {preventDefault: vi.fn()} as unknown as Parameters<typeof result.current.sendCode>[0];
    let sending!: Promise<void>;
    act(() => {sending = result.current.sendCode(event); void result.current.sendCode(event);});
    await waitFor(() => expect(api.otp).toHaveBeenCalledOnce());
    await act(async () => {resolve(confirmation); await sending;});
    expect(result.current.phase).toBe("otp");
    act(() => result.current.setCode("123456"));
    await act(async () => {await result.current.verifyCode(event);});
    await waitFor(() => expect(result.current.grant).not.toBeNull());
    expect(confirmation.confirm).toHaveBeenCalledExactlyOnceWith("123456");
  });

  it("discovers an uncertain preparation by grant after a reload", async () => {
    api.call.mockResolvedValue(response({...ready, status: "orderUnknown", checkout: null}));
    const recovery = {grantId: grant.grantId, instance: "uncertain-reload"};
    const {result} = renderHook(() => useOfferCheckoutController(recovery), {wrapper});
    await waitFor(() => expect(result.current.payment?.status).toBe("orderUnknown"));
    expect(api.call).toHaveBeenCalledExactlyOnceWith({action: "find", grantId: grant.grantId});
    expect(api.open).not.toHaveBeenCalled();
  });

});

it("reviews fresh refund terms and confirms exactly that amount", async () => {
  const admitted = {...ready, status: "admitted", checkout: null,
    cancellationPolicy: grant.cancellationPolicy, cancellationQuote: {refundAmountPaise: 10000}};
  api.call.mockImplementation(async (input) => response(input.action === "cancelAdmission" ?
    {...admitted, status: "refundPending", cancellationReason: "guestCancelled", cancellationQuote: null} : admitted));
  const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
  await waitFor(() => expect(result.current.payment?.status).toBe("admitted"));
  expect(result.current.cancellationReview).toBeNull();
  await act(async () => {await result.current.cancelAdmission();});
  expect(api.call.mock.calls.some(([input]) => input.action === "cancelAdmission")).toBe(false);
  await act(async () => {await result.current.reviewCancellation();});
  expect(result.current.cancellationReview?.refundAmountPaise).toBe(10000);
  await act(async () => {await result.current.cancelAdmission();});
  expect(api.call).toHaveBeenLastCalledWith({action: "cancelAdmission", paymentId: ready.paymentId,
    expectedRefundAmountPaise: 10000});
  expect(result.current.payment?.status).toBe("refundPending");
  expect(result.current.cancellationReview).toBeNull();
  expect(api.open).not.toHaveBeenCalled();
});

it("requires another review after an uncertain cancellation and clears it on account change", async () => {
  const admitted = {...ready, status: "admitted", checkout: null,
    cancellationPolicy: grant.cancellationPolicy, cancellationQuote: {refundAmountPaise: 0}};
  api.call.mockImplementation(async (input) => {
    if (input.action === "cancelAdmission") throw new Error("Lost response");
    return response(admitted);
  });
  const {result} = renderHook(() => useOfferCheckoutController(credential), {wrapper});
  await waitFor(() => expect(result.current.payment?.status).toBe("admitted"));
  await act(async () => {await result.current.reviewCancellation();});
  await act(async () => {await result.current.cancelAdmission();});
  expect(result.current.cancellationReview).toBeNull();
  expect(result.current.status.tone).toBe("is-error");
  await act(async () => {await result.current.reviewCancellation();});
  expect(result.current.cancellationReview?.refundAmountPaise).toBe(0);
  act(() => auth(null));
  expect(result.current.cancellationReview).toBeNull();
});

it("shows a no-refund warning before cancellation and focuses the safe action", async () => {
  const admitted = {...ready, status: "admitted", checkout: null,
    cancellationPolicy: grant.cancellationPolicy, cancellationQuote: {refundAmountPaise: 0}};
  api.call.mockImplementation(async (input) => response(input.action === "cancelAdmission" ?
    {...admitted, status: "cancelled", cancellationReason: "guestCancelled", cancellationQuote: null} : admitted));
  render(<EventOfferPage credential={credential} />, {wrapper});
  const start = await screen.findByRole("button", {name: "Cancel my place"});
  fireEvent.click(start);
  await screen.findByRole("heading", {name: "Cancel your place?"});
  expect(screen.getByText(/No refund applies. Cancelling releases/u)).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("button", {name: "Keep my place"}));
  expect(api.call.mock.calls.some(([input]) => input.action === "cancelAdmission")).toBe(false);
  fireEvent.click(screen.getByRole("button", {name: "Confirm cancellation"}));
  await screen.findByRole("heading", {name: "Your place is cancelled"});
  expect(screen.queryByRole("button", {name: /^Take the place/u})).toBeNull();
});

it("accepts a free invitation without opening payment and links event access", async () => {
  const freeAdmission = {expectedOfferGeneration: 1, expectedOfferRevision: 2, expectedLedgerRevision: 3};
  api.call.mockImplementation(async (input) => input.action === "claim" ?
    {grant: {...grant, amountPaise: 0, freeAdmission}, payment: null, serverTimeMillis: 1000} :
    {grant: null, payment: null, admission: {eventId: "event1", attendeeId: "guest1"}, serverTimeMillis: 2000});
  render(<EventOfferPage credential={credential} />, {wrapper});
  const accept = await screen.findByRole("button", {name: "Take the place · free"});
  expect(screen.queryByText(/Full cash refund/u)).toBeNull();
  fireEvent.click(accept);
  expect((await screen.findByRole("link", {name: "View your booking and event access"})).getAttribute("href"))
    .toBe("/booking/event1/");
  expect(api.open).not.toHaveBeenCalled();
  expect(api.call.mock.calls.at(-1)?.[0]).toMatchObject({action: "acceptFree", grantId: grant.grantId, ...freeAdmission});
});
it("recovered paid receipts link event access without a current grant", async () => {
  api.call.mockResolvedValue(response({...ready, eventId: "event1", status: "admitted", checkout: null}));
  render(<EventOfferPage credential={{paymentId: ready.paymentId, instance: "recovered"}} />, {wrapper});
  expect((await screen.findByRole("link", {name: "View your booking and event access"})).getAttribute("href"))
    .toBe("/booking/event1/");
});
