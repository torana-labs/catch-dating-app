import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventAssistanceMembershipDocument as Membership} from
  "../../shared/generated/eventAssistanceMembershipDocument";
import type {GetEventAssistanceMembershipCallablePayload as Scope} from
  "../../shared/generated/getEventAssistanceMembershipCallablePayload";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {validateEventAssistanceMembershipDocument} from
  "../../shared/generated/validators/eventAssistanceMembershipDocument";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import {eventStaffGrantId, staffTimestampMillis} from
  "../../shared/eventOperatorAuthority";
import {groupDutySource, GroupPermission, GROUP_DUTY_PERMISSIONS,
  parseStaff} from "./groupStaffAuthority";
import {guestCollections, guestIdentity, parseGuest, currentGuest,
  guestSourceFactsFromSnapshots} from "./guestRecords";
import {invalidSource, timestampEvidence} from "./groupProgressSource";

export type {Membership, Scope};
export const MEMBERSHIPS = "eventAssistanceMemberships";
export const MEMBERSHIP_RECEIPTS = "eventAssistanceMembershipReceipts";
export function membershipIdentity(scope: Scope) {
  guestIdentity(scope.context, scope.attendeeId);
  return "membership:" + operationContentHash({context: scope.context,
    attendeeId: scope.attendeeId});
}
export async function readMembership(db: Firestore, tx: Transaction,
  scope: Scope, actorUid: string, clock: () => number) {
  const {context, attendeeId} = scope;
  const membershipId = membershipIdentity(scope);
  const [eventSnap, attendeeSnap, organizerSnap, planSnap, guestSnap,
    memberSnap, staffSnap] = await tx.getAll(
    db.collection("events").doc(context.eventId),
    db.collection("eventAttendees").doc(attendeeId),
    db.collection("organizers").doc(context.organizerId),
    db.collection("eventSuccessPlans").doc(context.eventId),
    db.collection(guestCollections.guests)
      .doc(guestIdentity(context, attendeeId)),
    db.collection(MEMBERSHIPS).doc(membershipId),
    db.collection("eventStaffGrants").doc(eventStaffGrantId(context.eventId,
      actorUid)));
  const event = eventSnap.data();
  const attendee = attendeeSnap.data();
  const organizer = organizerSnap.data();
  const plan = planSnap.data() ?? null;
  const now = clock();
  if (!Number.isSafeInteger(now) || now < 0 ||
      !validateEventDocument(event) ||
      event.organizerId !== context.organizerId ||
      !validateEventAttendeeDocument(attendee) ||
      attendee.eventId !== context.eventId ||
      attendee.organizerId !== context.organizerId ||
      !validateOrganizerDocument(organizer) ||
      (plan !== null && (!validateEventSuccessPlanDocument(plan) ||
        plan.eventId !== context.eventId ||
        (plan.organizerId) !== context.organizerId))) {
    throw invalidSource();
  }
  if (!event.eventFormat) throw invalidSource();
  const guest = guestSnap.exists ? parseGuest(guestSnap.data()) : null;
  if (guest && (guest.guestId !== guestIdentity(context, attendeeId) ||
      guest.updatedAt > now)) throw invalidSource();
  const source = guestSourceFactsFromSnapshots(context, attendeeId,
    eventSnap, attendeeSnap);
  const raw = memberSnap.data();
  const membership = raw === undefined ? null :
    parseMembership(raw, scope, now);
  const route = event.eventFormat.activityDetails?.routePlan;
  const groups = route?.groupStrategy === "paceGroups" ?
    (route.paceGroups ?? []).map((g) => ({groupId: g.id, label: g.label,
      sourceHash: groupDutySource(context, g.id, event, eventSnap.createTime)
        .hash})) : [];
  if (groups.some((g) => g.groupId === "event:whole")) throw invalidSource();
  const sourceHash = operationContentHash([scope, source.sourceGeneration,
    source.attendeeGeneration, event.status,
    timestampEvidence(event.startTime), timestampEvidence(event.endTime),
    attendee.status, attendee.linkedUid, groups,
    plan ? timestampEvidence(planSnap.createTime) : null,
    plan?.status ?? null]);
  const manager = isOrganizerManager(organizer as unknown as OrganizerDocument,
    actorUid);
  return {scope, actorUid, now, manager, source, sourceHash, membershipId,
    membership, guest, groups, complete: plan?.status === "complete",
    staff: manager ? null :
      parseStaff(staffSnap.data(), context, actorUid, now),
    event, attendee, eventGeneration: eventSnap.createTime,
    organizer: organizer as unknown as OrganizerDocument};
}
export type MembershipState = Awaited<ReturnType<typeof readMembership>>;

export function parseMembership(value: unknown, scope: Scope, now: number) {
  if (!validateEventAssistanceMembershipDocument(value) ||
      value.membershipId !== membershipIdentity(scope) ||
      value.membershipId !== membershipIdentity(value) ||
      value.createdAt > value.updatedAt || value.updatedAt > now ||
      (value.accepted && value.accepted.acceptedAt > value.updatedAt)) {
    throw invalidSource();
  }
  const t = value.transfer;
  if (t && (t.requestedAt > value.updatedAt || t.expiresAt <= t.requestedAt ||
      t.from === t.to || (t.status === "pending" ?
    t.resolvedAt !== null || t.resolvedBy !== null ||
          t.from !== (value.accepted?.groupId ?? null) :
    t.resolvedAt === null || t.resolvedBy === null ||
          t.resolvedAt < t.requestedAt || t.resolvedAt > value.updatedAt))) {
    throw invalidSource();
  }
  return value;
}
export function currentMembership(s: Pick<MembershipState,
  "membership" | "guest" | "source" | "groups">): boolean {
  const m = s.membership;
  return !!m && !!s.guest && currentGuest(s.guest, s.source) &&
    m.sourceGeneration === s.source.sourceGeneration &&
    m.attendeeGeneration === s.source.attendeeGeneration &&
    m.episodeId === s.guest.episodeId && (!m.accepted || s.groups.some((g) =>
    g.groupId === m.accepted!.groupId &&
      g.sourceHash === m.accepted!.groupSourceHash));
}
export function membershipReady(s: MembershipState) {
  return !!s.guest && currentGuest(s.guest, s.source) &&
    s.guest.participation.state === "active" &&
    s.guest.intention.kind !== "notComing" && !s.complete &&
    s.source.eventStatus === "active" && s.now < s.source.eventEnd &&
    s.groups.length > 0;
}
export function memberAccess(s: MembershipState, groupId: string,
  permission: GroupPermission): boolean {
  const group = s.groups.find((g) => g.groupId === groupId);
  if (!group) return false;
  if (s.manager) return true;
  const duty = s.staff?.groupDuties?.find((d) => d.groupId === groupId);
  const allowed: readonly GroupPermission[] = duty ?
    GROUP_DUTY_PERMISSIONS[duty.duty] : [];
  return !!duty && s.staff?.status === "active" &&
    duty.sourceHash === group.sourceHash &&
    s.now < Math.min(duty.expiresAtMillis,
      staffTimestampMillis(s.staff.expiresAt)) && allowed.includes(permission);
}
export function canReadMembership(s: MembershipState): boolean {
  if (s.manager) return true;
  if (!currentMembership(s)) return false;
  const m = s.membership!;
  return !!m.accepted && memberAccess(s, m.accepted.groupId, "readProgress") ||
    !!m.transfer && m.transfer.status === "pending" &&
      s.now < m.transfer.expiresAt &&
      m.transfer.receivingOperatorId === s.actorUid &&
      memberAccess(s, m.transfer.to, "transferGroup");
}
export function membershipDenied() {
  return new HttpsError("permission-denied",
    "This account cannot manage this guest's group membership.");
}
