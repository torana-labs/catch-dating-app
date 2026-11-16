import {expect, it} from "vitest";
import {guestEventAction as action, type GuestEventState} from "./guestEventAction";
const guest = (change: Partial<GuestEventState>): GuestEventState => ({
  action: "registered", publicFormId: null, applicationStatus: null, offerGrantId: null,
  publicPaymentId: null, runtimeId: null,
  offerPaymentId: null, ...change,
});
it.each([
  ["registerFree", "Reserve a place"], ["bookPaid", "Book now"],
  ["applicationPending", "View your status"], ["applicationWaitlisted", "View your status"],
  ["awaitingOffer", "View your status"], ["seatWaitlisted", "View your status"],
  ["declined", "View your status"], ["closed", "View your status"],
  ["unsupported", "View your status"], ["unavailable", "View your status"],
] as const)("keeps %s in its server-authorized path", (kind, label) => {
  expect(action(guest({action: kind}), "event")).toMatchObject({label});
  expect(action(guest({action: kind}), "event").href).toBeUndefined();
});
it("routes applications and offers only with their actual identifiers", () => {
  expect(action(guest({action: "apply", publicFormId: "form"}), "event").href).toBe("/f/form/");
  expect(action(guest({action: "offer", offerGrantId: "grant"}), "event").href).toBe("/offer/?grant=grant");
  expect(action(guest({action: "apply"}), "event").href).toBeUndefined();
  expect(action(guest({action: "offer"}), "event").href).toBeUndefined();
});
it("hands confirmed guests to the issued runtime and never substitutes the event id", () => {
  expect(action(guest({runtimeId: "runtime-other-id"}), "event").href).toBe("/join/runtime-other-id");
  expect(action(guest({}), "event").href).toBeUndefined();
  expect(action(guest({action: "applicationPending", runtimeId: "runtime"}), "event").href).toBeUndefined();
});
it("recovers existing payments without creating a new order", () => {
  expect(action(guest({action: "recoverPayment", publicPaymentId: "p"}), "e").href).toBe("/booking/e/?payment=p");
  expect(action(guest({action: "recoverPayment", offerPaymentId: "p"}), "e").href).toBe("/offer/?payment=p");
});
