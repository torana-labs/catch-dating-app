import type {EventAssistanceMessageIntent as Intent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import {Grant, guestIdentity, threadIdentity} from "./guestRecords";
import {grantSecret, guestSecretHash} from "./guestLinkTokens";
import type {GuestLinkSigningKeys} from
  "../../platform/guestLinkSigningKeys";
import {RcsConfig, RcsContentInput} from "./rcsProtocol";

export const rcsTestNow = Date.parse("2026-09-08T10:00:00Z");
export const rcsTestAttemptId = "attempt:" + "a".repeat(64);
export const rcsTestKeys: GuestLinkSigningKeys = {
  currentKeyId: "rcs-fixture-key", keyFor: () => Buffer.alloc(32, 9),
};

export function rcsTestConfig(): RcsConfig {
  return {schemaVersion: 1, senderId: "fixture-rcs", revision: 1,
    displayName: "Catch event updates",
    provider: "googleRbm", senderIdentity: "catchPlatform",
    agentId: "fixture-agent@rbm.goog", region: "asia", status: "ready",
    credentialVersion: "projects/fixture/secrets/rcs/versions/1",
    recipientPrefixes: ["+91"], maxQueueSeconds: 600,
    activation: {approvalId: "fixture-only-approval",
      approvedAt: rcsTestNow - 1000, validUntil: rcsTestNow + 3_600_000},
    quote: {revision: 1, currency: "INR", maxMicrosPerMessage: 500_000,
      validUntil: rcsTestNow + 3_600_000},
    allowedPurposes: ["joiningUpdate", "joiningInstructions", "planChanged",
      "guestRequirement", "assignmentChanged", "participationCheck",
      "eventCancelled", "eventFinished", "followUp"]};
}

export function rcsTestIntent(): Extract<Intent, {kind: "joiningUpdate"}> {
  return {schemaVersion: 1, intentId: "fixture-message", revision: 1,
    context: {mode: "live", organizerId: "organizer-1", eventId: "event-1"},
    eventId: "event-1", attendeeId: "attendee-1", episodeId: "episode-1",
    workflow: {kind: "lateJoin", occurrenceId: "departure-1"},
    createdAt: rcsTestNow - 1000, expiresAt: rcsTestNow + 1_800_000,
    permittedRoutes: ["catchEventRcs", "catchEventSms"],
    deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
      minimumRetrySeconds: 1}, kind: "joiningUpdate",
    guidance: {revision: 1, destination: {kind: "itineraryStop",
      itineraryId: "crawl", stopId: "stop-1"}, materialKey: "stop-1",
    text: "We have left the meetup. Join us at the first stop.",
    validUntil: rcsTestNow + 1_800_000},
    choices: [{choiceId: "coming", label: "On my way", value: {
      kind: "joinIntent", intention: {kind: "onMyWay", claimedEta: null},
    }}]};
}

export function rcsTestGrant(intent: Intent): Grant {
  if (intent.context.mode !== "live") throw new Error("Fixture needs live");
  const grant: Grant = {schemaVersion: 1, linkId: "b".repeat(32),
    threadId: threadIdentity(intent),
    guestId: guestIdentity(intent.context, intent.attendeeId),
    context: intent.context, attendeeId: intent.attendeeId,
    episodeId: intent.episodeId, tokenHash: "0".repeat(64),
    signingKeyId: rcsTestKeys.currentKeyId, issuedAt: rcsTestNow - 1000,
    expiresAt: rcsTestNow + 1_800_000, revokedAt: null};
  const tokenHash = guestSecretHash(grantSecret(grant, rcsTestKeys));
  return {...grant, tokenHash};
}

export function rcsTestInput(intent: Intent = rcsTestIntent()):
  RcsContentInput & {attemptId: string} {
  return {config: rcsTestConfig(), intent, grant: rcsTestGrant(intent),
    keys: rcsTestKeys, eventTitle: "Friday bar crawl", supportsOpenUrl: true,
    now: rcsTestNow, attemptId: rcsTestAttemptId};
}
