import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {dispatchCampaign, dispatchScheduledOrganizerCampaignsHandler,
  DispatcherDeps}
  from "./organizerCampaignDispatcher";

import {campaignMessageIdFor} from "./campaignDeliveryWorker";
import {CAMPAIGN_DISCOVERY_CURSORS} from "./campaignDiscoveryCursor";

const NOW = 1_800_000_000_000;
const stamp = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

function seedCampaign(db: FakeFirestore, id: string, recipients = 0) {
  db.setDoc(`organizerCampaigns/${id}`, {
    organizerId: "org-test", status: "blocked", revision: 1,
    templateVariables: {}, scheduledAt: null, leaseExpiresAt: null,
    leaseOwner: null, dispatchedAt: stamp(NOW),
    templateId: "template-test", connectionId: "connection-test",
    deliveryCounts: {pending: recipients, failed: 0, suppressed: 0},
  });
  for (let i = 0; i < recipients; i++) {
    db.setDoc(`organizerCampaignRecipients/${id}-r${i}`, {
      organizerId: "org-test", campaignId: id, status: "pending",
      leaseOwner: null, leaseExpiresAt: null,
      contactId: "deleted-contact", inviteLinkId: null,
    });
  }
}

function depsFor(db: FakeFirestore): DispatcherDeps {
  return {
    firestore: () => db as unknown as Firestore,
    runtimeProjectId: () => "demo-catch-rules",
    now: () => stamp(NOW), checkRateLimit: async () => {},
    tokenStore: {accessBound: async () => {
      throw new Error("No credential I/O expected");
    }},
    provider: () => ({sendTemplate: async () => {
      throw new Error("No provider I/O expected");
    }}),
  };
}

test("blocked discovery advances past ten zero-remaining campaigns",
  async () => {
    const db = new FakeFirestore({});
    for (let i = 0; i < 11; i++) {
      seedCampaign(db, `camp-${String(i).padStart(2, "0")}`, i === 10 ? 1 : 0);
    }
    for (let pass = 0; pass < 3; pass++) {
      await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    }
    // Actual worker sees the deleted contact and suppresses it, without send.
    assert.equal(db.getDoc("organizerCampaignRecipients/camp-10-r0")?.status,
      "suppressed");
  });

test("pending discovery reaches recipient101 despite malformed durable rows",
  async () => {
    const db = new FakeFirestore({});
    seedCampaign(db, "camp-one");
    for (let i = 0; i < 101; i++) {
      const id = `recipient-${String(i).padStart(3, "0")}`;
      db.setDoc(`organizerCampaignRecipients/${id}`, {
        organizerId: "org-test", campaignId: "camp-one", status: "pending",
        leaseOwner: null, leaseExpiresAt: null,
        contactId: "deleted-contact", inviteLinkId: null,
      });
      if (i < 100) {
        db.setDoc(`campaignDeliveryMessages/${campaignMessageIdFor(
          "org-test", "camp-one", id)}`, {malformed: true});
      }
    }
    await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    assert.equal(db.getDoc("organizerCampaignRecipients/recipient-100")?.status,
      "pending", "first page remains bounded to100");
    await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    assert.equal(db.getDoc("organizerCampaignRecipients/recipient-100")?.status,
      "suppressed");
    for (let i = 0; i < 100; i++) {
      assert.equal(db.getDoc("organizerCampaignRecipients/recipient-" +
        String(i).padStart(3, "0"))?.status, "pending");
    }
  });

test("sending discovery advances past100 active recipient leases", async () => {
  const db = new FakeFirestore({});
  seedCampaign(db, "camp-one");
  for (let i = 0; i < 101; i++) {
    const id = `recipient-${String(i).padStart(3, "0")}`;
    db.setDoc(`organizerCampaignRecipients/${id}`, {
      organizerId: "org-test", campaignId: "camp-one", status: "sending",
      leaseOwner: "other-attempt",
      leaseExpiresAt: stamp(i < 100 ? NOW + 600_000 : NOW - 1),
    });
  }
  await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
  assert.equal(db.getDoc("organizerCampaignRecipients/recipient-100")?.status,
    "sending", "first page remains bounded to100");
  await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
  assert.equal(db.getDoc("organizerCampaignRecipients/recipient-100")?.status,
    "failed", "legacy missing outbox recovery remains fail closed");
  for (let i = 0; i < 100; i++) {
    assert.equal(db.getDoc("organizerCampaignRecipients/recipient-" +
      String(i).padStart(3, "0"))?.status, "sending");
  }
});

test("empty tail wraps across deleted cursor row and finds a new earlier row",
  async () => {
    const db = new FakeFirestore({});
    for (let i = 0; i < 10; i++) seedCampaign(db, `camp-${i}`);
    await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    const cursorPath = `${CAMPAIGN_DISCOVERY_CURSORS}/blockedCampaigns`;
    assert.equal(db.getDoc(cursorPath)?.cursor, "camp-9");
    db.deleteDoc("organizerCampaigns/camp-9");
    seedCampaign(db, "camp-00-new", 1);
    await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    assert.equal(db.getDoc(cursorPath)?.cursor, null);
    await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    assert.equal(
      db.getDoc("organizerCampaignRecipients/camp-00-new-r0")?.status,
      "suppressed");
  });

test("short tail wraps; scheduled and expired-lease queues work",
  async () => {
    const db = new FakeFirestore({});
    for (const id of ["blocked", "scheduled", "stalled", "future", "leased"]) {
      seedCampaign(db, id, 1);
    }
    db.updateDoc("organizerCampaigns/scheduled", {
      status: "scheduled", scheduledAt: stamp(NOW),
    });
    db.updateDoc("organizerCampaigns/future", {
      status: "scheduled", scheduledAt: stamp(NOW + 1),
    });
    db.updateDoc("organizerCampaigns/stalled", {
      status: "sending", leaseExpiresAt: stamp(NOW - 1), leaseOwner: "expired",
    });
    db.updateDoc("organizerCampaigns/leased", {
      status: "sending", leaseExpiresAt: stamp(NOW + 60_000),
      leaseOwner: "live",
    });
    await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    for (const id of ["blocked", "scheduled", "stalled"]) {
      assert.equal(db.getDoc(`organizerCampaignRecipients/${id}-r0`)?.status,
        "suppressed");
    }
    for (const id of ["future", "leased"]) {
      assert.equal(db.getDoc(`organizerCampaignRecipients/${id}-r0`)?.status,
        "pending");
    }
    assert.equal(db.getDoc(`${CAMPAIGN_DISCOVERY_CURSORS}/blockedCampaigns`)
      ?.cursor, null);
  });

test("initial lease uses current time after a delayed transaction read",
  async () => {
    const db = new FakeFirestore({});
    seedCampaign(db, "camp-one", 1);
    let now = NOW;
    let delayed = false;
    const collection = db.collection.bind(db);
    db.collection = (name) => {
      const result = collection(name);
      const doc = result.doc.bind(result);
      result.doc = (id) => {
        const ref = doc(id);
        const get = ref.get.bind(ref);
        ref.get = async () => {
          const snapshot = await get();
          if (!delayed && ref.path === "organizerCampaigns/camp-one") {
            delayed = true;
            now += 240_000;
          }
          return snapshot;
        };
        return ref;
      };
      return result;
    };
    const deps = {...depsFor(db), now: () => stamp(now)};
    await dispatchCampaign({db: db as unknown as Firestore,
      organizerId: "org-test", campaignId: "camp-one",
      expectedRevision: null, deps});
    assert.equal(delayed, true);
    assert.equal(db.getDoc("organizerCampaignRecipients/camp-one-r0")?.status,
      "suppressed");
    assert.equal(db.getDoc("organizerCampaigns/camp-one")?.status, "completed");
  });

test("finish cannot clear expired lease after a delayed remaining-count read",
  async () => {
    const db = new FakeFirestore({});
    seedCampaign(db, "camp-one");
    let now = NOW;
    let delayed = false;
    const runQuery = db.runQuery.bind(db);
    db.runQuery = async (query) => {
      const result = await runQuery(query);
      if (query.collectionPath === "organizerCampaignRecipients" &&
          query.wheres.some((where) => where.field === "status" &&
            where.op === "in")) {
        delayed = true;
        now += 240_000;
      }
      return result;
    };
    await dispatchCampaign({db: db as unknown as Firestore,
      organizerId: "org-test", campaignId: "camp-one", expectedRevision: null,
      deps: {...depsFor(db), now: () => stamp(now)}});
    assert.equal(delayed, true);
    const campaign = db.getDoc("organizerCampaigns/camp-one");
    assert.equal(campaign?.status, "resolving");
    assert.ok(campaign?.leaseOwner);
    assert.equal((campaign?.leaseExpiresAt as admin.firestore.Timestamp)
      .toMillis(), NOW + 180_000);
  });

test("malformed recovery cannot hide a later row in the same short page",
  async () => {
    const db = new FakeFirestore({});
    seedCampaign(db, "camp-one");
    for (const id of ["recipient-a", "recipient-b"]) {
      db.setDoc(`organizerCampaignRecipients/${id}`, {
        organizerId: "org-test", campaignId: "camp-one", status: "sending",
        leaseOwner: "legacy", leaseExpiresAt: stamp(NOW - 1),
      });
    }
    db.setDoc(`campaignDeliveryMessages/${campaignMessageIdFor(
      "org-test", "camp-one", "recipient-a")}`, {malformed: true});
    await dispatchScheduledOrganizerCampaignsHandler(depsFor(db));
    assert.equal(db.getDoc("organizerCampaignRecipients/recipient-a")?.status,
      "sending", "malformed evidence cannot authorize send or adjudication");
    assert.equal(db.getDoc("organizerCampaignRecipients/recipient-b")?.status,
      "failed", "independent same-page recovery still runs");
    const cursor = [...db.docs.values()].find((row) =>
      row.queueKind === "sendingRecipients");
    assert.equal(cursor?.cursor, null, "completed short page wraps");
  });
