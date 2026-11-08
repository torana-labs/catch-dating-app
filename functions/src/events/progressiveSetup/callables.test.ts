import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  createPrivateEventSeriesHandler,
  createPrivateEventSetupHandler,
  listPrivateEventSetupsHandler, listOfferEventTargetsHandler,
  updatePrivateEventDetailsHandler, setEventPublicationHandler,
  reconcilePrivateEventSeatsHandler,
  SetupCallableDependencies,
  updatePrivateEventBasicsHandler,
  updatePrivateEventPreferencesHandler,
} from "./callables";

const request = (data: unknown, uid?: string) => ({
  data, ...(uid ? {auth: {uid, token: {}}} : {}),
}) as CallableRequest<unknown>;

const create = {organizerId: "org1", requestId: "request-1", basics: {
  name: "Mixer", city: {mode: "set", value: {
    cityId: "in-mh-mumbai", marketId: "in-mh-mumbai",
  }}, localDate: "2026-10-01", localStartTime: "18:30",
  timezone: {mode: "set", value: "Asia/Kolkata"},
}};

test("callable auth and payload validation precede rate or database access",
  async () => {
    const deps: SetupCallableDependencies = {
      firestore: () => {
        throw new Error("Unexpected database access");
      },
      checkRateLimit: async () => {
        throw new Error("Unexpected rate charge");
      },
      service: () => {
        throw new Error("Unexpected service access");
      },
    };
    for (const handler of [createPrivateEventSetupHandler,
      createPrivateEventSeriesHandler,
      updatePrivateEventBasicsHandler,
      updatePrivateEventPreferencesHandler,
      listPrivateEventSetupsHandler, listOfferEventTargetsHandler,
      updatePrivateEventDetailsHandler, setEventPublicationHandler,
      reconcilePrivateEventSeatsHandler]) {
      await assert.rejects(handler(request({}), deps),
        (e) => e instanceof HttpsError && e.code === "unauthenticated");
      await assert.rejects(handler(request({}, "host1"), deps),
        (e) => e instanceof HttpsError && e.code === "invalid-argument");
    }
  });

test("create and edit use separate budgets and reject server-owned fields",
  async () => {
    const actions: string[] = [];
    const deps: SetupCallableDependencies = {
      firestore: () => ({}) as FirebaseFirestore.Firestore,
      checkRateLimit: async (_db, _uid, action) => {
        actions.push(action);
        throw new HttpsError("resource-exhausted", "Budget spent.");
      },
      service: () => {
        throw new Error("Unexpected service access");
      },
    };
    await assert.rejects(createPrivateEventSetupHandler(
      request(create, "host1"), deps),
    (e) => e instanceof HttpsError && e.code === "resource-exhausted");
    await assert.rejects(updatePrivateEventBasicsHandler(request({
      ...create, eventId: "event1", expectedSetupRevision: 1,
    }, "host1"), deps),
    (e) => e instanceof HttpsError && e.code === "resource-exhausted");
    assert.deepEqual(actions,
      ["createPrivateEventSetup", "updatePrivateEventBasics"]);
    await assert.rejects(createPrivateEventSetupHandler(request({
      ...create, privacyMigrationReady: true,
    }, "host1"), deps),
    (e) => e instanceof HttpsError && e.code === "invalid-argument");
    assert.equal(actions.length, 2);
  });

test("details rejects unsupported activation fields before a database read",
  async () => {
    const command = {organizerId: "org1", eventId: "event1",
      requestId: "details-one", expectedSetupRevision: 1,
      reviewedDefaultsHash: "a".repeat(64),
      details: {durationMinutes: {mode: "set", value: 90}}};
    const deps: SetupCallableDependencies = {
      firestore: () => {
        throw new Error("Unexpected database read");
      },
      checkRateLimit: async () => {
        throw new Error("Unexpected rate");
      },
      service: () => {
        throw new Error("Unexpected mutation");
      },
    };
    for (const details of [
      {...command.details, publicationState: "published"},
      {...command.details, capacityLimit: 50},
      {durationMinutes: {mode: "inherit", value: 90}},
      {eventFormat: {mode: "inherit"}},
      {},
    ]) {
      await assert.rejects(updatePrivateEventDetailsHandler(
        request({...command, details}, "host1"), deps),
      (e) => e instanceof HttpsError && e.code === "invalid-argument");
    }
  });

test("a series spends its own budget, not the single-create one",
  async () => {
    const actions: string[] = [];
    const deps: SetupCallableDependencies = {
      firestore: () => ({}) as FirebaseFirestore.Firestore,
      checkRateLimit: async (_db, _uid, action) => {
        actions.push(action);
        throw new HttpsError("resource-exhausted", "Budget spent.");
      },
      service: () => {
        throw new Error("Unexpected service access");
      },
    };
    await assert.rejects(createPrivateEventSeriesHandler(request({
      organizerId: "org1", requestId: "series-1", template: create.basics,
      cadence: {kind: "weekly", weekday: "thursday", count: 4},
    }, "host1"), deps), (e) => e instanceof HttpsError &&
      e.code === "resource-exhausted");
    assert.deepEqual(actions, ["createPrivateEventSeries"]);
  });
