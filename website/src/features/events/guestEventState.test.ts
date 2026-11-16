import {expect, it} from "vitest";
import {activeCommunityMemberships, guestEventState, nextGuestEventChangeMillis, parseEventGuestEntry,
  parseGuestEventStatus, type GuestEventSources} from "./guestEventState";

const now = 1_800_000_000_000;
const grant = "a".repeat(64);
const entry = (change: Record<string, unknown> = {}) => ({schemaVersion: 1, eventId: "event", organizerId: "org",
  open: true, startAtMillis: now + 3_600_000, publicFormId: null,
  registration: {guest: "bookPaid", member: "bookPaid"}, updatedAtMillis: 1, ...change});
const status = (change: Record<string, unknown> = {}) => ({schemaVersion: 1, eventId: "event", uid: "guest",
  organizerId: "org", booking: "none", ambiguous: false, runtimeId: null, publicPaymentId: null,
  paymentRecoverable: false, offerPaymentId: null, offerGrantId: null, offerExpiresAtMillis: null,
  offerAdmissible: true, offerAmbiguous: false, applicationStatus: null, updatedAtMillis: 1, ...change});
function sources(e: unknown, s: unknown, members: string[] = []): GuestEventSources {
  return {entry: parseEventGuestEntry(e), status: parseGuestEventStatus(s, "guest"), activeMemberOf: members};
}
const decide = (e: unknown, s: unknown, members: string[] = [], at = now) =>
  guestEventState(sources(e, s, members), "event", at);

it("gives a guest with no record of their own the event's registration step", () => {
  expect(decide(entry(), null)?.action).toBe("bookPaid");
  expect(decide(entry({registration: {guest: "unsupported", member: "registerFree"}}), null)?.action)
    .toBe("unsupported");
  expect(decide(entry({registration: {guest: "unsupported", member: "registerFree"}}), null, ["org"])?.action)
    .toBe("registerFree");
  expect(decide(entry({registration: {guest: "apply", member: "apply"}, publicFormId: "form"}), null))
    .toMatchObject({action: "apply", publicFormId: "form"});
});

it("closes the entry when the event starts or stops, but keeps the guest's place", () => {
  expect(decide(entry(), null, [], now + 3_600_000)?.action).toBe("closed");
  expect(decide(entry({open: false}), null)?.action).toBe("closed");
  expect(decide(entry({open: false}), status({booking: "registered", runtimeId: "run"})))
    .toMatchObject({action: "registered", runtimeId: "run"});
  expect(decide(entry(), status({paymentRecoverable: true, publicPaymentId: "pay"}), [], now + 3_600_000))
    .toMatchObject({action: "recoverPayment", publicPaymentId: "pay"});
  expect(decide(entry(), status({booking: "waitlisted"}))?.action).toBe("seatWaitlisted");
});

it("an unpublished event is unavailable unless the guest paid for it", () => {
  expect(decide(null, null)).toBeNull();
  expect(decide(null, status({applicationStatus: "submitted"}))).toBeNull();
  expect(decide(null, status({publicPaymentId: "pay"}))?.action).toBe("closed");
  expect(decide(null, status({offerPaymentId: "offer-pay"}))?.action).toBe("closed");
});

it("offers come before applications and expire by themselves", () => {
  const offered = status({offerGrantId: grant, offerExpiresAtMillis: now + 60_000, applicationStatus: "approved"});
  expect(decide(entry(), offered)).toMatchObject({action: "offer", offerGrantId: grant});
  expect(decide(entry(), {...offered, offerAdmissible: false})?.action).toBe("unsupported");
  expect(decide(entry(), offered, [], now + 60_000)).toMatchObject({action: "awaitingOffer", offerGrantId: null});
  expect(decide(entry(), status({offerPaymentId: "offer-pay", offerAdmissible: false}))?.action).toBe("offer");
  expect(decide(entry(), status({offerAmbiguous: true}))?.action).toBe("unsupported");
  expect(nextGuestEventChangeMillis(sources(entry(), offered), now)).toBe(now + 60_000);
  expect(nextGuestEventChangeMillis(sources(entry(), offered), now + 60_000)).toBe(now + 3_600_000);
});

it.each([
  ["submitted", "applicationPending"], ["inReview", "applicationPending"],
  ["waitlisted", "applicationWaitlisted"], ["declined", "declined"], ["approved", "awaitingOffer"],
  ["withdrawn", "bookPaid"],
] as const)("an application %s gives %s", (applicationStatus, action) => {
  expect(decide(entry(), status({applicationStatus}))).toMatchObject({action, applicationStatus});
});

it("an ambiguous record shows only what is certain", () => {
  expect(decide(entry(), status({ambiguous: true, applicationStatus: "submitted"})))
    .toMatchObject({action: "unavailable", applicationStatus: null});
  expect(decide(entry(), status({ambiguous: true, offerPaymentId: "offer-pay"}))?.action).toBe("offer");
  expect(decide(entry(), status({ambiguous: true, booking: "registered"}))?.action).toBe("registered");
});

it("rejects documents for another event or guest and malformed shapes", () => {
  expect(guestEventState(sources(entry({eventId: "other"}), null), "event", now)).toBeNull();
  expect(parseGuestEventStatus(status(), "someone-else")).toBeNull();
  expect(parseGuestEventStatus(status({offerGrantId: "token"}), "guest")).toBeNull();
  expect(parseEventGuestEntry(entry({registration: {guest: "offer", member: "bookPaid"}}))).toBeNull();
  expect(parseEventGuestEntry({...entry(), schemaVersion: 2})).toBeNull();
});

it("counts only active community memberships", () => {
  expect(activeCommunityMemberships({communityMemberships: {org: {state: "active"}, old: {state: "revoked"}}}))
    .toEqual(["org"]);
  expect(activeCommunityMemberships(null)).toEqual([]);
});
