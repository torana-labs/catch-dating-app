import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {
  HostProviderConnectionViewDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerProviderSetupCallableResponse} from
  "../shared/generated/organizerProviderSetupCallableResponse";
import {SourceInvalidError} from "./support/sourceInvalid";
import {planViewWrite, ViewOutcome} from "./support/viewWrite";

export const providerConnectionViewsCollection = "hostProviderConnectionViews";
const connectionsCollection = "organizerProviderConnections";
/** The provider setup reads showed at most this many connections. */
export const maxProviderConnections = 20;

export type ProviderConnectionRow =
  OrganizerProviderSetupCallableResponse["connections"][number];

export type ProviderConnectionViewOutcome =
  | Exclude<ViewOutcome, {kind: "complete"}>
  | {kind: "complete"; revision: number; connections: number}
  | {kind: "overCap"; revision: number};

export interface ProviderConnectionViewStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ProviderConnectionViewStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

const connectionStatuses =
  new Set(["active", "degraded", "credentialRevoked", "disconnected"]);
const capabilityKeys = [
  "eventList", "rosterIdentity", "registrationStatus", "providerCheckIn",
  "orderAmount", "refundStatus", "referralCode", "webhooks", "writeBookings",
] as const;

/**
 * One organizerProviderConnections document as a manager may see it: the
 * credential reference, the connecting user and the last error code never
 * leave the server.
 */
export function providerConnectionRow(
  connectionId: string,
  data: FirebaseFirestore.DocumentData | undefined
): ProviderConnectionRow {
  const invalid = (detail: string) =>
    new SourceInvalidError(connectionsCollection, `${connectionId} ${detail}`);
  if (data === undefined) throw invalid("is empty or missing.");
  if (data.provider !== "luma") throw invalid("has an unknown provider.");
  if (!connectionStatuses.has(data.status)) {
    throw invalid("has an unknown status.");
  }
  for (const field of ["externalAccountId", "externalAccountName"]) {
    if (typeof data[field] !== "string" || data[field].length === 0) {
      throw invalid(`has no ${field}.`);
    }
  }
  if (data.syncMode !== "manualPoll") throw invalid("has an unknown syncMode.");
  const capabilities = data.capabilities as Record<string, unknown> | undefined;
  if (typeof capabilities !== "object" || capabilities === null ||
      capabilityKeys.some((key) => typeof capabilities[key] !== "boolean")) {
    throw invalid("has invalid capabilities.");
  }
  if (!Number.isSafeInteger(data.revision) || data.revision < 1) {
    throw invalid("has an invalid revision.");
  }
  return {
    connectionId,
    provider: "luma",
    status: data.status,
    externalAccountId: data.externalAccountId,
    externalAccountName: data.externalAccountName,
    syncMode: "manualPoll",
    capabilities: Object.fromEntries(capabilityKeys.map((key) =>
      [key, capabilities[key]])) as ProviderConnectionRow["capabilities"],
    revision: data.revision,
    lastHealthSyncAtMillis: millisOrNull(data.lastHealthSyncAt,
      () => invalid("has an invalid lastHealthSyncAt.")),
    lastSuccessfulSyncAtMillis: millisOrNull(data.lastSuccessfulSyncAt,
      () => invalid("has an invalid lastSuccessfulSyncAt.")),
  };
}

function millisOrNull(value: unknown, invalid: () => Error): number | null {
  if (value === null || value === undefined) return null;
  if (typeof (value as {toMillis?: unknown}).toMillis !== "function") {
    throw invalid();
  }
  return (value as FirebaseFirestore.Timestamp).toMillis();
}

/**
 * Re-evaluates hostProviderConnectionViews/{organizerId} from current sources
 * in one transaction: the organizer and its connections (at most 21 read, in
 * document id order as the retired provider setup read returned them). More
 * than 20 connections records overCap with the first 20; a connection that
 * fails validation records invalidSource and keeps the previous rows; neither
 * throws, so a trigger never retries forever on them. Writes only when the
 * projection changed. A missing organizer has no view.
 */
export async function reconcileProviderConnectionView(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  deps: ProviderConnectionViewStoreDeps = defaultDeps
): Promise<ProviderConnectionViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<ProviderConnectionViewOutcome> => {
    const viewRef = db.collection(providerConnectionViewsCollection)
      .doc(organizerId);
    const [organizerSnap, connectionsSnap, viewSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(organizerId)),
      tx.get(db.collection(connectionsCollection)
        .where("organizerId", "==", organizerId)
        .limit(maxProviderConnections + 1)),
      tx.get(viewRef),
    ]);
    if (!organizerSnap.exists) {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    }
    const previous = viewSnap.exists ?
      viewSnap.data() as HostProviderConnectionViewDocument : null;
    let connections: ProviderConnectionRow[];
    let invalid: SourceInvalidError | null = null;
    try {
      connections = connectionsSnap.docs.slice(0, maxProviderConnections)
        .map((doc) => providerConnectionRow(doc.id, doc.data()));
    } catch (error) {
      if (!(error instanceof SourceInvalidError)) throw error;
      invalid = error;
      connections = previous?.connections ?? [];
    }
    const overCap = connectionsSnap.size > maxProviderConnections;
    const next = {
      sourceCoverage: invalid !== null ? "invalidSource" as const :
        overCap ? "overCap" as const : "complete" as const,
      incompleteSource: invalid !== null || overCap ?
        connectionsCollection : null,
      connections,
    };
    const plan = planViewWrite(previous, {schemaVersion: 1 as const,
      organizerId, ...next}, deps.now());
    if (!plan.unchanged) tx.set(viewRef, plan.document);
    const revision = plan.revision;
    if (invalid !== null) {
      return {kind: "invalidSource", source: invalid.source,
        detail: invalid.detail, revision, written: !plan.unchanged};
    }
    if (overCap) return {kind: "overCap", revision};
    return plan.unchanged ? {kind: "unchanged", revision} :
      {kind: "complete", revision, connections: connections.length};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Host provider connection view read an invalid source.", {
      organizerId,
      source: outcome.source,
      detail: outcome.detail,
    });
  } else if (outcome.kind === "overCap") {
    logger.error("Host provider connection view is over its cap.", {
      organizerId,
      cap: maxProviderConnections,
    });
  }
  return outcome;
}

export interface ProviderConnectionViewBackfillReport {
  connections: number;
  viewExists: boolean;
  outcome: ProviderConnectionViewOutcome | null;
}

/** Explicit organizer scope. Without apply it only reports current state. */
export async function backfillProviderConnectionView(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean
): Promise<ProviderConnectionViewBackfillReport> {
  const outcome = apply ?
    await reconcileProviderConnectionView(db, organizerId) : null;
  const [connections, view] = await Promise.all([
    db.collection(connectionsCollection)
      .where("organizerId", "==", organizerId).count().get(),
    db.collection(providerConnectionViewsCollection).doc(organizerId).get(),
  ]);
  return {
    connections: connections.data().count,
    viewExists: view.exists,
    outcome,
  };
}
