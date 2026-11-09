import * as crypto from "node:crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import type {
  OrganizerCampaignRecipientDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  OrganizerMessagingWebhookEventDocument,
  OrganizerSenderConnectionDocument,
  ProgramHouseholdDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  inboundStopPermissionReceipt,
  organizerCommunicationPermissionReceiptId,
  organizerCommunicationPreferenceId,
  unknownOrganizerCommunicationChannel,
} from
  "../shared/organizerCommunicationPreferences";
import {
  classifyMetaError,
  hashEndpoint,
  isWhatsappStopCommand,
  nextCampaignRecipientStatus,
  organizerContactChannelStateId,
  verifyMetaWebhookSignature,
} from "./organizerCampaignModel";
import {metaWhatsappAppSecret} from "./organizerMessagingSetup";
import {persistInboundWhatsappMessage} from "./organizerWhatsappThreads";
import {prepareWhatsappStop} from "../shared/organizerWhatsappStops";
import {routeProgramWhatsappInbound} from
  "../programs/programWhatsapp/inbound";

export const metaWhatsappWebhookVerifyToken = defineSecret(
  "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN"
);
const webhookRetentionMillis = 30 * 24 * 60 * 60 * 1000;

interface ParsedWebhookEvent {
  providerEventId: string;
  phoneNumberId: string | null;
  providerAccountId: string | null;
  callbackData: string | null;
  inboundReply: NonNullable<
    OrganizerMessagingWebhookEventDocument["inboundReply"]> | null;
  eventKind: OrganizerMessagingWebhookEventDocument["eventKind"];
  providerMessageId: string | null;
  contextProviderMessageId: string | null;
  deliveryStatus: OrganizerMessagingWebhookEventDocument["deliveryStatus"];
  endpointHash: string | null;
  isStop: boolean;
  hasReply: boolean;
  inboundBody: string | null;
  providerErrorCode: number | null;
  providerErrorEvidence: NonNullable<
    OrganizerMessagingWebhookEventDocument["providerErrorEvidence"]>;
  providerOccurredAt: FirebaseFirestore.Timestamp | null;
  payloadHash: string;
}

export function parseMetaWhatsappWebhook(
  rawBody: Buffer
): ParsedWebhookEvent[] {
  const payloadHash = sha256(rawBody);
  let root: Record<string, unknown>;
  try {
    root = recordValue(JSON.parse(rawBody.toString("utf8")));
  } catch {
    return [];
  }
  const events: ParsedWebhookEvent[] = [];
  for (const rawEntry of arrayValue(root.entry)) {
    const entry = recordValue(rawEntry);
    const providerAccountId = providerIdentity(entry.id);
    for (const rawChange of arrayValue(entry.changes)) {
      const change = recordValue(rawChange);
      const value = recordValue(change.value);
      const metadata = recordValue(value.metadata);
      const phoneNumberId = providerIdentity(metadata.phone_number_id);
      for (const rawStatus of arrayValue(value.statuses)) {
        const status = recordValue(rawStatus);
        const providerMessageId = stringValue(status.id);
        const deliveryStatus = normalizeDeliveryStatus(
          stringValue(status.status)
        );
        if (!providerMessageId || !deliveryStatus) continue;
        const timestamp = timestampValue(status.timestamp);
        const providerErrorEvidence = parseErrorEvidence(status.errors);
        const providerErrorCode = providerErrorEvidence.kind === "codes" ?
          providerErrorEvidence.codes[0] : null;
        events.push({
          providerEventId: `status:${providerMessageId}:${deliveryStatus}:` +
            `${timestamp?.toMillis() ?? "unknown"}`,
          phoneNumberId,
          providerAccountId,
          callbackData: boundedString(status.biz_opaque_callback_data, 512),
          inboundReply: null,
          eventKind: "status",
          providerMessageId,
          contextProviderMessageId: null,
          deliveryStatus,
          endpointHash: endpointHashFromProviderPhone(status.recipient_id),
          isStop: false,
          hasReply: false,
          inboundBody: null,
          providerErrorCode,
          providerErrorEvidence,
          providerOccurredAt: timestamp,
          payloadHash,
        });
      }
      for (const rawMessage of arrayValue(value.messages)) {
        const message = recordValue(rawMessage);
        const providerMessageId = stringValue(message.id);
        if (!providerMessageId) continue;
        const reply = parseNativeReply(message);
        const body = message.type === "text" ?
          stringValue(recordValue(message.text).body) ?? "" : "";
        events.push({
          providerEventId: `inbound:${providerMessageId}`,
          phoneNumberId,
          providerAccountId,
          callbackData: null,
          inboundReply: reply,
          eventKind: "inbound",
          providerMessageId,
          contextProviderMessageId:
            stringValue(recordValue(message.context).id),
          deliveryStatus: null,
          endpointHash: endpointHashFromProviderPhone(message.from),
          isStop: isWhatsappStopCommand(body),
          hasReply: true,
          inboundBody: reply?.label ?? (body.trim().slice(0, 4096) || null),
          providerErrorCode: null,
          providerErrorEvidence: {kind: "none"},
          providerOccurredAt: timestampValue(message.timestamp),
          payloadHash,
        });
      }
    }
  }
  return events.slice(0, 500);
}

export async function ingestMetaWhatsappWebhook(params: {
  db: FirebaseFirestore.Firestore;
  rawBody: Buffer;
  signatureHeader: string | undefined;
  appSecret: string;
  now?: FirebaseFirestore.Timestamp;
}): Promise<number> {
  if (!verifyMetaWebhookSignature({
    rawBody: params.rawBody,
    signatureHeader: params.signatureHeader,
    appSecret: params.appSecret,
  })) throw new Error("Invalid Meta webhook signature.");
  const parsed = parseMetaWhatsappWebhook(params.rawBody);
  const now = params.now ?? admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + webhookRetentionMillis
  );
  const connectionByPhone = new Map<string, {
    id: string;
    value: OrganizerSenderConnectionDocument;
  } | null>();
  for (const event of parsed) {
    if (!event.phoneNumberId || connectionByPhone.has(event.phoneNumberId)) {
      continue;
    }
    const snap = await params.db.collection("organizerSenderConnections")
      .where("provider", "==", "metaCloudApi")
      .where("phoneNumberId", "==", event.phoneNumberId)
      .limit(2).get();
    connectionByPhone.set(event.phoneNumberId, snap.docs.length !== 1 ? null : {
      id: snap.docs[0].id,
      value: snap.docs[0].data() as OrganizerSenderConnectionDocument,
    });
  }
  let inserted = 0;
  for (const event of parsed) {
    const candidate = event.phoneNumberId ?
      connectionByPhone.get(event.phoneNumberId) ?? null : null;
    const connection = candidate && event.providerAccountId !== null &&
      candidate.value.wabaId === event.providerAccountId ? candidate : null;
    const eventId = `omwe_${sha256(event.providerEventId).slice(0, 48)}`;
    const receiptRef = params.db.collection("organizerCampaignWebhookReceipts")
      .doc(eventId);
    const queueRef = params.db.collection("organizerMessagingWebhookEvents")
      .doc(eventId);
    const created = await params.db.runTransaction(async (tx) => {
      const receipt = await tx.get(receiptRef);
      if (receipt.exists) return false;
      const commitStop = connection && event.eventKind === "inbound" &&
        event.isStop && event.endpointHash && event.providerAccountId &&
        event.phoneNumberId ? await prepareWhatsappStop(params.db, tx, {
          organizerId: connection.value.organizerId,
          connectionId: connection.id, endpointHash: event.endpointHash,
          providerAccountId: event.providerAccountId,
          providerPhoneNumberId: event.phoneNumberId,
          providerEventId: event.providerEventId,
          payloadHash: event.payloadHash,
          occurredAt: event.providerOccurredAt?.toMillis() ?? null,
          now: now.toMillis(),
        }) : null;
      commitStop?.();
      tx.create(receiptRef, {
        provider: "metaCloudApi",
        providerEventId: event.providerEventId,
        organizerId: connection?.value.organizerId ?? null,
        connectionId: connection?.id ?? null,
        eventKind: connection ? event.eventKind : "unmatched",
        payloadHash: event.payloadHash,
        createdAt: now,
        expiresAt,
      });
      tx.create(queueRef, {
        provider: "metaCloudApi",
        providerEventId: event.providerEventId,
        organizerId: connection?.value.organizerId ?? null,
        connectionId: connection?.id ?? null,
        eventKind: connection ? event.eventKind : "unmatched",
        providerMessageId: event.providerMessageId,
        contextProviderMessageId: event.contextProviderMessageId,
        providerAccountId: event.providerAccountId,
        providerPhoneNumberId: event.phoneNumberId,
        callbackData: event.callbackData,
        inboundReply: event.inboundReply,
        deliveryStatus: event.deliveryStatus,
        endpointHash: event.endpointHash,
        isStop: event.isStop,
        hasReply: event.hasReply,
        inboundBody: event.inboundBody,
        providerErrorCode: event.providerErrorCode,
        providerErrorEvidence: event.providerErrorEvidence,
        providerOccurredAt: event.providerOccurredAt,
        processingStatus: "pending",
        attemptCount: 0,
        createdAt: now,
        processedAt: null,
        expiresAt,
      });
      return true;
    });
    if (created) inserted += 1;
  }
  return inserted;
}

export async function processOrganizerMessagingWebhookEvent(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  event: OrganizerMessagingWebhookEventDocument;
  now?: FirebaseFirestore.Timestamp;
}): Promise<void> {
  const now = params.now ?? admin.firestore.Timestamp.now();
  const eventRef = params.db.collection("organizerMessagingWebhookEvents")
    .doc(params.eventId);
  if (params.event.processingStatus !== "pending") return;
  try {
    if (!params.event.organizerId || !params.event.connectionId ||
        params.event.eventKind === "unmatched") {
      await eventRef.update({
        processingStatus: "unmatched",
        processedAt: now,
        attemptCount: admin.firestore.FieldValue.increment(1),
      });
      return;
    }
    if (params.event.eventKind === "status") {
      await processStatus(params.db, params.event, now);
    } else if (params.event.eventKind === "inbound") {
      await processInbound(params.db, params.event, now);
    }
    await eventRef.update({
      processingStatus: "processed",
      processedAt: now,
      attemptCount: admin.firestore.FieldValue.increment(1),
    });
  } catch (error) {
    await eventRef.update({
      processingStatus: "failed",
      attemptCount: admin.firestore.FieldValue.increment(1),
    });
    throw error;
  }
}

async function processStatus(
  db: FirebaseFirestore.Firestore,
  event: OrganizerMessagingWebhookEventDocument,
  now: FirebaseFirestore.Timestamp
): Promise<void> {
  if (!event.providerMessageId || !event.deliveryStatus ||
      !event.connectionId) return;
  const connectionRef = db.collection("organizerSenderConnections")
    .doc(event.connectionId);
  const connectionSnap = await connectionRef.get();
  const connection = connectionSnap.data() as
    OrganizerSenderConnectionDocument | undefined;
  if (connection?.testProviderMessageId === event.providerMessageId) {
    const delivered = ["delivered", "read"].includes(event.deliveryStatus);
    await connectionRef.update({
      testStatus: delivered ? "delivered" :
        event.deliveryStatus === "failed" ? "failed" : "pending",
      status: delivered ? "active" :
        event.deliveryStatus === "failed" ? "degraded" : connection.status,
      updatedAt: now,
      lastHealthSyncAt: now,
      revision: admin.firestore.FieldValue.increment(1),
    });
  }
  const recipientSnap = await db.collection("organizerCampaignRecipients")
    .where("organizerId", "==", event.organizerId)
    .where("providerMessageId", "==", event.providerMessageId)
    .limit(1).get();
  if (recipientSnap.empty) return;
  const recipientRef = recipientSnap.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(recipientRef);
    const recipient = snap.data() as
      OrganizerCampaignRecipientDocument | undefined;
    if (!recipient || recipient.organizerId !== event.organizerId) return;
    const proposed = event.deliveryStatus;
    if (!proposed) return;
    const next = nextCampaignRecipientStatus(recipient.status, proposed);
    if (next === recipient.status) return;
    const campaignRef = db.collection("organizerCampaigns")
      .doc(recipient.campaignId);
    const patch: FirebaseFirestore.UpdateData<
      OrganizerCampaignRecipientDocument
    > = {
      status: next,
      updatedAt: now,
    };
    if (next === "sent") patch.sentAt = event.providerOccurredAt ?? now;
    if (next === "delivered") {
      patch.deliveredAt = event.providerOccurredAt ?? now;
    }
    if (next === "read") patch.readAt = event.providerOccurredAt ?? now;
    if (next === "failed") {
      patch.failedAt = event.providerOccurredAt ?? now;
      patch.providerErrorCategory = classifyMetaError(event.providerErrorCode);
      patch.retryEligible = false;
    }
    tx.update(recipientRef, patch);
    tx.update(campaignRef, {
      [`deliveryCounts.${recipient.status}`]:
        admin.firestore.FieldValue.increment(-1),
      [`deliveryCounts.${next}`]: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    });
  });
}

async function processInbound(
  db: FirebaseFirestore.Firestore,
  event: OrganizerMessagingWebhookEventDocument,
  now: FirebaseFirestore.Timestamp
): Promise<void> {
  let recipientDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  if (event.contextProviderMessageId) {
    const snap = await db.collection("organizerCampaignRecipients")
      .where("organizerId", "==", event.organizerId)
      .where("providerMessageId", "==", event.contextProviderMessageId)
      .limit(1).get();
    recipientDoc = snap.docs[0] ?? null;
  }
  if (recipientDoc && event.hasReply) {
    await applyInboundRecipientState(
      db,
      recipientDoc,
      event.isStop ? "optedOut" : "replied",
      now
    );
    const recipient = recipientDoc.data() as
      OrganizerCampaignRecipientDocument;
    // An inbound STOP on a program recipient is the household's
    // explicit decline — record it on the consent authority so future
    // sends suppress at claim time.
    const householdId = recipient.programRecipient?.householdId ?? null;
    if (event.isStop && householdId) {
      const householdRef = db.collection("programHouseholds")
        .doc(householdId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(householdRef);
        const household = snap.data() as ProgramHouseholdDocument |
          undefined;
        if (!household) return;
        tx.update(householdRef, {
          messagingConsent: {
            granted: false,
            grantedAt: now,
            source: "whatsappStop",
          },
          updatedAt: now,
          revision: (household.revision ?? 0) + 1,
        });
      });
    }
  }
  // Wedding guests reach their programme's inbox before any CRM matching.
  // A STOP still falls through so organiser suppression stays unchanged.
  const programRoute = await routeProgramWhatsappInbound(db, event, now);
  if (programRoute.kind === "routed") return;
  const stateDocs = recipientDoc ? [] : event.endpointHash ?
    (await db.collection("organizerContactChannelStates")
      .where("organizerId", "==", event.organizerId)
      .where("endpointHash", "==", event.endpointHash)
      .limit(10).get()).docs : [];
  // Program recipients carry no CRM contactId; they skip channel-state
  // and contact writes entirely.
  const contactIds = recipientDoc ?
    [(recipientDoc.data() as OrganizerCampaignRecipientDocument).contactId]
      .filter((id): id is string => id !== null) :
    stateDocs.map((doc) =>
      (doc.data() as OrganizerContactChannelStateDocument).contactId);
  const uniqueContactIds = [...new Set(contactIds)];
  for (const contactId of uniqueContactIds) {
    const stateRef = db.collection("organizerContactChannelStates")
      .doc(organizerContactChannelStateId(event.organizerId!, contactId));
    const contactRef = db.collection("organizerContacts").doc(contactId);
    const [stateSnap, contactSnap] = await Promise.all([
      stateRef.get(),
      contactRef.get(),
    ]);
    const state = stateSnap.data() as
      OrganizerContactChannelStateDocument | undefined;
    const contact = contactSnap.data() as OrganizerContactDocument | undefined;
    if (!contact || contact.organizerId !== event.organizerId) continue;
    await stateRef.set({
      organizerId: event.organizerId,
      contactId,
      channel: "whatsapp",
      endpointHash: event.endpointHash ?? state?.endpointHash ??
        hashEndpoint(contact.phoneE164 ?? contactId),
      suppressionStatus: event.isStop ? "optedOut" :
        state?.suppressionStatus ?? "none",
      suppressionSource: event.isStop ? "inboundStop" :
        state?.suppressionSource ?? null,
      adminSuppressed: state?.adminSuppressed ?? false,
      campaignAcceptedCount: state?.campaignAcceptedCount ?? 0,
      lastCampaignAcceptedAt: state?.lastCampaignAcceptedAt ?? null,
      lastInboundAt: event.providerOccurredAt ?? now,
      lastReplyAt: event.hasReply ? event.providerOccurredAt ?? now :
        state?.lastReplyAt ?? null,
      createdAt: state?.createdAt ?? now,
      updatedAt: now,
    }, {merge: false});
    if (event.isStop && contact.linkedUid) {
      await optOutPreference({
        db,
        organizerId: event.organizerId!,
        uid: contact.linkedUid,
        providerEventId: event.providerEventId,
        now,
      });
    }
  }
  if (uniqueContactIds.length === 1 && event.inboundBody &&
      event.providerMessageId && event.connectionId && event.endpointHash) {
    await persistInboundWhatsappMessage({
      db,
      event,
      contactId: uniqueContactIds[0],
      recipient: recipientDoc?.data() as
        OrganizerCampaignRecipientDocument | undefined,
      now,
    });
  }
}

async function applyInboundRecipientState(
  db: FirebaseFirestore.Firestore,
  recipientDoc: FirebaseFirestore.QueryDocumentSnapshot,
  proposed: "replied" | "optedOut",
  now: FirebaseFirestore.Timestamp
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(recipientDoc.ref);
    const recipient = snap.data() as
      OrganizerCampaignRecipientDocument | undefined;
    if (!recipient) return;
    const next = nextCampaignRecipientStatus(recipient.status, proposed);
    if (next === recipient.status) return;
    tx.update(recipientDoc.ref, {
      status: next,
      ...(next === "replied" ? {repliedAt: now} : {optedOutAt: now}),
      updatedAt: now,
    });
    tx.update(db.collection("organizerCampaigns")
      .doc(recipient.campaignId), {
      [`deliveryCounts.${recipient.status}`]:
        admin.firestore.FieldValue.increment(-1),
      [`deliveryCounts.${next}`]: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    });
  });
}

async function optOutPreference(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  uid: string;
  providerEventId: string;
  now: FirebaseFirestore.Timestamp;
}): Promise<void> {
  const ref = params.db.collection("organizerCommunicationPreferences")
    .doc(organizerCommunicationPreferenceId(params.organizerId, params.uid));
  await params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data() as
      OrganizerCommunicationPreferenceDocument | undefined;
    const receiptRef = params.db
      .collection("organizerCommunicationPermissionReceipts")
      .doc(organizerCommunicationPermissionReceiptId({
        organizerId: params.organizerId,
        uid: params.uid,
        channel: "whatsapp",
        decision: "optedOut",
        source: "inboundStop",
        sourceIdentity: params.providerEventId,
      }));
    // A provider replay is the original STOP, even if a newer, explicit
    // purpose choice has since superseded it. Keep its original revokedAt.
    if ((await tx.get(receiptRef)).exists) return;
    const stopAt = admin.firestore.Timestamp.fromMillis(Math.max(
      params.now.toMillis(),
      (existing?.whatsapp.updatedAt?.toMillis() ?? -1) + 1,
      (existing?.whatsappPurposes?.eventOperations?.updatedAt?.toMillis() ??
        -1) + 1,
      (existing?.whatsappPurposes?.marketing?.updatedAt?.toMillis() ??
        -1) + 1,
    ));
    const receipt = inboundStopPermissionReceipt({
      organizerId: params.organizerId,
      uid: params.uid,
      providerEventId: params.providerEventId,
      supersedesReceiptId: existing?.whatsapp.currentReceiptId ?? null,
      now: stopAt,
    });
    tx.create(receiptRef, receipt.document);
    tx.set(ref, {
      organizerId: params.organizerId,
      uid: params.uid,
      whatsapp: {
        status: "optedOut",
        evidenceStatus: "complete",
        currentReceiptId: receipt.id,
        termsVersion: existing?.whatsapp.termsVersion ?? null,
        source: "inboundStop",
        sourceEventId: null,
        updatedAt: stopAt,
      },
      whatsappPurposes: {
        eventOperations: {
          status: "optedOut", evidenceStatus: "complete",
          currentReceiptId: receipt.id, termsVersion: null,
          source: "inboundStop", sourceEventId: null,
          updatedAt: stopAt,
        },
        marketing: {
          status: "optedOut", evidenceStatus: "complete",
          currentReceiptId: receipt.id, termsVersion: null,
          source: "inboundStop", sourceEventId: null,
          updatedAt: stopAt,
        },
      },
      sms: existing?.sms ?? unknownOrganizerCommunicationChannel(),
      createdAt: existing?.createdAt ?? stopAt,
      updatedAt: stopAt,
    }, {merge: false});
  });
}

function normalizeDeliveryStatus(
  value: string | null
): OrganizerMessagingWebhookEventDocument["deliveryStatus"] {
  return ["sent", "delivered", "read", "failed"].includes(value ?? "") ?
    value as OrganizerMessagingWebhookEventDocument["deliveryStatus"] : null;
}

function parseNativeReply(message: Record<string, unknown>):
  NonNullable<OrganizerMessagingWebhookEventDocument["inboundReply"]> | null {
  if (message.type === "button") {
    const button = recordValue(message.button);
    const payload = boundedString(button.payload, 1024);
    const label = boundedString(button.text, 1024);
    return payload && label ? {kind: "templateQuickReply", payload, label} :
      null;
  }
  if (message.type !== "interactive") return null;
  const interactive = recordValue(message.interactive);
  if (interactive.type !== "button_reply" &&
      interactive.type !== "list_reply") return null;
  const selected = recordValue(interactive[interactive.type]);
  const id = boundedString(selected.id, 1024);
  const label = boundedString(selected.title, 1024);
  if (!id || !label) return null;
  return interactive.type === "button_reply" ?
    {kind: "replyButton", id, label} :
    {kind: "listReply", id, label,
      description: boundedString(selected.description, 4096)};
}

/** Identity and correlation are never truncated or normalized into a match. */
function boundedString(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maximum ? value : null;
}

function providerIdentity(value: unknown): string | null {
  return typeof value === "string" && /^[0-9]{1,32}$/.test(value) ?
    value : null;
}

function endpointHashFromProviderPhone(value: unknown): string | null {
  const raw = stringValue(value)?.replace(/[^0-9]/g, "");
  return raw && /^[1-9][0-9]{7,14}$/.test(raw) ? hashEndpoint(`+${raw}`) : null;
}

function timestampValue(value: unknown): FirebaseFirestore.Timestamp | null {
  const seconds = typeof value === "string" ? Number(value) :
    typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(seconds) && seconds > 0 ?
    admin.firestore.Timestamp.fromMillis(seconds * 1000) : null;
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ?
    value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseErrorEvidence(value: unknown):
  ParsedWebhookEvent["providerErrorEvidence"] {
  if (value === undefined) return {kind: "none"};
  // Ten is our storage/processing bound, not a claimed provider maximum.
  // Never truncate a list or discard an invalid entry into apparent success.
  if (!Array.isArray(value) || value.length > 10) return {kind: "unusable"};
  if (value.length === 0) return {kind: "none"};
  const codes: number[] = [];
  for (const entry of value) {
    const code = recordValue(entry).code;
    if (typeof code !== "number" || !Number.isSafeInteger(code) ||
        code < 0 || code > 999999999) return {kind: "unusable"};
    codes.push(code);
  }
  return {kind: "codes", codes};
}

function sha256(value: crypto.BinaryLike): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const organizerWhatsappWebhook = onRequest(
  {secrets: [metaWhatsappAppSecret, metaWhatsappWebhookVerifyToken]},
  async (request, response) => {
    if (request.method === "GET") {
      const mode = request.query["hub.mode"];
      const token = request.query["hub.verify_token"];
      const challenge = request.query["hub.challenge"];
      if (mode === "subscribe" &&
          token === metaWhatsappWebhookVerifyToken.value() &&
          typeof challenge === "string") {
        response.status(200).send(challenge);
      } else response.status(403).send("Forbidden");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }
    const rawBody = (request as {rawBody?: Buffer}).rawBody;
    if (!rawBody) {
      response.status(400).send("Missing webhook body.");
      return;
    }
    try {
      await ingestMetaWhatsappWebhook({
        db: admin.firestore(),
        rawBody,
        signatureHeader: request.header("x-hub-signature-256"),
        appSecret: metaWhatsappAppSecret.value(),
      });
      response.status(200).send("ok");
    } catch (error) {
      logger.error("Meta WhatsApp webhook rejected", {error});
      response.status(401).send("Invalid webhook.");
    }
  }
);

export const onOrganizerMessagingWebhookEventCreated = onDocumentCreated(
  "organizerMessagingWebhookEvents/{eventId}",
  async (event) => {
    const document = event.data?.data() as
      OrganizerMessagingWebhookEventDocument | undefined;
    if (!document) return;
    await processOrganizerMessagingWebhookEvent({
      db: admin.firestore(),
      eventId: event.params.eventId,
      event: document,
    });
  }
);
