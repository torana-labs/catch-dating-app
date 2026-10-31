import * as admin from "firebase-admin";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {OrganizerApplicationDocument as Application} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventDocument} from "../../shared/generated/eventDocument";
import {timestampMillis} from "./model";
import {validateOrganizerApplicationDocument} from
  "../../shared/generated/validators/organizerApplicationDocument";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {organizerApplicationAccess} from
  "../../organizers/organizerApplicationAccess";
import {requireDoc} from "../../shared/validation";
import {isEventPubliclyAccessible} from "../eventPublicationAccess";

export type Identity = Pick<
  admin.auth.UserRecord,
  "uid" | "phoneNumber" | "email" | "emailVerified" | "disabled"
>;
export type LoadIdentity = (uid: string) => Promise<Identity | null>;
export const loadIdentity: LoadIdentity = async (uid) => {
  try {
    return await admin.auth().getUser(uid);
  } catch (error) {
    if ((error as {code?: string}).code === "auth/user-not-found") {
      return null;
    }
    throw error;
  }
};
export async function readApplication(
  db: Firestore,
  tx: Transaction,
  applicationId: string,
  uid: string,
  eventId: string,
  now: number,
): Promise<{application: Application; event: EventDocument} | null> {
  const [applicationSnap, eventSnap, deleted] = await Promise.all([
    tx.get(db.collection("organizerApplications").doc(applicationId)),
    tx.get(db.collection("events").doc(eventId)),
    tx.get(db.collection("deletedUsers").doc(uid)),
  ]);
  if (
    deleted.exists ||
    !validateOrganizerApplicationDocument(applicationSnap.data()) ||
    !validateEventDocument(eventSnap.data())
  ) {
    return null;
  }
  const application = requireDoc<Application>(
    applicationSnap,
    "OrganizerApplicationDocument",
  );
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  if (
    application.linkedUid !== uid ||
    application.targetKind !== "event" ||
    application.targetId !== eventId ||
    application.organizerId !== (event.organizerId) ||
    application.reviewStatus === "withdrawn" ||
    event.status !== "active" ||
    timestampMillis(event.startTime) <= now ||
    !isEventPubliclyAccessible(event)
  ) {
    return null;
  }
  const organizer = (await tx.get(db.collection("organizers")
    .doc(application.organizerId))).data();
  if (!organizer || organizer.archived === true) return null;
  const access = await organizerApplicationAccess({
    db,
    transaction: tx,
    applicationId,
    application,
  });
  if (
    access.accessState === "revokedParticipantGrant" ||
    access.accessState === "organizerImported"
  ) {
    return null;
  }
  return {application, event};
}
