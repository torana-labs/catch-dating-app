import {createHash} from "node:crypto";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  commandReceiptRef,
  commandRequestHash,
  readCommandReceipt,
  writeCommandReceipt,
} from "../shared/commandReceipts";

// The command layer (contracts/commands/catalog.json): every surface (the
// website try-it tools, Catch Host, the catch CLI, later WhatsApp) calls the
// same callable with the same envelope (contracts/shared/
// command_envelope.schema.json). This module holds what every command shares:
// the caller check, the preview hash, and replay through commandReceipts.

export type CommandMode = "preview" | "apply";
export type CommandSurface = "website" | "catch_host" | "cli" | "whatsapp";

export interface CommandSummary {
  headline: string;
  lines: string[];
}

export interface CommandEffect {
  kind: string;
  ref: string | null;
  label: string;
}

export interface CommandNext {
  commandId: string;
  label: string;
}

/** The request fields every command's payload carries. */
export interface CommandEnvelope<Input> {
  mode: CommandMode;
  idempotencyKey: string;
  surface: CommandSurface;
  confirm?: {commandId: string; previewHash: string};
  input: Input;
}

/** The response fields every command returns. */
export interface CommandResponse<Result, Status extends string = string> {
  commandId: string;
  status: Status;
  previewHash: string;
  summary: CommandSummary;
  effects: CommandEffect[];
  next: CommandNext[];
  receiptId: string | null;
  result: Result;
}

const PHONE = /^\+[1-9][0-9]{7,14}$/u;

/**
 * A signed-in caller whose phone Firebase verified with a one-time code (the
 * website's "Continue with phone" sheet, the same sign-in Catch Host uses).
 * Try-it tools need it before they run (owner decision, 18 Nov 2026).
 * @return {object} The caller's uid and verified phone.
 */
export function requirePhoneVerifiedCaller(
  request: CallableRequest<unknown>
): {uid: string; phone: string} {
  if (!request.auth) {
    throw new HttpsError("unauthenticated",
      "Confirm your phone number with a code first.");
  }
  const phone = request.auth.token?.phone_number;
  if (typeof phone !== "string" || !PHONE.test(phone)) {
    throw new HttpsError("failed-precondition",
      "Confirm your phone number with a code first.",
      {reason: "phone_not_verified"});
  }
  return {uid: request.auth.uid, phone};
}

/**
 * Binds a preview to exactly what it showed: the command, the caller, the
 * input and the evidence the result was worked out from. Apply recomputes
 * it and refuses a confirm that names another value.
 * @return {string} SHA-256 hex.
 */
export function commandPreviewHash(commandId: string, uid: string,
  input: unknown, evidence: unknown): string {
  return commandRequestHash("preview", commandId, uid, input, evidence);
}

/**
 * Refuses a confirm for another command or for a preview whose result has
 * changed since the caller reviewed it.
 */
export function assertConfirmMatches(commandId: string,
  confirm: CommandEnvelope<unknown>["confirm"], previewHash: string): void {
  if (!confirm) return;
  if (confirm.commandId !== commandId) {
    throw new HttpsError("invalid-argument",
      "This confirmation is for a different action.",
      {reason: "confirm_command_mismatch"});
  }
  if (confirm.previewHash !== previewHash) {
    throw new HttpsError("aborted",
      "This changed since your preview. Review it again.",
      {reason: "changed_since_preview"});
  }
}

/** The receipt command name: camelCase, from the dotted command id. */
export function receiptCommandName(commandId: string): string {
  return commandId.split(/[.-]/u).map((part, index) => index === 0 ? part :
    part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

/** One receipt per caller, command and idempotency key. */
export function commandReceiptKey(uid: string, idempotencyKey: string): string {
  return createHash("sha256").update(`${uid}\u0000${idempotencyKey}`)
    .digest("hex");
}

/**
 * Looks up an applied command's receipt inside the transaction (before any
 * write). Returns the stored response for an exact retry, null for a new
 * request, and refuses another request that reuses the key.
 * @return {Promise<object|null>} The stored response, or null.
 */
export async function replayCommand<Response>(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: {commandId: string; uid: string; idempotencyKey: string;
    requestHash: string; nowMillis: number}
): Promise<{response: Response; receiptId: string} | null> {
  const command = receiptCommandName(params.commandId);
  const ref = commandReceiptRef(db, command,
    commandReceiptKey(params.uid, params.idempotencyKey));
  const lookup = await readCommandReceipt<{response: Response}>(tx, ref, {
    command, requestHash: params.requestHash, nowMillis: params.nowMillis,
  });
  if (lookup.kind === "conflict") {
    throw new HttpsError("already-exists",
      "This request changed. Start again with a new request.",
      {reason: "idempotency_key_reused"});
  }
  if (lookup.kind === "replay" && lookup.result?.response) {
    return {response: lookup.result.response, receiptId: ref.id};
  }
  return null;
}

/** The receipt id an applied command will write, for its response. */
export function commandReceiptDocumentId(db: FirebaseFirestore.Firestore,
  commandId: string, uid: string, idempotencyKey: string): string {
  return commandReceiptRef(db, receiptCommandName(commandId),
    commandReceiptKey(uid, idempotencyKey)).id;
}

/** Records the applied command's response in its transaction. */
export function recordCommand(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: {commandId: string; uid: string; idempotencyKey: string;
    requestHash: string; nowMillis: number; response: object}
): void {
  const command = receiptCommandName(params.commandId);
  writeCommandReceipt(tx, commandReceiptRef(db, command,
    commandReceiptKey(params.uid, params.idempotencyKey)), {
    command, retention: "request", nowMillis: params.nowMillis,
    requestHash: params.requestHash,
    result: {response: params.response as Record<string, unknown>},
  });
}

export {commandRequestHash};
