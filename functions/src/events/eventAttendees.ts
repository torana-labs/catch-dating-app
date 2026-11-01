import {assertPublicEventAge} from "../profiles/eventProfileRequirements";
import {publicGuestMembership} from "./publicRegistration/authority";
import {assertPublicRegistrationPolicy, publicRegistrationMode} from
  "./publicRegistration/policy";
import {heldSeatCount} from "./seatAuthority/seatAuthority";
import {requirePublicConfiguredEvent} from "./configuredEvent";
import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {
  EventAttendeeDocument,
  EventAttendeeImportDocument,
  EventDocument,
  OnboardingDraftDocument,
  OrganizerCommunicationPermissionReceiptDocument,
  OrganizerCommunicationPreferenceDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ImportEventAttendeesCallablePayload} from
  "../shared/generated/importEventAttendeesCallablePayload";
import type {MarkEventAttendeeAttendanceCallablePayload} from
  "../shared/generated/markEventAttendeeAttendanceCallablePayload";
import type {SetEventAttendeeAttendanceCallablePayload} from
  "../shared/generated/setEventAttendeeAttendanceCallablePayload";
import type {SetEventAttendeeAttendanceCallableResponse} from
  "../shared/generated/setEventAttendeeAttendanceCallableResponse";
import type {RegisterPublicEventCallablePayload} from
  "../shared/generated/registerPublicEventCallablePayload";
import type {RegisterPublicEventCallableResponse} from
  "../shared/generated/registerPublicEventCallableResponse";
import {
  validateImportEventAttendeesCallablePayload,
} from "../shared/generated/validators/importEventAttendeesInput";
import {
  validateMarkEventAttendeeAttendanceCallablePayload,
} from
  "../shared/generated/validators/markEventAttendeeAttendanceInput";
import {
  validateRegisterPublicEventCallablePayload,
} from "../shared/generated/validators/registerPublicEventInput";
import {
  validateSetEventAttendeeAttendanceCallablePayload,
} from
  "../shared/generated/validators/setEventAttendeeAttendanceInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {requireEventOperatorPermission} from
  "../shared/eventOperatorAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  organizerCommunicationPreferenceId,
  publicRegistrationPermissionReceipt,
  unknownOrganizerCommunicationChannel,
} from
  "../shared/organizerCommunicationPreferences";
import {eventPolicyFromEvent} from "./eventPolicy";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {resolveInviteAttributionToken} from "./inviteLinks";
import {readSeatMigrationWriterFence} from "./seatMigrationPaged";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {FirestoreSeatIdentityAuthority, prepareCatchUidSeatIdentity,
  prepareVerifiedUidAttendeeEnrollment, seatIdentityAliasId,
  seatIdentityValueHash} from
  "./seatIdentityAuthority";
import {applyFirestoreSeat, prepareFirestoreSeat, deriveEventSeatPolicy,
  assertCurrentReadySeatSnapshot,
  FirestoreSeatTransaction} from
  "./seatAuthority/firestoreAdapter";
import {assertAccountMayBook} from "../safety/accountStanding";
import {applyBatchImportSeats, prepareFirestoreBatchSeatImport} from
  "./seatAuthority/batchSeatImport";

type ImportRow = ImportEventAttendeesCallablePayload["rows"][number];
type ImportError = EventAttendeeImportDocument["errors"][number];

interface EventAttendeeDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventAttendeeDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
};

const attendanceReceiptRetentionMillis = 30 * 24 * 60 * 60 * 1000;

function occupiesSeat(status: EventAttendeeDocument["status"]): boolean {
  return status === "registered" || status === "checkedIn";
}

/** Prepared in the attendee writer's TX; never decides occupancy from UI. */
async function prepareAttendanceSeatChange(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  organizerId: string;
  event: EventDocument;
  attendeeId: string;
  previous: EventAttendeeDocument["status"];
  next: EventAttendeeDocument["status"];
  source: EventAttendeeDocument["source"];
  linkedUid: string | null;
  requestId: string;
  nowMillis: number;
}): Promise<{apply: () => void;
  nextStatus: EventAttendeeDocument["status"]}> {
  const {db, tx, eventId, organizerId, attendeeId} = params;
  const subject = params.source === "catchBooking" && params.linkedUid ?
    {kind: "verifiedUid" as const, uid: params.linkedUid} :
    {kind: "importAttendee" as const, attendeeId};
  const identity = await new FirestoreSeatIdentityAuthority().resolve({
    db, tx, eventId, organizerId,
    subject,
  });
  if (!identity) {
    throw new HttpsError("failed-precondition",
      "Guest seat identity requires reconciliation.");
  }
  const participation = params.linkedUid ?
    (await tx.get(db.collection("eventParticipations")
      .doc(eventParticipationId(eventId, params.linkedUid)))).data() : null;
  if (participation && (participation.eventId !== eventId ||
      participation.uid !== params.linkedUid ||
      (participation.organizerId) !== organizerId ||
      participation.organizerId !== undefined &&
        participation.organizerId !== organizerId)) {
    throw new HttpsError("failed-precondition",
      "Linked Catch participation owner disagrees with this event.");
  }
  const independentCatchActive = participation != null &&
    (participation.status === "signedUp" ||
      participation.status === "attended");
  const nextStatus = independentCatchActive &&
    !occupiesSeat(params.next) ? "registered" : params.next;
  const seats = new FirestoreSeatTransaction(db, tx);
  const [ledger, reservation] = await Promise.all([
    seats.ledger(eventId), seats.reservation(eventId, identity.key),
  ]);
  try {
    assertCurrentReadySeatSnapshot({event: params.event, eventId,
      organizerId, identity, ledger, reservation,
      expectedActive: occupiesSeat(params.previous) ||
        independentCatchActive});
  } catch {
    throw new HttpsError("failed-precondition",
      "Guest attendance and seat authority disagree.");
  }
  if (reservation?.checkoutHold || reservation?.temporaryHold) {
    throw new HttpsError("failed-precondition",
      "Finish checkout before changing this guest attendance.");
  }
  const wasActive = occupiesSeat(params.previous) || independentCatchActive;
  const willBeActive = occupiesSeat(nextStatus) || independentCatchActive;
  if (wasActive === willBeActive) {
    return {apply: () => undefined,
      nextStatus};
  }
  const prepared = await prepareFirestoreSeat({db, tx,
    identityAuthority: {resolve: async () => identity},
    command: {eventId, subject,
      operation: willBeActive ? "reserve" : "release",
      requestId: params.requestId,
      expectedLedgerRevision: ledger!.revision,
      expectedCapacityRevision: ledger!.capacityRevision,
      expectedMigrationRevision: ledger!.migrationRevision,
      expectedReservationRevision: reservation?.revision ?? 0,
      nowMillis: params.nowMillis},
  });
  return {apply: () => {
    applyFirestoreSeat(prepared);
  }, nextStatus};
}

export interface EventAttendeeImportResult {
  importId: string;
  status: "completed" | "partial" | "failed";
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: ImportError[];
  replayed: boolean;
}

interface PreparedRow {
  attendeeId: string;
  rowId: string;
  displayName: string;
  searchName: string;
  phoneE164: string | null;
  email: string | null;
  cityMarketId: string | null;
  externalReference: string | null;
  arrivalGroup: string | null;
  ticketType: string | null;
  revenueAmountMinor: number | null;
  revenueCurrency: string | null;
  revenueSource: "hostImport" | "hostEstimate" | null;
  revenueAllocation: "perAttendee" | "sharedOrder" | null;
  revenueOrderReference: string | null;
  revenueOrderAmountMinor: number | null;
  status: "invited" | "registered" | "waitlisted";
}

/**
 * Imports a bounded roster into the server-owned operational attendee layer.
 */
export async function importEventAttendeesHandler(
  request: CallableRequest<unknown>,
  deps: EventAttendeeDeps = defaultDeps
): Promise<EventAttendeeImportResult> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    ImportEventAttendeesCallablePayload
  >(
    request,
    validateImportEventAttendeesCallablePayload,
    normalizeImportPayload
  );
  return importEventAttendeesForHost({hostUid, payload}, deps);
}

/** Shared importer for authenticated callable and signed inbound transports. */
export async function importEventAttendeesForHost(
  params: {
    hostUid: string;
    payload: ImportEventAttendeesCallablePayload;
    // Read-only source/actor check, rerun in the destination transaction.
    // A proven import replay does not create or update an attendee.
    authorizeSource?: (
      tx: FirebaseFirestore.Transaction, replayed: boolean,
      importId: string
    ) => Promise<void>;
    // Join a private source receipt to the canonical attendee transaction.
    // This runs after all reads, before attendee/seat/import writes.
    commitSource?: (
      tx: FirebaseFirestore.Transaction,
      importId: string,
      canonicalPayload: ImportEventAttendeesCallablePayload,
      payloadHash: string
    ) => Promise<void> | void;
  },
  deps: EventAttendeeDeps = defaultDeps
): Promise<EventAttendeeImportResult> {
  const {hostUid, payload} = params;
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "importEventAttendees", {
    maxRequests: 5, windowMs: 60 * 60 * 1000,
  });

  const eventRef = db.collection("events").doc(payload.eventId);

  const canonicalPayload = canonicalImportPayload(payload);
  const payloadHash = sha256(JSON.stringify(canonicalPayload));
  const importId = eventAttendeeImportId({
    eventId: payload.eventId,
    hostUid,
    importKey: payload.importKey,
  });
  const importRef = db.collection("eventAttendeeImports").doc(importId);
  const {prepared, errors} = prepareImportRows({
    eventId: payload.eventId,
    importKey: payload.importKey,
    format: payload.format,
    rows: payload.rows,
  });
  if (errors.some((error) => error.code === "shared-phone-identity")) {
    throw new HttpsError("failed-precondition",
      "Shared contact phone needs attendee-level review before import.");
  }
  const attendeeRefs = prepared.map((row) =>
    db.collection("eventAttendees").doc(row.attendeeId)
  );
  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if (event.status === "cancelled") {
      throw new HttpsError("failed-precondition", "This event is cancelled.");
    }
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, hostUid)) {
      throw new HttpsError(
        "permission-denied",
        "Only an organizer manager can import attendees."
      );
    }
    const seatMode = await readSeatMigrationWriterFence({db, tx,
      eventId: payload.eventId});
    const existingImportSnap = await tx.get(importRef);
    if (existingImportSnap.exists) {
      const existing = requireDoc<EventAttendeeImportDocument>(
        existingImportSnap, "EventAttendeeImportDocument");
      if (existing.payloadHash !== payloadHash) {
        throw new HttpsError("failed-precondition",
          "This import key was already used for different roster data.");
      }
      await params.authorizeSource?.(tx, true, importId);
      return importResult(importId, existing, true);
    }
    await params.authorizeSource?.(tx, false, importId);
    // A supplied contact must not bypass another attendee's phone key,
    // including a late write after a host reviewed this upload.
    const importedPhones = [...new Set(prepared
      .filter((row) => row.phoneE164)
      .map((row) => row.phoneE164!))];
    const phoneMatches = await Promise.all(importedPhones.map(async (phone) =>
      ({
        phoneKey: await tx.get(db.collection("eventAttendees").doc(
          eventAttendeeId(payload.eventId, `phone:${phone}`))),
        query: await tx.get(db.collection("eventAttendees")
          .where("eventId", "==", payload.eventId)
          .where("phoneE164", "==", phone).limit(2)),
      })));
    for (let index = 0; index < importedPhones.length; index++) {
      const matchingIds = new Set(prepared
        .filter((row) => row.phoneE164 === importedPhones[index])
        .map((row) => row.attendeeId));
      const match = phoneMatches[index];
      if (match.phoneKey.exists && !matchingIds.has(match.phoneKey.id) ||
          match.query.docs.some((snap) => !matchingIds.has(snap.id))) {
        throw new HttpsError("failed-precondition",
          "Imported contact matches another event attendee; review identity.");
      }
    }
    const existingAttendeeSnaps = await Promise.all(attendeeRefs.map((ref) =>
      tx.get(ref)));
    const existingById = new Map(existingAttendeeSnaps
      .filter((snap) => snap.exists)
      .map((snap) => [snap.id, requireDoc<EventAttendeeDocument>(snap,
        "EventAttendeeDocument")]));
    // An identity claim and a re-import must serialize on the same attendee
    // document. A changed endpoint cannot inherit its former UID grant.
    for (const row of prepared) {
      const existing = existingById.get(row.attendeeId);
      if (existing && row.email && !row.phoneE164 &&
          !row.externalReference) {
        throw new HttpsError("failed-precondition",
          `Email-only identity needs separate review (${row.rowId}).`);
      }
      // A host-supplied roster is never authority for a Catch booking's
      // identity, attendance, or payment facts.
      if (existing?.source === "catchBooking") {
        throw new HttpsError("failed-precondition",
          `Catch booking needs separate review (${row.rowId}).`);
      }
      if (existing?.linkedUid &&
          ((row.phoneE164 && row.phoneE164 !== existing.phoneE164) ||
          (row.email && row.email !== existing.email))) {
        throw new HttpsError("failed-precondition",
          `Imported contact conflicts with a claimed attendee (${row.rowId}).`);
      }
    }

    const now = deps.timestamp();
    let seatImport: Awaited<ReturnType<
      typeof prepareFirestoreBatchSeatImport>> | null = null;
    let readyLedgerOccupied = 0;
    if (seatMode === "ready") {
      const organizerId = event.organizerId;
      const seatTx = new FirestoreSeatTransaction(db, tx);
      const ledger = await seatTx.ledger(payload.eventId);
      const policy = deriveEventSeatPolicy(event);
      if (!ledger || ledger.state !== "ready" ||
          ledger.capacity !== policy.capacity ||
          ledger.policyHash !== policy.policyHash ||
          ledger.policyVersion !== policy.policyVersion) {
        throw new HttpsError("failed-precondition",
          "Event seat policy needs reconciliation.");
      }
      readyLedgerOccupied = ledger.occupied;
      const unlinkedRows = [] as Array<{
        attendeeId: string; rowId: string;
        status: "registered" | "checkedIn" | "invited" | "waitlisted";
        phoneE164: string | null; externalReference: string | null;
        linkedUid: null;
      }>;
      const authority = new FirestoreSeatIdentityAuthority();
      for (const row of prepared) {
        const existing = existingById.get(row.attendeeId);
        const status = existing?.status === "checkedIn" ?
          "checkedIn" : row.status;
        if (existing?.linkedUid) {
          // Reimport of a linked attendee may preserve an active seat. Any
          // active/inactive transition needs an explicit reserve/release.
          if (!["registered", "checkedIn"].includes(existing.status) ||
              !["registered", "checkedIn"].includes(status)) {
            throw new HttpsError("failed-precondition",
              "Linked attendee seat transition needs review.");
          }
          const identity = await authority.resolve({db, tx,
            eventId: payload.eventId, organizerId,
            subject: {kind: "importAttendee", attendeeId: row.attendeeId}});
          const reservation = identity ? await seatTx.reservation(
            payload.eventId, identity.key) : null;
          if (!reservation?.active ||
              reservation.identityRevision !== identity?.revision) {
            throw new HttpsError("failed-precondition",
              "Linked attendee reservation is unavailable.");
          }
        } else {
          unlinkedRows.push({attendeeId: row.attendeeId, rowId: row.rowId,
            status, phoneE164: row.phoneE164 ??
              existing?.phoneE164 ?? null,
            externalReference: row.externalReference ??
              existing?.externalReference ?? null,
            linkedUid: null});
        }
      }
      if (unlinkedRows.length > 0) {
        seatImport = await prepareFirestoreBatchSeatImport({db, tx,
          eventId: payload.eventId, organizerId, importId,
          rows: unlinkedRows, nowMillis: now.toMillis()});
      }
    }
    await params.commitSource?.(tx, importId, canonicalPayload, payloadHash);
    if (seatMode === "ready") {
      if (seatImport) {
        applyBatchImportSeats(seatImport.writer,
          seatImport.plan);
      }
      // The ledger was read and validated above.
      tx.update(eventRef, {bookedCount:
        readyLedgerOccupied +
        (seatImport?.plan.newSeats ?? 0)});
    }
    const source = payload.format === "manual" ? "hostManual" : "hostImport";
    for (let index = 0; index < prepared.length; index += 1) {
      const row = prepared[index];
      const attendeeRef = attendeeRefs[index];
      const existing = existingById.get(row.attendeeId);
      const status = existing?.status === "checkedIn" ?
        "checkedIn" : row.status;
      const document: EventAttendeeDocument = {
        // Start from the transaction-read record so upload fields that are
        // absent from this canonical payload cannot erase independent facts
        // such as provider identity or post-event accountability results.
        ...existing,
        eventId: payload.eventId,
        organizerId: event.organizerId,
        displayName: row.displayName,
        searchName: row.searchName,
        source: existing?.source ?? source,
        status,
        linkedUid: existing?.linkedUid ?? null,
        phoneE164: row.phoneE164 ?? existing?.phoneE164 ?? null,
        email: row.email ?? existing?.email ?? null,
        cityMarketId: row.cityMarketId ?? existing?.cityMarketId ?? null,
        citySource: row.cityMarketId ? source : existing?.citySource ?? null,
        externalReference:
          row.externalReference ?? existing?.externalReference ?? null,
        arrivalGroup: row.arrivalGroup ?? existing?.arrivalGroup ?? null,
        ticketType: row.ticketType ?? existing?.ticketType ?? null,
        revenueAmountMinor:
          row.revenueAmountMinor ?? existing?.revenueAmountMinor ?? null,
        revenueCurrency:
          row.revenueCurrency ?? existing?.revenueCurrency ?? null,
        revenueSource: row.revenueSource ?? existing?.revenueSource ?? null,
        revenueAllocation:
          row.revenueAllocation ?? existing?.revenueAllocation ?? null,
        revenueOrderReference:
          row.revenueOrderReference ?? existing?.revenueOrderReference ?? null,
        revenueOrderAmountMinor:
          row.revenueOrderAmountMinor ??
          existing?.revenueOrderAmountMinor ?? null,
        importId,
        sourceRowId: row.rowId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        registeredAt: status === "registered" ?
          existing?.registeredAt ?? now : existing?.registeredAt ?? null,
        waitlistedAt: status === "waitlisted" ?
          existing?.waitlistedAt ?? now : existing?.waitlistedAt ?? null,
        checkedInAt: existing?.checkedInAt ?? null,
        cancelledAt: existing?.cancelledAt ?? null,
        checkedInBy: existing?.checkedInBy ?? null,
        linkedAt: existing?.linkedAt ?? null,
        inviteLinkId: existing?.inviteLinkId ?? null,
        inviteCapturedAt: existing?.inviteCapturedAt ?? null,
        attendanceRevision: existing?.attendanceRevision ?? 0,
        preCheckInStatus: existing?.preCheckInStatus ?? null,
      };
      tx.set(attendeeRef, document);
    }

    const createdCount = prepared.filter(
      (row) => !existingById.has(row.attendeeId)
    ).length;
    const updatedCount = prepared.length - createdCount;
    const skippedCount = payload.rows.length - prepared.length;
    const status = prepared.length === 0 ? "failed" :
      errors.length > 0 ? "partial" : "completed";
    const receipt: EventAttendeeImportDocument = {
      eventId: payload.eventId,
      organizerId: event.organizerId,
      uploadedBy: hostUid,
      importKey: payload.importKey,
      fileName: payload.fileName,
      format: payload.format,
      payloadHash,
      status,
      rowCount: payload.rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errors: errors.slice(0, 100),
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    };
    tx.create(importRef, receipt);
    return importResult(importId, receipt, false);
  });
}

/** Toggles Host-managed check-in for an operational attendee. */
export async function markEventAttendeeAttendanceHandler(
  request: CallableRequest<unknown>,
  deps: EventAttendeeDeps = defaultDeps
): Promise<{attendeeId: string; attended: boolean}> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    MarkEventAttendeeAttendanceCallablePayload
  >(
    request,
    validateMarkEventAttendeeAttendanceCallablePayload,
    normalizeAttendancePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "markEventAttendeeAttendance", {
    maxRequests: 120, windowMs: 60 * 1000,
  });

  const eventRef = db.collection("events").doc(payload.eventId);
  const attendeeRef = db.collection("eventAttendees").doc(payload.attendeeId);
  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if (event.status === "cancelled") {
      throw new HttpsError("failed-precondition", "This event is cancelled.");
    }
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    await requireEventOperatorPermission({
      db,
      organizer,
      event,
      eventId: payload.eventId,
      actorUid: hostUid,
      permission: "setAttendance",
      now: deps.timestamp(),
      transaction: tx,
    });
    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new HttpsError("not-found", "Attendee not found.");
    }
    const attendee = requireDoc<EventAttendeeDocument>(
      attendeeSnap,
      "EventAttendeeDocument"
    );
    if (attendee.eventId !== payload.eventId) {
      throw new HttpsError(
        "failed-precondition",
        "This attendee does not belong to the event."
      );
    }
    if (attendee.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "A cancelled attendee cannot be checked in."
      );
    }
    const attended = attendee.status !== "checkedIn";
    const now = deps.timestamp();
    const seatMode = await readSeatMigrationWriterFence({db, tx,
      eventId: payload.eventId});
    const nextStatus = attended ? "checkedIn" : "registered";
    const seatChange = seatMode === "ready" ?
      await prepareAttendanceSeatChange({db, tx, eventId: payload.eventId,
        organizerId: event.organizerId,
        event,
        attendeeId: payload.attendeeId, previous: attendee.status,
        next: nextStatus, source: attendee.source,
        linkedUid: attendee.linkedUid,
        nowMillis: now.toMillis(),
        requestId: `mark_${createHash("sha256").update(JSON.stringify([
          payload.eventId, payload.attendeeId,
          attendee.attendanceRevision ?? 0, nextStatus,
        ])).digest("hex")}`}) :
      {apply: () => undefined, nextStatus};
    seatChange.apply();
    tx.update(attendeeRef, {
      status: seatChange.nextStatus,
      checkedInAt: attended ? now : null,
      checkedInBy: attended ? hostUid : null,
      ...(seatMode === "ready" ? {attendanceRevision:
        (attendee.attendanceRevision ?? 0) + 1} : {}),
      updatedAt: now,
    });
    return {attendeeId: payload.attendeeId, attended};
  });
}

/**
 * Sets one attendee's desired attendance state without replaying a toggle.
 * A client operation id is immutable, and stale revisions fail visibly.
 */
export async function setEventAttendeeAttendanceHandler(
  request: CallableRequest<unknown>,
  deps: EventAttendeeDeps = defaultDeps
): Promise<SetEventAttendeeAttendanceCallableResponse> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    SetEventAttendeeAttendanceCallablePayload
  >(
    request,
    validateSetEventAttendeeAttendanceCallablePayload,
    normalizeSetAttendancePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "setEventAttendeeAttendance", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const eventRef = db.collection("events").doc(payload.eventId);
  const attendeeRef = db.collection("eventAttendees")
    .doc(payload.attendeeId);
  const receiptId = attendanceReceiptId({
    eventId: payload.eventId,
    actorUid: hostUid,
    clientOperationId: payload.clientOperationId,
  });
  const receiptRef = db.collection("eventAttendeeAttendanceReceipts")
    .doc(receiptId);
  return db.runTransaction(async (tx) => {
    const [eventSnap, receiptSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(receiptRef),
    ]);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if (event.status === "cancelled") {
      throw new HttpsError("failed-precondition", "This event is cancelled.");
    }
    const seatMode = await readSeatMigrationWriterFence({db, tx,
      eventId: payload.eventId});
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    await requireEventOperatorPermission({
      db,
      organizer,
      event,
      eventId: payload.eventId,
      actorUid: hostUid,
      permission: "setAttendance",
      now: deps.timestamp(),
      transaction: tx,
    });
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() as {
        eventId?: string;
        attendeeId?: string;
        desiredCheckedIn?: boolean;
        acceptedRevision?: number;
        changed?: boolean;
      };
      if (receipt.eventId !== payload.eventId ||
          receipt.attendeeId !== payload.attendeeId ||
          receipt.desiredCheckedIn !== payload.desiredCheckedIn ||
          typeof receipt.acceptedRevision !== "number" ||
          typeof receipt.changed !== "boolean") {
        throw new HttpsError(
          "failed-precondition",
          "This attendance operation id was already used differently."
        );
      }
      return {
        attendeeId: payload.attendeeId,
        checkedIn: receipt.desiredCheckedIn,
        acceptedRevision: receipt.acceptedRevision,
        replayed: true,
        changed: receipt.changed,
      };
    }
    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new HttpsError("not-found", "Attendee not found.");
    }
    const attendee = requireDoc<EventAttendeeDocument>(
      attendeeSnap,
      "EventAttendeeDocument"
    );
    if (attendee.eventId !== payload.eventId) {
      throw new HttpsError(
        "failed-precondition",
        "This attendee does not belong to the event."
      );
    }
    if (attendee.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "A cancelled attendee cannot be checked in."
      );
    }
    const priorRevision = attendee.attendanceRevision ?? 0;
    if (payload.expectedRevision !== priorRevision) {
      throw new HttpsError(
        "aborted",
        "Attendance changed on another device. Current revision: " +
          `${priorRevision}.`
      );
    }
    const alreadyCheckedIn = attendee.status === "checkedIn";
    const changed = alreadyCheckedIn !== payload.desiredCheckedIn;
    const acceptedRevision = changed ? priorRevision + 1 : priorRevision;
    const now = deps.timestamp();
    const restoredStatus = attendee.preCheckInStatus ?? "registered";
    const nextStatus = payload.desiredCheckedIn ? "checkedIn" :
      restoredStatus;
    const seatChange = seatMode === "ready" ?
      await prepareAttendanceSeatChange({db, tx, eventId: payload.eventId,
        organizerId: event.organizerId,
        event,
        attendeeId: payload.attendeeId, previous: attendee.status,
        next: changed ? nextStatus : attendee.status,
        source: attendee.source,
        linkedUid: attendee.linkedUid,
        nowMillis: now.toMillis(),
        requestId: `attendance_${receiptId}`}) :
      {apply: () => undefined, nextStatus};
    seatChange.apply();
    if (changed) {
      tx.update(attendeeRef, {
        status: seatChange.nextStatus,
        checkedInAt: payload.desiredCheckedIn ? now : null,
        checkedInBy: payload.desiredCheckedIn ? hostUid : null,
        attendanceRevision: acceptedRevision,
        preCheckInStatus: payload.desiredCheckedIn ? attendee.status : null,
        updatedAt: now,
      });
      tx.update(eventRef, {
        checkedInCount: admin.firestore.FieldValue.increment(
          payload.desiredCheckedIn ? 1 : -1
        ),
        updatedAt: now,
      });
    }
    tx.create(receiptRef, {
      eventId: payload.eventId,
      organizerId: event.organizerId,
      attendeeId: payload.attendeeId,
      actorUid: hostUid,
      clientOperationId: payload.clientOperationId,
      desiredCheckedIn: payload.desiredCheckedIn,
      priorRevision,
      acceptedRevision,
      changed,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + attendanceReceiptRetentionMillis
      ),
    });
    return {
      attendeeId: payload.attendeeId,
      checkedIn: payload.desiredCheckedIn,
      acceptedRevision,
      replayed: false,
      changed,
    };
  });
}

/**
 * Registers a phone-authenticated website visitor without requiring the
 * Consumer onboarding/profile contract. A matching imported phone row is
 * linked in place, so the Host never sees duplicate operational identities.
 */
export async function registerPublicEventHandler(
  request: CallableRequest<unknown>,
  deps: EventAttendeeDeps = defaultDeps
): Promise<RegisterPublicEventCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<RegisterPublicEventCallablePayload>(
    request,
    validateRegisterPublicEventCallablePayload,
    normalizePublicRegistrationPayload
  );
  const rawPhone = request.auth?.token.phone_number;
  const phone = normalizeRosterPhone(
    typeof rawPhone === "string" ? rawPhone : null
  ).value;
  if (!phone) {
    throw new HttpsError(
      "failed-precondition",
      "Verify a phone number before registering for this event."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "registerPublicEvent", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  const inviteAttribution = await resolveInviteAttributionToken({
    db,
    eventId: payload.eventId,
    inviteToken: payload.inviteToken,
  });
  const eventRef = db.collection("events").doc(payload.eventId);
  const attendeeId = eventAttendeeId(payload.eventId, `phone:${phone}`);
  const attendeeRef = db.collection("eventAttendees").doc(attendeeId);
  const onboardingDraftRef = db.collection("onboarding_drafts").doc(uid);

  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const candidate = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if (!isEventPubliclyAccessible(candidate)) {
      throw new HttpsError("failed-precondition",
        "This event is not open for public registration.");
    }
    const event = requirePublicConfiguredEvent(candidate);
    const organizerId = event.organizerId;
    const seatMode = await readSeatMigrationWriterFence({db, tx,
      eventId: payload.eventId});
    const phoneMatches = seatMode === "ready" ? await tx.get(db
      .collection("eventAttendees")
      .where("eventId", "==", payload.eventId)
      .where("phoneE164", "==", phone).limit(2)) : null;
    if (phoneMatches && phoneMatches.size > 1) {
      throw new HttpsError("failed-precondition",
        "This verified phone has multiple guest records to reconcile.");
    }
    const selectedAttendeeRef = phoneMatches?.docs[0]?.ref ?? attendeeRef;
    const communicationPreferenceRef = db
      .collection("organizerCommunicationPreferences")
      .doc(organizerCommunicationPreferenceId(organizerId, uid));
    const [
      organizerSnap,
      attendeeSnap,
      rosterSnap,
      onboardingDraftSnap,
      communicationPreferenceSnap,
    ] = await Promise.all([
      tx.get(eventOrganizerRef(db, event)),
      tx.get(selectedAttendeeRef),
      seatMode === "ready" ? Promise.resolve(null) :
        tx.get(db.collection("eventAttendees")
          .where("eventId", "==", payload.eventId)),
      tx.get(onboardingDraftRef),
      tx.get(communicationPreferenceRef),
    ]);
    const organizer = requireEventOrganizer(organizerSnap, event);
    const policy = eventPolicyFromEvent(event);
    const existing = attendeeSnap.exists ?
      requireDoc<EventAttendeeDocument>(attendeeSnap, "EventAttendeeDocument") :
      null;
    const alreadyRegistered = existing?.status === "registered" ||
      existing?.status === "checkedIn";
    const registrationReplay = alreadyRegistered && existing?.linkedUid === uid;
    const activeCount = rosterSnap?.docs.reduce((count, document) => {
      const attendee = requireDoc<EventAttendeeDocument>(
        document,
        "EventAttendeeDocument"
      );
      return attendee.status === "registered" ||
        attendee.status === "checkedIn" ? count + 1 : count;
    }, 0) ?? 0;
    const now = deps.timestamp();
    await assertAccountMayBook(tx, db, uid, event.organizerId,
      now.toMillis());
    await assertPublicEventAge({db, tx, uid, event,
      nowMillis: now.toMillis()});
    assertPublicRegistrationPolicy(event, organizer, "free", now.toMillis(),
      await publicGuestMembership({db, tx, event, uid,
        nowMillis: now.toMillis()}));
    if (publicRegistrationMode(event) !== "free") {
      throw new HttpsError("failed-precondition",
        "Registration must match the event's current terms.");
    }
    const permissionReceipts = registrationReplay ? [] :
      publicRegistrationPermissionReceipts({
        existing: communicationPreferenceSnap.exists ?
          communicationPreferenceSnap.data() as
            OrganizerCommunicationPreferenceDocument : undefined,
        organizerId,
        uid,
        eventId: payload.eventId,
        organizerUpdates: payload.organizerUpdates,
        now,
      });
    const receiptSnaps = await Promise.all(permissionReceipts.map((receipt) =>
      tx.get(db.collection("organizerCommunicationPermissionReceipts")
        .doc(receipt.id))
    ));
    let applyIdentity: () => void = () => undefined;
    let applySeat: () => void = () => undefined;
    let createAttendeeAlias: () => void = () => undefined;
    let readyCount = activeCount;
    if (seatMode === "ready") {
      const seats = new FirestoreSeatTransaction(db, tx);
      const ledger = await seats.ledger(payload.eventId);
      if (!ledger || ledger.state !== "ready" ||
          ledger.capacity !== policy.admission.capacityLimit) {
        throw new HttpsError("failed-precondition",
          "Event seat authority needs reconciliation.");
      }
      readyCount = ledger.occupied + heldSeatCount(ledger);
      if (existing && existing.eventId !== payload.eventId ||
          existing?.linkedUid && existing.linkedUid !== uid ||
          existing?.phoneE164 !== undefined &&
          existing.phoneE164 !== phone) {
        throw new HttpsError("failed-precondition",
          "Guest identity requires reconciliation.");
      }
      const now = deps.timestamp();
      const enrolled = existing ?
        await prepareVerifiedUidAttendeeEnrollment({db, tx,
          eventId: payload.eventId, organizerId,
          attendeeId: selectedAttendeeRef.id, uid,
          authTokenPhoneNumber: phone, now}) :
        await prepareCatchUidSeatIdentity({db, tx,
          eventId: payload.eventId, organizerId, uid,
          currentAuthPhoneNumber: phone});
      const identity = enrolled.identity;
      applyIdentity = enrolled.apply;
      if (!existing) {
        const aliasRef = db.collection("eventSeatIdentityAliases")
          .doc(seatIdentityAliasId(payload.eventId, "attendee",
            selectedAttendeeRef.id));
        if ((await tx.get(aliasRef)).exists) {
          throw new HttpsError("failed-precondition",
            "An attendee alias already exists without its guest row.");
        }
        createAttendeeAlias = () => tx.create(aliasRef, {
          eventId: payload.eventId, organizerId, kind: "attendee",
          valueHash: seatIdentityValueHash("attendee",
            selectedAttendeeRef.id), canonicalKey: identity.key,
          identityRevision: identity.revision,
          migrationRevision: ledger.migrationRevision, state: "ready",
        });
      }
      const reservation = await seats.reservation(payload.eventId,
        identity.key);
      if (reservation?.checkoutHold || reservation?.temporaryHold) {
        throw new HttpsError("failed-precondition",
          "Finish or cancel the current checkout before registering.");
      }
      const isActive = reservation?.active === true;
      if (existing && isActive !== occupiesSeat(existing.status) ||
          !existing && isActive && !registrationReplay) {
        throw new HttpsError("failed-precondition",
          "Guest roster and seat authority disagree.");
      }
      if (!isActive && readyCount < ledger.capacity) {
        const prepared = await prepareFirestoreSeat({db, tx,
          identityAuthority: {resolve: async () => identity},
          command: {eventId: payload.eventId,
            subject: {kind: "verifiedUid", uid}, operation: "reserve",
            requestId: `otp_${uid}_${reservation?.revision ?? 0}`,
            expectedLedgerRevision: ledger.revision,
            expectedCapacityRevision: ledger.capacityRevision,
            expectedMigrationRevision: ledger.migrationRevision,
            expectedReservationRevision: reservation?.revision ?? 0,
            nowMillis: now.toMillis()},
        });
        applySeat = () => {
          applyFirestoreSeat(prepared);
        };
      }
    }
    const displayName = existing?.displayName ?? payload.displayName;
    const status = publicRegistrationStatus({
      activeCount: readyCount,
      capacityLimit: policy.admission.capacityLimit,
      existingStatus: existing?.status,
    });
    const document: EventAttendeeDocument = {
      eventId: payload.eventId,
      organizerId,
      displayName,
      searchName: displayName.toLocaleLowerCase("en"),
      source: existing?.source ?? "webOtp",
      status,
      linkedUid: uid,
      phoneE164: phone,
      email: existing?.email ?? null,
      externalReference: existing?.externalReference ?? null,
      arrivalGroup: existing?.arrivalGroup ?? null,
      ticketType: existing?.ticketType ?? null,
      importId: existing?.importId ?? null,
      sourceRowId: existing?.sourceRowId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      registeredAt: status === "registered" || status === "checkedIn" ?
        existing?.registeredAt ?? now : existing?.registeredAt ?? null,
      waitlistedAt: status === "waitlisted" ?
        existing?.waitlistedAt ?? now : existing?.waitlistedAt ?? null,
      checkedInAt: existing?.checkedInAt ?? null,
      cancelledAt: null,
      checkedInBy: existing?.checkedInBy ?? null,
      linkedAt: existing?.linkedAt ?? now,
      inviteLinkId: existing?.inviteLinkId ??
        inviteAttribution?.inviteLinkId ?? null,
      inviteCapturedAt: existing?.inviteCapturedAt ??
        (inviteAttribution ? now : null),
      attendanceRevision: existing?.attendanceRevision ?? 0,
      preCheckInStatus: existing?.preCheckInStatus ?? null,
    };
    applyIdentity();
    createAttendeeAlias();
    applySeat();
    tx.set(selectedAttendeeRef, document);
    if (!onboardingDraftSnap.exists) {
      tx.create(onboardingDraftRef, onboardingDraftSeed({
        displayName,
        phoneE164: phone,
      }));
    }
    const communicationPreference = registrationReplay ? null :
      mergeOrganizerCommunicationPreference({
        existing: communicationPreferenceSnap.exists ?
          communicationPreferenceSnap.data() as
            OrganizerCommunicationPreferenceDocument : undefined,
        organizerId,
        uid,
        eventId: payload.eventId,
        organizerUpdates: payload.organizerUpdates,
        now,
        permissionReceipts,
      });
    if (communicationPreference) {
      tx.set(communicationPreferenceRef, communicationPreference);
    }
    for (let index = 0; index < permissionReceipts.length; index += 1) {
      const receipt = permissionReceipts[index];
      const existingReceipt = receiptSnaps[index];
      if (existingReceipt.exists) {
        assertPermissionReceiptReplay(existingReceipt, receipt.document);
      } else {
        tx.create(
          db.collection("organizerCommunicationPermissionReceipts")
            .doc(receipt.id),
          receipt.document
        );
      }
    }
    return {
      eventId: payload.eventId,
      attendeeId: selectedAttendeeRef.id,
      status: alreadyRegistered ? "alreadyRegistered" :
        status === "waitlisted" ? "waitlisted" : "registered",
    };
  });
}

/** Builds the private Consumer onboarding seed for an OTP-only attendee. */
export function onboardingDraftSeed(params: {
  displayName: string;
  phoneE164: string;
}): OnboardingDraftDocument {
  const phone = splitSupportedPhone(params.phoneE164);
  return {
    step: 1,
    draftVersion: 2,
    firstName: params.displayName.trim().slice(0, 80),
    lastName: "",
    phoneNumber: phone.nationalNumber,
    countryCode: phone.countryCode,
  };
}

/**
 * Applies only explicit opt-ins from registration. An unchecked box never
 * revokes a prior grant; withdrawal belongs to the self-service/STOP path.
 */
export function mergeOrganizerCommunicationPreference(params: {
  existing?: OrganizerCommunicationPreferenceDocument;
  organizerId: string;
  uid: string;
  eventId: string;
  organizerUpdates?: RegisterPublicEventCallablePayload["organizerUpdates"];
  now: FirebaseFirestore.Timestamp;
  permissionReceipts?: Array<{
    id: string;
    document: OrganizerCommunicationPermissionReceiptDocument;
  }>;
}): OrganizerCommunicationPreferenceDocument | null {
  const grantsWhatsapp = params.organizerUpdates?.whatsapp === true;
  const grantsSms = params.organizerUpdates?.sms === true;
  if (!params.existing && !grantsWhatsapp && !grantsSms) return null;
  if (params.existing && !grantsWhatsapp && !grantsSms) return null;

  const receipts = params.permissionReceipts ??
    publicRegistrationPermissionReceipts(params);
  const receiptByChannel = new Map(receipts.map((receipt) => [
    receipt.document.channel,
    receipt,
  ]));
  const optedInChannel = (channel: "whatsapp" | "sms") => ({
    status: "optedIn" as const,
    evidenceStatus: "complete" as const,
    currentReceiptId: receiptByChannel.get(channel)!.id,
    termsVersion: params.organizerUpdates!.termsVersion,
    source: "publicEventRegistration" as const,
    sourceEventId: params.eventId,
    updatedAt: params.now,
  });
  return {
    organizerId: params.organizerId,
    uid: params.uid,
    whatsapp: grantsWhatsapp ? optedInChannel("whatsapp") :
      params.existing?.whatsapp ?? unknownOrganizerCommunicationChannel(),
    ...(params.existing?.whatsappPurposes ?
      {whatsappPurposes: params.existing.whatsappPurposes} : {}),
    sms: grantsSms ? optedInChannel("sms") :
      params.existing?.sms ?? unknownOrganizerCommunicationChannel(),
    createdAt: params.existing?.createdAt ?? params.now,
    updatedAt: params.now,
  };
}

export function publicRegistrationPermissionReceipts(params: {
  existing?: OrganizerCommunicationPreferenceDocument;
  organizerId: string;
  uid: string;
  eventId: string;
  organizerUpdates?: RegisterPublicEventCallablePayload["organizerUpdates"];
  now: FirebaseFirestore.Timestamp;
}): Array<{
  id: string;
  document: OrganizerCommunicationPermissionReceiptDocument;
}> {
  const grants = [
    ...(params.organizerUpdates?.whatsapp === true ?
      ["whatsapp" as const] : []),
    ...(params.organizerUpdates?.sms === true ? ["sms" as const] : []),
  ];
  return grants.map((channel) => {
    const receipt = publicRegistrationPermissionReceipt({
      organizerId: params.organizerId,
      uid: params.uid,
      channel,
      eventId: params.eventId,
      termsVersion: params.organizerUpdates!.termsVersion,
      supersedesReceiptId: params.existing?.[channel].currentReceiptId ?? null,
      now: params.now,
    });
    if (!receipt) {
      throw new HttpsError(
        "invalid-argument",
        "The selected organizer-update consent version is not supported."
      );
    }
    return receipt;
  });
}

function assertPermissionReceiptReplay(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  expected: OrganizerCommunicationPermissionReceiptDocument
): void {
  const existing = snapshot.data() as
    OrganizerCommunicationPermissionReceiptDocument | undefined;
  if (!existing || existing.organizerId !== expected.organizerId ||
      existing.uid !== expected.uid || existing.channel !== expected.channel ||
      existing.decision !== expected.decision ||
      existing.source !== expected.source ||
      existing.sourceEventId !== expected.sourceEventId ||
      existing.termsVersion !== expected.termsVersion ||
      existing.consentCopyHash !== expected.consentCopyHash) {
    throw new HttpsError(
      "failed-precondition",
      "Stored communication permission evidence is inconsistent."
    );
  }
}

function splitSupportedPhone(phoneE164: string): {
  countryCode: string;
  nationalNumber: string;
} {
  for (const countryCode of ["+977", "+91", "+61", "+1"]) {
    if (phoneE164.startsWith(countryCode)) {
      return {
        countryCode,
        nationalNumber: phoneE164.slice(countryCode.length),
      };
    }
  }
  return {countryCode: "", nationalNumber: phoneE164};
}

export function publicRegistrationStatus(params: {
  activeCount: number;
  capacityLimit: number;
  existingStatus: EventAttendeeDocument["status"] | undefined;
}): EventAttendeeDocument["status"] {
  if (params.existingStatus === "checkedIn") return "checkedIn";
  if (params.existingStatus === "registered") return "registered";
  return params.activeCount < params.capacityLimit ?
    "registered" : "waitlisted";
}

export function prepareImportRows(params: {
  eventId: string;
  importKey: string;
  format?: "csv" | "xlsx" | "manual";
  rows: ImportRow[];
}): {prepared: PreparedRow[]; errors: ImportError[]} {
  const prepared: PreparedRow[] = [];
  const errors: ImportError[] = [];
  const seenAttendeeIds = new Set<string>();
  const phoneIdentities = new Map<string, Set<string>>();
  for (const row of params.rows) {
    const phone = normalizeRosterPhone(row.phone).value;
    if (!phone) continue;
    const reference = stringOrNull(row.externalReference)?.toLowerCase();
    const identities = phoneIdentities.get(phone) ?? new Set<string>();
    identities.add(reference ? `external:${reference}` : `phone:${phone}`);
    phoneIdentities.set(phone, identities);
  }
  for (const row of params.rows) {
    const displayName = row.displayName.trim().replace(/\s+/g, " ");
    const phoneResult = normalizeRosterPhone(row.phone);
    if (phoneResult.issue) {
      errors.push({
        rowId: row.rowId,
        code: "invalid-phone",
        message: phoneResult.issue,
      });
      continue;
    }
    if (phoneResult.value &&
        (phoneIdentities.get(phoneResult.value)?.size ?? 0) > 1) {
      errors.push({rowId: row.rowId, code: "shared-phone-identity",
        message: "This contact phone appears on distinct tickets. " +
          "Review attendee phone identity before importing."});
      continue;
    }
    const email = stringOrNull(row.email)?.toLowerCase() ?? null;
    if (email !== null && !isValidEmail(email)) {
      errors.push({
        rowId: row.rowId,
        code: "invalid-email",
        message: "Enter a valid email address or leave it blank.",
      });
      continue;
    }
    const city = row.cityMarketId == null ? null :
      marketForIdOrAlias(row.cityMarketId);
    if (row.cityMarketId != null && !city) {
      errors.push({rowId: row.rowId, code: "invalid-city",
        message: "Choose a supported city or leave it blank."});
      continue;
    }
    const externalReference = stringOrNull(row.externalReference);
    const arrivalGroup = stringOrNull(row.arrivalGroup);
    let stableKey = `row:${params.importKey}:${row.rowId}`;
    if (externalReference !== null) {
      stableKey = `external:${externalReference.toLowerCase()}`;
    } else if (phoneResult.value !== null) {
      stableKey = `phone:${phoneResult.value}`;
    } else if (email !== null) {
      stableKey = `email:${email}`;
    } else if (params.format !== "manual") {
      errors.push({
        rowId: row.rowId,
        code: "missing-stable-identity",
        message: "Map a phone, email, or booking reference so this guest " +
          "can be safely re-imported.",
      });
      continue;
    }
    const attendeeId = eventAttendeeId(params.eventId, stableKey);
    if (seenAttendeeIds.has(attendeeId)) {
      errors.push({
        rowId: row.rowId,
        code: "duplicate-row",
        message: "This attendee appears more than once in the import.",
      });
      continue;
    }
    seenAttendeeIds.add(attendeeId);
    const revenueAmountMinor = row.revenueAmountMinor ?? null;
    const revenueCurrency = stringOrNull(row.revenueCurrency)?.toUpperCase() ??
      null;
    const revenueSource = row.revenueSource ?? null;
    const hasRevenue = revenueAmountMinor !== null ||
      revenueCurrency !== null || revenueSource !== null;
    if (hasRevenue &&
        (!Number.isSafeInteger(revenueAmountMinor) ||
          revenueAmountMinor! < 0 ||
          revenueCurrency === null ||
          !/^[A-Z]{3}$/.test(revenueCurrency) ||
          revenueSource === null)) {
      errors.push({
        rowId: row.rowId,
        code: "invalid-revenue",
        message: "Revenue needs a non-negative amount, three-letter " +
          "currency, and reported or estimated source.",
      });
      continue;
    }
    prepared.push({
      attendeeId,
      rowId: row.rowId,
      displayName,
      searchName: displayName.toLocaleLowerCase("en"),
      phoneE164: phoneResult.value,
      email,
      cityMarketId: city?.marketId ?? null,
      externalReference,
      arrivalGroup,
      ticketType: stringOrNull(row.ticketType),
      revenueAmountMinor,
      revenueCurrency,
      revenueSource,
      revenueAllocation: hasRevenue ? "perAttendee" : null,
      revenueOrderReference: null,
      revenueOrderAmountMinor: null,
      status: row.status,
    });
  }
  allocateSharedOrderRevenue(prepared);
  return {prepared, errors};
}

/**
 * A repeated imported order total is divided across its attendee rows once.
 * Host-entered fallbacks are explicitly per attendee and are never divided.
 */
export function allocateSharedOrderRevenue(rows: PreparedRow[]): void {
  const groups = new Map<string, PreparedRow[]>();
  for (const row of rows) {
    if (row.arrivalGroup === null || row.revenueSource !== "hostImport" ||
        row.revenueAmountMinor === null || row.revenueCurrency === null) {
      continue;
    }
    const key = `${row.arrivalGroup}|${row.revenueCurrency}|` +
      `${row.revenueAmountMinor}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const orderAmount = group[0].revenueAmountMinor!;
    const baseShare = Math.floor(orderAmount / group.length);
    const remainder = orderAmount % group.length;
    group.forEach((row, index) => {
      row.revenueAmountMinor = baseShare + (index < remainder ? 1 : 0);
      row.revenueAllocation = "sharedOrder";
      row.revenueOrderReference = row.arrivalGroup;
      row.revenueOrderAmountMinor = orderAmount;
    });
  }
}

export function normalizeRosterPhone(
  value: string | null | undefined
): {value: string | null; issue: string | null} {
  const input = stringOrNull(value);
  if (input === null) return {value: null, issue: null};
  let normalized = input.replace(/[^\d+]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (!normalized.startsWith("+")) {
    const digits = normalized.replace(/^0+/, "");
    normalized = digits.length === 10 ? `+91${digits}` : `+${digits}`;
  }
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    return {
      value: null,
      issue: "Use a complete phone number with country code.",
    };
  }
  return {value: normalized, issue: null};
}

export function eventAttendeeId(eventId: string, stableKey: string): string {
  return `att_${sha256(`${eventId}|${stableKey}`).slice(0, 48)}`;
}

function eventAttendeeImportId(params: {
  eventId: string;
  hostUid: string;
  importKey: string;
}): string {
  return `imp_${sha256(
    `${params.eventId}|${params.hostUid}|${params.importKey}`
  ).slice(0, 48)}`;
}

export function canonicalImportPayload(
  payload: ImportEventAttendeesCallablePayload
): ImportEventAttendeesCallablePayload {
  return {
    eventId: payload.eventId,
    importKey: payload.importKey,
    fileName: payload.fileName,
    format: payload.format,
    rows: payload.rows.map((row) => ({
      rowId: row.rowId,
      displayName: row.displayName,
      phone: row.phone ?? null,
      email: row.email ?? null,
      ...(row.cityMarketId == null ? {} : {cityMarketId: row.cityMarketId}),
      externalReference: row.externalReference ?? null,
      arrivalGroup: row.arrivalGroup ?? null,
      ticketType: row.ticketType ?? null,
      revenueAmountMinor: row.revenueAmountMinor ?? null,
      revenueCurrency: row.revenueCurrency ?? null,
      revenueSource: row.revenueSource ?? null,
      status: row.status,
    })),
  };
}

function normalizeImportPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["eventId", "importKey", "fileName"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  if (Array.isArray(normalized.rows)) {
    normalized.rows = normalized.rows.map((rawRow) => {
      if (typeof rawRow !== "object" || rawRow === null ||
          Array.isArray(rawRow)) return rawRow;
      const row = {...rawRow} as Record<string, unknown>;
      for (const field of [
        "rowId", "displayName", "phone", "email", "cityMarketId",
        "externalReference",
        "arrivalGroup", "ticketType",
        "revenueCurrency",
      ]) {
        if (typeof row[field] === "string") row[field] = row[field].trim();
      }
      return row;
    });
  }
  return normalized;
}

function normalizeAttendancePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["eventId", "attendeeId"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  return normalized;
}

function normalizeSetAttendancePayload(data: unknown): unknown {
  const normalized = normalizeAttendancePayload(data);
  if (!normalized || typeof normalized !== "object" ||
      Array.isArray(normalized)) return normalized;
  const payload = {...normalized as Record<string, unknown>};
  if (typeof payload.clientOperationId === "string") {
    payload.clientOperationId = payload.clientOperationId.trim();
  }
  return payload;
}

export function attendanceReceiptId(params: {
  eventId: string;
  actorUid: string;
  clientOperationId: string;
}): string {
  return `ear_${sha256(
    `${params.eventId}|${params.actorUid}|${params.clientOperationId}`
  ).slice(0, 48)}`;
}

function normalizePublicRegistrationPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["eventId", "displayName", "inviteToken"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim().replace(/\s+/g, " ");
    }
  }
  if (typeof normalized.organizerUpdates === "object" &&
      normalized.organizerUpdates !== null &&
      !Array.isArray(normalized.organizerUpdates)) {
    const organizerUpdates = {
      ...normalized.organizerUpdates,
    } as Record<string, unknown>;
    if (typeof organizerUpdates.termsVersion === "string") {
      organizerUpdates.termsVersion = organizerUpdates.termsVersion.trim();
    }
    normalized.organizerUpdates = organizerUpdates;
  }
  return normalized;
}

function importResult(
  importId: string,
  receipt: EventAttendeeImportDocument,
  replayed: boolean
): EventAttendeeImportResult {
  return {
    importId,
    status: receipt.status,
    rowCount: receipt.rowCount,
    createdCount: receipt.createdCount,
    updatedCount: receipt.updatedCount,
    skippedCount: receipt.skippedCount,
    errors: receipt.errors,
    replayed,
  };
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const importEventAttendees = onCall(
  appCheckCallableOptions,
  (request) => importEventAttendeesHandler(request)
);

export const markEventAttendeeAttendance = onCall(
  appCheckCallableOptions,
  (request) => markEventAttendeeAttendanceHandler(request)
);

export const setEventAttendeeAttendance = onCall(
  appCheckCallableOptions,
  (request) => setEventAttendeeAttendanceHandler(request)
);

export const registerPublicEvent = onCall(
  appCheckCallableOptions,
  (request) => registerPublicEventHandler(request)
);
