import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {dispatchScheduledOrganizerCampaignsHandler} from
  "./organizerCampaignDispatcher";
import {campaignMessageIdFor} from "./campaignDeliveryWorker";
import {CAMPAIGN_DISCOVERY_CURSORS, openCampaignDiscovery,
  renewCampaignDiscoveryLease} from "./campaignDiscoveryCursor";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const NOW = 1_800_000_000_000;
const requireClient = createRequire(__filename);
const {initializeTestEnvironment, assertFails} =
  requireClient("@firebase/rules-unit-testing");
const {doc, collection, getDoc, getDocs, setDoc} =
  requireClient("firebase/firestore");

function fixture() {
  const projectId = `demo-cat106-${randomUUID().slice(0, 12)}`;
  const app = initializeApp({projectId}, randomUUID());
  const db = getEmulatorFirestore(app); // Rejects every non-local endpoint.
  let now = NOW;
  const calls: string[] = [];
  const deps = {firestore: () => db, runtimeProjectId: () => projectId,
    now: () => Timestamp.fromMillis(now), checkRateLimit: async () => {},
    tokenStore: {accessBound: async () => {
      calls.push("credentials");
      throw new Error("Unexpected credential access");
    }},
    provider: () => ({sendTemplate: async () => {
      calls.push("provider");
      throw new Error("Unexpected provider access");
    }})};
  return {db, deps, projectId, calls, setNow: (value: number) => {
    now = value;
  },
  cursorInput: {db, projectId, clock: () => now},
  cleanup: async () => {
    // Only this freshly allocated synthetic project's known collections.
    for (const name of ["organizerCampaigns", "organizerCampaignRecipients",
      "campaignDeliveryMessages", CAMPAIGN_DISCOVERY_CURSORS]) {
      const rows = await db.collection(name).get();
      await Promise.all(rows.docs.map((row) => row.ref.delete()));
    }
    await db.terminate();
    await deleteApp(app);
  }};
}

function campaign(status = "blocked") {
  return {organizerId: "org-test", status, revision: 1,
    templateVariables: {}, scheduledAt: null, leaseExpiresAt: null,
    leaseOwner: null, dispatchedAt: Timestamp.fromMillis(NOW),
    templateId: "template-test", connectionId: "connection-test",
    deliveryCounts: {pending: 101, failed: 0, suppressed: 0}};
}
function recipient(campaignId: string, status = "pending") {
  return {organizerId: "org-test", campaignId, status,
    contactId: "deleted-contact", inviteLinkId: null,
    leaseOwner: null, leaseExpiresAt: null};
}

test("Firestore campaign discovery crosses ten empty blocked rows and wraps",
  {skip: !enabled, timeout: 120_000}, async () => {
    const f = fixture();
    try {
      const batch = f.db.batch();
      for (let i = 0; i < 11; i++) {
        const id = `camp-${String(i).padStart(2, "0")}`;
        batch.set(f.db.doc(`organizerCampaigns/${id}`),
          campaign());
      }
      batch.set(f.db.doc("organizerCampaignRecipients/tail"),
        recipient("camp-10"));
      await batch.commit();
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await f.db.doc("organizerCampaignRecipients/tail").get())
        .data()?.status, "pending");
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await f.db.doc("organizerCampaignRecipients/tail").get())
        .data()?.status, "suppressed");
      const cursorRef = f.db.doc(
        `${CAMPAIGN_DISCOVERY_CURSORS}/blockedCampaigns`);
      assert.equal((await cursorRef.get()).data()?.cursor, null);
      await f.db.doc("organizerCampaigns/camp-00").delete();
      await f.db.doc("organizerCampaigns/camp-00-new").set(campaign());
      await f.db.doc("organizerCampaignRecipients/new")
        .set(recipient("camp-00-new"));
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await f.db.doc("organizerCampaignRecipients/new").get())
        .data()?.status, "suppressed");
      assert.deepEqual(f.calls, []);
    } finally {
      await f.cleanup();
    }
  });

test("Firestore pending discovery crosses100 malformed outbox rows",
  {skip: !enabled, timeout: 120_000}, async () => {
    const f = fixture();
    try {
      const batch = f.db.batch();
      batch.set(f.db.doc("organizerCampaigns/camp-one"), campaign());
      for (let i = 0; i < 101; i++) {
        const id = `recipient-${String(i).padStart(3, "0")}`;
        batch.set(f.db.doc(`organizerCampaignRecipients/${id}`),
          recipient("camp-one"));
        if (i < 100) {
          batch.set(f.db.doc(`campaignDeliveryMessages/${
            campaignMessageIdFor("org-test", "camp-one", id)}`),
          {malformed: true});
        }
      }
      await batch.commit();
      const tail = f.db.doc("organizerCampaignRecipients/recipient-100");
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await tail.get()).data()?.status, "pending");
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await tail.get()).data()?.status, "suppressed");
      assert.equal((await f.db.collection("organizerCampaignRecipients")
        .where("status", "==", "pending").count().get()).data().count, 100);
      assert.deepEqual(f.calls, []);
    } finally {
      await f.cleanup();
    }
  });

test("Firestore sending discovery crosses100 live recipient leases",
  {skip: !enabled, timeout: 120_000}, async () => {
    const f = fixture();
    try {
      const batch = f.db.batch();
      batch.set(f.db.doc("organizerCampaigns/camp-one"), campaign());
      for (let i = 0; i < 101; i++) {
        const id = `recipient-${String(i).padStart(3, "0")}`;
        batch.set(f.db.doc(`organizerCampaignRecipients/${id}`), {
          ...recipient("camp-one", "sending"), leaseOwner: "held-attempt",
          leaseExpiresAt:
            Timestamp.fromMillis(i < 100 ? NOW + 600_000 : NOW - 1),
        });
      }
      await batch.commit();
      const tail = f.db.doc("organizerCampaignRecipients/recipient-100");
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await tail.get()).data()?.status, "sending");
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await tail.get()).data()?.status, "failed");
      assert.equal((await f.db.collection("organizerCampaignRecipients")
        .where("status", "==", "sending").count().get()).data().count, 100);
      assert.deepEqual(f.calls, []);
    } finally {
      await f.cleanup();
    }
  });

test("Firestore CAS admits one concurrent page and rejects stale wrap",
  {skip: !enabled, timeout: 120_000}, async () => {
    const f = fixture();
    try {
      const input = {...f.cursorInput,
        queue: {kind: "blockedCampaigns" as const}};
      const [a, b] = await Promise.all([
        openCampaignDiscovery(input), openCampaignDiscovery(input),
      ]);
      const results = await Promise.allSettled([
        a.checkpoint("camp-a"), b.checkpoint("camp-b"),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const loser = results[0].status === "rejected" ? a : b;
      const winner = results[0].status === "fulfilled" ? a : b;
      await winner.checkpoint(null);
      await assert.rejects(loser.checkpoint(null), /cursor changed/);
      const cursorRef = f.db.doc(
        `${CAMPAIGN_DISCOVERY_CURSORS}/blockedCampaigns`);
      assert.equal((await cursorRef.get()).data()?.revision, 2);
      const resumed = await openCampaignDiscovery(input);
      await resumed.checkpoint("camp-c");
      assert.equal((await openCampaignDiscovery(input)).cursor, "camp-c");
    } finally {
      await f.cleanup();
    }
  });

test("Firestore replaced or expired campaign lease cannot advance or renew",
  {skip: !enabled, timeout: 120_000}, async () => {
    const f = fixture();
    const lease = {organizerId: "org-test", campaignId: "camp-one",
      leaseOwner: "owner-a"};
    try {
      const ref = f.db.doc("organizerCampaigns/camp-one");
      await ref.set({...campaign("sending"), leaseOwner: "owner-a",
        leaseExpiresAt: Timestamp.fromMillis(NOW + 180_000)});
      const input = {...f.cursorInput,
        queue: {kind: "pendingRecipients" as const, lease}};
      const cursor = await openCampaignDiscovery(input);
      await cursor.checkpoint("recipient-100");
      await ref.update({leaseOwner: "owner-b"});
      await assert.rejects(cursor.checkpoint(null), /lease/);
      await assert.rejects(renewCampaignDiscoveryLease({...f.cursorInput,
        lease, durationMillis: 180_000}), /lease/);
      const nextLease = {...lease, leaseOwner: "owner-b"};
      const next = await openCampaignDiscovery({...input,
        queue: {kind: "pendingRecipients", lease: nextLease}});
      assert.equal(next.cursor, "recipient-100");
      f.setNow(NOW + 180_000);
      await assert.rejects(next.checkpoint("recipient-200"), /lease/);
      await assert.rejects(renewCampaignDiscoveryLease({...f.cursorInput,
        lease: nextLease, durationMillis: 180_000}), /lease/);
      assert.equal((await ref.get()).data()?.leaseOwner, "owner-b");
      assert.deepEqual(f.calls, []);
    } finally {
      await f.cleanup();
    }
  });

test("Firestore rules deny direct cursor reads lists and writes",
  {skip: !enabled, timeout: 120_000}, async () => {
    const f = fixture();
    let cleanupClient = async () => {};
    try {
      const host = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
      const env = await initializeTestEnvironment({projectId: f.projectId,
        firestore: {host: host[0], port: Number(host[1]),
          rules: fs.readFileSync(
            path.resolve(__dirname, "../../../firestore.rules"), "utf8")}});
      cleanupClient = () => env.cleanup();
      const cursor = await openCampaignDiscovery({...f.cursorInput,
        queue: {kind: "blockedCampaigns"}});
      await cursor.checkpoint("camp-z");
      for (const client of [env.unauthenticatedContext(),
        env.authenticatedContext("manager-test"),
        env.authenticatedContext("admin-test", {admin: true})]) {
        const firestore = client.firestore();
        const ref = doc(firestore, CAMPAIGN_DISCOVERY_CURSORS,
          "blockedCampaigns");
        await assertFails(getDoc(ref));
        await assertFails(getDocs(
          collection(firestore, CAMPAIGN_DISCOVERY_CURSORS)));
        await assertFails(setDoc(ref, {cursor: null}));
      }
      assert.deepEqual(f.calls, []);
    } finally {
      await cleanupClient();
      await f.cleanup();
    }
  });

test("Firestore malformed recovery row does not abort its short page",
  {skip: !enabled, timeout: 120_000}, async () => {
    const f = fixture();
    try {
      const batch = f.db.batch();
      batch.set(f.db.doc("organizerCampaigns/camp-one"), campaign());
      for (const id of ["recipient-a", "recipient-b"]) {
        batch.set(f.db.doc(`organizerCampaignRecipients/${id}`), {
          ...recipient("camp-one", "sending"), leaseOwner: "legacy",
          leaseExpiresAt: Timestamp.fromMillis(NOW - 1),
        });
      }
      batch.set(f.db.doc(`campaignDeliveryMessages/${campaignMessageIdFor(
        "org-test", "camp-one", "recipient-a")}`), {malformed: true});
      await batch.commit();
      await dispatchScheduledOrganizerCampaignsHandler(f.deps);
      assert.equal((await f.db.doc("organizerCampaignRecipients/recipient-a")
        .get()).data()?.status, "sending");
      assert.equal((await f.db.doc("organizerCampaignRecipients/recipient-b")
        .get()).data()?.status, "failed");
      assert.deepEqual(f.calls, []);
    } finally {
      await f.cleanup();
    }
  });
