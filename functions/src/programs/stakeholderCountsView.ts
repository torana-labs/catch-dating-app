import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  allowedHotelIds,
  programProjectionExpiresAt,
  requireProgramAccess,
  requireProgramDuty,
} from "../shared/programAuthority";
import type {
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
  ProgramTravelLegDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ProgramIdCallablePayload} from
  "../shared/generated/programIdCallablePayload";
import type {ProgramStakeholderCountsCallableResponse} from
  "../shared/generated/programStakeholderCountsCallableResponse";
import {
  validateProgramIdCallablePayload,
} from "../shared/generated/validators/programIdInput";
import {
  computeStakeholderCounts,
  type StakeholderFunctionGuestRow,
  type StakeholderFunctionRow,
  type StakeholderGuestRow,
  type StakeholderLegRow,
} from "./programStakeholderCounts";

// Counts are decision inputs, so this view fails closed rather than
// silently truncating a program past the read cap.
const ROW_LIMIT = 5000;

export interface StakeholderCountsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: StakeholderCountsDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

async function collect<T>(
  query: FirebaseFirestore.Query,
  label: string,
  map: (snap: FirebaseFirestore.QueryDocumentSnapshot) => T | null,
): Promise<T[]> {
  const snap = await query.limit(ROW_LIMIT + 1).get();
  if (snap.size > ROW_LIMIT) {
    throw new HttpsError("resource-exhausted",
      `Program ${label} exceed the counts read cap.`);
  }
  const rows: T[] = [];
  for (const doc of snap.docs) {
    const row = map(doc);
    if (row !== null) rows.push(row);
  }
  return rows;
}

/**
 * Counts-only program overview for stakeholderViewer staff and managers.
 * Translates Firestore rows into the resolver's row shapes; the resolver
 * output is the response — no names, contacts, or notes ever cross.
 */
export async function getProgramStakeholderCountsHandler(
  request: CallableRequest<unknown>,
  deps: StakeholderCountsDeps = defaultDeps,
): Promise<ProgramStakeholderCountsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramIdCallablePayload>(
    request, validateProgramIdCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramStakeholderCounts", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const assignments = requireProgramDuty(access, "stakeholderViewer");
  const now = deps.now();

  const [guests, households, functions, functionGuests, legs] =
    await Promise.all([
      collect<StakeholderGuestRow>(
        db.collection("programGuests")
          .where("programId", "==", data.programId),
        "guests",
        (snap) => {
          const doc = snap.data() as ProgramGuestDocument;
          return {
            guestId: snap.id,
            householdId: doc.householdId ?? null,
            invitationStatus: doc.invitationStatus,
          };
        }),
      collect(db.collection("programHouseholds")
        .where("programId", "==", data.programId),
      "households",
      (snap) => ({householdId: snap.id})),
      collect<StakeholderFunctionRow>(
        db.collection("programFunctions")
          .where("programId", "==", data.programId),
        "functions",
        (snap) => {
          const doc = snap.data() as ProgramFunctionDocument;
          return {
            functionId: snap.id,
            invitationMode: doc.invitationMode ?? null,
            status: doc.status,
          };
        }),
      collect<StakeholderFunctionGuestRow>(
        db.collection("programFunctionGuests")
          .where("programId", "==", data.programId),
        "function guest rows",
        (snap) => {
          const doc = snap.data() as ProgramFunctionGuestDocument;
          return {
            functionId: doc.functionId,
            guestId: doc.guestId,
            invited: doc.invited,
            rsvpStatus: doc.rsvpStatus,
            attendanceStatus: doc.attendanceStatus,
            partySize: doc.partySize ?? null,
          };
        }),
      collect<StakeholderLegRow>(
        db.collection("programTravelLegs")
          .where("programId", "==", data.programId),
        "travel legs",
        (snap) => {
          const doc = snap.data() as ProgramTravelLegDocument;
          return {
            legId: snap.id,
            guestId: doc.guestId,
            destinationHotelId: doc.destinationHotelId ?? null,
            passengers: doc.passengers,
            readiness: doc.readiness,
          };
        }),
    ]);

  const counts = computeStakeholderCounts({
    guests, households, functions, functionGuests, legs,
  });

  // stakeholderViewer duties may carry a hotel scope; occupancy outside the
  // granted hotels is not the viewer's business.
  const allowedHotels = allowedHotelIds(access, "stakeholderViewer");
  const hotels = allowedHotels === null ? counts.hotels :
    counts.hotels.filter((row) => allowedHotels.has(row.hotelId));

  return {
    programId: data.programId,
    serverTimeMillis: now.toMillis(),
    accessExpiresAtMillis: programProjectionExpiresAt(access, assignments),
    guestCount: counts.guestCount,
    householdCount: counts.householdCount,
    functions: counts.functions,
    hotels,
  };
}

export const getProgramStakeholderCounts = onCall(
  appCheckCallableOptionsWithLimits(
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => getProgramStakeholderCountsHandler(request)
);
