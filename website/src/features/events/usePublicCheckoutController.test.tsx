import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor, render, screen, fireEvent} from "@testing-library/react";
import {StrictMode, type PropsWithChildren} from "react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import type {User} from "../../firebase";
const api = vi.hoisted(() => ({call: vi.fn(), watch: vi.fn(), otp: vi.fn(), open: vi.fn(), signOut: vi.fn()}));
vi.mock("../../firebase", () => ({managePublicEventCheckout: api.call, watchPublicFormAuthState: api.watch, beginPublicEventPhoneVerification: api.otp, signOutGuestUser: api.signOut}));
vi.mock("../../shared/payments/razorpayCheckout", () => ({openRazorpayCheckout: api.open}));
vi.mock("../eventMessaging/EventSmsPreferencePanel", () => ({EventSmsPreferencePanel: () => null}));
vi.mock("../eventMessaging/EventRcsPreferencesPanel", () => ({EventRcsPreferencesPanel: () => null}));
vi.mock("../eventMessaging/EventWhatsappPreferencesPanel", () => ({EventWhatsappPreferencesPanel: () => null}));
import {organizerPaymentsNotReady, usePublicCheckoutController} from "./usePublicCheckoutController";
import {PublicPaidEventRegistration} from "./PublicPaidEventRegistration";
import {assertPublicCheckoutResponse} from "./publicCheckoutModel";
const quote = {eventId: "event1", eventName: "Morning run", registrationRevision: 1,
  startTimeMillis: 9e12, amountPaise: 10000, currency: "INR",
  cancellationPolicy: {refundDeadlineMillis: 8e12, eventStartsAtMillis: 9e12}};
const ready = {paymentId: `pp_${"b".repeat(32)}`, status: "checkoutReady", amountPaise: 10000,
  currency: "INR", mode: "test", refundedAmountPaise: 0, cancellationReason: null,
  cancellationPolicy: quote.cancellationPolicy, cancellationQuote: null, expiresAtMillis: 9e12,
  eventId: "event1", eventName: "Morning run", startTimeMillis: 9e12,
  checkout: {publicToken: "rzp_test_key", orderId: "order_one", amountPaise: 10000,
    currency: "INR", description: "Admission", expiresAtMillis: 9e12}};
const admitted = {...ready, status: "admitted", checkout: null, cancellationQuote: {refundAmountPaise: 10000}};
const admission = {eventId: "event1", attendeeId: "attendee1", status: "registered"};
const response = (payment: unknown = null, place: unknown = null) => ({quote: null, payment, admission: place, serverTimeMillis: 2000});
let auth: (user: User | null) => void;
let initial: User | null;
let client: QueryClient;
function wrapper({children}: PropsWithChildren) {
  return <StrictMode><QueryClientProvider client={client}>{children}</QueryClientProvider></StrictMode>;
}
beforeEach(() => {
  vi.resetAllMocks(); window.sessionStorage.clear();
  client = new QueryClient({defaultOptions: {mutations: {retry: false}}});
  initial = {uid: "person", phoneNumber: "+919999999999"} as User;
  api.watch.mockImplementation((callback) => {auth = callback; callback(initial); return vi.fn();});
  api.call.mockImplementation(async (input) => input.action === "find" ? response() :
    input.action === "quote" ? {...response(), quote} : input.action === "prepare" ? response(ready) : response(admitted, admission));
  api.signOut.mockImplementation(async () => auth(null));
  api.open.mockResolvedValue({paymentId: "pay_one", signature: "a".repeat(64)});
});
afterEach(() => {cleanup(); client.clear(); vi.restoreAllMocks();});
it("verifies phone before querying price or payment history", async () => {
  initial = null;
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.phase).toBe("phone"));
  expect(api.call).not.toHaveBeenCalled();
  act(() => auth({uid: "person", phoneNumber: "+919999999999"} as User));
  await waitFor(() => expect(result.current.quote).toEqual(quote));
});
it("reviews exact terms before a hold, then uses only server admission", async () => {
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  expect(api.call.mock.calls.some(([input]) => input.action === "prepare")).toBe(false);
  act(() => result.current.setName("Maya"));
  await act(async () => {await result.current.pay();});
  expect(api.call).toHaveBeenCalledWith(expect.objectContaining({action: "prepare", displayName: "Maya", reviewedQuote: quote}));
  expect(api.open).toHaveBeenCalledOnce();
  expect(result.current.admission).toEqual(admission);
  expect(window.sessionStorage.length).toBe(0);
});
// Multi-place booking (PR #1887): a quote for N places, N - 1 guest names on prepare.
const partyQuote = (places: number, member = false) => member ?
  {...quote, amountPaise: 6000 + 10000 * (places - 1), placeCount: places, unitAmountPaise: 6000, memberPlaceCount: 1, guestUnitAmountPaise: 10000, listAmountPaise: 10000} :
  {...quote, amountPaise: 10000 * places, placeCount: places, unitAmountPaise: 10000};
it("books one place without place fields or guest names, as before multi-place booking", async () => {
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  expect(api.call).toHaveBeenCalledWith({action: "quote", eventId: "event1"});
  expect(result.current.places).toBe(1);
  expect(result.current.guestNames).toEqual([]);
  act(() => result.current.setName("Maya"));
  await act(async () => {await result.current.pay();});
  const sent = api.call.mock.calls.find(([input]) => input.action === "prepare")![0];
  expect("guestNames" in sent).toBe(false);
});
it("re-quotes for the party and sends a trimmed name for each guest", async () => {
  api.call.mockImplementation(async (input) => input.action === "find" ? response() :
    input.action === "quote" ? {...response(), quote: input.placeCount ? partyQuote(input.placeCount) : quote} :
      input.action === "prepare" ? response({...ready, amountPaise: 30000, placeCount: 3, unitAmountPaise: 10000, checkout: {...ready.checkout, amountPaise: 30000}}) :
        response({...admitted, amountPaise: 30000, placeCount: 3, unitAmountPaise: 10000, cancellationQuote: {refundAmountPaise: 30000}}, {...admission, placeCount: 3}));
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  await act(async () => {await result.current.changePlaces(3);});
  expect(api.call).toHaveBeenLastCalledWith({action: "quote", eventId: "event1", placeCount: 3});
  expect(result.current.quote).toEqual(partyQuote(3));
  expect(result.current.places).toBe(3);
  expect(result.current.guestNames).toEqual(["", ""]);
  await act(async () => {await result.current.changePlaces(9);});
  expect(result.current.places).toBe(4);
  await act(async () => {await result.current.changePlaces(3);});
  act(() => result.current.setName("Maya"));
  act(() => result.current.setGuestName(0, "  Riya   Shah "));
  await act(async () => {await result.current.pay();});
  expect(api.call.mock.calls.some(([input]) => input.action === "prepare")).toBe(false);
  expect(result.current.status.message).toBe("Add a name for each guest, up to 80 characters.");
  act(() => result.current.setGuestName(1, "Arjun"));
  await act(async () => {await result.current.pay();});
  expect(api.call).toHaveBeenCalledWith(expect.objectContaining({action: "prepare", displayName: "Maya",
    guestNames: ["Riya Shah", "Arjun"], reviewedQuote: partyQuote(3)}));
  expect(result.current.admission).toEqual({...admission, placeCount: 3});
});
it("refuses a party larger than the places left and lets the guest choose fewer", async () => {
  api.call.mockImplementation(async (input) => input.action === "find" ? response() :
    input.action === "quote" ? {...response(), quote: input.placeCount ? partyQuote(input.placeCount) : quote} :
      input.action === "prepare" ? Promise.reject(Object.assign(new Error("Only 1 place is left."), {details: {reason: "notEnoughPlaces", placesLeft: 1}})) :
        response(admitted, admission));
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  await act(async () => {await result.current.changePlaces(2);});
  act(() => result.current.setName("Maya"));
  act(() => result.current.setGuestName(0, "Riya"));
  await act(async () => {await result.current.pay();});
  expect(result.current.status).toEqual({message: "Only 1 place is left. Choose fewer places.", tone: "is-error"});
  expect(result.current.placesLeft).toBe(1);
  expect(result.current.nameLocked).toBe(false);
  expect(window.sessionStorage.length).toBe(0);
  await act(async () => {await result.current.changePlaces(1);});
  expect(api.call).toHaveBeenLastCalledWith({action: "quote", eventId: "event1"});
  expect(result.current.places).toBe(1);
  expect(result.current.guestNames).toEqual([]);
});
it("replays a saved multi-place attempt with its own places and names after a reload", async () => {
  api.call.mockImplementation(async (input) => input.action === "find" ? response() :
    input.action === "quote" ? {...response(), quote: input.placeCount ? partyQuote(input.placeCount) : quote} : Promise.reject(new Error("Lost response")));
  const first = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(first.result.current.quote).toEqual(quote));
  await act(async () => {await first.result.current.changePlaces(2);});
  act(() => first.result.current.setName("Maya"));
  act(() => first.result.current.setGuestName(0, "Riya"));
  await act(async () => {await first.result.current.pay();});
  const sent = api.call.mock.calls.find(([input]) => input.action === "prepare")![0];
  first.unmount();
  const next = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(next.result.current.guestNames).toEqual(["Riya"]));
  expect(next.result.current.places).toBe(2);
  expect(next.result.current.nameLocked).toBe(true);
  await act(async () => {await next.result.current.pay();});
  expect(api.call).toHaveBeenLastCalledWith(sent);
});
it("shows the member price on the member's own place and the list price on each guest's", async () => {
  api.call.mockImplementation(async (input) => input.action === "find" ? response() :
    input.action === "quote" ? {...response(), quote: input.placeCount ? partyQuote(input.placeCount, true) : quote} : response(ready));
  render(<PublicPaidEventRegistration eventId="event1" inviteToken={null} />, {wrapper});
  fireEvent.click(await screen.findByRole("button", {name: "One more place"}));
  fireEvent.click(await screen.findByRole("button", {name: "One more place"}));
  expect(await screen.findByText("Your place, member price")).toBeTruthy();
  expect(screen.getByText("2 guest places × ₹100.00")).toBeTruthy();
  expect(screen.getByText("₹260.00")).toBeTruthy();
  expect(screen.getByRole("textbox", {name: "Guest 2’s name"})).toBeTruthy();
  expect(screen.getByRole("textbox", {name: "Guest 3’s name"})).toBeTruthy();
  expect(screen.getByRole("button", {name: "Reserve 3 places and pay ₹260.00"})).toBeTruthy();
});
it("retains request identity after a lost prepare response and across reload", async () => {
  api.call.mockImplementation(async (input) => input.action === "find" ? response() : input.action === "quote" ? {...response(), quote} : Promise.reject(new Error("Lost response")));
  const first = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(first.result.current.quote).toEqual(quote));
  act(() => first.result.current.setName("Maya"));
  await act(async () => {await first.result.current.pay();});
  const sent = api.call.mock.calls.find(([input]) => input.action === "prepare")![0];
  first.unmount();
  const next = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(next.result.current.name).toBe("Maya"));
  await act(async () => {await next.result.current.pay();});
  expect(api.call).toHaveBeenLastCalledWith(sent);
});
it("recovers an existing checkout without creating a second order", async () => {
  api.call.mockResolvedValue(response(ready));
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.payment?.paymentId).toBe(ready.paymentId));
  await act(async () => {await result.current.pay();});
  expect(api.call.mock.calls.every(([input]) => input.action === "find" || input.action === "status")).toBe(true);
});
it("discards old-account prepare before opening checkout", async () => {
  let resolve!: (value: unknown) => void;
  api.call.mockImplementation((input) => input.action === "find" ? Promise.resolve(response()) : input.action === "quote" ? Promise.resolve({...response(), quote}) : new Promise((done) => {resolve = done;}));
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  act(() => result.current.setName("Maya"));
  let paying!: Promise<void>;
  act(() => {paying = result.current.pay();});
  await waitFor(() => expect(resolve).toBeDefined());
  act(() => auth(null));
  await act(async () => {resolve(response(ready)); await paying;});
  expect(api.open).not.toHaveBeenCalled();
  expect(result.current.payment).toBeNull();
  expect(result.current.phase).toBe("phone");
});
it("requires explicit cancellation review and submits exactly its refund amount", async () => {
  api.call.mockImplementation(async (input) => input.action === "cancelAdmission" ? response({...admitted, status: "refundPending", cancellationQuote: null, cancellationReason: "guestCancelled"}) : response(admitted, admission));
  render(<PublicPaidEventRegistration eventId="event1" inviteToken={null} />, {wrapper});
  fireEvent.click(await screen.findByRole("button", {name: "Cancel my place"}));
  await screen.findByRole("heading", {name: "Cancel your place?"});
  expect(document.activeElement).toBe(screen.getByRole("button", {name: "Keep my place"}));
  expect(api.call.mock.calls.some(([input]) => input.action === "cancelAdmission")).toBe(false);
  fireEvent.click(screen.getByRole("button", {name: "Confirm cancellation"}));
  await screen.findByRole("heading", {name: "Your place is cancelled"});
  expect(api.call).toHaveBeenLastCalledWith({action: "cancelAdmission", paymentId: ready.paymentId, expectedRefundAmountPaise: 10000});
});
it("does not show admission from a paid ledger without current attendee proof", async () => {
  api.call.mockResolvedValue(response({...admitted, cancellationQuote: null}));
  render(<PublicPaidEventRegistration eventId="event1" inviteToken={null} />, {wrapper});
  await screen.findByText(/couldn’t confirm your current place/u);
  expect(screen.queryByText("You’re on the guest list")).toBeNull();
  expect(screen.queryByRole("button", {name: "Cancel my place"})).toBeNull();
});
it("rejects crossed event, provider amount, and offer-ledger response authority", () => {
  expect(() => assertPublicCheckoutResponse(response(ready), "another")).toThrow();
  expect(() => assertPublicCheckoutResponse(response({...ready, paymentId: `ep_${"a".repeat(32)}`}), "event1")).toThrow();
  expect(() => assertPublicCheckoutResponse(response({...ready, checkout: {...ready.checkout, amountPaise: 1}}), "event1")).toThrow();
  expect(() => assertPublicCheckoutResponse(response({...ready, status: "refunded", checkout: null}, admission), "event1")).toThrow();
});
it("accepts the place fields of a multi-place quote, payment and admission, and rejects ones that do not add up", () => {
  expect(() => assertPublicCheckoutResponse({...response(), quote: partyQuote(3)}, "event1")).not.toThrow();
  expect(() => assertPublicCheckoutResponse({...response(), quote: partyQuote(2, true)}, "event1")).not.toThrow();
  expect(() => assertPublicCheckoutResponse(response({...admitted, placeCount: 1, unitAmountPaise: 10000}, {...admission, placeCount: 1}), "event1")).not.toThrow();
  expect(() => assertPublicCheckoutResponse({...response(), quote: {...partyQuote(3), amountPaise: 20000}}, "event1")).toThrow();
  expect(() => assertPublicCheckoutResponse({...response(), quote: {...quote, placeCount: 1, unitAmountPaise: 10000}}, "event1")).toThrow();
  expect(() => assertPublicCheckoutResponse({...response(), quote: {...partyQuote(5)}}, "event1")).toThrow();
  expect(() => assertPublicCheckoutResponse(response({...admitted, placeCount: 2, unitAmountPaise: 10000}), "event1")).toThrow();
  expect(() => assertPublicCheckoutResponse(response(admitted, {...admission, placeCount: 0}), "event1")).toThrow();
});
it("allows an explicit new booking after an expired hold without reusing the old attempt", async () => {
  const expired = {...ready, status: "expired", checkout: null};
  api.call.mockImplementation(async (input) => input.action === "find" || input.action === "status" ? response(expired) : input.action === "quote" ? {...response(), quote} : response(ready));
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.payment?.status).toBe("expired"));
  expect(result.current.quote).toBeNull();
  window.sessionStorage.setItem('catch-public-checkout:["person","event1"]', JSON.stringify({action: "prepare", eventId: "event1", requestId: "old-request", displayName: "Maya", reviewedQuote: quote, inviteToken: null}));
  await act(async () => {await result.current.startAgain();});
  expect(result.current.quote).toEqual(quote);
  expect(result.current.previousPayment?.status).toBe("expired");
  act(() => result.current.setName("Maya"));
  await act(async () => {await result.current.pay();});
  expect(api.call.mock.calls.find(([input]) => input.action === "prepare")![0].requestId).not.toBe("old-request");
});
it("closed registration still recovers a booking but never requests a new quote", async () => {
  const {result} = renderHook(() => usePublicCheckoutController("event1", null, false), {wrapper});
  await waitFor(() => expect(result.current.phase).toBe("ready"));
  expect(result.current.quote).toBeNull();
  expect(api.call.mock.calls.every(([input]) => input.action === "find")).toBe(true);
  await act(async () => {await result.current.pay(); await result.current.startAgain();});
  expect(api.open).not.toHaveBeenCalled();
});
it("opens the specific prior payment without replacing it with the latest booking", async () => {
  api.call.mockResolvedValue(response({...ready, status: "refunded", checkout: null, refundedAmountPaise: 10000}));
  const {result} = renderHook(() => usePublicCheckoutController("event1", null, false, ready.paymentId), {wrapper});
  await waitFor(() => expect(result.current.payment?.status).toBe("refunded"));
  expect(api.call.mock.calls.every(([input]) => input.action === "status" && input.paymentId === ready.paymentId)).toBe(true);
});
it("can explicitly review changed terms after a rejected unrecorded attempt", async () => {
  let latestQuote = quote;
  api.call.mockImplementation(async (input) => input.action === "find" ? response() : input.action === "quote" ? {...response(), quote: latestQuote} : Promise.reject(new Error("Terms changed")));
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  act(() => result.current.setName("Maya"));
  await act(async () => {await result.current.pay();});
  expect(result.current.nameLocked).toBe(true);
  const original = api.call.mock.calls.find(([input]) => input.action === "prepare")![0];
  latestQuote = {...quote, registrationRevision: 2, amountPaise: 15000};
  await act(async () => {await result.current.load(true);});
  expect(result.current.nameLocked).toBe(false);
  expect(result.current.quote).toEqual(latestQuote);
  await act(async () => {await result.current.pay();});
  const attempts = api.call.mock.calls.filter(([input]) => input.action === "prepare");
  expect(attempts.at(-1)![0].requestId).not.toBe(original.requestId);
  expect(attempts.at(-1)![0].reviewedQuote.amountPaise).toBe(15000);
});
it("an invalid code does not return an already signed-in guest to checkout", async () => {
  api.otp.mockResolvedValue({clear: vi.fn(), confirm: vi.fn().mockRejectedValue(new Error("Invalid code"))});
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.phase).toBe("ready"));
  act(() => {result.current.changePhone(); result.current.setPhone("+919888888888");});
  const event = {preventDefault: vi.fn()} as unknown as Parameters<typeof result.current.sendCode>[0];
  await act(async () => {await result.current.sendCode(event);});
  act(() => result.current.setCode("123456"));
  await act(async () => {await result.current.verifyCode(event);});
  expect(result.current.phase).toBe("otp");
  expect(result.current.status.tone).toBe("is-error");
});
it("disabled session storage still allows a server-owned checkout", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {throw new Error("Storage disabled");});
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {throw new Error("Storage disabled");});
  const {result} = renderHook(() => usePublicCheckoutController("event1", null), {wrapper});
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  act(() => result.current.setName("Maya"));
  await act(async () => {await result.current.pay();});
  expect(result.current.admission).toEqual(admission);
});

it("recognises an organizer whose payment account is not ready", () => {
  expect(organizerPaymentsNotReady({code: "functions/failed-precondition",
    details: {reason: "organizerPaymentsNotReady"}})).toBe(true);
  expect(organizerPaymentsNotReady({details: {reason: "other"}})).toBe(false);
  expect(organizerPaymentsNotReady(new Error("boom"))).toBe(false);
  expect(organizerPaymentsNotReady(null)).toBe(false);
});
