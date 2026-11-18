import {HttpsError} from "firebase-functions/v2/https";
import {
  classifyCommandReceiptData,
  commandReceiptRef,
  commandRequestHash,
  writeCommandReceipt,
} from "../shared/commandReceipts";

/**
 * Replay receipts for the event-room commands that return a revision: the
 * receipt lives in `commandReceipts` under the command's name, keyed by the
 * caller's hashed request id, and remembers the revision the first request
 * applied. A retry returns it; another request under the same id fails.
 */
export const eventChatReceiptCommands = [
  "updateEventChatAccess",
  "actOnEventChatMessage",
  "setEventChatReaction",
  "updateEventChatProfileSharing",
  "manageEventChatMember",
] as const;

export type EventChatReceiptCommand = typeof eventChatReceiptCommands[number];

export function eventChatReceiptRef(
  db: FirebaseFirestore.Firestore,
  command: EventChatReceiptCommand,
  requestKey: string
): FirebaseFirestore.DocumentReference {
  return commandReceiptRef(db, command, requestKey);
}

/** Binds the acting user, the room and what the request asked for. */
export function eventChatRequestHash(
  uid: string,
  eventId: string,
  payloadHash: string
): string {
  return commandRequestHash(uid, eventId, payloadHash);
}

/**
 * The first request's result when [stored] is an exact retry, null when the
 * request is new, and an error when the id was used for another request.
 */
export function replayEventChatReceipt(
  stored: unknown,
  expected: {
    command: EventChatReceiptCommand;
    requestHash: string;
    nowMillis: number;
  }
): {revision?: number} | null {
  const lookup = classifyCommandReceiptData<{revision?: number}>(
    stored, expected);
  if (lookup.kind === "none") return null;
  if (lookup.kind === "conflict") {
    throw new HttpsError("already-exists", "This request was already used.");
  }
  return lookup.result ?? {};
}

export function writeEventChatReceipt(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  params: {
    command: EventChatReceiptCommand;
    requestHash: string;
    revision: number;
    nowMillis: number;
  }
): void {
  writeCommandReceipt(tx, ref, {
    command: params.command,
    retention: "request",
    requestHash: params.requestHash,
    result: {revision: params.revision},
    nowMillis: params.nowMillis,
  });
}
