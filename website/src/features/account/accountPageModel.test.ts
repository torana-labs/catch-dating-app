import {describe, expect, it} from "vitest";
import {accountExport, passPayload, requestId, splitPlans, tabFromHash, type AccountPlan} from "./accountPageModel";
import {emailLinkReturnUrl, isMarkedEmailLinkReturn, withoutEmailLinkParams} from "./signInModel";

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

describe("sign-in email links", () => {
  it("returns to the same page, marked, without stale link parameters", () => {
    const url = new URL(emailLinkReturnUrl("https://site.example/organizers/run/?ref=ig&oobCode=old#reviews"));
    expect(url.pathname).toBe("/organizers/run/");
    expect(url.searchParams.get("ref")).toBe("ig");
    expect(url.searchParams.get("oobCode")).toBeNull();
    expect(url.searchParams.get("catchSignIn")).toBe("1");
    expect(url.hash).toBe("");
  });
  it("recognises only this sheet's links, directly or through continueUrl", () => {
    expect(isMarkedEmailLinkReturn("https://site.example/a/?catchSignIn=1&oobCode=x&mode=signIn")).toBe(true);
    expect(isMarkedEmailLinkReturn(`https://site.example/a/?oobCode=x&continueUrl=${encodeURIComponent("https://site.example/a/?catchSignIn=1")}`)).toBe(true);
    expect(isMarkedEmailLinkReturn("https://site.example/f/form/?oobCode=x&mode=signIn")).toBe(false);
  });
  it("strips the one-time parameters after sign-in", () => {
    expect(withoutEmailLinkParams("https://site.example/a/?ref=ig&catchSignIn=1&oobCode=x&apiKey=k&mode=signIn&lang=en#top"))
      .toBe("/a/?ref=ig#top");
  });
});
