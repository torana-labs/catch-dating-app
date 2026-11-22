import type {PreviewEventOfferPreferencesCallableResponse} from
  "../shared/generated/previewEventOfferPreferencesCallableResponse";
import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {eventSourceRevision} from "../events/eventSourceRevision";
import {canonicalJson, eventPaymentTermsFromPreferences,
  resolveEventPreferences} from
  "../domain/formats/eventSetupPreferences/resolve";
import {EventPreferenceError,
  OrganizerEventDefaults} from "../domain/formats/eventSetupPreferences/types";
import {projectEventPreferences} from
  "../events/progressiveSetup/preferences";
import {authorizeSetupManager} from "../events/progressiveSetup/service";
import {projectManagerEventSetupDefaults} from
  "../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../organizers/eventSetupDefaults/dependencies";

import type {ConfigureEventOfferPreferencesCallablePayload} from
  "../shared/generated/configureEventOfferPreferencesCallablePayload";
import {validateConfigureEventOfferPreferencesCallablePayload} from
  "../shared/generated/validators/configureEventOfferPreferencesInput";
import {
  classifyCommandReceipt,
  commandReceiptRef,
  commandRequestHash,
  writeCommandReceipt,
} from "../shared/commandReceipts";

export type ConfigureEventOfferPreferencesCommand =
  ConfigureEventOfferPreferencesCallablePayload;

export interface EventOfferConfigurationDependencies {
  db: FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
}

const receiptCommand = "configureEventOfferPreferences";

export interface EventOfferConfigurationResult {
  eventId: string;
  preferencesRevision: number;
  replayed: boolean;
}

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
function validateCommand(command: ConfigureEventOfferPreferencesCommand) {
  if (!validateConfigureEventOfferPreferencesCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid event offer settings.");
  }
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

interface ConfigurationParams {
  actorUid: string;
  command: ConfigureEventOfferPreferencesCommand;
  deps: EventOfferConfigurationDependencies;
}

/** Uses the same authoritative resolution for review and commit. */
export function configureEventOfferPreferences(params: ConfigurationParams & {
  previewOnly: true;
}): Promise<PreviewEventOfferPreferencesCallableResponse>;
export function configureEventOfferPreferences(params: ConfigurationParams & {
  previewOnly?: false;
}): Promise<EventOfferConfigurationResult>;
export async function configureEventOfferPreferences(params:
  ConfigurationParams & {previewOnly?: boolean}
): Promise<EventOfferConfigurationResult |
  PreviewEventOfferPreferencesCallableResponse> {
  const {actorUid, command, deps} = params;
  if (!ID.test(actorUid)) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  validateCommand(command);
  if (command.expectedActorUid && command.expectedActorUid !== actorUid) {
    throw new HttpsError("permission-denied", "The signed-in account changed.");
  }
  const {db} = deps;
  const receiptId = digest(["event-offer-configuration-v1", actorUid,
    command.organizerId, command.requestId]);
  const requestHash = commandRequestHash(actorUid, command);
  const eventRef = db.collection("events").doc(command.eventId);
  const preferencesRef = db.collection("eventSetupPreferences")
    .doc(command.eventId);
  // receiptId is already a SHA-256 digest, so no uid sits in the document id.
  const receiptRef = commandReceiptRef(db, receiptCommand, receiptId);
  return db.runTransaction(async (tx) => {
    const [organizerSnap, deletedSnap, eventSnap, defaultsSnap,
      preferencesSnap, receiptSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(command.organizerId)),
      tx.get(db.collection("deletedUsers").doc(actorUid)),
      tx.get(eventRef),
      tx.get(db.collection("organizerEventSetupDefaults")
        .doc(command.organizerId)),
      tx.get(preferencesRef), tx.get(receiptRef),
    ]);
    const organizer = authorizeSetupManager(organizerSnap, deletedSnap,
      actorUid);
    const event = eventSnap.data();
    if (!event || event.organizerId !== command.organizerId ||
        event.organizerId !== undefined &&
        event.organizerId !== command.organizerId) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (!validateEventDocument(event)) {
      throw new HttpsError("failed-precondition", "Event is malformed.");
    }
    // The receipt check stays ahead of the revision fences, so an exact
    // retry replays even after later settings moved the revision on.
    const lookup = classifyCommandReceipt<{
      appliedPreferencesRevision?: number;
    }>(receiptSnap, {command: receiptCommand, requestHash,
      nowMillis: deps.nowMillis()});
    if (lookup.kind !== "none") {
      if (params.previewOnly) {
        throw new HttpsError("already-exists",
          "This settings request is already committed. Reload settings.");
      }
      const applied = lookup.kind === "replay" ?
        lookup.result?.appliedPreferencesRevision : undefined;
      if (typeof applied !== "number" || !Number.isSafeInteger(applied) ||
          applied < 1) {
        throw new HttpsError("already-exists",
          "Request ID was used for another offer setting.");
      }
      return {eventId: command.eventId, preferencesRevision: applied,
        replayed: true};
    }
    if (event.status !== "active") {
      throw new HttpsError("failed-precondition",
        "Cancelled events cannot change offer settings.");
    }
    const currentSourceRevision = eventSourceRevision(event);
    const saved = projectEventPreferences(preferencesSnap.data(),
      command.organizerId, command.eventId);
    const revision = saved?.revision ?? 0;
    if (revision >= 1_000_000_000) {
      throw new HttpsError("failed-precondition",
        "Event preference revisions are exhausted.");
    }
    if (currentSourceRevision !== command.expectedEventSourceRevision ||
        revision !== command.expectedPreferencesRevision) {
      throw new HttpsError("aborted", "Event settings changed. Reload them.",
        {reason: "event-preferences-review-stale",
          requestId: command.requestId, eventId: command.eventId,
          organizerId: command.organizerId});
    }
    const projected = projectManagerEventSetupDefaults(command.organizerId,
      organizer, defaultsSnap.data(), eventSetupDefaultsDependencies(db));
    const hostDefaults = organizer.hostDefaults as
      Record<string, unknown> | undefined;
    const defaults: OrganizerEventDefaults = {
      revision: projected.preferencesRevision,
      ...(projected.timezone === null ? {} : {timezone: projected.timezone}),
      ...(hostDefaults?.eventPolicy ? {eventPolicy:
        hostDefaults.eventPolicy as
          OrganizerEventDefaults["eventPolicy"]} : {}),
      eventSetup: projected.preferences,
    };
    let preferences;
    try {
      preferences = resolveEventPreferences({defaults, intents: command.intents,
        reviewedDefaultsHash: command.reviewedDefaultsHash});
    } catch (error) {
      if (error instanceof EventPreferenceError) {
        throw new HttpsError(error.code === "stale" ? "aborted" :
          "invalid-argument", error.message, error.code === "stale" ?
          {reason: "event-preferences-review-stale",
            requestId: command.requestId, eventId: command.eventId,
            organizerId: command.organizerId} : undefined);
      }
      throw error;
    }
    const paymentTerms = eventPaymentTermsFromPreferences(preferences,
      revision + 1);
    const candidate = projectEventPreferences({organizerId: command.organizerId,
      eventId: command.eventId, revision: revision + 1,
      preferences, paymentTerms}, command.organizerId, command.eventId);
    if (!candidate) throw new HttpsError("internal", "Missing candidate.");
    if (params.previewOnly) {
      return {organizerId: command.organizerId, eventId: command.eventId,
        requestId: command.requestId,
        eventSourceRevision: currentSourceRevision, current: saved,
        candidate,
        existingOffersKeepOriginalTerms: true};
    }
    tx.set(preferencesRef, {organizerId: command.organizerId,
      eventId: command.eventId, revision: revision + 1, preferences,
      paymentTerms, updatedByUid: actorUid, updatedAt: deps.serverTimestamp()});
    writeCommandReceipt(tx, receiptRef, {command: receiptCommand,
      retention: "request", requestHash,
      result: {appliedPreferencesRevision: revision + 1},
      nowMillis: deps.nowMillis()});
    return {eventId: command.eventId, preferencesRevision: revision + 1,
      replayed: false};
  });
}
