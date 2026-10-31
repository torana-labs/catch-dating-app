import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {authorizeSetupManager} from "./service";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const MAX_LIMIT = 50;

export interface ListOfferEventTargetsRequest {
  organizerId: string;
  limit?: number;
  cursor?: string;
}

export interface OfferEventTarget {
  eventId: string;
  name: string | null;
  startTimeMillis: number;
  timezone: string | null;
  publicationState: "private" | "published";
  setupRevision: number | null;
}

export interface ListOfferEventTargetsResponse {
  events: OfferEventTarget[];
  nextCursor: string | null;
}

interface Cursor {
  v: 1;
  organizerId: string;
  asOfMillis: number;
  lastStartTimeMillis: number;
  lastEventId: string;
}

function badCursor(): never {
  throw new HttpsError("invalid-argument", "Invalid event target cursor.");
}

function parseCursor(raw: string, organizerId: string, now: number): Cursor {
  if (!raw || raw.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(raw)) {
    badCursor();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    badCursor();
  }
  if (!parsed || typeof parsed !== "object") badCursor();
  const value = parsed as Record<string, unknown>;
  if (Object.keys(value).sort().join(",") !==
      "asOfMillis,lastEventId,lastStartTimeMillis,organizerId,v" ||
      value.v !== 1 || value.organizerId !== organizerId ||
      !Number.isSafeInteger(value.asOfMillis) ||
      !Number.isSafeInteger(value.lastStartTimeMillis) ||
      !ID.test(String(value.lastEventId)) ||
      (value.asOfMillis as number) > now ||
      (value.asOfMillis as number) < now - 24 * 60 * 60 * 1000 ||
      (value.lastStartTimeMillis as number) <
        (value.asOfMillis as number)) badCursor();
  return value as unknown as Cursor;
}

function timestampMillis(value: unknown): number | null {
  if (!value || typeof value !== "object" ||
      typeof (value as {toMillis?: unknown}).toMillis !== "function") {
    return null;
  }
  const millis = (value as FirebaseFirestore.Timestamp).toMillis();
  return Number.isSafeInteger(millis) ? millis : null;
}

function target(doc: FirebaseFirestore.QueryDocumentSnapshot,
  organizerId: string, asOfMillis: number): OfferEventTarget {
  const event: Record<string, unknown> = doc.data();
  const startTimeMillis = timestampMillis(event.startTime);
  if (!ID.test(doc.id) || !validateEventDocument(event) ||
      event.organizerId !== organizerId ||
      event.organizerId !== undefined &&
        event.organizerId !== organizerId ||
      event.status !== "active" || startTimeMillis === null ||
      startTimeMillis < asOfMillis) {
    throw new HttpsError("failed-precondition",
      "An owned event target needs review.");
  }
  const explicitState = event.publicationState;
  const revision = event.setupRevision;
  let publicationState: "private" | "published";
  if (explicitState === "private" &&
      Number.isSafeInteger(revision) && (revision as number) >= 1 &&
      event.organizerId === organizerId) {
    publicationState = "private";
  } else if (explicitState === "published") {
    publicationState = "published";
  } else if (explicitState === undefined && revision === undefined) {
    // Schema validation above requires full rich legacy fields.
    publicationState = "published";
  } else {
    throw new HttpsError("failed-precondition",
      "An event publication state needs review.");
  }
  const name = event.name;
  const timezone = event.eventTimezone;
  return {
    eventId: doc.id,
    name: typeof name === "string" ? name : null,
    startTimeMillis,
    timezone: typeof timezone === "string" ? timezone : null,
    publicationState,
    setupRevision: Number.isSafeInteger(revision) ? revision as number : null,
  };
}

/** One manager-owned query over canonical events, private and published. */
export async function listOfferEventTargets(params: {
  actorUid: string;
  command: ListOfferEventTargetsRequest;
  db: FirebaseFirestore.Firestore;
  nowMillis?: () => number;
}): Promise<ListOfferEventTargetsResponse> {
  const {actorUid, command, db} = params;
  if (!actorUid) throw new HttpsError("unauthenticated", "Sign in first.");
  if (!command || !ID.test(command.organizerId) ||
      (command.limit !== undefined && (!Number.isInteger(command.limit) ||
      command.limit < 1 || command.limit > MAX_LIMIT)) ||
      (command.cursor !== undefined &&
        (typeof command.cursor !== "string" || !command.cursor))) {
    throw new HttpsError("invalid-argument", "Invalid event target request.");
  }
  const limit = command.limit ?? 20;
  const now = (params.nowMillis ?? Date.now)();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new HttpsError("internal", "Invalid server clock.");
  }
  const cursor = command.cursor ? parseCursor(command.cursor,
    command.organizerId, now) : null;
  const asOfMillis = cursor?.asOfMillis ?? now;
  return db.runTransaction(async (tx) => {
    const [organizer, deleted] = await Promise.all([
      tx.get(db.collection("organizers").doc(command.organizerId)),
      tx.get(db.collection("deletedUsers").doc(actorUid)),
    ]);
    authorizeSetupManager(organizer, deleted, actorUid);
    // organizerId is required on both rich legacy and new private event documents.
    let query = db.collection("events")
      .where("organizerId", "==", command.organizerId)
      .where("status", "==", "active")
      .where("startTime", ">=", admin.firestore.Timestamp.fromMillis(
        asOfMillis))
      .orderBy("startTime", "asc")
      .orderBy(admin.firestore.FieldPath.documentId(), "asc");
    if (cursor) {
      query = query.startAfter(admin.firestore.Timestamp.fromMillis(
        cursor.lastStartTimeMillis), cursor.lastEventId);
    }
    const page = await tx.get(query.limit(limit + 1));
    const projected = page.docs.map((doc) => target(doc,
      command.organizerId, asOfMillis));
    const events = projected.slice(0, limit);
    const last = events.at(-1);
    const nextCursor = projected.length > limit && last ?
      Buffer.from(JSON.stringify({v: 1, organizerId: command.organizerId,
        asOfMillis, lastStartTimeMillis: last.startTimeMillis,
        lastEventId: last.eventId} satisfies Cursor)).toString("base64url") :
      null;
    return {events, nextCursor};
  });
}
