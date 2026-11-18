import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {
  classifyCommandReceiptData,
  commandReceiptRef,
  commandRequestHash,
  writeCommandReceipt,
} from "../shared/commandReceipts";

/**
 * Replay receipts shared by the live run-of-show, close-out and crawl
 * commands: one `commandReceipts` document per (command, actor, event,
 * requestId), holding the request's content hash and what it applied. A retry
 * with the same request replays; a different request under the same id is
 * rejected.
 */
export type LiveCommand =
  | "saveEventPlanStep"
  | "setEventCloseOut"
  | "changeEventCrawlStop";

/** What a replay returns beside the applied revision. */
export interface LiveCommandResult {
  stepCount?: number;
  broadcastRequestId?: string;
}

export interface LiveCommandReceipt {
  appliedRevision: number;
  result?: LiveCommandResult;
}

/** The receipt's document for one request. */
export function liveCommandReceiptRef(
  db: FirebaseFirestore.Firestore,
  command: LiveCommand,
  actorUid: string,
  eventId: string,
  requestId: string
): FirebaseFirestore.DocumentReference {
  return commandReceiptRef(db, command, createHash("sha256")
    .update(JSON.stringify(["event-live-command-v1", command, actorUid,
      eventId, requestId]))
    .digest("hex"));
}

/** A stable content hash of the request, key order ignored. */
export function liveCommandRequestHash(
  command: LiveCommand,
  payload: unknown
): string {
  return commandRequestHash(command, payload);
}

/**
 * Reads a stored receipt for replay. Returns null when there is none, the
 * receipt when it matches this exact request, and throws when the id was
 * used for another request.
 */
export function matchingLiveCommandReceipt(
  stored: unknown,
  expected: {command: LiveCommand; requestHash: string; nowMillis: number}
): LiveCommandReceipt | null {
  const lookup = classifyCommandReceiptData<LiveCommandReceipt["result"] & {
    appliedRevision?: number;
  }>(stored, expected);
  if (lookup.kind === "none") return null;
  const {appliedRevision, ...result} = lookup.kind === "replay" ?
    lookup.result ?? {} : {} as {appliedRevision?: number};
  if (lookup.kind === "conflict" || typeof appliedRevision !== "number") {
    throw new HttpsError("already-exists",
      "Request ID was already used for another live change.");
  }
  return {appliedRevision,
    ...(Object.keys(result).length > 0 ? {result} : {})};
}

/** Writes the receipt in the transaction that applies the command. */
export function writeLiveCommandReceipt(
  transaction: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  params: {
    command: LiveCommand;
    requestHash: string;
    appliedRevision: number;
    result?: LiveCommandResult;
    nowMillis: number;
  }
): void {
  writeCommandReceipt(transaction, ref, {
    command: params.command,
    retention: "request",
    requestHash: params.requestHash,
    result: {appliedRevision: params.appliedRevision, ...params.result},
    nowMillis: params.nowMillis,
  });
}
