import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {SetEventPublicationCallablePayload as Command} from
  "../../shared/generated/setEventPublicationCallablePayload";
import type {EventPublicationCallableResponse as Result} from
  "../../shared/generated/eventPublicationCallableResponse";
import {validateSetEventPublicationCallablePayload} from
  "../../shared/generated/validators/setEventPublicationInput";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {preparePublishedEventPatch, publicationRegistrationPatch} from
  "./publicationReadiness";
import {claimOrganizerScheduleInTransaction} from "../scheduleConflicts";
import {preparePrivateListingTerms} from "./listingTerms";
import {admissionChoicesFromPreferences, admissionChoicesPatch} from
  "./admissionChoices";
import {
  assertReceipt, authorizeSetupManager, hashRequest,
  receiptFor, requireRevision, ProgressiveSetupDependencies,
} from "./service";

type GuestAccessSettings = Pick<Command,
  "listing" | "showGuestList" | "priceHiddenUntilBookingOpens">;

/** The settings the command changes, with each field's read-time default:
 * listing reads listed, showGuestList true, priceHiddenUntilBookingOpens false.
 */
export function guestAccessSettingsPatch(event: Record<string, unknown>,
  command: GuestAccessSettings): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const current = {
    listing: event.listing ?? "listed",
    showGuestList: event.showGuestList ?? true,
    priceHiddenUntilBookingOpens: event.priceHiddenUntilBookingOpens ?? false,
  };
  for (const key of ["listing", "showGuestList",
    "priceHiddenUntilBookingOpens"] as const) {
    const value = command[key];
    if (value !== undefined && value !== current[key]) patch[key] = value;
  }
  return patch;
}

/** Publication changes visibility. Registration is enabled separately.
 * The same transaction fences manager, revision, schedule and command replay.
 * Canonical event triggers own search and next-event projection retries.
 * Publishing also applies the booking and waitlist choices saved in the
 * event's preferences to its admission policy, with the seat ledger. The
 * current publicationState with changed settings saves only the settings.
 */
export async function setEventPublication(params: {
  actorUid: string;
  command: Command;
  deps: ProgressiveSetupDependencies;
  nowMillis?: () => number;
}): Promise<Result> {
  const {actorUid, command, deps} = params;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(actorUid) ||
      !validateSetEventPublicationCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid publication change.");
  }
  const operation = command.publicationState === "published" ?
    "publish" : "unpublish";
  const hash = hashRequest(operation, command);
  const {db} = deps;
  return db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(command.eventId);
    const receiptRef = receiptFor(db, actorUid, command.organizerId,
      command.requestId);
    const [organizerSnap, deletedSnap, eventSnap, receiptSnap,
      preferencesSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(command.organizerId)),
      tx.get(db.collection("deletedUsers").doc(actorUid)),
      tx.get(eventRef), tx.get(receiptRef),
      tx.get(db.collection("eventSetupPreferences").doc(command.eventId)),
    ]);
    const organizer = authorizeSetupManager(organizerSnap, deletedSnap,
      actorUid);
    const event = eventSnap.data();
    if (!event || event.organizerId !== command.organizerId) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data()!;
      assertReceipt(receipt, operation, actorUid, command.organizerId,
        hash, command.eventId);
      return {eventId: command.eventId,
        setupRevision: receipt.appliedRevision as number,
        publicationState: command.publicationState, replayed: true};
    }
    await readSeatMigrationWriterFence({db, tx, eventId: command.eventId});
    const revision = requireRevision(event);
    if (revision !== command.expectedSetupRevision) {
      throw new HttpsError("aborted", "Event changed. Review it again.", {
        reason: "event-publication-review-stale", requestId: command.requestId,
        organizerId: command.organizerId, eventId: command.eventId,
        expectedSetupRevision: command.expectedSetupRevision,
        publicationState: command.publicationState});
    }
    if (event.publicationState !== "private" &&
        event.publicationState !== "published") {
      throw new HttpsError("failed-precondition",
        "Event publication needs review.");
    }
    const settings = guestAccessSettingsPatch(event, command);
    const settingsOnly = event.publicationState === command.publicationState;
    if (settingsOnly && Object.keys(settings).length === 0) {
      throw new HttpsError("failed-precondition",
        "This publication change has already been made. Refresh the event.");
    }
    const nowMillis = (params.nowMillis ?? Date.now)();
    const patch: Record<string, unknown> = {
      ...settings,
      setupRevision: revision + 1,
      updatedAt: deps.timestampFromMillis(nowMillis),
    };
    let admission: ReturnType<typeof admissionChoicesPatch> = null;
    if (!settingsOnly) {
      patch.publicationState = command.publicationState;
      Object.assign(patch,
        publicationRegistrationPatch(event as EventDocument));
    }
    if (!settingsOnly && operation === "publish") {
      admission = admissionChoicesPatch(event as EventDocument,
        admissionChoicesFromPreferences(preferencesSnap.data()));
      Object.assign(patch, admission ?? {}, preparePublishedEventPatch({
        event: {...event, ...admission} as EventDocument, organizer,
        nowMillis, timestampFromMillis: deps.timestampFromMillis}));
    }
    // Validating the target enforces the complete published schema, and the
    // private schema when unpublishing. It never invents missing terms.
    if (!validateEventDocument({...event, ...patch})) {
      throw new HttpsError("failed-precondition",
        "Complete the event details and admission terms before publishing.");
    }
    // Reads only; the ledger is written with the event below.
    const ledger = admission ? await preparePrivateListingTerms({db, tx,
      eventId: command.eventId, before: event as EventDocument,
      after: {...event, ...admission} as EventDocument}) : null;
    if (!settingsOnly && operation === "publish") {
      // This helper performs the final reads before writing schedule locks.
      await claimOrganizerScheduleInTransaction(tx, db, {
        organizerId: command.organizerId, eventId: command.eventId,
        startTimeMillis: event.startTime.toMillis(),
        endTimeMillis: event.endTime.toMillis(),
      });
    }
    if (ledger?.ledger) {
      tx.set(db.collection("eventSeatLedgers").doc(command.eventId),
        ledger.ledger);
    }
    if (ledger?.fence) {
      tx.create(db.collection("eventSeatMigrationFences")
        .doc(command.eventId), ledger.fence);
    }
    tx.update(eventRef, patch);
    tx.create(receiptRef, {operation, actorUid,
      organizerId: command.organizerId, eventId: command.eventId,
      requestHash: hash, appliedRevision: revision + 1,
      createdAt: deps.serverTimestamp()});
    return {eventId: command.eventId, setupRevision: revision + 1,
      publicationState: command.publicationState, replayed: false};
  });
}
