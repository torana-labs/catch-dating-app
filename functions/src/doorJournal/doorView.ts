/* firestore-index: programDoorJournal (
  functionId:ASCENDING,
  occurredAtMillis:DESCENDING
) */
import * as admin from "firebase-admin";
import {createHash} from "node:crypto";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  dutyAssignments,
  nextRevision,
  programProjectionExpiresAt,
  programStaffGrantId,
  requireProgramAccess,
  requireProgramMutable,
} from "../shared/programAuthority";
import type {
  ProgramDoorJournalDocument,
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
  ProgramHouseholdDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ProgramFunctionScopeCallablePayload} from
  "../shared/generated/programFunctionScopeCallablePayload";
import type {CreateProgramWalkInCallablePayload} from
  "../shared/generated/createProgramWalkInCallablePayload";
import type {ProgramFunctionDoorViewCallableResponse} from
  "../shared/generated/programFunctionDoorViewCallableResponse";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateProgramFunctionScopeCallablePayload,
} from
  "../shared/generated/validators/programFunctionScopeInput";
import {
  validateCreateProgramWalkInCallablePayload,
} from
  "../shared/generated/validators/createProgramWalkInInput";
import {journalIdFor} from "./journalPlan";
import {requireDoorAuthority} from "./recordProgramDoorJournal";

const JOURNAL_TAIL_LIMIT = 60;
const ROSTER_LIMIT = 500;
const WALK_IN_ID_PREFIX = "walkin_";

export interface DoorViewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: DoorViewDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const joinKey = (functionId: string, guestId: string) =>
  `${functionId}_${guestId}`;

/** Deterministic guest id for a walk-in; same inputs replay, never merge. */
const walkInGuestId = (
  programId: string,
  functionId: string,
  clientOperationId: string,
) =>
  WALK_IN_ID_PREFIX +
  createHash("sha256")
    .update(`${programId}|${functionId}|${clientOperationId}`)
    .digest("hex")
    .slice(0, 48);

async function loadFunction(
  db: FirebaseFirestore.Firestore,
  programId: string,
  functionId: string,
): Promise<ProgramFunctionDocument> {
  const snap = await db.collection("programFunctions").doc(functionId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Function not found.");
  }
  const fn = snap.data() as ProgramFunctionDocument;
  if (fn.programId !== programId) {
    throw new HttpsError(
      "not-found", "Function not found in this program.");
  }
  return fn;
}

type RosterRow = ProgramFunctionDoorViewCallableResponse["guests"][number];

/**
 * Door roster for one function. `allGuests` functions treat every program
 * guest as invited even without a join row; `selectedGuests` functions list
 * exactly their join rows — invited guests plus door-created walk-ins
 * (invited=false). Guest rows carry display names only, never contacts.
 */
export async function getProgramFunctionDoorViewHandler(
  request: CallableRequest<unknown>,
  deps: DoorViewDeps = defaultDeps,
): Promise<ProgramFunctionDoorViewCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramFunctionScopeCallablePayload>(
    request, validateProgramFunctionScopeCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramFunctionDoorView", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const fn = await loadFunction(db, data.programId, data.functionId);
  requireDoorAuthority(access, data.functionId);
  const now = deps.now();

  const [rowsSnap, journalSnap] = await Promise.all([
    db.collection("programFunctionGuests")
      .where("functionId", "==", data.functionId)
      .limit(ROSTER_LIMIT + 1)
      .get(),
    db.collection("programDoorJournal")
      .where("functionId", "==", data.functionId)
      .orderBy("occurredAtMillis", "desc")
      .limit(JOURNAL_TAIL_LIMIT)
      .get(),
  ]);

  const rows = new Map<string, ProgramFunctionGuestDocument>();
  for (const snap of rowsSnap.docs.slice(0, ROSTER_LIMIT)) {
    const row = snap.data() as ProgramFunctionGuestDocument;
    if (row.programId === data.programId) rows.set(row.guestId, row);
  }

  // allGuests functions invite the whole program guest list; join rows are
  // optional state on top of that list.
  const allGuests = (fn.invitationMode ?? "allGuests") === "allGuests";
  const guestIdSet = new Set<string>(rows.keys());
  if (allGuests) {
    const guestsSnap = await db.collection("programGuests")
      .where("programId", "==", data.programId)
      .limit(ROSTER_LIMIT + 1)
      .get();
    for (const snap of guestsSnap.docs.slice(0, ROSTER_LIMIT)) {
      guestIdSet.add(snap.id);
    }
  }

  const journalDocs = journalSnap.docs
    .map((snap) => ({journalId: snap.id,
      entry: snap.data() as ProgramDoorJournalDocument}))
    .filter(({entry}) => entry.programId === data.programId)
    .slice(0, JOURNAL_TAIL_LIMIT);
  for (const {entry} of journalDocs) guestIdSet.add(entry.guestId);

  const guestSnaps = await Promise.all([...guestIdSet].map((guestId) =>
    db.collection("programGuests").doc(guestId).get()));
  const guestsById = new Map<string, ProgramGuestDocument>();
  for (const snap of guestSnaps) {
    if (!snap.exists) continue;
    const guest = snap.data() as ProgramGuestDocument;
    if (guest.programId === data.programId) guestsById.set(snap.id, guest);
  }
  const householdIdsToLoad = [...new Set(
    [...guestsById.values()]
      .map((guest) => guest.householdId)
      .filter((id): id is string => typeof id === "string"),
  )];
  const householdSnaps = await Promise.all(householdIdsToLoad.map((id) =>
    db.collection("programHouseholds").doc(id).get()));
  const householdLabels = new Map<string, string>();
  for (const snap of householdSnaps) {
    if (!snap.exists) continue;
    const household = snap.data() as ProgramHouseholdDocument;
    if (household.programId === data.programId) {
      householdLabels.set(snap.id, household.label);
    }
  }

  // Resolve staff display names for the activity rail through grants;
  // uids never cross the wire.
  const actorUids = [
    ...new Set(journalDocs.map(({entry}) => entry.actorUid)),
  ];
  const grantSnaps = await Promise.all(actorUids.map((uid) =>
    db.collection("programStaffGrants")
      .doc(programStaffGrantId(data.programId, uid)).get()));
  const actorLabels = new Map<string, string>();
  for (const snap of grantSnaps) {
    if (!snap.exists) continue;
    const grant = snap.data() as
      {displayName?: string; programId?: string} | undefined;
    if (grant && grant.programId === data.programId &&
        typeof grant.displayName === "string" && grant.displayName !== "") {
      actorLabels.set(snap.id.split("__").pop()!, grant.displayName);
    }
  }

  const roster: RosterRow[] = [];
  let expectedHeads = 0;
  let checkedInHeads = 0;
  let checkedInParties = 0;
  let noShowCount = 0;
  let walkInCount = 0;
  for (const guestId of guestIdSet) {
    const guest = guestsById.get(guestId);
    if (!guest) continue;
    const row = rows.get(guestId);
    const invited = allGuests ? row?.invited ?? true : row?.invited ?? false;
    const attendanceStatus = row?.attendanceStatus ?? "expected";
    const rsvpStatus = row?.rsvpStatus ?? "pending";
    const partySize = row?.partySize ?? null;
    if (!invited && attendanceStatus === "expected") continue;
    const heads = partySize ?? 1;
    if (rsvpStatus === "attending") expectedHeads += heads;
    if (attendanceStatus === "checkedIn") {
      checkedInHeads += heads;
      checkedInParties++;
    }
    if (attendanceStatus === "noShow") noShowCount++;
    if (!invited) walkInCount++;
    roster.push({
      guestId,
      displayName: guest.displayName,
      invited,
      rsvpStatus,
      attendanceStatus,
      partySize,
      householdLabel: guest.householdId ?
        householdLabels.get(guest.householdId) ?? null : null,
      responseNote: row?.responseNote ?? null,
    });
  }
  roster.sort((a, b) => a.displayName.localeCompare(b.displayName) ||
    a.guestId.localeCompare(b.guestId));

  // Projection retention deadline: earliest contributing door-duty expiry.
  const covering = [
    ...dutyAssignments(access, "functionCheckIn"),
    ...dutyAssignments(access, "functionLead"),
  ].filter((assignment) => (assignment.functionIds ?? []).length === 0 ||
    assignment.functionIds!.includes(data.functionId));

  return {
    programId: data.programId,
    functionId: data.functionId,
    serverTimeMillis: now.toMillis(),
    accessExpiresAtMillis: programProjectionExpiresAt(access, covering),
    function: {
      name: fn.name,
      invitationMode: allGuests ? "allGuests" : "selectedGuests",
      checkInEnabled: fn.checkInEnabled ?? true,
      status: fn.status,
      startsAtMillis: fn.startsAt.toMillis(),
      endsAtMillis: fn.endsAt.toMillis(),
      venueName: fn.venueName ?? null,
      venueNotes: fn.venueNotes ?? null,
      dressCode: fn.dressCode ?? null,
      instructions: fn.instructions ?? null,
      expectedCount: fn.expectedCount ?? 0,
      checkedInCount: fn.checkedInCount ?? 0,
    },
    counts: {
      listedCount: roster.length,
      expectedHeads,
      checkedInHeads,
      checkedInParties,
      noShowCount,
      walkInCount,
    },
    guests: roster,
    journal: journalDocs.map(({journalId, entry}) => ({
      journalId,
      guestId: entry.guestId,
      displayName: guestsById.get(entry.guestId)?.displayName ?? null,
      action: entry.action,
      occurredAtMillis: entry.occurredAtMillis,
      partySize: entry.partySize,
      note: entry.note,
      actorLabel: actorLabels.get(entry.actorUid) ?? null,
    })),
  };
}

/**
 * Create a walk-in guest and check them in through the durable journal in
 * one transaction. The guest id derives from the clientOperationId, so a
 * retried call replays with alreadyApplied instead of double-creating.
 */
export async function createProgramWalkInHandler(
  request: CallableRequest<unknown>,
  deps: DoorViewDeps = defaultDeps,
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<CreateProgramWalkInCallablePayload>(
    request, validateCreateProgramWalkInCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createProgramWalkIn", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const fn = await loadFunction(db, data.programId, data.functionId);
  requireProgramMutable(access.program);
  requireDoorAuthority(access, data.functionId);
  if (fn.status === "cancelled") {
    throw new HttpsError("failed-precondition",
      "Cancelled functions cannot take walk-ins.");
  }
  if (fn.checkInEnabled === false) {
    throw new HttpsError("failed-precondition",
      "Check-in is disabled for this function.");
  }
  const now = deps.now();
  const guestId = walkInGuestId(
    data.programId, data.functionId, data.clientOperationId);
  const guestRef = db.collection("programGuests").doc(guestId);

  return db.runTransaction(async (tx) => {
    const [guestSnap, checkedInSnap] = await Promise.all([
      tx.get(guestRef),
      tx.get(db.collection("programFunctionGuests")
        .where("functionId", "==", data.functionId)
        .where("attendanceStatus", "==", "checkedIn")),
    ]);
    if (guestSnap.exists) {
      const existing = guestSnap.data() as ProgramGuestDocument;
      if (existing.programId !== data.programId) {
        throw new HttpsError("not-found", "Guest not found in this program.");
      }
      return {
        entityId: guestId,
        revision: existing.revision,
        alreadyApplied: true,
      };
    }

    const journalId = journalIdFor({
      scope: {kind: "program", id: data.programId},
      functionId: data.functionId,
      guestId,
      action: "walkInCreate",
      occurredAtMillis: data.occurredAtMillis,
      actorUid,
    });
    const journalRef = db.collection("programDoorJournal").doc(journalId);
    const journalSnap = await tx.get(journalRef);
    if (journalSnap.exists) {
      return {
        entityId: guestId,
        revision: 0,
        alreadyApplied: true,
      };
    }

    const guestDoc: ProgramGuestDocument = {
      programId: data.programId,
      organizerId: fn.organizerId,
      displayName: data.displayName,
      householdId: null,
      contactId: null,
      phoneE164: null,
      email: null,
      externalReference: null,
      groupIds: [],
      invitationStatus: "notInvited",
      rsvpStatus: "pending",
      source: "manual",
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    tx.set(guestRef, guestDoc);

    const partySize = data.partySize ?? null;
    tx.create(db.collection("programFunctionGuests")
      .doc(joinKey(data.functionId, guestId)), {
      programId: data.programId,
      organizerId: fn.organizerId,
      functionId: data.functionId,
      guestId,
      invited: false,
      rsvpStatus: "pending",
      attendanceStatus: "checkedIn",
      partySize,
      respondedAt: null,
      responseNote: null,
      responseSource: "staff",
      recordedByUid: actorUid,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    });

    tx.create(journalRef, {
      programId: data.programId,
      organizerId: fn.organizerId,
      functionId: data.functionId,
      guestId,
      actorUid,
      action: "walkInCreate",
      occurredAtMillis: data.occurredAtMillis,
      deviceId: data.deviceId ?? null,
      partySize,
      note: data.note ?? null,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    } satisfies Partial<ProgramDoorJournalDocument>);

    let checkedInHeads = partySize ?? 1;
    for (const snap of checkedInSnap.docs) {
      const row = snap.data() as ProgramFunctionGuestDocument;
      if (row.programId !== data.programId) continue;
      checkedInHeads += row.partySize ?? 1;
    }
    tx.update(db.collection("programFunctions").doc(data.functionId), {
      checkedInCount: checkedInHeads,
      updatedAt: now,
      revision: nextRevision(fn.revision, now),
    });

    return {entityId: guestId, revision: 1, alreadyApplied: false};
  });
}

export const getProgramFunctionDoorView = onCall(
  appCheckCallableOptionsWithLimits(
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => getProgramFunctionDoorViewHandler(request)
);

export const createProgramWalkIn = onCall(
  appCheckCallableOptionsWithLimits(
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => createProgramWalkInHandler(request)
);
