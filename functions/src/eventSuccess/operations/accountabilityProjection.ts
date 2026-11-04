import {operationContentHash} from "../../operations/durableActions";
import {currentAccountabilityResolution} from "../accountability";
import {eventSuccessPrimitivesFor} from "../formatPrimitives";
import type {EventAssistanceAccountabilityCallableResponse as Response} from
  "../../shared/generated/eventAssistanceAccountabilityCallableResponse";
import {currentGuest} from "./guestRecords";
import {timestampEvidence} from "./groupProgressSource";
import type {MembershipState} from "./membershipReader";
import type {AccountabilityScope} from "./accountabilityCheckpoint";

type View = Response["view"];
/** The membership facts accountability reads; no actor is involved. */
export type AccountabilityMember = Pick<MembershipState,
  "sourceHash" | "event" | "attendee" | "membership" | "guest" | "source">;
/** One guest's accountability sources for one scope. */
export interface AccountabilityEvidence {
  scope: AccountabilityScope;
  member: AccountabilityMember;
  checkpoint: {
    proof: NonNullable<View["checkpoint"]> & {rosterId: string;
      rosterHash: string} | null;
    availability: View["availability"];
  } | null;
}
/** The time-free part of an accountability view. */
export type AccountabilityState = Pick<View,
  "sourceHash" | "revision" | "episodeId" | "disposition" | "availability">;

/**
 * Pure accountability projection: the fence hash, the guest episode, the
 * saved disposition and whether the visit can be resolved in this scope. The
 * resolve command checks a client's expectedSourceHash against this hash, so
 * the live console's checkpoint view and the command read the same rules.
 */
export function accountabilityState(e: AccountabilityEvidence):
  AccountabilityState {
  return {sourceHash: accountabilitySourceHash(e),
    revision: e.member.attendee.accountabilityRevision ?? 0,
    episodeId: accountabilityEpisodeId(e.member),
    disposition: currentAccountabilityResolution(e.member.attendee) ??
      "unresolved", availability: accountabilityAvailability(e)};
}

export function accountabilityCheckInHash(
  attendee: AccountabilityMember["attendee"]
) {
  return operationContentHash([attendee.status,
    attendee.attendanceRevision ?? 0,
    attendee.checkedInAt ? timestampEvidence(attendee.checkedInAt) : null]);
}

export function accountabilityEpisodeId(member: Pick<AccountabilityMember,
  "guest" | "source">): string | null {
  const guest = member.guest;
  return guest && currentGuest(guest, member.source) ? guest.episodeId : null;
}

export function accountabilitySourceHash(e: AccountabilityEvidence) {
  const a = e.member.attendee;
  const membership = e.member.membership;
  const facts = [e.scope, e.member.sourceHash,
    e.member.event.eventFormat, accountabilityEpisodeId(e.member),
    e.scope.groupId === "event:whole" || !membership ? null :
      [membership.episodeId, membership.sourceGeneration,
        membership.attendeeGeneration, membership.accepted],
    accountabilityCheckInHash(a), a.accountabilityRevision ?? 0,
    a.accountabilityResolution ?? null,
    a.accountabilityResolvedForCheckInAt ?
      timestampEvidence(a.accountabilityResolvedForCheckInAt) : null,
    a.accountabilityResolvedAt ?
      timestampEvidence(a.accountabilityResolvedAt) : null,
    a.accountabilityResolvedBy ?? null];
  return operationContentHash(e.checkpoint ? [...facts, {
    proof: e.checkpoint.proof,
    availability: e.checkpoint.availability}] : facts);
}

export function accountabilityAvailability(e: AccountabilityEvidence):
  View["availability"] {
  if (e.checkpoint) return e.checkpoint.availability;
  const m = e.member;
  const reason = eventSuccessPrimitivesFor(m.event.eventFormat)
    .accountability !== "sweep" ? "notApplicable" :
    m.attendee.status !== "checkedIn" || !m.attendee.checkedInAt ?
      "notCheckedIn" : null;
  return reason ? {kind: "unavailable", reason} : {kind: "ready"};
}
