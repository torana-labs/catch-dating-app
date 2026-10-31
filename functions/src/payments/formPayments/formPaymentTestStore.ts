import assert from "node:assert/strict";
import {FieldPath, FieldValue, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {OrganizerFormDocument as Form,
  OrganizerFormVersionDocument as Version,
  OrganizerFormResponseDraftDocument as Draft,
  OrganizerPaymentConnectionDocument as Connection} from
  "../../shared/generated/firestoreAdminTypes";
import {reserveFormPayment, finalizeCapturedFormPayment} from
  "./formPaymentSubmission";

type Data = Record<string, unknown>;
type Ref = {path: string};

/** Serialized, atomic test transactions that preserve Timestamp prototypes. */
export class FormPaymentTestStore {
  records = new Map<string, Data>();
  failNextCommit = false;
  private tail: Promise<unknown> = Promise.resolve();

  collection(name: string) {
    return {...this.query(name),
      doc: (id: string) => this.ref(`${name}/${id}`)};
  }
  private query(name: string, filters: Array<[string, unknown]> = [],
    limit = 100, order: "createdAt" | "documentId" | null = null,
    cursor: string | null = null) {
    return {
      where: (field: string, operator: string, value: unknown) => {
        assert.equal(operator, "==");
        return this.query(name, [...filters, [field, value]],
          limit, order, cursor);
      },
      orderBy: (field: string | FieldPath, direction?: string) => {
        if (field instanceof FieldPath) {
          assert.ok(field.isEqual(FieldPath.documentId()));
          assert.equal(direction, undefined);
          return this.query(name, filters, limit, "documentId", cursor);
        }
        assert.equal(field, "createdAt");
        assert.equal(direction, "desc");
        return this.query(name, filters, limit, "createdAt", cursor);
      },
      startAfter: (value: string) => {
        assert.equal(order, "documentId");
        return this.query(name, filters, limit, order, value);
      },
      limit: (value: number) => this.query(name, filters, value, order, cursor),
      get: async () => ({docs: [...this.records.entries()]
        .filter(([path, data]) => path.startsWith(`${name}/`) &&
          path.split("/").length === name.split("/").length + 1 &&
          filters.every(([field, value]) => data[field] === value) &&
          (!cursor || path.split("/").at(-1)! > cursor))
        .sort(([left, a], [right, b]) => order === "documentId" ?
          (left < right ? -1 : left > right ? 1 : 0) : order === "createdAt" ?
            (b.createdAt as Timestamp).toMillis() -
              (a.createdAt as Timestamp).toMillis() : 0)
        .slice(0, limit).map(([path]) => this.snapshot(path))}),
    };
  }
  ref(path: string) {
    return {path, get: async () => this.snapshot(path)};
  }
  snapshot(path: string) {
    const value = this.records.get(path);
    return {id: path.split("/").at(-1),
      exists: value !== undefined, ref: this.ref(path),
      data: () => value && {...value}};
  }
  async runTransaction<T>(work: (tx: {
    get: (ref: Ref) => Promise<ReturnType<FormPaymentTestStore["snapshot"]>>;
    create: (ref: Ref, data: Data) => void;
    set: (ref: Ref, data: Data) => void;
    update: (ref: Ref, data: Data) => void;
  }) => Promise<T>): Promise<T> {
    const run = this.tail.then(async () => {
      const writes = new Map<string, Data>();
      const result = await work({
        get: async (ref) => {
          assert.equal(writes.size, 0, "Reads must precede writes");
          return this.snapshot(ref.path);
        },
        create: (ref, data) => {
          if (this.records.has(ref.path) || writes.has(ref.path)) {
            throw new Error("Already exists");
          }
          writes.set(ref.path, {...data});
        },
        set: (ref, data) => {
          writes.set(ref.path, {...data});
        },
        update: (ref, data) => {
          const before = writes.get(ref.path) ?? this.records.get(ref.path);
          if (!before) throw new Error("Not found");
          const after = {...before};
          for (const [key, value] of Object.entries(data)) {
            if (value instanceof FieldValue) {
              const delta = [-1, 1].find((n) =>
                value.isEqual(FieldValue.increment(n)));
              assert.notEqual(delta, undefined, "Unsupported transform");
              after[key] = Number(before[key] ?? 0) + delta!;
            } else after[key] = value;
          }
          writes.set(ref.path, after);
        },
      });
      if (this.failNextCommit) {
        this.failNextCommit = false;
        throw new Error("Interrupted commit");
      }
      for (const [path, data] of writes) this.records.set(path, data);
      return result;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }
}

const now = Timestamp.fromMillis(1000);
export function createFormPaymentFixture() {
  const store = new FormPaymentTestStore();
  const db = store as unknown as FirebaseFirestore.Firestore;
  const version: Version = {
    organizerId: "org", formId: "form", version: 1, sourceDraftRevision: 1,
    createdByUid: "host", createdAt: now, publishedAt: now,
    definition: {
      title: "Application", description: null, purpose: "application",
      defaultTargetKind: "organizer", defaultTargetId: null,
      identityPolicy: "phoneVerified", sections: [{sectionId: "section",
        title: "Details", description: null, pageBreak: false,
        questions: [{questionId: "name", key: "name", label: "Name",
          helpText: null, kind: "shortText", required: true, options: [],
          canonicalFieldId: "displayName", privacyClass: "organizerCustom",
          prefillPolicy: "never", hostPresentation: "detailOnly",
          validation: {minLength: null, maxLength: 100, minNumber: null,
            maxNumber: null, earliestDate: null, latestDate: null,
            minSelections: null, maxSelections: null, maxFileCount: null,
            maxFileSizeBytes: null, allowedMimeTypes: [], patternPreset: null,
            customError: null}}]}], logicRules: [],
      appearance: {preset: "minimal", logoAssetId: null, coverAssetId: null,
        activityKind: null},
      availability: {opensAt: null, closesAt: null, responseLimit: 1,
        closedMessage: null},
      consent: {consentVersion: "v1", consentCopy: "Share with organizer",
        retentionCopy: "Until withdrawal"},
      completion: {title: "Received", message: null, actionKind: "none",
        actionLabel: null, actionUrl: null},
      payment: {connectionId: "connection", amountPaise: 10000,
        currency: "INR", description: "Application fee",
        refundPolicy: "Refunded if cancelled"},
    },
  };
  const draft: Draft = {
    organizerId: "org", formId: "form", versionId: "version",
    publicFormId: "public-form-00000000000", status: "active", revision: 1,
    identityKind: "phoneVerified", respondentUid: "person",
    draftTokenHash: null, answers: {name: "Sara Demo"},
    consentAccepted: true, consentVersion: "v1", sourceLinkId: null,
    createdAt: now, updatedAt: now, expiresAt: Timestamp.fromMillis(10_000_000),
    submittedResponseId: null,
  };
  const form: Form = {
    organizerId: "org", createdByUid: "host", title: "Application",
    description: null, purpose: "application", status: "published",
    templateId: null, publicFormId: draft.publicFormId,
    defaultTargetKind: "organizer", defaultTargetId: null,
    activeVersionId: "version", draftRevision: 1, publishedVersion: 1,
    submittedResponseCount: 0, createdAt: now, updatedAt: now,
    publishedAt: now, pausedAt: null, archivedAt: null, lastResponseAt: null,
  };
  const connection: Connection = {
    organizerId: "org", provider: "razorpay", mode: "test", status: "ready",
    accountId: "acc_merchant", publicToken: "rzp_test_oauth_public",
    secretVersionResource: "projects/catch-test/secrets/TOKENS/versions/1",
    tokenExpiresAt: Timestamp.fromMillis(10_000_000), webhookId: "webhook1",
    webhookUrl: "https://example.com/webhook", webhookVerifiedAt: now,
    connectedByUid: "host", revision: 1, refreshLeaseUntil: null,
    createdAt: now, updatedAt: now, disconnectedAt: null, lastErrorCode: null,
  };
  store.records.set("organizerForms/form", {...form});
  store.records.set("organizerFormVersions/version", {...version});
  store.records.set("organizerFormResponseDrafts/draft", {...draft});
  store.records.set("organizerPaymentConnections/connection", {...connection});
  const data = {draftId: "draft", draftToken: null, expectedRevision: 1,
    requestId: "test-request-00000000"};
  const request = {data, auth: {uid: "person",
    token: {phone_number: "+919000000001"}},
  } as unknown as CallableRequest<unknown>;
  const reserve = () => reserveFormPayment({db, request, data, now});
  const capture = (paymentId: string) => {
    const ref = `organizerFormPayments/${paymentId}`;
    store.records.set(ref, {...store.records.get(ref), status: "captured",
      providerOrderId: "order_1", providerPaymentId: "pay_1", capturedAt: now});
  };
  const finalize = (paymentId: string) =>
    finalizeCapturedFormPayment({db, paymentId, now});
  return {db, store, data, request, version, draft, form,
    reserve, capture, finalize};
}
