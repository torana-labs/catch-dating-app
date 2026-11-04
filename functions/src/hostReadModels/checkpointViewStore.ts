import {logger} from "firebase-functions";
import {HttpsError} from "firebase-functions/v2/https";
import type {HostEventCheckpointViewDocument as ViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventAssistanceDepartureRosterDocument} from
  "../shared/generated/validators/eventAssistanceDepartureRosterDocument";
import {parseGroupProgressEvent} from
  "../eventSuccess/operations/groupProgressReader";
import {DEPARTURE_ROSTERS} from
  "../eventSuccess/operations/departureRosterSource";
import {
  checkpointIdentity,
  checkpointResponse,
  CheckpointState,
  Roster,
  Scope,
} from "../eventSuccess/operations/checkpointRecords";
import {readCheckpoint} from "../eventSuccess/operations/checkpointReader";
import {readCheckpointReporterCandidates} from
  "../eventSuccess/operations/checkpointReporters";
import {guestCollections, guestIdentity} from
  "../eventSuccess/operations/guestRecords";
import {MEMBERSHIPS, membershipIdentity, membershipSourceState} from
  "../eventSuccess/operations/membershipReader";
import {checkpointAccountability} from
  "../eventSuccess/operations/accountabilityCheckpoint";
import {accountabilityState} from
  "../eventSuccess/operations/accountabilityProjection";
import {rosterCheckpointId} from "./departureViewStore";
import {
  checkpointViewFreezeMillis,
  checkpointViewsCollection,
  configuredGroupIds,
  defaultMovementViewDeps,
  LiveContext,
  MovementSourceInvalidError,
  MovementViewDeps,
  operableEvent,
  parsing,
  planViewWrite,
} from "./movementViewSupport";

export type CheckpointViewOutcome =
  | {kind: "removed"; existed: boolean}
  | {kind: "noCheckpoint"}
  | {kind: "frozen"}
  | {kind: "unchanged"; revision: number}
  | {kind: "complete"; revision: number}
  | {kind: "invalidSource"; source: string; detail: string;
    written: boolean};

type View = NonNullable<ViewDocument["view"]>;
type Entry = ViewDocument["accountability"][number];
const invalidWorkMessage = "Invalid or inconsistent live assistance work";

/**
 * Re-evaluates the checkpoint view of one departure roster (rosters whose
 * destination is not a checkpoint have none) in one transaction: everything
 * the retired getEventAssistanceCheckpoint callable read (the group's
 * progress source, the roster, the report, each member's attendee row, the
 * request work item, the responsible reporter's access), the reporters who
 * could take over the request, and each member's guest and membership rows
 * for the checkpoint-scoped accountability view. Views of rosters whose
 * event, organizer or group is gone are deleted; a view is frozen 24 hours
 * after its event ends. A source that fails validation records invalidSource
 * and keeps the previous view; nothing it causes throws.
 */
export async function reconcileCheckpointView(
  db: FirebaseFirestore.Firestore,
  rosterId: string,
  deps: MovementViewDeps = defaultMovementViewDeps
): Promise<CheckpointViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<CheckpointViewOutcome> => {
    const rosterSnap = await tx.get(db.collection(DEPARTURE_ROSTERS)
      .doc(rosterId));
    const raw = rosterSnap.data();
    const rosterValid = raw !== undefined &&
      validateEventAssistanceDepartureRosterDocument(raw) &&
      raw.rosterId === rosterId && raw.context.mode === "live";
    const checkpointId = rosterValid ? rosterCheckpointId(raw) : null;
    if (raw === undefined || (rosterValid && checkpointId === null)) {
      const stale = await tx.get(db.collection(checkpointViewsCollection)
        .where("rosterId", "==", rosterId).limit(2));
      for (const doc of stale.docs) tx.delete(doc.ref);
      return raw === undefined ? {kind: "removed", existed: !stale.empty} :
        {kind: "noCheckpoint"};
    }
    if (!rosterValid) {
      const stale = await tx.get(db.collection(checkpointViewsCollection)
        .where("rosterId", "==", rosterId).limit(1));
      const previous = stale.empty ? null :
        stale.docs[0].data() as ViewDocument;
      return keepInvalid(tx, stale.empty ? null : stale.docs[0].ref, previous,
        new MovementSourceInvalidError(DEPARTURE_ROSTERS,
          "The roster fails its contract."), deps);
    }
    const roster = raw as Roster;
    const context = roster.context as LiveContext;
    const scope: Scope = {context, groupId: roster.groupId,
      progressRevision: roster.progressRevision, checkpointId: checkpointId!};
    const viewId = checkpointIdentity(scope);
    const viewRef = db.collection(checkpointViewsCollection).doc(viewId);
    const [viewSnap, eventSnap, planSnap] = await tx.getAll(viewRef,
      db.collection("events").doc(context.eventId),
      db.collection("eventSuccessPlans").doc(context.eventId));
    const previous = viewSnap.exists ? viewSnap.data() as ViewDocument : null;
    const operable = operableEvent(context.eventId, eventSnap.data());
    if (!operable || operable.context.organizerId !== context.organizerId ||
        !configuredGroupIds(eventSnap.data()!).includes(roster.groupId)) {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    }
    const nowStamp = deps.now();
    const now = nowStamp.toMillis();
    if (now >= operable.endAtMillis + checkpointViewFreezeMillis) {
      return {kind: "frozen"};
    }
    const clock = () => now;
    const keys = {checkpointViewId: viewId, eventId: context.eventId,
      organizerId: context.organizerId, groupId: roster.groupId,
      progressRevision: roster.progressRevision, checkpointId: checkpointId!,
      rosterId, memberAttendeeIds: roster.members.map((m) => m.attendeeId),
      eventEndAtMillis: operable.endAtMillis};
    let view: View;
    let ownerValidUntilMillis: number;
    let accountability: Entry[];
    try {
      const event = eventSnap.data();
      await parsing(validateEventDocument(event) &&
        event.organizerId === context.organizerId ? "eventSuccessPlans" :
        "events", () => parseGroupProgressEvent(context, eventSnap, planSnap));
      const state = await checkpointSources(() =>
        readCheckpoint(db, tx, scope, clock));
      const candidates = await parsing("organizers", () =>
        readCheckpointReporterCandidates(db, tx, state, clock));
      const response = await parsing("eventAssistanceCheckpoints", () =>
        checkpointResponse("read", state));
      const {serverTime: _serverTime, reporterOptions: _options, ...read} =
        response.view;
      void _serverTime;
      void _options;
      view = {...read, assignment: read.assignment ?? null,
        closeout: read.closeout ?? null, reporterOptions: candidates};
      ownerValidUntilMillis = state.ownerValidUntil;
      accountability = await memberAccountability(db, tx, state, eventSnap,
        planSnap, now);
    } catch (error) {
      if (!(error instanceof MovementSourceInvalidError)) throw error;
      return keepInvalid(tx, viewRef, previous, error, deps, keys);
    }
    const plan = planViewWrite(previous, {schemaVersion: 1 as const, ...keys,
      sourceCoverage: "complete" as const, incompleteSource: null,
      ownerValidUntilMillis, view, accountability}, nowStamp);
    if (plan.unchanged) return {kind: "unchanged", revision: plan.revision};
    tx.set(viewRef, plan.document);
    return {kind: "complete", revision: plan.revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Live checkpoint view read an invalid source.", {
      rosterId, source: outcome.source, detail: outcome.detail});
  }
  return outcome;
}

/** The checkpoint reader's own failures, attributed to their collection. */
async function checkpointSources(read: () => Promise<CheckpointState>) {
  try {
    return await parsing("eventAssistanceCheckpoints", read);
  } catch (error) {
    if (error instanceof Error && error.message === invalidWorkMessage) {
      throw new MovementSourceInvalidError("operationWorkItems", error.message);
    }
    throw error;
  }
}

/**
 * The accountability view of each roster member for the checkpoint scope
 * {context, groupId, attendeeId, checkpoint}: what the resolve command
 * fences on when the sweep sheet is opened from this checkpoint. A member
 * whose own rows fail validation gets a null view (the command would refuse
 * them too); the checkpoint view itself stays complete.
 */
async function memberAccountability(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, state: CheckpointState,
  eventSnap: FirebaseFirestore.DocumentSnapshot,
  planSnap: FirebaseFirestore.DocumentSnapshot, now: number):
  Promise<Entry[]> {
  const roster = state.roster;
  if (!roster) return [];
  const {context, groupId, checkpointId, progressRevision} = state.scope;
  const checkpoint = {checkpointId, progressRevision};
  const entries: Entry[] = [];
  for (let offset = 0; offset < roster.members.length; offset += 100) {
    const members = roster.members.slice(offset, offset + 100);
    const missing = members.filter((m) =>
      !state.attendees?.has(m.attendeeId));
    const loaded = missing.length === 0 ? [] : await tx.getAll(...missing.map(
      (m) => db.collection("eventAttendees").doc(m.attendeeId)));
    const attendees = new Map(state.attendees);
    missing.forEach((m, i) => attendees.set(m.attendeeId, loaded[i]));
    const rows = await tx.getAll(...members.flatMap((m) => [
      db.collection(guestCollections.guests)
        .doc(guestIdentity(context, m.attendeeId)),
      db.collection(MEMBERSHIPS)
        .doc(membershipIdentity({context, attendeeId: m.attendeeId})),
    ]));
    for (const [i, member] of members.entries()) {
      const attendeeId = member.attendeeId;
      let view: Entry["view"] = null;
      try {
        const source = membershipSourceState({scope: {context, attendeeId},
          eventSnap, attendeeSnap: attendees.get(attendeeId)!, planSnap,
          guestSnap: rows[i * 2], memberSnap: rows[i * 2 + 1], now});
        const reviewed = checkpointAccountability({
          scope: {context, groupId, attendeeId}, checkpoint,
          progress: state.progress, roster, member: source});
        view = accountabilityState({scope: {context, groupId, attendeeId,
          checkpoint}, member: source, checkpoint: reviewed});
      } catch (error) {
        if (!(error instanceof HttpsError) ||
            !["failed-precondition", "not-found"].includes(error.code)) {
          throw error;
        }
      }
      entries.push({attendeeId, view});
    }
  }
  return entries;
}

type ViewKeys = Pick<ViewDocument, "checkpointViewId" | "eventId" |
  "organizerId" | "groupId" | "progressRevision" | "checkpointId" |
  "rosterId" | "memberAttendeeIds" | "eventEndAtMillis">;

/** Records an invalid source on the view, keeping its previous projection. */
function keepInvalid(tx: FirebaseFirestore.Transaction,
  viewRef: FirebaseFirestore.DocumentReference | null,
  previous: ViewDocument | null, invalid: MovementSourceInvalidError,
  deps: MovementViewDeps, keys?: ViewKeys): CheckpointViewOutcome {
  const base = keys ?? previous;
  if (!base || !viewRef) {
    return {kind: "invalidSource", source: invalid.source,
      detail: invalid.detail, written: false};
  }
  const plan = planViewWrite(previous, {schemaVersion: 1 as const,
    checkpointViewId: base.checkpointViewId, eventId: base.eventId,
    organizerId: base.organizerId, groupId: base.groupId,
    progressRevision: base.progressRevision, checkpointId: base.checkpointId,
    rosterId: base.rosterId, memberAttendeeIds: base.memberAttendeeIds,
    eventEndAtMillis: base.eventEndAtMillis,
    sourceCoverage: "invalidSource" as const,
    incompleteSource: invalid.source,
    ownerValidUntilMillis: previous?.ownerValidUntilMillis ?? 0,
    view: previous?.view ?? null,
    accountability: previous?.accountability ?? []}, deps.now());
  if (!plan.unchanged) tx.set(viewRef, plan.document);
  return {kind: "invalidSource", source: invalid.source,
    detail: invalid.detail, written: !plan.unchanged};
}
