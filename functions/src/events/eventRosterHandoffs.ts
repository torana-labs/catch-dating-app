import {createHash, createHmac, randomBytes, timingSafeEqual} from "crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";
import {
  CallableRequest,
  HttpsError,
  onCall,
  onRequest,
} from "firebase-functions/v2/https";

import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {CreateEventRosterHandoffCallablePayload} from
  "../shared/generated/createEventRosterHandoffCallablePayload";
import type {CreateEventRosterHandoffCallableResponse} from
  "../shared/generated/createEventRosterHandoffCallableResponse";
import type {
  EventDocument,
  EventRosterHandoffDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  validateCreateEventRosterHandoffCallablePayload,
} from "../shared/generated/validators/createEventRosterHandoffInput";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  EventAttendeeImportResult,
  importEventAttendeesForHost,
} from "./eventAttendees";
import {
  ExternalRosterProvider,
  prepareCsvRosterImport,
} from "./rosterAdapters";

export const rosterIngestionWebhookSecret = defineSecret(
  "ROSTER_INGESTION_WEBHOOK_SECRET"
);

const handoffTtlMillis = 30 * 24 * 60 * 60 * 1000;
const maxInboundBodyBytes = 6 * 1024 * 1024;
const maxAttachmentBytes = 4 * 1024 * 1024;

interface RosterHandoffDeps {
  firestore: () => FirebaseFirestore.Firestore;
  auth: () => admin.auth.Auth;
  checkRateLimit: typeof checkRateLimit;
  nowMillis: () => number;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  randomToken: () => string;
  emailDomain: () => string;
  whatsappNumber: () => string;
  importAttendees: typeof importEventAttendeesForHost;
}

const defaultDeps: RosterHandoffDeps = {
  firestore: () => admin.firestore(),
  auth: () => admin.auth(),
  checkRateLimit,
  nowMillis: () => Date.now(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
  randomToken: () => randomBytes(24).toString("base64url"),
  emailDomain: () => process.env.ROSTER_INBOUND_EMAIL_DOMAIN ?? "",
  whatsappNumber: () => process.env.ROSTER_INBOUND_WHATSAPP_NUMBER ?? "",
  importAttendees: importEventAttendeesForHost,
};

/** Creates an expiring capability for forwarding one event roster. */
export async function createEventRosterHandoffHandler(
  request: CallableRequest<unknown>,
  deps: RosterHandoffDeps = defaultDeps
): Promise<CreateEventRosterHandoffCallableResponse> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    CreateEventRosterHandoffCallablePayload
  >(
    request,
    validateCreateEventRosterHandoffCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "createEventRosterHandoff", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  const eventSnap = await db.collection("events").doc(payload.eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event is cancelled.");
  }
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, hostUid)) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can create roster forwarding instructions."
    );
  }

  const token = deps.randomToken();
  const tokenHash = sha256(token);
  const nowMillis = deps.nowMillis();
  const expiresAtMillis = nowMillis + handoffTtlMillis;
  const now = deps.timestampFromMillis(nowMillis);
  const provider = externalRosterProvider(event);
  const handoff: EventRosterHandoffDocument = {
    eventId: payload.eventId,
    clubId: event.clubId,
    organizerId: event.organizerId ?? event.clubId,
    hostUid,
    tokenHash,
    provider,
    status: "active",
    createdAt: now,
    updatedAt: now,
    expiresAt: deps.timestampFromMillis(expiresAtMillis),
  } as EventRosterHandoffDocument;
  await db.collection("eventRosterHandoffs").doc(tokenHash).create(handoff);

  const emailDomain = normalizeEmailDomain(deps.emailDomain());
  const whatsappNumber = normalizeE164(deps.whatsappNumber());
  return {
    eventId: payload.eventId,
    expiresAtMillis,
    emailStatus: emailDomain ? "available" : "providerSetupRequired",
    emailAlias: emailDomain ? `roster+${token}@${emailDomain}` : null,
    whatsappStatus: whatsappNumber ? "available" : "providerSetupRequired",
    whatsappNumber,
    whatsappMessage: whatsappNumber ? `ROSTER ${token}` : null,
  };
}

export interface InboundRosterWebhookPayload {
  channel: "email" | "whatsapp";
  providerMessageId: string;
  senderVerified: boolean;
  senderEmail?: string;
  senderPhone?: string;
  handoffToken?: string;
  recipient?: string;
  messageText?: string;
  attachment: {
    fileName: string;
    contentType: string;
    contentBase64: string;
  };
}

/** Processes one HMAC-authenticated, provider-normalized inbound CSV. */
export async function ingestEventRosterWebhookHandler(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
  deps: RosterHandoffDeps = defaultDeps
): Promise<EventAttendeeImportResult> {
  if (rawBody.byteLength > maxInboundBodyBytes) {
    throw new Error("inbound_body_too_large");
  }
  if (!verifyRosterWebhookSignature(rawBody, signature, secret)) {
    throw new Error("invalid_inbound_signature");
  }
  const payload = parseInboundRosterPayload(rawBody);
  const token = resolveHandoffToken(payload);
  const tokenHash = sha256(token);
  const db = deps.firestore();
  const handoffSnap = await db.collection("eventRosterHandoffs")
    .doc(tokenHash).get();
  if (!handoffSnap.exists) throw new Error("handoff_not_found");
  const handoff = requireDoc<EventRosterHandoffDocument>(
    handoffSnap,
    "EventRosterHandoffDocument"
  );
  const expiresAt = handoff.expiresAt as unknown as
    FirebaseFirestore.Timestamp;
  if (handoff.status !== "active" ||
      expiresAt.toMillis() <= deps.nowMillis()) {
    throw new Error("handoff_expired");
  }
  if (!payload.senderVerified) throw new Error("sender_not_verified");
  await requireMatchingHostSender(payload, handoff.hostUid, deps.auth());

  const attachmentBytes = decodeAttachment(payload.attachment);
  const source = attachmentBytes.toString("utf8");
  const prepared = prepareCsvRosterImport(source, handoff.provider);
  return deps.importAttendees({
    hostUid: handoff.hostUid,
    payload: {
      eventId: handoff.eventId,
      importKey: `inbound-${sha256(payload.providerMessageId)}`,
      fileName: safeFileName(payload.attachment.fileName),
      format: "csv",
      rows: prepared.rows,
    },
  });
}

export function verifyRosterWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature) || !secret) {
    return false;
  }
  const expected = Buffer.from(
    createHmac("sha256", secret).update(rawBody).digest("hex"),
    "hex"
  );
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function parseInboundRosterPayload(
  rawBody: Buffer
): InboundRosterWebhookPayload {
  const value = JSON.parse(rawBody.toString("utf8")) as unknown;
  if (!isRecord(value) ||
      (value.channel !== "email" && value.channel !== "whatsapp") ||
      !isBoundedString(value.providerMessageId, 1, 240) ||
      typeof value.senderVerified !== "boolean" ||
      !isRecord(value.attachment) ||
      !isBoundedString(value.attachment.fileName, 1, 255) ||
      !isBoundedString(value.attachment.contentType, 1, 120) ||
      !isBoundedString(value.attachment.contentBase64, 1,
        maxInboundBodyBytes)) {
    throw new Error("invalid_inbound_payload");
  }
  return value as unknown as InboundRosterWebhookPayload;
}

export function resolveHandoffToken(
  payload: InboundRosterWebhookPayload
): string {
  const direct = payload.handoffToken?.trim();
  if (direct && /^[A-Za-z0-9_-]{20,64}$/.test(direct)) return direct;
  const source = payload.channel === "email" ? payload.recipient :
    payload.messageText;
  const match = payload.channel === "email" ?
    /roster\+([A-Za-z0-9_-]{20,64})@/i.exec(source ?? "") :
    /\bROSTER\s+([A-Za-z0-9_-]{20,64})\b/i.exec(source ?? "");
  if (!match?.[1]) throw new Error("handoff_token_missing");
  return match[1];
}

async function requireMatchingHostSender(
  payload: InboundRosterWebhookPayload,
  hostUid: string,
  auth: admin.auth.Auth
): Promise<void> {
  const user = await auth.getUser(hostUid);
  if (payload.channel === "email") {
    const expected = user.email?.trim().toLowerCase();
    const actual = payload.senderEmail?.trim().toLowerCase();
    if (!expected || expected !== actual) throw new Error("sender_mismatch");
    return;
  }
  const expected = normalizeE164(user.phoneNumber ?? "");
  const actual = normalizeE164(payload.senderPhone ?? "");
  if (!expected || expected !== actual) throw new Error("sender_mismatch");
}

function decodeAttachment(
  attachment: InboundRosterWebhookPayload["attachment"]
): Buffer {
  const fileName = safeFileName(attachment.fileName);
  if (!fileName.toLowerCase().endsWith(".csv") ||
      !["text/csv", "application/csv", "application/vnd.ms-excel"]
        .includes(attachment.contentType.toLowerCase())) {
    throw new Error("unsupported_roster_attachment");
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.contentBase64) ||
      attachment.contentBase64.length % 4 !== 0) {
    throw new Error("invalid_roster_attachment_encoding");
  }
  const bytes = Buffer.from(attachment.contentBase64, "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > maxAttachmentBytes) {
    throw new Error("invalid_roster_attachment_size");
  }
  return bytes;
}

function safeFileName(value: string): string {
  const normalized = value.trim().replace(/[^A-Za-z0-9._ -]/g, "_");
  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("invalid_attachment_name");
  }
  return normalized.slice(0, 255);
}

function externalRosterProvider(event: EventDocument): ExternalRosterProvider {
  const provider = event.eventOrigin?.provider;
  return provider && provider !== "catch" ? provider : "generic";
}

function normalizeEventIdPayload(data: unknown): unknown {
  if (!isRecord(data)) return data;
  return {
    ...data,
    eventId: typeof data.eventId === "string" ? data.eventId.trim() :
      data.eventId,
  };
}

function normalizeEmailDomain(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/^@/, "");
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized) ? normalized : null;
}

function normalizeE164(value: string): string | null {
  const normalized = value.trim().replace(/[\s()-]/g, "");
  return /^\+[1-9][0-9]{6,14}$/.test(normalized) ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(
  value: unknown,
  minLength: number,
  maxLength: number
): value is string {
  return typeof value === "string" && value.length >= minLength &&
    value.length <= maxLength;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const createEventRosterHandoff = onCall(
  appCheckCallableOptions,
  (request) => createEventRosterHandoffHandler(request)
);

export const ingestEventRosterWebhook = onRequest(
  {
    invoker: "public",
    secrets: [rosterIngestionWebhookSecret],
    timeoutSeconds: 60,
    maxInstances: 20,
  },
  async (request, response) => {
    const rawBody = (request as {rawBody?: Buffer}).rawBody;
    if (!rawBody) {
      response.status(400).send("Missing inbound roster body.");
      return;
    }
    try {
      const result = await ingestEventRosterWebhookHandler(
        rawBody,
        request.header("x-catch-roster-signature"),
        rosterIngestionWebhookSecret.value()
      );
      response.status(200).json(result);
    } catch (error) {
      logger.error("Inbound roster webhook failed", error);
      response.status(400).send("Inbound roster webhook failed.");
    }
  }
);
