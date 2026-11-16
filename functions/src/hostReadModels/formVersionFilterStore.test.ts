import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {hostFormVersionFilter, reconcileFormVersionFilter} from
  "./formVersionFilterStore";
import {responseFilterOptions} from
  "../organizers/organizerFormResponseFilters";
import type {OrganizerFormVersionDocument} from
  "../shared/generated/firestoreAdminTypes";

const now = Timestamp.fromMillis(1000);

function question(questionId: string, overrides: Record<string, unknown> = {}) {
  return {questionId, kind: "singleChoice", label: `Label ${questionId}`,
    required: false, privacyClass: "ordinary",
    hostPresentation: "filterable",
    options: [{value: "a", label: "Option A", secret: "not-in-view"},
      {value: "b", label: "Option B"}], ...overrides};
}

function version() {
  return {organizerId: "org", formId: "form", version: 2,
    sourceDraftRevision: 3, createdByUid: "host", createdAt: now,
    publishedAt: now, definition: {sections: [{sectionId: "one", questions: [
      question("pace"),
      question("days", {kind: "multiChoice"}),
      question("health", {privacyClass: "sensitive"}),
      question("hidden", {hostPresentation: "default"}),
      question("bio", {kind: "shortText", options: []}),
    ]}]}};
}

test("the view holds the inbox answer filters and nothing else", () => {
  const data = version();
  const view = hostFormVersionFilter("form_v2", data);
  assert.deepEqual(view, {organizerId: "org", formId: "form",
    versionId: "form_v2", formVersion: 2, version: 1,
    answerFilterOptions: [
      {questionId: "pace", label: "Label pace", options: [
        {value: "a", label: "Option A"}, {value: "b", label: "Option B"}]},
      {questionId: "days", label: "Label days", options: [
        {value: "a", label: "Option A"}, {value: "b", label: "Option B"}]},
    ]});
  // Exactly what the callable returns as answerFilterOptions.
  assert.deepEqual(view?.answerFilterOptions, responseFilterOptions(
    data.definition as unknown as OrganizerFormVersionDocument["definition"]));
  assert.equal(JSON.stringify(view).includes("not-in-view"), false);
  assert.equal(JSON.stringify(view).includes("health"), false);
});

test("a version without an owner, form or definition has no view", () => {
  assert.equal(hostFormVersionFilter("v", undefined), null);
  assert.equal(hostFormVersionFilter("v", {...version(), organizerId: ""}),
    null);
  assert.equal(hostFormVersionFilter("v", {...version(), formId: 3}), null);
  assert.equal(hostFormVersionFilter("v", {...version(), definition: {}}),
    null);
});

test("reconcile follows the current version and is idempotent", async () => {
  const db = new AudienceTestStore({
    "organizerFormVersions/form_v2": version()});
  await reconcileFormVersionFilter(db.asFirestore(), "form_v2");
  const first = db.docs["hostFormVersionFilters/form_v2"];
  assert.equal(first.formVersion, 2);
  await reconcileFormVersionFilter(db.asFirestore(), "form_v2");
  assert.deepEqual(db.docs["hostFormVersionFilters/form_v2"], first);
  delete db.docs["organizerFormVersions/form_v2"];
  await reconcileFormVersionFilter(db.asFirestore(), "form_v2");
  assert.equal(db.docs["hostFormVersionFilters/form_v2"], undefined);
});

test("a version that fails projection leaves no view and does not throw",
  async () => {
    const broken = {...version(), definition: {sections: [
      {sectionId: "one", questions: [question("pace", {options: null})]}]}};
    const db = new AudienceTestStore({
      "organizerFormVersions/form_v2": broken});
    await reconcileFormVersionFilter(db.asFirestore(), "form_v2");
    assert.equal(db.docs["hostFormVersionFilters/form_v2"], undefined);
  });
