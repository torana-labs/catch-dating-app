import type {TryItResponse} from "../../shared/api/tryItCommands";
import {fixtureOrganizerId} from "./tryItCommands";

/**
 * form.import-from-link envelopes as the callable answers them, for the
 * form tool's tests and stories. A fictional run club's sign-up form; the
 * link has Google Forms' shape (the only link the command reads) with an
 * obviously fake form id. tryItCommands.test.ts checks every one of
 * `formFixtures` against the response schema.
 */

const hash = (seed: string) => seed.repeat(64).slice(0, 64);
export const fixtureFormLink = "https://docs.google.com/forms/d/e/FAKE-FORM-ID-driftwood-sign-up/viewform";
/** What a visitor pastes: the same link without its https://. */
export const fixtureFormTyped = "docs.google.com/forms/d/e/FAKE-FORM-ID-driftwood-sign-up/viewform";
export const fixtureFormId = `form_${"0f".repeat(16)}`;
const googleLink = {provider: "google_forms", support: "instant", reason: null} as const;
const base = {commandId: "form.import-from-link" as const, effects: [] as {kind: string; ref: string | null; label: string}[],
  next: [] as {commandId: string; label: string}[], receiptId: null};

type FormResult = TryItResponse<"form.import-from-link">["result"];

/** Three sections: "Which distance?" jumps to the 5K or the 10K section (two showSection rules). */
const outline: NonNullable<FormResult["form"]> = {
  title: "Driftwood Bay Runners · Sunday long run",
  description: "Tell us a little about you before Sunday.",
  questionCount: 6,
  ruleCount: 2,
  sections: [
    {title: "About you", questions: [
      {label: "Your name", kind: "shortText", required: true, optionCount: 0},
      {label: "Phone number", kind: "phone", required: true, optionCount: 0},
      {label: "Which distance?", kind: "singleChoice", required: true, optionCount: 2},
    ]},
    {title: "5K runners", questions: [
      {label: "Your usual pace", kind: "singleChoice", required: false, optionCount: 3},
    ]},
    {title: "10K runners", questions: [
      {label: "Have you run 10K before?", kind: "singleChoice", required: true, optionCount: 2},
      {label: "Anything we should know?", kind: "longText", required: false, optionCount: 0},
    ]},
  ],
};

/** A grid and a file upload that cannot come across, and an "Other" choice that was dropped. */
const unsupported: FormResult["flags"] = [
  {code: "grid_not_supported", item: "Rate each part of the route"},
  {code: "file_upload_skipped", item: "Upload a photo from your last run"},
  {code: "other_option_dropped", item: "Your usual pace"},
];

export const formFixtures = {
  noWorkspace: {
    ...base, status: "needs_input", previewHash: hash("1"),
    summary: {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then import your form."]},
    next: [{commandId: "workspace.ensure", label: "Set up your organizer profile"}],
    result: {organizerId: null, link: googleLink, form: null, flags: [], formId: null, reasons: ["no_workspace"]},
  },
  previewed: {
    ...base, status: "previewed", previewHash: hash("2"),
    summary: {headline: "We'll draft \"Driftwood Bay Runners · Sunday long run\".", lines: ["6 questions in 3 sections.",
      "2 answer-based sections carried over.", "3 things to check or rebuild by hand.",
      "It stays a private draft: no one can open it until you publish it."]},
    result: {organizerId: fixtureOrganizerId, link: googleLink, form: outline, flags: [...unsupported], formId: null, reasons: []},
  },
  /** The same form after its owner added a question between the preview and the confirm. */
  previewedAgain: {
    ...base, status: "previewed", previewHash: hash("3"),
    summary: {headline: "We'll draft \"Driftwood Bay Runners · Sunday long run\".", lines: ["7 questions in 3 sections.",
      "2 answer-based sections carried over.", "3 things to check or rebuild by hand.",
      "It stays a private draft: no one can open it until you publish it."]},
    result: {organizerId: fixtureOrganizerId, link: googleLink, formId: null, reasons: [], flags: [...unsupported],
      form: {...outline, questionCount: 7, sections: [{...outline.sections[0], questions: [...outline.sections[0].questions,
        {label: "Emergency contact", kind: "phone", required: true, optionCount: 0}]}, outline.sections[1], outline.sections[2]]}},
  },
  refused: {
    ...base, status: "refused", previewHash: hash("4"),
    summary: {headline: "We can't import this form.", lines: ["This form isn't public, so we can't read its questions."]},
    result: {organizerId: fixtureOrganizerId, link: googleLink, form: null, flags: [], formId: null, reasons: ["form_not_public"]},
  },
  applied: {
    ...base, status: "applied", previewHash: hash("2"), receiptId: `formImportFromLink_${"a".repeat(64)}`,
    summary: {headline: "\"Driftwood Bay Runners · Sunday long run\" is a private draft form in your profile.",
      lines: ["Review it in the Host app, then publish it when you are ready."]},
    effects: [{kind: "draft_form", ref: `organizerForms/${fixtureFormId}`, label: "Private draft form: Driftwood Bay Runners · Sunday long run"}],
    result: {organizerId: fixtureOrganizerId, link: googleLink, form: outline, flags: [...unsupported], formId: fixtureFormId, reasons: []},
  },
} satisfies Record<string, TryItResponse<"form.import-from-link">>;

/**
 * A preview with a flag code this site does not know yet, as a later
 * version of the command may send. Outside the schema on purpose, so it is
 * not in `formFixtures`.
 */
export const formUnknownFlagPreview = {
  ...formFixtures.previewed,
  summary: {...formFixtures.previewed.summary, lines: ["6 questions in 3 sections.", "1 thing to check or rebuild by hand.",
    "It stays a private draft: no one can open it until you publish it."]},
  result: {...formFixtures.previewed.result, flags: [{code: "quiz_scoring_dropped", item: "Route quiz"}]},
} as unknown as TryItResponse<"form.import-from-link">;
