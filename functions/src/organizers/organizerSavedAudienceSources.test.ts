import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {OrganizerSavedAudienceDocument} from
  "../shared/generated/firestoreAdminTypes";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import {genericFormApplicationId} from "./organizerApplicationAccess";
import {assertSavedAudienceSources, savedAudienceFilterOptions,
  savedAudienceSourceMatches} from "./organizerSavedAudienceSources";
import {savedAudienceDefinitionMatches, SavedAudienceEvaluationRow} from
  "./organizerSavedAudiences";

type Definition = OrganizerSavedAudienceDocument["definition"];
type Predicate = Definition["predicates"][number];
const answer: Predicate = {kind: "formAnswer", formId: "form-1",
  versionId: "v1", questionId: "drink", value: "tea"};
const attendance: Predicate = {kind: "attendedEvent", eventId: "event-1"};
const definition = (...predicates: Predicate[]) =>
  ({join: "all" as const, predicates});

function store() {
  return new AudienceTestStore({
    "organizerForms/form-1": {organizerId: "org-1", title: "New draft name"},
    "organizerFormVersions/v1": {organizerId: "org-1", formId: "form-1",
      version: 1, definition: {title: "Published application", sections: [{
        questions: [{questionId: "drink", label: "Drink", kind: "multiChoice",
          hostPresentation: "filterable", privacyClass: "organizerCustom",
          options: [{label: "Tea", value: "tea"}, {label: "Coffee",
            value: "coffee"}]},
        {questionId: "member", label: "Member", kind: "boolean",
          hostPresentation: "filterable", privacyClass: "organizerCustom",
          options: []},
        {questionId: "private", label: "Private", kind: "singleChoice",
          hostPresentation: "filterable", privacyClass: "sensitive",
          options: []},
        {questionId: "detail", label: "Detail only", kind: "singleChoice",
          hostPresentation: "detailOnly", privacyClass: "organizerCustom",
          options: []}],
      }]}},
    "organizerFormResponses/r1": {organizerId: "org-1", formId: "form-1",
      versionId: "v1", status: "submitted", respondentUid: null,
      answers: {drink: ["tea", "coffee"], member: false}, answerSnapshots: []},
    "organizerContactOrigins/origin-1": {organizerId: "org-1",
      sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
      sourceEntityId: "r1", currentContactId: "survivor",
      originContactId: "alias"},
    "events/event-1": {organizerId: "org-1", name: "Sunday social"},
    "organizerContactEventEdges/edge-1": {organizerId: "org-1",
      eventId: "event-1", contactId: "survivor", checkedIn: true,
      cancelled: false},
    "organizerContactEventEdges/edge-2": {organizerId: "org-1",
      eventId: "event-1", contactId: "registered", checkedIn: false,
      cancelled: false},
  });
}

test("choice, false boolean and event filters use current organizer facts",
  async () => {
    const db = store();
    const boolean: Predicate = {...answer, questionId: "member", value: false};
    const matches = await savedAudienceSourceMatches(db.asFirestore(), "org-1",
      definition(answer, boolean, attendance));
    for (const ids of matches.values()) {
      assert.deepEqual([...ids], ["survivor"]);
    }
    const row = {contactId: "survivor", contact: {manualTagIds: []},
      sourcePredicateKeys: new Set(matches.keys()),
    } as unknown as SavedAudienceEvaluationRow;
    const missing: Predicate = {kind: "manualTag", manualTagId: "missing"};
    assert.equal(savedAudienceDefinitionMatches(row,
      definition(answer, missing),
      Timestamp.now()), false);
    assert.equal(savedAudienceDefinitionMatches(row, {join: "any",
      predicates: [answer, missing]}, Timestamp.now()), true);
  });

test("withdrawn, wrong-version and foreign responses never target a " +
  "customer", async () => {
  for (const change of [{status: "withdrawn"}, {versionId: "v2"},
    {organizerId: "other"}]) {
    const db = store();
    Object.assign(db.docs["organizerFormResponses/r1"], change);
    const matches = await savedAudienceSourceMatches(db.asFirestore(), "org-1",
      definition(answer));
    assert.deepEqual([...matches.get(JSON.stringify(answer))!], []);
  }
});

test("private questions, invented values and foreign source references fail",
  async () => {
    const db = store();
    for (const predicate of [{...answer, questionId: "private"},
      {...answer, questionId: "detail"}, {...answer, value: "invented"},
      {...answer, formId: "other"}, {...attendance, eventId: "other"}]) {
      await assert.rejects(assertSavedAudienceSources(db.asFirestore(), "org-1",
        definition(predicate)), /unavailable|published version/);
    }
    db.docs["organizerFormVersions/v1"].organizerId = "other";
    await assert.rejects(assertSavedAudienceSources(db.asFirestore(), "org-1",
      definition(answer)), {code: "failed-precondition"});
  });

test("application status uses approved source evidence and follows " +
  "merged origins", async () => {
  const db = store();
  const applicationId = genericFormApplicationId("r1");
  const source = {kind: "native", externalResponseId: "r1"};
  db.docs[`organizerApplications/${applicationId}`] = {
    organizerId: "org-1", formId: "form-1", formVersionId: "v1",
    latestResponseId: "r1", reviewStatus: "approved", contactId: "alias",
    linkedUid: null, source,
  };
  const predicate: Predicate = {kind: "applicationStatus", formId: "form-1",
    reviewStatus: "approved"};
  const run = () => savedAudienceSourceMatches(db.asFirestore(), "org-1",
    definition(predicate));
  assert.deepEqual([...((await run()).get(JSON.stringify(predicate))!)],
    ["survivor"]);
  db.docs["organizerFormResponses/r1"].status = "withdrawn";
  assert.equal((await run()).get(JSON.stringify(predicate))!.size, 0);
});

test("authoring exposes immutable version choices and excludes private " +
  "questions", async () => {
  const options = await savedAudienceFilterOptions(store().asFirestore(),
    "org-1");
  assert.equal(options.questions.length, 2);
  assert.equal(options.questions[0].formTitle, "Published application");
  assert.equal(options.questions[0].versionId, "v1");
  assert.deepEqual(options.events, [{eventId: "event-1",
    title: "Sunday social"}]);
});

test("over-limit evidence fails instead of returning an incomplete " +
  "match set", async () => {
  const db = store();
  for (let i = 0; i < 5001; i++) {
    db.docs[`organizerContactEventEdges/overflow-${i}`] = {
      organizerId: "org-1", eventId: "event-1", contactId: `p-${i}`,
      checkedIn: true, cancelled: false,
    };
  }
  await assert.rejects(savedAudienceSourceMatches(db.asFirestore(), "org-1",
    definition(attendance)), {code: "resource-exhausted"});
});

interface SourceRead {
  collection: string;
  returned: number;
}

function countSourceReads(store: AudienceTestStore, reads: SourceRead[],
  beforeRead: (collection: string) => void = () => undefined) {
  const db = store.asFirestore();
  const wrap = (query: FirebaseFirestore.Query, collection: string):
    FirebaseFirestore.Query => new Proxy(query, {
    get(target, key) {
      if (key === "get") {
        return async () => {
          beforeRead(collection);
          const result = await target.get();
          reads.push({collection, returned: result.size});
          return result;
        };
      }
      const value = Reflect.get(target, key);
      if (typeof value !== "function") return value;
      if (["where", "limit", "orderBy", "startAfter"].includes(String(key))) {
        return (...args: unknown[]) => wrap(
          Reflect.apply(value, target, args), collection);
      }
      return value.bind(target);
    },
  });
  return new Proxy(db, {
    get(target, key) {
      if (key === "collection") {
        return (name: string) => wrap(target.collection(name), name);
      }
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function addResponses(db: AudienceTestStore, count: number) {
  for (let i = 0; i < count; i++) {
    db.docs[`organizerFormResponses/extra-${i}`] = {
      ...db.docs["organizerFormResponses/r1"],
    };
    db.docs[`organizerContactOrigins/extra-${i}`] = {
      ...db.docs["organizerContactOrigins/origin-1"],
      sourceEntityId: `extra-${i}`, currentContactId: `person-${i}`,
    };
  }
}

test("same-form predicates reuse one bounded query across questions " +
  "and versions beyond 500 responses", async () => {
  const db = store();
  addResponses(db, 500);
  db.docs["organizerFormVersions/v2"] = {
    ...db.docs["organizerFormVersions/v1"], version: 2,
  };
  db.docs["organizerFormResponses/extra-0"].versionId = "v2";
  const boolean: Predicate = {...answer, questionId: "member", value: false};
  const newer: Predicate = {...answer, versionId: "v2"};
  const reads: SourceRead[] = [];
  const matches = await savedAudienceSourceMatches(countSourceReads(db, reads),
    "org-1", definition(answer, boolean, newer));
  assert.equal(matches.get(JSON.stringify(answer))!.size, 500);
  assert.deepEqual(matches.get(JSON.stringify(boolean)),
    matches.get(JSON.stringify(answer)));
  assert.deepEqual([...matches.get(JSON.stringify(newer))!], ["person-0"]);
  assert.deepEqual(reads.filter((r) =>
    r.collection === "organizerFormResponses"),
  [{collection: "organizerFormResponses", returned: 501}]);
});

test("application predicates reuse query rows but retain real source " +
  "access and collection identity", async () => {
  const db = store();
  addResponses(db, 500);
  for (const responseId of ["r1", ...Array.from({length: 500},
    (_, i) => `extra-${i}`)]) {
    const applicationId = genericFormApplicationId(responseId);
    const source = {kind: "native", externalResponseId: responseId};
    db.docs[`organizerApplications/${applicationId}`] = {
      organizerId: "org-1", formId: "form-1", formVersionId: "v1",
      latestResponseId: responseId, reviewStatus: responseId === "r1" ?
        "submitted" : "approved", contactId: "alias", linkedUid: null, source,
    };
  }
  const approved: Predicate = {kind: "applicationStatus", formId: "form-1",
    reviewStatus: "approved"};
  const submitted: Predicate = {...approved, reviewStatus: "submitted"};
  const reads: SourceRead[] = [];
  const run = () => savedAudienceSourceMatches(countSourceReads(db, reads),
    "org-1", definition(approved, submitted, answer));
  const matches = await run();
  assert.equal(matches.get(JSON.stringify(approved))!.size, 500);
  assert.deepEqual([...matches.get(JSON.stringify(submitted))!], ["survivor"]);
  assert.equal(matches.get(JSON.stringify(answer))!.size, 501);
  assert.deepEqual(reads.filter((r) =>
    r.collection === "organizerApplications"),
  [{collection: "organizerApplications", returned: 501}]);
  assert.equal(reads.filter((r) =>
    r.collection === "organizerFormResponses").length, 1);
  db.docs["organizerFormResponses/r1"].status = "withdrawn";
  db.docs["organizerFormResponses/extra-0"].status = "withdrawn";
  reads.length = 0;
  const refreshed = await run();
  assert.equal(refreshed.get(JSON.stringify(approved))!.size, 499);
  assert.equal(refreshed.get(JSON.stringify(submitted))!.size, 0);
  assert.equal(refreshed.get(JSON.stringify(answer))!.size, 499);
  assert.equal(reads.filter((r) =>
    r.collection === "organizerApplications").length, 1);
});

test("source reuse keeps forms separate and revalidates each question",
  async () => {
    const db = store();
    db.docs["organizerFormVersions/other-v"] = {
      ...db.docs["organizerFormVersions/v1"], formId: "other-form",
    };
    const other: Predicate = {...answer, formId: "other-form",
      versionId: "other-v"};
    const reads: SourceRead[] = [];
    const result = await savedAudienceSourceMatches(countSourceReads(db, reads),
      "org-1", definition(answer, other));
    assert.equal(result.get(JSON.stringify(answer))!.size, 1);
    assert.equal(result.get(JSON.stringify(other))!.size, 0);
    assert.deepEqual(reads.filter((r) =>
      r.collection === "organizerFormResponses").map((r) => r.returned),
    [1, 0]);
    reads.length = 0;
    await assert.rejects(savedAudienceSourceMatches(countSourceReads(db, reads),
      "org-1", definition(answer, {...answer, questionId: "private"})),
    {code: "failed-precondition"});
    assert.equal(reads.length, 0);
  });

test("source reuse preserves exact 5000 cap and fresh retry after failure",
  async () => {
    const db = store();
    for (let i = 0; i < 4999; i++) {
      db.docs[`organizerFormResponses/extra-${i}`] = {
        ...db.docs["organizerFormResponses/r1"],
      };
    }
    const coffee: Predicate = {...answer, value: "coffee"};
    const reads: SourceRead[] = [];
    let fail = true;
    const observed = countSourceReads(db, reads, (collection) => {
      if (collection === "organizerFormResponses" && fail) {
        throw new Error("transient source read");
      }
    });
    const run = () => savedAudienceSourceMatches(observed, "org-1",
      definition(answer, coffee));
    await assert.rejects(run(), /transient source read/);
    fail = false;
    const matches = await run();
    assert.deepEqual([...matches.get(JSON.stringify(answer))!], ["survivor"]);
    assert.deepEqual([...matches.get(JSON.stringify(coffee))!], ["survivor"]);
    assert.deepEqual(reads.filter((r) =>
      r.collection === "organizerFormResponses"),
    [{collection: "organizerFormResponses", returned: 5000}]);
    db.docs["organizerFormResponses/overflow"] = {
      ...db.docs["organizerFormResponses/r1"],
    };
    await assert.rejects(run(), {code: "resource-exhausted"});
  });

test("a native application outside Generic Forms has no source access",
  async () => {
    const db = store();
    const applicationId = "participant-application";
    db.docs[`organizerApplications/${applicationId}`] = {
      organizerId: "org-1", formId: "form-1", formVersionId: "v1",
      latestResponseId: "participant-response", reviewStatus: "approved",
      contactId: "participant", linkedUid: "uid", source: {kind: "native"},
    };
    const approved: Predicate = {kind: "applicationStatus", formId: "form-1",
      reviewStatus: "approved"};
    const run = () => savedAudienceSourceMatches(db.asFirestore(), "org-1",
      definition(approved));
    assert.equal((await run()).get(JSON.stringify(approved))!.size, 0);
  });
