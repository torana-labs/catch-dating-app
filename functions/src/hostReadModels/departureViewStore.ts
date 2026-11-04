import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {operationContentHash} from "../operations/durableActions";
import type {HostEventDepartureViewDocument as ViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventAssistanceDepartureRosterDocument} from
  "../shared/generated/validators/eventAssistanceDepartureRosterDocument";
import {
  groupProgressSource,
  progressIdentity,
} from "../eventSuccess/operations/groupProgressSource";
import {
  GROUP_PROGRESS,
  parseGroupProgress,
  parseGroupProgressEvent,
} from "../eventSuccess/operations/groupProgressReader";
import {DEPARTURE_ROSTERS} from
  "../eventSuccess/operations/departureRosterSource";
import {
  CHECKPOINTS,
  checkpointIdentity,
  parseCheckpointReport,
  parseDepartureRoster,
  Roster,
  Scope,
} from "../eventSuccess/operations/checkpointRecords";
import {
  configuredGroupIds,
  defaultMovementViewDeps,
  departureViewsCollection,
  LiveContext,
  MovementSourceInvalidError,
  MovementViewDeps,
  operableEvent,
  parsing,
  planViewWrite,
} from "./movementViewSupport";

export type DepartureViewOutcome =
  | {kind: "removed"; existed: boolean}
  | {kind: "unchanged"; revision: number}
  | {kind: "complete"; revision: number}
  | {kind: "invalidSource"; source: string; detail: string;
    written: boolean};

/** The checkpoint a roster's destination names, or null for other stops. */
export function rosterCheckpointId(roster: Pick<Roster, "destination">):
  string | null {
  const target = roster.destination;
  return target?.kind === "itineraryStop" ? target.stopId :
    target?.kind === "groupCheckpoint" ? target.checkpointId : null;
}

/** The checkpoint scope of a roster (a sentinel when it names none). */
export function rosterScope(roster: Pick<Roster, "context" | "groupId" |
  "progressRevision" | "destination">): Scope {
  return {context: roster.context as LiveContext, groupId: roster.groupId,
    progressRevision: roster.progressRevision,
    // Parsing a fixed-place roster still validates its canonical scope.
    // This sentinel never becomes a checkpoint link or triggers a report read.
    checkpointId: rosterCheckpointId(roster) ?? "not-a-checkpoint"};
}

/**
 * Re-evaluates hostEventDepartureViews/{rosterId}, one row of the departure
 * history the retired listEventAssistanceDepartureRosters callable listed, in
 * one transaction: the roster, its event and event success plan (which give
 * the row's label and sourceState), the group's progress row and, for a
 * checkpoint destination, the checkpoint report. The view is deleted when the
 * roster, its event or its group is gone. A source that fails validation
 * records invalidSource and keeps the previous row; nothing it causes throws.
 */
export async function reconcileDepartureView(
  db: FirebaseFirestore.Firestore,
  rosterId: string,
  deps: MovementViewDeps = defaultMovementViewDeps
): Promise<DepartureViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<DepartureViewOutcome> => {
    const viewRef = db.collection(departureViewsCollection).doc(rosterId);
    const [rosterSnap, viewSnap] = await tx.getAll(
      db.collection(DEPARTURE_ROSTERS).doc(rosterId), viewRef);
    const previous = viewSnap.exists ? viewSnap.data() as ViewDocument : null;
    const remove = (): DepartureViewOutcome => {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    };
    const raw = rosterSnap.data();
    if (raw === undefined) return remove();
    if (!validateEventAssistanceDepartureRosterDocument(raw) ||
        raw.rosterId !== rosterId || raw.context.mode !== "live") {
      // Without a valid roster the view's own keys are unknown; keep the
      // previous row and record why.
      return keepInvalid(tx, viewRef, previous, new MovementSourceInvalidError(
        DEPARTURE_ROSTERS, "The roster fails its contract."), deps);
    }
    const context = raw.context as LiveContext;
    const progressId = progressIdentity(context, raw.groupId);
    const [eventSnap, planSnap, progressSnap] = await tx.getAll(
      db.collection("events").doc(context.eventId),
      db.collection("eventSuccessPlans").doc(context.eventId),
      db.collection(GROUP_PROGRESS).doc(progressId));
    const operable = operableEvent(context.eventId, eventSnap.data());
    if (!operable || operable.context.organizerId !== context.organizerId ||
        !configuredGroupIds(eventSnap.data()!).includes(raw.groupId)) {
      return remove();
    }
    const scope = rosterScope(raw);
    const checkpointId = rosterCheckpointId(raw);
    const reportSnap = checkpointId ?
      await tx.get(db.collection(CHECKPOINTS).doc(checkpointIdentity(scope))) :
      null;
    const nowStamp = deps.now();
    const now = nowStamp.toMillis();
    let view: NonNullable<ViewDocument["view"]>;
    try {
      const event = eventSnap.data();
      const eventValid = validateEventDocument(event) &&
        event.organizerId === context.organizerId;
      const {event: parsed, plan} = await parsing(eventValid ?
        "eventSuccessPlans" : "events", () =>
        parseGroupProgressEvent(context, eventSnap, planSnap));
      const source = await parsing("events", () => groupProgressSource({
        context, groupId: raw.groupId, event: parsed, plan,
        eventGeneration: eventSnap.createTime,
        planGeneration: planSnap.createTime, now: operable.endAtMillis - 1}));
      const progress = await parsing(GROUP_PROGRESS, () => parseGroupProgress(
        progressSnap.data(), progressId, raw.groupId, now));
      const roster = (await parsing(DEPARTURE_ROSTERS, () =>
        parseDepartureRoster(raw, scope, now)))!;
      assertRosterAgainstProgress(roster, progress);
      const report = await parsing(CHECKPOINTS, () => parseCheckpointReport(
        reportSnap?.data(), scope, roster, now));
      view = historyRow(roster, source, checkpointId, report);
    } catch (error) {
      if (!(error instanceof MovementSourceInvalidError)) throw error;
      return keepInvalid(tx, viewRef, previous, error, deps, {
        eventId: context.eventId, organizerId: context.organizerId,
        groupId: raw.groupId, progressId, rosterId,
        progressRevision: raw.progressRevision, confirmedAt: raw.confirmedAt});
    }
    const plan = planViewWrite(previous, {schemaVersion: 1 as const, rosterId,
      eventId: context.eventId, organizerId: context.organizerId,
      groupId: raw.groupId, progressId,
      progressRevision: raw.progressRevision, confirmedAt: raw.confirmedAt,
      sourceCoverage: "complete" as const, incompleteSource: null, view},
    nowStamp);
    if (plan.unchanged) return {kind: "unchanged", revision: plan.revision};
    tx.set(viewRef, plan.document);
    return {kind: "complete", revision: plan.revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Live departure view read an invalid source.", {
      rosterId, source: outcome.source, detail: outcome.detail});
  }
  return outcome;
}

/** A roster is saved with its progress revision; never beyond it. */
function assertRosterAgainstProgress(roster: Roster,
  progress: ReturnType<typeof parseGroupProgress>) {
  if (roster.destination?.kind === "groupCheckpoint" &&
      roster.destination.groupId !== roster.groupId) {
    throw new MovementSourceInvalidError(DEPARTURE_ROSTERS,
      "The roster's destination belongs to another group.");
  }
  if (roster.progressRevision > (progress?.revision ?? 0) ||
      (roster.progressRevision === progress?.revision &&
        (progress.departureRosterId !== roster.rosterId ||
          progress.sourceHash !== roster.sourceHash ||
          progress.confirmedBy !== roster.confirmedBy ||
          progress.confirmedAt !== roster.confirmedAt ||
          (roster.destination && operationContentHash(roster.destination) !==
            operationContentHash(progress.destination))))) {
    throw new MovementSourceInvalidError(GROUP_PROGRESS,
      "The progress row disagrees with its departure roster.");
  }
}

/** One row as the departure history showed it. */
function historyRow(roster: Roster,
  source: ReturnType<typeof groupProgressSource>, checkpointId: string | null,
  report: ReturnType<typeof parseCheckpointReport>):
  NonNullable<ViewDocument["view"]> {
  const target = roster.destination ?? null;
  const destination = source.destinations.find((d) =>
    operationContentHash(d.target) === operationContentHash(target));
  const sourceState = roster.sourceHash !== source.sourceHash ?
    "setupChanged" as const : !target ? "destinationNotRecorded" as const :
      destination ? "current" as const : "setupChanged" as const;
  const checkpoint = checkpointId ? {
    checkpointId, reportStatus: !report ? "unreported" as const :
      report.accountedFor.length === roster.members.length ?
        "complete" as const : "partial" as const,
    reportRevision: report?.revision ?? 0,
    accountedForCount: report?.accountedFor.length ?? 0,
    originalRequestedDueAt: roster.checkpointRequest?.dueAt ?? null,
  } : null;
  return {progressRevision: roster.progressRevision,
    confirmedAt: roster.confirmedAt, destination: target,
    label: sourceState === "current" ? destination!.label : null,
    sourceState, rosterSize: roster.members.length, checkpoint};
}

type ViewKeys = Pick<ViewDocument, "eventId" | "organizerId" | "groupId" |
  "progressId" | "rosterId" | "progressRevision" | "confirmedAt">;

/** Records an invalid source on the view, keeping its previous row. */
function keepInvalid(tx: FirebaseFirestore.Transaction,
  viewRef: FirebaseFirestore.DocumentReference, previous: ViewDocument | null,
  invalid: MovementSourceInvalidError, deps: MovementViewDeps,
  keys?: ViewKeys): DepartureViewOutcome {
  const base = keys ?? previous;
  if (!base) {
    return {kind: "invalidSource", source: invalid.source,
      detail: invalid.detail, written: false};
  }
  const plan = planViewWrite(previous, {schemaVersion: 1 as const,
    rosterId: base.rosterId, eventId: base.eventId,
    organizerId: base.organizerId, groupId: base.groupId,
    progressId: base.progressId, progressRevision: base.progressRevision,
    confirmedAt: base.confirmedAt, sourceCoverage: "invalidSource" as const,
    incompleteSource: invalid.source, view: previous?.view ?? null},
  deps.now());
  if (!plan.unchanged) tx.set(viewRef, plan.document);
  return {kind: "invalidSource", source: invalid.source,
    detail: invalid.detail, written: !plan.unchanged};
}

export const eventRosterPageSize = 100;

/** Every departure roster of an event, in pages of 100. */
export async function* rosterIdsForEvent(db: FirebaseFirestore.Firestore,
  eventId: string): AsyncGenerator<string> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection(DEPARTURE_ROSTERS)
      .where("context.eventId", "==", eventId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(eventRosterPageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) yield doc.id;
    cursor = page.size === eventRosterPageSize ? page.docs.at(-1) :
      undefined;
  } while (cursor);
}
