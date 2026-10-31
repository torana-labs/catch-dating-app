import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {authorizeSetupManager} from "./service";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const MAX_LIMIT = 50;
const CURSOR_VERSION = 2;

export type PrivateEventSetupScope = "upcoming" | "past" | "cancelled";

export interface ListPrivateEventSetupsRequest {
  organizerId: string;
  limit?: number;
  cursor?: string;
  scope?: PrivateEventSetupScope;
}

export interface PrivateEventSetupSummary {
  eventId: string;
  name: string;
  city: {cityId: string; marketId: string};
  localDate: string;
  localStartTime: string;
  timezone: string;
  startTimeMillis: number;
  setupRevision: number;
  status: "active" | "cancelled";
  detailsConfigured: boolean;
}

export interface ListPrivateEventSetupsResponse {
  events: PrivateEventSetupSummary[];
  nextCursor: string | null;
}

interface PageCursor {
  v: 2;
  scope: PrivateEventSetupScope;
  organizerId: string;
  asOfMillis: number;
  lastStartTimeMillis: number;
  lastEventId: string;
}

function invalidCursor(): never {
  throw new HttpsError("invalid-argument", "Invalid event setup cursor.");
}

function decodeCursor(raw: string, organizerId: string,
  nowMillis: number, scope: PrivateEventSetupScope): PageCursor {
  if (raw.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(raw)) invalidCursor();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    invalidCursor();
  }
  if (!parsed || typeof parsed !== "object") invalidCursor();
  const value = parsed as Record<string, unknown>;
  if (Object.keys(value).sort().join(",") !==
      "asOfMillis,lastEventId,lastStartTimeMillis,organizerId,scope,v" ||
      value.scope !== scope ||
      value.v !== CURSOR_VERSION || value.organizerId !== organizerId ||
      !Number.isSafeInteger(value.asOfMillis) ||
      !Number.isSafeInteger(value.lastStartTimeMillis) ||
      typeof value.lastEventId !== "string" || !ID.test(value.lastEventId) ||
      (value.lastStartTimeMillis as number) < -62135596800000 ||
      (value.lastStartTimeMillis as number) > 253402300799999 ||
      (value.asOfMillis as number) > nowMillis ||
      (value.asOfMillis as number) < nowMillis - 24 * 60 * 60 * 1000 ||
      (scope === "upcoming" && (value.lastStartTimeMillis as number) <
        (value.asOfMillis as number)) ||
      (scope === "past" && (value.lastStartTimeMillis as number) >=
        (value.asOfMillis as number))) invalidCursor();
  return value as unknown as PageCursor;
}

function millis(value: unknown): number | null {
  if (!value || typeof value !== "object" ||
      typeof (value as {toMillis?: unknown}).toMillis !== "function") {
    return null;
  }
  const result = (value as FirebaseFirestore.Timestamp).toMillis();
  return Number.isSafeInteger(result) ? result : null;
}

export function projectPrivateEventSetupSummary(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  organizerId: string, asOfMillis: number,
  scope: PrivateEventSetupScope): PrivateEventSetupSummary {
  const event: Record<string, unknown> = doc.data();
  const startTimeMillis = millis(event.startTime);
  const name = event.name;
  const cityId = event.eventCityId;
  const marketId = event.eventMarketId;
  const localDate = event.eventLocalDate;
  const localStartTime = event.eventLocalStartTime;
  const timezone = event.eventTimezone;
  const setupRevision = event.setupRevision;
  if (!validateEventDocument(event) ||
      event.organizerId !== organizerId ||
      event.publicationState !== "private" ||
      event.status !== (scope === "cancelled" ? "cancelled" : "active") ||
      !ID.test(doc.id) || !Number.isSafeInteger(setupRevision) ||
      typeof name !== "string" || !name.trim() ||
      typeof cityId !== "string" || typeof marketId !== "string" ||
      typeof localDate !== "string" ||
      typeof localStartTime !== "string" ||
      typeof timezone !== "string" ||
      startTimeMillis === null ||
      (scope === "upcoming" && startTimeMillis < asOfMillis) ||
      (scope === "past" && startTimeMillis >= asOfMillis)) {
    throw new HttpsError("failed-precondition",
      "A private event setup needs review.");
  }
  return {
    eventId: doc.id,
    name,
    city: {cityId, marketId},
    localDate,
    localStartTime,
    timezone,
    startTimeMillis,
    setupRevision: setupRevision as number,
    status: scope === "cancelled" ? "cancelled" : "active",
    detailsConfigured: event.endTime !== undefined ||
      event.meetingPoint !== undefined ||
      event.meetingLocation !== undefined ||
      event.eventFormat !== undefined ||
      event.eventSuccessPlanId !== undefined,
  };
}

/** Bounded manager inventory; history never enters the upcoming offer list. */
export async function listPrivateEventSetups(params: {
  actorUid: string;
  command: ListPrivateEventSetupsRequest;
  db: FirebaseFirestore.Firestore;
  nowMillis?: () => number;
}): Promise<ListPrivateEventSetupsResponse> {
  const {actorUid, command, db} = params;
  if (!actorUid) throw new HttpsError("unauthenticated", "Sign in first.");
  if (!command || !ID.test(command.organizerId) ||
      (command.limit !== undefined && (!Number.isInteger(command.limit) ||
      command.limit < 1 || command.limit > MAX_LIMIT)) ||
      (command.scope !== undefined &&
        !["upcoming", "past", "cancelled"].includes(command.scope)) ||
      (command.cursor !== undefined && typeof command.cursor !== "string")) {
    throw new HttpsError("invalid-argument", "Invalid event setup request.");
  }
  const limit = command.limit ?? 20;
  const scope = command.scope ?? "upcoming";
  const now = (params.nowMillis ?? Date.now)();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new HttpsError("internal", "Invalid server clock.");
  }
  const cursor = command.cursor ? decodeCursor(command.cursor,
    command.organizerId, now, scope) : null;
  const asOfMillis = cursor?.asOfMillis ?? now;
  const organizerRef = db.collection("organizers").doc(command.organizerId);
  const deletedRef = db.collection("deletedUsers").doc(actorUid);
  return db.runTransaction(async (tx) => {
    const [organizer, deleted] = await Promise.all([
      tx.get(organizerRef), tx.get(deletedRef),
    ]);
    authorizeSetupManager(organizer, deleted, actorUid);
    let query = db.collection("events")
      .where("organizerId", "==", command.organizerId)
      .where("publicationState", "==", "private")
      .where("status", "==", scope === "cancelled" ? "cancelled" : "active");
    if (scope !== "cancelled") {
      query = query.where("startTime", scope === "past" ? "<" : ">=",
        admin.firestore.Timestamp.fromMillis(asOfMillis));
    }
    const direction = scope === "upcoming" ? "asc" : "desc";
    query = query.orderBy("startTime", direction)
      .orderBy(admin.firestore.FieldPath.documentId(), direction);
    if (cursor) {
      query = query.startAfter(admin.firestore.Timestamp.fromMillis(
        cursor.lastStartTimeMillis), cursor.lastEventId);
    }
    const page = await tx.get(query.limit(limit + 1));
    const projected = page.docs.map((doc) =>
      projectPrivateEventSetupSummary(doc,
        command.organizerId, asOfMillis, scope));
    const events = projected.slice(0, limit);
    const last = events.at(-1);
    const nextCursor = projected.length > limit && last ?
      Buffer.from(JSON.stringify({
        v: CURSOR_VERSION,
        scope,
        organizerId: command.organizerId,
        asOfMillis,
        lastStartTimeMillis: last.startTimeMillis,
        lastEventId: last.eventId,
      } satisfies PageCursor)).toString("base64url") : null;
    return {events, nextCursor};
  });
}
