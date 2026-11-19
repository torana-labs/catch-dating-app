import {isDeepStrictEqual} from "node:util";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {ImportEventAttendeesCallablePayload} from
  "../shared/generated/importEventAttendeesCallablePayload";
import {
  approveHostRosterIntakeApply,
  assertHostRosterIntakeDocumentBound,
  createHostRosterIntakeDraft,
  HostRosterIntakeDraft,
  HostRosterIntakePreview,
  HostRosterIntakeRow,
  HostRosterCurrentRow,
  previewHostRosterIntake,
  reviseHostRosterIntakeDraft,
} from "./hostRosterIntakeCore";

const collection = "hostRosterIntakeSessions";
const sessionIdPattern = /^hri_[a-f0-9]{48}$/u;

interface StoredSession {
  draft: HostRosterIntakeDraft;
  createdAtMillis: number;
  updatedAtMillis: number;
}

export interface HostRosterAppliedReview {
  importId: string;
  appliedAtMillis: number;
  preview: HostRosterIntakePreview;
  payload: ImportEventAttendeesCallablePayload;
}

/** Checks current manager authority inside every session transaction. */
export type AuthorizeHostRosterSession = (params: {
  tx: Transaction;
  hostUid: string;
  organizerId: string;
  eventId: string;
}) => Promise<void>;

export class HostRosterIntakeSessionStore {
  constructor(private readonly db: Firestore,
    private readonly now: () => number = Date.now) {}

  private ref(sessionId: string) {
    if (!sessionIdPattern.test(sessionId)) {
      throw new Error("Invalid Host roster intake session ID.");
    }
    return this.db.collection(collection).doc(sessionId);
  }

  private receiptRef(sessionId: string) {
    this.ref(sessionId);
    return this.db.collection(`${collection}/${sessionId}/receipts`)
      .doc("apply");
  }

  private assertActor(draft: HostRosterIntakeDraft, hostUid: string): void {
    if (draft.hostUid !== hostUid) {
      throw new Error("Host roster intake belongs to another account.");
    }
  }

  private async assertManager(tx: Transaction, draft: HostRosterIntakeDraft,
    authorize: AuthorizeHostRosterSession): Promise<void> {
    await authorize({tx, hostUid: draft.hostUid,
      organizerId: draft.organizerId, eventId: draft.eventId});
  }

  async createOrResume(input: Parameters<typeof createHostRosterIntakeDraft>[0],
    authorize: AuthorizeHostRosterSession): Promise<HostRosterIntakeDraft> {
    const proposed = createHostRosterIntakeDraft(input);
    const ref = this.ref(proposed.sessionId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      await this.assertManager(tx, proposed, authorize);
      if (snap.exists) {
        const stored = snap.data() as StoredSession;
        this.assertActor(stored.draft, proposed.hostUid);
        if (stored.draft.sessionId !== proposed.sessionId ||
            stored.draft.organizerId !== proposed.organizerId ||
            stored.draft.eventId !== proposed.eventId ||
            stored.draft.fileFingerprint !== proposed.fileFingerprint) {
          throw new Error("Host roster intake scope collision.");
        }
        return stored.draft;
      }
      const now = this.now();
      const stored = {draft: proposed, createdAtMillis: now,
        updatedAtMillis: now} satisfies StoredSession;
      assertHostRosterIntakeDocumentBound(stored);
      tx.create(ref, stored);
      return proposed;
    });
  }

  async get(params: {sessionId: string; hostUid: string},
    authorize: AuthorizeHostRosterSession):
    Promise<HostRosterIntakeDraft | null> {
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(this.ref(params.sessionId));
      if (!snap.exists) return null;
      const stored = snap.data() as StoredSession;
      this.assertActor(stored.draft, params.hostUid);
      await this.assertManager(tx, stored.draft, authorize);
      return stored.draft;
    });
  }

  /**
   * The caller's newest draft still in review for one event, such as a
   * forwarded roster waiting for the host, or null.
   */
  async latestInReview(params: {hostUid: string; organizerId: string;
    eventId: string}, authorize: AuthorizeHostRosterSession):
    Promise<HostRosterIntakeDraft | null> {
    return this.db.runTransaction(async (tx) => {
      await authorize({tx, hostUid: params.hostUid,
        organizerId: params.organizerId, eventId: params.eventId});
      // Equality filters only, so no composite index is needed; a host has
      // few open drafts per event.
      const open = await tx.get(this.db.collection(collection)
        .where("draft.hostUid", "==", params.hostUid)
        .where("draft.eventId", "==", params.eventId)
        .where("draft.state", "==", "review").limit(20));
      const newest = open.docs.map((doc) => doc.data() as StoredSession)
        .filter((stored) => stored.draft.organizerId === params.organizerId)
        .sort((a, b) => b.updatedAtMillis - a.updatedAtMillis)[0];
      return newest?.draft ?? null;
    });
  }

  async getAppliedReview(params: {sessionId: string; hostUid: string},
    authorize: AuthorizeHostRosterSession):
    Promise<HostRosterAppliedReview | null> {
    return this.db.runTransaction(async (tx) => {
      const [snap, receiptSnap] = await tx.getAll(
        this.ref(params.sessionId), this.receiptRef(params.sessionId));
      if (!snap.exists) return null;
      const stored = snap.data() as StoredSession;
      this.assertActor(stored.draft, params.hostUid);
      await this.assertManager(tx, stored.draft, authorize);
      if (!receiptSnap.exists) return null;
      const receipt = receiptSnap.data() as HostRosterAppliedReview;
      if (stored.draft.state !== "applied" ||
          stored.draft.appliedImportId !== receipt.importId ||
          receipt.preview.sessionId !== stored.draft.sessionId) {
        throw new Error("Host roster intake receipt is inconsistent.");
      }
      return receipt;
    });
  }

  async revise(params: {
    sessionId: string;
    hostUid: string;
    expectedRevision: number;
    rows: HostRosterIntakeRow[];
    excludedRowIds: string[];
    mapping?: Record<string, number>;
  }, authorize: AuthorizeHostRosterSession): Promise<HostRosterIntakeDraft> {
    const ref = this.ref(params.sessionId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Host roster intake not found.");
      const stored = snap.data() as StoredSession;
      this.assertActor(stored.draft, params.hostUid);
      await this.assertManager(tx, stored.draft, authorize);
      const draft = reviseHostRosterIntakeDraft({draft: stored.draft,
        expectedRevision: params.expectedRevision, rows: params.rows,
        excludedRowIds: params.excludedRowIds, mapping: params.mapping});
      const updatedAtMillis = this.now();
      assertHostRosterIntakeDocumentBound({...stored, draft,
        updatedAtMillis});
      tx.update(ref, {draft, updatedAtMillis});
      return draft;
    });
  }

  /** Called after the canonical writer's reads in the same transaction. */
  async prepareCompletion(params: {
    tx: Transaction;
    sessionId: string;
    hostUid: string;
    expectedDraft: HostRosterIntakeDraft;
    expectedReviewHash: string;
    committedPayload: ImportEventAttendeesCallablePayload;
    importId: string;
    replayed: boolean;
    authorize: AuthorizeHostRosterSession;
    loadCurrentRows: (tx: Transaction, draft: HostRosterIntakeDraft) =>
      Promise<ReadonlyMap<string, HostRosterCurrentRow>>;
  }): Promise<() => void> {
    const ref = this.ref(params.sessionId);
    const receiptRef = this.receiptRef(params.sessionId);
    const [snap, receiptSnap] = await params.tx.getAll(ref, receiptRef);
    if (!snap.exists) throw new Error("Host roster intake not found.");
    const stored = snap.data() as StoredSession;
    this.assertActor(stored.draft, params.hostUid);
    await this.assertManager(params.tx, stored.draft, params.authorize);
    if (params.replayed) {
      if (stored.draft.state !== "applied" ||
          stored.draft.appliedImportId !== params.importId ||
          !receiptSnap.exists ||
          (receiptSnap.data() as HostRosterAppliedReview).preview.reviewHash !==
            params.expectedReviewHash ||
          !isDeepStrictEqual(
            (receiptSnap.data() as HostRosterAppliedReview).payload,
            params.committedPayload)) {
        throw new Error("Unmatched Host roster intake receipt replay.");
      }
      return () => {};
    }
    const currentRows = await params.loadCurrentRows(params.tx,
      stored.draft);
    const preview = previewHostRosterIntake({draft: stored.draft,
      currentRows});
    const approved = preview.eligibleForApply &&
      preview.reviewHash === params.expectedReviewHash ?
      approveHostRosterIntakeApply({draft: stored.draft, currentRows,
        reviewHash: params.expectedReviewHash}) : null;
    if (stored.draft.state !== "review" ||
        !isDeepStrictEqual(stored.draft, params.expectedDraft) ||
        !preview.eligibleForApply ||
        preview.reviewHash !== params.expectedReviewHash ||
        !approved ||
        !isDeepStrictEqual(approved.payload, params.committedPayload)) {
      throw new Error("Host roster intake changed after approval.");
    }
    const draft: HostRosterIntakeDraft = {...stored.draft,
      state: "applied", appliedImportId: params.importId};
    const appliedAtMillis = this.now();
    const receipt = {importId: params.importId, appliedAtMillis,
      preview, payload: approved.payload} satisfies HostRosterAppliedReview;
    assertHostRosterIntakeDocumentBound({...stored, draft,
      updatedAtMillis: appliedAtMillis});
    assertHostRosterIntakeDocumentBound(receipt);
    if (receiptSnap.exists) {
      throw new Error("Host roster intake receipt already exists.");
    }
    return () => {
      params.tx.update(ref, {draft, updatedAtMillis: appliedAtMillis});
      params.tx.create(receiptRef, receipt);
    };
  }
}
