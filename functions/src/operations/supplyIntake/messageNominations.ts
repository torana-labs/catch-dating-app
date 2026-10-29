/* eslint-disable max-len */
import type {Firestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import type {SupplyIntakeRequest} from "../../shared/generated/supplyIntakeRequest";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import type {NominatorAuthority, NominatorDeps} from "./nominators";
import {createSupplyIntakeRequest, intakeMarket, supplyIntakeRequestId} from "./requests";
import {packagedMessageParser, type ParsedNominationMessage} from "./runtime";

// A registered nominator forwards organizers to Catch's WhatsApp number: an
// Instagram profile shared from the app, a Luma link, a website. Each line
// with links becomes one nomination, credited to the nominator's account,
// and goes through the same Supply Intake request every other front door
// uses. The inbound router (catchMessaging/inboundRouter.ts) decides which
// messages are nominations; this module only turns them into requests.

export const MESSAGE_NOMINATIONS_PER_HOUR = 60;

export interface MessageNominationDeps extends Pick<NominatorDeps, "getUser"> {
  db: Firestore;
  now: () => Date;
  parse: (text: string) => Promise<ParsedNominationMessage>;
  checkRateLimit: typeof defaultCheckRateLimit;
}

/**
 * The intake requests one message implies. Ids are derived from the message
 * and the line's position, so a redelivered message finds its own requests.
 * A city named on the line places the organizer; otherwise the nominator's
 * default city does, and failing both staff place it.
 */
export function requestsFromNominationMessage({messageKey, parsed, nominator, receivedAt}: {
  messageKey: string;
  parsed: ParsedNominationMessage;
  nominator: NominatorAuthority;
  receivedAt: Date;
}): SupplyIntakeRequest[] {
  return parsed.nominations.map((nomination, index) => ({
    schemaVersion: 1,
    requestId: supplyIntakeRequestId("msg", [messageKey, String(index)]),
    kind: "nomination",
    market: marketFromNotes(nomination.notes) ?? nominator.defaultMarket ?? intakeMarket(null),
    seed: {name: null, urls: nomination.urls, notes: nomination.notes, categories: []},
    submittedBy: {role: nominator.role, uid: nominator.uid, partnerId: nominator.partnerId},
    submittedAt: receivedAt.toISOString(),
    origin: {kind: "message_nomination", id: messageKey},
  }));
}

function marketFromNotes(notes: string | null): string | null {
  const words = (notes ?? "").toLowerCase().match(/[a-z][a-z-]{2,}/gu) ?? [];
  for (const word of words) {
    const market = intakeMarket(word);
    if (market !== intakeMarket(null)) return market;
  }
  return null;
}

/**
 * Queues the nominations one message holds, credited to its nominator, once
 * the inbound router has decided the message is a nomination. Request ids
 * come from the message, so a redelivery adds nothing.
 */
export async function queueMessageNominations(deps: MessageNominationDeps, {messageKey, receivedAtMillis,
  nominator, parsed}: {
  messageKey: string;
  receivedAtMillis: number;
  nominator: NominatorAuthority;
  parsed: ParsedNominationMessage;
}): Promise<{outcome: "queued" | "rate_limited"; requests: SupplyIntakeRequest[]}> {
  try {
    await deps.checkRateLimit(deps.db, nominator.nominatorId, "messageNomination",
      {maxRequests: MESSAGE_NOMINATIONS_PER_HOUR, windowMs: 60 * 60 * 1000});
  } catch (error) {
    if ((error as {code?: unknown})?.code === "resource-exhausted") return {outcome: "rate_limited", requests: []};
    throw error;
  }
  const now = deps.now();
  const requests = requestsFromNominationMessage({messageKey, parsed, nominator,
    receivedAt: new Date(receivedAtMillis)});
  // One transaction per request: each reads its id before creating it, and
  // ids are stable, so a retry after a partial failure only adds the rest.
  for (const request of requests) {
    await deps.db.runTransaction((tx) => createSupplyIntakeRequest(tx, deps.db, request, now));
  }
  logger.info("Message nomination queued.", {nominatorId: nominator.nominatorId, requests: requests.length,
    droppedNominations: parsed.droppedNominations, unreadable: parsed.unreadable.length});
  return {outcome: "queued", requests};
}

export function defaultMessageNominationDeps(db: Firestore, getUser: NominatorDeps["getUser"]): MessageNominationDeps {
  return {db, getUser, now: () => new Date(), checkRateLimit: defaultCheckRateLimit,
    parse: async (text) => (await packagedMessageParser()).parseNominationMessage(text)};
}
