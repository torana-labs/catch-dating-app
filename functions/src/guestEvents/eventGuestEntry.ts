import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument, EventGuestEntryDocument, OrganizerDocument,
  OrganizerFormDocument, OrganizerFormVersionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateOrganizerFormVersionDocument} from
  "../shared/generated/validators/organizerFormVersionDocument";
import {eventOrganizerRef} from "../shared/eventOrganizers";
import {isEventPubliclyAccessible} from "../events/eventPublicationAccess";
import {assertPublicRegistrationPolicy} from
  "../events/publicRegistration/policy";
import {publicRegistrationMode} from "../domain/events/publicRegistrationTerms";
import {canonicalJson} from "../domain/formats/eventSetupPreferences/resolve";

/**
 * eventGuestEntries/{eventId}: how a phone-verified guest with no record of
 * their own enters one published event from the website — register, book,
 * apply or not here — for a community member and for anyone else. Rebuilt
 * from the event, its organizer and its application form whenever one of
 * them changes; an unpublished event has no entry. The website's event page
 * reads it with the guest's guestEventStatuses row and decides the next step
 * in the browser. Registration, checkout and application commands keep
 * checking the authoritative documents.
 */
export const eventGuestEntries = "eventGuestEntries";

export type EventGuestEntry = EventGuestEntryDocument;
type Registration = EventGuestEntry["registration"]["guest"];

/**
 * The one current published application form for the event, if exactly one
 * exists and its immutable version still targets this event with a phone or
 * Catch identity policy. An arbitrary host URL never becomes a form link.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The reading transaction.
 * @param {string} eventId The event.
 * @param {string} organizerId The event's organizer.
 * @return {Promise<string | null>} The public form id.
 */
export async function eventPublicFormId(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string,
  organizerId: string,
): Promise<string | null> {
  const forms = await tx.get(db.collection("organizerForms")
    .where("defaultTargetId", "==", eventId)
    .where("purpose", "==", "application")
    .where("status", "==", "published").limit(2));
  if (forms.size !== 1) return null;
  const form = forms.docs[0].data() as OrganizerFormDocument;
  if (!form.activeVersionId) return null;
  const version = (await tx.get(db.collection("organizerFormVersions")
    .doc(form.activeVersionId))).data() as
      OrganizerFormVersionDocument | undefined;
  if (!version || !validateOrganizerFormVersionDocument(version) ||
      form.organizerId !== organizerId ||
      form.defaultTargetKind !== "event" ||
      version.organizerId !== organizerId ||
      version.formId !== forms.docs[0].id ||
      version.definition.purpose !== "application" ||
      version.definition.defaultTargetKind !== "event" ||
      version.definition.defaultTargetId !== eventId ||
      !["phoneVerified", "catchAccount"].includes(
        version.definition.identityPolicy)) return null;
  return form.publicFormId ?? null;
}

/**
 * The step a guest with no record of their own gets while the event is open:
 * free registration or paid booking when the public registration policy
 * allows it, otherwise the event's application form, otherwise nothing here.
 * @param {EventDocument} event The event.
 * @param {OrganizerDocument} organizer Its organizer.
 * @param {string | null} publicFormId Its application form.
 * @param {boolean} member Whether the guest is an active community member.
 * @param {number} nowMillis A moment before the event starts.
 * @return {Registration} The step.
 */
export function registrationStep(
  event: EventDocument,
  organizer: OrganizerDocument,
  publicFormId: string | null,
  member: boolean,
  nowMillis: number,
): Registration {
  const fallback = publicFormId ? "apply" : "unsupported";
  const mode = publicRegistrationMode(event);
  if (mode === "closed") return fallback;
  try {
    assertPublicRegistrationPolicy(event, organizer, mode, nowMillis, member);
    return mode === "free" ? "registerFree" : "bookPaid";
  } catch (error) {
    if (!(error instanceof HttpsError) ||
        error.code !== "failed-precondition") throw error;
    return fallback;
  }
}

/**
 * The event's guest entry from current authority, or null when the event is
 * missing, unpublished or invalid. The start time is stored rather than
 * applied: the browser closes the entry once the event starts.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The reading transaction.
 * @param {string} eventId The event.
 * @param {number} nowMillis The clock.
 * @return {Promise<EventGuestEntry | null>} The entry.
 */
export async function eventGuestEntry(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string,
  nowMillis: number,
): Promise<EventGuestEntry | null> {
  const event = (await tx.get(db.collection("events").doc(eventId)))
    .data() as EventDocument | undefined;
  if (!event || !isEventPubliclyAccessible(event) ||
      typeof event.organizerId !== "string" ||
      typeof event.startTime?.toMillis !== "function") return null;
  const organizerSnap = await tx.get(eventOrganizerRef(db, event));
  const organizer = organizerSnap.data() as OrganizerDocument | undefined;
  if (!organizer) return null;
  const startAtMillis = event.startTime.toMillis();
  const publicFormId = await eventPublicFormId(db, tx, eventId,
    event.organizerId);
  // Policy is judged as if just before the start; the browser owns the start.
  const before = Math.max(1, Math.min(nowMillis, startAtMillis - 1));
  return {
    schemaVersion: 1,
    eventId,
    organizerId: event.organizerId,
    open: event.status === "active",
    startAtMillis,
    publicFormId,
    registration: {
      guest: registrationStep(event, organizer, publicFormId, false, before),
      member: registrationStep(event, organizer, publicFormId, true, before),
    },
    updatedAtMillis: nowMillis,
  };
}

/**
 * Rebuilds one event's guest entry; an unpublished event has none. Every
 * call reads current state, so out-of-order triggers converge, and an
 * unchanged entry is not rewritten.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event.
 * @param {number} nowMillis The clock.
 * @return {Promise<"written" | "unchanged" | "removed">} What happened.
 */
export async function refreshEventGuestEntry(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  nowMillis = Date.now(),
): Promise<"written" | "unchanged" | "removed"> {
  const ref = db.collection(eventGuestEntries).doc(eventId);
  return db.runTransaction(async (tx) => {
    const [entry, current] = await Promise.all([
      eventGuestEntry(db, tx, eventId, nowMillis), tx.get(ref)]);
    if (entry === null) {
      if (current.exists) tx.delete(ref);
      return "removed" as const;
    }
    if (current.exists && sameExceptClock(current.data(), entry)) {
      return "unchanged" as const;
    }
    tx.set(ref, entry);
    return "written" as const;
  });
}

/**
 * Whether two projections differ only in their clock.
 * @param {object | undefined} a One projection.
 * @param {object} b The other.
 * @return {boolean} True when equal apart from updatedAtMillis.
 */
export function sameExceptClock(a: object | undefined, b: object): boolean {
  return a !== undefined && canonicalJson({...a, updatedAtMillis: 0}) ===
    canonicalJson({...b, updatedAtMillis: 0});
}
