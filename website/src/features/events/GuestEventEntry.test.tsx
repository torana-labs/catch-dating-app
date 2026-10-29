import {useEffect} from "react";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {GuestEventEntryView} from "./GuestEventEntry";
const transaction = vi.hoisted(() => ({mounted: vi.fn(), unmounted: vi.fn()}));
vi.mock("./PublicEventRegistration", () => ({PublicEventRegistration: ({mode}: {mode: string}) => {
  useEffect(() => {transaction.mounted(); return () => transaction.unmounted();}, []);
  return <p>{mode} transaction owner</p>;
}}));
type Controller = Parameters<typeof GuestEventEntryView>[0]["controller"];
function controller(action = "bookPaid"): Controller {
  return {user: {uid: "one", phoneNumber: "+919000000001"}, loading: false, error: false,
    viewer: {guest: {action, publicFormId: "application", runtimeId: "runtime", expiresAtMillis: 9e12}},
    pending: false, refresh: vi.fn(), changePhone: vi.fn(), changeAccount: vi.fn(),
    phone: "", code: "", codeSent: false, recaptchaId: "test-phone", message: "",
    setPhone: vi.fn(), setCode: vi.fn(), submit: vi.fn(),
  } as unknown as Controller;
}
const signedOut = (): Controller => ({...controller(), user: null, viewer: null});
function view(c: Controller, startLabel: string | null = "Book now") {
  return <GuestEventEntryView eventId="event" controller={c} startLabel={startLabel ?? undefined} />;
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("keeps one checkout in place through status polling", () => {
  const {rerender} = render(view(controller()));
  const actions = screen.getAllByRole("button", {name: "Book now"});
  expect(actions).toHaveLength(1);
  fireEvent.click(actions[0]);
  expect(transaction.mounted).toHaveBeenCalledOnce();
  rerender(view(controller("recoverPayment")));
  expect(screen.getByText("paid transaction owner")).toBeTruthy();
  expect(transaction.unmounted).not.toHaveBeenCalled();
});

it("account changes cannot retain another guest's open checkout", () => {
  const c = controller(); const {rerender} = render(view(c));
  fireEvent.click(screen.getByRole("button", {name: "Book now"}));
  rerender(view(signedOut()));
  expect(screen.queryByText("paid transaction owner")).toBeNull();
  expect(transaction.unmounted).toHaveBeenCalledOnce();
});

it("asks for a phone before any booking state, and holds while auth resolves", () => {
  const c = signedOut();
  const {rerender} = render(view(c));
  expect(screen.queryByLabelText("Mobile number")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name: "Book now"}));
  expect(screen.getByLabelText("Mobile number")).toBeTruthy();
  expect(screen.getByText("Your pass and updates come by text. No account needed.")).toBeTruthy();
  expect(transaction.mounted).not.toHaveBeenCalled();
  rerender(view({...c, loading: true}));
  expect(screen.getByRole("button", {name: "Checking your event status…"}).hasAttribute("disabled")).toBe(true);
});

it("goes straight to the checkout once a guest who started signs in", () => {
  const {rerender} = render(view(signedOut()));
  fireEvent.click(screen.getByRole("button", {name: "Book now"}));
  rerender(view(controller("registerFree")));
  expect(screen.getByText("free transaction owner")).toBeTruthy();
});

it("starts with the phone step where there is no start action", () => {
  render(view(signedOut(), null));
  expect(screen.getByLabelText("Mobile number")).toBeTruthy();
});

it("shows the code step and its error after the code is sent", () => {
  render(view({...signedOut(), codeSent: true, message: "Check your verification code and try again."}, null));
  expect(screen.getByLabelText("6-digit OTP")).toBeTruthy();
  expect(screen.getByRole("button", {name: "Verify phone"})).toBeTruthy();
  expect(screen.getByText("Check your verification code and try again.")).toBeTruthy();
});

it.each(["applicationPending", "applicationWaitlisted", "awaitingOffer", "seatWaitlisted", "closed"])("%s does not start registration", (state) => {
  render(view(controller(state)));
  expect(screen.queryByRole("button", {name: "Book now"})).toBeNull();
  expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  expect(transaction.mounted).not.toHaveBeenCalled();
});

it("confirmed guests get their issued runtime link", () => {
  render(view(controller("registered")));
  const links = screen.getAllByRole("link", {name: "Prepare for your event"});
  expect(links).toHaveLength(1);
  expect(links[0].getAttribute("href")).toBe("/join/runtime");
});
