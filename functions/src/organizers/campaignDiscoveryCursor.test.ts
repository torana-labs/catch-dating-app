import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {CAMPAIGN_DISCOVERY_CURSORS, openCampaignDiscovery,
  renewCampaignDiscoveryLease} from "./campaignDiscoveryCursor";

const NOW = 1_800_000_000_000;
const lease = {organizerId: "org-test", campaignId: "camp-test",
  leaseOwner: "owner-a"};
const stamp = (n: number) => admin.firestore.Timestamp.fromMillis(n);
function fixture() {
  const db = new FakeFirestore({"organizerCampaigns/camp-test": {
    organizerId: lease.organizerId, leaseOwner: lease.leaseOwner,
    status: "sending", leaseExpiresAt: stamp(NOW + 180_000),
  }});
  let now = NOW;
  const input = {db: db as unknown as Firestore,
    projectId: "demo-catch-rules", clock: () => now};
  return {db, input, setNow: (value: number) => {
    now = value;
  }};
}
const blocked = {kind: "blockedCampaigns" as const};
const pending = {kind: "pendingRecipients" as const, lease};

function cursorRows(db: FakeFirestore) {
  return [...db.docs.entries()].filter(([key]) =>
    key.startsWith(CAMPAIGN_DISCOVERY_CURSORS + "/"));
}

test("missing cursor starts at head and restart preserves committed position",
  async () => {
    const {input} = fixture();
    const first = await openCampaignDiscovery({...input, queue: pending});
    assert.equal(first.cursor, null);
    await first.checkpoint("recipient-100");
    const restarted = await openCampaignDiscovery({...input, queue: pending});
    assert.equal(restarted.cursor, "recipient-100");
    await restarted.checkpoint(null);
    assert.equal((await openCampaignDiscovery({...input, queue: pending}))
      .cursor, null);
  });

test("revision fences stale page and wrap, including null-position ABA",
  async () => {
    const {db, input} = fixture();
    const stale = await openCampaignDiscovery({...input, queue: blocked});
    const winner = await openCampaignDiscovery({...input, queue: blocked});
    await winner.checkpoint("camp-z");
    await assert.rejects(stale.checkpoint("camp-a"), /cursor changed/);
    await winner.checkpoint(null);
    await assert.rejects(stale.checkpoint("camp-a"), /cursor changed/);
    const snapshot = cursorRows(db)[0][1];
    assert.equal(snapshot.revision, 2);
    assert.equal(snapshot.cursor, null);
  });

test("simultaneous same-handle checkpoints cannot retry with a newer CAS token",
  async () => {
    const {input} = fixture();
    const cursor = await openCampaignDiscovery({...input, queue: blocked});
    const results = await Promise.allSettled([
      cursor.checkpoint("camp-b"), cursor.checkpoint("camp-a"),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const failed = results.find((r) => r.status === "rejected");
    assert.ok(failed?.status === "rejected");
    assert.match(String(failed.reason), /cursor changed/);
    assert.equal((await openCampaignDiscovery({...input, queue: blocked}))
      .cursor, "camp-b");
  });

test("pending and sending cursors are independent within the same campaign",
  async () => {
    const {input} = fixture();
    const first = await openCampaignDiscovery({...input, queue: pending});
    await first.checkpoint("recipient-100");
    const other = await openCampaignDiscovery({...input,
      queue: {kind: "sendingRecipients", lease}});
    assert.equal(other.cursor, null);
    await other.checkpoint("recipient-200");
    assert.equal((await openCampaignDiscovery({...input, queue: pending}))
      .cursor, "recipient-100");
  });

test("replacement owner blocks stale checkpoint, wrap and lease refresh",
  async () => {
    const {db, input} = fixture();
    const cursor = await openCampaignDiscovery({...input, queue: pending});
    await cursor.checkpoint("recipient-100");
    db.updateDoc("organizerCampaigns/camp-test", {leaseOwner: "owner-b"});
    const before = structuredClone(cursorRows(db));
    await assert.rejects(cursor.checkpoint("recipient-200"), /lease/);
    await assert.rejects(cursor.checkpoint(null), /lease/);
    await assert.rejects(renewCampaignDiscoveryLease({...input, lease,
      durationMillis: 180_000}), /lease/);
    assert.deepEqual(cursorRows(db), before);
    assert.equal(db.getDoc("organizerCampaigns/camp-test")?.leaseOwner,
      "owner-b");
    const next = await openCampaignDiscovery({...input,
      queue: {kind: "pendingRecipients",
        lease: {...lease, leaseOwner: "owner-b"}}});
    assert.equal(next.cursor, "recipient-100");
  });

test("expired lease cannot be revived",
  async () => {
    const {db, input, setNow} = fixture();
    const cursor = await openCampaignDiscovery({...input, queue: pending});
    setNow(NOW + 180_000);
    await assert.rejects(cursor.checkpoint("recipient-100"), /lease/);
    await assert.rejects(renewCampaignDiscoveryLease({...input, lease,
      durationMillis: 180_000}), /lease/);
    assert.equal(cursorRows(db).length, 0);
  });

test("transaction retry rechecks replacement owner without committing cursor",
  async () => {
    const {db, input} = fixture();
    const cursor = await openCampaignDiscovery({...input, queue: pending});
    db.beforeCommit = async () => {
      db.beforeCommit = undefined;
      db.updateDoc("organizerCampaigns/camp-test", {leaseOwner: "owner-b"});
    };
    await assert.rejects(cursor.checkpoint("recipient-100"), /lease/);
    assert.equal(cursorRows(db).length, 0);
  });

test("malformed, cross-project and cross-queue persisted state fail closed",
  async () => {
    for (const patch of [
      {projectId: "demo-other-project"}, {queueKind: "sendingRecipients"},
      {organizerId: "other"}, {schema: "2"}, {revision: 0},
      {cursor: "nested/id"}, {cursor: "."}, {cursor: "é".repeat(751)},
      {extra: true},
    ]) {
      const {db, input} = fixture();
      const cursor = await openCampaignDiscovery({...input, queue: blocked});
      await cursor.checkpoint("camp-z");
      const [key] = cursorRows(db)[0];
      db.updateDoc(key, patch);
      await assert.rejects(openCampaignDiscovery({...input, queue: blocked}));
    }
  });

test("invalid scope, next position, clock and exhausted revision never write",
  async () => {
    const {db, input, setNow} = fixture();
    await assert.rejects(openCampaignDiscovery({...input,
      projectId: "", queue: blocked}), /scope/);
    const cursor = await openCampaignDiscovery({...input, queue: blocked});
    for (const id of ["", "..", "nested/id", "é".repeat(751)]) {
      await assert.rejects(cursor.checkpoint(id), /document id/);
    }
    assert.equal(cursorRows(db).length, 0);
    await cursor.checkpoint("camp-z");
    setNow(NOW - 1);
    await assert.rejects(cursor.checkpoint(null), /progression/);
    setNow(NOW);
    const [key] = cursorRows(db)[0];
    db.updateDoc(key, {revision: Number.MAX_SAFE_INTEGER});
    const exhausted = await openCampaignDiscovery({...input, queue: blocked});
    await assert.rejects(exhausted.checkpoint(null), /progression/);
    setNow(Number.NaN);
    await assert.rejects(openCampaignDiscovery({...input, queue: blocked}),
      /clock/);
  });
