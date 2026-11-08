/* eslint-disable max-len */
// programAssistantRuns: one audit row per assistant run. Ids, hashes,
// token counts and the outcome only; never the guest's text, the reply,
// the fact pack, names or phone numbers.

import {createHash} from "node:crypto";
import type {AssistantLanguage, EscalationReason} from "./policy";
import {validateProgramAssistantRunDocument} from
  "../../shared/generated/validators/programAssistantRunDocument";

export const PROGRAM_ASSISTANT_RUNS = "programAssistantRuns";

export type RunMode = "live" | "preview";
export type RunStatus = "intent" | "answered" | "escalated" | "skipped";

export interface ProgramAssistantRun {
  runId: string;
  programId: string;
  organizerId: string;
  mode: RunMode;
  threadId: string | null;
  messageId: string | null;
  actorUid: string | null;
  status: RunStatus;
  reason: EscalationReason | null;
  language: AssistantLanguage;
  model: string;
  promptVersion: string;
  factPackVersion: string;
  promptHash: string | null;
  factPackHash: string | null;
  budgetDay: string;
  reservedTokens: number;
  inputTokens: number;
  outputTokens: number;
  attempts: number;
  providerStatus: number | null;
  latencyMillis: number | null;
  createdAtMillis: number;
  updatedAtMillis: number;
}

/**
 * Deterministic run id: a live run is keyed by the inbound message, so a
 * retried trigger finds its own run; a preview by the actor's request id.
 */
export function assistantRunId(mode: RunMode, key: string): string {
  return `par_${createHash("sha256").update(`${mode}:${key}`).digest("hex").slice(0, 40)}`;
}

export function requireValidRun(run: ProgramAssistantRun): ProgramAssistantRun {
  if (!validateProgramAssistantRunDocument(run)) {
    throw new Error("Assistant run does not satisfy its contract.");
  }
  return run;
}

/** Programme-local calendar day (YYYY-MM-DD) for the daily budget. */
export function budgetDay(millis: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric",
      month: "2-digit", day: "2-digit"}).format(new Date(millis));
  } catch {
    return new Date(millis).toISOString().slice(0, 10);
  }
}
