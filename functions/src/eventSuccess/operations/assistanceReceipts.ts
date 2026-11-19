import type {DocumentReference, Firestore, Transaction} from
  "firebase-admin/firestore";
import {
  CommandReceiptRetention,
  classifyCommandReceiptData,
  commandReceiptRef,
  writeCommandReceipt,
} from "../../shared/commandReceipts";

/**
 * Replay receipts for the event-assistance commands. Each lives in the shared
 * `commandReceipts` store under its command name, keyed by the command's
 * 64-hex operation digest, and is read only by that command's own retry.
 * `result` carries the applied revision and the live-state fences a replay
 * re-checks (source generations, hashes, the time it was applied).
 */
export type AssistanceReceiptCommand =
  | "eventAssistanceAccountability"
  | "eventAssistanceCase"
  | "eventAssistanceMembership"
  | "eventAssistanceParticipation"
  | "eventAssistanceDeparture"
  | "eventAssistanceRoute"
  | "eventAssistanceRcsCallback"
  | "eventAssistanceRuntimeConfig"
  | "eventAssistanceSetting"
  | "eventAssistanceStaff";

const DIGEST = /^[a-f0-9]{64}$/;

export function assistanceReceiptRef(db: Firestore,
  command: AssistanceReceiptCommand, digest: string): DocumentReference {
  if (!DIGEST.test(digest)) {
    throw new Error("An assistance receipt id is a SHA-256 hex digest.");
  }
  return commandReceiptRef(db, command, digest);
}

/**
 * The first request's stored result when [stored] is a live receipt for this
 * exact request, null when there is none (or it expired), and the command's
 * own conflict error when the id was used for another request or the stored
 * result is not the shape [valid] expects.
 */
export function replayAssistanceReceipt<Result>(stored: unknown,
  expected: {command: AssistanceReceiptCommand; requestHash: string;
    nowMillis: number},
  valid: (result: Record<string, unknown>) => boolean,
  conflict: () => Error): Result | null {
  const lookup = classifyCommandReceiptData<Record<string, unknown>>(stored,
    expected);
  if (lookup.kind === "none") return null;
  if (lookup.kind === "conflict" || !lookup.result ||
      !valid(lookup.result)) throw conflict();
  return lookup.result as Result;
}

/**
 * Whether a live receipt (replay or conflict) exists, for a command that must
 * skip a read when it will replay. Pass the same `nowMillis` to the later
 * [replayAssistanceReceipt] so both calls agree on expiry.
 */
export function hasAssistanceReceipt(stored: unknown,
  expected: {command: AssistanceReceiptCommand; requestHash: string;
    nowMillis: number}): boolean {
  return classifyCommandReceiptData(stored, expected).kind !== "none";
}

/** Writes the receipt in the transaction that applies the command. */
export function writeAssistanceReceipt(tx: Transaction,
  ref: DocumentReference, params: {
    command: AssistanceReceiptCommand;
    requestHash: string;
    nowMillis: number;
    result: Record<string, unknown>;
    retention?: CommandReceiptRetention;
  }): void {
  writeCommandReceipt(tx, ref, {command: params.command,
    retention: params.retention ?? "request",
    requestHash: params.requestHash, result: params.result,
    nowMillis: params.nowMillis});
}

/** Narrow guards for stored receipt results. */
export const isRevision = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 1;
export const isMillis = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
export const isDigest = (value: unknown): value is string =>
  typeof value === "string" && DIGEST.test(value);
