import * as admin from "firebase-admin";
import {defineSecret, defineString, expr, projectID} from
  "firebase-functions/params";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from
  "../shared/callableOptions";
import type {CompleteOrganizerWhatsappConnectionCallablePayload} from
  "../shared/generated/completeOrganizerWhatsappConnectionCallablePayload";
import type {
  OrganizerMessageTemplateDocument,
  OrganizerSenderConnectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerMessagingSetupCallableResponse} from
  "../shared/generated/organizerMessagingSetupCallableResponse";
import type {OrganizerSenderConnectionActionCallablePayload} from
  "../shared/generated/organizerSenderConnectionActionCallablePayload";
import type {SendOrganizerWhatsappTestCallablePayload} from
  "../shared/generated/sendOrganizerWhatsappTestCallablePayload";
import {
  validateCompleteOrganizerWhatsappConnectionCallablePayload,
} from
  "../shared/generated/validators/completeOrganizerWhatsappConnectionInput";
import {
  validateOrganizerSenderConnectionActionCallablePayload,
} from
  "../shared/generated/validators/organizerSenderConnectionActionInput";
import {
  validateSendOrganizerWhatsappTestCallablePayload,
} from
  "../shared/generated/validators/sendOrganizerWhatsappTestInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit, RateLimitConfig} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  hashEndpoint,
  organizerMessageTemplateId,
  organizerSenderConnectionId,
} from "./organizerCampaignModel";
import {
  MetaTemplateSnapshot,
  MetaWhatsappProvider,
  OrganizerTokenStore,
  metaTemplateFromDocument,
} from "./organizerWhatsappProvider";
import {assertOutboundContentAllowed} from
  "../communications/outboundContentPolicy";

export const metaWhatsappAppId = defineString("META_WHATSAPP_APP_ID", {
  default: "",
});
export const metaWhatsappConfigId = defineString(
  "META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID", {default: ""}
);
export const metaWhatsappGraphVersion = defineString(
  "META_WHATSAPP_GRAPH_VERSION", {default: "v23.0"}
);
export const metaWhatsappEnabled = defineString(
  "META_WHATSAPP_ENABLED", {default: "false"}
);
export const metaWhatsappAppSecret = defineSecret("META_WHATSAPP_APP_SECRET");
export const organizerWhatsappAccessTokens = defineSecret(
  "ORGANIZER_WHATSAPP_ACCESS_TOKENS"
);

interface OrganizerMessagingSetupDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  provider: () => MetaWhatsappProvider;
  tokenStore: OrganizerTokenStore;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: OrganizerMessagingSetupDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  provider: () => new MetaWhatsappProvider({
    appId: metaWhatsappAppId.value(),
    appSecret: metaWhatsappAppSecret.value(),
    configId: metaWhatsappConfigId.value(),
    graphVersion: metaWhatsappGraphVersion.value(),
  }),
  tokenStore: new OrganizerTokenStore(),
  now: () => admin.firestore.Timestamp.now(),
};

export async function completeOrganizerWhatsappConnectionHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerMessagingSetupDeps = defaultDeps
): Promise<OrganizerMessagingSetupCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    CompleteOrganizerWhatsappConnectionCallablePayload
  >(
    request,
    validateCompleteOrganizerWhatsappConnectionCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db, actorUid, "completeOrganizerWhatsappConnection",
    {maxRequests: 10, windowMs: 60 * 60 * 1000}
  );
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  assertProviderConfigured();
  const provider = deps.provider();
  const accessToken = await provider.exchangeAuthorizationCode(
    data.authorizationCode
  );
  const phone = await provider.verifyAndSubscribe({
    accessToken,
    wabaId: data.wabaId,
    phoneNumberId: data.phoneNumberId,
    businessId: data.businessId,
  });
  const connectionId = organizerSenderConnectionId(
    data.organizerId, data.phoneNumberId
  );
  const secretVersionResource = await deps.tokenStore.store({
    organizerId: data.organizerId,
    connectionId,
    accessToken,
  });
  const connectionRef = db.collection("organizerSenderConnections")
    .doc(connectionId);
  const existing = await connectionRef.get();
  const previous = existing.data() as
    OrganizerSenderConnectionDocument | undefined;
  if (previous && previous.organizerId !== data.organizerId) {
    throw new HttpsError("already-exists", "Sender connection id collision.");
  }
  const now = deps.now();
  const connection: OrganizerSenderConnectionDocument = {
    organizerId: data.organizerId,
    channel: "whatsapp",
    provider: "metaCloudApi",
    status: "testing",
    wabaId: data.wabaId,
    phoneNumberId: data.phoneNumberId,
    businessId: phone.businessId,
    displayPhoneNumber: phone.displayPhoneNumber,
    verifiedName: phone.verifiedName,
    secretVersionResource,
    qualityRating: qualityRating(phone.qualityRating),
    messagingLimitTier: phone.messagingLimitTier,
    templateSyncStatus: "notStarted",
    webhookStatus: "subscribed",
    testStatus: "notSent",
    testProviderMessageId: null,
    testRecipientHash: null,
    connectedByUid: actorUid,
    revision: (previous?.revision ?? 0) + 1,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    lastHealthSyncAt: now,
    disconnectedAt: null,
  };
  await connectionRef.set(connection);
  if (previous?.secretVersionResource &&
      previous.secretVersionResource !== secretVersionResource) {
    await deps.tokenStore.disable(previous.secretVersionResource)
      .catch(() => undefined);
  }
  return getSetupResponse(db, data.organizerId, connectionId);
}

export async function getOrganizerMessagingSetupHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerMessagingSetupDeps = defaultDeps
): Promise<OrganizerMessagingSetupCallableResponse> {
  const {actorUid, data, db} = await authorizeAction(
    request, "getOrganizerMessagingSetup",
    {maxRequests: 30, windowMs: 60 * 1000}, deps
  );
  void actorUid;
  return getSetupResponse(db, data.organizerId, data.connectionId ?? null);
}

export async function syncOrganizerWhatsappTemplatesHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerMessagingSetupDeps = defaultDeps
): Promise<OrganizerMessagingSetupCallableResponse> {
  const {data, db} = await authorizeAction(
    request, "syncOrganizerWhatsappTemplates",
    {maxRequests: 30, windowMs: 60 * 1000}, deps
  );
  assertProviderConfigured();
  const {connectionId, connection} = await requireConnection(
    db, data.organizerId, data.connectionId ?? null
  );
  const accessToken = await requireConnectionToken(connection, deps);
  const templates = await deps.provider().listTemplates({
    accessToken,
    wabaId: requiredProviderId(connection.wabaId, "WhatsApp account"),
  });
  const now = deps.now();
  const writer = db.bulkWriter();
  for (const template of templates) {
    writer.set(db.collection("organizerMessageTemplates").doc(
      organizerMessageTemplateId(
        connectionId, template.providerTemplateId, template.language
      )
    ), templateDocument({
      organizerId: data.organizerId,
      connectionId,
      template,
      now,
    }));
  }
  await writer.close();
  await db.collection("organizerSenderConnections").doc(connectionId).update({
    templateSyncStatus: "current",
    updatedAt: now,
    lastHealthSyncAt: now,
    revision: admin.firestore.FieldValue.increment(1),
  });
  return getSetupResponse(db, data.organizerId, connectionId);
}

export async function sendOrganizerWhatsappTestHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerMessagingSetupDeps = defaultDeps
): Promise<OrganizerMessagingSetupCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    SendOrganizerWhatsappTestCallablePayload
  >(
    request,
    validateSendOrganizerWhatsappTestCallablePayload,
    normalizePayload
  );
  assertOutboundContentAllowed(
    Object.values(data.templateVariables),
    "A WhatsApp test value contains language that cannot be delivered.",
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "sendOrganizerWhatsappTest", {
    maxRequests: 5, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  assertProviderConfigured();
  const {connection} = await requireConnection(
    db, data.organizerId, data.connectionId
  );
  const templateSnap = await db.collection("organizerMessageTemplates")
    .doc(data.templateId).get();
  const template = templateSnap.data() as
    OrganizerMessageTemplateDocument | undefined;
  if (!template || template.organizerId !== data.organizerId ||
      template.connectionId !== data.connectionId ||
      template.status !== "APPROVED") {
    throw new HttpsError(
      "failed-precondition", "Choose an approved WhatsApp template."
    );
  }
  assertExactTemplateVariables(template.variableNames, data.templateVariables);
  const accessToken = await requireConnectionToken(connection, deps);
  const result = await deps.provider().sendTemplate({
    accessToken,
    phoneNumberId: requiredProviderId(
      connection.phoneNumberId, "sender phone number"
    ),
    toE164: data.toE164,
    template: metaTemplateFromDocument(template),
    variables: data.templateVariables,
  });
  await db.collection("organizerSenderConnections")
    .doc(data.connectionId).update({
      status: "testing",
      testStatus: "pending",
      testProviderMessageId: result.providerMessageId,
      testRecipientHash: hashEndpoint(data.toE164),
      updatedAt: deps.now(),
      revision: admin.firestore.FieldValue.increment(1),
    });
  return getSetupResponse(db, data.organizerId, data.connectionId);
}

export async function disconnectOrganizerWhatsappConnectionHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerMessagingSetupDeps = defaultDeps
): Promise<OrganizerMessagingSetupCallableResponse> {
  const {data, db} = await authorizeAction(
    request, "disconnectOrganizerWhatsappConnection",
    {maxRequests: 30, windowMs: 60 * 1000}, deps
  );
  const {connectionId, connection} = await requireConnection(
    db, data.organizerId, data.connectionId ?? null
  );
  if (connection.status !== "disconnected" &&
      connection.secretVersionResource) {
    const accessToken = await deps.tokenStore.access(
      connection.secretVersionResource
    );
    if (connection.wabaId) {
      await deps.provider().unsubscribe({
        accessToken,
        wabaId: connection.wabaId,
      }).catch(() => undefined);
    }
    await deps.tokenStore.disable(connection.secretVersionResource);
  }
  const now = deps.now();
  await db.collection("organizerSenderConnections").doc(connectionId).update({
    status: "disconnected",
    webhookStatus: "notSubscribed",
    disconnectedAt: now,
    updatedAt: now,
    revision: admin.firestore.FieldValue.increment(1),
  });
  return getSetupResponse(db, data.organizerId, connectionId);
}

async function authorizeAction(
  request: CallableRequest<unknown>,
  operation: string,
  limit: RateLimitConfig,
  deps: OrganizerMessagingSetupDeps
): Promise<{
  actorUid: string;
  data: OrganizerSenderConnectionActionCallablePayload;
  db: FirebaseFirestore.Firestore;
}> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    OrganizerSenderConnectionActionCallablePayload
  >(
    request,
    validateOrganizerSenderConnectionActionCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, operation, limit);
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  return {actorUid, data, db};
}

async function requireConnection(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  requestedConnectionId: string | null
): Promise<{
  connectionId: string;
  connection: OrganizerSenderConnectionDocument;
}> {
  const snapshot = requestedConnectionId ?
    await db.collection("organizerSenderConnections")
      .doc(requestedConnectionId).get() :
    await db.collection("organizerSenderConnections")
      .where("organizerId", "==", organizerId)
      .where("channel", "==", "whatsapp")
      .where("status", "!=", "disconnected")
      .limit(1).get();
  const doc = "docs" in snapshot ? snapshot.docs[0] : snapshot;
  const connection = doc?.data() as
    OrganizerSenderConnectionDocument | undefined;
  if (!doc || !connection || connection.organizerId !== organizerId) {
    throw new HttpsError("not-found", "WhatsApp sender is not connected.");
  }
  return {connectionId: doc.id, connection};
}

async function requireConnectionToken(
  connection: OrganizerSenderConnectionDocument,
  deps: OrganizerMessagingSetupDeps
): Promise<string> {
  if (!connection.secretVersionResource ||
      connection.status === "disconnected" ||
      connection.status === "tokenRevoked") {
    throw new HttpsError(
      "failed-precondition", "WhatsApp sender must be reconnected."
    );
  }
  return deps.tokenStore.access(connection.secretVersionResource);
}

async function getSetupResponse(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  requestedConnectionId: string | null
): Promise<OrganizerMessagingSetupCallableResponse> {
  let connectionId = requestedConnectionId;
  let connection: OrganizerSenderConnectionDocument | null = null;
  if (connectionId) {
    const snap = await db.collection("organizerSenderConnections")
      .doc(connectionId).get();
    const value = snap.data() as OrganizerSenderConnectionDocument | undefined;
    if (value?.organizerId === organizerId) connection = value;
  } else {
    const snap = await db.collection("organizerSenderConnections")
      .where("organizerId", "==", organizerId)
      .where("channel", "==", "whatsapp")
      .orderBy("updatedAt", "desc")
      .limit(1).get();
    if (!snap.empty) {
      connectionId = snap.docs[0].id;
      connection = snap.docs[0].data() as OrganizerSenderConnectionDocument;
    }
  }
  const templates = !connectionId ? [] :
    (await db.collection("organizerMessageTemplates")
      .where("organizerId", "==", organizerId)
      .where("connectionId", "==", connectionId)
      .limit(200).get()).docs.map((doc) => ({
      templateId: doc.id,
      ...templateResponse(doc.data() as OrganizerMessageTemplateDocument),
    }));
  const providerConfigured = configured(metaWhatsappAppId.value()) &&
    configured(metaWhatsappConfigId.value()) && metaProviderEnabled();
  return {
    organizerId,
    providerConfigured,
    embeddedSignup: {
      appId: configured(metaWhatsappAppId.value()) ?
        metaWhatsappAppId.value() : null,
      configId: configured(metaWhatsappConfigId.value()) ?
        metaWhatsappConfigId.value() : null,
      graphVersion: providerConfigured ?
        metaWhatsappGraphVersion.value() : null,
    },
    connection: connection && connectionId ? {
      connectionId,
      status: connection.status,
      displayPhoneNumber: connection.displayPhoneNumber,
      verifiedName: connection.verifiedName,
      qualityRating: connection.qualityRating,
      messagingLimitTier: connection.messagingLimitTier,
      templateSyncStatus: connection.templateSyncStatus,
      webhookStatus: connection.webhookStatus,
      testStatus: connection.testStatus,
      revision: connection.revision,
    } : null,
    templates,
  };
}

function templateResponse(template: OrganizerMessageTemplateDocument) {
  return {
    name: template.name,
    language: template.language,
    category: template.category,
    status: template.status,
    variableNames: template.variableNames,
    hasMediaHeader: template.hasMediaHeader,
    buttonKinds: template.buttonKinds,
  };
}

function templateDocument(params: {
  organizerId: string;
  connectionId: string;
  template: MetaTemplateSnapshot;
  now: FirebaseFirestore.Timestamp;
}): OrganizerMessageTemplateDocument {
  return {
    organizerId: params.organizerId,
    connectionId: params.connectionId,
    ...params.template,
    providerUpdatedAt: null,
    syncedAt: params.now,
  };
}

function assertProviderConfigured(): void {
  if (!metaProviderEnabled() || !configured(metaWhatsappAppId.value()) ||
      !configured(metaWhatsappConfigId.value()) ||
      !configured(metaWhatsappAppSecret.value())) {
    throw new HttpsError(
      "failed-precondition", "WhatsApp provider setup is not configured."
    );
  }
}

function metaProviderEnabled(): boolean {
  return metaWhatsappEnabled.value().trim().toLowerCase() === "true";
}

function configured(value: string): boolean {
  return value.trim().length > 0;
}

function qualityRating(value: string | null):
OrganizerSenderConnectionDocument["qualityRating"] {
  return ["GREEN", "YELLOW", "RED"].includes(value ?? "") ?
    value as OrganizerSenderConnectionDocument["qualityRating"] : "UNKNOWN";
}

function requiredProviderId(value: string | null, label: string): string {
  if (!value) {
    throw new HttpsError(
      "failed-precondition", `The ${label} is missing.`
    );
  }
  return value;
}

function assertExactTemplateVariables(
  expected: string[],
  provided: Record<string, string>
): void {
  const left = [...expected].sort();
  const right = Object.keys(provided).sort();
  if (left.length !== right.length || left.some((key, index) =>
    key !== right[index])) {
    throw new HttpsError(
      "failed-precondition",
      "Template variables no longer match the approved provider template."
    );
  }
}

function normalizePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data as Record<string, unknown>};
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === "string") normalized[key] = value.trim();
  }
  if (typeof normalized.templateVariables === "object" &&
      normalized.templateVariables !== null &&
      !Array.isArray(normalized.templateVariables)) {
    normalized.templateVariables = Object.fromEntries(Object.entries(
      normalized.templateVariables as Record<string, unknown>
    ).map(([key, value]) => [
      key.trim(), typeof value === "string" ? value.trim() : value,
    ]));
  }
  return normalized;
}

const messagingCallableLimits = {
  timeoutSeconds: 60,
  maxInstances: 20,
  concurrency: 20,
};

export const completeOrganizerWhatsappConnection = onCall(
  appCheckCallableOptionsWithSecrets(
    [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
    messagingCallableLimits
  ),
  (request) => completeOrganizerWhatsappConnectionHandler(request)
);
export const getOrganizerMessagingSetup = onCall(
  {
    ...appCheckCallableOptionsWithSecrets(
      [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
      messagingCallableLimits
    ),
    serviceAccount:
      expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`,
  },
  (request) => getOrganizerMessagingSetupHandler(request)
);
export const syncOrganizerWhatsappTemplates = onCall(
  {
    ...appCheckCallableOptionsWithSecrets(
      [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
      messagingCallableLimits
    ),
    serviceAccount:
      expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`,
  },
  (request) => syncOrganizerWhatsappTemplatesHandler(request)
);
export const sendOrganizerWhatsappTest = onCall(
  {
    ...appCheckCallableOptionsWithSecrets(
      [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
      messagingCallableLimits
    ),
    serviceAccount:
      expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`,
  },
  (request) => sendOrganizerWhatsappTestHandler(request)
);
export const disconnectOrganizerWhatsappConnection = onCall(
  appCheckCallableOptionsWithSecrets(
    [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
    messagingCallableLimits
  ),
  (request) => disconnectOrganizerWhatsappConnectionHandler(request)
);
