import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {adminListCommercialTermsHandler as list,
  type OrganizerMatch} from "./adminListCommercialTerms";
import {manageCommercialTermsHandler as manage} from "./manageCommercialTerms";
import {organizerCommercialTermsId} from "./terms";
import {testCommercialTerms} from "./testFixture";

function request(data: unknown, role = "adminOwner"): CallableRequest<unknown> {
  return {data, auth: {uid: "operator", token: {[role]: true}}} as
    unknown as CallableRequest<unknown>;
}

function fixture(matches: OrganizerMatch[] = []) {
  const store = new FormPaymentTestStore();
  const db = store as unknown as FirebaseFirestore.Firestore;
  let clock = 1000;
  const searches: string[] = [];
  store.records.set("organizers/org-a", {name: "Alpha Run Club"});
  store.records.set("organizers/org-b", {name: "Beta Supper"});
  return {store, searches,
    manageDeps: {db: () => db, now: () => clock++,
      rateLimit: async () => undefined},
    listDeps: {db: () => db, rateLimit: async () => undefined,
      searchOrganizers: async (_db: unknown, query: string) => {
        searches.push(query);
        return matches;
      }}};
}

const listPlatform = {organizerId: null, organizerQuery: null};
const replacePlatform = (expectedRevision: number, rate: number) => ({
  action: "replace", organizerId: null, expectedRevision,
  terms: {...testCommercialTerms(), commission: {
    ...testCommercialTerms().commission, rateBasisPoints: rate}},
  reason: `Revision ${expectedRevision + 1}`});

test("only Finance and Admin Owner can list commercial terms", async () => {
  const deps = {...fixture().listDeps, db: () => {
    throw new Error("DB accessed");
  }};
  for (const role of ["admin", "support", "salesStaff", "finance"]) {
    await assert.rejects(list(request(listPlatform, role), deps),
      /not authorized/);
  }
});

test("an unconfigured platform lists as empty", async () => {
  const {listDeps} = fixture();
  const result = await list(request(listPlatform, "adminOwner"), listDeps);
  assert.deepEqual([result.termsId, result.platform, result.effectiveTerms,
    result.history, result.historyComplete, result.overrides,
    result.overridesComplete], ["platform", null, null, [], true, [], true]);
});

test("platform history is newest first and every override is listed",
  async () => {
    const {listDeps, manageDeps} = fixture();
    await manage(request(replacePlatform(0, 500)), manageDeps);
    await manage(request(replacePlatform(1, 450)), manageDeps);
    await manage(request({action: "replace", organizerId: "org-a",
      expectedRevision: 0, terms: {commission: {rateBasisPoints: 300}},
      reason: "Pilot rate"}), manageDeps);
    const platform = await list(request(listPlatform), listDeps);
    assert.equal(platform.platform?.revision, 2);
    assert.deepEqual(platform.history.map((entry) =>
      [entry.revision, entry.reason]), [[2, "Revision 2"], [1, "Revision 1"]]);
    assert.equal(platform.effectiveTerms?.commission.rateBasisPoints, 450);
    assert.deepEqual(platform.overrides.map((entry) =>
      [entry.organizerId, entry.organizerName, entry.revision]),
    [["org-a", "Alpha Run Club", 1]]);

    const organizer = await list(request({organizerId: "org-a",
      organizerQuery: null}), listDeps);
    assert.equal(organizer.termsId, organizerCommercialTermsId("org-a"));
    assert.equal(organizer.organizerName, "Alpha Run Club");
    assert.deepEqual(organizer.organizer?.terms,
      {commission: {rateBasisPoints: 300}});
    assert.equal(organizer.effectiveTerms?.commission.rateBasisPoints, 300);
    assert.equal(organizer.effectiveTerms?.commission.capMinor, 1_000_000);
    assert.deepEqual(organizer.history.map((entry) => entry.reason),
      ["Pilot rate"]);

    const unset = await list(request({organizerId: "org-b",
      organizerQuery: null}), listDeps);
    assert.deepEqual([unset.organizer, unset.history],
      [null, []]);
    assert.equal(unset.effectiveTerms?.commission.rateBasisPoints, 450);
  });

test("history is bounded and reports when older revisions exist",
  async () => {
    const {listDeps, manageDeps} = fixture();
    for (let revision = 0; revision < 22; revision += 1) {
      await manage(request(replacePlatform(revision, 500 + revision)),
        manageDeps);
    }
    const result = await list(request(listPlatform), listDeps);
    assert.equal(result.history.length, 20);
    assert.equal(result.history[0].revision, 22);
    assert.equal(result.historyComplete, false);
  });

test("a missing revision record fails closed instead of hiding history",
  async () => {
    const {store, listDeps, manageDeps} = fixture();
    await manage(request(replacePlatform(0, 500)), manageDeps);
    store.records.delete("commercialTermsRevisions/platform_r1");
    await assert.rejects(list(request(listPlatform), listDeps),
      /history is incomplete/);
  });

test("organizer search runs only for a real query", async () => {
  const match = {organizerId: "org-b", organizerName: "Beta Supper",
    cityName: "Mumbai"};
  const {listDeps, searches} = fixture([match]);
  assert.deepEqual((await list(request(listPlatform), listDeps))
    .organizerMatches, []);
  const found = await list(request({organizerId: null,
    organizerQuery: " beta "}), listDeps);
  assert.deepEqual([found.organizerMatches, searches], [[match], ["beta"]]);
  await assert.rejects(list(request({organizerId: null,
    organizerQuery: "  "}), listDeps), /invalid|two characters/i);
});
