/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../../shared/testing/fakeFirestore";
import {
  SHADOW_PROFILE_POLICY,
  anySourceEnabled,
  sourceEnabled,
  type ShadowProfilePolicy,
} from "./policy";
import {e164, enabledEntries, entryKey} from "./store";
import {salesRelationshipPhones, syncObservations} from "./sync";
import {
  findClaimableOrganizersHandler,
  organizerPrefill,
  phoneMatchEvidence,
} from "./find";

const ON: ShadowProfilePolicy = {enabled: true, decisionId: "test-decision",
  sources: {self_verified_submitter: true, sales_crm_verified: true,
    public_page: false, staff_entered: true}};
const hash = async (phone: string) => e164(phone) ? `lead-${e164(phone)?.slice(1)}` : null;
const db = (seed = {}) => new FakeFirestore(seed) as unknown as FirebaseFirestore.Firestore;
const NOW = new Date("2026-11-20T12:00:00.000Z");

test("everything ships switched off", () => {
  assert.equal(SHADOW_PROFILE_POLICY.enabled, false);
  assert.ok(Object.values(SHADOW_PROFILE_POLICY.sources).every((on) => on === false));
  assert.equal(anySourceEnabled(), false);
  assert.throws(() => sourceEnabled("public_page", {...ON, decisionId: null}),
    /shadow_profile_policy_not_ready/);
});

test("phones normalise to E.164 or nothing", () => {
  assert.equal(e164(" +91 98765-43210 "), "+919876543210");
  assert.equal(e164("0044 20 7946 0000"), "+442079460000");
  assert.equal(e164("98765 43210"), null);
  assert.equal(e164(42), null);
});

test("sales relationships split verified and staff-entered phones", () => {
  const observations = salesRelationshipPhones({organizerId: "org-lantern", endpoints: [
    {kind: "phone", value: "+919000000001", verificationStatus: "verified"},
    {kind: "phone", value: "+919000000002", verificationStatus: "unverified"},
    {kind: "email", value: "host@example.com", verificationStatus: "verified"},
  ]});
  assert.deepEqual(observations, [
    {organizerId: "org-lantern", source: "sales_crm_verified", phones: ["+919000000001"]},
    {organizerId: "org-lantern", source: "staff_entered", phones: ["+919000000002"]},
  ]);
});

test("sync writes nothing while off, then adds and removes entries", async () => {
  const store = db();
  const before = salesRelationshipPhones({organizerId: "org-lantern", endpoints: [
    {kind: "phone", value: "+919000000001", verificationStatus: "verified"}]});
  const after = salesRelationshipPhones({organizerId: "org-lantern", endpoints: [
    {kind: "phone", value: "+919000000009", verificationStatus: "verified"}]});
  assert.equal(await syncObservations(store, [], before, NOW, {hash}), 0);
  assert.equal(await syncObservations(store, [], before, NOW, {hash, policy: ON}), 1);
  const first = (await store.collection("organizerPhoneLeads").doc("lead-919000000001").get()).data();
  assert.deepEqual(first?.entries[entryKey("org-lantern", "sales_crm_verified")],
    {organizerId: "org-lantern", source: "sales_crm_verified", strength: "strong",
      lastSeenAt: NOW.toISOString()});
  assert.equal(JSON.stringify(first).includes("919000000001\""), false, "no raw phone stored");
  await syncObservations(store, before, after, NOW, {hash, policy: ON});
  const moved = (await store.collection("organizerPhoneLeads").doc("lead-919000000001").get()).data();
  assert.deepEqual(moved?.entries, {});
  const added = (await store.collection("organizerPhoneLeads").doc("lead-919000000009").get()).data();
  assert.ok(added?.entries[entryKey("org-lantern", "sales_crm_verified")]);
});

test("entries from sources that are off are ignored", () => {
  const entries = enabledEntries({entries: {
    a: {organizerId: "org-a", source: "public_page", strength: "weak", lastSeenAt: "x"},
    b: {organizerId: "org-b", source: "staff_entered", strength: "medium", lastSeenAt: "x"},
    c: {organizerId: "org-c", source: "sales_crm_verified", strength: "strong", lastSeenAt: "x"},
  }}, ON);
  assert.deepEqual(entries.map((entry) => entry.organizerId), ["org-c", "org-b"]);
});

test("prefill lists what onboarding still has to ask", () => {
  const result = organizerPrefill({name: "Lantern Social Club", description: "",
    locationMarketId: "in-indore", cityName: "Indore", organizerType: "social",
    tags: ["run"], publicPage: {publishStatus: "draft", canonicalPath: "/organizers/x/"}} as never);
  assert.deepEqual(result.filled, ["name", "city", "organizerType"]);
  assert.deepEqual(result.missing, ["description", "photo", "instagramHandle"]);
  assert.equal(result.prefill.canonicalPath, null, "an unpublished path stays private");
});

function request(phone: string | null) {
  return {auth: {uid: "user-1", token: phone ? {phone_number: phone} : {}}, data: {}} as never;
}

const leadSeed = {
  "organizerPhoneLeads/lead-919000000001": {schemaVersion: 1, updatedAt: "x", entries: {
    [entryKey("org-open", "sales_crm_verified")]: {organizerId: "org-open",
      source: "sales_crm_verified", strength: "strong", lastSeenAt: "x"},
    [entryKey("org-owned", "staff_entered")]: {organizerId: "org-owned",
      source: "staff_entered", strength: "medium", lastSeenAt: "x"},
    [entryKey("org-other-pending", "staff_entered")]: {organizerId: "org-other-pending",
      source: "staff_entered", strength: "medium", lastSeenAt: "x"},
  }},
  "organizers/org-open": {name: "Lantern Social Club", status: "active",
    claim: {state: "unclaimed"}, locationMarketId: "in-indore"},
  "organizers/org-owned": {name: "Ember Supper Club", status: "active",
    ownerUserId: "someone", claim: {state: "claimed"}},
  "organizers/org-other-pending": {name: "Driftwood Runs", status: "active",
    claim: {state: "claimPending", lastClaimRequestId: "org-other-pending_someone"}},
};

test("find answers off, then only claimable organizers with a prefill", async () => {
  const off = await findClaimableOrganizersHandler(request("+919000000001"),
    {firestore: () => db(leadSeed)});
  assert.deepEqual(off, {enabled: false, candidates: []});
  await assert.rejects(findClaimableOrganizersHandler(request(null),
    {firestore: () => db(leadSeed), policy: ON}), /Confirm your phone/);
  const on = await findClaimableOrganizersHandler(request("+919000000001"), {
    firestore: () => db(leadSeed), policy: ON, leadId: hash,
    suppressionKeys: async () => []});
  assert.equal(on.enabled, true);
  assert.deepEqual(on.candidates.map((item) => item.organizerId), ["org-open"]);
  assert.deepEqual(on.candidates[0].sources, ["sales_crm_verified"]);
  assert.equal(on.candidates[0].prefill.name, "Lantern Social Club");
  assert.equal(JSON.stringify(on).includes("919000000001"), false, "never echoes the phone");
});

test("a claim records phone-match evidence only for a matching organizer", async () => {
  const store = db(leadSeed);
  const reader = {get: (ref: FirebaseFirestore.DocumentReference) => ref.get()};
  assert.equal(await phoneMatchEvidence(reader, store, {phone: "+919000000001",
    organizerId: "org-open"}), null, "off by default");
  assert.deepEqual(await phoneMatchEvidence(reader, store, {phone: "+919000000001",
    organizerId: "org-open", policy: ON, leadId: hash}),
  {kind: "phone_match", sources: ["sales_crm_verified"], strength: "strong"});
  assert.equal(await phoneMatchEvidence(reader, store, {phone: "+919000000001",
    organizerId: "org-elsewhere", policy: ON, leadId: hash}), null);
});
