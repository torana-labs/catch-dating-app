import {interpolateContent as fill} from "@content/interpolate";
import {weddingsCopy} from "@content/weddings";

const stepOneCopy = weddingsCopy.stepOne;
const stepTwoCopy = weddingsCopy.stepTwo;

/** Step 1 of the pilot application: who is applying and the next wedding. */
export interface WeddingsStepOneDraft {
  /** "A wedding planner" or "The couple or family". */
  who: string;
  /** "A wedding" or "Another multi-day programme". */
  what: string;
  name: string;
  /** Optional. */
  company: string;
  /** The national number; the +91 prefix is fixed. */
  phone: string;
  /** yyyy-mm-dd from the date field. */
  date: string;
  destination: string;
  guests: string;
  /** Optional. */
  tools: readonly string[];
}

/** Step 2: the shape of the weekend and what the planner wants from Catch. Answers start empty. */
export interface WeddingsStepTwoDraft {
  functions: number;
  hotels: number;
  team: number;
  flying: string;
  wants: readonly string[];
  /** Optional, at most 600 characters. */
  lastTime: string;
  heard: string;
}

export type WeddingsApplication = WeddingsStepOneDraft & WeddingsStepTwoDraft;

/** A step's errors, by field. A field with no error is absent. */
export type WeddingsErrors<Draft> = Partial<Record<keyof Draft, string>>;

/**
 * Sends a finished application. Production posts it to the waitlist route
 * (`weddingsSubmit.ts`); stories and tests pass their own.
 */
export type WeddingsSubmit = (application: WeddingsApplication) => Promise<void>;

export const initialStepOneDraft: WeddingsStepOneDraft = {
  who: "", what: "", name: "", company: "", phone: "", date: "", destination: "", guests: "", tools: [],
};

export const initialStepTwoDraft: WeddingsStepTwoDraft = {
  functions: stepTwoCopy.functions.initial,
  hotels: stepTwoCopy.hotels.initial,
  team: stepTwoCopy.team.initial,
  flying: "",
  wants: [],
  lastTime: "",
  heard: "",
};

/** An Indian mobile number: ten digits starting 6 to 9, spaces allowed. */
export function isIndianMobile(phone: string) {
  return /^[6-9]\d{9}$/u.test(phone.replace(/\s+/gu, ""));
}

/** What step 1 still needs, as the board words it. */
export function stepOneErrors(draft: WeddingsStepOneDraft): WeddingsErrors<WeddingsStepOneDraft> {
  const errors: WeddingsErrors<WeddingsStepOneDraft> = {};
  const digits = draft.phone.replace(/\D/gu, "");
  if (!draft.who) errors.who = stepOneCopy.who.error;
  if (!draft.what) errors.what = stepOneCopy.what.error;
  if (!draft.name.trim()) errors.name = stepOneCopy.name.error;
  if (!digits) errors.phone = stepOneCopy.phone.missing;
  else if (!isIndianMobile(digits)) errors.phone = stepOneCopy.phone.invalid;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(draft.date)) errors.date = stepOneCopy.date.error;
  if (!draft.destination.trim()) errors.destination = stepOneCopy.destination.error;
  if (!draft.guests) errors.guests = stepOneCopy.guests.error;
  return errors;
}

export function stepOneIsComplete(draft: WeddingsStepOneDraft) {
  return Object.keys(stepOneErrors(draft)).length === 0;
}

/** What step 2 still needs: every answer but the note is required, and the note has a limit. */
export function stepTwoErrors(draft: WeddingsStepTwoDraft): WeddingsErrors<WeddingsStepTwoDraft> {
  const errors: WeddingsErrors<WeddingsStepTwoDraft> = {};
  const max = stepTwoCopy.lastTime.max;
  if (!draft.flying) errors.flying = stepTwoCopy.flying.error;
  if (!draft.wants.length) errors.wants = stepTwoCopy.wants.error;
  if (draft.lastTime.length > max) errors.lastTime = fill(stepTwoCopy.lastTime.error, {max});
  if (!draft.heard) errors.heard = stepTwoCopy.heard.error;
  return errors;
}

/** Adds or removes one option from a multiple choice. */
export function toggleOption(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/** "12 Dec" from yyyy-mm-dd, read as a calendar date with no time zone. */
export function shortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", timeZone: "UTC"}).format(Date.UTC(year, month - 1, day));
}

/** Step 2's summary of step 1: where, from when and how many. */
export function stepTwoSummary(draft: WeddingsStepOneDraft) {
  return fill(stepTwoCopy.summary, {destination: draft.destination.trim(), date: shortDate(draft.date), guests: draft.guests});
}

/** Step 2's line about who applied: name, company and number. */
export function stepTwoContact(draft: WeddingsStepOneDraft) {
  const phone = draft.phone.replace(/\D/gu, "").replace(/^(\d{5})(\d{5})$/u, "$1 $2");
  const company = draft.company.trim();
  return company
    ? fill(stepTwoCopy.contact, {name: draft.name.trim(), company, phone})
    : fill(stepTwoCopy.contactNoCompany, {name: draft.name.trim(), phone});
}

/** The sent state's one line of what step 2 said. */
export function sentSummary(draft: WeddingsStepTwoDraft) {
  const sent = weddingsCopy.sent;
  return fill(sent.summary, {
    functions: draft.functions,
    hotels: draft.hotels === 1 ? sent.hotelOne : fill(sent.hotelMany, {count: draft.hotels}),
    team: draft.team,
    flying: (draft.flying || "—").toLocaleLowerCase("en-IN"),
    wants: draft.wants.join(", ") || "—",
  });
}

export function firstName(name: string) {
  return name.trim().split(/\s+/u)[0] ?? "";
}

const stepOneStorageKey = "catch_weddings_application_step_one_v2";

/** Hands step 1 to the application page in this tab only; nothing leaves the browser. */
export function saveStepOne(draft: WeddingsStepOneDraft) {
  try {
    window.sessionStorage.setItem(stepOneStorageKey, JSON.stringify(draft));
  } catch {
    // Private windows may refuse storage; the application page asks again.
  }
}

export function readStepOne(): WeddingsStepOneDraft | null {
  try {
    const raw = window.sessionStorage.getItem(stepOneStorageKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isStepOneDraft(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearStepOne() {
  try {
    window.sessionStorage.removeItem(stepOneStorageKey);
  } catch {
    // Nothing to clear.
  }
}

function isStepOneDraft(value: unknown): value is WeddingsStepOneDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return ["who", "what", "name", "company", "phone", "date", "destination", "guests"].every((key) => typeof draft[key] === "string") &&
    Array.isArray(draft.tools) && draft.tools.every((item) => typeof item === "string");
}
