import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import {createOrganizerFormHandler, updateOrganizerFormDraftHandler,
  publishOrganizerFormHandler, setOrganizerFormLifecycleHandler,
  duplicateOrganizerFormHandler} from "./organizerForms";

const now = Timestamp.fromDate(new Date("2026-09-24T00:00:00Z"));
function fixture() {
  const event = {
    organizerId: "org1", name: "Saturday mixer",
    startTime: Timestamp.fromDate(new Date("2026-10-02T12:30:00Z")),
    status: "active", publicationState: "private", setupRevision: 1,
    publicRegistrationEnabled: false,
    eventCityId: "city1", eventMarketId: "market1",
    eventLocalDate: "2026-10-02", eventLocalStartTime: "18:00",
    eventTimezone: "Asia/Kolkata",
    setupDefaults: {
      city: {value: {cityId: "city1", marketId: "market1"}, source: "event"},
      timezone: {value: "Asia/Kolkata", source: "event"},
      organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64),
    },
    bookedCount: 0, checkedInCount: 0, waitlistedCount: 0,
    cancelledAt: null, cancellationReason: null,
    genderCounts: {}, cohortCounts: {}, waitlistedCohortCounts: {},
  };
  const store = new AudienceTestStore({
    "organizers/org1": {ownerUserId: "host1", hostUserIds: ["host1"],
      hostProfiles: []},
    "events/event1": event,
  });
  const deps = {firestore: () => store.asFirestore(),
    checkRateLimit: async () => undefined, timestamp: () => now,
    publicFormId: () => "public_form_12345678901234567890"};
  const request = (data: object) => ({auth: {uid: "host1", token: {}},
    data: {organizerId: "org1", ...data}} as CallableRequest<unknown>);
  const create = (data: object = {}) => createOrganizerFormHandler(request({
    templateId: "event-application", requestId: "create1", title: null,
    defaultTargetKind: "event", defaultTargetId: "event1", ...data}), deps);
  return {store, deps, request, create};
}

test("private basics can bind and publish a form without enabling the event",
  async () => {
    const h = fixture();
    const originalEvent = JSON.stringify(h.store.docs["events/event1"]);
    const created = await h.create();
    assert.equal(created.form.defaultTargetId, "event1");
    const repeated = await h.create();
    assert.equal(repeated.form.formId, created.form.formId);
    const published = await publishOrganizerFormHandler(h.request({
      formId: created.form.formId, expectedRevision: 1}), h.deps);
    assert.equal(published.status, "published");
    assert.equal(JSON.stringify(h.store.docs["events/event1"]), originalEvent);
    assert.equal(Object.keys(h.store.docs).filter((path) =>
      path.startsWith("organizerForms/")).length, 1);
  });

test("fixed targets reject missing, foreign and unusable events",
  async () => {
    for (const change of [null, {organizerId: "foreign"},
      {organizerId: "foreign"}, {status: "cancelled"},
      {startTime: Timestamp.fromMillis(1)}, {publicationState: "other"},
      {setupRevision: 0}, {eventTimezone: null}]) {
      const h = fixture();
      if (change === null) delete h.store.docs["events/event1"];
      else Object.assign(h.store.docs["events/event1"], change);
      await assert.rejects(h.create(), (error: unknown) => {
        assert.ok(["not-found", "failed-precondition"].includes(
          (error as {code: string}).code));
        return true;
      });
      assert.equal(Object.keys(h.store.docs).filter((path) =>
        path.startsWith("organizerForms/")).length, 0);
    }
  });

test("reusable form needs no event and can replace an obsolete fixed target",
  async () => {
    const h = fixture();
    const created = await h.create();
    delete h.store.docs["events/event1"];
    const updated = await updateOrganizerFormDraftHandler(h.request({
      formId: created.form.formId, expectedRevision: 1,
      definition: {...created.definition, defaultTargetKind: "organizer",
        defaultTargetId: null},
    }), h.deps);
    assert.equal(updated.form.defaultTargetKind, "organizer");
    assert.equal(updated.form.defaultTargetId, null);
    await publishOrganizerFormHandler(h.request({
      formId: created.form.formId, expectedRevision: 2}), h.deps);
  });

test("event changes after draft save are rechecked on update, publish and copy",
  async () => {
    const h = fixture();
    const created = await h.create();
    h.store.docs["events/event1"].status = "cancelled";
    const formId = created.form.formId;
    const original = JSON.stringify(h.store.docs);
    await assert.rejects(updateOrganizerFormDraftHandler(h.request({formId,
      expectedRevision: 1, definition: created.definition}), h.deps),
    {code: "failed-precondition"});
    await assert.rejects(publishOrganizerFormHandler(h.request({formId,
      expectedRevision: 1}), h.deps), {code: "failed-precondition"});
    await assert.rejects(duplicateOrganizerFormHandler(h.request({
      sourceFormId: formId, requestId: "duplicate1", title: null}), h.deps),
    {code: "failed-precondition"});
    assert.equal(JSON.stringify(h.store.docs), original);
  });

test("resume validates published target rather than an edited draft target",
  async () => {
    const h = fixture();
    const created = await h.create();
    const formId = created.form.formId;
    await publishOrganizerFormHandler(h.request({formId,
      expectedRevision: 1}), h.deps);
    await setOrganizerFormLifecycleHandler(h.request({formId,
      expectedStatus: "published", action: "pause"}), h.deps);
    await updateOrganizerFormDraftHandler(h.request({formId,
      expectedRevision: 1, definition: {...created.definition,
        defaultTargetKind: "organizer", defaultTargetId: null}}), h.deps);
    h.store.docs["events/event1"].status = "cancelled";
    await assert.rejects(setOrganizerFormLifecycleHandler(h.request({formId,
      expectedStatus: "paused", action: "resume"}), h.deps),
    {code: "failed-precondition"});
    assert.equal(h.store.docs[`organizerForms/${formId}`].status, "paused");
    await publishOrganizerFormHandler(h.request({formId,
      expectedRevision: 2}), h.deps);
    assert.equal(h.store.docs[`organizerForms/${formId}`].status, "published");
  });

test("revocation or deletion between preflight and transaction prevents a bind",
  async () => {
    for (const deleted of [false, true]) {
      const h = fixture();
      const original = h.store.runTransaction.bind(h.store);
      h.store.runTransaction = async (body) => {
        if (deleted) h.store.docs["deletedUsers/host1"] = {status: "deleted"};
        else {
          h.store.docs["organizers/org1"] = {
            ownerUserId: "other", hostUserIds: [], hostProfiles: []};
        }
        return original(body);
      };
      await assert.rejects(h.create(), {code: "permission-denied"});
      assert.equal(Object.keys(h.store.docs).filter((path) =>
        path.startsWith("organizerForms/")).length, 0);
    }
  });

test("event cancellation between preflight and write does not create a form",
  async () => {
    const h = fixture();
    const original = h.store.runTransaction.bind(h.store);
    h.store.runTransaction = async (body) => {
      h.store.docs["events/event1"].status = "cancelled";
      return original(body);
    };
    await assert.rejects(h.create(), {code: "failed-precondition"});
    assert.equal(Object.keys(h.store.docs).filter((path) =>
      path.startsWith("organizerForms/")).length, 0);
  });
