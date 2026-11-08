import * as admin from "firebase-admin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import type {ProgramMessage, ProgramThread} from "./threads";
import {PROGRAM_WHATSAPP_THREADS} from "./ids";
import {readThread} from "./threads";

// The trigger point for every stored inbound guest message
// (programWhatsappMessages, direction inbound). Lane W1 owns this file and
// the unknown-sender reply; lane W2 fills `assistantHandlesInbound`.

export interface InboundMessageContext {
  db: FirebaseFirestore.Firestore;
  messageId: string;
  message: ProgramMessage;
  thread: ProgramThread;
  nowMillis: number;
}

/**
 * TODO(WhatsApp W2): the assistant. Decide (thread.handledBy === "assistant",
 * window open, programAssistantSettings.enabled, PROGRAM_ASSISTANT_ENABLED,
 * budget), then either reply through
 * `sendProgramServiceReply({programId, householdId, text,
 * author: "assistant", runId})` from ./replies or escalate through
 * `annotateProgramWhatsappThread({..., escalationReason})` from ./threads
 * plus a programAlerts row and staff attention. Until then a guest's
 * message simply waits in the planner's inbox as "Needs you".
 */
export async function assistantHandlesInbound(
  context: InboundMessageContext): Promise<void> {
  void context;
}

/** Routes one stored inbound message; replays are harmless. */
export async function handleProgramInboundMessage(
  db: FirebaseFirestore.Firestore, messageId: string,
  message: ProgramMessage | undefined, nowMillis: number): Promise<void> {
  if (!message || message.direction !== "inbound") return;
  const thread = readThread(await db.collection(PROGRAM_WHATSAPP_THREADS)
    .doc(message.threadId).get(), message.programId);
  if (!thread) return;
  // Only the newest inbound message is answered; older ones are history.
  if (thread.lastInboundMessageId !== messageId) return;
  if (thread.unknownSender) return;
  if (thread.handledBy !== "assistant") return;
  await assistantHandlesInbound({db, messageId, message, thread, nowMillis});
}

export const onProgramWhatsappInboundMessageCreated = onDocumentCreated(
  "programWhatsappMessages/{messageId}", async (event) => {
    await handleProgramInboundMessage(admin.firestore(),
      event.params.messageId,
      event.data?.data() as ProgramMessage | undefined, Date.now());
  });
