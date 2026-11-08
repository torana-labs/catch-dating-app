import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {
  appCheckCallableOptionsWithLimits,
  appCheckCallableOptionsWithSecrets,
} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
} from "../shared/programAuthority";
import {householdRsvpSecret} from "../programRsvp/householdRsvp";
import {verifyHouseholdToken} from "../programRsvp/rsvpLinkTokens";
import {verifyWebLinkToken} from "./programWebLinks";
import {
  defaultProgramAssetDeps,
  deleteProgramFiles,
  READ_URL_MILLIS,
  requireProgramAsset,
  requireValid,
  signedReadUrl,
  type ProgramAssetDeps,
} from "./programAssets";
import type {
  ProgramGuestIdDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {SubmitProgramGuestIdCallablePayload} from
  "../shared/generated/submitProgramGuestIdCallablePayload";
import type {DecideProgramGuestIdCallablePayload} from
  "../shared/generated/decideProgramGuestIdCallablePayload";
import type {ProgramGuestIdCallableResponse} from
  "../shared/generated/programGuestIdCallableResponse";
import type {ListProgramIdTrackerCallablePayload} from
  "../shared/generated/listProgramIdTrackerCallablePayload";
import type {ProgramIdTrackerCallableResponse} from
  "../shared/generated/programIdTrackerCallableResponse";
import type {GetProgramHotelHandoverCallablePayload} from
  "../shared/generated/getProgramHotelHandoverCallablePayload";
import type {ProgramHotelHandoverCallableResponse} from
  "../shared/generated/programHotelHandoverCallableResponse";
import {validateSubmitProgramGuestIdCallablePayload} from
  "../shared/generated/validators/submitProgramGuestIdInput";
import {validateDecideProgramGuestIdCallablePayload} from
  "../shared/generated/validators/decideProgramGuestIdInput";
import {validateListProgramIdTrackerCallablePayload} from
  "../shared/generated/validators/listProgramIdTrackerInput";
import {validateGetProgramHotelHandoverCallablePayload} from
  "../shared/generated/validators/getProgramHotelHandoverInput";

import {validateProgramGuestIdCallableResponse} from
  "../shared/generated/validators/programGuestIdOutput";
import {validateProgramGuestIdDocument} from
  "../shared/generated/validators/programGuestIdDocument";
import {validateProgramIdTrackerCallableResponse} from
  "../shared/generated/validators/programIdTrackerOutput";
import {validateProgramHotelHandoverCallableResponse} from
  "../shared/generated/validators/programHotelHandoverOutput";
// Guest IDs for the hotels (#1582 item 3). The household submits through
// its RSVP link; guest relations check each one; the hotel front desk
// reads accepted IDs through a hotelHandover link. Only the last four
// characters of an ID number are stored. Images stay in private Storage
// and leave the server only as short-lived signed URLs.

export const PROGRAM_GUEST_IDS_COLLECTION = "programGuestIds";
const HOTEL_VIEWS_KEPT = 20;
const ROSTER_LIMIT = 2000;

export function programGuestIdDocId(programId: string, guestId: string):
  string {
  return `${programId}_${guestId}`;
}

type GuestIdDeps = ProgramAssetDeps;

function guestIdReply(doc: Pick<ProgramGuestIdDocument, "programId" |
  "guestId" | "status" | "revision">): ProgramGuestIdCallableResponse {
  return requireValid(validateProgramGuestIdCallableResponse,
    {programId: doc.programId, guestId: doc.guestId, status: doc.status,
      revision: doc.revision}, "guest ID result");
}

/** A household saves one member's ID through its RSVP link. */
export async function submitProgramGuestIdHandler(
  request: CallableRequest<unknown>,
  deps: GuestIdDeps = defaultProgramAssetDeps,
): Promise<ProgramGuestIdCallableResponse> {
  const data = validateCallableWithAjv<SubmitProgramGuestIdCallablePayload>(
    request, validateSubmitProgramGuestIdCallablePayload);
  const verified = verifyHouseholdToken(data.token, deps.secret(),
    deps.now().toMillis());
  if (!verified.ok) {
    throw new HttpsError("unauthenticated",
      "This link is invalid or has expired.");
  }
  const {programId, householdId} = verified.payload;
  const db = deps.firestore();
  await deps.checkRateLimit(db, `household:${householdId}`,
    "submitProgramGuestId", {maxRequests: 30, windowMs: 60 * 1000});
  const requestHash = hashRequest({op: "submitProgramGuestId", programId,
    householdId, guestId: data.guestId, idKind: data.idKind,
    numberLast4: data.numberLast4 ?? null, frontAssetId: data.frontAssetId,
    backAssetId: data.backAssetId ?? null,
    visaAssetId: data.visaAssetId ?? null});
  const ref = db.collection(PROGRAM_GUEST_IDS_COLLECTION)
    .doc(programGuestIdDocId(programId, data.guestId));
  const existing = (await ref.get()).data() as ProgramGuestIdDocument |
    undefined;
  if (existing?.lastRequestId === data.requestId) {
    if (existing.lastRequestHash !== requestHash) {
      throw new HttpsError("failed-precondition",
        "This request id was already used for a different change.");
    }
    return guestIdReply(existing);
  }
  const bucket = deps.storageBucket();
  const asset = (assetId: string | undefined) => assetId ?
    requireProgramAsset({bucket, programId, kind: "guestId", assetId,
      subject: householdId}) : Promise.resolve(null);
  const [front, back, visa] = await Promise.all([
    asset(data.frontAssetId), asset(data.backAssetId),
    asset(data.visaAssetId)]);
  let replaced: (string | null)[] = [];
  const result = await db.runTransaction(async (tx) => {
    const [programSnap, householdSnap, guestSnap, currentSnap] =
      await Promise.all([
        tx.get(db.collection("organizerPrograms").doc(programId)),
        tx.get(db.collection("programHouseholds").doc(householdId)),
        tx.get(db.collection("programGuests").doc(data.guestId)),
        tx.get(ref),
      ]);
    const program = programSnap.data() as Record<string, unknown> |
      undefined;
    const household = householdSnap.data() as Record<string, unknown> |
      undefined;
    const guest = guestSnap.data() as Record<string, unknown> | undefined;
    if (!program) throw new HttpsError("not-found", "Programme not found.");
    requireProgramMutable(program as {status: "active"});
    const members = Array.isArray(household?.memberGuestIds) ?
      household!.memberGuestIds as unknown[] : [];
    if (!household || household.programId !== programId ||
        !members.includes(data.guestId) || !guest ||
        guest.programId !== programId) {
      throw new HttpsError("permission-denied",
        "IDs are limited to this household's guests.");
    }
    const current = currentSnap.data() as ProgramGuestIdDocument | undefined;
    if (current?.lastRequestId === data.requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return guestIdReply(current);
    }
    const next: ProgramGuestIdDocument = {
      programId,
      organizerId: String(program.organizerId),
      householdId,
      guestId: data.guestId,
      idKind: data.idKind,
      numberLast4: data.numberLast4?.toUpperCase() ?? null,
      frontPath: front!.storagePath,
      backPath: back?.storagePath ?? null,
      visaPath: visa?.storagePath ?? null,
      status: "submitted",
      submittedAtMillis: deps.now().toMillis(),
      decidedAtMillis: null,
      decidedByUid: null,
      askAgainNote: null,
      hotelViews: [],
      revision: (current?.revision ?? 0) + 1,
      lastRequestId: data.requestId,
      lastRequestHash: requestHash,
    };
    const kept = new Set([next.frontPath, next.backPath, next.visaPath]);
    replaced = current ? [current.frontPath, current.backPath,
      current.visaPath].filter((path) => path && !kept.has(path)) : [];
    tx.set(ref, requireValid(validateProgramGuestIdDocument, next,
      "guest ID"));
    return guestIdReply(next);
  });
  await deleteProgramFiles(bucket, replaced);
  return result;
}

/** Guest relations accept an ID or ask the household again. */
export async function decideProgramGuestIdHandler(
  request: CallableRequest<unknown>,
  deps: GuestIdDeps = defaultProgramAssetDeps,
): Promise<ProgramGuestIdCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<DecideProgramGuestIdCallablePayload>(
    request, validateDecideProgramGuestIdCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "decideProgramGuestId",
    {maxRequests: 120, windowMs: 60 * 1000});
  const requestHash = hashRequest({op: "decideProgramGuestId",
    programId: data.programId, guestId: data.guestId,
    decision: data.decision, note: data.note ?? null,
    expectedRevision: data.expectedRevision});
  const ref = db.collection(PROGRAM_GUEST_IDS_COLLECTION)
    .doc(programGuestIdDocId(data.programId, data.guestId));
  return db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({db, programId: data.programId,
      actorUid, now: deps.now(), transaction: tx});
    requireProgramDuty(access, "guestRelations");
    requireProgramMutable(access.program);
    const current = (await tx.get(ref)).data() as ProgramGuestIdDocument |
      undefined;
    if (!current || current.programId !== data.programId) {
      throw new HttpsError("not-found", "No ID was sent for this guest.");
    }
    if (current.lastRequestId === data.requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return guestIdReply(current);
    }
    if (current.revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "Someone else changed this ID.",
        {reason: "staleRevision", revision: current.revision});
    }
    const next: ProgramGuestIdDocument = {
      ...current,
      status: data.decision === "accept" ? "accepted" : "askedAgain",
      decidedAtMillis: deps.now().toMillis(),
      decidedByUid: actorUid,
      askAgainNote: data.decision === "askAgain" ? data.note ?? null : null,
      revision: current.revision + 1,
      lastRequestId: data.requestId,
      lastRequestHash: requestHash,
    };
    tx.set(ref, requireValid(validateProgramGuestIdDocument, next,
      "guest ID"));
    return guestIdReply(next);
  });
}

interface RosterGuest {
  guestId: string;
  householdId: string | null;
  displayName: string;
  stay: Record<string, unknown> | null;
}

async function loadIdRoster(db: FirebaseFirestore.Firestore,
  programId: string, organizerId: string) {
  const [staySnap, guestSnap, idSnap, hotelSnap] = await Promise.all([
    db.collection("programStays").where("programId", "==", programId)
      .limit(ROSTER_LIMIT).get(),
    db.collection("programGuests").where("programId", "==", programId)
      .limit(ROSTER_LIMIT).get(),
    db.collection(PROGRAM_GUEST_IDS_COLLECTION)
      .where("programId", "==", programId).limit(ROSTER_LIMIT).get(),
    db.collection("programHotels").where("programId", "==", programId)
      .limit(64).get(),
  ]);
  const hotels = new Map<string, string>();
  for (const doc of hotelSnap.docs) {
    const hotel = doc.data();
    if (hotel.organizerId === organizerId) {
      hotels.set(doc.id, String(hotel.name ?? ""));
    }
  }
  const stays = new Map<string, Record<string, unknown>>();
  for (const doc of staySnap.docs) {
    const stay = doc.data();
    if (stay.organizerId !== organizerId || stay.status === "cancelled" ||
        typeof stay.guestId !== "string") continue;
    if (!stays.has(stay.guestId)) stays.set(stay.guestId, stay);
  }
  const ids = new Map<string, ProgramGuestIdDocument>();
  for (const doc of idSnap.docs) {
    const id = doc.data() as ProgramGuestIdDocument;
    if (id.organizerId === organizerId) ids.set(id.guestId, id);
  }
  const guests: RosterGuest[] = [];
  for (const doc of guestSnap.docs) {
    const guest = doc.data();
    if (guest.organizerId !== organizerId || guest.anonymizedAt) continue;
    const stay = stays.get(doc.id) ?? null;
    if (!stay && !ids.has(doc.id)) continue;
    guests.push({guestId: doc.id,
      householdId: typeof guest.householdId === "string" ?
        guest.householdId : null,
      displayName: String(guest.displayName ?? ""), stay});
  }
  guests.sort((a, b) => a.displayName.localeCompare(b.displayName) ||
    a.guestId.localeCompare(b.guestId));
  return {guests, ids, hotels};
}

const millisOrNull = (value: unknown): number | null =>
  value ? staffTimestampMillis(value) : null;

/** The planner's ID tracker. */
export async function listProgramIdTrackerHandler(
  request: CallableRequest<unknown>,
  deps: GuestIdDeps = defaultProgramAssetDeps,
): Promise<ProgramIdTrackerCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListProgramIdTrackerCallablePayload>(
    request, validateListProgramIdTrackerCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramIdTracker",
    {maxRequests: 60, windowMs: 60 * 1000});
  const access = await requireProgramAccess({db, programId: data.programId,
    actorUid, now: deps.now()});
  requireProgramDuty(access, "guestRelations");
  const {guests, ids, hotels} = await loadIdRoster(db, data.programId,
    access.program.organizerId);
  const staying = new Map<string, number>();
  for (const guest of guests) {
    const hotelId = guest.stay?.hotelId as string | undefined;
    if (hotelId) staying.set(hotelId, (staying.get(hotelId) ?? 0) + 1);
  }
  const visible = guests.filter((guest) => !data.hotelId ||
    guest.stay?.hotelId === data.hotelId);
  const bucket = deps.storageBucket();
  const urlsExpireAtMillis = deps.now().toMillis() + READ_URL_MILLIS;
  const counts = {staying: 0, idsIn: 0, toCheck: 0, missing: 0,
    passports: 0};
  const rows = await Promise.all(visible.map(async (guest) => {
    const id = ids.get(guest.guestId);
    const hotelId = (guest.stay?.hotelId as string | undefined) ?? null;
    if (guest.stay) counts.staying += 1;
    if (!id) counts.missing += 1;
    else {
      counts.idsIn += 1;
      if (id.status === "submitted") counts.toCheck += 1;
      if (id.idKind === "passport") counts.passports += 1;
    }
    const [frontUrl, backUrl, visaUrl] = id ? await Promise.all([
      signedReadUrl(bucket, id.frontPath, urlsExpireAtMillis),
      signedReadUrl(bucket, id.backPath, urlsExpireAtMillis),
      signedReadUrl(bucket, id.visaPath, urlsExpireAtMillis),
    ]) : [null, null, null];
    return {
      guestId: guest.guestId,
      householdId: guest.householdId,
      displayName: guest.displayName,
      hotelId,
      hotelName: hotelId ? hotels.get(hotelId) ?? null : null,
      roomLabel: (guest.stay?.roomLabel as string | null | undefined) ?? null,
      status: id?.status ?? "missing" as const,
      idKind: id?.idKind ?? null,
      numberLast4: id?.numberLast4 ?? null,
      submittedAtMillis: id?.submittedAtMillis ?? null,
      decidedAtMillis: id?.decidedAtMillis ?? null,
      askAgainNote: id?.askAgainNote ?? null,
      hotelViews: (id?.hotelViews ?? []).map((view) => ({...view,
        hotelName: hotels.get(view.hotelId) ?? null})),
      frontUrl, backUrl, visaUrl,
      revision: id?.revision ?? 0,
    };
  }));
  return requireValid(validateProgramIdTrackerCallableResponse, {
    programId: data.programId,
    hotelId: data.hotelId ?? null,
    counts,
    hotels: [...hotels.entries()].map(([hotelId, name]) => ({hotelId, name,
      staying: staying.get(hotelId) ?? 0})),
    rows,
    urlsExpireAtMillis: rows.some((row) => row.frontUrl) ?
      urlsExpireAtMillis : null,
  }, "ID tracker");
}

/** The hotel front desk's rooming list with guest IDs. */
export async function getProgramHotelHandoverHandler(
  request: CallableRequest<unknown>,
  deps: GuestIdDeps = defaultProgramAssetDeps,
): Promise<ProgramHotelHandoverCallableResponse> {
  const data =
    validateCallableWithAjv<GetProgramHotelHandoverCallablePayload>(
      request, validateGetProgramHotelHandoverCallablePayload);
  const nowMillis = deps.now().toMillis();
  const link = verifyWebLinkToken(data.token, "hotelHandover",
    deps.secret(), nowMillis);
  if (!link.ok) {
    throw new HttpsError(link.reason === "expired" ?
      "deadline-exceeded" : "permission-denied",
    link.reason === "expired" ? "This link has expired." :
      "This link is not valid.");
  }
  const {programId, subjectId: hotelId} = link.payload;
  const db = deps.firestore();
  await deps.checkRateLimit(db, `hotelHandover:${hotelId}`,
    "getProgramHotelHandover", {maxRequests: 60, windowMs: 60 * 1000});
  const [programSnap, hotelSnap] = await Promise.all([
    db.collection("organizerPrograms").doc(programId).get(),
    db.collection("programHotels").doc(hotelId).get(),
  ]);
  const program = programSnap.data() as Record<string, unknown> | undefined;
  const hotel = hotelSnap.data() as Record<string, unknown> | undefined;
  if (!program || program.status === "archived" || !hotel ||
      hotel.programId !== programId ||
      hotel.organizerId !== program.organizerId) {
    throw new HttpsError("not-found", "This list is no longer available.");
  }
  const organizerId = String(program.organizerId);
  const [organizerSnap, roster] = await Promise.all([
    db.collection("organizers").doc(organizerId).get(),
    loadIdRoster(db, programId, organizerId),
  ]);
  const bucket = deps.storageBucket();
  const urlsExpireAtMillis = nowMillis + READ_URL_MILLIS;
  const rooms = new Map<string, ProgramHotelHandoverCallableResponse[
    "rooms"][number]>();
  const viewed: ProgramGuestIdDocument[] = [];
  let accepted = 0;
  let missing = 0;
  let guestCount = 0;
  for (const guest of roster.guests) {
    const stay = guest.stay;
    if (!stay || stay.hotelId !== hotelId) continue;
    guestCount += 1;
    const id = roster.ids.get(guest.guestId);
    const shown = id?.status === "accepted" ? id : null;
    if (shown) {
      accepted += 1;
      viewed.push(shown);
    } else if (!id) {
      missing += 1;
    }
    const roomLabel = (stay.roomLabel as string | null) ?? null;
    const key = roomLabel ?? `guest:${guest.guestId}`;
    const room = rooms.get(key) ?? {roomLabel,
      arrivesAtMillis: millisOrNull(stay.startsAt),
      departsAtMillis: millisOrNull(stay.endsAt), guests: []};
    const [frontUrl, backUrl, visaUrl] = shown ? await Promise.all([
      signedReadUrl(bucket, shown.frontPath, urlsExpireAtMillis),
      signedReadUrl(bucket, shown.backPath, urlsExpireAtMillis),
      signedReadUrl(bucket, shown.visaPath, urlsExpireAtMillis),
    ]) : [null, null, null];
    room.guests.push({guestId: guest.guestId,
      displayName: guest.displayName,
      idStatus: shown ? "accepted" : id ? "pending" : "missing",
      idKind: shown?.idKind ?? null,
      numberLast4: shown?.numberLast4 ?? null,
      frontUrl, backUrl, visaUrl});
    rooms.set(key, room);
  }
  if (viewed.length > 0) {
    // Record the look on each accepted ID ("Who has seen it").
    const batch = db.batch();
    for (const id of viewed) {
      batch.update(db.collection(PROGRAM_GUEST_IDS_COLLECTION)
        .doc(programGuestIdDocId(programId, id.guestId)), {
        hotelViews: [...id.hotelViews, {hotelId, atMillis: nowMillis}]
          .slice(-HOTEL_VIEWS_KEPT),
      });
    }
    await batch.commit();
  }
  const organizer = organizerSnap.data() as Record<string, unknown> |
    undefined;
  return requireValid(validateProgramHotelHandoverCallableResponse, {
    programId,
    hotelId,
    hotelName: String(hotel.name ?? ""),
    programTitle: String(program.title ?? ""),
    organizerName: typeof organizer?.name === "string" ?
      organizer.name : null,
    counts: {rooms: rooms.size, guests: guestCount, idsAccepted: accepted,
      idsMissing: missing},
    rooms: [...rooms.values()].sort((a, b) =>
      (a.roomLabel ?? "~").localeCompare(b.roomLabel ?? "~",
        undefined, {numeric: true})),
    urlsExpireAtMillis,
    expiresAtMillis: link.payload.expiresAtMillis,
  }, "hotel handover");
}

const guestIdLimits = {timeoutSeconds: 60, maxInstances: 20};

export const submitProgramGuestId = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret], guestIdLimits),
  (request) => submitProgramGuestIdHandler(request),
);
export const decideProgramGuestId = onCall(
  appCheckCallableOptionsWithLimits(guestIdLimits),
  (request) => decideProgramGuestIdHandler(request),
);
export const listProgramIdTracker = onCall(
  appCheckCallableOptionsWithLimits(guestIdLimits),
  (request) => listProgramIdTrackerHandler(request),
);
export const getProgramHotelHandover = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret], guestIdLimits),
  (request) => getProgramHotelHandoverHandler(request),
);
