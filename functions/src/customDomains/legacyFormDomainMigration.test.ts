import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {holdsHostname, parseCustomDomain} from "./domainPolicy";
import {
  applyLegacyFormDomainMigration, convertLegacyFormDomain,
  planLegacyFormDomainMigration,
} from "./legacyFormDomainMigration";

const now = 1_700_000_000_000;
const migratedAt = now + 10_000;
const challenge = "catch-verification=Qx7Lr2Vb9Tn4Hc6Md1Ks8Wp3Yf5Ga0Ze";

function legacy(hostname: string, status: string,
  extra: Record<string, unknown> = {}) {
  return {hostname, organizerId: "organizer-1", formId: "form-1",
    publicFormId: "pf_Ab12Cd34Ef56Gh78Ij90", ownershipChallenge: challenge,
    expectedCname: "forms-site.web.app", status,
    certificateStatus: status === "active" ? "ready" : "pending",
    verifiedAtMillis: status === "pending" ? null : now + 1,
    generation: 3, reservedAtMillis: now,
    pendingExpiresAtMillis: now + 48 * 60 * 60 * 1000, ...extra};
}

describe("organizerFormDomains fold into customDomains", () => {
  it("maps every legacy status onto a valid customDomains record", () => {
    const expected = {pending: "pendingDns", verified: "verified",
      active: "active", revoked: "removed"} as const;
    for (const [from, to] of Object.entries(expected)) {
      const host = `${from}.example-club.example`;
      const result = convertLegacyFormDomain(host, legacy(host, from),
        migratedAt);
      assert.ok(result.ok, from);
      const record = result.record;
      assert.ok(parseCustomDomain(record));
      assert.equal(record.status, to);
      assert.equal(record.generation, 3);
      assert.equal(record.revision, 1);
      assert.equal(record.provider, "firebaseHosting");
      assert.equal(record.registrableDomain, "example-club.example");
      assert.deepEqual(record.review, {state: "none", reason: null});
      assert.deepEqual(record.dnsInstructions.map((row) => row.purpose),
        ["routing", "ownership"]);
      assert.deepEqual(record.history, [{atMillis: migratedAt, from: null,
        to, actor: "operator", actorUid: null,
        reason: `Migrated from organizerFormDomains (status ${from})`}]);
      assert.deepEqual(record.target, {kind: "form",
        organizerId: "organizer-1", formId: "form-1",
        publicFormId: "pf_Ab12Cd34Ef56Gh78Ij90"});
    }
    const active = convertLegacyFormDomain("active.example-club.example",
      legacy("active.example-club.example", "active"), migratedAt);
    assert.ok(active.ok);
    assert.equal(active.record.providerHostnameId,
      "forms-site:active.example-club.example");
    assert.equal(active.record.providerStatus?.ssl, "active");
    // The legacy lease carries over, so an ended one still releases the host.
    const pending = convertLegacyFormDomain("p.example-club.example",
      legacy("p.example-club.example", "pending"), migratedAt);
    assert.ok(pending.ok);
    assert.equal(holdsHostname(pending.record, migratedAt), true);
    assert.equal(holdsHostname(pending.record, now + 48 * 60 * 60 * 1000),
      false);
  });

  it("blocks records the new policy would not accept", () => {
    for (const [host, value] of [
      ["club.co.in", legacy("club.co.in", "active")],
      ["www.example-club.test", legacy("other.example-club.test", "active")],
      ["a.example-club.test", legacy("a.example-club.test", "unknown")],
      ["b.example-club.test", legacy("b.example-club.test", "active",
        {certificateStatus: "failed"})],
      ["c.example-club.test", legacy("c.example-club.test", "verified",
        {verifiedAtMillis: null})],
      ["d.example-club.test", legacy("d.example-club.test", "pending",
        {expectedCname: "domains.neutral.example"})],
      ["e.example-club.test", legacy("e.example-club.test", "pending",
        {ownershipChallenge: "private"})],
      ["f.example-club.test", null],
    ] as const) {
      assert.equal(convertLegacyFormDomain(host, value, migratedAt).ok, false,
        host);
    }
  });

  it("is a no-op on an empty collection", async () => {
    const store = new FakeFirestore();
    const db = store.asFirestore();
    assert.deepEqual(await planLegacyFormDomainMigration(db, migratedAt), {
      legacyCount: 0, rows: [],
      summary: {create: 0, alreadyMigrated: 0, blocked: 0}});
    assert.deepEqual(await applyLegacyFormDomainMigration(db, migratedAt,
      {retireLegacy: true}), {created: [], retired: [], skipped: []});
    assert.deepEqual(store.paths(), []);
  });

  it("copies idempotently, never overwrites and retires only exact copies",
    async () => {
      const store = new FakeFirestore({
        "organizerFormDomains/a.example-club.example":
          legacy("a.example-club.example", "active"),
        "organizerFormDomains/b.example-club.example":
          legacy("b.example-club.example", "revoked"),
        "organizerFormDomains/club.co.in": legacy("club.co.in", "pending"),
        "organizerFormDomains/c.example-club.example":
          legacy("c.example-club.example", "pending"),
      });
      const db = store.asFirestore();
      const conflict = convertLegacyFormDomain("c.example-club.example",
        legacy("c.example-club.example", "pending",
          {generation: 4}), migratedAt);
      assert.ok(conflict.ok);
      store.put("customDomains/c.example-club.example", conflict.record);
      const plan = await planLegacyFormDomainMigration(db, migratedAt);
      assert.equal(plan.legacyCount, 4);
      assert.deepEqual(plan.summary, {create: 2, alreadyMigrated: 0,
        blocked: 2});
      assert.deepEqual(store.paths("customDomains/"),
        ["customDomains/c.example-club.example"]);

      const first = await applyLegacyFormDomainMigration(db, migratedAt,
        {retireLegacy: false});
      assert.deepEqual(first.created.sort(),
        ["a.example-club.example", "b.example-club.example"]);
      const copied = store.get("customDomains/a.example-club.example");
      assert.equal(copied?.status, "active");
      const again = await planLegacyFormDomainMigration(db, migratedAt + 1);
      assert.deepEqual(again.summary, {create: 0, alreadyMigrated: 2,
        blocked: 2});
      assert.deepEqual((await applyLegacyFormDomainMigration(db,
        migratedAt + 1, {retireLegacy: false})).created, []);
      assert.deepEqual(store.get("customDomains/a.example-club.example"),
        copied);
      assert.deepEqual(store.get("customDomains/c.example-club.example"),
        conflict.record);

      const retired = await applyLegacyFormDomainMigration(db, migratedAt + 2,
        {retireLegacy: true});
      assert.deepEqual(retired.retired.sort(),
        ["a.example-club.example", "b.example-club.example"]);
      assert.deepEqual(retired.skipped.sort(),
        ["c.example-club.example", "club.co.in"]);
      assert.deepEqual(store.paths("organizerFormDomains/"), [
        "organizerFormDomains/c.example-club.example",
        "organizerFormDomains/club.co.in",
      ]);
    });
});
