import {expr, projectID} from "firebase-functions/params";
import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {
  appCheckCallableOptionsWithLimits,
  appCheckCallableOptionsWithSecrets,
} from "../shared/callableOptions";
import type {GetOrganizerWhatsappThreadCallablePayload} from
  "../shared/generated/getOrganizerWhatsappThreadCallablePayload";
import type {GetOrganizerWhatsappThreadCallableResponse} from
  "../shared/generated/getOrganizerWhatsappThreadCallableResponse";
import type {
  OrganizerCampaignDocument,
  OrganizerCampaignRecipientDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerMessagingWebhookEventDocument,
  OrganizerSenderConnectionDocument,
  OrganizerWhatsappMessageDocument,
  OrganizerWhatsappReplyOperationDocument,
  OrganizerWhatsappThreadDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerWhatsappThreadsCallablePayload} from
  "../shared/generated/listOrganizerWhatsappThreadsCallablePayload";
import type {ListOrganizerWhatsappThreadsCallableResponse} from
  "../shared/generated/listOrganizerWhatsappThreadsCallableResponse";
import type {SendOrganizerWhatsappReplyCallablePayload} from
  "../shared/generated/sendOrganizerWhatsappReplyCallablePayload";
import type {SendOrganizerWhatsappReplyCallableResponse} from
  "../shared/generated/sendOrganizerWhatsappReplyCallableResponse";
import {
  validateGetOrganizerWhatsappThreadCallablePayload,
} from
  "../shared/generated/validators/getOrganizerWhatsappThreadInput";
import {
  validateListOrganizerWhatsappThreadsCallablePayload,
} from
  "../shared/generated/validators/listOrganizerWhatsappThreadsInput";
import {
  validateSendOrganizerWhatsappReplyCallablePayload,
} from
  "../shared/generated/validators/sendOrganizerWhatsappReplyInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {assertOutboundContentAllowed} from
  "../communications/outboundContentPolicy";
import {organizerContactChannelStateId} from "./organizerCampaignModel";
import {
  metaWhatsappAppId,
  metaWhatsappAppSecret,
  metaWhatsappConfigId,
  metaWhatsappGraphVersion,
  organizerWhatsappAccessTokens,
} from "./organizerMessagingSetup";
import {
  MetaProviderError,
  MetaWhatsappProvider,
  OrganizerTokenStore,
} from "./organizerWhatsappProvider";

const dayMillis = 24 * 60 * 60 * 1000;
export const whatsappServiceWindowMillis = dayMillis;
export const whatsappThreadRetentionMillis = 365 * dayMillis;
const defaultPageSize = 20;
const maxPageSize = 50;
const maxThreadMessages = 200;

interface WhatsappThreadDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof checkRateLimit;
  provider: () => MetaWhatsappProvider;
  tokenStore: OrganizerTokenStore;
}

const defaultDeps: WhatsappThreadDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit,
  provider: () => new MetaWhatsappProvider({
    appId: metaWhatsappAppId.value(),
    appSecret: metaWhatsappAppSecret.value(),
    configId: metaWhatsappConfigId.value(),
    graphVersion: metaWhatsappGraphVersion.value(),
  }),
  tokenStore: new OrganizerTokenStore(),
};

interface ThreadCursor {
  version: 1;
  lastMessageAtMillis: number;
  threadId: string;
}

/** Persists one resolved inbound text body with a rolling 12-month TTL. */
export async function persistInboundWhatsappMessage(params: {
  db: FirebaseFirestore.Firestore;
  event: OrganizerMessagingWebhookEventDocument;
  contactId: string;
  recipient?: OrganizerCampaignRecipientDocument;
  now: FirebaseFirestore.Timestamp;
}): Promise<void> {
  const organizerId = params.event.organizerId;
  const connectionId = params.event.connectionId;
  const providerMessageId = params.event.providerMessageId;
  const endpointHash = params.event.endpointHash;
  const body = params.event.inboundBody;
  if (!organizerId || !connectionId || !providerMessageId || !endpointHash ||
      !body) return;
  const occurredAt = params.event.providerOccurredAt ?? params.now;
  const threadId = organizerWhatsappThreadId(
    organizerId,
    params.contactId
  );
  const messageId = organizerWhatsappMessageId(
    organizerId,
    providerMessageId
  );
  const [campaignEventId, edgeSnapshot] = await Promise.all([
    loadRecipientEventId(params.db, params.recipient),
    params.db.collection("organizerContactEventEdges")
      .where("contactId", "==", params.contactId).limit(50).get(),
  ]);
  const eventIds = new Set(edgeSnapshot.docs.flatMap((document) => {
    const edge = document.data() as OrganizerContactEventEdgeDocument;
    return edge.organizerId === organizerId ? [edge.eventId] : [];
  }));
  if (campaignEventId) eventIds.add(campaignEventId);
  const threadRef = params.db.collection("organizerWhatsappThreads")
    .doc(threadId);
  const messageRef = params.db.collection("organizerWhatsappMessages")
    .doc(messageId);
  await params.db.runTransaction(async (tx) => {
    const [existingMessage, existingThreadSnapshot] = await Promise.all([
      tx.get(messageRef),
      tx.get(threadRef),
    ]);
    if (existingMessage.exists) return;
    const existing = existingThreadSnapshot.data() as
      OrganizerWhatsappThreadDocument | undefined;
    const lastInboundAt = laterTimestamp(existing?.lastInboundAt, occurredAt);
    const serviceWindowExpiresAt = admin.firestore.Timestamp.fromMillis(
      lastInboundAt.toMillis() + whatsappServiceWindowMillis
    );
    const expiresAt = laterTimestamp(
      existing?.expiresAt,
      admin.firestore.Timestamp.fromMillis(
        occurredAt.toMillis() + whatsappThreadRetentionMillis
      )
    );
    const isLatest = !existing ||
      occurredAt.toMillis() >= existing.lastMessageAt.toMillis();
    const thread: OrganizerWhatsappThreadDocument = {
      schemaVersion: 1,
      threadId,
      organizerId,
      contactId: params.contactId,
      connectionId,
      endpointHash,
      eventIds: [...new Set([
        ...(existing?.eventIds ?? []),
        ...eventIds,
      ])].sort().slice(0, 50),
      lastMessageBody: isLatest ? body : existing!.lastMessageBody,
      lastMessageDirection: isLatest ?
        "inbound" : existing!.lastMessageDirection,
      lastMessageAt: isLatest ? occurredAt : existing!.lastMessageAt,
      lastInboundAt,
      serviceWindowExpiresAt,
      messageCount: (existing?.messageCount ?? 0) + 1,
      createdAt: existing?.createdAt ?? params.now,
      updatedAt: params.now,
      expiresAt,
    };
    const message: OrganizerWhatsappMessageDocument = {
      schemaVersion: 1,
      messageId,
      threadId,
      organizerId,
      contactId: params.contactId,
      connectionId,
      direction: "inbound",
      body,
      providerMessageId,
      actorUid: null,
      occurredAt,
      createdAt: params.now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        occurredAt.toMillis() + whatsappThreadRetentionMillis
      ),
    };
    tx.set(threadRef, thread);
    tx.create(messageRef, message);
  });
}

/** Lists WhatsApp summaries as a channel facet inside the Host Inbox. */
export async function listOrganizerWhatsappThreadsHandler(
  request: CallableRequest<unknown>,
  deps: WhatsappThreadDeps = defaultDeps
): Promise<ListOrganizerWhatsappThreadsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListOrganizerWhatsappThreadsCallablePayload
  >(
    request,
    validateListOrganizerWhatsappThreadsCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerWhatsappThreads", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const limit = Math.min(data.limit ?? defaultPageSize, maxPageSize);
  let query: FirebaseFirestore.Query = db
    .collection("organizerWhatsappThreads")
    .where("organizerId", "==", data.organizerId)
    .orderBy("lastMessageAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc");
  const cursor = decodeCursor(data.cursor ?? null);
  if (cursor) {
    query = query.startAfter(
      admin.firestore.Timestamp.fromMillis(cursor.lastMessageAtMillis),
      cursor.threadId
    );
  }
  const nowMillis = deps.now().toMillis();
  const snapshot = await query.limit(limit + 1).get();
  const scanned = snapshot.docs.slice(0, limit);
  const retained = scanned.filter((document) =>
    (document.data() as OrganizerWhatsappThreadDocument)
      .expiresAt.toMillis() > nowMillis
  );
  const selected = retained.slice(0, limit);
  const contactSnapshots = selected.length === 0 ? [] : await db.getAll(
    ...selected.map((document) => {
      const thread = document.data() as OrganizerWhatsappThreadDocument;
      return db.collection("organizerContacts").doc(thread.contactId);
    })
  );
  const contacts = new Map(contactSnapshots
    .filter((contact) => contact.exists)
    .map((contact) => [
      contact.id,
      contact.data() as OrganizerContactDocument,
    ]));
  const threads = selected.map((document) => {
    const thread = document.data() as OrganizerWhatsappThreadDocument;
    if (thread.organizerId !== data.organizerId) {
      throw new HttpsError("internal", "WhatsApp thread scope is invalid.");
    }
    const contact = contacts.get(thread.contactId);
    return {
      threadId: document.id,
      contactId: thread.contactId,
      linkedUid: verifiedWhatsappContactUid(contact, data.organizerId),
      displayName: contact?.organizerId === data.organizerId ?
        contact.displayNameOverride ?? contact.displayName : "Customer",
      eventIds: thread.eventIds,
      lastMessageBody: thread.lastMessageBody,
      lastMessageDirection: thread.lastMessageDirection,
      lastMessageAtMillis: thread.lastMessageAt.toMillis(),
      lastInboundAtMillis: thread.lastInboundAt.toMillis(),
      serviceWindowExpiresAtMillis: thread.serviceWindowExpiresAt.toMillis(),
      serviceWindowOpen: isWhatsappServiceWindowOpen(
        thread.lastInboundAt.toMillis(),
        nowMillis
      ),
    };
  });
  const last = scanned.at(-1);
  return {
    organizerId: data.organizerId,
    threads,
    nextCursor: snapshot.docs.length > limit && last ? encodeCursor({
      version: 1,
      lastMessageAtMillis:
        (last.data() as OrganizerWhatsappThreadDocument)
          .lastMessageAt.toMillis(),
      threadId: last.id,
    }) : null,
  };
}

/** Returns the bounded retained bodies for one manager-authorized thread. */
export async function getOrganizerWhatsappThreadHandler(
  request: CallableRequest<unknown>,
  deps: WhatsappThreadDeps = defaultDeps
): Promise<GetOrganizerWhatsappThreadCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerWhatsappThreadCallablePayload
  >(
    request,
    validateGetOrganizerWhatsappThreadCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getOrganizerWhatsappThread", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const [threadSnapshot, messageSnapshot] = await Promise.all([
    db.collection("organizerWhatsappThreads").doc(data.threadId).get(),
    db.collection("organizerWhatsappMessages")
      .where("organizerId", "==", data.organizerId)
      .where("threadId", "==", data.threadId)
      .orderBy("occurredAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(maxThreadMessages + 1).get(),
  ]);
  const thread = threadSnapshot.data() as
    OrganizerWhatsappThreadDocument | undefined;
  if (!thread || thread.organizerId !== data.organizerId ||
      thread.expiresAt.toMillis() <= deps.now().toMillis()) {
    throw new HttpsError("not-found", "WhatsApp thread not found.");
  }
  const contactSnapshot = await db.collection("organizerContacts")
    .doc(thread.contactId).get();
  const contact = contactSnapshot.data() as OrganizerContactDocument |
    undefined;
  const nowMillis = deps.now().toMillis();
  return {
    organizerId: data.organizerId,
    threadId: data.threadId,
    contactId: thread.contactId,
    linkedUid: verifiedWhatsappContactUid(contact, data.organizerId),
    displayName: contact?.organizerId === data.organizerId ?
      contact.displayNameOverride ?? contact.displayName : "Customer",
    lastInboundAtMillis: thread.lastInboundAt.toMillis(),
    serviceWindowExpiresAtMillis: thread.serviceWindowExpiresAt.toMillis(),
    serviceWindowOpen: isWhatsappServiceWindowOpen(
      thread.lastInboundAt.toMillis(),
      nowMillis
    ),
    messages: messageSnapshot.docs
      .filter((document) =>
        (document.data() as OrganizerWhatsappMessageDocument)
          .expiresAt.toMillis() > nowMillis
      )
      .slice(0, maxThreadMessages)
      .map((document) => {
        const message = document.data() as OrganizerWhatsappMessageDocument;
        return {
          messageId: document.id,
          direction: message.direction,
          body: message.body,
          occurredAtMillis: message.occurredAt.toMillis(),
        };
      }).reverse(),
    messagesTruncated: messageSnapshot.size > maxThreadMessages,
  };
}

/** Sends a free-form reply only inside the latest inbound 24-hour window. */
export async function sendOrganizerWhatsappReplyHandler(
  request: CallableRequest<unknown>,
  deps: WhatsappThreadDeps = defaultDeps
): Promise<SendOrganizerWhatsappReplyCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    SendOrganizerWhatsappReplyCallablePayload
  >(
    request,
    validateSendOrganizerWhatsappReplyCallablePayload,
    normalizePayload
  );
  assertOutboundContentAllowed(
    [data.body],
    "This WhatsApp reply contains language that cannot be delivered.",
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "sendOrganizerWhatsappReply", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const now = deps.now();
  const messageId = organizerWhatsappMessageId(
    data.organizerId,
    `reply|${data.threadId}|${data.idempotencyKey}`
  );
  const operationId = organizerWhatsappReplyOperationId(
    data.organizerId,
    data.threadId,
    data.idempotencyKey
  );
  const bodyHash = sha256(data.body);
  const messageRef = db.collection("organizerWhatsappMessages").doc(messageId);
  const threadRef = db.collection("organizerWhatsappThreads")
    .doc(data.threadId);
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + whatsappThreadRetentionMillis
  );
  const operationRef = db.collection("organizerWhatsappReplyOperations")
    .doc(operationId);
  const reservation = await db.runTransaction(async (tx) => {
    const [operationSnapshot, messageSnapshot, threadSnapshot] =
      await Promise.all([
        tx.get(operationRef),
        tx.get(messageRef),
        tx.get(threadRef),
      ]);
    const existingMessage = messageSnapshot.data() as
      OrganizerWhatsappMessageDocument | undefined;
    if (existingMessage) {
      if (existingMessage.organizerId !== data.organizerId ||
          existingMessage.threadId !== data.threadId ||
          existingMessage.body !== data.body) {
        throw new HttpsError("already-exists", "Reply key is already in use.");
      }
      return {
        kind: "replay" as const,
        response: {
          organizerId: data.organizerId,
          threadId: data.threadId,
          messageId,
          providerMessageId: existingMessage.providerMessageId,
          sentAtMillis: existingMessage.occurredAt.toMillis(),
          replayed: true,
        } satisfies SendOrganizerWhatsappReplyCallableResponse,
      };
    }
    const operation = operationSnapshot.data() as
      OrganizerWhatsappReplyOperationDocument | undefined;
    if (operation) {
      assertMatchingReplyOperation(operation, {
        organizerId: data.organizerId,
        threadId: data.threadId,
        messageId,
        bodyHash,
        expectedLastInboundAtMillis: data.expectedLastInboundAtMillis,
      });
      throw new HttpsError(
        operation.state === "unknown" ? "failed-precondition" : "aborted",
        operation.state === "unknown" ?
          "WhatsApp accepted an attempt with an unknown outcome. Refresh " +
            "before deciding whether to send a new reply." :
          "This WhatsApp reply is already being delivered."
      );
    }
    const thread = threadSnapshot.data() as
      OrganizerWhatsappThreadDocument | undefined;
    if (!thread || thread.organizerId !== data.organizerId ||
        thread.expiresAt.toMillis() <= now.toMillis()) {
      throw new HttpsError("not-found", "WhatsApp thread not found.");
    }
    if (thread.lastInboundAt.toMillis() !==
        data.expectedLastInboundAtMillis) {
      throw new HttpsError(
        "aborted",
        "This WhatsApp service window changed. Refresh and try again."
      );
    }
    if (!isWhatsappServiceWindowOpen(
      thread.lastInboundAt.toMillis(),
      now.toMillis()
    )) {
      throw new HttpsError(
        "failed-precondition",
        "The WhatsApp customer-service window is closed. Use an approved " +
          "template instead."
      );
    }
    const contactRef = db.collection("organizerContacts")
      .doc(thread.contactId);
    const connectionRef = db.collection("organizerSenderConnections")
      .doc(thread.connectionId);
    const channelRef = db.collection("organizerContactChannelStates")
      .doc(organizerContactChannelStateId(
        data.organizerId,
        thread.contactId
      ));
    const [contactSnapshot, connectionSnapshot, channelSnapshot] =
      await Promise.all([
        tx.get(contactRef),
        tx.get(connectionRef),
        tx.get(channelRef),
      ]);
    const contact = contactSnapshot.data() as OrganizerContactDocument |
      undefined;
    const connection = connectionSnapshot.data() as
      OrganizerSenderConnectionDocument | undefined;
    const channel = channelSnapshot.data() as
      OrganizerContactChannelStateDocument | undefined;
    if (!contact || contact.organizerId !== data.organizerId ||
        contact.deletedAt !== null || contact.hiddenAt != null ||
        contact.identityState === "merged" || !contact.phoneE164) {
      throw new HttpsError("failed-precondition", "Customer phone is missing.");
    }
    if (!connection || connection.organizerId !== data.organizerId ||
        connection.status !== "active" || !connection.phoneNumberId ||
        !connection.secretVersionResource) {
      throw new HttpsError(
        "failed-precondition",
        "WhatsApp sender must be active."
      );
    }
    if (channel?.adminSuppressed === true ||
        channel?.suppressionStatus === "optedOut") {
      throw new HttpsError(
        "failed-precondition",
        "WhatsApp messages are suppressed for this customer."
      );
    }
    const replyOperation: OrganizerWhatsappReplyOperationDocument = {
      schemaVersion: 1,
      operationId,
      organizerId: data.organizerId,
      threadId: data.threadId,
      contactId: thread.contactId,
      messageId,
      bodyHash,
      expectedLastInboundAtMillis: data.expectedLastInboundAtMillis,
      actorUid,
      state: "pending",
      providerMessageId: null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };
    tx.create(operationRef, replyOperation);
    return {
      kind: "reserved" as const,
      connection,
      connectionId: thread.connectionId,
      phoneE164: contact.phoneE164,
      contactId: thread.contactId,
    };
  });
  if (reservation.kind === "replay") return reservation.response;

  let accessToken: string;
  try {
    accessToken = await deps.tokenStore.access(
      reservation.connection.secretVersionResource!
    );
  } catch {
    await deletePendingReplyOperation(db, operationRef, bodyHash);
    throw new HttpsError(
      "internal",
      "WhatsApp sender credentials are unavailable."
    );
  }
  let sent: {providerMessageId: string};
  try {
    sent = await deps.provider().sendText({
      accessToken,
      phoneNumberId: reservation.connection.phoneNumberId!,
      toE164: reservation.phoneE164,
      body: data.body,
    });
  } catch (error) {
    if (error instanceof MetaProviderError && error.httpStatus === null) {
      await markReplyOperationUnknown(db, operationRef, bodyHash, deps.now());
      throw new HttpsError(
        "unavailable",
        "WhatsApp delivery could not be confirmed. Refresh before sending " +
          "another reply."
      );
    }
    await deletePendingReplyOperation(db, operationRef, bodyHash);
    throw error;
  }
  const message: OrganizerWhatsappMessageDocument = {
    schemaVersion: 1,
    messageId,
    threadId: data.threadId,
    organizerId: data.organizerId,
    contactId: reservation.contactId,
    connectionId: reservation.connectionId,
    direction: "outbound",
    body: data.body,
    providerMessageId: sent.providerMessageId,
    actorUid,
    occurredAt: now,
    createdAt: now,
    expiresAt,
  };
  try {
    await db.runTransaction(async (tx) => {
      const [liveOperationSnapshot, liveMessage, liveThreadSnapshot] =
        await Promise.all([
          tx.get(operationRef),
          tx.get(messageRef),
          tx.get(threadRef),
        ]);
      const liveOperation = liveOperationSnapshot.data() as
        OrganizerWhatsappReplyOperationDocument | undefined;
      if (!liveOperation || liveOperation.state !== "pending" ||
          liveOperation.bodyHash !== bodyHash) {
        throw new HttpsError(
          "aborted",
          "WhatsApp reply reservation changed before completion."
        );
      }
      if (liveMessage.exists) {
        throw new HttpsError(
          "aborted",
          "WhatsApp reply message changed before completion."
        );
      }
      const liveThread = liveThreadSnapshot.data() as
        OrganizerWhatsappThreadDocument | undefined;
      if (!liveThread || liveThread.organizerId !== data.organizerId) {
        throw new HttpsError("not-found", "WhatsApp thread not found.");
      }
      const isLatest = now.toMillis() >= liveThread.lastMessageAt.toMillis();
      tx.create(messageRef, message);
      tx.update(threadRef, {
        ...(isLatest ? {
          lastMessageBody: data.body,
          lastMessageDirection: "outbound",
          lastMessageAt: now,
        } : {}),
        messageCount: liveThread.messageCount + 1,
        updatedAt: deps.now(),
        expiresAt: laterTimestamp(liveThread.expiresAt, expiresAt),
      });
      tx.update(operationRef, {
        state: "completed",
        providerMessageId: sent.providerMessageId,
        updatedAt: deps.now(),
      });
    });
  } catch {
    await markReplyOperationUnknown(db, operationRef, bodyHash, deps.now());
    throw new HttpsError(
      "unavailable",
      "WhatsApp accepted the reply, but Catch could not confirm its saved " +
        "state. Refresh before sending another reply."
    );
  }
  return {
    organizerId: data.organizerId,
    threadId: data.threadId,
    messageId,
    providerMessageId: sent.providerMessageId,
    sentAtMillis: now.toMillis(),
    replayed: false,
  };
}

export function organizerWhatsappThreadId(
  organizerId: string,
  contactId: string
): string {
  return `owt_${sha256(`${organizerId}|${contactId}`).slice(0, 48)}`;
}

export function organizerWhatsappMessageId(
  organizerId: string,
  providerMessageId: string
): string {
  return `owm_${sha256(`${organizerId}|${providerMessageId}`).slice(0, 48)}`;
}

export function organizerWhatsappReplyOperationId(
  organizerId: string,
  threadId: string,
  idempotencyKey: string
): string {
  return `owro_${sha256(
    `${organizerId}|${threadId}|${idempotencyKey}`
  ).slice(0, 48)}`;
}

function assertMatchingReplyOperation(
  operation: OrganizerWhatsappReplyOperationDocument,
  expected: {
    organizerId: string;
    threadId: string;
    messageId: string;
    bodyHash: string;
    expectedLastInboundAtMillis: number;
  }
): void {
  if (operation.organizerId !== expected.organizerId ||
      operation.threadId !== expected.threadId ||
      operation.messageId !== expected.messageId ||
      operation.bodyHash !== expected.bodyHash ||
      operation.expectedLastInboundAtMillis !==
        expected.expectedLastInboundAtMillis) {
    throw new HttpsError("already-exists", "Reply key is already in use.");
  }
}

async function deletePendingReplyOperation(
  db: FirebaseFirestore.Firestore,
  operationRef: FirebaseFirestore.DocumentReference,
  bodyHash: string
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(operationRef);
    const operation = snapshot.data() as
      OrganizerWhatsappReplyOperationDocument | undefined;
    if (operation?.state === "pending" && operation.bodyHash === bodyHash) {
      tx.delete(operationRef);
    }
  });
}

async function markReplyOperationUnknown(
  db: FirebaseFirestore.Firestore,
  operationRef: FirebaseFirestore.DocumentReference,
  bodyHash: string,
  now: FirebaseFirestore.Timestamp
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(operationRef);
    const operation = snapshot.data() as
      OrganizerWhatsappReplyOperationDocument | undefined;
    if (operation?.state === "pending" && operation.bodyHash === bodyHash) {
      tx.update(operationRef, {state: "unknown", updatedAt: now});
    }
  });
}

export function isWhatsappServiceWindowOpen(
  lastInboundAtMillis: number,
  nowMillis: number
): boolean {
  return nowMillis >= lastInboundAtMillis &&
    nowMillis < lastInboundAtMillis + whatsappServiceWindowMillis;
}

function laterTimestamp(
  left: FirebaseFirestore.Timestamp | undefined,
  right: FirebaseFirestore.Timestamp
): FirebaseFirestore.Timestamp {
  return !left || right.toMillis() > left.toMillis() ? right : left;
}

async function loadRecipientEventId(
  db: FirebaseFirestore.Firestore,
  recipient: OrganizerCampaignRecipientDocument | undefined
): Promise<string | null> {
  if (!recipient) return null;
  const snapshot = await db.collection("organizerCampaigns")
    .doc(recipient.campaignId).get();
  const campaign = snapshot.data() as OrganizerCampaignDocument | undefined;
  return campaign?.organizerId === recipient.organizerId ?
    campaign.eventId : null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function encodeCursor(cursor: ThreadCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | null): ThreadCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as
      Partial<ThreadCursor>;
    if (parsed.version !== 1 ||
        !Number.isSafeInteger(parsed.lastMessageAtMillis) ||
        Number(parsed.lastMessageAtMillis) < 0 ||
        typeof parsed.threadId !== "string" ||
        !/^owt_[a-f0-9]{48}$/.test(parsed.threadId)) throw new Error();
    return parsed as ThreadCursor;
  } catch {
    throw new HttpsError("invalid-argument", "WhatsApp cursor is invalid.");
  }
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const result = {...value} as Record<string, unknown>;
  for (const key of ["organizerId", "threadId", "body", "cursor"]) {
    if (typeof result[key] === "string") result[key] = result[key].trim();
  }
  return result;
}

const callableLimits = {timeoutSeconds: 60, maxInstances: 20};

export const listOrganizerWhatsappThreads = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => listOrganizerWhatsappThreadsHandler(request)
);

export const getOrganizerWhatsappThread = onCall(
  appCheckCallableOptionsWithLimits(callableLimits),
  (request) => getOrganizerWhatsappThreadHandler(request)
);

export const sendOrganizerWhatsappReply = onCall(
  {
    ...appCheckCallableOptionsWithSecrets(
      [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
      callableLimits
    ),
    serviceAccount:
      expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`,
  },
  (request) => sendOrganizerWhatsappReplyHandler(request)
);

/** Identity is an explicit CRM assertion, never a name or phone heuristic. */
export function verifiedWhatsappContactUid(
  contact: OrganizerContactDocument | undefined,
  organizerId: string,
): string | null {
  return contact?.organizerId === organizerId &&
      contact.identityState === "verified" &&
      contact.identityConfidence === "verified" &&
      !contact.deletedAt && !contact.hiddenAt && !contact.mergedIntoContactId ?
    contact.linkedUid : null;
}
