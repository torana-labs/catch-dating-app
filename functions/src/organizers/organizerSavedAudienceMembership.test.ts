import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {Timestamp} from "firebase-admin/firestore";
import type {OrganizerSavedAudienceDocument} from
  "../shared/generated/firestoreAdminTypes";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import {staticAudienceMembers, savedAudienceSpendMatches} from
  "./organizerSavedAudienceMembership";
import {resolveOrganizerAudienceMembersHandler,
  canonicalSavedAudienceDefinition} from "./organizerSavedAudiences";

type Predicate =
  OrganizerSavedAudienceDocument["definition"]["predicates"][number];
const now = Date.UTC(2026, 8, 3);
const day = 86400000;
const contact = (uid: string) => ({organizerId: "org", linkedUid: uid,
  identityState: "verified", identityConfidence: "verified", deletedAt: null,
  hiddenAt: null, mergedIntoContactId: null, displayName: "Ada",
  displayNameOverride: null});
const payment = (overrides: Record<string, unknown> = {}) => ({
  eventId: "event", userId: "uid", currency: "INR", amountMinor: 10000,
  amount: 10000, status: "completed", signUpFailed: false,
  createdAt: Timestamp.fromMillis(now - 100 * day),
  completedAt: Timestamp.fromMillis(now - day), ...overrides,
});
const spend = (overrides: Record<string, unknown> = {}) => ({kind: "spend",
  operator: "atLeast", currency: "INR", amountMinor: 10000, withinDays: 30,
  ...overrides}) as Extract<Predicate, {kind: "spend"}>;
function store() {
  return new AudienceTestStore({
    "events/event": {organizerId: "org"},
    "events/legacy": {organizerId: "org"},
    "events/foreign": {organizerId: "foreign"},
    "organizerContacts/person": contact("uid"),
    "organizerContacts/no-spend": contact("no-spend"),
    "organizerContacts/unverified": {...contact("unverified"),
      identityState: "unverified", identityConfidence: "unverified"},
    "payments/completed": payment(),
  });
}
async function matching(db: AudienceTestStore, predicate = spend()) {
  const result = await savedAudienceSpendMatches({db: db.asFirestore(),
    organizerId: "org", predicates: [predicate], nowMillis: now});
  return [...result.get(JSON.stringify(predicate))!].sort();
}

test("spend uses completion time, current refunds, currency and ownership",
  async () => {
    const db = store();
    for (const [id, values] of Object.entries({
      refunded: {status: "refunded"}, failed: {signUpFailed: true},
      pending: {status: "pending"}, future: {completedAt:
        Timestamp.fromMillis(now + 1)},
      old: {completedAt: Timestamp.fromMillis(now - 31 * day)},
      dollars: {currency: "USD"}, foreign: {eventId: "foreign"},
    })) db.docs[`payments/${id}`] = payment(values);
    assert.deepEqual(await matching(db, spend({amountMinor: 10001})), []);
    assert.deepEqual(await matching(db), ["person"]);
    assert.deepEqual(await matching(db, spend({currency: "USD"})), ["person"]);
    assert.deepEqual(await matching(db, spend({withinDays: null,
      amountMinor: 20000})), ["person"]);
    db.docs["payments/completed"].status = "refunded";
    assert.deepEqual(await matching(db), []);
  });

test("zero spend is known only for unique verified identities", async () => {
  const db = store();
  assert.deepEqual(await matching(db, spend({operator: "atMost",
    amountMinor: 0})), ["no-spend"]);
  db.docs["organizerContacts/duplicate"] = {...contact("uid"),
    identityState: "ambiguous"};
  assert.deepEqual(await matching(db), []);
});

test("window boundary and legacy organizer ownership are included exactly",
  async () => {
    const db = store();
    db.docs["payments/completed"] = payment({eventId: "legacy",
      completedAt: Timestamp.fromMillis(now - 30 * day)});
    assert.deepEqual(await matching(db), ["person"]);
  });

test("over-limit payments never produce an exact spend audience", async () => {
  const db = store();
  for (let i = 0; i < 5001; i++) db.docs[`payments/extra-${i}`] = payment();
  await assert.rejects(matching(db), {code: "resource-exhausted"});
});

test("static lists follow merges, exclude deleted people and keep empty lists",
  async () => {
    const db = store();
    db.docs["organizerContacts/old"] = {...contact("uid"),
      identityState: "merged", mergedIntoContactId: "person"};
    db.docs["organizerContacts/deleted"] = {...contact("gone"),
      deletedAt: Timestamp.now()};
    const members = await staticAudienceMembers(db.asFirestore(), "org",
      ["old", "person", "deleted"], false);
    assert.deepEqual([...members], ["person"]);
    assert.equal((await staticAudienceMembers(db.asFirestore(), "org",
      [], true)).size, 0);
    await assert.rejects(staticAudienceMembers(db.asFirestore(), "org",
      ["deleted"], true), {code: "failed-precondition"});
  });

test("static lists reject foreign identities, cycles and mixed rules",
  async () => {
    const db = store();
    db.docs["organizerContacts/foreign"] = {...contact("other"),
      organizerId: "foreign"};
    await assert.rejects(staticAudienceMembers(db.asFirestore(), "org",
      ["foreign"], true), {code: "not-found"});
    db.docs["organizerContacts/a"] = {...contact("a"),
      mergedIntoContactId: "b"};
    db.docs["organizerContacts/b"] = {...contact("b"),
      mergedIntoContactId: "a"};
    await assert.rejects(staticAudienceMembers(db.asFirestore(), "org",
      ["a"], false), /cycle/);
    assert.throws(() => canonicalSavedAudienceDefinition({join: "all",
      predicates: [{kind: "staticMembers", contactIds: ["person"]}, spend()]}),
    {code: "invalid-argument"});
    assert.deepEqual(canonicalSavedAudienceDefinition({join: "all",
      predicates: [{kind: "staticMembers", contactIds: ["b", "a"]}]}),
    {join: "all",
      predicates: [{kind: "staticMembers", contactIds: ["a", "b"]}]});
  });

test("selected resolution authorizes and hides missing data", async () => {
  const db = store();
  db.docs["organizers/org"] = {ownerUserId: "manager",
    hostUserIds: ["manager"], hostProfiles: []};
  const request = {auth: {uid: "manager"}, data: {organizerId: "org",
    contactIds: ["person", "missing"]}} as CallableRequest<unknown>;
  const deps = {firestore: () => db.asFirestore(),
    checkRateLimit: async () => undefined, now: () => Timestamp.now()};
  const result = await resolveOrganizerAudienceMembersHandler(request, deps);
  assert.deepEqual(result.members, [
    {selectedContactId: "person", contactId: "person", displayName: "Ada",
      available: true},
    {selectedContactId: "missing", contactId: null, displayName: null,
      available: false},
  ]);
  await assert.rejects(resolveOrganizerAudienceMembersHandler({...request,
    auth: {uid: "stranger"}} as CallableRequest<unknown>, deps),
  {code: "permission-denied"});
});
