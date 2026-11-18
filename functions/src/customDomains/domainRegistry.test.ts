import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {LAPSE_GRACE_MS, PENDING_LEASE_MS, type CustomDomainRecord,
  type DomainProbe} from "./domainPolicy";
import {
  activateCustomDomain, activateFormCustomDomain, approveCustomDomainReview,
  expireCustomDomainLease, failCustomDomain, firebaseHostingProviderHostnameId,
  lapseCustomDomain, markCustomDomainProvisioning, removeCustomDomain,
  removeLapsedCustomDomain, reserveCustomDomain, resolveFormCustomDomain,
  restoreCustomDomain, retryCustomDomain, suspendCustomDomain,
  unsuspendCustomDomain, verifyCustomDomain, type OrganizerAuthority,
  type RegistryActor,
} from "./domainRegistry";

const now = 1_700_000_000_000;
const hostingTarget = "forms-site.web.app";
const formHost = "apply.example-club.example";
const publicA = "pf_publicA1234567890abcdef";
const publicB = "pf_publicB1234567890abcdef";
const manager: OrganizerAuthority = async () => undefined;
const operator: RegistryActor = {kind: "operator", uid: "manager-a",
  authority: manager};

function fakeDb() {
  const store = new FakeFirestore({
    "organizerForms/form-a": {organizerId: "organizer-a", status: "published",
      publicFormId: publicA},
    "organizerForms/form-b": {organizerId: "organizer-b", status: "published",
      publicFormId: publicB},
  });
  return {store, db: store.asFirestore()};
}

const formInput = {hostname: formHost, provider: "firebaseHosting" as const,
  expectedCname: hostingTarget, actor: operator,
  target: {kind: "form" as const, organizerId: "organizer-a",
    formId: "form-a"}};
const certificate = {projectId: "test-project", siteId: "forms-site",
  hostname: formHost, observedAtMillis: now,
  expiresAtMillis: now + 86_400_000};
const providerId = firebaseHostingProviderHostnameId("forms-site", formHost);

function proofFor(record: CustomDomainRecord,
  checkedAtMillis = now): DomainProbe {
  return {hostname: record.hostname, txtValues: [record.ownershipChallenge],
    cnameTarget: record.expectedCname, checkedAtMillis};
}

async function provisioned(db: FirebaseFirestore.Firestore,
  input = formInput) {
  const pending = await reserveCustomDomain(db, input, now);
  const probe = proofFor(pending);
  const verified = await verifyCustomDomain(db, {fence: pending, probe,
    actor: operator}, now);
  const expected = await markCustomDomainProvisioning(db, {fence: verified,
    providerHostnameId: providerId, actor: operator}, now);
  return {pending, probe, expected};
}

function activate(db: FirebaseFirestore.Firestore,
  expected: CustomDomainRecord, probe: DomainProbe) {
  return activateFormCustomDomain(db, {expected, probe, certificate,
    actorUid: "manager-a", trustedProjectId: "test-project"}, now, manager);
}

describe("custom domain registry: reservation", () => {
  it("reclaims only expired pending leases with a new generation", async () => {
    const {db} = fakeDb();
    const first = await reserveCustomDomain(db, formInput, now);
    const other = {...formInput, target: {kind: "form" as const,
      organizerId: "organizer-b", formId: "form-b"}};
    const leaseEnd = now + PENDING_LEASE_MS;
    await assert.rejects(reserveCustomDomain(db, other, leaseEnd - 1),
      /already reserved/u);
    await assert.rejects(verifyCustomDomain(db, {fence: first,
      probe: proofFor(first, leaseEnd), actor: operator}, leaseEnd));
    const replacement = await reserveCustomDomain(db, other, leaseEnd);
    assert.equal(replacement.generation, first.generation + 1);
    assert.notEqual(replacement.ownershipChallenge, first.ownershipChallenge);
    assert.deepEqual(replacement.target, {kind: "form",
      organizerId: "organizer-b", formId: "form-b", publicFormId: publicB});
    await assert.rejects(verifyCustomDomain(db, {fence: first,
      probe: proofFor(first, leaseEnd), actor: operator}, leaseEnd),
    /changed/u);
    await assert.rejects(activate(db, first, proofFor(first)));
  });

  it("holds one live domain per organiser across hostnames", async () => {
    const {db, store} = fakeDb();
    const page = {hostname: "www.example-club.test",
      provider: "cloudflareSaas" as const,
      expectedCname: "domains.neutral.example",
      actor: {kind: "owner" as const, uid: "owner-a"},
      target: {kind: "organizerPage" as const, organizerId: "organizer-a"}};
    const first = await reserveCustomDomain(db, page, now);
    assert.equal(first.createdByUid, "owner-a");
    await assert.rejects(reserveCustomDomain(db,
      {...page, hostname: "run.other-club.test"}, now), /already has/u);
    // An ended lease no longer counts, even before the reconciler expires it.
    const second = await reserveCustomDomain(db,
      {...page, hostname: "run.other-club.test"}, now + PENDING_LEASE_MS);
    await removeCustomDomain(db, {fence: second,
      actor: {kind: "owner", uid: "owner-a"}}, now + PENDING_LEASE_MS);
    await expireCustomDomainLease(db, {fence: first,
      actor: {kind: "reconciler", uid: null}}, now + PENDING_LEASE_MS);
    await reserveCustomDomain(db, {...page, hostname: "go.third-club.test"},
      now + PENDING_LEASE_MS);
    // A record that cannot be read fails closed.
    store.put("customDomains/www.fourth-club.test", {
      target: {organizerId: "organizer-z"}, status: "active"});
    await assert.rejects(reserveCustomDomain(db, {...page,
      hostname: "www.fifth-club.test", target: {kind: "organizerPage",
        organizerId: "organizer-z"}}, now), /already has/u);
  });

  it("screens, scopes and checks authority before writing", async () => {
    const {db, store} = fakeDb();
    const page = {provider: "cloudflareSaas" as const,
      expectedCname: "domains.neutral.example",
      actor: {kind: "owner" as const, uid: "owner-a"},
      target: {kind: "organizerPage" as const, organizerId: "organizer-a"}};
    for (const hostname of ["www.examplebank.test", "example-club.test",
      "www.neutral.example", "Www.example-club.test"]) {
      await assert.rejects(reserveCustomDomain(db, {...page, hostname}, now),
        hostname);
    }
    await assert.rejects(reserveCustomDomain(db, {...page,
      hostname: "www.example-club.test",
      apexRedirect: {hostname: "other-club.test", mode: "registrar"}}, now));
    await assert.rejects(reserveCustomDomain(db, {...page,
      hostname: "www.example-club.test",
      actor: {kind: "owner", uid: "owner-a", authority: async () => {
        throw new Error("Not an owner");
      }}}, now), /Not an owner/u);
    await assert.rejects(reserveCustomDomain(db, {...formInput,
      target: {kind: "form", organizerId: "organizer-a", formId: "form-b"}},
    now), /Published form/u);
    assert.deepEqual(store.paths("customDomains/"), []);
    const held = await reserveCustomDomain(db, {...page,
      hostname: "www.club-login.test",
      apexRedirect: {hostname: "club-login.test", mode: "registrar"}}, now);
    assert.equal(held.review.state, "held");
    assert.deepEqual(held.dnsInstructions.map((row) => row.purpose),
      ["routing", "ownership", "apexRedirect"]);
  });
});

describe("custom domain registry: lifecycle", () => {
  it("reserves, verifies, provisions, activates and resolves one form",
    async () => {
      const {db, store} = fakeDb();
      const {pending, probe, expected} = await provisioned(db);
      assert.equal(pending.status, "pendingDns");
      assert.equal(expected.status, "provisioning");
      await assert.rejects(reserveCustomDomain(db, formInput, now));
      let dnsCalls = 0;
      const loadProbe = async () => {
        dnsCalls++;
        return probe;
      };
      assert.equal(await resolveFormCustomDomain(
        db, "absent.example-club.example", loadProbe, now), null);
      assert.equal(await resolveFormCustomDomain(
        db, formHost, loadProbe, now), null);
      assert.equal(dnsCalls, 0);
      await assert.rejects(activateFormCustomDomain(db, {expected, probe,
        certificate: null, actorUid: "manager-a",
        trustedProjectId: "test-project"}, now, manager));
      const active = await activate(db, expected, probe);
      assert.equal(active.status, "active");
      assert.equal(active.activatedAtMillis, now);
      assert.deepEqual(await activate(db, expected, probe), active);
      assert.deepEqual(await resolveFormCustomDomain(
        db, formHost, loadProbe, now), {organizerId: "organizer-a",
        publicFormId: publicA});
      assert.equal(dnsCalls, 1);
      let afterDns = now;
      assert.deepEqual(await resolveFormCustomDomain(db, formHost,
        async () => {
          afterDns = now + 500;
          return {...probe, checkedAtMillis: afterDns};
        }, () => afterDns), {organizerId: "organizer-a",
        publicFormId: publicA});
      assert.equal(await resolveFormCustomDomain(db, formHost,
        {...probe, checkedAtMillis: now + 500}, now), null);
      assert.equal(await resolveFormCustomDomain(db, formHost,
        {...probe, cnameTarget: "other.example"}, now), null);
      store.put("organizerForms/form-a", {organizerId: "organizer-b",
        publicFormId: publicA, status: "published"});
      assert.equal(await resolveFormCustomDomain(db, formHost, probe, now),
        null);
      store.put("organizerForms/form-a", {organizerId: "organizer-a",
        publicFormId: publicA, status: "published"});
      const removed = await removeCustomDomain(db, {fence: active,
        actor: operator}, now);
      assert.equal(removed.status, "removed");
      assert.deepEqual(await removeCustomDomain(db, {fence: active,
        actor: operator}, now), removed);
      assert.equal(await resolveFormCustomDomain(
        db, formHost, loadProbe, now), null);
      assert.equal(dnsCalls, 1);
      const replacement = await reserveCustomDomain(db, formInput, now);
      assert.equal(replacement.generation, 2);
      assert.notEqual(replacement.ownershipChallenge,
        pending.ownershipChallenge);
      assert.equal(await resolveFormCustomDomain(db, formHost, probe, now),
        null);
      await assert.rejects(activate(db, expected, probe));
      await assert.rejects(verifyCustomDomain(db, {fence: pending, probe,
        actor: operator}, now));
    });

  it("lapses, restores within the grace and removes after it", async () => {
    const {db} = fakeDb();
    const {probe, expected} = await provisioned(db);
    const active = await activate(db, expected, probe);
    const reconciler: RegistryActor = {kind: "reconciler", uid: null};
    const lapsed = await lapseCustomDomain(db, {fence: active,
      actor: reconciler, reason: "TXT missing"}, now + 1000);
    assert.equal(lapsed.lapsedAtMillis, now + 1000);
    assert.equal(await resolveFormCustomDomain(db, formHost, probe, now),
      null);
    const evidence = {providerHostnameId: providerId, hostnameStatus: "active",
      sslStatus: "active", observedAtMillis: now + 2000};
    await assert.rejects(restoreCustomDomain(db, {fence: lapsed,
      probe: {...probe, txtValues: []}, evidence, actor: reconciler},
    now + 2000));
    await assert.rejects(removeLapsedCustomDomain(db, {fence: lapsed,
      actor: reconciler}, now + 1000 + LAPSE_GRACE_MS - 1), /not ended/u);
    const restored = await restoreCustomDomain(db, {fence: lapsed,
      probe: {...probe, checkedAtMillis: now + 2000}, evidence,
      actor: reconciler}, now + 2000);
    assert.equal(restored.status, "active");
    assert.equal(restored.lapsedAtMillis, null);
    assert.equal(restored.generation, active.generation);
    const lapsedAgain = await lapseCustomDomain(db, {fence: restored,
      actor: reconciler, reason: "CNAME repointed"}, now + 3000);
    await assert.rejects(restoreCustomDomain(db, {fence: lapsedAgain,
      probe: {...probe, checkedAtMillis: now + 3000 + LAPSE_GRACE_MS},
      evidence: {...evidence, observedAtMillis: now + 3000 + LAPSE_GRACE_MS},
      actor: reconciler}, now + 3000 + LAPSE_GRACE_MS), /grace/u);
    const removed = await removeLapsedCustomDomain(db, {fence: lapsedAgain,
      actor: reconciler}, now + 3000 + LAPSE_GRACE_MS);
    assert.equal(removed.status, "removed");
    assert.deepEqual(removed.history.slice(-1)[0], {
      atMillis: now + 3000 + LAPSE_GRACE_MS, from: "lapsed", to: "removed",
      actor: "reconciler", actorUid: null,
      reason: "Lapsed for the whole grace period"});
  });

  it("suspends any live state and restores the interrupted one", async () => {
    const {db} = fakeDb();
    const {probe, expected} = await provisioned(db);
    const active = await activate(db, expected, probe);
    const suspended = await suspendCustomDomain(db, {fence: active,
      byUid: "admin-1", reason: "Impersonation report"}, now + 10);
    assert.deepEqual(suspended.suspension, {reason: "Impersonation report",
      byUid: "admin-1", atMillis: now + 10});
    assert.equal(await resolveFormCustomDomain(db, formHost, probe, now + 10),
      null);
    assert.deepEqual(await suspendCustomDomain(db, {fence: active,
      byUid: "admin-1", reason: "Again"}, now + 11), suspended);
    const lifted = await unsuspendCustomDomain(db, {fence: active,
      byUid: "admin-1", reason: "Cleared"}, now + 20);
    assert.equal(lifted.status, "active");
    assert.equal(lifted.suspension, null);
    assert.deepEqual(await resolveFormCustomDomain(db, formHost, probe, now),
      {organizerId: "organizer-a", publicFormId: publicA});
  });

  it("holds a review until Admin approves, and retries failures", async () => {
    const {db} = fakeDb();
    const page = {hostname: "www.club-login.test",
      provider: "cloudflareSaas" as const,
      expectedCname: "domains.neutral.example",
      actor: {kind: "owner" as const, uid: "owner-a"},
      target: {kind: "organizerPage" as const, organizerId: "organizer-a"}};
    const pending = await reserveCustomDomain(db, page, now);
    const probe = proofFor(pending);
    const verified = await verifyCustomDomain(db, {fence: pending, probe,
      actor: {kind: "reconciler", uid: null}}, now);
    const provisioning = await markCustomDomainProvisioning(db, {
      fence: verified, providerHostnameId: "cf-hostname-1",
      actor: {kind: "reconciler", uid: null}}, now);
    const evidence = {providerHostnameId: "cf-hostname-1",
      hostnameStatus: "active", sslStatus: "active", observedAtMillis: now};
    await assert.rejects(activateCustomDomain(db, {fence: provisioning, probe,
      evidence, actor: {kind: "reconciler", uid: null}}, now), /review/u);
    const approved = await approveCustomDomainReview(db,
      {fence: provisioning, byUid: "admin-1"}, now);
    assert.deepEqual(approved.review, {state: "approved",
      reason: "term:login"});
    assert.equal(approved.status, "provisioning");
    await assert.rejects(activateCustomDomain(db, {fence: approved, probe,
      evidence: {...evidence, providerHostnameId: "cf-hostname-2"},
      actor: {kind: "reconciler", uid: null}}, now), /stale/u);
    const failed = await failCustomDomain(db, {fence: approved,
      actor: {kind: "reconciler", uid: null}, reason: "CAA blocks issuance",
      providerStatus: {hostname: "pending", ssl: "pending_validation",
        errors: ["caa_error"], observedAtMillis: now}}, now);
    assert.equal(failed.status, "failed");
    const retried = await retryCustomDomain(db, {fence: failed,
      actor: {kind: "owner", uid: "owner-a"}}, now + 5);
    assert.equal(retried.status, "pendingDns");
    assert.equal(retried.pendingExpiresAtMillis, now + 5 + PENDING_LEASE_MS);
    assert.equal(retried.ownershipChallenge, pending.ownershipChallenge);
  });
});

describe("custom domain registry: races", () => {
  for (const change of ["removed", "generation", "challenge", "form-owner",
    "unpublished", "public-id", "project", "site", "host", "stale",
    "future", "expired", "manager", "clock-after-reads"] as const) {
    it(`refuses atomic activation after ${change} changes`, async () => {
      const {db, store} = fakeDb();
      const {probe, expected} = await provisioned(db);
      const path = `customDomains/${formHost}`;
      if (change === "removed") {
        await removeCustomDomain(db, {fence: expected, actor: operator}, now);
      }
      if (change === "generation") {
        store.put(path, {...expected, generation: expected.generation + 1});
      }
      if (change === "challenge") {
        store.put(path, {...expected,
          ownershipChallenge: "catch-verification=" + "b".repeat(32)});
      }
      if (change === "form-owner") {
        store.put("organizerForms/form-a", {organizerId: "other",
          status: "published", publicFormId: publicA});
      }
      if (change === "unpublished" || change === "public-id") {
        store.put("organizerForms/form-a", {organizerId: "organizer-a",
          status: change === "unpublished" ? "draft" : "published",
          publicFormId: change === "public-id" ? publicB : publicA});
      }
      const observed = {...certificate};
      if (change === "project") observed.projectId = "other-project";
      if (change === "site") observed.siteId = "other-site";
      if (change === "host") observed.hostname = "other.example-club.example";
      if (change === "stale") observed.observedAtMillis = now - 300_001;
      if (change === "future") observed.observedAtMillis = now + 1;
      if (change === "expired") observed.expiresAtMillis = now;
      let checked = false;
      const authority: OrganizerAuthority = async (args) => {
        assert.ok(args.transaction);
        checked = true;
        if (change === "manager") throw new Error("Manager revoked");
      };
      const before = store.get(path);
      await assert.rejects(activateFormCustomDomain(db, {expected, probe,
        certificate: observed, actorUid: "manager-a",
        trustedProjectId: "test-project"}, () => {
        assert.equal(checked, true);
        return change === "clock-after-reads" ? now + 300_001 : now;
      }, authority));
      assert.deepEqual(store.get(path), before);
      assert.notEqual(store.get(path)?.status, "active");
    });
  }

  // The 11 DNS-race controls: a lookup holding a DNS probe must re-read the
  // binding and form, and never cross a committed change.
  for (const change of ["unchanged", "removed", "deleted", "certificate",
    "generation", "reassigned", "wrong-form", "unpublished", "form-owner",
    "public-id", "no-proof"] as const) {
    it(`revalidates ${change} binding after a held DNS probe`, async () => {
      const {db, store} = fakeDb();
      const {probe, expected} = await provisioned(db);
      let proof = probe;
      await activate(db, expected, proof);
      let started!: () => void;
      let release!: () => void;
      const probeStarted = new Promise<void>((resolve) => {
        started = resolve;
      });
      const probeHeld = new Promise<void>((resolve) => {
        release = resolve;
      });
      const lookup = resolveFormCustomDomain(db, formHost, async () => {
        started();
        await probeHeld;
        return change === "no-proof" ? null : proof;
      }, () => now);
      await probeStarted;
      if (change === "no-proof") {
        db.runTransaction = async () => {
          throw new Error("Unavailable DNS must not start a transaction");
        };
      }
      const domainPath = `customDomains/${formHost}`;
      const formPath = "organizerForms/form-a";
      if (["removed", "generation", "reassigned"].includes(change)) {
        await removeCustomDomain(db, {fence: expected, actor: operator}, now);
      }
      if (change === "generation" || change === "reassigned") {
        const nextInput = change === "generation" ? formInput : {...formInput,
          target: {kind: "form" as const, organizerId: "organizer-b",
            formId: "form-b"}};
        const next = await provisioned(db, nextInput);
        // DNS now genuinely proves the replacement. The original in-flight
        // lookup must still not cross its reservation generation boundary.
        proof = next.probe;
        await activate(db, next.expected, proof);
      }
      if (change === "deleted") store.remove(domainPath);
      if (change === "certificate") {
        const current = store.get(domainPath) as CustomDomainRecord;
        store.put(domainPath, {...current, providerStatus: {
          ...current.providerStatus!, ssl: "pending_validation"}});
      }
      if (change === "wrong-form") {
        const current = store.get(domainPath) as CustomDomainRecord;
        store.put(domainPath, {...current, target: {kind: "form",
          organizerId: "organizer-a", formId: "form-b",
          publicFormId: publicA}});
        store.put("organizerForms/form-b", {...store.get(formPath)});
      }
      if (change === "unpublished") {
        store.put(formPath, {...store.get(formPath), status: "draft"});
      }
      if (change === "form-owner") {
        store.put(formPath, {...store.get(formPath),
          organizerId: "organizer-b"});
      }
      if (change === "public-id") {
        store.put(formPath, {...store.get(formPath), publicFormId: publicB});
      }
      release();
      assert.deepEqual(await lookup, change === "unchanged" ? {
        organizerId: "organizer-a", publicFormId: publicA,
      } : null);
    });
  }
});
