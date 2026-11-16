import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {type PropsWithChildren} from "react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import type {User} from "../../firebase";
const api = vi.hoisted(() => ({documents: vi.fn(), watch: vi.fn(), otp: vi.fn()}));
vi.mock("../../firebase", () => ({watchGuestEventDocuments: api.documents,
  watchPublicFormAuthState: api.watch, beginPublicEventPhoneVerification: api.otp}));
import {useGuestEventController} from "./useGuestEventController";
let auth: (user: User | null) => void;
let initial: User | null;
let client: QueryClient;
type Deliver = (documents: {entry: unknown; status: unknown; bookingFacts: unknown}) => void;
let deliver: Deliver;
let fail: (error: Error) => void;
const stop = vi.fn();
const user = {uid: "one", phoneNumber: "+919000000001"} as User;
const registered = (eventId = "event1", uid = "one") => ({entry: null, bookingFacts: null, status: {
  schemaVersion: 1, eventId, uid, organizerId: "org", booking: "registered", ambiguous: false,
  runtimeId: null, publicPaymentId: null, paymentRecoverable: false, offerPaymentId: null,
  offerGrantId: null, offerExpiresAtMillis: null, offerAdmissible: true, offerAmbiguous: false,
  applicationStatus: null, updatedAtMillis: 1}});
function wrapper({children}: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  vi.resetAllMocks(); initial = user;
  client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  api.watch.mockImplementation((callback) => {auth = callback; callback(initial); return vi.fn();});
  api.documents.mockImplementation(async (_eventId: string, _uid: string, onValue: Deliver,
    onError: (error: Error) => void) => {
    deliver = onValue; fail = onError; return stop;
  });
});
afterEach(() => {cleanup(); client.clear();});
it("does not listen for guest status until phone authentication", async () => {
  initial = null;
  const {result} = renderHook(() => useGuestEventController("event1"), {wrapper});
  await waitFor(() => expect(result.current.user).toBeNull());
  expect(api.documents).not.toHaveBeenCalled();
});
it("reuses an existing phone session without OTP and follows the guest's row", async () => {
  const {result} = renderHook(() => useGuestEventController("event1"), {wrapper});
  await waitFor(() => expect(api.documents).toHaveBeenCalledWith("event1", "one", expect.any(Function),
    expect.any(Function)));
  expect(result.current.loading).toBe(true);
  act(() => deliver(registered()));
  await waitFor(() => expect(result.current.viewer?.guest.action).toBe("registered"));
  expect(result.current.loading).toBe(false);
  expect(api.otp).not.toHaveBeenCalled();
});
it("a signed-out guest stops listening and late values never populate the screen", async () => {
  const {result} = renderHook(() => useGuestEventController("event1"), {wrapper});
  await waitFor(() => expect(api.documents).toHaveBeenCalledOnce());
  const late = deliver;
  act(() => auth(null));
  expect(stop).toHaveBeenCalled();
  act(() => late(registered()));
  await new Promise((done) => setTimeout(done, 10));
  expect(result.current.viewer).toBeNull();
});
it.each(["wrong event", "another guest"])("rejects a row for %s", async (kind) => {
  const {result} = renderHook(() => useGuestEventController("event1"), {wrapper});
  await waitFor(() => expect(api.documents).toHaveBeenCalledOnce());
  act(() => deliver(kind === "wrong event" ? registered("event2") : registered("event1", "two")));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.viewer).toBeNull();
});
it("a failed listener reports an error and refresh listens again", async () => {
  const {result} = renderHook(() => useGuestEventController("event1"), {wrapper});
  await waitFor(() => expect(api.documents).toHaveBeenCalledOnce());
  act(() => fail(new Error("denied")));
  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.viewer).toBeNull();
  act(() => result.current.refresh());
  await waitFor(() => expect(api.documents).toHaveBeenCalledTimes(2));
  act(() => deliver(registered()));
  await waitFor(() => expect(result.current.viewer?.guest.action).toBe("registered"));
  expect(result.current.error).toBe(false);
});

it("lets a guest correct the phone number after requesting a code", async () => {
  initial = null;
  const clear = vi.fn();
  api.otp.mockResolvedValue({confirm: vi.fn(), clear});
  const {result} = renderHook(() => useGuestEventController("event1"), {wrapper});
  act(() => result.current.setPhone("+919000000001"));
  await act(() => result.current.submit({preventDefault: vi.fn()} as unknown as React.FormEvent));
  await waitFor(() => expect(result.current.codeSent).toBe(true));
  act(() => result.current.changePhone());
  expect(clear).toHaveBeenCalledOnce();
  expect(result.current.codeSent).toBe(false);
  expect(result.current.code).toBe("");
});
