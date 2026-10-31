import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {HttpsError} from "firebase-functions/v2/https";
import type {UpdatePrivateEventPreferencesCallablePayload} from
  "../../shared/generated/updatePrivateEventPreferencesCallablePayload";
import {validateUpdatePrivateEventPreferencesCallablePayload} from
  "../../shared/generated/validators/updatePrivateEventPreferencesInput";
import {validateResolvedEventPreferences} from
  "../../shared/generated/validators/resolvedEventPreferences";
import {validateEventPaymentTerms} from
  "../../shared/generated/validators/eventPaymentTerms";
import {
  canonicalJson, eventPaymentTermsFromPreferences, resolveEventPreferences,
} from "../eventSetupPreferences/resolve";
import {EventPreferenceError, OrganizerEventDefaults} from
  "../eventSetupPreferences/types";
import {projectManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";
import {
  assertReceipt, authorizeSetupManager, hashRequest,
  ProgressiveSetupDependencies, ProgressiveSetupResult, receiptFor,
  requireRevision,
} from "./service";

/** Saves event preferences without changing existing offers or defaults. */
export async function updatePrivateEventPreferences(params: {
  actorUid: string;
  command: UpdatePrivateEventPreferencesCallablePayload;
  deps: ProgressiveSetupDependencies;
}): Promise<ProgressiveSetupResult> {
  const {actorUid, command, deps} = params;
  if (!actorUid) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  if (!validateUpdatePrivateEventPreferencesCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid event preferences.");
  }
  if (command.expectedActorUid && command.expectedActorUid !== actorUid) {
    throw new HttpsError("permission-denied", "The signed-in account changed.");
  }
  const {db} = deps;
  const eventRef = db.collection("events").doc(command.eventId);
  const preferencesRef = db.collection("eventSetupPreferences")
    .doc(command.eventId);
  const receiptRef = receiptFor(db, actorUid, command.organizerId,
    command.requestId);
  const requestHash = hashRequest("preferences", command);
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
    if (!event || event.organizerId !== command.organizerId) {
      throw new HttpsError("not-found", "Event not found.");
    }
    // Replays report the original commit, even after later edits/cancellation.
    if (receiptSnap.exists) {
      assertReceipt(receiptSnap.data()!, "preferences", actorUid,
        command.organizerId, requestHash, command.eventId);
      return {eventId: command.eventId,
        setupRevision: receiptSnap.data()!.appliedRevision, replayed: true};
    }
    await readSeatMigrationWriterFence({db, tx, eventId: command.eventId});
    if (event.publicationState !== "private" || event.status !== "active") {
      throw new HttpsError("failed-precondition",
        "Only active private event preferences can be edited here.");
    }
    const setupRevision = requireRevision(event);
    const saved = projectEventPreferences(preferencesSnap.data(),
      command.organizerId, command.eventId);
    const revision = saved?.revision ?? 0;
    if (revision >= 1_000_000_000) {
      throw new HttpsError("failed-precondition",
        "Event preferences revision is exhausted.");
    }
    if (setupRevision !== command.expectedSetupRevision ||
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
    // Validate the exact persisted/read shape, not a permissive internal type.
    projectEventPreferences({organizerId: command.organizerId,
      eventId: command.eventId, revision: revision + 1,
      preferences, paymentTerms}, command.organizerId, command.eventId);
    tx.set(preferencesRef, {organizerId: command.organizerId,
      eventId: command.eventId, revision: revision + 1, preferences,
      paymentTerms, updatedByUid: actorUid, updatedAt: deps.serverTimestamp()});
    tx.update(eventRef, {setupRevision: setupRevision + 1,
      updatedAt: deps.serverTimestamp()});
    tx.create(receiptRef, {operation: "preferences", actorUid,
      organizerId: command.organizerId, requestHash, eventId: command.eventId,
      appliedRevision: setupRevision + 1, createdAt: deps.serverTimestamp()});
    return {eventId: command.eventId, setupRevision: setupRevision + 1,
      replayed: false};
  });
}

/** Current-manager projection; never returns actor metadata or extra fields. */
export function projectEventPreferences(
  raw: FirebaseFirestore.DocumentData | undefined,
  organizerId: string, eventId: string
) {
  if (!raw) return null;
  if (raw.organizerId !== organizerId || raw.eventId !== eventId ||
      !Number.isSafeInteger(raw.revision) || raw.revision < 1 ||
      raw.revision > 1_000_000_000 ||
      !validateResolvedEventPreferences(raw.preferences) ||
      !validateEventPaymentTerms(raw.paymentTerms) ||
      raw.paymentTerms.revision !== raw.revision) {
    throw new HttpsError("failed-precondition",
      "Event preferences are invalid. Contact support.");
  }
  if (canonicalJson(eventPaymentTermsFromPreferences(raw.preferences,
    raw.revision)) !== canonicalJson(raw.paymentTerms)) {
    throw new HttpsError("failed-precondition",
      "Event payment terms do not match the reviewed settings.");
  }
  return {revision: raw.revision as number, preferences: raw.preferences,
    paymentTerms: raw.paymentTerms};
}
