import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import type {ConnectOrganizerLumaProviderCallablePayload} from
  "../shared/generated/connectOrganizerLumaProviderCallablePayload";
import type {DisconnectOrganizerProviderCallablePayload} from
  "../shared/generated/disconnectOrganizerProviderCallablePayload";
import type {
  EventAttendeeDocument,
  EventDocument,
  ExternalEventMappingDocument,
  OrganizerProviderConnectionDocument,
  ProviderSyncRunDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {GetOrganizerProviderSetupCallablePayload} from
  "../shared/generated/getOrganizerProviderSetupCallablePayload";
import type {ListOrganizerLumaEventsCallablePayload} from
  "../shared/generated/listOrganizerLumaEventsCallablePayload";
import type {ListOrganizerLumaEventsCallableResponse} from
  "../shared/generated/listOrganizerLumaEventsCallableResponse";
import type {OrganizerProviderSetupCallableResponse} from
  "../shared/generated/organizerProviderSetupCallableResponse";
import type {SyncOrganizerProviderEventCallablePayload} from
  "../shared/generated/syncOrganizerProviderEventCallablePayload";
import type {SyncOrganizerProviderEventCallableResponse} from
  "../shared/generated/syncOrganizerProviderEventCallableResponse";
import {
  validateConnectOrganizerLumaProviderCallablePayload,
} from
  "../shared/generated/validators/connectOrganizerLumaProviderInput";
import {
  validateDisconnectOrganizerProviderCallablePayload,
} from
  "../shared/generated/validators/disconnectOrganizerProviderInput";
import {
  validateGetOrganizerProviderSetupCallablePayload,
} from
  "../shared/generated/validators/getOrganizerProviderSetupInput";
import {
  validateListOrganizerLumaEventsCallablePayload,
} from "../shared/generated/validators/listOrganizerLumaEventsInput";
import {
  validateSyncOrganizerProviderEventCallablePayload,
} from
  "../shared/generated/validators/syncOrganizerProviderEventInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {eventAttendeeId, normalizeRosterPhone} from
  "../events/eventAttendees";
import {readSeatMigrationWriterFence} from
  "../events/seatMigrationPaged";
import {prepareProviderSeatChanges} from "./organizerProviderSeats";
import {organizerProviderCatalog} from "./organizerProviderCatalog";
import {
  LumaCalendar,
  LumaEventPage,
  LumaGuest,
  LumaProvider,
  LumaProviderError,
  OrganizerProviderCredentialStore,
} from "./organizerLumaProvider";

interface OrganizerProviderSetupDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  luma: () => LumaProvider;
  credentialStore: OrganizerProviderCredentialStore;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: OrganizerProviderSetupDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  luma: () => new LumaProvider(),
  credentialStore: new OrganizerProviderCredentialStore(),
  now: () => admin.firestore.Timestamp.now(),
};

const connectionCapabilities:
OrganizerProviderConnectionDocument["capabilities"] = {
  eventList: true,
  rosterIdentity: true,
  registrationStatus: true,
  providerCheckIn: true,
  orderAmount: false,
  refundStatus: false,
  referralCode: false,
  webhooks: false,
  writeBookings: false,
};

const fieldAuthority: ExternalEventMappingDocument["fieldAuthority"] = {
  rosterIdentity: "provider",
  registrationStatus: "provider",
  checkIn: "providerWhenPresent",
  orderAmount: "unavailable",
  refundStatus: "unavailable",
  referralCode: "unavailable",
};

const syncRunRetentionMillis = 30 * 24 * 60 * 60 * 1000;

export async function getOrganizerProviderSetupHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerProviderSetupDeps = defaultDeps,
): Promise<OrganizerProviderSetupCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerProviderSetupCallablePayload
  >(
    request,
    validateGetOrganizerProviderSetupCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getOrganizerProviderSetup", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  await requireScopedEvent(db, data.organizerId, data.eventId);
  return providerSetupResponse(db, data.organizerId, data.eventId);
}

export async function connectOrganizerLumaProviderHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerProviderSetupDeps = defaultDeps,
): Promise<OrganizerProviderSetupCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ConnectOrganizerLumaProviderCallablePayload
  >(
    request,
    validateConnectOrganizerLumaProviderCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "connectOrganizerLumaProvider", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const event = await requireScopedEvent(
    db, data.organizerId, data.eventId, "luma"
  );
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event is cancelled.");
  }

  let calendar;
  let externalEvent;
  try {
    [calendar, externalEvent] = await Promise.all([
      deps.luma().getCalendar(data.apiKey),
      deps.luma().getEvent(data.apiKey, data.externalEventId),
    ]);
  } catch (error) {
    throw providerHttpsError(error);
  }
  if (externalEvent.id !== data.externalEventId) {
    throw new HttpsError(
      "failed-precondition", "Luma returned a different event."
    );
  }

  const now = deps.now();
  const connectionId = organizerProviderConnectionId(
    data.organizerId, "luma", calendar.id
  );
  const mappingId = externalEventMappingId(data.eventId);
  const connectionRef = db.collection("organizerProviderConnections")
    .doc(connectionId);
  const mappingRef = db.collection("externalEventMappings").doc(mappingId);
  const [oldConnectionSnap, oldMappingSnap] = await Promise.all([
    connectionRef.get(), mappingRef.get(),
  ]);
  const oldConnection = oldConnectionSnap.data() as
    OrganizerProviderConnectionDocument | undefined;
  const oldMapping = oldMappingSnap.data() as
    ExternalEventMappingDocument | undefined;
  if (oldMapping && oldMapping.organizerId !== data.organizerId) {
    throw new HttpsError("already-exists", "Event mapping id collision.");
  }

  const secretVersionResource = await deps.credentialStore.store({
    organizerId: data.organizerId,
    connectionId,
    credential: data.apiKey,
  });
  const connection: OrganizerProviderConnectionDocument = {
    organizerId: data.organizerId,
    provider: "luma",
    adapterClass: "A",
    status: "active",
    externalAccountId: calendar.id,
    externalAccountName: calendar.name,
    secretVersionResource,
    syncMode: "manualPoll",
    capabilities: connectionCapabilities,
    connectedByUid: actorUid,
    revision: (oldConnection?.revision ?? 0) + 1,
    createdAt: oldConnection?.createdAt ?? now,
    updatedAt: now,
    lastHealthSyncAt: now,
    lastSuccessfulSyncAt: oldConnection?.lastSuccessfulSyncAt ?? null,
    lastErrorCode: null,
    disconnectedAt: null,
  };
  const mapping: ExternalEventMappingDocument = {
    organizerId: data.organizerId,
    eventId: data.eventId,
    connectionId,
    provider: "luma",
    externalEventId: externalEvent.id,
    status: "active",
    fieldAuthority,
    revision: (oldMapping?.revision ?? 0) + 1,
    createdByUid: oldMapping?.createdByUid ?? actorUid,
    createdAt: oldMapping?.createdAt ?? now,
    updatedAt: now,
    lastSyncAt: oldMapping?.lastSyncAt ?? null,
    lastSuccessfulSyncAt: oldMapping?.lastSuccessfulSyncAt ?? null,
    lastSyncStatus: oldMapping?.lastSyncStatus ?? "never",
    lastSyncRunId: oldMapping?.lastSyncRunId ?? null,
    disconnectedAt: null,
  };
  const batch = db.batch();
  batch.set(connectionRef, connection);
  batch.set(mappingRef, mapping);
  batch.update(db.collection("events").doc(data.eventId), {
    eventOrigin: {
      ...event.eventOrigin,
      rosterAuthority: "providerSync",
      externalEventId: externalEvent.id,
      adapterVersion: "luma-public-api-v1",
      connectedAt: now,
      connectedBy: actorUid,
    },
  });
  try {
    await batch.commit();
  } catch (error) {
    await deps.credentialStore.disable(secretVersionResource)
      .catch(() => undefined);
    throw error;
  }
  if (oldConnection?.secretVersionResource &&
      oldConnection.secretVersionResource !== secretVersionResource) {
    await deps.credentialStore.disable(oldConnection.secretVersionResource)
      .catch(() => undefined);
  }
  return providerSetupResponse(db, data.organizerId, data.eventId);
}

export async function listOrganizerLumaEventsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerProviderSetupDeps = defaultDeps,
): Promise<ListOrganizerLumaEventsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListOrganizerLumaEventsCallablePayload>(
    request,
    validateListOrganizerLumaEventsCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerLumaEvents", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const event = await requireScopedEvent(
    db, data.organizerId, data.eventId, "luma"
  );
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event is cancelled.");
  }
  try {
    const provider = deps.luma();
    const [calendar, page] = await Promise.all([
      provider.getCalendar(data.apiKey),
      provider.listEvents({apiKey: data.apiKey, limit: 50}),
    ]);
    return lumaEventChoicesResponse(calendar, page);
  } catch (error) {
    throw providerHttpsError(error);
  }
}

export function lumaEventChoicesResponse(
  calendar: LumaCalendar,
  page: LumaEventPage,
): ListOrganizerLumaEventsCallableResponse {
  return {
    calendarName: calendar.name,
    events: page.entries.map((choice) => ({
      externalEventId: choice.id,
      name: choice.name,
      startAtMillis: requiredProviderDate(choice.startAt).getTime(),
    })),
    truncated: page.hasMore,
  };
}

export async function syncOrganizerProviderEventHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerProviderSetupDeps = defaultDeps,
): Promise<SyncOrganizerProviderEventCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    SyncOrganizerProviderEventCallablePayload
  >(
    request,
    validateSyncOrganizerProviderEventCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "syncOrganizerProviderEvent", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  await requireScopedEvent(db, data.organizerId, data.eventId);
  const mappingId = externalEventMappingId(data.eventId);
  const mappingRef = db.collection("externalEventMappings").doc(mappingId);
  const mappingSnap = await mappingRef.get();
  const mapping = mappingSnap.data() as
    ExternalEventMappingDocument | undefined;
  if (!mapping || mapping.organizerId !== data.organizerId ||
      mapping.status !== "active") {
    throw new HttpsError(
      "failed-precondition", "Connect this event to a provider first."
    );
  }
  const connectionRef = db.collection("organizerProviderConnections")
    .doc(mapping.connectionId);
  const connectionSnap = await connectionRef.get();
  const connection = connectionSnap.data() as
    OrganizerProviderConnectionDocument | undefined;
  if (!connection || connection.organizerId !== data.organizerId ||
      connection.status !== "active" || !connection.secretVersionResource) {
    throw new HttpsError(
      "failed-precondition", "The provider connection must be reconnected."
    );
  }

  const inputHash = sha256(JSON.stringify({
    eventId: data.eventId,
    mappingId,
    mappingRevision: mapping.revision,
    connectionId: mapping.connectionId,
    connectionRevision: connection.revision,
    externalEventId: mapping.externalEventId,
  }));
  const runId = providerSyncRunId(
    data.eventId, actorUid, data.clientOperationId
  );
  const runRef = db.collection("providerSyncRuns").doc(runId);
  const existingRunSnap = await runRef.get();
  if (existingRunSnap.exists) {
    const existing = existingRunSnap.data() as ProviderSyncRunDocument;
    if (existing.inputHash !== inputHash) {
      throw new HttpsError(
        "failed-precondition",
        "This sync operation id was already used for another provider state."
      );
    }
    if (existing.status === "running") {
      throw new HttpsError("aborted", "This provider sync is still running.");
    }
    return syncResponse(existing, true);
  }

  const startedAt = deps.now();
  const running: ProviderSyncRunDocument = {
    organizerId: data.organizerId,
    eventId: data.eventId,
    connectionId: mapping.connectionId,
    mappingId,
    provider: "luma",
    clientOperationId: data.clientOperationId,
    inputHash,
    status: "running",
    pageCount: 0,
    receivedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    truncated: false,
    errorCode: null,
    startedByUid: actorUid,
    startedAt,
    completedAt: null,
    expiresAt: admin.firestore.Timestamp.fromMillis(
      startedAt.toMillis() + syncRunRetentionMillis
    ),
  };
  const created = await db.runTransaction(async (tx) => {
    const currentRun = await tx.get(runRef);
    if (currentRun.exists) return false;
    tx.create(runRef, running);
    tx.update(mappingRef, {
      lastSyncAt: startedAt,
      lastSyncStatus: "running",
      lastSyncRunId: runId,
      updatedAt: startedAt,
    });
    return true;
  });
  if (!created) {
    const concurrent = (await runRef.get()).data() as
      ProviderSyncRunDocument | undefined;
    if (concurrent?.inputHash !== inputHash) {
      throw new HttpsError(
        "failed-precondition",
        "This sync operation id was concurrently used for another state."
      );
    }
    if (!concurrent || concurrent.status === "running") {
      throw new HttpsError("aborted", "This provider sync is still running.");
    }
    return syncResponse(concurrent, true);
  }

  try {
    const apiKey = await deps.credentialStore.access(
      connection.secretVersionResource
    );
    const fetched = await fetchLumaGuests({
      provider: deps.luma(), apiKey, externalEventId: mapping.externalEventId,
    });
    const completedAt = deps.now();
    const result = await reconcileLumaGuests({
      db,
      actorUid,
      connectionId: mapping.connectionId,
      mappingId,
      expectedMappingRevision: mapping.revision,
      expectedConnectionRevision: connection.revision,
      expectedSecretVersionResource: connection.secretVersionResource,
      expectedExternalEventId: mapping.externalEventId,
      guests: fetched.guests,
      pageCount: fetched.pageCount,
      truncated: fetched.truncated,
      now: completedAt,
      run: running,
    });
    return syncResponse(result, false);
  } catch (error) {
    const failedAt = deps.now();
    const errorCode = providerErrorCode(error);
    const failed: ProviderSyncRunDocument = {
      ...running,
      status: "failed",
      errorCode,
      completedAt: failedAt,
    };
    const settled = await db.runTransaction(async (tx) => {
      const [runSnap, mappingSnap, connectionSnap] = await Promise.all([
        tx.get(runRef), tx.get(mappingRef), tx.get(connectionRef),
      ]);
      const currentRun = runSnap.data() as ProviderSyncRunDocument |
        undefined;
      if (!currentRun || currentRun.inputHash !== inputHash) {
        throw new HttpsError("failed-precondition",
          "Provider sync receipt changed during reconciliation.");
      }
      if (currentRun.status !== "running") return currentRun;
      const currentMapping = mappingSnap.data() as
        ExternalEventMappingDocument | undefined;
      const currentConnection = connectionSnap.data() as
        OrganizerProviderConnectionDocument | undefined;
      tx.set(runRef, failed);
      if (currentMapping?.lastSyncRunId === runId &&
          currentMapping.status === "active" &&
          currentMapping.revision === mapping.revision &&
          currentMapping.connectionId === mapping.connectionId) {
        tx.update(mappingRef, {lastSyncAt: failedAt,
          lastSyncStatus: "failed", lastSyncRunId: runId,
          updatedAt: failedAt});
      }
      if (error instanceof LumaProviderError &&
          currentConnection?.status === "active" &&
          currentConnection.organizerId === data.organizerId &&
          currentConnection.revision === connection.revision &&
          currentConnection.secretVersionResource ===
            connection.secretVersionResource) {
        tx.update(connectionRef, {status: errorCode ===
          "providerCredentialRejected" ? "credentialRevoked" : "degraded",
        lastHealthSyncAt: failedAt, lastErrorCode: errorCode,
        updatedAt: failedAt});
      }
      return failed;
    });
    if (settled.status === "completed" || settled.status === "partial") {
      return syncResponse(settled, true);
    }
    throw providerHttpsError(error);
  }
}

export async function disconnectOrganizerProviderHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerProviderSetupDeps = defaultDeps,
): Promise<OrganizerProviderSetupCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    DisconnectOrganizerProviderCallablePayload
  >(
    request,
    validateDisconnectOrganizerProviderCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "disconnectOrganizerProvider", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  await requireScopedEvent(db, data.organizerId, data.eventId);
  const connectionRef = db.collection("organizerProviderConnections")
    .doc(data.connectionId);
  const mappingRef = db.collection("externalEventMappings")
    .doc(externalEventMappingId(data.eventId));
  const [connectionSnap, mappingSnap] = await Promise.all([
    connectionRef.get(), mappingRef.get(),
  ]);
  const connection = connectionSnap.data() as
    OrganizerProviderConnectionDocument | undefined;
  const mapping = mappingSnap.data() as
    ExternalEventMappingDocument | undefined;
  if (!connection || connection.organizerId !== data.organizerId ||
      !mapping || mapping.connectionId !== data.connectionId ||
      mapping.organizerId !== data.organizerId) {
    throw new HttpsError("not-found", "Provider connection not found.");
  }
  const siblingMappings = await db.collection("externalEventMappings")
    .where("connectionId", "==", data.connectionId).limit(100).get();
  const connectionStillUsed = siblingMappings.docs.some((doc) => {
    if (doc.id === mappingRef.id) return false;
    const value = doc.data() as ExternalEventMappingDocument;
    return value.status === "active";
  });
  if (!connectionStillUsed && connection.secretVersionResource) {
    await deps.credentialStore.disable(connection.secretVersionResource)
      .catch(() => undefined);
  }
  const now = deps.now();
  const batch = db.batch();
  if (!connectionStillUsed) {
    batch.update(connectionRef, {
      status: "disconnected",
      secretVersionResource: null,
      disconnectedAt: now,
      updatedAt: now,
      revision: admin.firestore.FieldValue.increment(1),
    });
  }
  batch.update(mappingRef, {
    status: "disconnected",
    disconnectedAt: now,
    updatedAt: now,
    revision: admin.firestore.FieldValue.increment(1),
  });
  const event = await requireScopedEvent(db, data.organizerId, data.eventId);
  batch.update(db.collection("events").doc(data.eventId), {
    eventOrigin: {
      ...event.eventOrigin,
      rosterAuthority: "hostImport",
      connectedAt: null,
      connectedBy: null,
    },
  });
  await batch.commit();
  return providerSetupResponse(db, data.organizerId, data.eventId);
}

async function fetchLumaGuests(params: {
  provider: LumaProvider;
  apiKey: string;
  externalEventId: string;
}): Promise<{guests: LumaGuest[]; pageCount: number; truncated: boolean}> {
  const guests: LumaGuest[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  let hasMore = true;
  while (hasMore && pageCount < 10 && guests.length < 250) {
    const page = await params.provider.listGuests({
      apiKey: params.apiKey,
      eventId: params.externalEventId,
      cursor,
      limit: Math.min(100, 250 - guests.length),
    });
    guests.push(...page.entries.slice(0, 250 - guests.length));
    pageCount += 1;
    hasMore = page.hasMore;
    cursor = page.nextCursor;
  }
  return {guests, pageCount, truncated: hasMore};
}

export async function reconcileLumaGuests(params: {
  db: FirebaseFirestore.Firestore;
  actorUid: string;
  connectionId: string;
  mappingId: string;
  expectedMappingRevision: number;
  expectedConnectionRevision: number;
  expectedSecretVersionResource: string;
  expectedExternalEventId: string;
  guests: LumaGuest[];
  pageCount: number;
  truncated: boolean;
  now: FirebaseFirestore.Timestamp;
  run: ProviderSyncRunDocument;
}): Promise<ProviderSyncRunDocument> {
  const eventId = params.run.eventId;
  return params.db.runTransaction(async (tx) => {
    await requireOrganizerManager({db: params.db,
      organizerId: params.run.organizerId, actorUid: params.actorUid,
      transaction: tx});
    const eventSnap = await tx.get(params.db.collection("events").doc(eventId));
    const event = eventSnap.data() as EventDocument | undefined;
    if (!event || (event.organizerId ?? event.clubId) !==
        params.run.organizerId || event.status === "cancelled" ||
        event.eventOrigin?.mode !== "externalCompanion" ||
        event.eventOrigin.provider !== "luma") {
      throw new HttpsError("failed-precondition",
        "The event is no longer available for provider sync.");
    }
    const mappingRef = params.db.collection("externalEventMappings")
      .doc(params.mappingId);
    const connectionRef = params.db.collection("organizerProviderConnections")
      .doc(params.connectionId);
    const runRef = params.db.collection("providerSyncRuns").doc(
      providerSyncRunId(eventId, params.actorUid,
        params.run.clientOperationId));
    const [mappingSnap, connectionSnap, runSnap] = await Promise.all([
      tx.get(mappingRef), tx.get(connectionRef), tx.get(runRef),
    ]);
    const mapping = mappingSnap.data() as ExternalEventMappingDocument |
    undefined;
    const connection = connectionSnap.data() as
    OrganizerProviderConnectionDocument | undefined;
    const run = runSnap.data() as ProviderSyncRunDocument | undefined;
    if (!mapping || mapping.organizerId !== params.run.organizerId ||
      mapping.eventId !== eventId || mapping.status !== "active" ||
      mapping.connectionId !== params.connectionId ||
      mapping.revision !== params.expectedMappingRevision ||
      mapping.externalEventId !== params.expectedExternalEventId ||
      connection?.organizerId !== params.run.organizerId ||
      connection.status !== "active" ||
      connection.revision !== params.expectedConnectionRevision ||
      connection.secretVersionResource !==
        params.expectedSecretVersionResource ||
      run?.inputHash !== params.run.inputHash ||
      run.status !== "running") {
      throw new HttpsError("failed-precondition",
        "The current provider sync authority changed.");
    }
    const seatMode = await readSeatMigrationWriterFence({db: params.db,
      tx, eventId});
    const existingSnap = await tx.get(params.db.collection("eventAttendees")
      .where("eventId", "==", eventId).limit(501));
    if (existingSnap.docs.length > 500) {
      throw new HttpsError("resource-exhausted",
        "This event roster exceeds provider sync review limits.");
    }
    const existing = existingSnap.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as EventAttendeeDocument,
    }));
    if (existing.some((row) => row.data.eventId !== eventId ||
        row.data.organizerId !== params.run.organizerId ||
        row.data.clubId !== event.clubId)) {
      throw new HttpsError("failed-precondition",
        "Provider roster contains an attendee from another tenant.");
    }
    const byGuestId = new Map(existing.filter((row) =>
      row.data.provider === "luma" && row.data.providerGuestId
    ).map((row) => [row.data.providerGuestId as string, row]));
    if (byGuestId.size !== existing.filter((row) =>
      row.data.provider === "luma" && row.data.providerGuestId).length) {
      throw new HttpsError("failed-precondition",
        "Provider guest identity needs reconciliation.");
    }
    const byPhone = uniqueIndex(existing, (row) => row.data.phoneE164);
    const byEmail = uniqueIndex(existing,
      (row) => row.data.email?.toLowerCase());
    const usedIds = new Set<string>();
    const writes: Array<{
    id: string;
    old: EventAttendeeDocument | undefined;
    document: EventAttendeeDocument;
    existed: boolean;
    wasCheckedIn: boolean;
  }> = [];
    let skippedCount = 0;

    for (const guest of params.guests) {
      const phoneResult = normalizeRosterPhone(guest.phone);
      const phone = phoneResult.issue ? null : phoneResult.value;
      const email = guest.email?.toLowerCase() ?? null;
      const matched = byGuestId.get(guest.id) ??
      (phone ? byPhone.get(phone) : undefined) ??
      (seatMode === "legacy" && email ? byEmail.get(email) : undefined);
      const id = matched?.id ?? eventAttendeeId(eventId, `luma:${guest.id}`);
      if (usedIds.has(id)) {
        skippedCount += 1;
        continue;
      }
      usedIds.add(id);
      const old = matched?.data;
      const document = lumaAttendeeDocument({
        eventId,
        clubId: event.clubId,
        organizerId: params.run.organizerId,
        connectionId: params.connectionId,
        guest,
        old,
        normalizedPhone: phone,
        normalizedEmail: email,
        now: params.now,
      });
      writes.push({
        id, old, document, existed: old !== undefined,
        wasCheckedIn: old?.status === "checkedIn",
      });
    }

    const seatResult = seatMode === "ready" ?
      await prepareProviderSeatChanges({db: params.db, tx, event,
        eventId, organizerId: params.run.organizerId,
        runId: runRef.id, nowMillis: params.now.toMillis(), writes}) : null;
    for (const write of writes) {
      tx.set(params.db.collection("eventAttendees").doc(write.id),
        write.document);
    }
    const checkedInDelta = writes.reduce((sum, write) =>
      sum + (!write.wasCheckedIn && write.document.status === "checkedIn" ?
        1 : 0), 0);
    if (checkedInDelta > 0 || seatResult !== null &&
      seatResult.seatDelta !== 0) {
      const eventPatch: Record<string, unknown> = {};
      if (checkedInDelta > 0) {
        eventPatch.checkedInCount = admin.firestore.FieldValue.increment(
          checkedInDelta);
      }
      if (seatResult) {
        eventPatch.bookedCount = seatResult.occupiedAfter;
      }
      tx.update(params.db.collection("events").doc(eventId), eventPatch);
    }
    const counts = {
      pageCount: params.pageCount,
      receivedCount: params.guests.length,
      createdCount: writes.filter((write) => !write.existed).length,
      updatedCount: writes.filter((write) => write.existed).length,
      skippedCount,
      truncated: params.truncated,
    };
    const completed: ProviderSyncRunDocument = {...params.run, ...counts,
      status: params.truncated || skippedCount > 0 ? "partial" : "completed",
      completedAt: params.now};
    tx.set(runRef, completed);
    tx.update(mappingRef, {lastSyncAt: params.now,
      lastSuccessfulSyncAt: params.now, lastSyncStatus: completed.status,
      lastSyncRunId: runRef.id, updatedAt: params.now});
    tx.update(connectionRef, {status: "active", lastHealthSyncAt: params.now,
      lastSuccessfulSyncAt: params.now, lastErrorCode: null,
      updatedAt: params.now});
    return completed;
  });
}

export function lumaAttendeeDocument(params: {
  eventId: string;
  clubId: string;
  organizerId: string;
  connectionId: string;
  guest: LumaGuest;
  old?: EventAttendeeDocument;
  normalizedPhone?: string | null;
  normalizedEmail?: string | null;
  now: FirebaseFirestore.Timestamp;
}): EventAttendeeDocument {
  const {guest, old} = params;
  const providerCheckInAt = timestampOrNull(guest.checkedInAt);
  const remainsCheckedIn = old?.status === "checkedIn";
  const status = remainsCheckedIn || providerCheckInAt ? "checkedIn" :
    lumaOperationalStatus(guest.approvalStatus);
  const registeredAt = timestampOrNull(guest.registeredAt) ??
    old?.registeredAt ?? (status === "registered" ? params.now : null);
  const source = old?.source === "catchBooking" ? "catchBooking" :
    old?.source ?? "providerSync";
  return {
    eventId: params.eventId,
    clubId: params.clubId,
    organizerId: params.organizerId,
    displayName: guest.displayName,
    searchName: guest.displayName.toLocaleLowerCase("en"),
    source,
    status,
    linkedUid: old?.linkedUid ?? null,
    phoneE164: params.normalizedPhone ?? old?.phoneE164 ?? null,
    email: params.normalizedEmail ?? old?.email ?? null,
    externalReference: guest.id,
    arrivalGroup: old?.arrivalGroup ?? null,
    ticketType: guest.ticketType ?? old?.ticketType ?? null,
    importId: old?.importId ?? null,
    sourceRowId: old?.sourceRowId ?? guest.id,
    createdAt: old?.createdAt ?? params.now,
    updatedAt: params.now,
    registeredAt,
    waitlistedAt: status === "waitlisted" ?
      old?.waitlistedAt ?? params.now : old?.waitlistedAt ?? null,
    checkedInAt: status === "checkedIn" ?
      old?.checkedInAt ?? providerCheckInAt ?? params.now : null,
    cancelledAt: status === "cancelled" ?
      old?.cancelledAt ?? params.now : null,
    checkedInBy: status === "checkedIn" ?
      old?.checkedInBy ?? (providerCheckInAt ? "provider:luma" : null) : null,
    linkedAt: old?.linkedAt ?? null,
    inviteLinkId: old?.inviteLinkId ?? null,
    inviteCapturedAt: old?.inviteCapturedAt ?? null,
    attendanceRevision: (old?.attendanceRevision ?? 0) +
      (!remainsCheckedIn && status === "checkedIn" ? 1 : 0),
    preCheckInStatus: status === "checkedIn" ?
      old?.preCheckInStatus ?? providerPreCheckInStatus(guest.approvalStatus) :
      null,
    provider: "luma",
    providerConnectionId: params.connectionId,
    providerGuestId: guest.id,
    providerSyncedAt: params.now,
    providerDataRevision: (old?.providerDataRevision ?? 0) + 1,
  };
}

function uniqueIndex<T>(
  values: T[],
  key: (value: T) => string | null | undefined,
): Map<string, T> {
  const result = new Map<string, T>();
  const ambiguous = new Set<string>();
  for (const value of values) {
    const id = key(value);
    if (!id) continue;
    if (result.has(id)) {
      result.delete(id);
      ambiguous.add(id);
    } else if (!ambiguous.has(id)) {
      result.set(id, value);
    }
  }
  return result;
}

export function lumaOperationalStatus(
  status: LumaGuest["approvalStatus"]
): EventAttendeeDocument["status"] {
  if (status === "declined") return "cancelled";
  if (status === "waitlist" || status === "pending_approval") {
    return "waitlisted";
  }
  if (status === "invited") return "invited";
  return "registered";
}

function providerPreCheckInStatus(
  status: LumaGuest["approvalStatus"]
): "invited" | "registered" | "waitlisted" {
  if (status === "waitlist" || status === "pending_approval") {
    return "waitlisted";
  }
  return status === "invited" ? "invited" : "registered";
}

async function requireScopedEvent(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  eventId: string,
  expectedProvider?: "luma",
): Promise<EventDocument> {
  const snap = await db.collection("events").doc(eventId).get();
  const event = snap.data() as EventDocument | undefined;
  if (!event || (event.organizerId ?? event.clubId) !== organizerId) {
    throw new HttpsError("not-found", "Event not found for this organizer.");
  }
  if (expectedProvider &&
      (event.eventOrigin?.mode !== "externalCompanion" ||
       event.eventOrigin.provider !== expectedProvider)) {
    throw new HttpsError(
      "failed-precondition",
      "The event booking source must match the provider being connected."
    );
  }
  return event;
}

async function providerSetupResponse(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  eventId: string,
): Promise<OrganizerProviderSetupCallableResponse> {
  const [connectionsSnap, mappingSnap] = await Promise.all([
    db.collection("organizerProviderConnections")
      .where("organizerId", "==", organizerId).limit(20).get(),
    db.collection("externalEventMappings")
      .doc(externalEventMappingId(eventId)).get(),
  ]);
  const connections = connectionsSnap.docs.map((doc) => {
    const value = doc.data() as OrganizerProviderConnectionDocument;
    return {
      connectionId: doc.id,
      provider: value.provider,
      status: value.status,
      externalAccountId: value.externalAccountId,
      externalAccountName: value.externalAccountName,
      syncMode: value.syncMode,
      capabilities: value.capabilities,
      revision: value.revision,
      lastHealthSyncAtMillis: value.lastHealthSyncAt?.toMillis() ?? null,
      lastSuccessfulSyncAtMillis:
        value.lastSuccessfulSyncAt?.toMillis() ?? null,
    };
  });
  const rawMapping = mappingSnap.data() as
    ExternalEventMappingDocument | undefined;
  const mapping = rawMapping?.organizerId === organizerId ? {
    mappingId: mappingSnap.id,
    connectionId: rawMapping.connectionId,
    provider: rawMapping.provider,
    externalEventId: rawMapping.externalEventId,
    status: rawMapping.status,
    fieldAuthority: rawMapping.fieldAuthority,
    revision: rawMapping.revision,
    lastSyncAtMillis: rawMapping.lastSyncAt?.toMillis() ?? null,
    lastSuccessfulSyncAtMillis:
      rawMapping.lastSuccessfulSyncAt?.toMillis() ?? null,
    lastSyncStatus: rawMapping.lastSyncStatus,
    lastSyncRunId: rawMapping.lastSyncRunId,
  } : null;
  return {organizerId, eventId, providers: organizerProviderCatalog,
    connections, mapping};
}

function syncResponse(
  run: ProviderSyncRunDocument,
  replayed: boolean,
): SyncOrganizerProviderEventCallableResponse {
  return {
    runId: providerSyncRunId(
      run.eventId, run.startedByUid, run.clientOperationId
    ),
    status: run.status === "running" ? "failed" : run.status,
    pageCount: run.pageCount,
    receivedCount: run.receivedCount,
    createdCount: run.createdCount,
    updatedCount: run.updatedCount,
    skippedCount: run.skippedCount,
    truncated: run.truncated,
    replayed,
  };
}

export function organizerProviderConnectionId(
  organizerId: string,
  provider: string,
  externalAccountId: string,
): string {
  return `opc_${sha256(
    `${organizerId}|${provider}|${externalAccountId}`
  ).slice(0, 48)}`;
}

export function externalEventMappingId(eventId: string): string {
  return `eem_${sha256(eventId).slice(0, 48)}`;
}

export function providerSyncRunId(
  eventId: string,
  actorUid: string,
  operationId: string,
): string {
  return `psr_${sha256(
    `${eventId}|${actorUid}|${operationId}`
  ).slice(0, 48)}`;
}

function timestampOrNull(
  value: string | null
): FirebaseFirestore.Timestamp | null {
  if (!value) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ?
    admin.firestore.Timestamp.fromMillis(milliseconds) : null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function providerErrorCode(error: unknown): string {
  if (!(error instanceof LumaProviderError)) return "providerUnexpectedFailure";
  return error.code === "unauthorized" ? "providerCredentialRejected" :
    error.code === "rateLimited" ? "providerRateLimited" :
      error.code === "notFound" ? "providerEventNotFound" :
        "providerInvalidResponse";
}

function providerHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof LumaProviderError) {
    if (error.code === "unauthorized") {
      return new HttpsError(
        "failed-precondition", "Luma rejected this calendar credential."
      );
    }
    if (error.code === "rateLimited") {
      return new HttpsError(
        "resource-exhausted", "Luma is rate limiting sync. Try again later."
      );
    }
    if (error.code === "notFound") {
      return new HttpsError(
        "not-found", "Luma did not return the selected event."
      );
    }
  }
  return new HttpsError(
    "unavailable", "The provider could not be synchronized safely."
  );
}

function normalizePayload(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key, typeof item === "string" ? item.trim() : item,
  ]));
}

function requiredProviderDate(value: string): Date {
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) {
    throw new LumaProviderError(
      "Luma returned an invalid event start time.", null, "invalid"
    );
  }
  return result;
}

const providerCallableLimits = {
  timeoutSeconds: 120,
  memory: "512MiB" as const,
  maxInstances: 10,
  concurrency: 10,
};
export const getOrganizerProviderSetup = onCall(
  appCheckCallableOptionsWithLimits(providerCallableLimits),
  (request) => getOrganizerProviderSetupHandler(request),
);
export const connectOrganizerLumaProvider = onCall(
  appCheckCallableOptionsWithLimits(providerCallableLimits),
  (request) => connectOrganizerLumaProviderHandler(request),
);
export const listOrganizerLumaEvents = onCall(
  appCheckCallableOptionsWithLimits(providerCallableLimits),
  (request) => listOrganizerLumaEventsHandler(request),
);
export const syncOrganizerProviderEvent = onCall(
  appCheckCallableOptionsWithLimits(providerCallableLimits),
  (request) => syncOrganizerProviderEventHandler(request),
);
export const disconnectOrganizerProvider = onCall(
  appCheckCallableOptionsWithLimits(providerCallableLimits),
  (request) => disconnectOrganizerProviderHandler(request),
);
