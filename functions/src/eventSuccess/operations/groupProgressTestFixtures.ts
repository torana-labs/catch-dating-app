import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../../operations/testFirestore";
import type {ProgressContext} from "./groupProgressSource";
import {EventGroupProgressStore} from "./groupProgressStore";

/** The generic fake has no SDK creation metadata. Keep it explicit here. */
export class ProgressFirestore extends FakeFirestore {
  generation = Timestamp.fromMillis(1);
  beforeRead: ((path: string) => void) | undefined;
  collection(path: string) {
    const collection = super.collection(path);
    const doc = collection.doc.bind(collection);
    collection.doc = (id: string) => {
      const ref = doc(id);
      const get = ref.get.bind(ref);
      ref.get = async () => {
        this.beforeRead?.(path + "/" + id);
        return Object.assign(await get(), {createTime: this.generation});
      };
      return ref;
    };
    return collection;
  }
}

export const progressFixtureManager = "host-1";
const fixture = (name: string) => JSON.parse(readFileSync(
  "../contracts/fixtures/valid/" + name + ".json", "utf8"));
const stamp = (at: number) => ({_seconds: Math.floor(at / 1000),
  _nanoseconds: at % 1000 * 1_000_000});

/** Canonical source and a real manager command for live boundary tests. */
export async function seedJoiningProgress(db: Firestore,
  context: ProgressContext, now: number, endAt: number) {
  const event = {...fixture("event_doc"), organizerId: context.organizerId,
    name: "Friday social",
    startTime: stamp(now - 1000), endTime: stamp(endAt),
    eventFormat: {version: 1, activityKind: "barCrawl",
      interactionModel: "freeFormMixer"},
    itinerary: ["one", "two"].map((id, i) => ({id, kind: "stop",
      offsetMinutes: i * 30, title: "Stop " + id,
      location: {name: "stop " + id, latitude: 22.7 + i / 100,
        longitude: 75.8}}))};
  const schema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  const organizer = {...Object.fromEntries(Object.entries(fixture(
    "organizer_doc"))
    .filter(([key]) => key in schema.properties)), followerCount: 12,
  organizerPhotos: [], organizerType: "community"};
  const plan = {...fixture("event_success_plan_doc"),
    eventId: context.eventId, organizerId: context.organizerId, status: "live"};
  await db.runTransaction(async (tx) => {
    for (const [collection, id, value] of [
      ["events", context.eventId, event],
      ["organizers", context.organizerId, organizer],
      ["eventSuccessPlans", context.eventId, plan],
    ] as const) tx.set(db.collection(collection).doc(id), value);
  });
  const store = new EventGroupProgressStore(db, () => now);
  const scope = {context, groupId: "event:whole"};
  const initial = (await store.get(progressFixtureManager, scope)).view;
  const destination = initial.destinations.find((d) =>
    d.target.kind === "itineraryStop")!.target;
  const result = await store.confirmDeparture(progressFixtureManager, {
    expectedSourceHash: initial.sourceHash, command: {
      kind: "confirmDeparture", context, eventId: context.eventId,
      operationId: "fixture-departure", payload: {groupId: scope.groupId,
        destination, expectedProgressRevision: initial.revision}},
  });
  assert.ok(result.view.guidance);
  const confirm = async (stopId: string) => {
    const view = (await store.get(progressFixtureManager, scope)).view;
    const target = view.destinations.find((d) =>
      d.target.kind === "itineraryStop" && d.target.stopId === stopId)!.target;
    const next = await store.confirmDeparture(progressFixtureManager, {
      expectedSourceHash: view.sourceHash, command: {
        kind: "confirmDeparture", context, eventId: context.eventId,
        operationId: "fixture-departure:" + view.revision, payload: {
          groupId: scope.groupId, destination: target,
          expectedProgressRevision: view.revision}},
    });
    assert.ok(next.view.guidance);
    return next.view.guidance;
  };
  return {guidance: result.view.guidance, view: result.view, store, scope,
    event, plan, confirm};
}
