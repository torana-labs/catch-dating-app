import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
} from "../shared/programAuthority";
import type {
  ProgramVendorBillDocument,
  TransportTripDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ReconcileProgramVendorBillCallablePayload} from
  "../shared/generated/reconcileProgramVendorBillCallablePayload";
import type {ProgramVendorBillCallableResponse} from
  "../shared/generated/programVendorBillCallableResponse";
import {validateReconcileProgramVendorBillCallablePayload} from
  "../shared/generated/validators/reconcileProgramVendorBillInput";

/* firestore-index: transportTrips (
  programId:ASCENDING,
  vendorId:ASCENDING
) */

// Vendor bill reconcile (#1582 item 4). A vendor's bill is checked line
// by line against the trips recorded for it in this programme, using the
// rate frozen on each trip at dispatch (rateSnapshot). One bill per vendor
// per programme.

export const PROGRAM_VENDOR_BILLS_COLLECTION = "programVendorBills";
const TRIP_LIMIT = 500;
const UNBILLED_SHOWN = 100;

type Line = ProgramVendorBillDocument["lines"][number];
type Totals = ProgramVendorBillDocument["totals"];

export function programVendorBillDocId(programId: string, vendorId: string):
  string {
  return `${programId}_${vendorId}`;
}

export interface VendorBillDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: VendorBillDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

interface RecordedTrip {
  tripId: string;
  voided: boolean;
  recordedMinor: number | null;
  currency: string | null;
  departedAtMillis: number | null;
  plateDisplay: string | null;
  destinationLabel: string | null;
}

/** The bill reference names a trip by id, or by the eight-character id
 *  the trip ledger and its export show. */
function findTrip(trips: Map<string, RecordedTrip>, line: {tripId?: string;
  reference: string}): RecordedTrip | null {
  if (line.tripId) return trips.get(line.tripId) ?? null;
  const reference = line.reference.trim();
  const exact = trips.get(reference);
  if (exact) return exact;
  if (reference.length < 6) return null;
  const prefixed = [...trips.values()].filter((trip) =>
    trip.tripId.startsWith(reference));
  return prefixed.length === 1 ? prefixed[0] : null;
}

/** Checks each billed line against the recorded trips. */
export function checkBillLines(
  input: {reference: string; tripId?: string | null; billedMinor: number}[],
  trips: Map<string, RecordedTrip>,
): {lines: Line[]; totals: Totals} {
  const seen = new Set<string>();
  const lines: Line[] = input.map((line, index) => {
    const trip = findTrip(trips, {tripId: line.tripId ?? undefined,
      reference: line.reference});
    let check: Line["check"];
    if (!trip) check = "noTrip";
    else if (seen.has(trip.tripId)) check = "duplicate";
    else if (trip.voided) check = "voided";
    else if (trip.recordedMinor === null) check = "noRate";
    else check = trip.recordedMinor === line.billedMinor ?
      "matches" : "amountDiffers";
    if (trip) seen.add(trip.tripId);
    return {
      lineId: `line-${index + 1}`,
      reference: line.reference,
      tripId: trip?.tripId ?? null,
      billedMinor: line.billedMinor,
      recordedMinor: trip && !trip.voided ? trip.recordedMinor : null,
      check,
    };
  });
  const live = [...trips.values()].filter((trip) => !trip.voided);
  const billedMinor = lines.reduce((sum, line) => sum + line.billedMinor, 0);
  const recordedMinor = lines.reduce((sum, line) =>
    sum + (line.check === "duplicate" ? 0 : line.recordedMinor ?? 0), 0);
  const questionMinor = lines.reduce((sum, line) => sum +
    (line.check === "matches" ? 0 :
      Math.max(0, line.billedMinor - (line.check === "duplicate" ?
        0 : line.recordedMinor ?? 0))), 0);
  return {
    lines,
    totals: {
      billedMinor,
      recordedMinor,
      questionMinor,
      billedTrips: lines.length,
      recordedTrips: live.length,
      unbilledTrips: live.filter((trip) => !seen.has(trip.tripId)).length,
    },
  };
}

async function loadTrips(db: FirebaseFirestore.Firestore, programId: string,
  vendorId: string, organizerId: string): Promise<Map<string, RecordedTrip>> {
  const snap = await db.collection("transportTrips")
    .where("programId", "==", programId)
    .where("vendorId", "==", vendorId).limit(TRIP_LIMIT).get();
  const trips = new Map<string, RecordedTrip>();
  for (const doc of snap.docs) {
    const trip = doc.data() as TransportTripDocument;
    if (trip.organizerId !== organizerId) continue;
    trips.set(doc.id, {
      tripId: doc.id,
      voided: trip.status === "voided",
      recordedMinor: trip.rateSnapshot?.amountMinor ?? null,
      currency: trip.rateSnapshot?.currency ?? null,
      departedAtMillis: trip.departedAt ?
        staffTimestampMillis(trip.departedAt) : null,
      plateDisplay: trip.plateDisplay ?? null,
      destinationLabel: trip.destinationLabel ?? null,
    });
  }
  return trips;
}

function respond(params: {programId: string; vendorId: string;
  vendorName: string; trips: Map<string, RecordedTrip>;
  bill: ProgramVendorBillDocument | null}):
  ProgramVendorBillCallableResponse {
  const {trips, bill} = params;
  const checked = bill ? checkBillLines(bill.lines, trips) : null;
  const billed = new Set(checked?.lines.flatMap((line) =>
    line.tripId ? [line.tripId] : []) ?? []);
  const live = [...trips.values()].filter((trip) => !trip.voided);
  const currency = bill?.currency ??
    live.find((trip) => trip.currency)?.currency ?? "INR";
  return {
    programId: params.programId,
    vendorId: params.vendorId,
    vendorName: params.vendorName,
    currency,
    bill: bill && checked ? {
      invoiceNumber: bill.invoiceNumber,
      receivedAtMillis: bill.receivedAtMillis,
      status: bill.status,
      note: bill.note,
      lines: checked.lines,
      totals: checked.totals,
      approvedMinor: bill.approvedMinor,
      approvedAtMillis: bill.approvedAtMillis,
      revision: bill.revision,
    } : null,
    recordedTrips: live.length,
    recordedMinor: live.reduce((sum, trip) => sum + (trip.recordedMinor ?? 0),
      0),
    unbilled: live.filter((trip) => !billed.has(trip.tripId))
      .sort((a, b) => (a.departedAtMillis ?? 0) - (b.departedAtMillis ?? 0))
      .slice(0, UNBILLED_SHOWN)
      .map((trip) => ({tripId: trip.tripId,
        departedAtMillis: trip.departedAtMillis,
        plateDisplay: trip.plateDisplay,
        destinationLabel: trip.destinationLabel,
        recordedMinor: trip.recordedMinor})),
  };
}

/** Reviews, checks, questions or approves one vendor's bill. */
export async function reconcileProgramVendorBillHandler(
  request: CallableRequest<unknown>,
  deps: VendorBillDeps = defaultDeps,
): Promise<ProgramVendorBillCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<ReconcileProgramVendorBillCallablePayload>(
      request, validateReconcileProgramVendorBillCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "reconcileProgramVendorBill",
    {maxRequests: 60, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireProgramDuty(access, "reconciliationViewer");
  const organizerId = access.program.organizerId;
  const vendor = (await db.collection("transportVendors")
    .doc(data.vendorId).get()).data() as Record<string, unknown> | undefined;
  const programIds = Array.isArray(vendor?.programIds) ?
    vendor!.programIds as unknown[] : [];
  if (!vendor || vendor.organizerId !== organizerId ||
      !programIds.includes(data.programId)) {
    throw new HttpsError("not-found", "Vendor not found in this programme.");
  }
  const vendorName = String(vendor.name ?? "");
  const ref = db.collection(PROGRAM_VENDOR_BILLS_COLLECTION)
    .doc(programVendorBillDocId(data.programId, data.vendorId));
  const trips = await loadTrips(db, data.programId, data.vendorId,
    organizerId);
  if (data.action === "review") {
    const bill = (await ref.get()).data() as ProgramVendorBillDocument |
      undefined;
    return respond({programId: data.programId, vendorId: data.vendorId,
      vendorName, trips, bill: bill ?? null});
  }
  if (access.role !== "manager") {
    throw new HttpsError("permission-denied",
      "Only a programme manager can change a vendor bill.");
  }
  requireProgramMutable(access.program);
  if (!data.requestId || data.expectedRevision === undefined) {
    throw new HttpsError("invalid-argument",
      "requestId and expectedRevision are required.");
  }
  if (data.action === "check" && !data.lines) {
    throw new HttpsError("invalid-argument", "Bill lines are required.");
  }
  if (data.action === "question" && !data.note) {
    throw new HttpsError("invalid-argument", "A note is required.");
  }
  const requestHash = hashRequest({op: "reconcileProgramVendorBill",
    programId: data.programId, vendorId: data.vendorId, action: data.action,
    invoiceNumber: data.invoiceNumber ?? null,
    receivedAtMillis: data.receivedAtMillis ?? null,
    lines: data.lines ?? null, note: data.note ?? null,
    expectedRevision: data.expectedRevision});
  const stored = await db.runTransaction(async (tx):
    Promise<ProgramVendorBillDocument> => {
    const current = (await tx.get(ref)).data() as ProgramVendorBillDocument |
      undefined;
    if (current && current.lastRequestId === data.requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return current;
    }
    const revision = current?.revision ?? 0;
    if (revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "Someone else changed this bill.",
        {reason: "staleRevision", revision});
    }
    if (!current && data.action !== "check") {
      throw new HttpsError("failed-precondition",
        "Check the bill before questioning or approving it.");
    }
    if (current?.status === "approved" && data.action !== "check") {
      throw new HttpsError("failed-precondition",
        "This bill is already approved.");
    }
    const nowMillis = deps.now().toMillis();
    const lines = data.action === "check" ? data.lines! : current!.lines;
    const checked = checkBillLines(lines, trips);
    const currency = [...trips.values()].find((trip) => trip.currency)
      ?.currency ?? current?.currency ?? "INR";
    const next: ProgramVendorBillDocument = {
      programId: data.programId,
      organizerId,
      vendorId: data.vendorId,
      invoiceNumber: data.invoiceNumber ?? current?.invoiceNumber ?? null,
      receivedAtMillis: data.receivedAtMillis ??
        current?.receivedAtMillis ?? null,
      currency,
      lines: checked.lines,
      totals: checked.totals,
      status: data.action === "approve" ? "approved" :
        data.action === "question" ? "questioned" : "open",
      note: data.action === "question" ? data.note! : current?.note ?? null,
      approvedMinor: data.action === "approve" ?
        checked.totals.recordedMinor : null,
      approvedAtMillis: data.action === "approve" ? nowMillis : null,
      approvedByUid: data.action === "approve" ? actorUid : null,
      updatedAtMillis: nowMillis,
      revision: revision + 1,
      lastRequestId: data.requestId!,
      lastRequestHash: requestHash,
    };
    tx.set(ref, next);
    return next;
  });
  return respond({programId: data.programId, vendorId: data.vendorId,
    vendorName, trips, bill: stored});
}

export const reconcileProgramVendorBill = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => reconcileProgramVendorBillHandler(request),
);
