import type {OrganizerDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateOrganizerDocument} from
  "../shared/generated/validators/organizerDocument";
import {guestCollections, guestIdentity} from
  "../eventSuccess/operations/guestRecords";
import {invalidSource} from "../eventSuccess/operations/groupProgressSource";
import {
  MEMBERSHIPS,
  membershipIdentity,
  membershipSourceState,
  MembershipState,
} from "../eventSuccess/operations/membershipReader";
import {defaultMovementViewDeps, LiveContext, MovementViewDeps} from
  "./movementViewSupport";

export const accountabilityViewsCollection = "hostEventAccountabilityViews";
export const membershipViewsCollection = "hostEventMembershipViews";
export const settingViewsCollection = "hostEventAssistanceSettingViews";
export const runtimeViewsCollection = "hostEventRuntimeViews";
/** The workflow kinds the live console reads settings for. */
export const consoleSettingKinds = ["lateJoin"] as const;
/** More attendees than this in one event is outside the guest views' bound. */
export const maxEventAttendees = 1000;

/**
 * The guest and settings view evaluators read the clock as the movement
 * view evaluators do; operableEvent, configuredGroupIds, parsing,
 * planViewWrite, isAssistanceDocumentId and the invalid-source error come
 * from movementViewSupport.
 */
export type GuestViewDeps = MovementViewDeps;
export const defaultGuestViewDeps: GuestViewDeps = defaultMovementViewDeps;

export type GuestViewOutcome =
  | {kind: "removed"; existed: boolean}
  | {kind: "unchanged"; revision: number}
  | {kind: "complete"; revision: number}
  | {kind: "invalidSource"; source: string; detail: string;
    written: boolean};

/**
 * The actor the guest views read membership as. The views carry no actor:
 * authority is a manager's, and the phone derives the signed-in manager's
 * actions.
 */
export const guestViewActor = "host-read-model";

/**
 * One guest's membership facts as a manager reads them: the six source
 * documents through membershipSourceState, and the organizer, whose
 * managers can receive the guest. No staff grant is read.
 */
export async function readManagerMembership(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  scope: {context: LiveContext; attendeeId: string},
  now: number): Promise<MembershipState> {
  const {context, attendeeId} = scope;
  const [eventSnap, attendeeSnap, organizerSnap, planSnap, guestSnap,
    memberSnap] = await tx.getAll(
    db.collection("events").doc(context.eventId),
    db.collection("eventAttendees").doc(attendeeId),
    db.collection("organizers").doc(context.organizerId),
    db.collection("eventSuccessPlans").doc(context.eventId),
    db.collection(guestCollections.guests)
      .doc(guestIdentity(context, attendeeId)),
    db.collection(MEMBERSHIPS).doc(membershipIdentity(scope)));
  const organizer = organizerSnap.data();
  if (!validateOrganizerDocument(organizer)) throw invalidSource();
  const state = membershipSourceState({scope, eventSnap, attendeeSnap,
    planSnap, guestSnap, memberSnap, now});
  return {...state, actorUid: guestViewActor, manager: true, staff: null,
    organizer: organizer as unknown as OrganizerDocument};
}
