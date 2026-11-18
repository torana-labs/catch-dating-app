import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {
  activateFormCustomDomain, firebaseHostingProviderHostnameId,
  markCustomDomainProvisioning, removeCustomDomain, reserveCustomDomain,
  resolveFormCustomDomain, verifyCustomDomain, type RegistryActor,
} from "./domainRegistry";

const projectId = "demo-catch-rules";
const siteId = "domain-test-site";
const target = `${siteId}.web.app`;

async function fixture() {
  const id = randomUUID();
  const app = initializeApp({projectId}, `domain-${id}`);
  const db = getEmulatorFirestore(app);
  const now = Date.now();
  const hostname = `forms-${id}.example-club.example`;
  const organizerId = `domain-org-${id}`;
  const formId = `domain-form-${id}`;
  const actorUid = `domain-manager-${id}`;
  const actor: RegistryActor = {kind: "operator", uid: actorUid,
    authority: requireOrganizerManager};
  const organizer = db.doc(`organizers/${organizerId}`);
  const form = db.doc(`organizerForms/${formId}`);
  const domain = db.doc(`customDomains/${hostname}`);
  await organizer.set({hostUserId: actorUid, ownerUserId: actorUid,
    hostUserIds: [actorUid], hostProfiles: []});
  await form.set({organizerId, status: "published",
    publicFormId: `domain-public-${id}`});
  const reserve = () => reserveCustomDomain(db, {hostname,
    provider: "firebaseHosting", expectedCname: target, actor,
    target: {kind: "form", organizerId, formId}}, now);
  const provisioned = async () => {
    const pending = await reserve();
    const probe = {hostname, txtValues: [pending.ownershipChallenge],
      cnameTarget: target, checkedAtMillis: now};
    const verified = await verifyCustomDomain(db, {fence: pending, probe,
      actor}, now);
    const expected = await markCustomDomainProvisioning(db, {fence: verified,
      providerHostnameId: firebaseHostingProviderHostnameId(siteId, hostname),
      actor}, now);
    return {expected, probe};
  };
  const activate = (proof: Awaited<ReturnType<typeof provisioned>>) =>
    activateFormCustomDomain(db, {...proof, actorUid,
      trustedProjectId: projectId, certificate: {projectId, siteId, hostname,
        observedAtMillis: now, expiresAtMillis: now + 86_400_000}},
    () => now, requireOrganizerManager);
  const remove = (proof: Awaited<ReturnType<typeof provisioned>>) =>
    removeCustomDomain(db, {fence: {hostname,
      generation: proof.expected.generation}, actor}, now);
  const close = async () => {
    await Promise.all([domain, form, organizer].map((ref) => ref.delete()));
    await db.terminate();
    await deleteApp(app);
  };
  return {db, hostname, organizerId, now, organizer, form, domain, reserve,
    provisioned, activate, remove, close};
}

test("Firestore reserves one domain generation under competing requests",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const h = await fixture();
    try {
      const attempts = await Promise.allSettled([h.reserve(), h.reserve()]);
      assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((r) => r.status === "rejected").length, 1);
      const domain = (await h.domain.get()).data()!;
      assert.equal(domain.generation, 1);
      assert.equal(domain.revision, 1);
      assert.equal(domain.status, "pendingDns");
      assert.deepEqual(domain.target.organizerId, h.organizerId);
    } finally {
      await h.close();
    }
  });

test("Firestore atomically activates and idempotently resolves the exact form",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const h = await fixture();
    try {
      const proof = await h.provisioned();
      const result = await h.activate(proof);
      assert.equal(result.status, "active");
      assert.equal(result.providerStatus?.ssl, "active");
      assert.deepEqual(await h.activate(proof), result);
      assert.deepEqual((await h.domain.get()).data(), result);
      assert.equal(result.target.kind, "form");
      assert.deepEqual(await resolveFormCustomDomain(h.db, h.hostname,
        proof.probe, () => h.now), {organizerId: h.organizerId,
        publicFormId: result.target.kind === "form" ?
          result.target.publicFormId : null});
    } finally {
      await h.close();
    }
  });

test("Firestore concurrent removal wins over activation of old evidence",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const h = await fixture();
    try {
      const proof = await h.provisioned();
      const results = await Promise.allSettled([
        h.activate(proof), h.remove(proof),
      ]);
      assert.equal(results[1].status, "fulfilled");
      assert.equal((await h.domain.get()).get("status"), "removed");
      await assert.rejects(h.activate(proof));
      assert.equal(await resolveFormCustomDomain(h.db, h.hostname,
        proof.probe, () => h.now), null);
    } finally {
      await h.close();
    }
  });

for (const change of ["manager", "unpublished", "reassigned"] as const) {
  test(`Firestore rejects ${change} after provider evidence was obtained`,
    {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
      const h = await fixture();
      try {
        const proof = await h.provisioned();
        if (change === "manager") {
          await h.organizer.set({hostUserId: "replacement",
            ownerUserId: "replacement", hostUserIds: ["replacement"],
            hostProfiles: []});
        } else if (change === "unpublished") {
          await h.form.update({status: "draft"});
        } else {
          await h.remove(proof);
          const next = await h.reserve();
          assert.equal(next.generation, proof.expected.generation + 1);
          assert.notEqual(next.ownershipChallenge,
            proof.expected.ownershipChallenge);
        }
        const before = (await h.domain.get()).data();
        await assert.rejects(h.activate(proof));
        assert.deepEqual((await h.domain.get()).data(), before);
        assert.notEqual((await h.domain.get()).get("status"), "active");
      } finally {
        await h.close();
      }
    });
}

test("Firestore held DNS resolution cannot outlive committed removal",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const h = await fixture();
    let release!: () => void;
    let lookup: ReturnType<typeof resolveFormCustomDomain> | undefined;
    try {
      const proof = await h.provisioned();
      await h.activate(proof);
      let started!: () => void;
      const began = new Promise<void>((resolve) => {
        started = resolve;
      });
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      lookup = resolveFormCustomDomain(h.db, h.hostname, async () => {
        started(); await held; return proof.probe;
      }, () => h.now);
      await began;
      await h.remove(proof);
      release();
      assert.equal(await lookup, null);
    } finally {
      release?.();
      await lookup?.catch(() => undefined);
      await h.close();
    }
  });

test("Firestore allows one live domain per organiser under competing hosts",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const h = await fixture();
    const second = `www-${randomUUID()}.example-club.example`;
    try {
      const actor: RegistryActor = {kind: "owner", uid: "owner-x"};
      const attempts = await Promise.allSettled([h.hostname, second]
        .map((hostname) => reserveCustomDomain(h.db, {hostname,
          provider: "cloudflareSaas", expectedCname: "domains.neutral.example",
          actor, target: {kind: "organizerPage", organizerId: h.organizerId}},
        h.now)));
      assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    } finally {
      await h.db.doc(`customDomains/${second}`).delete();
      await h.close();
    }
  });
