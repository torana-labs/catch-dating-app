import {describe, expect, it} from "vitest";
import {accountFollows, accountPlans, accountReviews, organizerIdsOf, type AccountRow} from "./accountRows";

// The cases manageWebsiteAccount's plans, following and reviews sections were
// tested with, now read from the guest's own rows.
const now = Date.parse("2026-11-08T12:00:00.000Z");
const reply = "Thanks Ada";
const at = (iso: string) => ({toMillis: () => Date.parse(iso)});
const organizers = new Map<string, Record<string, unknown>>([
  ["run", {name: "Brindle Run Club", publicPagePath: "/organizers/brindle-run-club/"}],
  ["quiz", {name: "Quiz Night", publicPagePath: null}],
]);
const card = (organizerId: string, name: string, start: string, end: string, extra: Record<string, unknown> = {}) =>
  ({organizerId, name, startTimeMillis: Date.parse(start), endTimeMillis: Date.parse(end), status: "active", ...extra});
const status = (id: string, data: Record<string, unknown>): AccountRow => ({id, data: {uid: "guest", ...data}});

const plans: AccountRow[] = [
  status("soon_guest", {eventId: "soon", participationStatus: "signedUp",
    eventCard: card("run", "Sunday 10K", "2026-11-15T01:00:00Z", "2026-11-15T03:00:00Z", {meetingPoint: "Cubbon Park gate"})}),
  status("done_guest", {eventId: "done", participationStatus: "attended",
    eventCard: card("quiz", "Trivia", "2026-10-01T14:00:00Z", "2026-10-01T16:00:00Z")}),
  // A paid entry with no booking keeps a row but is not a plan.
  status("paid_guest", {eventId: "paid", participationStatus: null,
    eventCard: card("run", "Paid", "2026-11-20T01:00:00Z", "2026-11-20T03:00:00Z")}),
  status("hidden_guest", {eventId: "hidden", participationStatus: "signedUp", eventCard: null}),
  {id: "soon_other", data: {uid: "other", eventId: "soon", participationStatus: "signedUp",
    eventCard: card("run", "Sunday 10K", "2026-11-15T01:00:00Z", "2026-11-15T03:00:00Z")}},
];
const follows: AccountRow[] = [
  {id: "run_guest", data: {organizerId: "run", uid: "guest", status: "active", followedAt: at("2026-10-02T00:00:00Z")}},
  {id: "quiz_guest", data: {organizerId: "quiz", uid: "guest", status: "inactive", followedAt: at("2026-09-02T00:00:00Z")}},
  {id: "run_other", data: {organizerId: "run", uid: "other", status: "active", followedAt: at("2026-10-02T00:00:00Z")}},
];
const reviews: AccountRow[] = [
  {id: "r1", data: {organizerId: "quiz", eventId: "done", reviewerUserId: "guest", rating: 5, comment: "Lovely night",
    verificationStatus: "verified", moderationStatus: "published", createdAt: at("2026-10-02T09:00:00Z"),
    ownerResponse: {message: reply}}},
  {id: "r2", data: {organizerId: "run", eventId: null, reviewerUserId: "guest", rating: 4, comment: "Good",
    verificationStatus: "unverified", moderationStatus: "pending", createdAt: at("2026-10-05T09:00:00Z")}},
  {id: "r3", data: {organizerId: "run", reviewerUserId: "other", rating: 1, comment: "Not mine",
    createdAt: at("2026-10-05T09:00:00Z")}},
  {id: "r4", data: {organizerId: "run", reviewerUserId: "guest", rating: 7, comment: "Out of range"}},
];

describe("account rows", () => {
  it("names every organizer the rows mention, once", () => {
    expect(organizerIdsOf(plans, follows, reviews)).toEqual(["quiz", "run"]);
  });

  it("reads plans from the guest's own booked rows only, newest first, with pass and timing", () => {
    expect(accountPlans(plans, organizers, "guest", now).map((plan) =>
      [plan.eventId, plan.status, plan.timing, plan.passAvailable, plan.organizerName])).toEqual([
      ["soon", "signedUp", "upcoming", true, "Brindle Run Club"],
      ["done", "attended", "past", false, "Quiz Night"],
    ]);
    expect(accountPlans(plans, organizers, "guest", now)[0]).toMatchObject({venue: "Cubbon Park gate",
      startsAt: "2026-11-15T01:00:00.000Z", endsAt: "2026-11-15T03:00:00.000Z"});
  });

  it("offers no pass for a cancelled event", () => {
    const cancelled = [status("soon_guest", {eventId: "soon", participationStatus: "signedUp",
      eventCard: card("run", "Sunday 10K", "2026-11-15T01:00:00Z", "2026-11-15T03:00:00Z", {status: "cancelled"})})];
    expect(accountPlans(cancelled, organizers, "guest", now)[0].passAvailable).toBe(false);
  });

  it("lists active follows with the published page's path, or none", () => {
    expect(accountFollows(follows, organizers, "guest")).toEqual([{organizerId: "run",
      organizerName: "Brindle Run Club", path: "/organizers/brindle-run-club/", followedAt: "2026-10-02T00:00:00.000Z"}]);
    const quiz = [{id: "quiz_guest", data: {organizerId: "quiz", uid: "guest", status: "active"}}];
    expect(accountFollows(quiz, organizers, "guest")[0]).toMatchObject({path: null, followedAt: null});
    // An organizer without a public copy reads as unnamed rather than failing the page.
    expect(accountFollows(quiz, new Map(), "guest")[0].organizerName).toBe("");
  });

  it("lists the guest's own reviews with moderation and the organizer's reply", () => {
    expect(accountReviews(reviews, organizers, "guest").map((review) =>
      [review.reviewId, review.verified, review.moderationStatus, review.ownerResponse])).toEqual([
      ["r2", false, "pending", null],
      ["r1", true, "published", reply],
    ]);
  });
});
