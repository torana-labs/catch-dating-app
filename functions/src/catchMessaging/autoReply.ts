/* eslint-disable max-len */
import {createHash} from "node:crypto";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import type {CatchWhatsappAutoReplyDocument} from "../shared/generated/catchWhatsappAutoReplyDocument";
import {validateCatchWhatsappAutoReplyDocument} from "../shared/generated/validators/catchWhatsappAutoReplyDocument";
import {CATCH_ENDPOINT_STOPS} from "./whatsappEndpointStops";
import {catchEndpointHash, catchStopId, CATCH_SUPPORT_WINDOW_MS} from "./whatsappReply";

// Automatic replies from Catch's WhatsApp number to someone who just
// messaged it (owner decision, 30 Oct 2026: acknowledgements need no staff
// approval). Each reply is claimed once per inbound message and purpose
// before anything is sent, so a redelivered event never sends twice; an
// uncertain send stays consumed rather than retried. Nobody who sent STOP is
// ever messaged, and nothing is sent outside WhatsApp's 24-hour customer
// service window. The record keeps no message text.

export const CATCH_AUTO_REPLIES = "catchWhatsappAutoReplies";
// Leave an hour's margin inside WhatsApp's 24-hour window.
const REPLY_WINDOW_MS = CATCH_SUPPORT_WINDOW_MS - 60 * 60 * 1000;
const RECORD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type CatchAutoReplyKind = CatchWhatsappAutoReplyDocument["kind"];
export type CatchAutoReplyOutcome = "sent" | "replayed" | "stopped" | "outside_window" | "unavailable" | "unknown";

/** One send to one WhatsApp number; returns the provider's message id. */
export type CatchTextSender = (toE164: string, body: string) => Promise<string>;

export interface CatchAutoReplyDeps {
  db: Firestore;
  nowMillis: () => number;
  /** Null when this environment has no sender credential: replies are skipped. */
  sender: () => Promise<CatchTextSender | null>;
  scope: {wabaId: string; phoneNumberId: string};
}

export interface CatchAutoReplyRequest {
  kind: CatchAutoReplyKind;
  sourceEventId: string;
  /** The inbound sender's WhatsApp id (digits, no plus). */
  participantId: string;
  /** When the person last wrote, which opens the 24-hour window. */
  inboundAtMillis: number;
  body: string;
  /** Separates several replies of one kind to one message, such as one "listing ready" per organizer. */
  discriminator?: string;
}

export function catchAutoReplyId(sourceEventId: string, kind: CatchAutoReplyKind, discriminator = ""): string {
  return "cwauto_" + createHash("sha256").update(JSON.stringify([sourceEventId, kind, discriminator])).digest("hex");
}

export async function sendCatchAutoReply(deps: CatchAutoReplyDeps, request: CatchAutoReplyRequest): Promise<CatchAutoReplyOutcome> {
  return (await sendCatchAutoReplyWithId(deps, request)).outcome;
}

/** As sendCatchAutoReply, with WhatsApp's message id once it was sent (also on a replay). */
export async function sendCatchAutoReplyWithId(deps: CatchAutoReplyDeps, request: CatchAutoReplyRequest):
  Promise<{outcome: CatchAutoReplyOutcome; providerMessageId: string | null}> {
  const outcome = (value: CatchAutoReplyOutcome, providerMessageId: string | null = null) =>
    ({outcome: value, providerMessageId});
  const now = deps.nowMillis();
  if (!/^[1-9][0-9]{6,14}$/u.test(request.participantId) || !request.body.trim()) return outcome("unavailable");
  if (now - request.inboundAtMillis > REPLY_WINDOW_MS) return outcome("outside_window");
  const endpointHash = catchEndpointHash("+" + request.participantId);
  const replyId = catchAutoReplyId(request.sourceEventId, request.kind, request.discriminator);
  const ref = deps.db.collection(CATCH_AUTO_REPLIES).doc(replyId);
  const stopRef = deps.db.collection(CATCH_ENDPOINT_STOPS).doc(catchStopId(deps.scope, endpointHash));
  let replayedId: string | null = null;
  const claim = await deps.db.runTransaction(async (tx) => {
    const [existing, stop] = await Promise.all([tx.get(ref), tx.get(stopRef)]);
    if (existing.exists) {
      const saved = existing.data() as Partial<CatchWhatsappAutoReplyDocument> | undefined;
      replayedId = saved?.state === "sent" && typeof saved.providerMessageId === "string" ?
        saved.providerMessageId : null;
      return "replayed" as const;
    }
    const state: CatchWhatsappAutoReplyDocument["state"] = stop.exists ? "skipped_stop" : "claimed";
    const expiresAt = Timestamp.fromMillis(now + RECORD_RETENTION_MS);
    const record = {schemaVersion: 1 as const, replyId, kind: request.kind,
      sourceEventId: request.sourceEventId, endpointHash, state, providerMessageId: null,
      createdAtMillis: now, updatedAtMillis: now};
    if (!validateCatchWhatsappAutoReplyDocument({...record,
      expiresAt: {_seconds: expiresAt.seconds, _nanoseconds: expiresAt.nanoseconds}})) {
      throw new Error("Invalid Catch auto-reply record.");
    }
    tx.create(ref, {...record, expiresAt});
    return stop.exists ? "stopped" as const : "claimed" as const;
  });
  if (claim === "replayed") return outcome("replayed", replayedId);
  if (claim !== "claimed") return outcome(claim);
  const finish = (state: CatchWhatsappAutoReplyDocument["state"], providerMessageId: string | null) =>
    ref.update({state, providerMessageId, updatedAtMillis: deps.nowMillis()});
  let send: CatchTextSender | null;
  try {
    send = await deps.sender();
  } catch {
    send = null;
  }
  if (!send) {
    await finish("skipped_unavailable", null);
    return outcome("unavailable");
  }
  let providerMessageId: string;
  try {
    providerMessageId = await send("+" + request.participantId, request.body);
  } catch {
    // The provider may have delivered it; never send this reply again.
    await finish("unknown", null).catch(() => undefined);
    logger.warn("Catch auto-reply outcome unknown.", {kind: request.kind});
    return outcome("unknown");
  }
  // It was sent; a failed bookkeeping write must not make it look unsent.
  await finish("sent", providerMessageId).catch(() =>
    logger.warn("Catch auto-reply record not updated.", {kind: request.kind}));
  return outcome("sent", providerMessageId);
}
