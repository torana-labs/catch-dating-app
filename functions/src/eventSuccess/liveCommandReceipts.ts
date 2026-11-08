import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventLiveCommandReceiptDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventLiveCommandReceiptDocument} from
  "../shared/generated/validators/eventLiveCommandReceiptDocument";

/**
 * Replay receipts shared by the live run-of-show, close-out and crawl
 * commands: one server-only document per (command, actor, event,
 * requestId), holding the request's content hash and what it applied. A
 * retry with the same request replays; a different request under the same
 * id is rejected.
 */
export const LIVE_COMMAND_RECEIPTS = "eventLiveCommandReceipts";
const RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type LiveCommand = EventLiveCommandReceiptDocument["command"];
export type LiveCommandResult = NonNullable<
  EventLiveCommandReceiptDocument["result"]>;

/** The receipt's document id for one request. */
export function liveCommandReceiptId(
  command: LiveCommand,
  actorUid: string,
  eventId: string,
  requestId: string
): string {
  return createHash("sha256")
    .update(JSON.stringify(["event-live-command-v1", command, actorUid,
      eventId, requestId]))
    .digest("hex");
}

/** A stable content hash of the request, key order ignored. */
export function liveCommandRequestHash(
  command: LiveCommand,
  payload: unknown
): string {
  return createHash("sha256")
    .update(canonicalJson([command, payload]))
    .digest("hex");
}

export function liveCommandReceiptRef(
  db: FirebaseFirestore.Firestore,
  receiptId: string
): FirebaseFirestore.DocumentReference {
  return db.collection(LIVE_COMMAND_RECEIPTS).doc(receiptId);
}

/**
 * Reads a stored receipt for replay. Returns null when there is none, the
 * receipt when it matches this exact request, and throws when the id was
 * used for another request.
 */
export function matchingLiveCommandReceipt(
  stored: unknown,
  expected: {
    receiptId: string;
    command: LiveCommand;
    eventId: string;
    actorUid: string;
    requestHash: string;
  }
): EventLiveCommandReceiptDocument | null {
  if (stored === undefined || stored === null) return null;
  // The TTL timestamp is storage plumbing; replay reads only the rest.
  const receipt = {...stored as Record<string, unknown>};
  delete receipt.expiresAt;
  if (!validateEventLiveCommandReceiptDocument(receipt) ||
      receipt.receiptId !== expected.receiptId ||
      receipt.command !== expected.command ||
      receipt.eventId !== expected.eventId ||
      receipt.actorUid !== expected.actorUid ||
      receipt.requestHash !== expected.requestHash) {
    throw new HttpsError("already-exists",
      "Request ID was already used for another live change.");
  }
  return receipt as EventLiveCommandReceiptDocument;
}

/** A validated receipt ready to create in the applying transaction. */
export function buildLiveCommandReceipt(params: {
  receiptId: string;
  command: LiveCommand;
  eventId: string;
  actorUid: string;
  requestHash: string;
  appliedRevision: number;
  result?: LiveCommandResult;
  nowMillis: number;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
}): Record<string, unknown> {
  const receipt: Record<string, unknown> = {
    receiptId: params.receiptId,
    command: params.command,
    eventId: params.eventId,
    actorUid: params.actorUid,
    requestHash: params.requestHash,
    appliedRevision: params.appliedRevision,
    ...(params.result ? {result: params.result} : {}),
    createdAtMs: params.nowMillis,
  };
  if (!validateEventLiveCommandReceiptDocument(receipt)) {
    throw new HttpsError("internal", "Live command receipt is invalid.");
  }
  return {
    ...receipt,
    expiresAt: params.timestampFromMillis(params.nowMillis + RECEIPT_TTL_MS),
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
