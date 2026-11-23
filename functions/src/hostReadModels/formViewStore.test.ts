import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {contractValidator} from "../shared/contractTestValidators";
import type {OrganizerFormVersionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {createOrganizerFormHandler, getOrganizerFormEditorHandler,
  publishOrganizerFormHandler, updateOrganizerFormDraftHandler} from
  "../organizers/organizerForms";
import {getOrganizerFormAnalyticsHandler} from
  "../organizers/organizerFormOperations";
import {
  reconcileFormAnalyticsView,
  reconcileFormEditorView,
  reconcileFormSourceView,
} from "./formViewStore";

const validateEditor = contractValidator("HostFormEditorViewDocument");
const validateAnalytics = contractValidator("HostFormAnalyticsViewDocument");
const validateSources = contractValidator("HostFormSourceViewDocument");

const now = Timestamp.fromDate(new Date("2026-11-20T00:00:00Z"));

function fixture() {
  const store = new AudienceTestStore({
    "organizers/org1": {ownerUserId: "host1", hostUserIds: ["host1"],
      hostProfiles: []},
  });
  const db = store.asFirestore();
  const deps = {firestore: () => db, checkRateLimit: async () => undefined,
    timestamp: () => now,
    publicFormId: () => "public_form_12345678901234567890",
    storageBucket: () => {
      throw new Error("No uploads");
    }};
  const request = (data: object) => ({auth: {uid: "host1", token: {}},
    data: {organizerId: "org1", ...data}} as CallableRequest<unknown>);
  return {store, db, deps, request};
}

async function publishedForm(h: ReturnType<typeof fixture>) {
  const created = await createOrganizerFormHandler(h.request({
    templateId: "quiz-team-night", requestId: "create1", title: null,
    defaultTargetKind: "organizer", defaultTargetId: null}), h.deps);
  const formId = created.form.formId;
  const published = await publishOrganizerFormHandler(h.request({formId,
    expectedRevision: 1}), h.deps);
  return {formId, versionId: published.activeVersionId!};
}

test("the editor view is the callable's editor, kept on every save",
  async () => {
    const h = fixture();
    const created = await createOrganizerFormHandler(h.request({
      templateId: "event-application", requestId: "create1", title: null,
      defaultTargetKind: "organizer", defaultTargetId: null}), h.deps);
    const formId = created.form.formId;
    await reconcileFormEditorView(h.db, formId);
    const view = h.store.docs[`hostFormEditorViews/${formId}`];
    assert.equal(validateEditor(view), true,
      JSON.stringify(validateEditor.errors));
    const callable = await getOrganizerFormEditorHandler(h.request({formId}),
      h.deps);
    assert.deepEqual(view.form, callable.form);
    assert.deepEqual(view.validationIssues, callable.validationIssues);
    assert.equal(view.organizerId, "org1");
    assert.equal(view.version, 1);
    const definition = view.definition as typeof callable.definition;
    assert.deepEqual({...definition, availability: null},
      {...callable.definition, availability: null});

    const closesAt = Timestamp.fromDate(new Date("2026-12-01T00:00:00Z"));
    await updateOrganizerFormDraftHandler(h.request({formId,
      expectedRevision: 1, definition: {...callable.definition,
        title: "Autumn application",
        availability: {...callable.definition.availability,
          closesAt: {_seconds: closesAt.seconds, _nanoseconds: 0}}}}),
    h.deps);
    await reconcileFormEditorView(h.db, formId);
    const saved = h.store.docs[`hostFormEditorViews/${formId}`];
    assert.equal((saved.form as {draftRevision: number}).draftRevision, 2);
    assert.equal((saved.definition as {title: string}).title,
      "Autumn application");
    // The view keeps a Firestore timestamp where the callable sent its wire
    // shape.
    const stored = (saved.definition as {availability: {closesAt: Timestamp}})
      .availability.closesAt;
    assert.equal(stored.toMillis(), closesAt.toMillis());

    delete h.store.docs[`organizerFormDrafts/${formId}`];
    await reconcileFormEditorView(h.db, formId);
    assert.equal(h.store.docs[`hostFormEditorViews/${formId}`], undefined);
  });

test("the editor view of a draft another organizer owns is left out",
  async () => {
    const h = fixture();
    const created = await createOrganizerFormHandler(h.request({
      templateId: "blank", requestId: "create1", title: null,
      defaultTargetKind: "organizer", defaultTargetId: null}), h.deps);
    const formId = created.form.formId;
    h.store.docs[`organizerFormDrafts/${formId}`].organizerId = "org2";
    await reconcileFormEditorView(h.db, formId);
    assert.equal(h.store.docs[`hostFormEditorViews/${formId}`], undefined);
  });

test("the analytics view applies the privacy threshold in the trigger",
  async () => {
    const h = fixture();
    const {formId, versionId} = await publishedForm(h);
    const version = h.store.docs[`organizerFormVersions/${versionId}`] as
      unknown as OrganizerFormVersionDocument;
    const questions = version.definition.sections.flatMap((section) =>
      section.questions);
    const choice = questions.find((question) => question.kind === "number" &&
      question.privacyClass !== "sensitive")!;
    const text = questions.find((question) => question.kind === "shortText" ||
      question.kind === "longText")!;
    assert.ok(choice && text, "the template has a number and a text question");
    const aggregate = (scope: "version" | "question",
      question: typeof choice | null, submissions: number) => ({
      organizerId: "org1", formId, versionId, scope,
      questionId: question?.questionId ?? null,
      questionLabel: question?.label ?? null,
      questionKind: question?.kind ?? null,
      privacyClass: question?.privacyClass ?? null,
      opens: scope === "version" ? 40 : 0,
      starts: scope === "version" ? 20 : 0,
      submissions, withdrawals: 0, completionMillisTotal: 0,
      completionBuckets: scope === "version" ?
        [{upperBoundMillis: 60_000, count: submissions}] : [],
      choiceCounts: question ? [{value: "yes", label: "Yes", count: 7}] : [],
      numericCount: 0, numericSum: 0, numericMin: null, numericMax: null,
      updatedAt: now});
    h.store.docs[`organizerFormAggregates/${versionId}_version`] =
      aggregate("version", null, 10);
    h.store.docs[`organizerFormAggregates/${versionId}_${choice.questionId}`] =
      aggregate("question", choice, 10);
    h.store.docs[`organizerFormAggregates/${versionId}_${text.questionId}`] =
      aggregate("question", text, 10);
    await reconcileFormAnalyticsView(h.db, versionId);
    const view = h.store.docs[`hostFormAnalyticsViews/${versionId}`];
    assert.equal(validateAnalytics(view), true,
      JSON.stringify(validateAnalytics.errors));
    const callable = await getOrganizerFormAnalyticsHandler(h.request({formId,
      versionId: null}), h.deps);
    const {sources: _sources, version: formVersion, ...rest} = callable;
    assert.deepEqual({...view}, {...rest, formVersion, version: 1});
    const byId = new Map((view.questions as Array<{questionId: string;
      choiceCounts: unknown[]}>).map((row) => [row.questionId, row]));
    assert.equal(byId.get(choice.questionId)!.choiceCounts.length, 1);
    assert.deepEqual(byId.get(text.questionId)!.choiceCounts, []);

    // Below the threshold a counted question keeps only its count.
    h.store.docs[`organizerFormAggregates/${versionId}_${choice.questionId}`] =
      aggregate("question", choice, 4);
    await reconcileFormAnalyticsView(h.db, versionId);
    const below = (h.store.docs[`hostFormAnalyticsViews/${versionId}`]
      .questions as Array<{questionId: string; responseCount: number;
        choiceCounts: unknown[]}>)
      .find((row) => row.questionId === choice.questionId)!;
    assert.equal(below.responseCount, 4);
    assert.deepEqual(below.choiceCounts, []);
    assert.equal(JSON.stringify(h.store.docs[
      `hostFormAnalyticsViews/${versionId}`]).includes("\"count\":7"), false);
  });

test("a version with no aggregates yet reads as an empty funnel",
  async () => {
    const h = fixture();
    const {versionId} = await publishedForm(h);
    await reconcileFormAnalyticsView(h.db, versionId);
    const view = h.store.docs[`hostFormAnalyticsViews/${versionId}`];
    assert.equal(validateAnalytics(view), true,
      JSON.stringify(validateAnalytics.errors));
    assert.equal(view.opens, 0);
    assert.deepEqual(view.questions, []);
    delete h.store.docs[`organizerFormVersions/${versionId}`];
    await reconcileFormAnalyticsView(h.db, versionId);
    assert.equal(h.store.docs[`hostFormAnalyticsViews/${versionId}`],
      undefined);
  });

test("the source view holds each link's counters and never its token",
  async () => {
    const h = fixture();
    const {formId} = await publishedForm(h);
    await reconcileFormSourceView(h.db, formId);
    assert.equal(h.store.docs[`hostFormSourceViews/${formId}`], undefined);
    const link = (organizerId: string, label: string) => ({organizerId,
      formId, publicFormId: "public_form_12345678901234567890", label,
      source: "manual", tokenHash: "a".repeat(64), createdByUid: "host1",
      createdAt: now, openCount: 9, startCount: 4, submissionCount: 2});
    h.store.docs["organizerFormShareLinks/link1"] = link("org1", "Poster");
    h.store.docs["organizerFormShareLinks/link2"] = link("org2", "Foreign");
    await reconcileFormSourceView(h.db, formId);
    const view = h.store.docs[`hostFormSourceViews/${formId}`];
    assert.equal(validateSources(view), true,
      JSON.stringify(validateSources.errors));
    const callable = await getOrganizerFormAnalyticsHandler(h.request({formId,
      versionId: null}), h.deps);
    assert.deepEqual(view.sources, callable.sources);
    assert.deepEqual(view.sources, [{sourceLinkId: "link1", label: "Poster",
      opens: 9, starts: 4, submissions: 2}]);
    assert.equal(JSON.stringify(view).includes("a".repeat(64)), false);
  });
