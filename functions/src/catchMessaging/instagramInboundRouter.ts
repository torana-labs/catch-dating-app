/* eslint-disable max-len */
import {createHash} from "node:crypto";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {queueMessageNominations, type MessageNominationDeps} from "../operations/supplyIntake/messageNominations";
import {resolveInstagramNominator} from "../operations/supplyIntake/nominators";
import type {InstagramInboundMessage} from "../organizers/instagramClaimProtocol";
import type {InstagramMessagingProvider} from "../organizers/instagramMessagingProvider";
import type {OrganizerClaimInstagramMessageDocument} from "../shared/generated/organizerClaimInstagramMessageDocument";
import {classifyCatchInbound} from "./inboundIntent";
import {isLinkInBio, nominationLabel, replyCopy} from "./inboundRouter";

// Direct messages to Catch's Instagram account that carry no claim code come here. A
// registered Instagram nominator's links become Supply Intake nominations,
// as they do on WhatsApp (inboundRouter.ts), and Catch answers in the
// thread. Instagram allows a reply only within 24 hours of the person's
// message, so there is no "1 or 2?" follow-up: an unclear message asks them
// to send it again. Everything else stays in the Instagram inbox for the team.

export const INSTAGRAM_MESSAGE_RECEIPTS = "organizerClaimInstagramMessages";
const RECEIPT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
// Usernames are read through the Graph API, so a sender pasting links
// in a loop is limited before Catch calls Meta for each message.
const LOOKUPS_PER_HOUR = 30;
// Attachment types Meta uses for a post, reel or story shared into a DM.
const SHARE_TYPES = new Set(["share", "ig_post", "ig_reel", "reel", "story", "ig_story"]);
// Instagram paths that are not profiles.
const RESERVED_PATHS = new Set(["p", "reel", "reels", "stories", "explore", "tv", "accounts", "direct"]);

type ReceiptOutcome = Extract<OrganizerClaimInstagramMessageDocument["outcome"],
  "nominationQueued" | "nominationWithoutLinks" | "nominationRateLimited" | "nominationUnclear" | "shareWithoutProfile">;
export type InstagramRouteOutcome = ReceiptOutcome | "support" | "replayed";

export interface InstagramInboundRouterDeps extends MessageNominationDeps {
  db: Firestore;
  provider: () => InstagramMessagingProvider;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

export async function routeInstagramInbound(deps: InstagramInboundRouterDeps,
  message: InstagramInboundMessage): Promise<InstagramRouteOutcome> {
  const shared = message.unsupported || message.attachments.some((attachment) => SHARE_TYPES.has(attachment.type));
  if (message.attachments.length > 0 || message.unsupported) {
    // What a share actually carries is not documented beyond a media URL.
    // Field names only, never values, so the shape can be learned safely.
    logger.info("Instagram message attachments.", {unsupported: message.unsupported,
      attachments: message.attachments.map(({type, payloadKeys, pageUrl}) => ({type, payloadKeys, pageLink: pageUrl !== null}))});
  }
  const text = [message.text ?? "", ...message.attachments.flatMap(({pageUrl}) => {
    const profile = profileUrl(pageUrl);
    return profile ? [profile] : [];
  })].filter(Boolean).join("\n");
  const parsed = await deps.parse(text);
  const intent = classifyCatchInbound({text: message.text ?? "", isNominator: true,
    nominationCount: parsed.nominations.length, notes: parsed.nominations.map((nomination) => nomination.notes),
    awaitingClarification: false});
  const shareOnly = intent.kind === "support" && shared && parsed.nominations.length === 0;
  // Treated as a nominator, this would still be a message for the team, so
  // nobody gets a reply and nothing asks Meta who sent it.
  if (intent.kind === "support" && !shareOnly) return "support";

  const receiptRef = deps.db.collection(INSTAGRAM_MESSAGE_RECEIPTS).doc(message.messageKey);
  if ((await receiptRef.get()).exists) return "replayed";
  try {
    await deps.checkRateLimit(deps.db, `instagram_${createHash("sha256").update(message.senderId).digest("hex").slice(0, 32)}`,
      "instagramInboundLookup", {maxRequests: LOOKUPS_PER_HOUR, windowMs: 60 * 60 * 1000});
  } catch (error) {
    if ((error as {code?: unknown})?.code === "resource-exhausted") return "support";
    throw error;
  }
  const username = await deps.provider().lookupUsername(message.senderId);
  if (!username) return "support";
  const now = deps.now();
  const nominator = await deps.db.runTransaction((tx) => resolveInstagramNominator(tx, deps.db, deps, username, now));
  if (!nominator) return "support";

  let outcome: ReceiptOutcome;
  let body: string;
  if (shareOnly) {
    outcome = "shareWithoutProfile";
    body = replyCopy.instagramShareWithoutProfile;
  } else if (intent.kind === "clarify") {
    outcome = "nominationUnclear";
    body = replyCopy.instagramUnclear;
  } else if (intent.kind === "nomination_without_links" || parsed.nominations.length === 0) {
    outcome = "nominationWithoutLinks";
    body = replyCopy.nominationWithoutLinks;
  } else {
    const queued = await queueMessageNominations(deps, {messageKey: message.messageKey,
      receivedAtMillis: now.getTime(), nominator, parsed});
    if (queued.outcome === "rate_limited") {
      outcome = "nominationRateLimited";
      body = replyCopy.rateLimited;
    } else {
      const urls = parsed.nominations.flatMap((nomination) => nomination.urls);
      outcome = "nominationQueued";
      body = replyCopy.instagramNominationQueued(parsed.nominations.map((nomination) => nominationLabel(nomination.urls)),
        urls.some(isLinkInBio) && !urls.some((url) => !isLinkInBio(url)));
      logger.info("Instagram nomination routed.", {nominatorId: nominator.nominatorId, requests: queued.requests.length});
    }
  }

  // The receipt goes first: a redelivery that races this one finds it and
  // stays quiet, so each message is answered once.
  const recorded = await deps.db.runTransaction(async (tx) => {
    if ((await tx.get(receiptRef)).exists) return false;
    tx.create(receiptRef, {messageKey: message.messageKey, outcome, attemptId: null,
      nominatorId: outcome === "nominationQueued" ? nominator.nominatorId : null,
      receivedAt: deps.serverTimestamp(), expiresAt: Timestamp.fromMillis(now.getTime() + RECEIPT_LIFETIME_MS)});
    return true;
  });
  if (!recorded) return "replayed";
  try {
    await deps.provider().sendReply(message.senderId, body);
  } catch {
    // The nominations are queued either way; a lost reply is not retried.
    logger.warn("Instagram nomination reply failed.", {outcome});
  }
  return outcome;
}

/** A profile link from a share's page URL; posts and reels name no account. */
function profileUrl(pageUrl: string | null): string | null {
  if (!pageUrl) return null;
  const segments = new URL(pageUrl).pathname.split("/").filter(Boolean);
  const handle = segments[0]?.toLowerCase() ?? "";
  if (segments.length !== 1 || RESERVED_PATHS.has(handle) || !/^[a-z0-9._]{1,30}$/u.test(handle)) return null;
  return `https://www.instagram.com/${handle}`;
}
