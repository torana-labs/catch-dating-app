import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {defineSecret} from "firebase-functions/params";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from
  "../shared/callableOptions";
import type {
  EventDocument,
  EventVenueSessionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {CreateEventVenueSessionCallablePayload} from
  "../shared/generated/createEventVenueSessionCallablePayload";
import type {CreateEventVenueSessionCallableResponse} from
  "../shared/generated/createEventVenueSessionCallableResponse";
import {
  validateCreateEventVenueSessionCallablePayload,
} from "../shared/generated/validators/createEventVenueSessionInput";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from
  "../shared/eventOrganizers";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  EVENT_SELF_CHECK_IN_WINDOW_AFTER_MINUTES,
  EVENT_SELF_CHECK_IN_WINDOW_BEFORE_MINUTES,
} from "../shared/businessRules";
import {normalizeEventIdPayload} from "./eventPayloadNormalization";

export const eventVenueSessionSigningKey = defineSecret(
  "EVENT_VENUE_SESSION_SIGNING_KEY"
);

const DEFAULT_TTL_SECONDS = 90;
const DEFAULT_REFRESH_SECONDS = 60;
const REDEMPTION_RETENTION_MILLIS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MILLIS = 5_000;

export interface EventVenueSessionPolicy {
  ttlSeconds: number;
  refreshSeconds: number;
}

export interface EventVenueSessionClaims {
  version: 1;
  eventId: string;
  organizerId: string;
  sessionId: string;
  issuedAtMillis: number;
  expiresAtMillis: number;
}

interface CreateEventVenueSessionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  environment: NodeJS.ProcessEnv;
  checkRateLimit?: typeof defaultCheckRateLimit;
  sessionId?: () => string;
  signToken?: (claims: EventVenueSessionClaims) => string;
}

const defaultDeps: CreateEventVenueSessionDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  environment: process.env,
  checkRateLimit: defaultCheckRateLimit,
  sessionId: () => randomBytes(24).toString("base64url"),
  signToken: signEventVenueSessionToken,
};

/** Resolves bounded deployment overrides for the live venue QR lifetime. */
export function eventVenueSessionPolicy(
  environment: NodeJS.ProcessEnv = process.env
): EventVenueSessionPolicy {
  const ttlSeconds = boundedInteger(
    environment.EVENT_VENUE_SESSION_TTL_SECONDS,
    30,
    300,
    DEFAULT_TTL_SECONDS
  );
  const refreshSeconds = boundedInteger(
    environment.EVENT_VENUE_SESSION_REFRESH_SECONDS,
    10,
    240,
    DEFAULT_REFRESH_SECONDS
  );
  if (refreshSeconds >= ttlSeconds) {
    return {
      ttlSeconds: DEFAULT_TTL_SECONDS,
      refreshSeconds: DEFAULT_REFRESH_SECONDS,
    };
  }
  return {ttlSeconds, refreshSeconds};
}

/** Issues one short-lived session for an authorized Host live QR. */
export async function createEventVenueSessionHandler(
  request: CallableRequest<unknown>,
  deps: CreateEventVenueSessionDeps = defaultDeps
): Promise<CreateEventVenueSessionCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<
    CreateEventVenueSessionCallablePayload
  >(
    request,
    validateCreateEventVenueSessionCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "createEventVenueSession", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const eventRef = db.collection("events").doc(payload.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event is cancelled.");
  }
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can display the live venue QR."
    );
  }

  const now = deps.now();
  assertEventCheckInWindow(event, now.toMillis());
  const policy = eventVenueSessionPolicy(deps.environment);
  const expiresAtMillis = now.toMillis() + policy.ttlSeconds * 1000;
  const refreshAfterMillis = now.toMillis() + policy.refreshSeconds * 1000;
  const sessionId = deps.sessionId!();
  const claims: EventVenueSessionClaims = {
    version: 1,
    eventId: payload.eventId,
    organizerId: event.organizerId ?? event.clubId,
    sessionId,
    issuedAtMillis: now.toMillis(),
    expiresAtMillis,
  };
  const venueSessionToken = deps.signToken!(claims);
  const document: EventVenueSessionDocument = {
    eventId: claims.eventId,
    organizerId: claims.organizerId,
    createdBy: uid,
    issuedAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMillis),
  };
  await db.collection("eventVenueSessions").doc(sessionId).create(document);
  return {
    eventId: payload.eventId,
    venueSessionToken,
    expiresAtMillis,
    refreshAfterMillis,
  };
}

/** Produces the compact HMAC token carried only by the live Host QR. */
export function signEventVenueSessionToken(
  claims: EventVenueSessionClaims,
  key: string = eventVenueSessionSigningKey.value()
): string {
  requireSigningKey(key);
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

/** Verifies signature, shape, event binding, and server-clock lifetime. */
export function verifyEventVenueSessionToken(params: {
  token: string;
  eventId: string;
  nowMillis: number;
  key?: string;
}): EventVenueSessionClaims {
  const [encoded, suppliedSignature, ...extra] = params.token.split(".");
  const key = params.key ?? eventVenueSessionSigningKey.value();
  if (!encoded || !suppliedSignature || extra.length > 0) {
    throw invalidVenueSession();
  }
  requireSigningKey(key);
  const expectedSignature = createHmac("sha256", key)
    .update(encoded)
    .digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw invalidVenueSession();
  }
  let claims: Partial<EventVenueSessionClaims>;
  try {
    claims = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<EventVenueSessionClaims>;
  } catch {
    throw invalidVenueSession();
  }
  if (
    claims.version !== 1 ||
    claims.eventId !== params.eventId ||
    typeof claims.organizerId !== "string" ||
    !/^[A-Za-z0-9_-]{24,80}$/u.test(claims.sessionId ?? "") ||
    !Number.isSafeInteger(claims.issuedAtMillis) ||
    !Number.isSafeInteger(claims.expiresAtMillis) ||
    claims.expiresAtMillis! <= claims.issuedAtMillis! ||
    claims.issuedAtMillis! > params.nowMillis + CLOCK_SKEW_MILLIS
  ) {
    throw invalidVenueSession();
  }
  if (claims.expiresAtMillis! <= params.nowMillis) {
    throw new HttpsError(
      "failed-precondition",
      "The Host QR expired. Scan the refreshed code."
    );
  }
  return claims as EventVenueSessionClaims;
}

/** Validates the server-side session row read in the attendance transaction. */
export function requireEventVenueSessionDocument(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  claims: EventVenueSessionClaims,
  nowMillis: number
): EventVenueSessionDocument {
  if (!snapshot.exists) throw invalidVenueSession();
  const session = requireDoc<EventVenueSessionDocument>(
    snapshot,
    "EventVenueSessionDocument"
  );
  if (
    session.eventId !== claims.eventId ||
    session.organizerId !== claims.organizerId ||
    session.issuedAt.toMillis() !== claims.issuedAtMillis ||
    session.expiresAt.toMillis() !== claims.expiresAtMillis
  ) {
    throw invalidVenueSession();
  }
  if (session.expiresAt.toMillis() <= nowMillis) {
    throw new HttpsError(
      "failed-precondition",
      "The Host QR expired. Scan the refreshed code."
    );
  }
  return session;
}

/** Stable receipt id for one authenticated attendee and one displayed QR. */
export function eventVenueSessionRedemptionId(params: {
  eventId: string;
  sessionId: string;
  uid: string;
}): string {
  return createHash("sha256")
    .update(`${params.eventId}:${params.sessionId}:${params.uid}`)
    .digest("hex");
}

/** Creates the server-only receipt used by attendance transactions. */
export function eventVenueSessionRedemptionDocument(params: {
  claims: EventVenueSessionClaims;
  uid: string;
  purpose: "attendance" | "firstHello";
  now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  retentionBaseMillis: number;
}) {
  return {
    eventId: params.claims.eventId,
    sessionId: params.claims.sessionId,
    uid: params.uid,
    purpose: params.purpose,
    redeemedAt: params.now,
    consumedAt: params.purpose === "attendance" ? params.now : null,
    expiresAt: admin.firestore.Timestamp.fromMillis(
      params.retentionBaseMillis + REDEMPTION_RETENTION_MILLIS
    ),
  };
}

/** Rejects a second use by the same authenticated attendee. */
export function rejectVenueSessionReplay(
  snapshot: FirebaseFirestore.DocumentSnapshot
): void {
  if (snapshot.exists) {
    throw new HttpsError(
      "already-exists",
      "This Host QR has already been used by your account. " +
      "Scan the refreshed code."
    );
  }
}

/** Shared time gate for issuance and attendance redemption. */
export function assertEventCheckInWindow(
  event: EventDocument,
  nowMillis: number
): void {
  const startMillis = event.startTime.toMillis();
  const windowStartMillis = startMillis -
    EVENT_SELF_CHECK_IN_WINDOW_BEFORE_MINUTES * 60 * 1000;
  const windowEndMillis = startMillis +
    EVENT_SELF_CHECK_IN_WINDOW_AFTER_MINUTES * 60 * 1000;
  if (nowMillis < windowStartMillis) {
    throw new HttpsError(
      "failed-precondition",
      `Check-in opens ${EVENT_SELF_CHECK_IN_WINDOW_BEFORE_MINUTES} min ` +
      "before the event starts."
    );
  }
  if (nowMillis > windowEndMillis) {
    throw new HttpsError(
      "failed-precondition",
      "Check-in closed. Contact the host."
    );
  }
}

function requireSigningKey(key: string): void {
  if (key.length < 32) {
    throw new HttpsError(
      "internal",
      "Live venue check-in is temporarily unavailable."
    );
  }
}

function invalidVenueSession(): HttpsError {
  return new HttpsError(
    "failed-precondition",
    "This is not a valid live Host QR. " +
    "Scan the current code on the Host screen."
  );
}

function boundedInteger(
  raw: string | undefined,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ?
    parsed : fallback;
}

export const createEventVenueSession = onCall(
  appCheckCallableOptionsWithSecrets([eventVenueSessionSigningKey]),
  (request) => createEventVenueSessionHandler(request)
);
