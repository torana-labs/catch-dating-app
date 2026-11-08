import type {
  OrganizerMessagingWebhookEventDocument,
  ProgramWhatsappMessageDocument,
  ProgramWhatsappThreadDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {validateProgramWhatsappMessageDocument} from
  "../../shared/generated/validators/programWhatsappMessageDocument";
import {validateProgramWhatsappThreadDocument} from
  "../../shared/generated/validators/programWhatsappThreadDocument";
import {
  PROGRAM_WHATSAPP_MESSAGES,
  PROGRAM_WHATSAPP_THREADS,
  messagePreview,
  programWhatsappInboundMessageId,
  programWhatsappServiceWindowMillis,
} from "./ids";

export type ProgramThread = ProgramWhatsappThreadDocument;
export type ProgramMessage = ProgramWhatsappMessageDocument;
export type ProgramEscalationReason =
  NonNullable<ProgramThread["escalationReason"]>;

/** Where one inbound message lands: a household thread or an unknown one. */
export interface ProgramThreadTarget {
  threadId: string;
  programId: string;
  organizerId: string;
  householdId: string | null;
  guestId: string | null;
  unknownSender: boolean;
}

export function requireValidThread(value: ProgramThread): ProgramThread {
  if (!validateProgramWhatsappThreadDocument(value)) {
    throw new Error("Invalid programme WhatsApp thread: " +
      JSON.stringify(validateProgramWhatsappThreadDocument.errors));
  }
  return value;
}

export function requireValidMessage(value: ProgramMessage): ProgramMessage {
  if (!validateProgramWhatsappMessageDocument(value)) {
    throw new Error("Invalid programme WhatsApp message: " +
      JSON.stringify(validateProgramWhatsappMessageDocument.errors));
  }
  return value;
}

/** A thread document read back, or undefined when absent or out of scope. */
export function readThread(snapshot: FirebaseFirestore.DocumentSnapshot,
  programId: string): ProgramThread | undefined {
  const data = snapshot.data() as ProgramThread | undefined;
  return data && data.programId === programId ? data : undefined;
}

/**
 * Stores one inbound guest message and rolls the thread forward: the window
 * is the newest inbound plus 24 hours, an unanswered message needs the
 * planner until the assistant (lane W2) or the planner answers it. Provider
 * replays write nothing. Returns the stored message id, or null on replay.
 */
export async function persistProgramInboundMessage(params: {
  db: FirebaseFirestore.Firestore;
  target: ProgramThreadTarget;
  event: OrganizerMessagingWebhookEventDocument;
  nowMillis: number;
}): Promise<string | null> {
  const {db, target, event, nowMillis} = params;
  if (!event.providerMessageId || !event.connectionId || !event.endpointHash) {
    return null;
  }
  const occurredAtMillis = event.providerOccurredAt ?
    Math.min(event.providerOccurredAt.toMillis(), nowMillis) : nowMillis;
  const messageId = programWhatsappInboundMessageId(target.programId,
    event.providerMessageId);
  const media = !event.inboundBody;
  const text = event.inboundBody ? event.inboundBody.slice(0, 4096) : null;
  const threadRef = db.collection(PROGRAM_WHATSAPP_THREADS)
    .doc(target.threadId);
  const messageRef = db.collection(PROGRAM_WHATSAPP_MESSAGES).doc(messageId);
  return db.runTransaction(async (tx) => {
    const [messageSnap, threadSnap] = await Promise.all([
      tx.get(messageRef), tx.get(threadRef)]);
    if (messageSnap.exists) return null;
    const existing = readThread(threadSnap, target.programId);
    if (threadSnap.exists && !existing) {
      throw new Error("Programme WhatsApp thread scope mismatch");
    }
    const lastInboundAtMillis = Math.max(existing?.lastInboundAtMillis ?? 0,
      occurredAtMillis);
    const isLatest = !existing ||
      occurredAtMillis >= existing.lastMessageAtMillis;
    const isLatestInbound = !existing ||
      occurredAtMillis >= existing.lastInboundAtMillis;
    const preview = media ? "Sent an attachment" : messagePreview(text!);
    const thread: ProgramThread = {
      schemaVersion: 1,
      threadId: target.threadId,
      programId: target.programId,
      organizerId: target.organizerId,
      householdId: target.householdId,
      guestId: target.guestId ?? existing?.guestId ?? null,
      connectionId: event.connectionId!,
      endpointHash: event.endpointHash!,
      unknownSender: target.unknownSender,
      handledBy: existing?.handledBy ??
        (target.unknownSender ? "planner" : "assistant"),
      state: "needsYou",
      language: existing?.language ?? null,
      escalationReason: target.unknownSender ? "unknownSender" :
        media ? "media" : null,
      lastMessagePreview: isLatest ? preview : existing!.lastMessagePreview,
      lastMessageDirection: isLatest ? "inbound" :
        existing!.lastMessageDirection,
      lastMessageAuthor: isLatest ? "guest" : existing!.lastMessageAuthor,
      lastMessageAtMillis: isLatest ? occurredAtMillis :
        existing!.lastMessageAtMillis,
      lastInboundAtMillis,
      lastInboundMessageId: isLatestInbound ? messageId :
        existing!.lastInboundMessageId,
      serviceWindowExpiresAtMillis:
        lastInboundAtMillis + programWhatsappServiceWindowMillis,
      unreadCount: (existing?.unreadCount ?? 0) + 1,
      messageCount: (existing?.messageCount ?? 0) + 1,
      unknownSenderReplySentAtMillis:
        existing?.unknownSenderReplySentAtMillis ?? null,
      takenOverByUid: existing?.takenOverByUid ?? null,
      createdAtMillis: existing?.createdAtMillis ?? nowMillis,
      updatedAtMillis: nowMillis,
      revision: (existing?.revision ?? 0) + 1,
    };
    const message: ProgramMessage = {
      schemaVersion: 1,
      messageId,
      threadId: target.threadId,
      programId: target.programId,
      organizerId: target.organizerId,
      householdId: target.householdId,
      direction: "inbound",
      kind: media ? "mediaRef" : "text",
      text,
      author: "guest",
      authorUid: null,
      runId: null,
      cannedReplyId: null,
      providerMessageId: event.providerMessageId,
      status: "received",
      createdAtMillis: occurredAtMillis,
      statusUpdatedAtMillis: nowMillis,
    };
    tx.set(threadRef, requireValidThread(thread));
    tx.create(messageRef, requireValidMessage(message));
    return messageId;
  });
}

/**
 * Lane W2's hook into a thread: record the guest's language, pass the
 * thread to the planner ("Passed to you": state needsYou plus a reason) or
 * mark it answered. Never changes who handles it; the planner owns that.
 */
export async function annotateProgramWhatsappThread(params: {
  db: FirebaseFirestore.Firestore;
  programId: string;
  threadId: string;
  language?: ProgramThread["language"];
  escalationReason?: ProgramEscalationReason | null;
  state?: ProgramThread["state"];
  nowMillis: number;
}): Promise<ProgramThread> {
  const ref = params.db.collection(PROGRAM_WHATSAPP_THREADS)
    .doc(params.threadId);
  return params.db.runTransaction(async (tx) => {
    const thread = readThread(await tx.get(ref), params.programId);
    if (!thread) throw new Error("Programme WhatsApp thread not found");
    const next: ProgramThread = {
      ...thread,
      ...(params.language !== undefined ? {language: params.language} : {}),
      ...(params.escalationReason !== undefined ? {
        escalationReason: params.escalationReason,
        ...(params.escalationReason !== null ? {state: "needsYou"} : {}),
      } : {}),
      ...(params.state !== undefined ? {state: params.state} : {}),
      updatedAtMillis: params.nowMillis,
      revision: thread.revision + 1,
    };
    tx.set(ref, requireValidThread(next));
    return next;
  });
}
