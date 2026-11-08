import assert from "node:assert/strict";
import test from "node:test";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {commitmentCollections} from "../events/progressiveSetup/commitments";
import {
  eventSetupOrganizerFields,
  resolveEventSetupViewEventIds,
} from "./eventSetupViewTriggers";

type Data = Record<string, unknown>;

const db = (docs: Record<string, Data> = {}) =>
  new AudienceTestStore(docs).asFirestore();

test("event writes route only when a side carries a setupRevision",
  async () => {
    assert.deepEqual(await resolveEventSetupViewEventIds(db(), "events", "e1",
      {organizerId: "org"}, {organizerId: "org", bookedCount: 1}), []);
    assert.deepEqual(await resolveEventSetupViewEventIds(db(), "events", "e1",
      undefined, {organizerId: "org", setupRevision: 1}), ["e1"]);
    // Losing the field deletes the view, so it routes too.
    assert.deepEqual(await resolveEventSetupViewEventIds(db(), "events", "e1",
      {setupRevision: 2}, {organizerId: "org"}), ["e1"]);
    // Every update of a setup event evaluates, published ones included.
    assert.deepEqual(await resolveEventSetupViewEventIds(db(), "events", "e1",
      {setupRevision: 3, publicationState: "published", bookedCount: 1},
      {setupRevision: 3, publicationState: "published", bookedCount: 2}),
    ["e1"]);
  });

test("preference writes always route to their event", async () => {
  assert.deepEqual(await resolveEventSetupViewEventIds(db(),
    "eventSetupPreferences", "e1", {revision: 1}, {revision: 1}), ["e1"]);
  assert.deepEqual(await resolveEventSetupViewEventIds(db(),
    "eventSetupPreferences", "e1", {revision: 1}, undefined), ["e1"]);
});

test("organizer writes route to every setup event when a read field changes",
  async () => {
    const docs: Record<string, Data> = {
      "events/legacy": {organizerId: "org"},
      "events/foreign": {organizerId: "other", setupRevision: 1},
    };
    for (let index = 0; index < 205; index++) {
      docs[`events/e${String(index).padStart(3, "0")}`] =
        {organizerId: "org", setupRevision: 1};
    }
    const store = db(docs);
    const base = {appVisibility: "discoverable", status: "active",
      archived: false, locationCityId: "c", locationMarketId: "m",
      description: "Old"};
    assert.deepEqual(await resolveEventSetupViewEventIds(store, "organizers",
      "org", base, {...base, description: "New"}), []);
    for (const field of eventSetupOrganizerFields) {
      const ids = await resolveEventSetupViewEventIds(store, "organizers",
        "org", base, {...base, [field]: "changed"});
      assert.equal(ids.length, 205, field);
      assert.equal(ids.includes("legacy"), false);
      assert.equal(ids.includes("foreign"), false);
    }
    assert.equal((await resolveEventSetupViewEventIds(store, "organizers",
      "org", undefined, base)).length, 205);
  });

test("commitment rows route on create and delete, never on update",
  async () => {
    for (const collection of commitmentCollections) {
      if (collection === "payments") continue;
      assert.deepEqual(await resolveEventSetupViewEventIds(db(), collection,
        "row", undefined, {eventId: "e1"}), ["e1"], collection);
      assert.deepEqual(await resolveEventSetupViewEventIds(db(), collection,
        "row", {eventId: "e1"}, undefined), ["e1"], collection);
      assert.deepEqual(await resolveEventSetupViewEventIds(db(), collection,
        "row", {eventId: "e1", status: "a"}, {eventId: "e1", status: "b"}),
      [], collection);
      assert.deepEqual(await resolveEventSetupViewEventIds(db(), collection,
        "row", undefined, {status: "no event"}), [], collection);
    }
  });

test("payments reroute when their status or amount moves the gross",
  async () => {
    assert.deepEqual(await resolveEventSetupViewEventIds(db(), "payments",
      "row", {eventId: "e1", status: "pending", amount: 100},
      {eventId: "e1", status: "completed", amount: 100}), ["e1"]);
    assert.deepEqual(await resolveEventSetupViewEventIds(db(), "payments",
      "row", {eventId: "e1", status: "completed", amount: 100},
      {eventId: "e1", status: "completed", amount: 100, note: "x"}), []);
  });

test("only an event's start reminder routes its arrival message", async () => {
  const moment = {scopeKind: "event", scopeId: "e1", status: "armed"};
  assert.deepEqual(await resolveEventSetupViewEventIds(db(),
    "organizerMoments", "e1_event_start_reminder", undefined, moment), ["e1"]);
  assert.deepEqual(await resolveEventSetupViewEventIds(db(),
    "organizerMoments", "m2", undefined, moment), []);
});
