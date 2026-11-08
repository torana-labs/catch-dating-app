/* eslint-disable max-len */
// Reads the shared settings document (programAssistantSettings/{programId},
// written by lane W1's updateProgramAssistantSettings) and the WhatsApp
// thread and message shapes W1 owns, with read-time defaults so a missing
// or partial document never turns the assistant on.

import {staffTimestampMillis} from "../../shared/eventOperatorAuthority";
import {normalizeDailyTokenBudget} from "./budget";
import {
  normalizeLanguages,
  normalizeReplyWithin,
  type AssistantLanguage,
  type ReplyWithin,
} from "./policy";
import {normalizeTone, type AssistantTone} from "./prompt";

export const PROGRAM_ASSISTANT_SETTINGS = "programAssistantSettings";
export const PROGRAM_WHATSAPP_THREADS = "programWhatsappThreads";
export const PROGRAM_WHATSAPP_MESSAGES = "programWhatsappMessages";

export interface AssistantSettings {
  enabled: boolean;
  languages: AssistantLanguage[];
  replyWithin: ReplyWithin;
  escalationStaffUids: string[];
  tone: AssistantTone;
  dailyTokenBudget: number;
}

export function normalizeSettings(raw: unknown): AssistantSettings {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    enabled: row.enabled === true,
    languages: normalizeLanguages(row.languages),
    replyWithin: normalizeReplyWithin(row.replyWithin),
    escalationStaffUids: (Array.isArray(row.escalationStaffUids) ?
      row.escalationStaffUids : []).filter((uid): uid is string =>
      typeof uid === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(uid)).slice(0, 10),
    tone: normalizeTone(row.tone),
    dailyTokenBudget: normalizeDailyTokenBudget(row.dailyTokenBudget),
  };
}

export async function readAssistantSettings(db: FirebaseFirestore.Firestore,
  programId: string): Promise<AssistantSettings> {
  const snap = await db.collection(PROGRAM_ASSISTANT_SETTINGS).doc(programId).get();
  return normalizeSettings(snap.data());
}

export interface ThreadView {
  threadId: string;
  programId: string;
  householdId: string;
  handledBy: "assistant" | "planner";
  serviceWindowExpiresAtMillis: number;
  unknownSender: boolean;
}

/** The thread fields the assistant relies on; null when unusable. */
export function threadView(threadId: string, raw: unknown): ThreadView | null {
  const row = (raw && typeof raw === "object" ? raw : null) as Record<string, unknown> | null;
  if (!row || typeof row.programId !== "string" || typeof row.householdId !== "string" ||
      !row.programId || !row.householdId) return null;
  return {
    threadId,
    programId: row.programId,
    householdId: row.householdId,
    // A thread nobody has taken over is the assistant's.
    handledBy: row.handledBy === "planner" ? "planner" : "assistant",
    serviceWindowExpiresAtMillis: millisField(row.serviceWindowExpiresAtMillis, row.serviceWindowExpiresAt),
    unknownSender: row.unknownSender === true,
  };
}

export interface MessageView {
  messageId: string;
  threadId: string;
  direction: "inbound" | "outbound";
  kind: string;
  text: string | null;
  author: string;
  createdAtMillis: number;
}

export function messageView(messageId: string, raw: unknown): MessageView | null {
  const row = (raw && typeof raw === "object" ? raw : null) as Record<string, unknown> | null;
  if (!row || typeof row.threadId !== "string" ||
      (row.direction !== "inbound" && row.direction !== "outbound")) return null;
  return {
    messageId,
    threadId: row.threadId,
    direction: row.direction,
    kind: typeof row.kind === "string" ? row.kind : "text",
    text: typeof row.text === "string" ? row.text : null,
    author: typeof row.author === "string" ? row.author : "",
    createdAtMillis: millisField(row.createdAtMillis, row.createdAt),
  };
}

/** W1 stores times as integer millis; a timestamp is still accepted. */
function millisField(millis: unknown, timestamp: unknown): number {
  if (typeof millis === "number" && Number.isSafeInteger(millis) && millis >= 0) return millis;
  if (!timestamp || typeof timestamp !== "object") return 0;
  try {
    return staffTimestampMillis(timestamp);
  } catch {
    return 0;
  }
}
