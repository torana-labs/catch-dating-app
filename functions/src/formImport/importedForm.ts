/* eslint-disable max-len */
import type {OrganizerFormDraftDocument} from "../shared/generated/firestoreAdminTypes";

type Question = OrganizerFormDraftDocument["definition"]["sections"][number]["questions"][number];

/**
 * A form read from another provider, in the shape the native form templates
 * use (`contracts/catalogs/organizer_form_templates.json`), so the existing
 * template materializer turns it into a native draft with the same ids,
 * defaults and validation. Logic refers to sections by their local id and to
 * questions by key; the materializer resolves both to native ids.
 */
export interface ImportedForm {
  /** google_forms: the page's own form data; ai_read: the AI fallback read the page text (#2062). */
  provider: "google_forms" | "ai_read";
  parserVersion: 1;
  title: string;
  description: string | null;
  sections: ImportedSection[];
  logic: ImportedLogicRule[];
  flags: ImportFlag[];
}

export interface ImportedSection {
  id: string;
  title: string;
  description: string | null;
  questions: ImportedQuestion[];
}

export interface ImportedQuestion {
  key: string;
  label: string;
  helpText: string | null;
  kind: Question["kind"];
  required: boolean;
  canonicalFieldId: null;
  privacyClass: Question["privacyClass"];
  options?: Array<{label: string; value: string}>;
}

/**
 * Show a section when one choice question's answer is one of `values`, or
 * finish the form. Google's per-option "go to section" becomes `showSection`:
 * native forms allow one route rule leaving a section, while show rules model
 * "each answer opens its own section" (organizerFormLogic.ts).
 */
export interface ImportedLogicRule {
  action: "showSection" | "finish";
  questionKey: string;
  values: string[];
  targetSectionId: string | null;
}

/** Something the host rebuilds by hand; shown in the preview, never guessed. */
export interface ImportFlag {
  code: ImportFlagCode;
  /** The source question or section title, trimmed, when there is one. */
  item: string | null;
}

export type ImportFlagCode =
  | "grid_not_supported"
  | "time_as_text"
  | "file_upload_skipped"
  | "media_skipped"
  | "unknown_item_skipped"
  | "other_option_dropped"
  | "branching_review"
  | "navigation_not_supported"
  | "extra_finish_dropped"
  | "options_trimmed"
  | "text_trimmed"
  | "sections_limit"
  | "questions_limit"
  | "logic_limit";

/** The native limits (organizer_form_common.schema.json, organizerForms.ts). */
export const NATIVE_FORM_LIMITS = Object.freeze({
  titleChars: 160,
  descriptionChars: 1000,
  sectionTitleChars: 160,
  sectionDescriptionChars: 1000,
  questionLabelChars: 240,
  helpTextChars: 500,
  optionChars: 160,
  optionsPerQuestion: 100,
  questionsPerSection: 100,
  questionsPerForm: 200,
  sections: 40,
  logicRules: 100,
  conditionValues: 20,
});
