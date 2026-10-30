/* eslint-disable max-len */
import {getFirestore, type Firestore} from "firebase-admin/firestore";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {defaultListingApprovalDeps} from "../admin/organizerListingApproval";
import {autoPublishNominatedListing, type AutoPublishOutcome} from "../operations/supplyIntake/autoPublish";
import type {CatchAutoReplyOutcome, CatchAutoReplyRequest} from "./autoReply";
import {nominationLabel, replyCopy} from "./inboundRouter";
import {inboundRouterDeps, messageNominationsEnabled} from "./inboundRouterRuntime";
import {CATCH_RECEIPTS, readCatchReceipt} from "./whatsappEndpointStops";
import {configuredConsumerScope} from "./whatsappReceiptConsumer";

// When a listing nominated by message finishes building, publish it if a
// registered associate sent it and it is complete (autoPublish.ts). A
// WhatsApp nominator then hears back in the same thread: live with its link,
// or waiting for a check. Instagram allows no message after 24 hours, so an
// Instagram nominator heard at the start and gets nothing more. Each organizer in a message gets its own message; a
// redelivered update never publishes or sends twice.

type IntakeRequestState = Parameters<typeof autoPublishNominatedListing>[2] & {
  request?: {seed?: {urls?: unknown}};
};

export async function replyWhenListingReady(deps: {
  db: Firestore;
  reply: (request: CatchAutoReplyRequest) => Promise<CatchAutoReplyOutcome>;
  publish: (requestId: string, state: IntakeRequestState) => Promise<AutoPublishOutcome>;
}, requestId: string, before: IntakeRequestState | undefined, after: IntakeRequestState | undefined):
  Promise<CatchAutoReplyOutcome | "not_applicable"> {
  const origin = after?.request?.origin;
  if (after?.status !== "completed" || before?.status === "completed" ||
      origin?.kind !== "message_nomination" || typeof origin.id !== "string") return "not_applicable";
  const stored = await deps.db.collection(CATCH_RECEIPTS).doc(origin.id).get();
  const published = await deps.publish(requestId, after);
  // Receipts expire after 30 days; by then the reply window is long closed.
  if (!stored.exists) return "not_applicable";
  const receipt = readCatchReceipt(stored.data());
  const urls = Array.isArray(after.request?.seed?.urls) ?
    after.request.seed.urls.filter((url): url is string => typeof url === "string") : [];
  const eventCount = typeof after.result?.eventCount === "number" ? after.result.eventCount : 0;
  const label = urls.length > 0 ? nominationLabel(urls) : "Your nomination";
  return deps.reply({kind: "listing_ready", discriminator: requestId, sourceEventId: receipt.eventId,
    participantId: receipt.participantId, inboundAtMillis: Number(receipt.providerTimestampSeconds) * 1000,
    body: published.outcome === "published" ? replyCopy.listingLive(label, eventCount, published.canonicalPath) :
      replyCopy.listingReady(label, eventCount)});
}

export const onMessageNominationListingReady = onDocumentUpdated({
  document: "supplyIntakeRequests/{requestId}", maxInstances: 2, retry: true,
}, async (event) => {
  const scope = configuredConsumerScope();
  if (!scope || !messageNominationsEnabled.value() || !event.data) return;
  const db = getFirestore();
  const routerDeps = inboundRouterDeps(db, scope);
  await replyWhenListingReady({db, reply: routerDeps.reply,
    publish: (requestId, state) => autoPublishNominatedListing({...defaultListingApprovalDeps,
      getUser: routerDeps.getUser}, requestId, state)}, event.params.requestId,
    event.data.before.data() as IntakeRequestState | undefined, event.data.after.data() as IntakeRequestState | undefined);
});
