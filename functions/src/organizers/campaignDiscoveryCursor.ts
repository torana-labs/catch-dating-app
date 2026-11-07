import * as admin from "firebase-admin";
import type {Firestore, Transaction, DocumentSnapshot} from
  "firebase-admin/firestore";
import {operationContentHash} from "../operations/durableActions";
import type {OrganizerCampaignDiscoveryCursorDocument as CursorDocument} from
  "../shared/generated/organizerCampaignDiscoveryCursorDocument";
import {validateOrganizerCampaignDiscoveryCursorDocument} from
  "../shared/generated/validators/organizerCampaignDiscoveryCursorDocument";
import type {OrganizerCampaignDocument} from
  "../shared/generated/firestoreAdminTypes";

export const CAMPAIGN_DISCOVERY_CURSORS = "organizerCampaignDiscoveryCursors";
export interface CampaignDiscoveryLease {
  organizerId: string;
  campaignId: string;
  leaseOwner: string;
}
type Queue = {kind: "blockedCampaigns"} | {
  kind: "pendingRecipients" | "sendingRecipients";
  lease: CampaignDiscoveryLease;
};
interface LoadedCursor {
  revision: number;
  cursor: string | null;
  updatedAtMillis: number;
}

function assertDocumentId(value: string): void {
  if (!value || value === "." || value === ".." || value.includes("/") ||
      Buffer.byteLength(value, "utf8") > 1500) {
    throw new Error("Campaign discovery document id is invalid.");
  }
}

/** Lease checks share the transaction with cursor or lease writes. */
async function assertCurrentLease(tx: Transaction, db: Firestore,
  lease: CampaignDiscoveryLease, clock: () => number): Promise<number> {
  const snap = await tx.get(db.collection("organizerCampaigns")
    .doc(lease.campaignId));
  const campaign = snap.data() as OrganizerCampaignDocument | undefined;
  const now = checkedClock(clock);
  if (!campaign || campaign.organizerId !== lease.organizerId ||
      campaign.leaseOwner !== lease.leaseOwner ||
      (campaign.status !== "resolving" && campaign.status !== "sending") ||
      !campaign.leaseExpiresAt || campaign.leaseExpiresAt.toMillis() <= now) {
    throw new Error("Campaign discovery lease is no longer current.");
  }
  return now;
}

function checkedClock(clock: () => number): number {
  const now = clock();
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new Error("Campaign discovery clock is invalid.");
  }
  return now;
}

/** Only the current live owner may renew; expiry is never undone. */
export async function renewCampaignDiscoveryLease(input: {
  db: Firestore; lease: CampaignDiscoveryLease;
  clock: () => number; durationMillis: number;
}): Promise<void> {
  const {db, lease, clock, durationMillis} = input;
  if (!Number.isSafeInteger(durationMillis) || durationMillis <= 0) {
    throw new Error("Campaign discovery lease duration is invalid.");
  }
  await db.runTransaction(async (tx) => {
    const now = await assertCurrentLease(tx, db, lease, clock);
    if (!Number.isSafeInteger(now + durationMillis)) {
      throw new Error("Campaign discovery lease expiry is invalid.");
    }
    tx.update(db.collection("organizerCampaigns").doc(lease.campaignId), {
      leaseExpiresAt:
        admin.firestore.Timestamp.fromMillis(now + durationMillis),
      updatedAt: admin.firestore.Timestamp.fromMillis(now),
    });
  });
}

/** Discovery only: no recipient authority, delivery state or retry budget. */
export async function openCampaignDiscovery(input: {
  db: Firestore; projectId: string; queue: Queue; clock: () => number;
}): Promise<{cursor: string | null;
  checkpoint: (cursor: string | null) => Promise<void>}> {
  const {db, projectId, queue, clock} = input;
  const scope = queue.kind === "blockedCampaigns" ?
    {organizerId: null, campaignId: null} : {
      organizerId: queue.lease.organizerId, campaignId: queue.lease.campaignId,
    };
  if (scope.organizerId !== null) assertDocumentId(scope.organizerId);
  if (scope.campaignId !== null) assertDocumentId(scope.campaignId);
  const stateId = queue.kind === "blockedCampaigns" ? queue.kind :
    `${queue.kind}:${operationContentHash([projectId, scope])}`;
  const identity = {stateId, schema: "1" as const, projectId,
    queueKind: queue.kind, ...scope};
  // Validate the expected identity even before a cursor has ever been saved.
  if (!validateOrganizerCampaignDiscoveryCursorDocument({...identity,
    revision: 1, cursor: null, updatedAtMillis: checkedClock(clock)})) {
    throw new Error("Campaign discovery scope is invalid.");
  }
  const ref = db.collection(CAMPAIGN_DISCOVERY_CURSORS).doc(stateId);
  const read = (snapshot: DocumentSnapshot): LoadedCursor => {
    if (!snapshot.exists) {
      return {revision: 0, cursor: null, updatedAtMillis: 0};
    }
    const value = snapshot.data();
    if (!validateOrganizerCampaignDiscoveryCursorDocument(value) ||
        value.stateId !== stateId || value.schema !== identity.schema ||
        value.projectId !== projectId || value.queueKind !== queue.kind ||
        value.organizerId !== scope.organizerId ||
        value.campaignId !== scope.campaignId) {
      throw new Error("Campaign discovery cursor is malformed or foreign.");
    }
    if (value.cursor !== null) assertDocumentId(value.cursor);
    return value;
  };
  let expected = await db.runTransaction(async (tx) => {
    const loaded = read(await tx.get(ref));
    if (queue.kind !== "blockedCampaigns") {
      await assertCurrentLease(tx, db, queue.lease, clock);
    }
    return loaded;
  });
  return {cursor: expected.cursor, checkpoint: async (cursor) => {
    if (cursor !== null) assertDocumentId(cursor);
    const prior = expected;
    const next = await db.runTransaction(async (tx) => {
      const current = read(await tx.get(ref));
      const now = queue.kind === "blockedCampaigns" ? checkedClock(clock) :
        await assertCurrentLease(tx, db, queue.lease, clock);
      if (current.revision !== prior.revision ||
          current.cursor !== prior.cursor) {
        throw new Error("Campaign discovery cursor changed.");
      }
      const document: CursorDocument = {...identity,
        revision: current.revision + 1, cursor, updatedAtMillis: now};
      if (now < current.updatedAtMillis ||
          !validateOrganizerCampaignDiscoveryCursorDocument(document)) {
        throw new Error("Campaign discovery cursor progression is invalid.");
      }
      tx.set(ref, document);
      return document;
    });
    expected = next;
  }};
}
