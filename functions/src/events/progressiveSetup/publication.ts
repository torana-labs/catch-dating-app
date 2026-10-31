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
import {
  assertReceipt, authorizeSetupManager, hashRequest,
  receiptFor, requireRevision, ProgressiveSetupDependencies,
} from "./service";

/** Publication changes visibility. Registration is enabled separately.
 * The same transaction fences manager, revision, schedule and command replay.
 * Canonical event triggers own search and next-event projection retries.
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
    const [organizerSnap, deletedSnap, eventSnap, receiptSnap] =
      await Promise.all([
        tx.get(db.collection("organizers").doc(command.organizerId)),
        tx.get(db.collection("deletedUsers").doc(actorUid)),
        tx.get(eventRef), tx.get(receiptRef),
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
    if (event.publicationState === command.publicationState) {
      throw new HttpsError("failed-precondition",
        "This publication change has already been made. Refresh the event.");
    }
    const patch: Record<string, unknown> = {
      publicationState: command.publicationState,
      setupRevision: revision + 1,
      ...publicationRegistrationPatch(event as EventDocument),
      updatedAt: deps.timestampFromMillis((params.nowMillis ?? Date.now)()),
    };
    if (operation === "publish") {
      Object.assign(patch, preparePublishedEventPatch({
        event: event as EventDocument, organizer,
        nowMillis: (params.nowMillis ?? Date.now)(),
        timestampFromMillis: deps.timestampFromMillis}));
    }
    // Validating the target enforces the complete published schema, and the
    // private schema when unpublishing. It never invents missing terms.
    if (!validateEventDocument({...event, ...patch})) {
      throw new HttpsError("failed-precondition",
        "Complete the event details and admission terms before publishing.");
    }
    if (operation === "publish") {
      // This helper performs the final reads before writing schedule locks.
      await claimOrganizerScheduleInTransaction(tx, db, {
        organizerId: command.organizerId, eventId: command.eventId,
        startTimeMillis: event.startTime.toMillis(),
        endTimeMillis: event.endTime.toMillis(),
      });
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
