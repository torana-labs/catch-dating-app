import {describe, expect, it} from "vitest";
import {accountExport, passPayload, requestId, splitPlans, tabFromHash, type AccountPlan} from "./accountPageModel";
import {normalizePhone, phonePattern} from "./signInModel";

const plan = (eventId: string, timing: "upcoming" | "past", startsAt: string): AccountPlan => ({eventId, eventName: eventId,
  organizerId: "o", organizerName: "O", startsAt, endsAt: null, venue: null, status: "signedUp", timing, passAvailable: timing === "upcoming"});

describe("account page model", () => {
  it("reads the tab from the fragment and falls back to Plans", () => {
    expect(tabFromHash("#messages")).toBe("messages");
    expect(tabFromHash("#privacy")).toBe("privacy");
    expect(tabFromHash("#matches")).toBe("plans");
    expect(tabFromHash("")).toBe("plans");
  });
  it("orders upcoming soonest first and keeps past newest first", () => {
    const {upcoming, past} = splitPlans([plan("late", "upcoming", "2026-12-01T00:00:00Z"),
      plan("soon", "upcoming", "2026-11-10T00:00:00Z"), plan("recent", "past", "2026-10-30T00:00:00Z"),
      plan("old", "past", "2026-09-01T00:00:00Z")]);
    expect(upcoming.map((row) => row.eventId)).toEqual(["soon", "late"]);
    expect(past.map((row) => row.eventId)).toEqual(["recent", "old"]);
  });
  it("draws the pass as the apps' catch:event-ticket payload", () => {
    expect(JSON.parse(passPayload("e1", "code.sig"))).toEqual({kind: "catch:event-ticket", v: 1, eventId: "e1", ticketCode: "code.sig"});
  });
  it("downloads only what the page read", () => {
    const file = JSON.parse(accountExport({uid: "u", accountReady: true, displayName: "Ada", phoneNumber: "+919876543210",
      dateOfBirth: null, profileRevision: 1, following: null, eventAge: null, follows: []}, new Date("2026-11-08T00:00:00Z")));
    expect(file).toEqual({exportedAt: "2026-11-08T00:00:00.000Z", account: {uid: "u", name: "Ada", phoneNumber: "+919876543210",
      dateOfBirth: null}, plans: [], following: [], reviews: [], messages: []});
  });
  it("makes 32-character request ids", () => {
    expect(requestId()).toMatch(/^[0-9a-f]{32}$/u);
    expect(requestId()).not.toBe(requestId());
  });
});

describe("sign-in phone numbers", () => {
  it("accepts a number with its country code once spaces, brackets and dashes are gone", () => {
    expect(normalizePhone("+91 (98765) 432-10")).toBe("+919876543210");
    expect(phonePattern.test(normalizePhone("+91 98765 43210"))).toBe(true);
    expect(phonePattern.test("9876543210")).toBe(false);
    expect(phonePattern.test("+0123456789")).toBe(false);
  });
});
