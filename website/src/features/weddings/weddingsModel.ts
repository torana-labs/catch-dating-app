import type {CatchBadgeProps} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import {weddingsCopy, type WeddingsReply, type WeddingsTone} from "@content/weddings";

const stepOneCopy = weddingsCopy.stepOne;
const stepTwoCopy = weddingsCopy.stepTwo;

/** Step 1 of the pilot application: who is applying and the next wedding. */
export interface WeddingsStepOneDraft {
  name: string;
  company: string;
  /** The national number; the +91 prefix is fixed. */
  phone: string;
  /** yyyy-mm-dd from the date field. */
  date: string;
  destination: string;
  guests: string;
  tools: readonly string[];
}

/** Step 2: the shape of the weekend and what the planner wants from Catch. */
export interface WeddingsStepTwoDraft {
  functions: number;
  hotels: number;
  team: number;
  flying: string;
  wants: readonly string[];
  lastTime: string;
  heard: string;
}

export type WeddingsApplication = WeddingsStepOneDraft & WeddingsStepTwoDraft;

/**
 * Sends a finished application. The page has no intake front door that
 * accepts this application yet, so production renders without one and the
 * Send button stays disabled; stories and tests pass their own.
 */
export type WeddingsSubmit = (application: WeddingsApplication) => Promise<void>;

export const initialStepOneDraft: WeddingsStepOneDraft = {
  name: "",
  company: "",
  phone: "",
  date: "",
  destination: "",
  guests: stepOneCopy.guests.initial,
  tools: stepOneCopy.tools.initial,
};

export const initialStepTwoDraft: WeddingsStepTwoDraft = {
  functions: stepTwoCopy.functions.initial,
  hotels: stepTwoCopy.hotels.initial,
  team: stepTwoCopy.team.initial,
  flying: stepTwoCopy.flying.initial,
  wants: stepTwoCopy.wants.initial,
  lastTime: "",
  heard: stepTwoCopy.heard.initial,
};

/** An Indian mobile number: ten digits starting 6 to 9, spaces allowed. */
export function isIndianMobile(phone: string) {
  return /^[6-9]\d{9}$/u.test(phone.replace(/\s+/gu, ""));
}

export function stepOneIsComplete(draft: WeddingsStepOneDraft) {
  return draft.name.trim().length >= 2 && draft.company.trim().length >= 2 && isIndianMobile(draft.phone) &&
    /^\d{4}-\d{2}-\d{2}$/u.test(draft.date) && draft.destination.trim().length >= 2 && draft.guests.length > 0;
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

/** Step 2's line under its title: where, from when and how many, from step 1. */
export function stepTwoSummary(draft: WeddingsStepOneDraft) {
  return fill(stepTwoCopy.summary, {destination: draft.destination.trim(), date: shortDate(draft.date), guests: draft.guests});
}

export function firstName(name: string) {
  return name.trim().split(/\s+/u)[0] ?? "";
}

/** One household's reply to one function, as the planner's table draws it. */
export function replyBadge(reply: WeddingsReply, size: number): CatchBadgeProps {
  const labels = weddingsCopy.follow.setUp.card.replies;
  if (reply === "notInvited") return {label: labels.notInvited, tone: "neutral"};
  if (reply === "pending") return {label: labels.pending, tone: "neutral"};
  if (reply === "maybe") return {label: labels.maybe, tone: "warning"};
  if (reply === 0) return {label: labels.notComing, tone: "neutral"};
  return {label: fill(labels.coming, {coming: reply, size}), tone: "success"};
}

/** The board's tones on the web badge: a format tone takes the brand tone. */
export function badgeTone(tone: WeddingsTone | "format"): CatchBadgeProps["tone"] {
  return tone === "format" ? "brand" : tone;
}

const stepOneStorageKey = "catch_weddings_application_step_one_v1";

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
  return ["name", "company", "phone", "date", "destination", "guests"].every((key) => typeof draft[key] === "string") &&
    Array.isArray(draft.tools) && draft.tools.every((item) => typeof item === "string");
}
