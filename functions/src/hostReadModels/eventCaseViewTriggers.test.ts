import assert from "node:assert/strict";
import test from "node:test";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  caseViewAttendeeFields,
  caseViewEventFields,
  caseViewOrganizerFields,
  resolveEventCaseViewIds,
} from "./eventCaseViewTriggers";

type Data = Record<string, unknown>;

const db = (docs: Record<string, Data> = {}) =>
  new AudienceTestStore(docs).asFirestore();
const live = {mode: "live", organizerId: "org", eventId: "e1"};
const practical = (patch: Data = {}): Data =>
  ({owner: "eventLead", context: live, attendeeId: "a1", ...patch});

test("case writes route when either side is a practical live case",
  async () => {
    const route = (before?: Data, after?: Data) =>
      resolveEventCaseViewIds(db(), "eventAssistanceCases", "c1", before,
        after);
    assert.deepEqual(await route(undefined, practical()), ["c1"]);
    assert.deepEqual(await route(practical(), undefined), ["c1"]);
    // Becoming safety-owned routes too, so the view goes.
    assert.deepEqual(await route(practical(),
      practical({owner: "authorizedSafetyOperator"})), ["c1"]);
    assert.deepEqual(await route(undefined,
      practical({owner: "authorizedSafetyOperator"})), []);
    assert.deepEqual(await route(undefined,
      practical({context: {...live, mode: "rehearsal"}})), []);
  });

test("attendee writes reach that attendee's practical cases in the event",
  async () => {
    const store = db({
      "eventAssistanceCases/c1": practical(),
      "eventAssistanceCases/c2": practical(),
      "eventAssistanceCases/safety": practical({
        owner: "authorizedSafetyOperator"}),
      "eventAssistanceCases/other-event": practical({
        context: {...live, eventId: "e2"}}),
      "eventAssistanceCases/other-guest": practical({attendeeId: "a2"}),
    });
    const base = {eventId: "e1", organizerId: "org", displayName: "Alex",
      status: "registered", createdAt: 1, phoneE164: "+910000000000"};
    assert.deepEqual(await resolveEventCaseViewIds(store, "eventAttendees",
      "a1", base, {...base, phoneE164: "+911111111111"}), []);
    for (const field of caseViewAttendeeFields) {
      assert.deepEqual((await resolveEventCaseViewIds(store,
        "eventAttendees", "a1", base, {...base, [field]: "changed"}))
        .sort(), ["c1", "c2"], field);
    }
    assert.deepEqual((await resolveEventCaseViewIds(store, "eventAttendees",
      "a1", undefined, base)).sort(), ["c1", "c2"]);
    assert.deepEqual((await resolveEventCaseViewIds(store, "eventAttendees",
      "a1", base, undefined)).sort(), ["c1", "c2"]);
  });

test("event writes reach the event's practical cases when facts change",
  async () => {
    const docs: Record<string, Data> = {
      "eventAssistanceCases/safety": practical({
        owner: "authorizedSafetyOperator"}),
    };
    for (let i = 0; i < 105; i++) {
      docs[`eventAssistanceCases/c${String(i).padStart(3, "0")}`] =
        practical();
    }
    const store = db(docs);
    const base = {organizerId: "org", status: "active", endTime: 1,
      name: "Social"};
    assert.deepEqual(await resolveEventCaseViewIds(store, "events", "e1",
      base, {...base, name: "Renamed"}), []);
    for (const field of caseViewEventFields) {
      assert.equal((await resolveEventCaseViewIds(store, "events", "e1",
        base, {...base, [field]: "changed"})).length, 105, field);
    }
  });

test("organizer manager changes reach every open case view, paged",
  async () => {
    const docs: Record<string, Data> = {
      "hostEventCaseViews/resolved": {organizerId: "org", status: "resolved"},
      "hostEventCaseViews/foreign": {organizerId: "other", status: "open"},
    };
    for (let i = 0; i < 205; i++) {
      docs[`hostEventCaseViews/v${String(i).padStart(3, "0")}`] =
        {organizerId: "org", status: "open"};
    }
    const store = db(docs);
    const base = {hostUserId: "h1", ownerUserId: "h1", hostUserIds: ["h1"],
      hostProfiles: [], description: "Old"};
    assert.deepEqual(await resolveEventCaseViewIds(store, "organizers", "org",
      base, {...base, description: "New"}), []);
    for (const field of caseViewOrganizerFields) {
      const ids = await resolveEventCaseViewIds(store, "organizers", "org",
        base, {...base, [field]: ["changed"]});
      assert.equal(ids.length, 205, field);
      assert.equal(ids.includes("resolved"), false);
      assert.equal(ids.includes("foreign"), false);
    }
    assert.equal((await resolveEventCaseViewIds(store, "organizers", "org",
      base, undefined)).length, 205);
  });
