/* firestore-index: organizerPrograms (
  status:ASCENDING,
  anonymizeAt:ASCENDING
) */
import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {FieldPath} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  assertRevision,
  requireProgramAccess,
  nextRevision,
} from "../shared/programAuthority";
import {loadFlightProviderConfig} from "../transport/flightProviderConfig";
import {deleteFlightSubscription} from "../transport/flightSubscriptions";
import type {FetchImpl} from "../transport/aeroDataBox";
import type {
  OrganizerProgramDocument,
  ProgramRetentionRunDocument,
  ProgramStaffInviteDocument,
  ProgramTravelLegDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ArchiveProgramCallablePayload} from
  "../shared/generated/archiveProgramCallablePayload";
import type {ArchiveProgramCallableResponse} from
  "../shared/generated/archiveProgramCallableResponse";
import type {UnarchiveProgramCallablePayload} from
  "../shared/generated/unarchiveProgramCallablePayload";
import type {UnarchiveProgramCallableResponse} from
  "../shared/generated/unarchiveProgramCallableResponse";
import {
  validateArchiveProgramCallablePayload,
} from "../shared/generated/validators/archiveProgramInput";
import {
  validateUnarchiveProgramCallablePayload,
} from "../shared/generated/validators/unarchiveProgramInput";

/** Approved policy: archive grants a 14-day grace window before the
 *  identity scrub runs; unarchive is only possible inside it. */
export const archiveGraceMillis = 14 * 24 * 60 * 60 * 1000;
const retentionRunLeaseMillis = 10 * 60_000;
const retentionPageLimit = 300;
const sweepProgramLimit = 25;
const sweepDeadlineMillis = 8 * 60_000;

export interface RetentionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  /** Resolves the flight provider key; null means alerts are unconfigured
   *  (no live subscriptions can exist), so legs scrub without a delete. */
  loadFlightApiKey: () => Promise<string | null>;
  deleteFlightSubscription: typeof deleteFlightSubscription;
  fetchImpl?: FetchImpl;
  /** Test hook: shrink page size to exercise chunked resume. */
  pageLimit?: number;
}

const defaultRetentionDeps: RetentionDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  loadFlightApiKey: async () =>
    (await loadFlightProviderConfig())?.apiKey ?? null,
  deleteFlightSubscription,
};

export async function archiveProgramHandler(
  request: CallableRequest<unknown>,
  deps: RetentionDeps = defaultRetentionDeps
): Promise<ArchiveProgramCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ArchiveProgramCallablePayload>(
    request, validateArchiveProgramCallablePayload, normalizeRetentionPayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "archiveProgram", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const ref = db.collection("organizerPrograms").doc(data.programId);
  let committed: {revision: number; anonymizeAtMillis: number;
    alreadyApplied: boolean} | null = null;
  await db.runTransaction(async (tx) => {
    const {program, role} = await requireProgramAccess({
      db, programId: data.programId, actorUid, transaction: tx, now: deps.now(),
    });
    if (role !== "manager") {
      throw new HttpsError(
        "permission-denied",
        "Only the program creator can archive this program."
      );
    }
    assertRevision(program.revision, data.expectedRevision);
    if (program.status === "archived") {
      // Replay of the same archive intent: return the standing deadline.
      committed = {
        revision: program.revision,
        anonymizeAtMillis: program.anonymizeAt?.toMillis() ?? 0,
        alreadyApplied: true,
      };
      return;
    }
    const now = deps.now();
    const anonymizeAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + archiveGraceMillis);
    const revision = nextRevision(program.revision, now);
    tx.update(ref, {
      status: "archived",
      archivedAt: now,
      archivedFromStatus: program.status,
      anonymizeAt,
      anonymizedAt: null,
      updatedAt: now,
      revision,
    });
    committed = {revision, anonymizeAtMillis: anonymizeAt.toMillis(),
      alreadyApplied: false};
  });
  return {entityId: data.programId, ...committed!};
}

export async function unarchiveProgramHandler(
  request: CallableRequest<unknown>,
  deps: RetentionDeps = defaultRetentionDeps
): Promise<UnarchiveProgramCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UnarchiveProgramCallablePayload>(
    request, validateUnarchiveProgramCallablePayload,
    normalizeRetentionPayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "unarchiveProgram", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const ref = db.collection("organizerPrograms").doc(data.programId);
  const runRef = db.collection("programRetentionRuns").doc(data.programId);
  let committed: {revision: number;
    restoredStatus: OrganizerProgramDocument["status"]} | null = null;
  await db.runTransaction(async (tx) => {
    const [{program, role}, runSnap] = await Promise.all([
      requireProgramAccess({db, programId: data.programId, actorUid,
        transaction: tx, now: deps.now()}),
      tx.get(runRef),
    ]);
    if (role !== "manager") {
      throw new HttpsError(
        "permission-denied",
        "Only the program creator can restore this program."
      );
    }
    assertRevision(program.revision, data.expectedRevision);
    if (program.status !== "archived") {
      throw new HttpsError(
        "failed-precondition", "This program is not archived.");
    }
    if (program.anonymizedAt) {
      throw new HttpsError(
        "failed-precondition",
        "Anonymized programs cannot be restored.");
    }
    const now = deps.now();
    const anonymizeAtMillis = program.anonymizeAt?.toMillis() ?? null;
    if (anonymizeAtMillis !== null && anonymizeAtMillis <= now.toMillis()) {
      throw new HttpsError(
        "failed-precondition",
        "The archive grace window has passed; this program is queued for " +
        "anonymization.");
    }
    const run = runSnap.data() as ProgramRetentionRunDocument | undefined;
    if (run && run.status === "running" &&
        (run.leaseUntil ? staffTimestampMillis(run.leaseUntil) : 0) >
          now.toMillis()) {
      throw new HttpsError(
        "failed-precondition",
        "Anonymization is in progress; retry once it releases.");
    }
    // Legacy archived docs can lack the marker; a program worth archiving is
    // over, so completed is the safe restore default.
    const restoredStatus = program.archivedFromStatus ?? "completed";
    const revision = nextRevision(program.revision, now);
    tx.update(ref, {
      status: restoredStatus,
      archivedAt: null,
      archivedFromStatus: null,
      anonymizeAt: null,
      updatedAt: now,
      revision,
    });
    committed = {revision, restoredStatus};
  });
  return {
    entityId: data.programId,
    revision: committed!.revision,
    alreadyApplied: false,
    restoredStatus: committed!.restoredStatus,
  };
}

type RetentionRunPhase = ProgramRetentionRunDocument["phases"][number];

/** The identity-bearing program collections, in a stable scrub order.
 *  Beyond the approved table this also covers the same-class fields the
 *  table under-enumerated: person/family labels and free-text notes on
 *  operational collections (hotel reception contacts, trip notes, group
 *  and room-block labels) — the policy's "counts, not a guest list" rule. */
const retentionCollections = [
  "programGuests",
  "programGuestGroups",
  "programHouseholds",
  "programFunctionGuests",
  "programStays",
  "programDoorJournal",
  "programTravelLegs",
  "programTravelParties",
  "programStaffInvites",
  "programStaffGrants",
  "programHotels",
  "programRoomBlocks",
  "programFunctions",
  "transportTrips",
  "workspaceFieldAssertions",
  "workspaceFieldDecisions",
  "programLodgingProposals",
  "programLodgingWorkflows",
  "programLodgingReceipts",
  "programLodgingSourceVersions",
  "programLodgingConfigs",
  "workspaceMembershipAssertions",
  "workspaceMembershipDecisions",
] as const;

function shortId(docId: string): string {
  return docId.replace(/[^A-Za-z0-9]/g, "").slice(0, 6) || "anon";
}

/** Identity scrub per collection. Returns the update map, or null to delete
 *  the document outright (pending/expired staff invites). Docs already
 *  carrying `anonymizedAt` are skipped by the caller. */
function retentionScrub(
  collection: string,
  docId: string,
  data: FirebaseFirestore.DocumentData,
  now: FirebaseFirestore.Timestamp,
): Record<string, unknown> | null {
  const marker = {anonymizedAt: now, updatedAt: now,
    revision: nextRevision(
      typeof data.revision === "number" ? data.revision : 0, now)};
  switch (collection) {
  case "workspaceFieldAssertions":
  case "workspaceFieldDecisions":
  case "programLodgingProposals":
  case "programLodgingWorkflows":
  case "programLodgingSourceVersions":
  case "programLodgingConfigs":
  case "programLodgingReceipts":
  case "workspaceMembershipAssertions":
  case "workspaceMembershipDecisions":
    return null; // Historical field values are PII, not operational counts.
  case "programGuests":
    return {
      ...marker,
      displayName: `Guest ${shortId(docId)}`,
      phoneE164: null,
      email: null,
      externalReference: null,
      fieldSelections: {}, fieldConflicts: {},
      membershipSelections: [], membershipSuggestions: [],
    };
  case "programHouseholds":
    return {
      ...marker,
      label: `Household ${shortId(docId)}`,
      primaryContactName: null,
      primaryPhoneE164: null,
      primaryEmail: null,
      fieldSelections: {}, fieldConflicts: {},
    };
  case "programGuestGroups":
    return {...marker, label: `Group ${shortId(docId)}`};
  case "programFunctionGuests":
    return {...marker, responseNote: null};
  case "programStays":
    return {...marker, notes: null, roomLabel: null};
  case "programDoorJournal":
    return {...marker, note: null};
  case "programTravelLegs":
    return {
      ...marker,
      manualCurbNote: null,
      flightAlertSubscriptionId: null,
      flightAlertFlightNumber: null,
      flightAlertLease: null,
      flightNextRefreshAt: null,
    };
  case "programStaffInvites": {
    const invite = data as ProgramStaffInviteDocument;
    // Unclaimed invites (pending covers expired-by-time too — expiry is a
    // timestamp, not a status) carry a phone number for no live purpose.
    if (invite.status === "pending") return null;
    return {...marker, displayName: null, phoneE164: null};
  }
  case "programStaffGrants":
    return {...marker, displayName: null, phoneLastFour: null};
  case "programTravelParties":
    return {...marker, label: `Party ${shortId(docId)}`};
  case "programHotels":
    return {...marker, receptionContact: null, notes: null};
  case "programRoomBlocks":
    return {...marker, label: `Block ${shortId(docId)}`, notes: null};
  case "programFunctions":
    return {...marker, venueNotes: null};
  case "transportTrips":
    return {...marker, notes: null};
  default:
    throw new HttpsError("internal", "Unknown retention collection.");
  }
}

export type AnonymizeOutcome =
  "completed" | "running" | "skipped" | "failed";

/** Runs one program's identity scrub. Phases are journaled on the
 *  programRetentionRuns doc so a crashed or budget-capped invocation resumes
 *  at the last committed cursor; per-doc `anonymizedAt` markers keep repeats
 *  idempotent. Returns "running" when work remains for a later pass. */
export async function anonymizeProgram(
  db: FirebaseFirestore.Firestore,
  programId: string,
  deps: RetentionDeps,
  deadlineMillis: number,
): Promise<AnonymizeOutcome> {
  const programRef = db.collection("organizerPrograms").doc(programId);
  const runRef = db.collection("programRetentionRuns").doc(programId);
  const leaseToken = randomUUID();
  const claimed = await db.runTransaction(async (tx) => {
    const [programSnap, runSnap] = await Promise.all([
      tx.get(programRef), tx.get(runRef)]);
    if (!programSnap.exists) return null;
    const program = programSnap.data() as OrganizerProgramDocument;
    if (program.status !== "archived" || program.anonymizedAt) {
      return null;
    }
    const now = deps.now();
    if (program.anonymizeAt &&
        program.anonymizeAt.toMillis() > now.toMillis()) {
      return null; // Archived but still inside the grace window.
    }
    const run = runSnap.data() as ProgramRetentionRunDocument | undefined;
    const leaseHeldByOther = run && run.status === "running" &&
      (run.leaseUntil ? staffTimestampMillis(run.leaseUntil) : 0) >
        now.toMillis() && run.leaseToken !== leaseToken;
    if (leaseHeldByOther) return null;
    const phases: RetentionRunPhase[] = retentionCollections.map(
      (collection) => ({
        ...(run?.phases?.find((phase) => phase.collection === collection) ??
          {collection, processed: 0, cursor: null}),
        collection,
      }));
    const document: ProgramRetentionRunDocument = {
      programId,
      organizerId: program.organizerId,
      status: "running",
      phases,
      startedAt: run?.startedAt ?? now,
      updatedAt: now,
      completedAt: run?.completedAt ?? null,
      leaseUntil: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + retentionRunLeaseMillis),
      leaseToken,
      error: null,
      revision: nextRevision(run?.revision ?? 0, now),
    };
    tx.set(runRef, document);
    return {program, document};
  });
  if (!claimed) return "skipped";

  const runDoc = {...claimed.document,
    phases: claimed.document.phases.map((phase) => ({...phase}))};
  const flightApiKey = await deps.loadFlightApiKey();
  let warnedProvider = false;

  const persistRun = async (extra?: Record<string, unknown>) => {
    await runRef.set({...runDoc, updatedAt: deps.now(), ...extra},
      {merge: false});
  };

  try {
    for (const collection of retentionCollections) {
      const entry = runDoc.phases.find(
        (phase) => phase.collection === collection)!;
      if (entry.completedAtMillis) continue;
      const pageLimit = deps.pageLimit ?? retentionPageLimit;
      let cursor: string | null = entry.cursor;
      for (;;) {
        let query: FirebaseFirestore.Query = db.collection(collection)
          .where("programId", "==", programId)
          .orderBy(FieldPath.documentId())
          .limit(pageLimit);
        if (cursor) query = query.startAfter(cursor);
        const snap = await query.get();
        if (snap.empty) break;
        const batch = db.batch();
        let pending = 0;
        for (const doc of snap.docs) {
          const data = doc.data();
          if (["workspaceFieldAssertions", "workspaceFieldDecisions",
            "workspaceMembershipAssertions", "workspaceMembershipDecisions"]
            .includes(collection) &&
              (data.workspaceRef?.kind !== "program" ||
                data.workspaceRef.id !== programId ||
                data.organizerId !== claimed.program.organizerId)) {
            throw new HttpsError("failed-precondition",
              "Field assertion retention scope needs reconciliation.");
          }
          if (["programLodgingProposals", "programLodgingWorkflows",
            "programLodgingReceipts", "programLodgingSourceVersions",
            "programLodgingConfigs"]
            .includes(collection) &&
              (data.organizerId !== claimed.program.organizerId ||
                (collection === "programLodgingProposals" &&
                  (data.proposal?.scope?.programId !== programId ||
                    data.proposal.scope.organizerId !==
                      claimed.program.organizerId)))) {
            throw new HttpsError("failed-precondition",
              "Lodging retention scope needs reconciliation.");
          }
          if (data.anonymizedAt) continue; // Idempotent re-entry.
          if (collection === "programTravelLegs") {
            const leg = data as ProgramTravelLegDocument;
            if (leg.flightAlertSubscriptionId) {
              if (flightApiKey) {
                // Delete before scrubbing the id: a transport error keeps the
                // leg unmarked so the next pass retries against evidence.
                await deps.deleteFlightSubscription({
                  subscriptionId: leg.flightAlertSubscriptionId,
                  apiKey: flightApiKey,
                  fetchImpl: deps.fetchImpl,
                });
              } else if (!warnedProvider) {
                logger.warn("Flight provider unconfigured; scrubbing " +
                  "subscription ids without a remote delete", {programId});
                warnedProvider = true;
              }
            }
          }
          const fields = retentionScrub(
            collection, doc.id, data, deps.now());
          if (fields === null) {
            batch.delete(doc.ref);
          } else {
            batch.update(doc.ref, fields);
          }
          pending += 1;
        }
        const lastId = snap.docs[snap.docs.length - 1].id;
        cursor = lastId;
        entry.cursor = lastId;
        entry.processed += pending;
        batch.set(runRef, {...runDoc, updatedAt: deps.now()},
          {merge: false});
        await batch.commit();
        if (snap.size < pageLimit) break;
        if (deps.now().toMillis() >= deadlineMillis) {
          runDoc.leaseUntil = null;
          runDoc.leaseToken = null;
          await persistRun();
          return "running";
        }
      }
      entry.completedAtMillis = deps.now().toMillis();
      entry.cursor = null;
      await persistRun();
    }
    // Final transaction: mark the program scrubbed and close the journal.
    await db.runTransaction(async (tx) => {
      const programSnap = await tx.get(programRef);
      const program = programSnap.data() as
        OrganizerProgramDocument | undefined;
      if (!program || program.status !== "archived" || program.anonymizedAt) {
        return;
      }
      const now = deps.now();
      tx.update(programRef, {anonymizedAt: now, updatedAt: now});
      runDoc.status = "completed";
      tx.set(runRef, {...runDoc, status: "completed",
        updatedAt: now, completedAt: now, leaseUntil: null,
        leaseToken: null, revision: nextRevision(runDoc.revision, now)},
      {merge: false});
    });
    return "completed";
  } catch (error) {
    runDoc.status = "failed";
    runDoc.error = error instanceof Error ? error.message : String(error);
    runDoc.leaseUntil = null;
    runDoc.leaseToken = null;
    try {
      await persistRun();
    } catch (persistError) {
      logger.warn("Retention run failed to journal its failure",
        {programId, persistError});
    }
    logger.warn("Program anonymization pass failed",
      {programId, error: runDoc.error});
    return "failed";
  }
}

/** Daily sweep: anonymize archived programs whose grace window closed.
 *  Oldest deadlines first; each run re-leases idempotently so a timed-out
 *  day resumes the same cursor the next day. */
export async function anonymizeDuePrograms(
  db: FirebaseFirestore.Firestore,
  deps: RetentionDeps,
  options?: {now?: FirebaseFirestore.Timestamp; limit?: number}
): Promise<{scanned: number; completed: number; running: number;
  failed: number; skipped: number}> {
  const now = options?.now ?? deps.now();
  const deadline = now.toMillis() + sweepDeadlineMillis;
  const snap = await db.collection("organizerPrograms")
    .where("status", "==", "archived")
    .where("anonymizeAt", "<=", now)
    .orderBy("anonymizeAt")
    .limit(options?.limit ?? sweepProgramLimit)
    .get();
  const summary = {scanned: snap.size, completed: 0, running: 0,
    failed: 0, skipped: 0};
  for (const doc of snap.docs) {
    if (deps.now().toMillis() >= deadline) {
      summary.skipped += snap.size -
        (summary.completed + summary.running + summary.failed +
          summary.skipped);
      break;
    }
    const outcome = await anonymizeProgram(db, doc.id, deps, deadline);
    if (outcome === "completed") summary.completed += 1;
    else if (outcome === "running") summary.running += 1;
    else if (outcome === "failed") summary.failed += 1;
    else summary.skipped += 1;
  }
  return summary;
}

export const archiveProgram = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => archiveProgramHandler(request)
);
export const unarchiveProgram = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => unarchiveProgramHandler(request)
);
export const anonymizeDueProgramsSweep = onSchedule(
  {
    schedule: "every day 03:15",
    timeoutSeconds: 540,
    maxInstances: 1,
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const summary = await anonymizeDuePrograms(
      admin.firestore(), defaultRetentionDeps);
    if (summary.scanned > 0) {
      logger.info("Program retention sweep completed", summary);
    }
  }
);

function normalizeRetentionPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = {...(value as Record<string, unknown>)};
  if (typeof input.programId === "string") {
    input.programId = input.programId.trim();
  }
  return input;
}
