import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {commercialTermsRecords} from "../commercialTerms/testFixture";
import {dayMillis} from "./hostTrial";
import {
  getOrganizerBillingStatusHandler,
  type BillingStatusDeps,
} from "./organizerBillingStatus";

const firstEvent = Date.UTC(2026, 9, 1, 12);

function deps(records: Record<string, Record<string, unknown>>,
  nowMillis: number): BillingStatusDeps {
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = records[`${name}/${id}`];
          return {exists: data !== undefined, data: () => data};
        },
      }),
    }),
  };
  return {
    db: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => nowMillis,
    checkRateLimit: async () => undefined,
  };
}

const organizer = {"organizers/org": {ownerUserId: "owner",
  hostUserIds: ["owner", "manager"]}};
const facts = {"organizerGrowthFacts/org": {milestones: {
  firstEventAt: Timestamp.fromMillis(firstEvent), firstPaidBookingAt: null}}};

const request = (uid: string) => ({auth: {uid}, data: {organizerId: "org"}}) as
  unknown as CallableRequest<unknown>;

test("the owner sees days left in the free trial", async () => {
  const result = await getOrganizerBillingStatusHandler(request("owner"),
    deps({...organizer, ...facts, ...commercialTermsRecords()},
      firstEvent + 18 * dayMillis + 5));
  assert.deepEqual(result, {organizerId: "org", trial: {state: "active",
    anchor: "firstEvent", days: 30, startsAtMillis: firstEvent,
    endsAtMillis: firstEvent + 30 * dayMillis, daysLeft: 12},
  plan: {plan: "ticketing", status: "none", startsAtMillis: null,
    endsAtMillis: null}});
});

test("the response carries status only, no prices", async () => {
  const result = await getOrganizerBillingStatusHandler(request("owner"),
    deps({...organizer, ...facts, ...commercialTermsRecords()},
      firstEvent + 40 * dayMillis));
  assert.equal(result.trial.state, "ended");
  const json = JSON.stringify(result);
  for (const price of ["feeMinor", "capMinor", "rateBasisPoints", "Minor"]) {
    assert.ok(!json.includes(price), price);
  }
});

test("without platform terms the trial is unconfigured", async () => {
  const result = await getOrganizerBillingStatusHandler(request("owner"),
    deps({...organizer, ...facts, ...commercialTermsRecords({platform: null})},
      firstEvent));
  assert.equal(result.trial.state, "unconfigured");
});

test("a manager cannot read the owner's billing", async () => {
  await assert.rejects(getOrganizerBillingStatusHandler(request("manager"),
    deps({...organizer, ...facts}, firstEvent)), {code: "permission-denied"});
});
