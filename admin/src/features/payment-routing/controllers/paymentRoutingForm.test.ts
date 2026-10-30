import {describe, expect, it} from "vitest";
import {
  confirmationsSatisfied,
  draftFromPolicy,
  replacementFromDraft,
  requiredConfirmations,
  routingDiff,
  type RoutingPolicy,
} from "./paymentRoutingForm";

const oauth = (mode: "test" | "live") => ({route: "razorpayOAuth" as const, mode,
  currency: "INR", merchantCountry: "IN"});
const policy: RoutingPolicy = {policyId: "app", organizerId: null, revision: 4,
  formFee: oauth("live"), eventAdmission: oauth("live"), hostMembership: null,
  updatedAtMillis: 1};

describe("payment routing form", () => {
  it("sets the membership route to test without touching tickets or forms", () => {
    const draft = {...draftFromPolicy(policy),
      hostMembership: {route: "razorpayOAuth" as const, mode: "test" as const}};
    expect(replacementFromDraft(policy, draft)).toEqual({action: "replace",
      organizerId: null, expectedRevision: 4, formFee: oauth("live"),
      eventAdmission: oauth("live"), hostMembership: oauth("test")});
    expect(routingDiff(policy, draft).filter((row) => row.changed)).toEqual([{
      purpose: "hostMembership", field: "Host memberships", before: "Off",
      after: "Host collects (organizer's Razorpay) · test", changed: true}]);
    expect(requiredConfirmations(policy, draft)).toEqual([]);
  });

  it("keeps an unchanged null and an unsupported route exactly as stored", () => {
    const stripe = {route: "stripeConnectDirect" as const, mode: "test" as const,
      currency: "USD", merchantCountry: "US"};
    const stored = {...policy, eventAdmission: stripe};
    const payload = replacementFromDraft(stored, draftFromPolicy(stored));
    expect(payload.eventAdmission).toEqual(stripe);
    expect(payload.hostMembership).toBeNull();
  });

  it("asks for typed confirmation before live, Route or off", () => {
    const testPolicy = {...policy, formFee: oauth("test"), eventAdmission: oauth("test")};
    const draft = {...draftFromPolicy(testPolicy),
      eventAdmission: {route: "razorpayOAuth" as const, mode: "live" as const},
      hostMembership: {route: "razorpayRoute" as const, mode: "test" as const},
      formFee: {route: "off" as const, mode: "test" as const}};
    const confirmations = requiredConfirmations(testPolicy, draft);
    expect(confirmations.map((entry) => entry.phrase)).toEqual([
      "event tickets live", "form fees off", "host memberships route"]);
    expect(confirmationsSatisfied(confirmations, {})).toBe(false);
    expect(confirmationsSatisfied(confirmations, {
      "eventAdmission.live": " Event Tickets Live ",
      "formFee.off": "form fees off",
      "hostMembership.route": "host memberships route",
    })).toBe(true);
    expect(replacementFromDraft(testPolicy, draft).formFee).toEqual({route: "disabled"});
  });

  it("warns that the first policy replaces per-connection form fees", () => {
    const empty: RoutingPolicy = {policyId: "app", organizerId: null, revision: 0,
      formFee: null, eventAdmission: null, hostMembership: null, updatedAtMillis: null};
    const draft = {...draftFromPolicy(empty),
      hostMembership: {route: "razorpayOAuth" as const, mode: "test" as const}};
    expect(routingDiff(empty, draft).find((row) => row.purpose === "formFee"))
      .toMatchObject({changed: true, after: "Off"});
    expect(requiredConfirmations(empty, draft).map((entry) => entry.phrase))
      .toEqual(["form fees off"]);
    const keep = {...draft, formFee: {route: "razorpayOAuth" as const, mode: "live" as const}};
    expect(requiredConfirmations(empty, keep).map((entry) => entry.phrase))
      .toEqual(["form fees live"]);
    expect(replacementFromDraft(empty, keep)).toMatchObject({expectedRevision: 0,
      formFee: oauth("live"), eventAdmission: null, hostMembership: oauth("test")});
  });
});
