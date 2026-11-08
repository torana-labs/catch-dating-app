import * as admin from "firebase-admin";
import {createHmac, timingSafeEqual} from "node:crypto";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
} from "../shared/programAuthority";
import {householdRsvpSecret} from "../programRsvp/householdRsvp";
import {programGuestBrandingField} from "./programBranding";
import {projectTripManifest, readTripDispatchSnapshot} from
  "../transport/tripManifestProjection";
import type {ProgramGuestDocument, ProgramTravelLegDocument,
  TransportTripDocument} from "../shared/generated/firestoreAdminTypes";
import type {IssueProgramWebLinkCallablePayload} from
  "../shared/generated/issueProgramWebLinkCallablePayload";
import type {ProgramWebLinkCallableResponse} from
  "../shared/generated/programWebLinkCallableResponse";
import type {GetProgramDriverTripCallablePayload} from
  "../shared/generated/getProgramDriverTripCallablePayload";
import type {ProgramDriverTripCallableResponse} from
  "../shared/generated/programDriverTripCallableResponse";
import type {GetProgramVendorRunSheetCallablePayload} from
  "../shared/generated/getProgramVendorRunSheetCallablePayload";
import type {ProgramVendorRunSheetCallableResponse} from
  "../shared/generated/programVendorRunSheetCallableResponse";
import {validateIssueProgramWebLinkCallablePayload} from
  "../shared/generated/validators/issueProgramWebLinkInput";
import {validateGetProgramDriverTripCallablePayload} from
  "../shared/generated/validators/getProgramDriverTripInput";
import {validateGetProgramVendorRunSheetCallablePayload} from
  "../shared/generated/validators/getProgramVendorRunSheetInput";

/* firestore-index: transportTrips (
  programId:ASCENDING,
  vendorId:ASCENDING
) */

// Signed web links for people without a Catch account (a driver, a
// vendor). Same format as the household RSVP link,
// `${base64url(payloadJson)}.${base64url(hmacSha256)}`, and the same
// secret, but the HMAC input is domain-separated by kind, and the payload
// shape (kind + subjectId, no householdId) never verifies as a household
// token or the other way round. Tokens carry ids and an expiry only.

export type WebLinkKind = "driverTrip" | "vendorRunSheet" |
  "hotelHandover" | "hamperPorter" | "family";

export interface WebLinkPayload {
  v: 1;
  kind: WebLinkKind;
  programId: string;
  subjectId: string;
  expiresAtMillis: number;
}

const DAY = 24 * 60 * 60 * 1000;
/** A driver link lasts a day; a vendor link to the day after the
 *  programme, two weeks at most. */
const DRIVER_LINK_MILLIS = DAY;
const VENDOR_LINK_MAX_MILLIS = 14 * DAY;
/** A porter's hamper link covers the arrival rush. */
const PORTER_LINK_MILLIS = 2 * DAY;
/** The family's link is shared weeks ahead: it lasts to the day after the
 *  programme, four months at most. */
const FAMILY_LINK_MAX_MILLIS = 120 * DAY;

function sign(kind: WebLinkKind, encoded: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`program-web-link:v1:${kind}:${encoded}`).digest("base64url");
}

export function mintWebLinkToken(
  payload: Omit<WebLinkPayload, "v">,
  secret: string,
): string {
  if (!secret) throw new RangeError("Web link secret must be non-empty.");
  const body: WebLinkPayload = {v: 1, ...payload};
  const encoded = Buffer.from(JSON.stringify(body), "utf8")
    .toString("base64url");
  return `${encoded}.${sign(payload.kind, encoded, secret)}`;
}

export type VerifyWebLinkResult =
  {ok: true; payload: WebLinkPayload} |
  {ok: false; reason: "malformed" | "badSignature" | "expired" | "wrongKind"};

export function verifyWebLinkToken(
  token: string,
  kind: WebLinkKind,
  secret: string,
  nowMillis: number,
): VerifyWebLinkResult {
  const [encoded, supplied, ...extra] = token.split(".");
  if (!encoded || !supplied || extra.length > 0) {
    return {ok: false, reason: "malformed"};
  }
  const expected = Buffer.from(sign(kind, encoded, secret));
  const given = Buffer.from(supplied);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return {ok: false, reason: "badSignature"};
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return {ok: false, reason: "malformed"};
  }
  if (!payload || payload.v !== 1 || typeof payload.programId !== "string" ||
      typeof payload.subjectId !== "string" ||
      !Number.isSafeInteger(payload.expiresAtMillis)) {
    return {ok: false, reason: "malformed"};
  }
  if (payload.kind !== kind) return {ok: false, reason: "wrongKind"};
  if ((payload.expiresAtMillis as number) <= nowMillis) {
    return {ok: false, reason: "expired"};
  }
  return {ok: true, payload: payload as unknown as WebLinkPayload};
}

export interface WebLinkDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  secret: () => string;
}

export const defaultWebLinkDeps: WebLinkDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  secret: () => householdRsvpSecret.value(),
};

export function verifyWebLinkOrThrow(token: string, kind: WebLinkKind,
  deps: WebLinkDeps): WebLinkPayload {
  const result = verifyWebLinkToken(token, kind, deps.secret(),
    deps.now().toMillis());
  if (!result.ok) {
    throw new HttpsError(result.reason === "expired" ?
      "deadline-exceeded" : "permission-denied",
    result.reason === "expired" ? "This link has expired." :
      "This link is not valid.");
  }
  return result.payload;
}

/**
 * Mints a driver, vendor, hotel or family link. Dispatchers (and managers)
 * mint driver links for a trip of this programme; managers mint vendor
 * links for a vendor bound to this programme, and the family link for the
 * programme itself (subjectId = programId).
 */
export async function issueProgramWebLinkHandler(
  request: CallableRequest<unknown>,
  deps: WebLinkDeps = defaultWebLinkDeps,
): Promise<ProgramWebLinkCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<IssueProgramWebLinkCallablePayload>(
    request, validateIssueProgramWebLinkCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "issueProgramWebLink", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const now = deps.now().toMillis();
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  requireProgramMutable(access.program);
  const organizerId = access.program.organizerId;
  let expiresAtMillis: number;
  if (data.kind === "driverTrip") {
    requireProgramDuty(access, "transportDispatcher");
    const trip = (await db.collection("transportTrips")
      .doc(data.subjectId).get()).data() as Record<string, unknown> |
      undefined;
    if (!trip || trip.programId !== data.programId ||
        trip.organizerId !== organizerId || trip.status === "voided") {
      throw new HttpsError("not-found", "Trip not found in this programme.");
    }
    expiresAtMillis = now + DRIVER_LINK_MILLIS;
  } else if (data.kind === "hotelHandover" || data.kind === "hamperPorter") {
    // Hotel links: the front desk's rooming list and guest IDs (guest
    // relations), or the porters' hamper list (hotel desk).
    requireProgramDuty(access, data.kind === "hotelHandover" ?
      "guestRelations" : "hotelDesk");
    const hotel = (await db.collection("programHotels")
      .doc(data.subjectId).get()).data() as Record<string, unknown> |
      undefined;
    if (!hotel || hotel.programId !== data.programId ||
        hotel.organizerId !== organizerId) {
      throw new HttpsError("not-found", "Hotel not found in this programme.");
    }
    const programEnd = staffTimestampMillis(access.program.endsAt) + DAY;
    expiresAtMillis = data.kind === "hamperPorter" ?
      now + PORTER_LINK_MILLIS :
      Math.min(Math.max(programEnd, now + DAY), now + VENDOR_LINK_MAX_MILLIS);
  } else if (data.kind === "family") {
    if (access.role !== "manager") {
      throw new HttpsError("permission-denied",
        "Only a programme manager can share the family link.");
    }
    if (data.subjectId !== data.programId) {
      throw new HttpsError("invalid-argument",
        "A family link is for the programme itself.");
    }
    const programEnd = staffTimestampMillis(access.program.endsAt) + DAY;
    expiresAtMillis = Math.min(Math.max(programEnd, now + DAY),
      now + FAMILY_LINK_MAX_MILLIS);
  } else {
    if (access.role !== "manager") {
      throw new HttpsError("permission-denied",
        "Only a programme manager can share a vendor run sheet.");
    }
    const vendor = (await db.collection("transportVendors")
      .doc(data.subjectId).get()).data() as Record<string, unknown> |
      undefined;
    const programIds = Array.isArray(vendor?.programIds) ?
      vendor!.programIds as unknown[] : [];
    if (!vendor || vendor.organizerId !== organizerId ||
        !programIds.includes(data.programId)) {
      throw new HttpsError("not-found",
        "Vendor not found in this programme.");
    }
    const programEnd = staffTimestampMillis(access.program.endsAt) + DAY;
    expiresAtMillis = Math.min(Math.max(programEnd, now + DAY),
      now + VENDOR_LINK_MAX_MILLIS);
  }
  return {
    kind: data.kind,
    token: mintWebLinkToken({kind: data.kind, programId: data.programId,
      subjectId: data.subjectId, expiresAtMillis}, deps.secret()),
    expiresAtMillis,
  };
}

/** A driver's trip through their link: route, car and passengers. */
export async function getProgramDriverTripHandler(
  request: CallableRequest<unknown>,
  deps: WebLinkDeps = defaultWebLinkDeps,
): Promise<ProgramDriverTripCallableResponse> {
  const data = validateCallableWithAjv<GetProgramDriverTripCallablePayload>(
    request, validateGetProgramDriverTripCallablePayload);
  const link = verifyWebLinkOrThrow(data.token, "driverTrip", deps);
  const db = deps.firestore();
  await deps.checkRateLimit(db, `driverTrip:${link.subjectId}`,
    "getProgramDriverTrip", {maxRequests: 120, windowMs: 60 * 1000});
  const [programSnap, tripSnap] = await Promise.all([
    db.collection("organizerPrograms").doc(link.programId).get(),
    db.collection("transportTrips").doc(link.subjectId).get(),
  ]);
  const program = programSnap.data() as Record<string, unknown> | undefined;
  const trip = tripSnap.data() as TransportTripDocument | undefined;
  if (!program || program.status === "archived" || !trip ||
      trip.programId !== link.programId ||
      trip.organizerId !== program.organizerId ||
      trip.status === "voided" || trip.anonymizedAt) {
    throw new HttpsError("not-found", "This trip is no longer available.");
  }
  const snapshot = readTripDispatchSnapshot(trip);
  const legs = new Map<string, ProgramTravelLegDocument>();
  const guests = new Map<string, ProgramGuestDocument>();
  if (!snapshot) {
    const legSnaps = await Promise.all(trip.legIds.map((id) =>
      db.collection("programTravelLegs").doc(id).get()));
    for (const snap of legSnaps) {
      const leg = snap.data() as ProgramTravelLegDocument | undefined;
      if (leg) legs.set(snap.id, leg);
    }
    const guestSnaps = await Promise.all([...legs.values()].map((leg) =>
      db.collection("programGuests").doc(leg.guestId).get()));
    for (const snap of guestSnaps) {
      const guest = snap.data() as ProgramGuestDocument | undefined;
      if (guest) guests.set(snap.id, guest);
    }
  }
  const manifest = projectTripManifest(trip, snapshot, legs, guests);
  const [pickupSnap, hotelSnap] = await Promise.all([
    trip.pickupPointId ? db.collection("programPickupPoints")
      .doc(trip.pickupPointId).get() : Promise.resolve(null),
    trip.destinationHotelId ? db.collection("programHotels")
      .doc(trip.destinationHotelId).get() : Promise.resolve(null),
  ]);
  const label = (snap: FirebaseFirestore.DocumentSnapshot | null,
    field: string) => {
    const doc = snap?.data() as Record<string, unknown> | undefined;
    return doc && doc.programId === link.programId &&
      typeof doc[field] === "string" ? doc[field] as string : null;
  };
  return {
    programId: link.programId,
    tripId: link.subjectId,
    programTitle: String(program.title ?? ""),
    status: trip.status,
    vehicleClassLabel: manifest.vehicleClassLabel,
    plateDisplay: trip.plateDisplay ?? null,
    pickupLabel: label(pickupSnap, "label") ?? label(pickupSnap, "name"),
    destinationLabel: label(hotelSnap, "name") ??
      trip.destinationLabel ?? null,
    departedAtMillis: trip.departedAt ?
      staffTimestampMillis(trip.departedAt) : null,
    passengerCount: trip.passengerCount,
    passengers: snapshot ?
      snapshot.manifest.map((entry) => ({name: entry.guestDisplayName,
        passengers: entry.passengers, luggageUnits: entry.luggageUnits})) :
      manifest.guestNames.map((name) => ({name, passengers: 1,
        luggageUnits: 0})),
    ...programGuestBrandingField(program),
    expiresAtMillis: link.expiresAtMillis,
  };
}

/** A vendor's run sheet: the functions in order and their trips. */
export async function getProgramVendorRunSheetHandler(
  request: CallableRequest<unknown>,
  deps: WebLinkDeps = defaultWebLinkDeps,
): Promise<ProgramVendorRunSheetCallableResponse> {
  const data =
    validateCallableWithAjv<GetProgramVendorRunSheetCallablePayload>(
      request, validateGetProgramVendorRunSheetCallablePayload);
  const link = verifyWebLinkOrThrow(data.token, "vendorRunSheet", deps);
  const db = deps.firestore();
  await deps.checkRateLimit(db, `vendorRunSheet:${link.subjectId}`,
    "getProgramVendorRunSheet", {maxRequests: 120, windowMs: 60 * 1000});
  const [programSnap, vendorSnap] = await Promise.all([
    db.collection("organizerPrograms").doc(link.programId).get(),
    db.collection("transportVendors").doc(link.subjectId).get(),
  ]);
  const program = programSnap.data() as Record<string, unknown> | undefined;
  const vendor = vendorSnap.data() as Record<string, unknown> | undefined;
  const programIds = Array.isArray(vendor?.programIds) ?
    vendor!.programIds as unknown[] : [];
  if (!program || program.status === "archived" || !vendor ||
      vendor.organizerId !== program.organizerId ||
      !programIds.includes(link.programId)) {
    throw new HttpsError("not-found",
      "This run sheet is no longer available.");
  }
  const organizerId = program.organizerId;
  const [functionSnap, tripSnap, pickupSnap, hotelSnap] = await Promise.all([
    db.collection("programFunctions")
      .where("programId", "==", link.programId).limit(50).get(),
    db.collection("transportTrips")
      .where("programId", "==", link.programId)
      .where("vendorId", "==", link.subjectId).limit(300).get(),
    db.collection("programPickupPoints")
      .where("programId", "==", link.programId).limit(32).get(),
    db.collection("programHotels")
      .where("programId", "==", link.programId).limit(64).get(),
  ]);
  const names = new Map<string, string>();
  for (const doc of [...pickupSnap.docs, ...hotelSnap.docs]) {
    const place = doc.data() as Record<string, unknown>;
    const name = place.label ?? place.name;
    if (place.organizerId === organizerId && typeof name === "string") {
      names.set(doc.id, name);
    }
  }
  return {
    programId: link.programId,
    vendorId: link.subjectId,
    vendorName: String(vendor.name ?? ""),
    programTitle: String(program.title ?? ""),
    timezone: String(program.timezone ?? "UTC"),
    functions: functionSnap.docs.flatMap((doc) => {
      const fn = doc.data() as Record<string, unknown>;
      if (fn.organizerId !== organizerId || fn.status === "cancelled") {
        return [];
      }
      return [{functionId: doc.id, name: String(fn.name ?? ""),
        venueName: String(fn.venueName ?? ""),
        startsAtMillis: staffTimestampMillis(fn.startsAt),
        endsAtMillis: staffTimestampMillis(fn.endsAt)}];
    }).sort((a, b) => a.startsAtMillis - b.startsAtMillis),
    trips: tripSnap.docs.flatMap((doc) => {
      const trip = doc.data() as TransportTripDocument;
      if (trip.organizerId !== organizerId || trip.status === "voided") {
        return [];
      }
      return [{tripId: doc.id, status: trip.status,
        plateDisplay: trip.plateDisplay ?? null,
        pickupLabel: trip.pickupPointId ?
          names.get(trip.pickupPointId) ?? null : null,
        destinationLabel: trip.destinationHotelId ?
          names.get(trip.destinationHotelId) ?? null :
          trip.destinationLabel ?? null,
        departedAtMillis: trip.departedAt ?
          staffTimestampMillis(trip.departedAt) : null,
        arrivedAtMillis: trip.arrivedAt ?
          staffTimestampMillis(trip.arrivedAt) : null,
        passengerCount: trip.passengerCount}];
    }).sort((a, b) => (a.departedAtMillis ?? 0) - (b.departedAtMillis ?? 0)),
    ...programGuestBrandingField(program),
    expiresAtMillis: link.expiresAtMillis,
  };
}

const webLinkLimits = {timeoutSeconds: 60, maxInstances: 20};

export const issueProgramWebLink = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret], webLinkLimits),
  (request) => issueProgramWebLinkHandler(request),
);
export const getProgramDriverTrip = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret], webLinkLimits),
  (request) => getProgramDriverTripHandler(request),
);
export const getProgramVendorRunSheet = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret], webLinkLimits),
  (request) => getProgramVendorRunSheetHandler(request),
);
