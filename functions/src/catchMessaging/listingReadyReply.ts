/* eslint-disable max-len */
import {getFirestore, type Firestore} from "firebase-admin/firestore";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import type {CatchAutoReplyOutcome, CatchAutoReplyRequest} from "./autoReply";
import {nominationLabel, replyCopy} from "./inboundRouter";
import {inboundRouterDeps, messageNominationsEnabled} from "./inboundRouterRuntime";
import {CATCH_RECEIPTS, readCatchReceipt} from "./whatsappEndpointStops";
import {configuredConsumerScope} from "./whatsappReceiptConsumer";

// When a listing nominated by WhatsApp finishes building, tell the person
// who sent it, in the same thread. Each organizer in a message gets its own
// message; a redelivered update never sends twice.

interface IntakeRequestState {
  status?: unknown;
  request?: {origin?: {kind?: unknown; id?: unknown} | null; seed?: {urls?: unknown}};
  result?: {eventCount?: unknown} | null;
}

export async function replyWhenListingReady(deps: {
  db: Firestore;
  reply: (request: CatchAutoReplyRequest) => Promise<CatchAutoReplyOutcome>;
}, requestId: string, before: IntakeRequestState | undefined, after: IntakeRequestState | undefined):
  Promise<CatchAutoReplyOutcome | "not_applicable"> {
  const origin = after?.request?.origin;
  if (after?.status !== "completed" || before?.status === "completed" ||
      origin?.kind !== "message_nomination" || typeof origin.id !== "string") return "not_applicable";
  const stored = await deps.db.collection(CATCH_RECEIPTS).doc(origin.id).get();
  // Receipts expire after 30 days; by then the reply window is long closed.
  if (!stored.exists) return "not_applicable";
  const receipt = readCatchReceipt(stored.data());
  const urls = Array.isArray(after.request?.seed?.urls) ?
    after.request.seed.urls.filter((url): url is string => typeof url === "string") : [];
  const eventCount = typeof after.result?.eventCount === "number" ? after.result.eventCount : 0;
  return deps.reply({kind: "listing_ready", discriminator: requestId, sourceEventId: receipt.eventId,
    participantId: receipt.participantId, inboundAtMillis: Number(receipt.providerTimestampSeconds) * 1000,
    body: replyCopy.listingReady(urls.length > 0 ? nominationLabel(urls) : "Your nomination", eventCount)});
}

export const onMessageNominationListingReady = onDocumentUpdated({
  document: "supplyIntakeRequests/{requestId}", maxInstances: 2, retry: true,
}, async (event) => {
  const scope = configuredConsumerScope();
  if (!scope || !messageNominationsEnabled.value() || !event.data) return;
  const db = getFirestore();
  await replyWhenListingReady({db, reply: inboundRouterDeps(db, scope).reply}, event.params.requestId,
    event.data.before.data() as IntakeRequestState | undefined, event.data.after.data() as IntakeRequestState | undefined);
});
