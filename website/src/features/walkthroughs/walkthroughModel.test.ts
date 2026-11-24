import {describe, expect, it} from "vitest";
import {
  newWalkthroughRequest,
  readWalkthroughManageLink,
  walkthroughIndiaTime,
  walkthroughLocalTime,
  walkthroughManageHref,
  walkthroughProblemFor,
} from "./walkthroughModel";

const bookingId = `wt-${"c3".repeat(20)}`;

describe("walkthrough model", () => {
  it("makes a request id and manage token inside the booking contract's patterns, fresh each time", () => {
    const first = newWalkthroughRequest();
    const second = newWalkthroughRequest();
    expect(first.requestId).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/u);
    expect(first.manageToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(second.requestId).not.toBe(first.requestId);
    expect(second.manageToken).not.toBe(first.manageToken);
  });

  it("reads a slot in India time and on the visitor's clock, with the day when it differs", () => {
    expect(walkthroughIndiaTime("2026-11-23T10:30:00.000Z")).toBe("4:00 PM");
    expect(walkthroughLocalTime("2026-11-23T10:30:00.000Z", "Asia/Kolkata")).toBeNull();
    expect(walkthroughLocalTime("2026-11-23T10:30:00.000Z", "Asia/Calcutta")).toBeNull();
    expect(walkthroughLocalTime("2026-11-23T10:30:00.000Z", null)).toBeNull();
    expect(walkthroughLocalTime("2026-11-23T10:30:00.000Z", "Asia/Dubai")).toBe("2:30 PM");
    expect(walkthroughLocalTime("2026-11-23T04:30:00.000Z", "America/Los_Angeles")).toBe("Sun 22 Nov, 8:30 PM");
    expect(walkthroughLocalTime("2026-11-23T04:30:00.000Z", "Not/AZone")).toBeNull();
  });

  it("puts the manage token in the link's fragment and reads both back", () => {
    const href = walkthroughManageHref(`/start/walkthrough/manage?booking=${bookingId}`, "T".repeat(43));
    expect(href).toBe(`/start/walkthrough/manage?booking=${bookingId}#t=${"T".repeat(43)}`);
    const url = new URL(href, "https://site.example");
    expect(readWalkthroughManageLink(url.search, url.hash)).toEqual({bookingId, manageToken: "T".repeat(43)});
    expect(readWalkthroughManageLink("?booking=nope", "#t=short")).toEqual({bookingId: null, manageToken: null});
    expect(readWalkthroughManageLink(`?booking=${bookingId}`, "")).toEqual({bookingId, manageToken: null});
  });

  it("names a refusal by its reason first, then its code", () => {
    const refusal = (code: string, details?: object, name = "FirebaseError", message = code) => Object.assign(new Error(message), {code, details, name});
    expect(walkthroughProblemFor(refusal("functions/already-exists", {reason: "slot_taken"}))).toEqual({problem: "slot_taken", managePath: null});
    expect(walkthroughProblemFor(refusal("functions/failed-precondition", {reason: "has_upcoming_booking", managePath: "/start/walkthrough/manage?booking=x"})))
      .toEqual({problem: "has_upcoming_booking", managePath: "/start/walkthrough/manage?booking=x"});
    expect(walkthroughProblemFor(refusal("functions/unauthenticated", {reason: "phone_unverified"})).problem).toBe("phone");
    expect(walkthroughProblemFor(refusal("functions/resource-exhausted")).problem).toBe("rate_limited");
    expect(walkthroughProblemFor(refusal("functions/internal", undefined, "FirebaseError", "internal")).problem).toBe("offline");
    expect(walkthroughProblemFor(Object.assign(new Error("App Check could not start"), {name: "AppCheckDeadlineError"})).problem).toBe("app_check");
    expect(walkthroughProblemFor(new Error("Walkthrough bookings are not configured for this build.")).problem).toBe("not_configured");
    expect(walkthroughProblemFor("nope").problem).toBe("failed");
  });
});
