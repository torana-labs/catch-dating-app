import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {contractValidator} from "../shared/contractTestValidators";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {listOrganizerSavedAudiencesHandler} from
  "../organizers/organizerSavedAudiences";
import {reconcileAudienceSourceView} from "./audienceSourceViewStore";

const validate = contractValidator("HostAudienceSourceViewDocument");

const question = (questionId: string, extra: Record<string, unknown> = {}) =>
  ({questionId, label: `Question ${questionId}`, kind: "singleChoice",
    hostPresentation: "filterable", privacyClass: "organizerCustom",
    options: [{label: "Yes", value: "yes"}, {label: "No", value: "no"}],
    ...extra});

function store(extra: Record<string, Record<string, unknown>> = {}) {
  return new AudienceTestStore({
    "organizers/org": {ownerUserId: "host", hostUserIds: ["host"],
      hostProfiles: []},
    "organizerForms/form-1": {organizerId: "org", title: "Supper club",
      activeVersionId: "form-1_v1"},
    "organizerApplicationForms/legacy-1": {organizerId: "org",
      title: "Imported application"},
    "organizerFormVersions/form-1_v1": {organizerId: "org", formId: "form-1",
      version: 1, definition: {title: "Supper club", sections: [{questions: [
        question("diet"), question("member", {kind: "boolean"}),
        question("health", {privacyClass: "sensitive"})]}]}},
    "events/event-1": {organizerId: "org", name: "Lantern walk"},
    "events/event-2": {organizerId: "other", name: "Not ours"},
    "organizerContactTagVocabularies/org": {organizerId: "org",
      tags: [{tagId: "a".repeat(32), label: "Regular",
        normalizedLabel: "regular", createdByUid: "host",
        createdAt: Timestamp.fromMillis(1)}],
      updatedAt: Timestamp.fromMillis(1)},
    ...extra,
  });
}

test("the view holds the callable's filter options, nothing more",
  async () => {
    const fake = store();
    const db = fake.asFirestore();
    await reconcileAudienceSourceView(db, "org");
    const view = fake.docs["hostAudienceSourceViews/org"];
    assert.equal(validate(view), true, JSON.stringify(validate.errors));
    const callable = await listOrganizerSavedAudiencesHandler({
      auth: {uid: "host", token: {}},
      data: {organizerId: "org", limit: 1, includeFilterOptions: true},
    } as unknown as CallableRequest<unknown>, {firestore: () => db,
      checkRateLimit: async () => undefined,
      now: () => Timestamp.fromMillis(2)});
    const {organizerId, unavailableReason, version, ...options} =
      view as Record<string, unknown>;
    const expected = callable.filterOptions!;
    assert.deepEqual(options, {...expected, tags: expected.tags.map(
      ({tagId, label}) => ({tagId, label}))});
    assert.deepEqual(options.tags, [{tagId: "a".repeat(32),
      label: "Regular"}]);
    assert.equal(organizerId, "org");
    assert.equal(unavailableReason, null);
    assert.equal(version, 1);
    assert.deepEqual((options.questions as Array<{questionId: string}>)
      .map((row) => row.questionId).sort(), ["diet", "member"]);
    assert.equal(JSON.stringify(view).includes("Not ours"), false);
    assert.equal(JSON.stringify(view).includes("createdByUid"), false);
  });

test("over the callable's bounds the view keeps its reason, no options",
  async () => {
    const many = Array.from({length: 101}, (_, index) =>
      question(`q${index}`));
    const fake = store({"organizerFormVersions/form-1_v1": {
      organizerId: "org", formId: "form-1", version: 1,
      definition: {title: "Supper club", sections: [{questions: many}]}}});
    await reconcileAudienceSourceView(fake.asFirestore(), "org");
    const view = fake.docs["hostAudienceSourceViews/org"];
    assert.equal(validate(view), true, JSON.stringify(validate.errors));
    assert.deepEqual(view.questions, []);
    assert.match(String(view.unavailableReason), /100 filterable/);
  });

test("an organizer that is gone has no view", async () => {
  const fake = store();
  await reconcileAudienceSourceView(fake.asFirestore(), "org");
  delete fake.docs["organizers/org"];
  await reconcileAudienceSourceView(fake.asFirestore(), "org");
  assert.equal(fake.docs["hostAudienceSourceViews/org"], undefined);
});
