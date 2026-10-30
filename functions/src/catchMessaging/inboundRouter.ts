/* eslint-disable max-len */
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {resolveWhatsappNominator, type NominatorAuthority, type NominatorDeps} from "../operations/supplyIntake/nominators";
import {queueMessageNominations, type MessageNominationDeps} from "../operations/supplyIntake/messageNominations";
import type {ParsedNominationMessage} from "../operations/supplyIntake/runtime";
import {validateCatchWhatsappClarificationDocument} from "../shared/generated/validators/catchWhatsappClarificationDocument";
import type {CatchAutoReplyKind, CatchAutoReplyOutcome, CatchAutoReplyRequest} from "./autoReply";
import {classifyCatchInbound, type CatchInboundIntent} from "./inboundIntent";
import {CATCH_RECEIPTS, isCatchStopReceipt, readCatchReceipt, type CatchReceipt} from "./whatsappEndpointStops";
import {catchEndpointHash} from "./whatsappReply";
import {BRAND} from "../shared/generated/brand";

// Every inbound message to Catch's WhatsApp number comes through here after
// the receipt dispatcher has handled STOP. The router works out what the
// person wants (inboundIntent.ts) and branches: nominations become Supply
// Intake requests, unclear messages get a "1 or 2?" question, and everything
// else stays in the support inbox for the team. Only registered nominators
// can nominate; for anyone else every message is support.

export const CATCH_CLARIFICATIONS = "catchWhatsappClarifications";
const CLARIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_LABELS = 3;
const LINK_IN_BIO_HOSTS = ["linktr.ee", "beacons.ai"];

export type CatchRouteOutcome = CatchInboundIntent["kind"] | "ignored";

export interface CatchInboundRouterDeps extends Pick<NominatorDeps, "getUser">, MessageNominationDeps {
  db: Firestore;
  now: () => Date;
  parse: (text: string) => Promise<ParsedNominationMessage>;
  reply: (request: CatchAutoReplyRequest) => Promise<CatchAutoReplyOutcome>;
}

export async function routeCatchWhatsappInbound(deps: CatchInboundRouterDeps, receipt: CatchReceipt): Promise<CatchRouteOutcome> {
  if (receipt.eventKind !== "inbound" || receipt.messageType !== "text" || receipt.textTruncated ||
      typeof receipt.text !== "string" || !receipt.text.trim() ||
      !/^[1-9][0-9]{6,14}$/u.test(receipt.participantId) || isCatchStopReceipt(receipt)) {
    return "ignored";
  }
  const now = deps.now();
  const endpointHash = catchEndpointHash("+" + receipt.participantId);
  const clarificationRef = deps.db.collection(CATCH_CLARIFICATIONS).doc(endpointHash);
  const [pending, nominator] = await Promise.all([
    openClarification(clarificationRef, now),
    deps.db.runTransaction((tx) => resolveWhatsappNominator(tx, deps.db, deps, endpointHash, now)),
  ]);
  const parsed = await deps.parse(receipt.text);
  const intent = classifyCatchInbound({text: receipt.text, isNominator: nominator !== null,
    nominationCount: parsed.nominations.length, notes: parsed.nominations.map((nomination) => nomination.notes),
    awaitingClarification: pending !== null});
  const reply = (kind: CatchAutoReplyKind, body: string) => deps.reply({kind, body,
    sourceEventId: receipt.eventId, participantId: receipt.participantId,
    inboundAtMillis: Number(receipt.providerTimestampSeconds) * 1000});

  // Any new message settles an open question: an answer resolves it, and
  // anything else means the person moved on.
  if (pending) await clarificationRef.delete();

  switch (intent.kind) {
  case "clarification_answer": {
    if (intent.answer === "support" || !nominator || !pending) {
      await reply("support_acknowledged", replyCopy.supportAcknowledged);
      return intent.kind;
    }
    const source = readCatchReceipt((await deps.db.collection(CATCH_RECEIPTS).doc(pending.sourceEventId).get()).data());
    const sourceParsed = await deps.parse(source.text ?? "");
    await nominate(deps, reply, nominator, source.eventId, source.receivedAtMillis, sourceParsed);
    return intent.kind;
  }
  case "nomination":
    await nominate(deps, reply, nominator as NominatorAuthority, receipt.eventId, receipt.receivedAtMillis, parsed);
    return intent.kind;
  case "nomination_without_links":
    await reply("nomination_without_links", replyCopy.nominationWithoutLinks);
    return intent.kind;
  case "clarify": {
    const expiresAt = Timestamp.fromMillis(now.getTime() + CLARIFICATION_TTL_MS);
    const record = {schemaVersion: 1 as const, endpointHash, sourceEventId: receipt.eventId,
      askedAtMillis: now.getTime()};
    if (!validateCatchWhatsappClarificationDocument({...record,
      expiresAt: {_seconds: expiresAt.seconds, _nanoseconds: expiresAt.nanoseconds}})) {
      throw new Error("Invalid Catch clarification record.");
    }
    await clarificationRef.set({...record, expiresAt});
    await reply("clarification_question", replyCopy.clarificationQuestion);
    return intent.kind;
  }
  case "support":
    return intent.kind;
  }
}

async function nominate(deps: CatchInboundRouterDeps,
  reply: (kind: CatchAutoReplyKind, body: string) => Promise<CatchAutoReplyOutcome>,
  nominator: NominatorAuthority, messageKey: string, receivedAtMillis: number, parsed: ParsedNominationMessage) {
  if (parsed.nominations.length === 0) {
    await reply("nomination_without_links", replyCopy.nominationWithoutLinks);
    return;
  }
  const queued = await queueMessageNominations(deps, {messageKey, receivedAtMillis, nominator, parsed});
  if (queued.outcome === "rate_limited") {
    await reply("nomination_rate_limited", replyCopy.rateLimited);
    return;
  }
  const urls = parsed.nominations.flatMap((nomination) => nomination.urls);
  await reply("nomination_queued", replyCopy.nominationQueued(
    parsed.nominations.map((nomination) => nominationLabel(nomination.urls)),
    urls.some(isLinkInBio) && !urls.some((url) => !isLinkInBio(url))));
  logger.info("WhatsApp nomination routed.", {nominatorId: nominator.nominatorId, requests: queued.requests.length});
}

async function openClarification(ref: FirebaseFirestore.DocumentReference, now: Date) {
  const data = (await ref.get()).data();
  if (!data) return null;
  const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : 0;
  if (expiresAt <= now.getTime() || typeof data.sourceEventId !== "string") return null;
  return {sourceEventId: data.sourceEventId};
}

/** How a nomination is named back to the nominator: "@handle" or a short link. */
export function nominationLabel(urls: string[]): string {
  const url = urls[0];
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./u, "");
    const path = parsed.pathname.replace(/\/+$/u, "");
    if (host === "instagram.com" && /^\/[^/]+$/u.test(path)) return "@" + path.slice(1);
    return (host + path).slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
}

export function isLinkInBio(url: string): boolean {
  try {
    return LINK_IN_BIO_HOSTS.includes(new URL(url).hostname.replace(/^www\./u, ""));
  } catch {
    return false;
  }
}

export const replyCopy = Object.freeze({
  nominationQueued: (labels: string[], onlyLinkInBio: boolean) => {
    const shown = labels.slice(0, MAX_LABELS).join(", ");
    const more = labels.length > MAX_LABELS ? ` and ${labels.length - MAX_LABELS} more` : "";
    const noun = labels.length === 1 ? "organizer" : "organizers";
    const base = `Got it. Queued ${labels.length} ${noun} for a Catch listing: ${shown}${more}. I'll message you here when it's ready.`;
    return onlyLinkInBio ?
      `${base} I can't read Linktree or Beacons pages, so if you have their Luma, Instagram or website link, send that too.` :
      base;
  },
  // Instagram replies are allowed only within 24 hours of the person's last
  // message, so these never promise a later message.
  instagramNominationQueued: (labels: string[], onlyLinkInBio: boolean) => {
    const shown = labels.slice(0, MAX_LABELS).join(", ");
    const more = labels.length > MAX_LABELS ? ` and ${labels.length - MAX_LABELS} more` : "";
    const noun = labels.length === 1 ? "organizer" : "organizers";
    const base = `Got it. Queued ${labels.length} ${noun} for a Catch listing: ${shown}${more}. It shows on catchdates.com once it's built and checked.`;
    return onlyLinkInBio ?
      `${base} I can't read Linktree or Beacons pages, so if you have their Luma, Instagram or website link, send that too.` :
      base;
  },
  instagramUnclear: "Is this a nomination? Send it again starting with \"nominate\" and I'll queue it. If it's a question, the Catch team will reply here.",
  instagramShareWithoutProfile: "I can't tell whose account a shared post comes from. Send their Instagram @handle or profile link to nominate them.",
  nominationWithoutLinks: "I couldn't find a link in that. Send an Instagram profile, Luma page or website to nominate an organizer.",
  rateLimited: "You've sent a lot of nominations in the last hour. Please send that one again in a little while.",
  clarificationQuestion: "Is this a nomination? Reply 1 to nominate the organizer in your message, or 2 if it's a question for the Catch team.",
  supportAcknowledged: "Thanks. The Catch team will reply here.",
  listingReady: (label: string, eventCount: number) => eventCount > 0 ?
    `${label} is ready: the listing is built with ${eventCount} upcoming ${eventCount === 1 ? "event" : "events"}. It goes live after a quick check.` :
    `${label} is ready: the listing is built. No upcoming events were found on the pages I could read. It goes live after a quick check.`,
  listingLive: (label: string, eventCount: number, canonicalPath: string) =>
    `${label} is live at ${BRAND.web.domain}${canonicalPath}${eventCount > 0 ?
      ` with ${eventCount} upcoming ${eventCount === 1 ? "event" : "events"}` : ""}. ` +
    "Search engines won't list it until the organizer claims and verifies it.",
});
