/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {validateOrganizerFormDefinition} from "../organizers/organizerForms";
import {ensureTryItWorkspaceHandler} from "./ensureTryItWorkspace";
import {formLink, importedFormId, importFormFromLinkHandler, type FormPageReading} from "./importFormFromLink";
import {commandReceiptKey} from "./envelope";
import {tryItWorkspaceOrganizerId} from "./workspace";

const NOW = "2026-11-19T08:00:00.000Z";
const SERVER_TIME = {_seconds: 1795161600, _nanoseconds: 0};
const UID = "visitor-1";
const PHONE = "+919000000002";
const KEY = "form-import-0001";
const LINK = "https://docs.google.com/forms/d/e/fictional-driftwood-rsvp/viewform";
const ORGANIZER_ID = tryItWorkspaceOrganizerId(UID, 1);
const FORM_ID = importedFormId(commandReceiptKey(UID, KEY));

/** Stored timestamps keep only their fields; toMillis lives on the prototype. */
class FakeTimestamp {
  readonly _nanoseconds = 0;
  constructor(readonly _seconds: number) {}
  toMillis() {
    return this._seconds * 1000;
  }
}

const validate = contractValidator("ImportFormFromLinkCallableResponse");
function valid(value: unknown, label: string) {
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);
}

// A fictional form in the layout of Google's public page data (see formImport/googleForm.ts).
const question = (id: number, title: string, type: number, options: unknown[] | null = null) =>
  [id, title, null, type, [[id + 1000, options, 1]]];
const option = (label: string, goTo: number | null = null) => [label, null, goTo, null, false];
function formData(title = "Driftwood Supper Club RSVP") {
  return [null, ["Tell us about you.", [
    question(1, "Your name", 0),
    question(2, "Are you coming?", 2, [option("Yes", 200), option("No", 300)]),
    [200, "Your booking", null, 8],
    question(201, "How many seats?", 3, [option("1"), option("2")]),
    question(202, "Arrival time", 10),
    [300, "Sorry to miss you", null, 8],
    question(301, "Want updates?", 2, [option("Yes"), option("No")]),
  ], null, null, null, null, null, null, title], "/forms", title];
}

function harness(pages: Record<string, FormPageReading> = {[LINK]: {outcome: "fetched", finalUrl: LINK, data: formData()}}) {
  const db = new FakeFirestore();
  const reads: string[] = [];
  const deps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(NOW),
    serverTimestamp: () => SERVER_TIME as unknown as FirebaseFirestore.FieldValue,
    timestampFromDate: () => SERVER_TIME,
    timestampFromMillis: (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0}) as unknown as
      FirebaseFirestore.Timestamp,
    timestamp: () => new FakeTimestamp(SERVER_TIME._seconds) as unknown as FirebaseFirestore.Timestamp,
    checkRateLimit: (async () => undefined) as never,
    publicFormId: () => "public_form_fictional_0000000001",
    reader: () => ({read: async ({url}: {url: string}) => {
      reads.push(url);
      return pages[url] ?? {outcome: "not_captured", finalUrl: null, data: null};
    }}),
  };
  return {db, deps, reads, pages};
}

function call(data: unknown) {
  return {data, auth: {uid: UID, token: {phone_number: PHONE}}, rawRequest: {headers: {}, ip: "198.51.100.7"}} as
    unknown as CallableRequest<unknown>;
}

const envelope = (mode: "preview" | "apply", link = LINK, extra: Record<string, unknown> = {}) =>
  ({mode, idempotencyKey: KEY, surface: "website", input: {link}, ...extra});

async function withWorkspace(pages?: Record<string, FormPageReading>) {
  const h = harness(pages);
  await ensureTryItWorkspaceHandler(call({mode: "apply", idempotencyKey: "workspace-request-01", surface: "website",
    input: {organizerName: "Sunrise Social Club", marketId: "in-mh-mumbai"}}), h.deps);
  return h;
}

const forms = (db: FakeFirestore) => db.entries().filter(([key]) => /^organizerForms\/[^/]+$/u.test(key));

test("links: only Google Forms are read; other form tools and sites are refused", () => {
  assert.deepEqual(formLink(new URL(LINK)), {provider: "google_forms", support: "instant", reason: null});
  assert.deepEqual(formLink(new URL("https://forms.gle/fictional")), {provider: "google_forms", support: "instant", reason: null});
  assert.equal(formLink(new URL("https://example.com/forms/x")).reason, "not_a_form_link");
});

test("without a workspace it asks for one and reads nothing", async () => {
  const h = harness();
  const response = await importFormFromLinkHandler(call(envelope("preview")), h.deps);
  valid(response, "no workspace");
  assert.equal(response.status, "needs_input");
  assert.deepEqual(response.result.reasons, ["no_workspace"]);
  assert.deepEqual(response.next, [{commandId: "workspace.ensure", label: "Set up your organizer profile"}]);
  assert.deepEqual(h.reads, []);
});

test("a link that isn't a Google Form is refused before anything is read", async () => {
  const h = await withWorkspace();
  const response = await importFormFromLinkHandler(call(envelope("preview", "https://example.com/rsvp")), h.deps);
  valid(response, "not a form");
  assert.equal(response.status, "refused");
  assert.deepEqual(response.result.reasons, ["not_a_form_link"]);
  assert.deepEqual(h.reads, []);
});

test("preview outlines the draft form and its flags, and writes nothing", async () => {
  const h = await withWorkspace();
  const before = h.db.entries().length;
  const response = await importFormFromLinkHandler(call(envelope("preview")), h.deps);
  valid(response, "preview");
  assert.equal(response.status, "previewed");
  assert.equal(response.result.organizerId, ORGANIZER_ID);
  assert.equal(response.result.formId, null);
  const form = response.result.form;
  assert.ok(form);
  assert.equal(form.title, "Driftwood Supper Club RSVP");
  assert.equal(form.questionCount, 5);
  assert.equal(form.ruleCount, 2);
  assert.deepEqual(form.sections.map((section) => [section.title, section.questions.map((item) => item.kind)]), [
    ["Driftwood Supper Club RSVP", ["shortText", "singleChoice"]],
    ["Your booking", ["singleChoice", "shortText"]],
    ["Sorry to miss you", ["singleChoice"]],
  ]);
  assert.deepEqual(response.result.flags, [{code: "time_as_text", item: "Arrival time"}]);
  assert.match(response.summary.headline, /Driftwood Supper Club RSVP/u);
  assert.equal(h.db.entries().length, before);
  assert.deepEqual(forms(h.db), []);
});

test("apply creates a private draft form with native logic, records it, and replays", async () => {
  const h = await withWorkspace();
  const preview = await importFormFromLinkHandler(call(envelope("preview")), h.deps);
  const confirm = {commandId: "form.import-from-link", previewHash: preview.previewHash};
  const applied = await importFormFromLinkHandler(call(envelope("apply", LINK, {confirm})), h.deps);
  valid(applied, "applied");
  assert.equal(applied.status, "applied");
  assert.equal(applied.result.formId, FORM_ID);
  assert.ok(applied.receiptId);
  assert.deepEqual(applied.effects.map((effect) => effect.ref), [`organizerForms/${FORM_ID}`]);

  const stored = h.db.read(`organizerForms/${FORM_ID}`) as Record<string, unknown>;
  assert.equal(stored.organizerId, ORGANIZER_ID);
  assert.equal(stored.status, "draft");
  assert.equal(stored.templateId, "blank");
  const draft = h.db.read(`organizerFormDrafts/${FORM_ID}`) as {definition: Parameters<typeof validateOrganizerFormDefinition>[0]};
  const definition = draft.definition;
  assert.equal(definition.sections.length, 3);
  assert.deepEqual(definition.logicRules.map((rule) => [rule.action, rule.conditionMode, rule.conditions[0].operator,
    rule.conditions[0].expectedValues, rule.targetSectionId]), [
    ["showSection", "any", "equals", ["Yes"], definition.sections[1].sectionId],
    ["showSection", "any", "equals", ["No"], definition.sections[2].sectionId],
  ]);
  assert.equal(definition.logicRules[0].conditions[0].questionId, definition.sections[0].questions[1].questionId);
  // The imported definition passes the same checks publishing runs.
  assert.deepEqual(validateOrganizerFormDefinition(definition).filter((issue) => issue.severity === "error"), []);

  const workspace = h.db.read(`tryItWorkspaces/${UID}`) as {tryItFormIds?: string[]};
  assert.deepEqual(workspace.tryItFormIds, [FORM_ID]);

  const again = await importFormFromLinkHandler(call(envelope("apply", LINK, {confirm})), h.deps);
  assert.equal(again.status, "replayed");
  assert.equal(again.result.formId, FORM_ID);
  assert.equal(forms(h.db).length, 1);
});

test("apply refuses a form that changed since the confirmed preview", async () => {
  const h = await withWorkspace();
  const preview = await importFormFromLinkHandler(call(envelope("preview")), h.deps);
  h.pages[LINK] = {outcome: "fetched", finalUrl: LINK, data: formData("Driftwood Supper Club RSVP (new)")};
  await assert.rejects(importFormFromLinkHandler(call(envelope("apply", LINK,
    {confirm: {commandId: "form.import-from-link", previewHash: preview.previewHash}})), h.deps), {code: "aborted"});
  assert.deepEqual(forms(h.db), []);
});

test("an unreadable page, a page that left Google Forms, or a private form is refused", async () => {
  const other = "https://docs.google.com/forms/d/e/fictional-private/viewform";
  const moved = "https://forms.gle/fictional-moved";
  const h = await withWorkspace({
    [other]: {outcome: "fetched", finalUrl: other, data: null},
    [moved]: {outcome: "fetched", finalUrl: "https://example.com/elsewhere", data: formData()},
  });
  const cases: Array<[string, string]> = [
    ["https://docs.google.com/forms/d/e/fictional-missing/viewform", "link_unreadable"],
    [other, "form_not_public"],
    [moved, "not_a_form_link"],
  ];
  for (const [link, reason] of cases) {
    const response = await importFormFromLinkHandler(call({...envelope("preview", link), idempotencyKey: `form-${reason}`}), h.deps);
    valid(response, reason);
    assert.equal(response.status, "refused", reason);
    assert.deepEqual(response.result.reasons, [reason]);
  }
});
