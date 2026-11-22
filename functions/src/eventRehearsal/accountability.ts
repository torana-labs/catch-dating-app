import {HttpsError} from "firebase-functions/v2/https";
import {Timestamp} from "firebase-admin/firestore";
import type {
  EventRehearsalDocument as Session,
  EventRehearsalActorDocument as Actor,
} from "../shared/generated/firestoreAdminTypes";
import type {
  EventRehearsalBootstrapCallableResponse as Bootstrap,
} from "../shared/generated/eventRehearsalBootstrapCallableResponse";
import type {
  ControlEventRehearsalCallablePayload,
} from "../shared/generated/controlEventRehearsalCallablePayload";
import {operationContentHash as hash} from "../operations/durableActions";
import {currentAccountabilityResolution} from
  "../eventSuccess/accountability";
import {accountabilityResolutionFields} from
  "../domain/bookings/attendeeAccountability";
import {requirePracticeHost, practiceIsManager, practiceGroupPermission} from
  "./groupStaff";
import {practiceMembershipSource} from "./membershipSource";
import type {PracticeCaseAuthority} from "./assistanceCases";
import {practiceContext, practiceEpisode} from "./assistanceRuntime";
import {practiceAttendance, validPracticeVisit} from "./visitState";

type Row = NonNullable<Bootstrap["accountabilityReviews"]>["rows"][number];
type Command = Extract<
  NonNullable<ControlEventRehearsalCallablePayload["assistance"]>,
  { kind: "resolveAccountability" }
>;

/** Visit proof is independent of connectivity, seating and join intent. */
export function practiceVisitEvidence(
  session: Session, actor: Actor
): Row {
  const visit = actor.visit;
  const now = session.virtualNow.toMillis();
  const attendance = practiceAttendance(actor);
  const valid =
    visit !== undefined &&
    validPracticeVisit(visit, session.virtualStartedAt.toMillis(), now);
  const reason = !visit ?
    "visitNotRecorded" :
    !valid ||
          attendance === "unknown" ||
          (attendance === "checkedIn") !==
            (visit.checkedInAtMillis !== null) ?
      "invalidSource" :
      attendance !== "checkedIn" ?
        "notCheckedIn" :
        null;
  const r =
    valid && visit.resolution?.visitRevision === visit.attendanceRevision ?
      visit.resolution :
      null;
  const current =
    reason === null ?
      currentAccountabilityResolution({
        status: "checkedIn",
        checkedInAt: Timestamp.fromMillis(visit!.checkedInAtMillis!),
        accountabilityResolution: r?.disposition ?? null,
        accountabilityResolvedForCheckInAt: r ?
          Timestamp.fromMillis(r.checkedInAtMillis) :
          null,
      }) :
      null;
  const row: Row = {
    attendeeId: actor.actorId,
    episodeId: practiceEpisode(session, actor),
    sourceHash: hash([
      practiceContext(session, actor),
      actor.actorId,
      session.setup.moduleIds,
      attendance,
      visit ?? null,
    ]),
    visitRevision: valid ? visit.attendanceRevision : null,
    checkedInAtMillis: valid ? visit.checkedInAtMillis : null,
    revision: valid ? visit.accountabilityRevision : 0,
    disposition: current ?? "unresolved",
    availability: reason ?
      {kind: "unavailable", reason} :
      {kind: "ready"},
    canResolve:
      reason === null &&
      session.actionCount < 500 &&
      visit!.accountabilityRevision < Number.MAX_SAFE_INTEGER &&
      ["running", "paused", "complete"].includes(session.status),
  };
  return row;
}

/** The general sweep requires its module; checkpoints have their own scope. */
export function practiceAccountabilityView(session: Session, actor: Actor,
  authority?: PracticeCaseAuthority): Row {
  const evidence = practiceVisitEvidence(session, actor);
  const row: Row = session.setup.moduleIds.includes("accountability") ?
    evidence : {...evidence, canResolve: false, disposition: "unresolved",
      availability: {kind: "unavailable", reason: "notApplicable"}};
  if (!authority || practiceIsManager(authority)) return row;
  const membership = practiceMembershipSource(session, actor);
  const groupId = practiceGroupPermission(actor.sessionId, session, authority,
    "event:whole", "resolveAccountability") !== null ? "event:whole" :
    membership.current ? membership.membership?.accepted?.groupId ??
      "event:whole" : "event:whole";
  return {...row, groupId,
    sourceHash: hash([row.sourceHash, authority.actorUid, groupId,
      groupId === "event:whole" ? null : membership.membership?.accepted]),
    canResolve: row.canResolve && practiceGroupPermission(actor.sessionId,
      session, authority, groupId, "resolveAccountability") !== null};
}

/** Uses the live visit-resolution reducer; never writes a production record. */
export function resolvePracticeAccountability(
  session: Session,
  actor: Actor,
  command: Command,
  authority: PracticeCaseAuthority
): Actor {
  requirePracticeHost(authority);
  const view = practiceAccountabilityView(session, actor, authority);
  if (
    (command.groupId ?? "event:whole") !== (view.groupId ?? "event:whole") ||
    command.actorId !== actor.actorId ||
    command.payload.attendeeId !== actor.actorId ||
    command.payload.episodeId !== view.episodeId ||
    command.expectedSourceHash !== view.sourceHash
  ) {
    throw new HttpsError(
      "aborted",
      "Practice visit changed. Review it again."
    );
  }
  if (!view.canResolve) {
    throw new HttpsError(
      "failed-precondition",
      "This practice guest has no current visit to resolve."
    );
  }
  return applyPracticeVisitDisposition(session, actor,
    command.payload.disposition, authority.actorUid);
}

/** Pure reducer; callers verify scope, source and authority first. */
export function applyPracticeVisitDisposition(session: Session,
  actor: Actor,
  disposition: Command["payload"]["disposition"], actorUid: string): Actor {
  const visit = actor.visit!;
  const now = session.virtualNow.toMillis();
  const fields = accountabilityResolutionFields(
    {
      status: "checkedIn",
      checkedInAt: Timestamp.fromMillis(visit.checkedInAtMillis!),
      accountabilityRevision: visit.accountabilityRevision,
    },
    disposition,
    actorUid,
    Timestamp.fromMillis(now)
  );
  return {
    ...actor,
    visit: {
      ...visit,
      accountabilityRevision: fields.accountabilityRevision,
      resolution:
        fields.accountabilityResolution === null ?
          null :
          {
            disposition: fields.accountabilityResolution,
            visitRevision: visit.attendanceRevision,
            checkedInAtMillis: visit.checkedInAtMillis!,
            resolvedAtMillis: now,
            resolvedBy: actorUid,
          },
    },
  };
}

/** Bounded Host projection; guest pages receive no visit audit data. */
export function practiceAccountabilityProjection(
  sessionId: string,
  session: Session,
  actors: readonly Actor[],
  authority?: PracticeCaseAuthority
): NonNullable<Bootstrap["accountabilityReviews"]> {
  if (
    actors.length !== session.actorCount ||
    actors.length > 50 ||
    actors.some((a) => a.sessionId !== sessionId) ||
    new Set(actors.map((a) => a.actorId)).size !== actors.length
  ) {
    throw new HttpsError("failed-precondition", "Practice roster changed.");
  }
  return {
    clockId: practiceContext(session, {sessionId}).clockId,
    coverage: "boundedSession",
    rows: actors
      .map((actor) => practiceAccountabilityView(session, actor, authority))
      .sort((a, b) => a.attendeeId.localeCompare(b.attendeeId)),
  };
}
