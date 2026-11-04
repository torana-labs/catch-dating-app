import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {EventAssistanceAccountabilityCallableResponse as Response} from
  "../../shared/generated/eventAssistanceAccountabilityCallableResponse";
import type {MembershipState} from "./membershipReader";
import {readGroupProgressState} from "./groupProgressReader";
import {invalidSource} from "./groupProgressSource";
import {DEPARTURE_ROSTERS, departureRosterIdentity, departureVisitHash} from
  "./departureRosterSource";
import {checkpointAvailability, parseDepartureRoster, ProgressState, Roster}
  from "./checkpointRecords";

type View = Response["view"];
/** One guest's visit result, optionally reviewed at one saved departure. */
export type AccountabilityScope = Pick<View,
  "context" | "groupId" | "attendeeId" | "checkpoint">;
type CheckpointScope = NonNullable<View["checkpoint"]>;
type Member = Pick<MembershipState, "attendee" | "source">;

/** Resolves one original departure member against the current visit. */
export async function readAccountabilityCheckpoint(db: Firestore,
  tx: Transaction, scope: AccountabilityScope, member: MembershipState,
  clock: () => number) {
  const checkpoint = scope.checkpoint;
  if (!checkpoint) return null;
  const progress = await readGroupProgressState(db, tx, scope.context,
    scope.groupId, clock);
  const snap = await tx.get(db.collection(DEPARTURE_ROSTERS).doc(
    departureRosterIdentity(scope.context, scope.groupId,
      checkpoint.progressRevision)));
  const now = clock();
  if (!Number.isSafeInteger(now) || now < progress.now || now < member.now) {
    throw invalidSource();
  }
  const roster = parseDepartureRoster(snap.data(), {context: scope.context,
    groupId: scope.groupId, ...checkpoint}, now);
  return {...checkpointAccountability({scope, checkpoint, progress, roster,
    member}), now};
}

/**
 * The departure proof and availability for one attendee, from a roster the
 * caller has already read and parsed for this checkpoint scope.
 */
export function checkpointAccountability(params: {
  scope: Pick<AccountabilityScope, "context" | "groupId" | "attendeeId">;
  checkpoint: CheckpointScope; progress: ProgressState;
  roster: Roster | null; member: Member;
}) {
  const {scope, checkpoint, progress, roster, member} = params;
  const reportScope = {context: scope.context, groupId: scope.groupId,
    ...checkpoint};
  const proof = roster ? {...checkpoint, rosterId: roster.rosterId,
    rosterHash: operationContentHash(roster)} : null;
  const status = checkpointAvailability({scope: reportScope, progress, roster,
    report: null, visits: [], ownerValidUntil: 0, now: progress.now});
  let availability: View["availability"];
  if (status.kind === "unavailable") {
    availability = {kind: "unavailable", reason:
      status.reason === "rosterNotRecorded" ? "departureNotRecorded" :
        status.reason};
  } else {
    const departed = roster!.members.find((m) =>
      m.attendeeId === scope.attendeeId);
    const attendee = member.attendee;
    const reason = !departed ? "notOnDeparture" :
      attendee.status !== "checkedIn" || !attendee.checkedInAt ?
        "notCheckedIn" :
        departed.sourceGeneration !== member.source.sourceGeneration ||
        departed.attendeeGeneration !== member.source.attendeeGeneration ||
        departed.checkInHash !== departureVisitHash(attendee) ?
          "visitChanged" : null;
    availability = reason ? {kind: "unavailable", reason} : {kind: "ready"};
  }
  return {proof, availability};
}
