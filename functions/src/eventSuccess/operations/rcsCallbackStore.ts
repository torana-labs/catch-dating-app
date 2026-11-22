import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {VerifiedRcsCallback} from "./rcsWebhookProtocol";
import {prepareRcsSubscription} from "./rcsSubscriptions";
import {
  parseRcsCallback,
  parseRcsCallbackIdentity,
  rcsCallbackClock,
  rcsCallbackCollections,
  rcsCallbackId,
  requireRcsCallbackId,
  RcsCallbackDocument,
  RcsCallbackIdentity,
} from "./rcsCallbackRecords";

export type RcsCallbackRead =
  | { kind: "ready"; record: RcsCallbackDocument }
  | { kind: "missing" }
  | { kind: "conflicted" };

/** Private evidence inbox; subscription stops share its acceptance commit. */
export class RcsCallbackStore {
  constructor(
    private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
  ) {}

  async enqueue(
    callback: VerifiedRcsCallback,
  ): Promise<"stored" | "duplicate" | "conflict"> {
    if (!(callback instanceof VerifiedRcsCallback)) {
      throw new Error("RCS callback requires authenticated ingress");
    }
    const evidence = structuredClone(callback.evidence);
    const callbackId = rcsCallbackId(evidence);
    return transact(this.db, async (tx) => {
      const now = rcsCallbackClock(this.clock());
      const candidate = parseRcsCallback(
        {schemaVersion: 1, callbackId, evidence, storedAt: now},
        callbackId,
      );
      const callbackRef = this.db
        .collection(rcsCallbackCollections.callbacks)
        .doc(callbackId);
      const identityRef = this.db
        .collection(rcsCallbackCollections.identities)
        .doc(evidence.receiptKey);
      const [callbackSnap, identitySnap] = await tx.getAll(
        callbackRef,
        identityRef,
      );
      const existing = callbackSnap.exists ?
        parseRcsCallback(callbackSnap.data(), callbackId) :
        null;
      if (!identitySnap.exists) {
        if (existing) throw inconsistent();
        const identity = parseRcsCallbackIdentity(
          {
            schemaVersion: 1,
            receiptKey: evidence.receiptKey,
            primaryCallbackId: callbackId,
            firstStoredAt: now,
            conflictedAt: null,
          },
          evidence.receiptKey,
        );
        const subscription = await prepareRcsSubscription(this.db, tx,
          candidate, now);
        tx.create(callbackRef, candidate);
        tx.create(identityRef, identity);
        subscription();
        return "stored";
      }
      const identity = parseRcsCallbackIdentity(
        identitySnap.data(),
        evidence.receiptKey,
      );
      const primary =
        identity.primaryCallbackId === callbackId ?
          existing :
          await this.readCallback(tx, identity.primaryCallbackId);
      this.checkIdentity(identity, primary, now);
      if (existing) {
        // Re-delivery changes reception time, not the verified payload or its
        // interpretation. Never rewrite the original event on an exact retry.
        if (
          operationContentHash({...existing.evidence, receivedAt: 0}) !==
            operationContentHash({...evidence, receivedAt: 0}) ||
          existing.storedAt > now ||
          (callbackId !== identity.primaryCallbackId &&
            identity.conflictedAt === null)
        ) {
          throw inconsistent();
        }
        const subscription = await prepareRcsSubscription(this.db, tx,
          existing, now);
        subscription();
        return identity.conflictedAt === null ? "duplicate" : "conflict";
      }
      // A different signed payload with the same provider identity remains
      // immutable evidence. Marking its identity conflicts with any consumer
      // transaction that read that identity as usable.
      const subscription = await prepareRcsSubscription(this.db, tx,
        candidate, now);
      tx.create(callbackRef, candidate);
      if (identity.conflictedAt === null) {
        tx.set(identityRef, {...identity, conflictedAt: now});
      }
      subscription();
      return "conflict";
    });
  }

  /** Call inside the same transaction as the consumer's receipt and effect. */
  async readForConsumption(
    tx: Transaction,
    callbackId: string,
  ): Promise<RcsCallbackRead> {
    const record = await this.readCallback(
      tx,
      requireRcsCallbackId(callbackId),
    );
    if (!record) return {kind: "missing"};
    const snap = await tx.get(
      this.db
        .collection(rcsCallbackCollections.identities)
        .doc(record.evidence.receiptKey),
    );
    if (!snap.exists) throw inconsistent();
    const identity = parseRcsCallbackIdentity(
      snap.data(),
      record.evidence.receiptKey,
    );
    const primary =
      identity.primaryCallbackId === callbackId ?
        record :
        await this.readCallback(tx, identity.primaryCallbackId);
    const now = rcsCallbackClock(this.clock());
    this.checkIdentity(identity, primary, now);
    if (
      record.storedAt > now ||
      (callbackId !== identity.primaryCallbackId &&
        identity.conflictedAt === null)
    ) {
      throw inconsistent();
    }
    return identity.conflictedAt === null ?
      {kind: "ready", record} :
      {kind: "conflicted"};
  }

  private async readCallback(tx: Transaction, id: string) {
    const snap = await tx.get(
      this.db
        .collection(rcsCallbackCollections.callbacks)
        .doc(requireRcsCallbackId(id)),
    );
    return snap.exists ? parseRcsCallback(snap.data(), id) : null;
  }

  private checkIdentity(
    identity: RcsCallbackIdentity,
    primary: RcsCallbackDocument | null,
    now: number,
  ) {
    if (
      !primary ||
      primary.callbackId !== identity.primaryCallbackId ||
      primary.evidence.receiptKey !== identity.receiptKey ||
      primary.storedAt !== identity.firstStoredAt ||
      identity.firstStoredAt > now ||
      (identity.conflictedAt !== null && identity.conflictedAt > now)
    ) {
      throw inconsistent();
    }
  }
}

function inconsistent(): Error {
  return new Error("RCS callback identity is inconsistent");
}
