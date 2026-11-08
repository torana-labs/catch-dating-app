import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
import {
  dutyCoversHotel,
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
} from "../shared/programAuthority";
import {householdRsvpSecret} from "../programRsvp/householdRsvp";
import {verifyWebLinkToken} from "./programWebLinks";
import {
  defaultProgramAssetDeps,
  deleteProgramFiles,
  READ_URL_MILLIS,
  requireProgramAsset,
  signedReadUrl,
  type ProgramAssetDeps,
} from "./programAssets";
import type {
  ProgramHamperDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {UpsertProgramHamperCallablePayload} from
  "../shared/generated/upsertProgramHamperCallablePayload";
import type {ProgramHamperCallableResponse} from
  "../shared/generated/programHamperCallableResponse";
import type {GetProgramHamperWebViewCallablePayload} from
  "../shared/generated/getProgramHamperWebViewCallablePayload";
import type {ProgramHamperWebViewCallableResponse} from
  "../shared/generated/programHamperWebViewCallableResponse";
import {validateUpsertProgramHamperCallablePayload} from
  "../shared/generated/validators/upsertProgramHamperInput";
import {validateGetProgramHamperWebViewCallablePayload} from
  "../shared/generated/validators/getProgramHamperWebViewInput";

// Welcome hampers (#1582 item 6): one per hotel room. Porters work
// through a hamperPorter link (no sign-in); hotel desk staff through the
// app. Rooms come from the programme's live stays at the hotel.

export const PROGRAM_HAMPERS_COLLECTION = "programHampers";
const STAY_LIMIT = 2000;

/** A room label as a stable document key: "Room 214" -> "room-214". */
export function hamperRoomKey(roomLabel: string | null | undefined,
  stayId: string): string {
  const key = (roomLabel ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 60);
  return key || `stay-${stayId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    .slice(0, 200);
}

export function programHamperDocId(programId: string, hotelId: string,
  roomKey: string): string {
  return `${programId}_${hotelId}_${roomKey}`;
}

/** Marks one room's hamper placed or pending. */
export async function upsertProgramHamperHandler(
  request: CallableRequest<unknown>,
  deps: ProgramAssetDeps = defaultProgramAssetDeps,
): Promise<ProgramHamperCallableResponse> {
  const data = validateCallableWithAjv<UpsertProgramHamperCallablePayload>(
    request, validateUpsertProgramHamperCallablePayload);
  const db = deps.firestore();
  let programId: string;
  let porterHotelId: string | null = null;
  let actor: {kind: "staff" | "porter"; uid: string | null};
  let allowedHotel: (hotelId: string) => boolean = () => true;
  if (data.token) {
    const link = verifyWebLinkToken(data.token, "hamperPorter",
      deps.secret(), deps.now().toMillis());
    if (!link.ok) {
      throw new HttpsError(link.reason === "expired" ?
        "deadline-exceeded" : "permission-denied",
      link.reason === "expired" ? "This link has expired." :
        "This link is not valid.");
    }
    programId = link.payload.programId;
    porterHotelId = link.payload.subjectId;
    actor = {kind: "porter", uid: null};
    await deps.checkRateLimit(db, `hamperPorter:${porterHotelId}`,
      "upsertProgramHamper", {maxRequests: 240, windowMs: 60 * 1000});
  } else {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");
    if (!data.programId) {
      throw new HttpsError("invalid-argument", "programId is required.");
    }
    programId = data.programId;
    actor = {kind: "staff", uid};
    await deps.checkRateLimit(db, uid, "upsertProgramHamper",
      {maxRequests: 240, windowMs: 60 * 1000});
    const access = await requireProgramAccess({db, programId, actorUid: uid,
      now: deps.now()});
    const assignments = requireProgramDuty(access, "hotelDesk");
    if (access.role !== "manager") {
      allowedHotel = (hotelId) => dutyCoversHotel(assignments, hotelId);
    }
  }
  const stay = (await db.collection("programStays").doc(data.stayId).get())
    .data() as Record<string, unknown> | undefined;
  if (!stay || stay.programId !== programId || stay.status === "cancelled" ||
      typeof stay.hotelId !== "string" ||
      (porterHotelId !== null && stay.hotelId !== porterHotelId) ||
      !allowedHotel(stay.hotelId)) {
    throw new HttpsError("not-found", "Room not found at this hotel.");
  }
  const hotelId = stay.hotelId;
  const roomLabel = (stay.roomLabel as string | null | undefined) ?? null;
  const roomKey = hamperRoomKey(roomLabel, data.stayId);
  const requestHash = hashRequest({op: "upsertProgramHamper", programId,
    hotelId, roomKey, status: data.status,
    photoAssetId: data.photoAssetId ?? null, note: data.note ?? null});
  const ref = db.collection(PROGRAM_HAMPERS_COLLECTION)
    .doc(programHamperDocId(programId, hotelId, roomKey));
  const bucket = deps.storageBucket();
  const photo = data.photoAssetId ? await requireProgramAsset({bucket,
    programId, kind: "hamper", assetId: data.photoAssetId,
    subject: hotelId}) : null;
  let replaced: string | null = null;
  const result = await db.runTransaction(async (tx) => {
    const [programSnap, currentSnap] = await Promise.all([
      tx.get(db.collection("organizerPrograms").doc(programId)),
      tx.get(ref),
    ]);
    const program = programSnap.data() as Record<string, unknown> |
      undefined;
    if (!program || stay.organizerId !== program.organizerId) {
      throw new HttpsError("not-found", "Programme not found.");
    }
    requireProgramMutable(program as {status: "active"});
    const current = currentSnap.data() as ProgramHamperDocument | undefined;
    if (current && current.lastRequestId === data.requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return current;
    }
    const nowMillis = deps.now().toMillis();
    const placed = data.status === "placed";
    const next: ProgramHamperDocument = {
      programId,
      organizerId: String(program.organizerId),
      hotelId,
      roomKey,
      roomLabel,
      status: data.status,
      placedAtMillis: placed ?
        (current?.status === "placed" ? current.placedAtMillis : nowMillis) :
        null,
      placedBy: placed ? actor : null,
      photoPath: photo?.storagePath ?? (placed ? current?.photoPath ?? null :
        null),
      note: data.note ?? current?.note ?? null,
      updatedAtMillis: nowMillis,
      revision: (current?.revision ?? 0) + 1,
      lastRequestId: data.requestId,
      lastRequestHash: requestHash,
    };
    replaced = current?.photoPath && current.photoPath !== next.photoPath ?
      current.photoPath : null;
    tx.set(ref, next);
    return next;
  });
  await deleteProgramFiles(bucket, [replaced]);
  return {programId, hotelId, roomKey: result.roomKey,
    status: result.status, revision: result.revision};
}

/** The porters' hamper list for one hotel. */
export async function getProgramHamperWebViewHandler(
  request: CallableRequest<unknown>,
  deps: ProgramAssetDeps = defaultProgramAssetDeps,
): Promise<ProgramHamperWebViewCallableResponse> {
  const data =
    validateCallableWithAjv<GetProgramHamperWebViewCallablePayload>(
      request, validateGetProgramHamperWebViewCallablePayload);
  const nowMillis = deps.now().toMillis();
  const link = verifyWebLinkToken(data.token, "hamperPorter", deps.secret(),
    nowMillis);
  if (!link.ok) {
    throw new HttpsError(link.reason === "expired" ?
      "deadline-exceeded" : "permission-denied",
    link.reason === "expired" ? "This link has expired." :
      "This link is not valid.");
  }
  const {programId, subjectId: hotelId} = link.payload;
  const db = deps.firestore();
  await deps.checkRateLimit(db, `hamperPorter:${hotelId}`,
    "getProgramHamperWebView", {maxRequests: 120, windowMs: 60 * 1000});
  const [programSnap, hotelSnap, staySnap, hamperSnap] = await Promise.all([
    db.collection("organizerPrograms").doc(programId).get(),
    db.collection("programHotels").doc(hotelId).get(),
    db.collection("programStays").where("programId", "==", programId)
      .limit(STAY_LIMIT).get(),
    db.collection(PROGRAM_HAMPERS_COLLECTION)
      .where("programId", "==", programId).limit(STAY_LIMIT).get(),
  ]);
  const program = programSnap.data() as Record<string, unknown> | undefined;
  const hotel = hotelSnap.data() as Record<string, unknown> | undefined;
  if (!program || program.status === "archived" || !hotel ||
      hotel.programId !== programId ||
      hotel.organizerId !== program.organizerId) {
    throw new HttpsError("not-found", "This list is no longer available.");
  }
  const hampers = new Map<string, ProgramHamperDocument>();
  for (const doc of hamperSnap.docs) {
    const hamper = doc.data() as ProgramHamperDocument;
    if (hamper.hotelId === hotelId &&
        hamper.organizerId === program.organizerId) {
      hampers.set(hamper.roomKey, hamper);
    }
  }
  const rooms = new Map<string, {roomLabel: string | null; stayId: string;
    guestCount: number}>();
  for (const doc of staySnap.docs) {
    const stay = doc.data();
    if (stay.hotelId !== hotelId || stay.status === "cancelled" ||
        stay.organizerId !== program.organizerId) continue;
    const roomLabel = (stay.roomLabel as string | null) ?? null;
    const key = hamperRoomKey(roomLabel, doc.id);
    const room = rooms.get(key) ?? {roomLabel, stayId: doc.id,
      guestCount: 0};
    room.guestCount += 1;
    rooms.set(key, room);
  }
  const bucket = deps.storageBucket();
  const urlsExpireAtMillis = nowMillis + READ_URL_MILLIS;
  const list = await Promise.all([...rooms.entries()].map(
    async ([roomKey, room]) => {
      const hamper = hampers.get(roomKey);
      return {
        roomKey,
        roomLabel: room.roomLabel,
        stayId: room.stayId,
        guestCount: room.guestCount,
        status: hamper?.status ?? "pending" as const,
        placedAtMillis: hamper?.placedAtMillis ?? null,
        photoUrl: await signedReadUrl(bucket, hamper?.photoPath,
          urlsExpireAtMillis),
        revision: hamper?.revision ?? 0,
      };
    }));
  list.sort((a, b) => (a.roomLabel ?? "~").localeCompare(b.roomLabel ?? "~",
    undefined, {numeric: true}));
  return {
    programId,
    hotelId,
    hotelName: String(hotel.name ?? ""),
    programTitle: String(program.title ?? ""),
    counts: {rooms: list.length,
      placed: list.filter((room) => room.status === "placed").length},
    rooms: list,
    urlsExpireAtMillis,
    expiresAtMillis: link.payload.expiresAtMillis,
  };
}

const hamperLimits = {timeoutSeconds: 60, maxInstances: 20};

export const upsertProgramHamper = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret], hamperLimits),
  (request) => upsertProgramHamperHandler(request),
);
export const getProgramHamperWebView = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret], hamperLimits),
  (request) => getProgramHamperWebViewHandler(request),
);
