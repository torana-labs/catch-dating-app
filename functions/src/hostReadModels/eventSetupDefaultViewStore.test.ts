import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {contractValidator} from "../shared/contractTestValidators";
import {eventSetupDefaultsDependencies} from
  "../organizers/eventSetupDefaults/dependencies";
import {projectManagerEventSetupDefaults} from
  "../organizers/eventSetupDefaults/service";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {
  backfillEventSetupDefaultView,
  reconcileEventSetupDefaultView,
} from "./eventSetupDefaultViewStore";

type Data = Record<string, unknown>;

const validateView = contractValidator("HostEventSetupDefaultViewDocument");
const nowMillis = Date.parse("2026-09-01T10:00:00.000Z");
const clock = (millis = nowMillis) => ({
  now: () => Timestamp.fromMillis(millis),
  defaults: eventSetupDefaultsDependencies,
});

function organizer(patch: Data = {}): Data {
  return {hostUserId: "host-1", hostUserIds: [], hostProfiles: [],
    ownerUserId: "host-1", status: "active", archived: false,
    locationCityId: "in-mh-mumbai", locationMarketId: "in-mh-mumbai",
    hostDefaults: {}, ...patch};
}

function store(docs: Record<string, Data> = {}): AudienceTestStore {
  return new AudienceTestStore({"organizers/org": organizer(), ...docs});
}

const view = (db: AudienceTestStore) =>
  db.docs["hostEventSetupDefaultViews/org"] as Data | undefined;

test("the view holds the callable's projection, hashes included", async () => {
  const defaults = {organizerId: "org", revision: 2,
    eventSetup: {timezone: "Asia/Kolkata", currency: "INR"}};
  const db = store({"organizerEventSetupDefaults/org": defaults});
  const outcome = await reconcileEventSetupDefaultView(db.asFirestore(),
    "org", clock());
  assert.deepEqual(outcome, {kind: "complete", revision: 1});
  const written = view(db)!;
  assert.ok(validateView(written), JSON.stringify(validateView.errors));
  assert.deepEqual(written.view, projectManagerEventSetupDefaults("org",
    organizer() as unknown as OrganizerDocument, defaults,
    eventSetupDefaultsDependencies(db.asFirestore())));
  assert.equal(written.sourceCoverage, "complete");
  assert.equal(written.incompleteSource, null);
});

test("an organizer without saved defaults still has a view", async () => {
  const db = store();
  await reconcileEventSetupDefaultView(db.asFirestore(), "org", clock());
  const projected = view(db)!.view as Data;
  assert.equal(projected.preferencesRevision, 0);
  assert.deepEqual(projected.city,
    {cityId: "in-mh-mumbai", marketId: "in-mh-mumbai"});
});

test("an unchanged projection writes nothing; a changed one moves the revision",
  async () => {
    const db = store();
    await reconcileEventSetupDefaultView(db.asFirestore(), "org", clock());
    const first = view(db);
    assert.deepEqual(await reconcileEventSetupDefaultView(db.asFirestore(),
      "org", clock(nowMillis + 1)), {kind: "unchanged", revision: 1});
    assert.deepEqual(view(db), first);
    db.docs["organizers/org"] = organizer({locationCityId: "in-dl-delhi",
      locationMarketId: "in-dl-delhi-ncr"});
    assert.deepEqual(await reconcileEventSetupDefaultView(db.asFirestore(),
      "org", clock()), {kind: "complete", revision: 2});
    assert.notEqual((view(db)!.view as Data).basicsReviewedHash,
      (first!.view as Data).basicsReviewedHash);
  });

test("invalid defaults are recorded with their source and keep the last view",
  async () => {
    const db = store();
    await reconcileEventSetupDefaultView(db.asFirestore(), "org", clock());
    const previous = view(db)!.view;
    db.docs["organizerEventSetupDefaults/org"] = {organizerId: "other",
      revision: 1, eventSetup: {}};
    const outcome = await reconcileEventSetupDefaultView(db.asFirestore(),
      "org", clock());
    assert.equal(outcome.kind, "invalidSource");
    assert.equal(outcome.kind === "invalidSource" &&
      outcome.incompleteSource, "organizerEventSetupDefaults");
    const written = view(db)!;
    assert.ok(validateView(written), JSON.stringify(validateView.errors));
    assert.deepEqual(written.view, previous);
    assert.equal(written.sourceCoverage, "invalidSource");
    db.docs["organizerEventSetupDefaults/org"] = {organizerId: "org",
      revision: 1, eventSetup: {timezone: ""}};
    assert.equal((await reconcileEventSetupDefaultView(db.asFirestore(),
      "org", clock())).kind, "invalidSource");
  });

test("a first evaluation that is already invalid writes a null view",
  async () => {
    const db = store({"organizerEventSetupDefaults/org": {organizerId: "org",
      revision: 0, eventSetup: {}}});
    await reconcileEventSetupDefaultView(db.asFirestore(), "org", clock());
    assert.equal(view(db)!.view, null);
    assert.ok(validateView(view(db)), JSON.stringify(validateView.errors));
  });

test("an organizer that is gone has no view", async () => {
  const db = store();
  await reconcileEventSetupDefaultView(db.asFirestore(), "org", clock());
  delete db.docs["organizers/org"];
  assert.deepEqual(await reconcileEventSetupDefaultView(db.asFirestore(),
    "org", clock()), {kind: "removed", existed: true});
  assert.equal(view(db), undefined);
});

test("backfill reports and applies for one organizer", async () => {
  const db = store();
  assert.deepEqual(await backfillEventSetupDefaultView(db.asFirestore(), "org",
    false), {viewExists: false, outcome: null});
  const applied = await backfillEventSetupDefaultView(db.asFirestore(), "org",
    true);
  assert.equal(applied.viewExists, true);
  assert.equal(applied.outcome?.kind, "complete");
});
