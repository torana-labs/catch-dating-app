import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {contractValidator} from "../shared/contractTestValidators";
import {
  backfillProviderConnectionView,
  maxProviderConnections,
  reconcileProviderConnectionView,
} from "./providerConnectionViewStore";
import {
  resolveProviderConnectionViewOrganizerIds,
} from "./providerConnectionViewTriggers";

type Data = Record<string, unknown>;

const nowMillis = Date.parse("2026-09-01T10:00:00.000Z");
const at = (millis: number) => Timestamp.fromMillis(millis);
const clock = (millis = nowMillis) => ({now: () => at(millis)});
const validateView = contractValidator("HostProviderConnectionViewDocument");
const validateConnection =
  contractValidator("OrganizerProviderConnectionDocument");

function organizer(): Data {
  return {name: "Saket Run Club", hostUserId: "owner-1",
    ownerUserId: "owner-1", hostUserIds: ["owner-1"], hostProfiles: []};
}

function connection(index: number, patch: Data = {}): Data {
  return {
    organizerId: "org",
    provider: "luma",
    adapterClass: "A",
    status: "active",
    externalAccountId: `cal-${index}`,
    externalAccountName: `Calendar ${index}`,
    secretVersionResource:
      `projects/catch/secrets/luma-${index}/versions/1`,
    syncMode: "manualPoll",
    capabilities: {eventList: true, rosterIdentity: true,
      registrationStatus: true, providerCheckIn: true, orderAmount: false,
      refundStatus: false, referralCode: false, webhooks: false,
      writeBookings: false},
    connectedByUid: "owner-1",
    revision: 2,
    createdAt: at(nowMillis - 3_600_000),
    updatedAt: at(nowMillis - 60_000),
    lastHealthSyncAt: at(nowMillis - 60_000),
    lastSuccessfulSyncAt: null,
    lastErrorCode: "providerRateLimited",
    disconnectedAt: null,
    ...patch,
  };
}

const view = (db: AudienceTestStore) =>
  db.docs["hostProviderConnectionViews/org"] as Data | undefined;

test("a manager-safe row per connection, without secrets or errors",
  async () => {
    assert.ok(validateConnection(connection(1)),
      JSON.stringify(validateConnection.errors));
    const db = new AudienceTestStore({
      "organizers/org": organizer(),
      "organizerProviderConnections/opc_b": connection(2),
      "organizerProviderConnections/opc_a": connection(1),
      "organizerProviderConnections/opc_other": {
        ...connection(3), organizerId: "other"},
    });
    const outcome = await reconcileProviderConnectionView(db.asFirestore(),
      "org", clock());
    assert.deepEqual(outcome, {kind: "complete", revision: 1,
      connections: 2});
    const written = view(db)!;
    assert.ok(validateView(written), JSON.stringify(validateView.errors));
    assert.equal(written.sourceCoverage, "complete");
    assert.equal(written.incompleteSource, null);
    const rows = written.connections as Data[];
    assert.deepEqual(rows.map((row) => row.connectionId), ["opc_a", "opc_b"]);
    assert.deepEqual(rows[0], {
      connectionId: "opc_a",
      provider: "luma",
      status: "active",
      externalAccountId: "cal-1",
      externalAccountName: "Calendar 1",
      syncMode: "manualPoll",
      capabilities: connection(1).capabilities,
      revision: 2,
      lastHealthSyncAtMillis: nowMillis - 60_000,
      lastSuccessfulSyncAtMillis: null,
    });
    const serialized = JSON.stringify(written);
    for (const secret of ["secretVersionResource", "connectedByUid",
      "lastErrorCode", "projects/catch/secrets", "providerRateLimited"]) {
      assert.equal(serialized.includes(secret), false, secret);
    }
  });

test("an unchanged evaluation writes nothing; a change bumps the revision",
  async () => {
    const db = new AudienceTestStore({
      "organizers/org": organizer(),
      "organizerProviderConnections/opc_a": connection(1),
    });
    await reconcileProviderConnectionView(db.asFirestore(), "org", clock());
    const first = view(db);
    const again = await reconcileProviderConnectionView(db.asFirestore(), "org",
      clock(nowMillis + 1000));
    assert.deepEqual(again, {kind: "unchanged", revision: 1});
    assert.equal(view(db), first);
    db.docs["organizerProviderConnections/opc_a"] =
      connection(1, {status: "credentialRevoked", revision: 3});
    const changed = await reconcileProviderConnectionView(db.asFirestore(),
      "org", clock(nowMillis + 2000));
    assert.deepEqual(changed, {kind: "complete", revision: 2,
      connections: 1});
    const row = (view(db)!.connections as Data[])[0];
    assert.equal(row.status, "credentialRevoked");
    assert.equal(row.revision, 3);
    assert.equal((view(db)!.evaluatedAt as Timestamp).toMillis(),
      nowMillis + 2000);
  });

test("an organizer without connections gets a complete, empty view",
  async () => {
    const db = new AudienceTestStore({"organizers/org": organizer()});
    const outcome = await reconcileProviderConnectionView(db.asFirestore(),
      "org", clock());
    assert.deepEqual(outcome, {kind: "complete", revision: 1,
      connections: 0});
    assert.ok(validateView(view(db)), JSON.stringify(validateView.errors));
    assert.deepEqual(view(db)!.connections, []);
  });

test("more than 20 connections is over cap with the first 20 kept",
  async () => {
    const docs: Record<string, Data> = {"organizers/org": organizer()};
    for (let index = 0; index <= maxProviderConnections; index++) {
      const id = `opc_${String(index).padStart(2, "0")}`;
      docs[`organizerProviderConnections/${id}`] = connection(index);
    }
    const db = new AudienceTestStore(docs);
    const outcome = await reconcileProviderConnectionView(db.asFirestore(),
      "org", clock());
    assert.deepEqual(outcome, {kind: "overCap", revision: 1});
    const written = view(db)!;
    assert.ok(validateView(written), JSON.stringify(validateView.errors));
    assert.equal(written.sourceCoverage, "overCap");
    assert.equal(written.incompleteSource, "organizerProviderConnections");
    assert.equal((written.connections as Data[]).length, 20);
    assert.equal((written.connections as Data[]).at(-1)!.connectionId,
      "opc_19");
  });

test("an invalid connection is recorded and keeps the previous rows",
  async () => {
    const db = new AudienceTestStore({
      "organizers/org": organizer(),
      "organizerProviderConnections/opc_a": connection(1),
    });
    await reconcileProviderConnectionView(db.asFirestore(), "org", clock());
    const previousRows = view(db)!.connections;
    db.docs["organizerProviderConnections/opc_b"] =
      connection(2, {capabilities: {eventList: "yes"}});
    const outcome = await reconcileProviderConnectionView(db.asFirestore(),
      "org", clock(nowMillis + 1000));
    assert.equal(outcome.kind, "invalidSource");
    const written = view(db)!;
    assert.ok(validateView(written), JSON.stringify(validateView.errors));
    assert.equal(written.sourceCoverage, "invalidSource");
    assert.equal(written.incompleteSource, "organizerProviderConnections");
    assert.deepEqual(written.connections, previousRows);
    assert.equal(written.revision, 2);
  });

test("a deleted organizer loses its view", async () => {
  const db = new AudienceTestStore({
    "organizers/org": organizer(),
    "organizerProviderConnections/opc_a": connection(1),
  });
  await reconcileProviderConnectionView(db.asFirestore(), "org", clock());
  delete db.docs["organizers/org"];
  assert.deepEqual(
    await reconcileProviderConnectionView(db.asFirestore(), "org", clock()),
    {kind: "removed", existed: true});
  assert.equal(view(db), undefined);
});

test("backfill reports without writing unless applied", async () => {
  const db = new AudienceTestStore({
    "organizers/org": organizer(),
    "organizerProviderConnections/opc_a": connection(1),
  });
  assert.deepEqual(
    await backfillProviderConnectionView(db.asFirestore(), "org", false),
    {connections: 1, viewExists: false, outcome: null});
  const applied = await backfillProviderConnectionView(db.asFirestore(), "org",
    true);
  assert.equal(applied.viewExists, true);
  assert.equal(applied.outcome?.kind, "complete");
});

test("triggers route connections by organizer and organizers by lifecycle",
  () => {
    assert.deepEqual(resolveProviderConnectionViewOrganizerIds(
      "organizerProviderConnections", "opc_a", connection(1),
      {...connection(1), organizerId: "org-2"}), ["org", "org-2"]);
    assert.deepEqual(resolveProviderConnectionViewOrganizerIds(
      "organizerProviderConnections", "opc_a", undefined, connection(1)),
    ["org"]);
    assert.deepEqual(resolveProviderConnectionViewOrganizerIds(
      "organizers", "org", undefined, organizer()), ["org"]);
    assert.deepEqual(resolveProviderConnectionViewOrganizerIds(
      "organizers", "org", organizer(), undefined), ["org"]);
    assert.deepEqual(resolveProviderConnectionViewOrganizerIds(
      "organizers", "org", organizer(), {...organizer(), name: "New"}), []);
  });
