import {activeMarket} from "@content/markets";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {websiteLeadCopy} from "@content/websiteLead";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract.ts";
import {websiteLeadPhone, type WebsiteLeadForm} from "../../shared/api/websiteLead";

/**
 * The setup guides the lead intake names (contracts/http/
 * join_waitlist_request.schema.json, lead.guide.format). The intake takes
 * any slug of the right shape, so the website keeps to the documented list;
 * playbookLeadModel.test.ts fails when the two disagree.
 */
export const websiteLeadGuideFormats = [
  "run_club", "supper_club", "quiz_night", "social_night", "racket_social", "outdoor_group", "studio",
  "workshop", "facility", "venue", "community", "creator", "society", "team_social",
] as const;
export type WebsiteLeadGuideFormat = (typeof websiteLeadGuideFormats)[number];

/**
 * A page's format tag (its organiser-type page's slug) → the setup guide the
 * intake names. Every tag a page's guide form names must be listed: a guide
 * form whose tag is missing does not render, and playbookLeadModel.test.ts
 * fails for it.
 */
export const playbookGuideFormats: Readonly<Record<string, WebsiteLeadGuideFormat>> = {
  "run-clubs": "run_club",
  "supper-clubs": "supper_club",
  "quiz-nights": "quiz_night",
  nightlife: "social_night",
  "racket-sports": "racket_social",
  outdoors: "outdoor_group",
  studios: "studio",
  workshops: "workshop",
  facilities: "facility",
  venues: "venue",
  communities: "community",
  creators: "creator",
  colleges: "society",
  teams: "team_social",
};

/**
 * The fields a form of each kind may show. Every field a form shows must be
 * filled. A walkthrough is a request for a time, which staff confirm on
 * WhatsApp; its organisation and what they run are optional to the intake.
 */
const kindFields = {
  guide: {needs: [], may: ["name"]},
  venue: {needs: ["orgName", "capacity", "nights"], may: ["name", "area"]},
  demo: {needs: ["name", "whatYouHost"], may: []},
  walkthrough: {needs: ["name", "preferredTime"], may: ["orgName", "whatYouHost"]},
} as const satisfies Record<string, {needs: readonly PlaybookLeadFieldName[]; may: readonly PlaybookLeadFieldName[]}>;

type PlaybookLeadFieldName = NonNullable<PlaybookLeadForm["fields"]>[number]["name"];
type KindFields = typeof kindFields;
/** The request kinds a playbook page's form can send. Other kinds keep to the page's WhatsApp actions. */
export type PlaybookSendableLeadKind = keyof KindFields;
/** A field a sendable form shows, besides the number. */
export type PlaybookLeadField = {[K in PlaybookSendableLeadKind]: KindFields[K]["needs" | "may"][number]}[PlaybookSendableLeadKind];
/** A form's answers, by field, with the number under `phone`. */
export type PlaybookLeadAnswers = Readonly<Partial<Record<PlaybookLeadField | "phone", string>>>;

const typed = (value: string | undefined) => (value ?? "").trim().replace(/\s+/gu, " ");

function isSendableKind(kind: string): kind is PlaybookSendableLeadKind {
  return Object.hasOwn(kindFields, kind);
}

/** The setup guide a page's format tag names, or undefined for a tag the map does not list. */
export function playbookGuideFormat(slug: string | undefined): WebsiteLeadGuideFormat | undefined {
  return slug !== undefined && Object.hasOwn(playbookGuideFormats, slug) ? playbookGuideFormats[slug] : undefined;
}

/**
 * The form's kind when the intake can take what it asks for, or null: a
 * link or text input, a kind no form sends yet, a field its kind does not carry, a field its kind
 * needs that it does not show, or a guide without a known format tag. A null
 * form does not render, and the page's WhatsApp actions stand alone.
 */
export function playbookSendableLeadKind(form: PlaybookLeadForm): PlaybookSendableLeadKind | null {
  // A link or text input is a try-it tool's: no backend reads one until its command ships.
  if ((form.input ?? "tel") !== "tel") return null;
  if (!isSendableKind(form.requestKind)) return null;
  const kind = form.requestKind;
  const rule: {needs: readonly string[]; may: readonly string[]} = kindFields[kind];
  const shown = (form.fields ?? []).map((field) => field.name as string);
  if (shown.some((name) => !rule.needs.includes(name) && !rule.may.includes(name))) return null;
  if (rule.needs.some((name) => !shown.includes(name))) return null;
  if (kind === "guide" && !playbookGuideFormat(form.format)) return null;
  return kind;
}

/**
 * Each answer the form cannot send, with the words under its field: an
 * empty field (a name needs two letters, as the intake does) or a number
 * that is not a mobile number.
 */
export function playbookLeadProblems(form: PlaybookLeadForm, answers: PlaybookLeadAnswers): Partial<Record<PlaybookLeadField | "phone", string>> {
  const problems: Partial<Record<PlaybookLeadField | "phone", string>> = {};
  for (const field of form.fields ?? []) {
    const name = field.name as PlaybookLeadField;
    if (typed(answers[name]).length < (name === "name" ? 2 : 1)) problems[name] = playbookCopy.leadForm.required[name];
  }
  if (!websiteLeadPhone(answers.phone ?? "", activeMarket.dialCode)) problems.phone = websiteLeadCopy.problems.invalid_phone;
  return problems;
}

/**
 * The lead a sendable form files: its kind, the number as typed, the
 * playbook consent version, the page path, the form's id as its entry, and
 * the kind's answers (a guide's format as the intake names it; a venue's
 * name as spaceName; a walkthrough's organisation and what they run as
 * organisation and whatYouRun). A shown name goes as the person's full name.
 */
export function playbookLeadRequest(form: PlaybookLeadForm, kind: PlaybookSendableLeadKind, answers: PlaybookLeadAnswers, sourcePage: string): WebsiteLeadForm {
  const shared = {
    phone: answers.phone ?? "",
    consentVersion: playbookCopy.leadForm.consentVersion,
    sourcePage,
    entry: form.id,
  };
  const fullName = typed(answers.name);
  const named = fullName ? {fullName} : {};
  if (kind === "guide") {
    const format = playbookGuideFormat(form.format);
    if (!format) throw new Error(`Playbook lead form ${form.id} has no setup guide for its format.`);
    return {kind, ...shared, ...named, answers: {format}};
  }
  if (kind === "venue") {
    const area = typed(answers.area);
    return {
      kind, ...shared, ...named,
      answers: {spaceName: typed(answers.orgName), capacity: typed(answers.capacity), nights: typed(answers.nights), ...(area ? {area} : {})},
    };
  }
  if (kind === "walkthrough") {
    const organisation = typed(answers.orgName);
    const whatYouRun = typed(answers.whatYouHost);
    return {
      kind, ...shared, fullName,
      answers: {preferredTime: typed(answers.preferredTime), ...(organisation ? {organisation} : {}), ...(whatYouRun ? {whatYouRun} : {})},
    };
  }
  return {kind, ...shared, fullName, answers: {whatYouHost: typed(answers.whatYouHost)}};
}
