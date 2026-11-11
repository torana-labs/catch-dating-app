import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  OrganizerProgramDocument,
  OrganizerSenderConnectionDocument,
  ProgramGuestDocument,
  ProgramHouseholdDocument,
  ProgramWhatsappDispatchDocument,
  ProgramWhatsappReplyOperationDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {validateProgramWhatsappDispatchDocument} from
  "../../shared/generated/validators/programWhatsappDispatchDocument";
import {validateProgramWhatsappReplyOperationDocument} from
  "../../shared/generated/validators/programWhatsappReplyOperationDocument";
import {assertOutboundContentAllowed} from
  "../../communications/outboundContentPolicy";
import {operationContentHash} from "../../operations/durableActions";
import {
  MetaProviderError,
  MetaWhatsappProvider,
  OrganizerTokenStore,
} from "../../organizers/organizerWhatsappProvider";
import {
  metaWhatsappAppId,
  metaWhatsappAppSecret,
  metaWhatsappConfigId,
  metaWhatsappGraphVersion,
} from "../../organizers/organizerMessagingSetup";
import {whatsappStatusCorrelation} from
  "../../eventSuccess/operations/whatsappDeliveryProtocol";
import {whatsappEndpointHash} from
  "../../eventSuccess/operations/whatsappReplyProtocol";
import {PROGRAM_WHATSAPP_DISPATCHES} from "../programDeliveryWorker";
import {
  PROGRAM_WHATSAPP_MESSAGES,
  PROGRAM_WHATSAPP_REPLY_OPERATIONS,
  PROGRAM_WHATSAPP_THREADS,
  isProgramWhatsappWindowOpen,
  messagePreview,
  programWhatsappReplyAttemptId,
  programWhatsappReplyMessageId,
  programWhatsappReplyOperationId,
  programWhatsappThreadId,
  sha256,
} from "./ids";
import {
  readThread,
  requireValidMessage,
  requireValidThread,
  type ProgramMessage,
  type ProgramThread,
} from "./threads";

// Free-text replies inside the 24-hour window, for the planner (callable)
// and the assistant (lane W2, through sendProgramServiceReply). The shape
// mirrors sendOrganizerWhatsappReply: a durable reservation precedes the
// Meta call, an uncertain outcome fails closed (state unknown), and a
// replay of the same key returns the stored message. Each send also writes
// a whatsappDispatches record (source program, kind service) so delivery receipts
// route back to the message.

export type ReplyOperation = ProgramWhatsappReplyOperationDocument;

export interface ProgramReplyDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  provider: () => Pick<MetaWhatsappProvider, "sendText">;
  tokenStore: Pick<OrganizerTokenStore, "accessBound">;
}

export const defaultProgramReplyDeps: ProgramReplyDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  provider: () => new MetaWhatsappProvider({
    appId: metaWhatsappAppId.value(),
    appSecret: metaWhatsappAppSecret.value(),
    configId: metaWhatsappConfigId.value(),
    graphVersion: metaWhatsappGraphVersion.value(),
  }),
  tokenStore: new OrganizerTokenStore(),
};

export interface ProgramReplyInput {
  programId: string;
  threadId: string;
  text: string;
  idempotencyKey: string;
  author: ReplyOperation["author"];
  actorUid: string | null;
  runId: string | null;
  cannedReplyId: string | null;
  /** Planner replies fence the window they saw; the assistant's do not. */
  expectedLastInboundAtMillis: number | null;
}

export interface ProgramReplyResult {
  programId: string;
  threadId: string;
  messageId: string;
  providerMessageId: string | null;
  sentAtMillis: number;
  replayed: boolean;
}

interface Reservation {
  kind: "reserved";
  connection: OrganizerSenderConnectionDocument;
  connectionId: string;
  toE164: string;
  callbackData: string;
}

/** Reserves, sends and records one free-text reply. */
export async function sendProgramWhatsappText(deps: ProgramReplyDeps,
  input: ProgramReplyInput): Promise<ProgramReplyResult> {
  assertOutboundContentAllowed([input.text],
    "This WhatsApp reply contains language that cannot be delivered.");
  const db = deps.firestore();
  const now = deps.now();
  const operationId = programWhatsappReplyOperationId(input.programId,
    input.threadId, input.idempotencyKey);
  const messageId = programWhatsappReplyMessageId(operationId);
  const attemptId = programWhatsappReplyAttemptId(operationId);
  const bodyHash = sha256(input.text);
  const operationRef = db.collection(PROGRAM_WHATSAPP_REPLY_OPERATIONS)
    .doc(operationId);
  const messageRef = db.collection(PROGRAM_WHATSAPP_MESSAGES).doc(messageId);
  const threadRef = db.collection(PROGRAM_WHATSAPP_THREADS)
    .doc(input.threadId);
  const dispatchRef = db.collection(PROGRAM_WHATSAPP_DISPATCHES)
    .doc(attemptId);
  const reservation = await db.runTransaction(async (tx):
    Promise<Reservation | {kind: "replay"; result: ProgramReplyResult}> => {
    const [operationSnap, messageSnap, threadSnap, programSnap] =
      await Promise.all([tx.get(operationRef), tx.get(messageRef),
        tx.get(threadRef), tx.get(db.collection("organizerPrograms")
          .doc(input.programId))]);
    const stored = messageSnap.data() as ProgramMessage | undefined;
    if (stored) {
      if (stored.programId !== input.programId ||
          stored.threadId !== input.threadId || stored.text !== input.text) {
        throw new HttpsError("already-exists", "Reply key is already in use.");
      }
      return {kind: "replay", result: {programId: input.programId,
        threadId: input.threadId, messageId,
        providerMessageId: stored.providerMessageId,
        sentAtMillis: stored.createdAtMillis, replayed: true}};
    }
    const operation = operationSnap.data() as ReplyOperation | undefined;
    if (operation) {
      if (operation.programId !== input.programId ||
          operation.threadId !== input.threadId ||
          operation.bodyHash !== bodyHash) {
        throw new HttpsError("already-exists", "Reply key is already in use.");
      }
      throw new HttpsError(
        operation.state === "unknown" ? "failed-precondition" : "aborted",
        operation.state === "unknown" ?
          "WhatsApp accepted an attempt with an unknown outcome. Refresh " +
            "before deciding whether to send a new reply." :
          "This WhatsApp reply is already being delivered.");
    }
    const program = programSnap.data() as OrganizerProgramDocument |
      undefined;
    const thread = readThread(threadSnap, input.programId);
    if (!program || !thread || thread.organizerId !== program.organizerId) {
      throw new HttpsError("not-found", "WhatsApp thread not found.");
    }
    if (program.status !== "active" && program.status !== "draft") {
      throw new HttpsError("failed-precondition",
        "This programme is not live, so it cannot message guests.");
    }
    if (input.expectedLastInboundAtMillis !== null &&
        thread.lastInboundAtMillis !== input.expectedLastInboundAtMillis) {
      throw new HttpsError("aborted",
        "The guest wrote again. Refresh and try again.");
    }
    if (!isProgramWhatsappWindowOpen(thread.lastInboundAtMillis,
      now.toMillis())) {
      throw new HttpsError("failed-precondition",
        "The 24-hour WhatsApp window is closed. Use an approved template " +
          "instead.");
    }
    if (thread.unknownSender || !thread.householdId) {
      throw new HttpsError("failed-precondition",
        "This number is not on the guest list. Add it to a household to " +
          "reply.");
    }
    const connectionRef = db.collection("organizerSenderConnections")
      .doc(thread.connectionId);
    const householdRef = db.collection("programHouseholds")
      .doc(thread.householdId);
    const guestRef = thread.guestId ?
      db.collection("programGuests").doc(thread.guestId) : null;
    const [connectionSnap, householdSnap, guestSnap] = await Promise.all([
      tx.get(connectionRef), tx.get(householdRef),
      guestRef ? tx.get(guestRef) : Promise.resolve(null)]);
    const connection = connectionSnap.data() as
      OrganizerSenderConnectionDocument | undefined;
    const household = householdSnap.data() as ProgramHouseholdDocument |
      undefined;
    const guest = guestSnap?.data() as ProgramGuestDocument | undefined;
    if (!connection || connection.organizerId !== program.organizerId ||
        connection.status !== "active" || !connection.phoneNumberId ||
        !connection.wabaId || !connection.secretVersionResource) {
      throw new HttpsError("failed-precondition",
        "The wedding's WhatsApp number must be connected and active.");
    }
    if (!household || household.programId !== input.programId) {
      throw new HttpsError("failed-precondition",
        "This household is no longer on the guest list.");
    }
    // The number dialled is the one that wrote in, re-read from the record
    // that holds it now; a changed number fails closed.
    const toE164 = [guest?.programId === input.programId &&
      guest.householdId === thread.householdId ? guest.phoneE164 : null,
    household.primaryPhoneE164].find((phone) =>
      typeof phone === "string" &&
        whatsappEndpointHash(phone) === thread.endpointHash);
    if (!toE164) {
      throw new HttpsError("failed-precondition",
        "This guest's phone number changed. Refresh before replying.");
    }
    const callbackData = whatsappStatusCorrelation(attemptId, bodyHash);
    const nowMillis = now.toMillis();
    const replyOperation: ReplyOperation = {
      schemaVersion: 1, operationId, programId: input.programId,
      organizerId: program.organizerId, threadId: input.threadId, messageId,
      attemptId, bodyHash,
      expectedLastInboundAtMillis: thread.lastInboundAtMillis,
      author: input.author, actorUid: input.actorUid, runId: input.runId,
      state: "pending", providerMessageId: null,
      createdAtMillis: nowMillis, updatedAtMillis: nowMillis,
    };
    if (!validateProgramWhatsappReplyOperationDocument(replyOperation)) {
      throw new Error("Invalid programme WhatsApp reply operation");
    }
    const dispatch: ProgramWhatsappDispatchDocument = {
      schemaVersion: 1, source: "program", attemptId, messageId,
      context: {mode: "live", programId: input.programId,
        organizerId: program.organizerId},
      senderId: thread.connectionId, bindingRevision: connection.revision,
      providerAccountId: connection.wabaId,
      providerPhoneNumberId: connection.phoneNumberId,
      senderHash: operationContentHash(connection),
      recipientEndpointId: "whatsapp:" + thread.endpointHash,
      endpointHash: thread.endpointHash, kind: "service",
      templateDocumentId: null, templateHash: null,
      payloadHash: bodyHash, createdAt: nowMillis,
    };
    if (!validateProgramWhatsappDispatchDocument(dispatch)) {
      throw new Error("Invalid programme WhatsApp service dispatch");
    }
    tx.create(operationRef, replyOperation);
    tx.set(dispatchRef, dispatch);
    return {kind: "reserved", connection, connectionId: thread.connectionId,
      toE164, callbackData};
  });
  if (reservation.kind === "replay") return reservation.result;

  let accessToken: string;
  try {
    accessToken = await deps.tokenStore.accessBound({
      versionResource: reservation.connection.secretVersionResource!,
      organizerId: reservation.connection.organizerId,
      connectionId: reservation.connectionId,
    });
  } catch {
    await releasePendingOperation(db, operationRef, bodyHash);
    throw new HttpsError("internal",
      "The wedding's WhatsApp credentials are unavailable.");
  }
  let providerMessageId: string;
  try {
    ({providerMessageId} = await deps.provider().sendText({accessToken,
      phoneNumberId: reservation.connection.phoneNumberId!,
      toE164: reservation.toE164, body: input.text,
      callbackData: reservation.callbackData}));
  } catch (error) {
    if (error instanceof MetaProviderError &&
        error.disposition === "requestNotSent") {
      await releasePendingOperation(db, operationRef, bodyHash);
      throw new HttpsError("unavailable",
        "WhatsApp did not take the reply. Try again.");
    }
    if (error instanceof MetaProviderError && error.httpStatus !== null) {
      await releasePendingOperation(db, operationRef, bodyHash);
      throw new HttpsError("failed-precondition",
        "WhatsApp refused the reply.");
    }
    await markOperationUnknown(db, operationRef, bodyHash, deps.now());
    throw new HttpsError("unavailable",
      "WhatsApp delivery could not be confirmed. Refresh before sending " +
        "another reply.");
  }
  const sentAtMillis = now.toMillis();
  try {
    await db.runTransaction(async (tx) => {
      const [operationSnap, messageSnap, threadSnap] = await Promise.all([
        tx.get(operationRef), tx.get(messageRef), tx.get(threadRef)]);
      const operation = operationSnap.data() as ReplyOperation | undefined;
      const thread = readThread(threadSnap, input.programId);
      if (!operation || operation.state !== "pending" ||
          operation.bodyHash !== bodyHash || messageSnap.exists || !thread) {
        throw new Error("Programme WhatsApp reply changed before completion");
      }
      const message: ProgramMessage = {
        schemaVersion: 1, messageId, threadId: input.threadId,
        programId: input.programId, organizerId: thread.organizerId,
        householdId: thread.householdId, direction: "outbound",
        kind: "text", text: input.text, author: input.author,
        authorUid: input.actorUid, runId: input.runId,
        cannedReplyId: input.cannedReplyId, providerMessageId,
        status: "pending", createdAtMillis: sentAtMillis,
        statusUpdatedAtMillis: sentAtMillis,
      };
      const isLatest = sentAtMillis >= thread.lastMessageAtMillis;
      const planner = input.author === "planner";
      const next: ProgramThread = {
        ...thread,
        ...(isLatest ? {lastMessagePreview: messagePreview(input.text),
          lastMessageDirection: "outbound" as const,
          lastMessageAuthor: input.author,
          lastMessageAtMillis: sentAtMillis} : {}),
        // An answered guest no longer needs the planner; a planner reply
        // also takes the thread over from the assistant.
        state: "handled",
        escalationReason: null,
        ...(planner ? {handledBy: "planner" as const,
          takenOverByUid: input.actorUid} : {}),
        messageCount: thread.messageCount + 1,
        unreadCount: 0,
        updatedAtMillis: deps.now().toMillis(),
        revision: thread.revision + 1,
      };
      tx.create(messageRef, requireValidMessage(message));
      tx.set(threadRef, requireValidThread(next));
      tx.update(operationRef, {state: "completed", providerMessageId,
        updatedAtMillis: deps.now().toMillis()});
    });
  } catch {
    await markOperationUnknown(db, operationRef, bodyHash, deps.now());
    throw new HttpsError("unavailable",
      "WhatsApp accepted the reply, but Catch could not confirm its saved " +
        "state. Refresh before sending another reply.");
  }
  return {programId: input.programId, threadId: input.threadId, messageId,
    providerMessageId, sentAtMillis, replayed: false};
}

/**
 * The internal service lane W2's assistant replies through: the same
 * reservation, window and dispatch path as a planner reply. runId is the
 * programAssistantRuns id and the idempotency key, so a retried run never
 * sends twice. Throws HttpsError failed-precondition when the window is
 * closed or the number is not sendable; the caller escalates instead.
 */
export async function sendProgramServiceReply(params: {
  programId: string;
  householdId: string;
  text: string;
  author: "assistant";
  runId: string;
}, deps: ProgramReplyDeps = defaultProgramReplyDeps):
  Promise<ProgramReplyResult> {
  return sendProgramWhatsappText(deps, {
    programId: params.programId,
    threadId: programWhatsappThreadId(params.programId, params.householdId),
    text: params.text,
    idempotencyKey: `run-${sha256(params.runId).slice(0, 40)}`,
    author: params.author,
    actorUid: null,
    runId: params.runId,
    cannedReplyId: null,
    expectedLastInboundAtMillis: null,
  });
}

async function releasePendingOperation(db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference, bodyHash: string):
  Promise<void> {
  await db.runTransaction(async (tx) => {
    const operation = (await tx.get(ref)).data() as ReplyOperation |
      undefined;
    if (operation?.state === "pending" && operation.bodyHash === bodyHash) {
      tx.delete(ref);
    }
  });
}

async function markOperationUnknown(db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference, bodyHash: string,
  now: FirebaseFirestore.Timestamp): Promise<void> {
  await db.runTransaction(async (tx) => {
    const operation = (await tx.get(ref)).data() as ReplyOperation |
      undefined;
    if (operation?.state === "pending" && operation.bodyHash === bodyHash) {
      tx.update(ref, {state: "unknown", updatedAtMillis: now.toMillis()});
    }
  });
}

const statusRank: Record<ProgramMessage["status"], number> = {
  received: 0, unknown: 0, pending: 1, sent: 2, delivered: 3, read: 4,
  failed: 5,
};

/**
 * Applies one verified delivery status to a service reply's message. The
 * caller (ProgramWhatsappDeliveryStore) has already matched the queued
 * event to this dispatch record; statuses only move forward.
 */
export async function recordProgramServiceReceipt(
  db: FirebaseFirestore.Firestore,
  dispatch: ProgramWhatsappDispatchDocument,
  receipt: {providerMessageId: string;
    deliveryStatus: "sent" | "delivered" | "read" | "failed"},
  nowMillis: number,
): Promise<"applied" | "duplicateOrOlder" | "conflictingEvidence"> {
  const ref = db.collection(PROGRAM_WHATSAPP_MESSAGES)
    .doc(dispatch.messageId);
  return db.runTransaction(async (tx) => {
    const message = (await tx.get(ref)).data() as ProgramMessage | undefined;
    if (!message || message.programId !== dispatch.context.programId ||
        message.organizerId !== dispatch.context.organizerId ||
        message.direction !== "outbound" ||
        (message.providerMessageId !== null &&
          message.providerMessageId !== receipt.providerMessageId)) {
      return "conflictingEvidence";
    }
    if (statusRank[receipt.deliveryStatus] <= statusRank[message.status]) {
      return "duplicateOrOlder";
    }
    tx.update(ref, {status: receipt.deliveryStatus,
      statusUpdatedAtMillis: nowMillis});
    return "applied";
  });
}
