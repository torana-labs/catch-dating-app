import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {
  hashedEmail,
  hashedPhone,
  sha256Hex,
} from "../adConversions/hostConversions";
import {adMatchingOptOutId} from "../adMatching/optOuts";
import {
  type AuthFacts,
  type HostAudienceDeps,
  audienceMode,
  runHostAudienceSync,
} from "./hostAudience";
import {META_AD_ACCOUNT_ID, replaceMetaAudience} from "./metaAudience";

const now = Date.parse("2026-11-19T00:00:00Z");
const day = 24 * 60 * 60 * 1000;
const at = (millis: number) => Timestamp.fromMillis(millis);
const owned = (uid: string, extra: Record<string, unknown> = {}) => ({
  ownership: {state: "claimed", ownerUserId: uid}, ...extra});
const facts = (firstEventAt: number | null) => ({
  milestones: {firstEventAt: firstEventAt === null ? null : at(firstEventAt)},
});

type Host = [string, Record<string, unknown>, Record<string, unknown>];

/** Every exclusion the list applies, plus one host who qualifies. */
function world(): Record<string, Record<string, unknown>> {
  const hosts: Host[] = [
    ["ok", owned("host-ok"), {phoneNumber: "+919876543210",
      email: "Host@Example.com", gender: "woman", dateOfBirth: at(0)}],
    ["ok-second", owned("host-ok"), {}],
    ["programmatic", {ownership: {state: "programmatic",
      ownerUserId: "host-x"}}, {}],
    ["synthetic", owned("host-x", {synthetic: true}), {}],
    ["demo", owned("host-x", {demoOpsId: "demo-1"}), {}],
    ["deleted", owned("host-deleted"), {phoneNumber: "",
      deletedAt: at(now - day)}],
    ["no-auth", owned("host-no-auth"), {phoneNumber: "+919800000001"}],
    ["staff-claim", owned("host-staff"), {phoneNumber: "+919800000002"}],
    ["staff-role", owned("host-role"), {phoneNumber: "+919800000003"}],
    ["test", owned("host-test"), {phoneNumber: "+919800000004",
      seedPrefix: "qa"}],
    ["banned", owned("host-banned"), {phoneNumber: "+919800000005"}],
    ["disabled", owned("host-disabled"), {phoneNumber: "+919800000006"}],
    ["minor", owned("host-minor"), {phoneNumber: "+919800000007",
      dateOfBirth: at(now - 16 * 365 * day)}],
    ["opted-phone", owned("host-opt-phone"), {phoneNumber: "+919800000008",
      email: "phone-opt@example.com"}],
    ["opted-email", owned("host-opt-email"), {phoneNumber: "+919800000009",
      email: "Opted@Example.com"}],
    ["no-contact", owned("host-silent"), {phoneNumber: "", email: ""}],
  ];
  const seed: Record<string, Record<string, unknown>> = {
    "organizerGrowthFacts/not-yet": facts(null),
    "organizers/not-yet": owned("host-later"),
    "users/host-later": {phoneNumber: "+919800000010"},
    "accountSafetyStates/host-banned": {level: "banned"},
    "adminRoleAssignments/host-role": {status: "active", roles: ["support"]},
    [`adMatchingOptOuts/${adMatchingOptOutId("phone",
      hashedPhone("+919800000008")!)}`]: {status: "active"},
    [`adMatchingOptOuts/${adMatchingOptOutId("email",
      hashedEmail("opted@example.com")!)}`]: {status: "active"},
  };
  hosts.forEach(([organizerId, organizer, user], index) => {
    seed[`organizerGrowthFacts/${organizerId}`] =
      facts(now - (index + 1) * day);
    seed[`organizers/${organizerId}`] = organizer;
    const uid = (organizer.ownership as {ownerUserId: string}).ownerUserId;
    if (Object.keys(user).length) seed[`users/${uid}`] = user;
  });
  return seed;
}

const authFacts = async (uids: string[]) => new Map<string, AuthFacts>(
  uids.filter((uid) => uid !== "host-no-auth").map((uid) => [uid, {
    disabled: uid === "host-disabled", staff: uid === "host-staff"}]));

interface Call {method: string; url: string; body: Record<string, unknown>}

function graph(responses: (call: Call) => {status?: number; body: unknown}) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call = {method: String(init.method), url: String(url),
      body: init.body ? JSON.parse(String(init.body)) : {}};
    calls.push(call);
    const response = responses(call);
    return new Response(JSON.stringify(response.body),
      {status: response.status ?? 200});
  }) as unknown as typeof fetch;
  return {calls, fetchImpl};
}

function deps(db: FakeFirestore, fetchImpl: typeof fetch,
  extra: Partial<HostAudienceDeps> = {}): HostAudienceDeps {
  return {db: db as never, mode: "live", now: () => now,
    token: async () => "synthetic-meta-token", authFacts, fetch: fetchImpl,
    ...extra};
}

const created = (call: Call) => {
  if (call.method === "GET") return {body: {data: []}};
  if (call.url.endsWith("/customaudiences")) {
    return {body: {id: "120000000000001"}};
  }
  return {body: {num_received: 1, num_invalid_entries: 0}};
};

test("the mode defaults to off, and off reads, sends and writes nothing",
  async () => {
    assert.equal(audienceMode(""), "off");
    assert.equal(audienceMode("on"), "off");
    assert.equal(audienceMode("LIVE"), "off");
    assert.equal(audienceMode("live"), "live");
    const db = new FakeFirestore(world());
    const before = db.docs.size;
    const {calls, fetchImpl} = graph(created);
    assert.equal(await runHostAudienceSync(deps(db, fetchImpl,
      {mode: "off"})), null);
    assert.deepEqual(calls, []);
    assert.equal(db.docs.size, before);
  });

test("only real, adult, consenting hosts with a booked event are uploaded, " +
  "replacing the list whole", async () => {
  const db = new FakeFirestore(world());
  const {calls, fetchImpl} = graph(created);
  const receipt = await runHostAudienceSync(deps(db, fetchImpl));
  assert.ok(receipt);
  assert.deepEqual(calls.map((call) => `${call.method} ${new URL(call.url)
    .pathname}`), [
    `GET /v26.0/act_${META_AD_ACCOUNT_ID}/customaudiences`,
    `POST /v26.0/act_${META_AD_ACCOUNT_ID}/customaudiences`,
    "POST /v26.0/120000000000001/usersreplace",
  ]);
  assert.deepEqual(calls[1].body, {name: "Catch | Active hosts",
    description: calls[1].body.description, subtype: "CUSTOM",
    customer_file_source: "USER_PROVIDED_ONLY"});
  const replace = calls[2].body as {
    session: Record<string, unknown>;
    payload: {schema: string[]; data: string[][]};
  };
  assert.deepEqual(replace.payload.schema, ["EMAIL", "PHONE"]);
  // One row for the host who owns two qualifying organizers: email hashed
  // trimmed and lowercased, phone hashed as Meta's digits-only form.
  assert.deepEqual(replace.payload.data, [[hashedEmail("host@example.com"),
    sha256Hex("919876543210")]]);
  assert.equal(replace.session.batch_seq, 1);
  assert.equal(replace.session.last_batch_flag, true);
  assert.equal(replace.session.estimated_num_total, 1);
  assert.equal(receipt.status, "replaced");
  assert.equal(receipt.platformAudienceId, "120000000000001");
  assert.equal(receipt.candidates, 16);
  assert.equal(receipt.members, 1);
  assert.equal(receipt.uploaded, 1);
  assert.deepEqual(receipt.excluded, {notOwned: 3, deleted: 2, staff: 2,
    test: 1, restricted: 2, underAge: 1, optedOut: 2, noContact: 1});
  // The stored receipt holds counts, never a contact or digest.
  const stored = JSON.stringify(db.getDoc("adAudienceRuns/meta_active_hosts"));
  for (const raw of ["+9198", "9876543210", "example.com",
    hashedEmail("host@example.com")!, sha256Hex("919876543210"), "host-"]) {
    assert.equal(stored.includes(raw), false, raw);
  }
  // Nothing about gender or age reaches the platform.
  assert.equal(JSON.stringify(calls).includes("woman"), false);
});

test("an existing audience is found by name; no qualifying host deletes it",
  async () => {
    const db = new FakeFirestore({
      "organizerGrowthFacts/org-1": facts(now - day),
      "organizers/org-1": owned("host-1"),
      "users/host-1": {phoneNumber: "+919876543210"},
      [`adMatchingOptOuts/${adMatchingOptOutId("phone",
        hashedPhone("+919876543210")!)}`]: {status: "active"},
    });
    const {calls, fetchImpl} = graph((call) => call.method === "GET" ?
      {body: {data: [{id: "120000000000009", name: "Catch | Active hosts"}]}} :
      {body: {success: true}});
    const receipt = await runHostAudienceSync(deps(db, fetchImpl));
    assert.deepEqual(calls.map((call) => call.method), ["GET", "DELETE"]);
    assert.ok(calls[1].url.endsWith("/120000000000009"));
    assert.equal(receipt?.status, "emptied");
    assert.equal(receipt?.members, 0);
    assert.equal(receipt?.excluded.optedOut, 1);
  });

test("switched off, a list an earlier live run left is deleted once",
  async () => {
    const db = new FakeFirestore({
      "adAudienceRuns/meta_active_hosts": {platformAudienceId:
        "120000000000009", status: "replaced"},
    });
    const {calls, fetchImpl} = graph(() => ({body: {success: true}}));
    const receipt = await runHostAudienceSync(deps(db, fetchImpl,
      {mode: "off"}));
    assert.deepEqual(calls.map((call) => call.method), ["DELETE"]);
    assert.ok(calls[0].url.endsWith("/120000000000009"));
    assert.equal(receipt?.status, "emptied");
    assert.equal(receipt?.outcome, "switched_off");
    assert.equal(receipt?.platformAudienceId, null);
    calls.length = 0;
    assert.equal(await runHostAudienceSync(deps(db, fetchImpl,
      {mode: "off"})), null);
    assert.deepEqual(calls, []);
  });

test("a host opted out by the organizer email is left out, though the " +
  "account email would be uploaded", async () => {
  const db = new FakeFirestore({
    "organizerGrowthFacts/org-1": facts(now - day),
    "organizers/org-1": owned("host-1", {email: "club@example.com"}),
    "users/host-1": {email: "me@example.com"},
    [`adMatchingOptOuts/${adMatchingOptOutId("email",
      hashedEmail("club@example.com")!)}`]: {status: "active"},
  });
  const {calls, fetchImpl} = graph(() => ({body: {data: []}}));
  const receipt = await runHostAudienceSync(deps(db, fetchImpl));
  assert.equal(receipt?.members, 0);
  assert.equal(receipt?.excluded.optedOut, 1);
  assert.ok(calls.every((call) => !call.url.includes("usersreplace")));
});

test("a refused replace is recorded as failed with Meta's status", async () => {
  const db = new FakeFirestore(world());
  const {fetchImpl} = graph((call) => call.url.includes("usersreplace") ?
    {status: 400, body: {error: {code: 2650}}} : created(call));
  const receipt = await runHostAudienceSync(deps(db, fetchImpl));
  assert.equal(receipt?.status, "failed");
  assert.equal(receipt?.outcome, "replace_400");
  const missing = await runHostAudienceSync(deps(db, fetchImpl,
    {token: async () => {
      throw new Error("no version pinned");
    }}));
  assert.equal(missing?.outcome, "meta_credential_unavailable");
});

test("a large list is replaced in one session of 10,000-row batches",
  async () => {
    const {calls, fetchImpl} = graph(() => ({body: {num_received: 1,
      num_invalid_entries: 0}}));
    const rows = Array.from({length: 10_001}, (_, index) =>
      [sha256Hex(`e${index}`), ""] as [string, string]);
    const result = await replaceMetaAudience({token: "t", fetch: fetchImpl},
      "120000000000001", rows, 42);
    assert.equal(calls.length, 2);
    const sessions = calls.map((call) => call.body.session as
      Record<string, unknown>);
    assert.deepEqual(sessions.map((session) => session.session_id), [42, 42]);
    assert.deepEqual(sessions.map((session) => session.batch_seq), [1, 2]);
    assert.deepEqual(sessions.map((session) => session.last_batch_flag),
      [false, true]);
    assert.equal((calls[0].body.payload as {data: unknown[]}).data.length,
      10_000);
    assert.equal(result.received, 2);
  });
