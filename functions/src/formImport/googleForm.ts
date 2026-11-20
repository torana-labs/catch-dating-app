/* eslint-disable max-len */
import {
  type ImportFlag,
  type ImportFlagCode,
  type ImportedForm,
  type ImportedLogicRule,
  type ImportedQuestion,
  type ImportedSection,
  NATIVE_FORM_LIMITS as LIMITS,
} from "./importedForm";

/**
 * Reads a public Google Form into an ImportedForm.
 *
 * A Google Form page keeps its questions in an inline script,
 * `var FB_PUBLIC_LOAD_DATA_ = [...]`, which the page snapshot keeps when the
 * caller asks for it (`namedScripts`, page-snapshot.mjs). The array layout
 * is Google's page data, not a published API, so this reader is defensive:
 * anything it does not recognise becomes a flag for the host, never a guess.
 *
 * Layout read here: `data[1][1]` is the item list and `data[1][0]` the
 * description; the title is `data[1][8]`, else `data[3]`. An item is
 * `[itemId, title, description, typeCode, answers]`, where `answers` is a
 * list of `[entryId, options, required]` and an option is
 * `[label, , goToSectionItemId, , isOther]`.
 */
export const GOOGLE_FORM_SCRIPT_ID = "var:FB_PUBLIC_LOAD_DATA_";

const ITEM = {
  shortAnswer: 0,
  paragraph: 1,
  multipleChoice: 2,
  dropdown: 3,
  checkboxes: 4,
  linearScale: 5,
  titleAndDescription: 6,
  grid: 7,
  section: 8,
  date: 9,
  time: 10,
  image: 11,
  video: 12,
  fileUpload: 13,
} as const;

interface SnapshotLike {
  embeddedJson?: Array<{id: string | null; value: unknown}>;
}

/** The page data a snapshot kept for a Google Form, or null. */
export function googleFormData(snapshot: SnapshotLike | null): unknown[] | null {
  const block = snapshot?.embeddedJson?.find((entry) => entry.id === GOOGLE_FORM_SCRIPT_ID);
  return Array.isArray(block?.value) ? block.value : null;
}

/** Returns null when the data is not a readable Google Form. */
export function importGoogleForm(data: unknown[]): ImportedForm | null {
  const info = Array.isArray(data[1]) ? data[1] : null;
  const items = info && Array.isArray(info[1]) ? info[1] : null;
  if (!info || !items) return null;
  const builder = new FormBuilder(text(info[8]) ?? text(data[3]) ?? "Imported form", text(info[0]));
  for (const item of items) {
    if (Array.isArray(item)) builder.add(item);
  }
  return builder.finish();
}

interface PendingBranch {
  questionKey: string;
  sectionIndex: number;
  item: string;
  /** Option value → Google section item id. */
  targets: Map<string, number>;
}

class FormBuilder {
  private readonly sections: ImportedSection[];
  private readonly sectionItemIds = new Map<number, number>();
  private readonly flags: ImportFlag[] = [];
  private readonly branches: PendingBranch[] = [];
  private readonly keys = new Set<string>();
  private questionCount = 0;
  private readonly title: string;
  private readonly description: string | null;

  constructor(title: string, description: string | null) {
    this.title = this.clip(title, LIMITS.titleChars, null) ?? "Imported form";
    this.description = this.clip(description, LIMITS.descriptionChars, null);
    this.sections = [{id: "s1", title: this.title.slice(0, LIMITS.sectionTitleChars), description: null, questions: []}];
  }

  add(item: unknown[]) {
    const type = typeof item[3] === "number" ? item[3] : -1;
    const label = text(item[1]);
    if (type === ITEM.section) return this.startSection(item, label);
    if (type === ITEM.titleAndDescription) return;
    if (type === ITEM.image || type === ITEM.video) return this.flag("media_skipped", label);
    if (type === ITEM.fileUpload) return this.flag("file_upload_skipped", label);
    if (type === ITEM.grid) return this.flag("grid_not_supported", label);
    const kind = questionKind(type, label);
    if (!kind) return this.flag("unknown_item_skipped", label);
    if (this.questionCount >= LIMITS.questionsPerForm) return this.flag("questions_limit", label);
    const section = this.sections[this.sections.length - 1];
    if (section.questions.length >= LIMITS.questionsPerSection) return this.flag("questions_limit", label);
    if (type === ITEM.time) this.flag("time_as_text", label);
    const answer = Array.isArray(item[4]) && Array.isArray(item[4][0]) ? item[4][0] : [];
    const question: ImportedQuestion = {
      key: this.keyFor(label),
      label: this.clip(label ?? `Question ${this.questionCount + 1}`, LIMITS.questionLabelChars, label) ?? "Question",
      helpText: this.helpText(item, answer, type, label),
      kind: kind.kind,
      required: answer[2] === 1 || answer[2] === true,
      canonicalFieldId: null,
      privacyClass: kind.privacyClass,
    };
    if (kind.kind === "singleChoice" || kind.kind === "multiChoice") {
      const options = this.options(answer[1], label, kind.kind === "singleChoice" ? question.key : null);
      if (options.length >= 2) {
        question.options = options;
      } else if (kind.kind === "multiChoice" && options.length === 1) {
        // One tick box ("I agree to the house rules") is an acknowledgement:
        // the item's title stays the label and the box's text joins the help.
        question.kind = "acknowledgement";
        question.helpText = this.clip([question.helpText, options[0].label].filter(Boolean).join(" · "),
          LIMITS.helpTextChars, label);
      } else {
        question.kind = "shortText";
      }
    }
    section.questions.push(question);
    this.questionCount += 1;
  }

  finish(): ImportedForm {
    const logic: ImportedLogicRule[] = [];
    for (const branch of this.branches) {
      const byTarget = new Map<number, string[]>();
      for (const [value, itemId] of branch.targets) {
        const target = this.sectionItemIds.get(itemId);
        if (target === undefined || target <= branch.sectionIndex) {
          this.flag("navigation_not_supported", branch.item);
          continue;
        }
        byTarget.set(target, [...(byTarget.get(target) ?? []), value]);
      }
      for (const [target, values] of byTarget) {
        if (logic.length >= LIMITS.logicRules) {
          this.flag("logic_limit", branch.item);
          break;
        }
        logic.push({action: "showSection", questionKey: branch.questionKey,
          values: values.slice(0, LIMITS.conditionValues), targetSectionId: this.sections[target].id});
      }
    }
    return {provider: "google_forms", parserVersion: 1, title: this.title,
      description: this.description, sections: this.sections, logic, flags: this.flags};
  }

  private startSection(item: unknown[], label: string | null) {
    if (this.sections.length >= LIMITS.sections) {
      this.flag("sections_limit", label);
      return;
    }
    const current = this.sections[this.sections.length - 1];
    // Questions before the first section break belong to the form's own
    // opening section; an empty opening section takes the break's title.
    const index = current.questions.length === 0 && this.sections.length === 1 ?
      0 : this.sections.push({id: `s${this.sections.length + 1}`, title: "", description: null, questions: []}) - 1;
    const section = this.sections[index];
    section.title = this.clip(label ?? `Section ${index + 1}`, LIMITS.sectionTitleChars, label) ?? `Section ${index + 1}`;
    section.description = this.clip(text(item[2]), LIMITS.sectionDescriptionChars, label);
    if (typeof item[0] === "number") this.sectionItemIds.set(item[0], index);
  }

  private options(raw: unknown, label: string | null, branchKey: string | null) {
    const options: Array<{label: string; value: string}> = [];
    const seen = new Set<string>();
    const targets = new Map<string, number>();
    let unrouted = false;
    for (const entry of Array.isArray(raw) ? raw : []) {
      if (!Array.isArray(entry)) continue;
      if (entry[4] === true || entry[4] === 1) {
        this.flag("other_option_dropped", label);
        continue;
      }
      const optionLabel = text(entry[0]);
      if (!optionLabel) continue;
      if (options.length >= LIMITS.optionsPerQuestion) {
        this.flag("options_trimmed", label);
        break;
      }
      const value = uniqueValue(this.clip(optionLabel, LIMITS.optionChars, label) ?? optionLabel, seen);
      options.push({label: this.clip(optionLabel, LIMITS.optionChars, label) ?? optionLabel, value});
      if (typeof entry[2] === "number" && entry[2] > 0) targets.set(value, entry[2]);
      else if (typeof entry[2] === "number" && entry[2] < 0) this.flag("navigation_not_supported", label);
      else unrouted = true;
    }
    if (branchKey && targets.size > 0) {
      if (unrouted) this.flag("branching_review", label);
      this.branches.push({questionKey: branchKey, sectionIndex: this.sections.length - 1,
        item: label ?? branchKey, targets});
    }
    return options;
  }

  private helpText(item: unknown[], answer: unknown[], type: number, label: string | null) {
    const description = text(item[2]);
    const scale = type === ITEM.linearScale && Array.isArray(answer[3]) ?
      answer[3].map(text).filter((value): value is string => value !== null) : [];
    const scaleNote = scale.length === 2 ? `${scale[0]} to ${scale[1]}` : null;
    return this.clip([description, scaleNote].filter(Boolean).join(" · ") || null, LIMITS.helpTextChars, label);
  }

  private keyFor(label: string | null): string {
    const slug = (label ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "").slice(0, 60);
    const base = `q${this.questionCount + 1}${slug ? `_${slug}` : ""}`;
    let key = base;
    for (let n = 2; this.keys.has(key.toLowerCase()); n += 1) key = `${base}_${n}`;
    this.keys.add(key.toLowerCase());
    return key;
  }

  private flag(code: ImportFlagCode, item: string | null) {
    this.flags.push({code, item: item === null ? null : item.slice(0, 120)});
  }

  /** Trims to a native limit and flags the item once. */
  private clip(value: string | null, max: number, item: string | null): string | null {
    if (value === null || value.length <= max) return value;
    const flagged = item === null ? null : item.slice(0, 120);
    if (!this.flags.some((flag) => flag.code === "text_trimmed" && flag.item === flagged)) {
      this.flag("text_trimmed", item);
    }
    return value.slice(0, max).trimEnd();
  }
}

function questionKind(type: number, label: string | null):
  {kind: ImportedQuestion["kind"]; privacyClass: ImportedQuestion["privacyClass"]} | null {
  switch (type) {
  case ITEM.shortAnswer: {
    const value = label ?? "";
    if (/\be-?mail\b/i.test(value)) return {kind: "email", privacyClass: "contact"};
    if (/\b(phone|mobile|whats\s?app|contact number)\b/i.test(value)) return {kind: "phone", privacyClass: "contact"};
    if (/\bname\b/i.test(value)) return {kind: "shortText", privacyClass: "contact"};
    return {kind: "shortText", privacyClass: "organizerCustom"};
  }
  case ITEM.paragraph: return {kind: "longText", privacyClass: "organizerCustom"};
  case ITEM.multipleChoice:
  case ITEM.dropdown:
  case ITEM.linearScale: return {kind: "singleChoice", privacyClass: "organizerCustom"};
  case ITEM.checkboxes: return {kind: "multiChoice", privacyClass: "organizerCustom"};
  case ITEM.date: return {kind: "date", privacyClass: "organizerCustom"};
  case ITEM.time: return {kind: "shortText", privacyClass: "organizerCustom"};
  default: return null;
  }
}

function uniqueValue(value: string, seen: Set<string>): string {
  let candidate = value;
  for (let n = 2; seen.has(candidate.toLowerCase()); n += 1) {
    const suffix = ` (${n})`;
    candidate = `${value.slice(0, LIMITS.optionChars - suffix.length)}${suffix}`;
  }
  seen.add(candidate.toLowerCase());
  return candidate;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.replace(/\s+/g, " ").trim() : null;
}
