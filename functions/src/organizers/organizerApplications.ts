import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {GetOrganizerApplicationDetailCallablePayload} from
  "../shared/generated/getOrganizerApplicationDetailCallablePayload";
import type {GetOrganizerApplicationDetailCallableResponse} from
  "../shared/generated/getOrganizerApplicationDetailCallableResponse";
import type {ImportOrganizerApplicationsCallablePayload} from
  "../shared/generated/importOrganizerApplicationsCallablePayload";
import type {ImportOrganizerApplicationsCallableResponse} from
  "../shared/generated/importOrganizerApplicationsCallableResponse";
import type {ListOrganizerApplicationsCallablePayload} from
  "../shared/generated/listOrganizerApplicationsCallablePayload";
import type {ListOrganizerApplicationsCallableResponse} from
  "../shared/generated/listOrganizerApplicationsCallableResponse";
import type {PreviewOrganizerApplicationImportCallablePayload} from
  "../shared/generated/previewOrganizerApplicationImportCallablePayload";
import type {PreviewOrganizerApplicationImportCallableResponse} from
  "../shared/generated/previewOrganizerApplicationImportCallableResponse";
import type {PublishOrganizerApplicationFormCallablePayload} from
  "../shared/generated/publishOrganizerApplicationFormCallablePayload";
import type {PublishOrganizerApplicationFormCallableResponse} from
  "../shared/generated/publishOrganizerApplicationFormCallableResponse";
import type {ReviewOrganizerApplicationCallablePayload} from
  "../shared/generated/reviewOrganizerApplicationCallablePayload";
import type {ReviewOrganizerApplicationCallableResponse} from
  "../shared/generated/reviewOrganizerApplicationCallableResponse";
import type {
  OrganizerApplicationDocument,
  OrganizerApplicationFormDocument,
  OrganizerApplicationFormVersionDocument,
  OrganizerApplicationImportReceiptDocument,
  OrganizerApplicationResponseDocument,
  OrganizerContactDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  validateGetOrganizerApplicationDetailCallablePayload,
} from
  "../shared/generated/validators/getOrganizerApplicationDetailInput";
import {
  validateImportOrganizerApplicationsCallablePayload,
} from
  "../shared/generated/validators/importOrganizerApplicationsInput";
import {
  validateListOrganizerApplicationsCallablePayload,
} from
  "../shared/generated/validators/listOrganizerApplicationsInput";
import {
  validatePreviewOrganizerApplicationImportCallablePayload,
} from
  "../shared/generated/validators/previewOrganizerApplicationImportInput";
import {
  validatePublishOrganizerApplicationFormCallablePayload,
} from
  "../shared/generated/validators/publishOrganizerApplicationFormInput";
import {
  validateReviewOrganizerApplicationCallablePayload,
} from
  "../shared/generated/validators/reviewOrganizerApplicationInput";
import {
  personFieldCatalog,
} from "../shared/generated/catalogs/personFieldCatalog";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits,
  appCheckCallableOptionsWithSecrets} from
  "../shared/callableOptions";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {organizerApplicationAccess, organizerApplicationContactId} from
  "./organizerApplicationAccess";
import {applicationAdmissionContactId} from "./organizerApplicationAdmission";
import {createOrganizerContactInTransaction} from "./organizerContacts";
import {organizerContactIdentityKey} from "./organizerAudienceSecrets";
import {resolveOrganizerAudienceCoverage} from "./organizerAudienceCoverage";
import {applicationReviewRateLimit} from "./applicationReviewRateLimit";

type Question = OrganizerApplicationFormVersionDocument["questions"][number];
type Answer = OrganizerApplicationResponseDocument["answers"][number];
type AnswerValue = Answer["value"];
type ImportRow = PreviewOrganizerApplicationImportCallablePayload[
  "rows"
][number];
type ImportMapping =
  PreviewOrganizerApplicationImportCallablePayload["mappings"][number];
type ImportError = OrganizerApplicationImportReceiptDocument["errors"][number];
type PreviewError = PreviewOrganizerApplicationImportCallableResponse[
  "sampleRows"
][number]["errors"][number];

interface OrganizerApplicationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
  identitySecret?: () => string;
}

const defaultDeps: OrganizerApplicationDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
};

const defaultPageSize = 50;
const maxListScan = 500;
const maxImportRows = 200;
const canonicalFieldByNormalizedAlias = new Map<
  string,
  Question["canonicalFieldId"]
>(personFieldCatalog.fields.flatMap((field) => field.aliases.map((alias) => [
  alias,
  field.id as Question["canonicalFieldId"],
])));

interface PreparedApplicationRow {
  rowId: string;
  displayName: string | null;
  answers: Answer[];
  errors: PreviewError[];
}

interface EffectiveMapping {
  headerIndex: number;
  question: Question | null;
  transform: ImportMapping["transform"];
  confidence: "explicit" | "exact" | "alias" | "none";
}

/** Creates an immutable form version and advances the form pointer. */
export async function publishOrganizerApplicationFormHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerApplicationDeps = defaultDeps
): Promise<PublishOrganizerApplicationFormCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    PublishOrganizerApplicationFormCallablePayload
  >(
    request,
    validatePublishOrganizerApplicationFormCallablePayload,
    normalizePublishPayload
  );
  assertQuestionIdentity(data.questions);
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    actorUid,
    "publishOrganizerApplicationForm",
    {maxRequests: 20, windowMs: 60 * 60 * 1000}
  );
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});

  const formRef = data.formId ?
    db.collection("organizerApplicationForms").doc(data.formId) :
    db.collection("organizerApplicationForms").doc();
  const result = await db.runTransaction(async (tx) => {
    const formSnap = await tx.get(formRef);
    const existing = formSnap.exists ?
      requireDoc<OrganizerApplicationFormDocument>(
        formSnap,
        "OrganizerApplicationFormDocument"
      ) : null;
    if (existing && existing.organizerId !== data.organizerId) {
      throw new HttpsError("permission-denied", "Form organizer mismatch.");
    }
    if (existing && data.expectedRevision === null) {
      const activeVersionId = existing.activeVersionId;
      if (existing.status === "published" && activeVersionId) {
        const activeVersionSnap = await tx.get(
          db.collection("organizerApplicationFormVersions")
            .doc(activeVersionId)
        );
        if (activeVersionSnap.exists) {
          const activeVersion =
            requireDoc<OrganizerApplicationFormVersionDocument>(
              activeVersionSnap,
              "OrganizerApplicationFormVersionDocument"
            );
          if (samePublishedForm(existing, activeVersion, data)) {
            return {
              versionId: activeVersionId,
              version: activeVersion.version,
              revision: existing.revision,
            };
          }
        }
      }
      throw new HttpsError(
        "failed-precondition",
        "This form id already belongs to different published content."
      );
    }
    if (existing && data.expectedRevision !== existing.revision) {
      throw new HttpsError(
        "aborted",
        "This form changed since it was opened. Reload and try again."
      );
    }
    if (!existing && data.expectedRevision !== null) {
      throw new HttpsError(
        "invalid-argument",
        "A new form cannot include an expected revision."
      );
    }
    const version = existing ? existing.revision + 1 : 1;
    const revision = version;
    const versionRef = db.collection("organizerApplicationFormVersions")
      .doc(`${formRef.id}_v${version}`);
    const now = deps.timestamp();
    const form: OrganizerApplicationFormDocument = {
      organizerId: data.organizerId,
      createdByUid: existing?.createdByUid ?? actorUid,
      title: data.title,
      description: data.description,
      status: "published",
      defaultTargetKind: data.defaultTargetKind,
      activeVersionId: versionRef.id,
      revision,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: null,
    };
    const formVersion: OrganizerApplicationFormVersionDocument = {
      organizerId: data.organizerId,
      formId: formRef.id,
      version,
      state: "published",
      title: data.title,
      description: data.description,
      questions: data.questions,
      consentCopy: data.consentCopy,
      consentVersion: data.consentVersion,
      retentionCopy: data.retentionCopy,
      createdByUid: actorUid,
      createdAt: now,
      publishedAt: now,
    };
    tx.set(versionRef, formVersion);
    tx.set(formRef, form);
    return {versionId: versionRef.id, version, revision};
  });

  return {
    organizerId: data.organizerId,
    formId: formRef.id,
    formVersionId: result.versionId,
    version: result.version,
    revision: result.revision,
  };
}

function samePublishedForm(
  form: OrganizerApplicationFormDocument,
  version: OrganizerApplicationFormVersionDocument,
  data: PublishOrganizerApplicationFormCallablePayload
): boolean {
  return form.organizerId === data.organizerId &&
    form.defaultTargetKind === data.defaultTargetKind &&
    data.formId !== null &&
    version.formId === data.formId &&
    version.title === data.title &&
    version.description === data.description &&
    version.consentCopy === data.consentCopy &&
    version.consentVersion === data.consentVersion &&
    version.retentionCopy === data.retentionCopy &&
    JSON.stringify(version.questions) === JSON.stringify(data.questions);
}

/** Validates mappings and samples rows without writing imported data. */
export async function previewOrganizerApplicationImportHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerApplicationDeps = defaultDeps
): Promise<PreviewOrganizerApplicationImportCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    PreviewOrganizerApplicationImportCallablePayload
  >(
    request,
    validatePreviewOrganizerApplicationImportCallablePayload,
    normalizeTabularPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    actorUid,
    "previewOrganizerApplicationImport",
    {maxRequests: 30, windowMs: 60 * 60 * 1000}
  );
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const version = await requireFormVersion({
    db,
    organizerId: data.organizerId,
    formVersionId: data.formVersionId,
  });
  const mappings = resolveMappings({
    headers: data.headers,
    mappings: data.mappings,
    questions: version.questions,
    allowSuggestions: true,
  });
  const prepared = prepareApplicationRows({
    headers: data.headers,
    rows: data.rows,
    mappings,
    questions: version.questions,
  });
  const validRowCount = prepared.filter((row) => row.errors.length === 0)
    .length;
  return {
    organizerId: data.organizerId,
    formVersionId: data.formVersionId,
    columns: mappings.map((mapping) => ({
      headerIndex: mapping.headerIndex,
      header: data.headers[mapping.headerIndex],
      questionId: mapping.question?.questionId ?? null,
      questionLabel: mapping.question?.label ?? null,
      suggestionConfidence: mapping.confidence,
    })),
    sampleRows: prepared.slice(0, 20).map((row) => ({
      rowId: row.rowId,
      displayName: row.displayName,
      errors: row.errors,
    })),
    rowCount: prepared.length,
    validRowCount,
    invalidRowCount: prepared.length - validRowCount,
  };
}

/**
 * Commits a bounded application import and its idempotency receipt atomically.
 */
export async function importOrganizerApplicationsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerApplicationDeps = defaultDeps
): Promise<ImportOrganizerApplicationsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ImportOrganizerApplicationsCallablePayload
  >(
    request,
    validateImportOrganizerApplicationsCallablePayload,
    normalizeTabularPayload
  );
  if (data.rows.length > maxImportRows) {
    throw new HttpsError(
      "invalid-argument",
      `Import at most ${maxImportRows} applications at a time.`
    );
  }
  assertTarget(data.targetKind, data.targetId);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "importOrganizerApplications", {
    maxRequests: 5, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const [version, formSnap] = await Promise.all([
    requireFormVersion({
      db,
      organizerId: data.organizerId,
      formVersionId: data.formVersionId,
    }),
    db.collection("organizerApplicationForms").doc(data.formId).get(),
  ]);
  if (!formSnap.exists || version.formId !== data.formId) {
    throw new HttpsError("failed-precondition", "Form version mismatch.");
  }
  const form = requireDoc<OrganizerApplicationFormDocument>(
    formSnap,
    "OrganizerApplicationFormDocument"
  );
  if (form.organizerId !== data.organizerId) {
    throw new HttpsError("permission-denied", "Form organizer mismatch.");
  }
  const mappings = resolveMappings({
    headers: data.headers,
    mappings: data.mappings,
    questions: version.questions,
    allowSuggestions: false,
  });
  const canonical = canonicalImportPayload(data);
  const payloadHash = sha256(JSON.stringify(canonical));
  const receiptId = scopedId(
    "application_import",
    data.organizerId,
    actorUid,
    data.importKey
  );
  const receiptRef = db.collection("organizerApplicationImportReceipts")
    .doc(receiptId);
  const existingSnap = await receiptRef.get();
  if (existingSnap.exists) {
    const existing = requireDoc<OrganizerApplicationImportReceiptDocument>(
      existingSnap,
      "OrganizerApplicationImportReceiptDocument"
    );
    if (existing.payloadHash !== payloadHash) {
      throw new HttpsError(
        "failed-precondition",
        "This import key was already used for different application data."
      );
    }
    return importResponse(receiptId, existing, true);
  }

  const prepared = prepareApplicationRows({
    headers: data.headers,
    rows: data.rows,
    mappings,
    questions: version.questions,
  });
  const valid = prepared.filter((row) => row.errors.length === 0);
  const errors: ImportError[] = prepared
    .filter((row) => row.errors.length > 0)
    .slice(0, 100)
    .map((row) => ({
      rowId: row.rowId,
      code: row.errors[0].code,
      message: row.errors.map((error) => error.message).join(" ")
        .slice(0, 240),
    }));
  const now = deps.timestamp();
  const status: OrganizerApplicationImportReceiptDocument["status"] =
    valid.length === 0 ? "failed" :
      errors.length > 0 ? "partial" : "completed";
  const receipt: OrganizerApplicationImportReceiptDocument = {
    organizerId: data.organizerId,
    formId: data.formId,
    formVersionId: data.formVersionId,
    mappingId: data.mappingId,
    uploadedByUid: actorUid,
    importKey: data.importKey,
    fileName: data.fileName,
    format: data.format,
    payloadHash,
    status,
    rowCount: prepared.length,
    createdCount: valid.length,
    skippedCount: prepared.length - valid.length,
    errors,
    createdAt: now,
    completedAt: now,
  };
  const commit = await db.runTransaction(async (tx) => {
    // The earlier receipt read makes normal retries cheap; this transactional
    // read also makes concurrent exact retries converge on the same receipt.
    const concurrentReceiptSnap = await tx.get(receiptRef);
    if (concurrentReceiptSnap.exists) {
      const concurrentReceipt =
        requireDoc<OrganizerApplicationImportReceiptDocument>(
          concurrentReceiptSnap,
          "OrganizerApplicationImportReceiptDocument"
        );
      if (concurrentReceipt.payloadHash !== payloadHash) {
        throw new HttpsError(
          "failed-precondition",
          "This import key was already used for different application data."
        );
      }
      return {receipt: concurrentReceipt, replayed: true};
    }
    for (const row of valid) {
      const applicationId = scopedId(
        "application",
        data.organizerId,
        data.importKey,
        row.rowId
      );
      const responseId = `${applicationId}_r1`;
      const source: OrganizerApplicationDocument["source"] = {
        kind: data.format === "connector" ? "connector" : "tabularImport",
        providerId: null,
        externalFormId: null,
        externalResponseId: row.rowId,
        importReceiptId: receiptId,
      };
      const application: OrganizerApplicationDocument = {
        organizerId: data.organizerId,
        formId: data.formId,
        formVersionId: data.formVersionId,
        targetKind: data.targetKind,
        targetId: data.targetId,
        linkedUid: null,
        contactId: null,
        applicantDisplayName: row.displayName!,
        applicantDisplayNameNormalized: normalizeSearch(row.displayName!),
        reviewStatus: "submitted",
        latestResponseId: responseId,
        source,
        assignedReviewerUid: null,
        reviewNote: null,
        revision: 1,
        submittedAt: now,
        updatedAt: now,
        reviewedAt: null,
      };
      const response: OrganizerApplicationResponseDocument = {
        organizerId: data.organizerId,
        applicationId,
        formId: data.formId,
        formVersionId: data.formVersionId,
        linkedUid: null,
        answers: row.answers,
        source,
        consentVersion: null,
        grantId: null,
        submittedAt: now,
      };
      tx.create(
        db.collection("organizerApplications").doc(applicationId),
        application
      );
      tx.create(
        db.collection("organizerApplicationResponses").doc(responseId),
        response
      );
    }
    tx.create(receiptRef, receipt);
    return {receipt, replayed: false};
  });
  return importResponse(receiptId, commit.receipt, commit.replayed);
}

/** Lists one organizer's bounded review queue. */
export async function listOrganizerApplicationsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerApplicationDeps = defaultDeps
): Promise<ListOrganizerApplicationsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListOrganizerApplicationsCallablePayload
  >(
    request,
    validateListOrganizerApplicationsCallablePayload,
    normalizeListPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerApplications", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  let customerAccountUid: string | null = null;
  if (data.contactId) {
    const contact = (await db.collection("organizerContacts")
      .doc(data.contactId).get()).data() as
      OrganizerContactDocument | undefined;
    customerAccountUid = customerApplicationAccountUid(
      contact, data.organizerId
    );
  }
  // Resolve source origins before filtering: merges may move a submission to
  // another contact without rewriting its immutable application projection.
  const baseQuery = db.collection("organizerApplications")
    .where("organizerId", "==", data.organizerId)
    .orderBy(admin.firestore.FieldPath.documentId());
  const snapshot = await baseQuery.limit(maxListScan).get();
  if (snapshot.size === maxListScan) {
    const overflow = await baseQuery
      .startAfter(snapshot.docs[snapshot.docs.length - 1])
      .limit(1)
      .get();
    if (!overflow.empty) {
      throw new HttpsError(
        "resource-exhausted",
        "This application queue is too large for the current review view."
      );
    }
  }
  const query = normalizeSearch(data.query ?? "");
  const resolvedRows = await Promise.all(snapshot.docs.map(async (doc) => {
    const row = {id: doc.id, data: doc.data() as OrganizerApplicationDocument};
    const access = await organizerApplicationAccess({
      db, applicationId: row.id, application: row.data,
    });
    const accessState = access.accessState;
    const visibleName = accessState === "revokedParticipantGrant" ?
      "Withdrawn applicant" : row.data.applicantDisplayName;
    return {
      ...row,
      data: {
        ...row.data,
        contactId: await organizerApplicationContactId({
          db, applicationId: row.id, application: row.data}),
        applicantDisplayName: visibleName,
        applicantDisplayNameNormalized: normalizeSearch(visibleName),
      },
      accessState, sourceResponseId: access.sourceResponseId,
    };
  }));
  const rows = resolvedRows.filter((row) => {
    if (data.contactId && !customerApplicationMatches(
      row.data, data.contactId, customerAccountUid
    )) return false;
    if (data.formId && row.data.formId !== data.formId) return false;
    if (data.targetId && row.data.targetId !== data.targetId) return false;
    if (data.reviewStatus &&
        row.data.reviewStatus !== data.reviewStatus) return false;
    return !query || row.data.applicantDisplayNameNormalized.includes(query);
  });
  rows.sort(applicationComparator(data.sort ?? "newest"));
  const fingerprint = sha256(JSON.stringify([
    data.organizerId, data.contactId ?? null, data.formId ?? null,
    data.targetId ?? null, data.reviewStatus ?? null, query,
    data.sort ?? "newest",
    rows.map((row) => [row.id, row.data.revision, row.accessState,
      row.data.contactId]),
  ]));
  const offset = decodeCursor(data.cursor ?? null, fingerprint);
  const limit = data.limit ?? defaultPageSize;
  const page = rows.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    organizerId: data.organizerId,
    applications: page.map((row) => ({
      applicationId: row.id,
      contactId: row.data.contactId,
      sourceResponseId: row.sourceResponseId,
      formId: row.data.formId,
      formVersionId: row.data.formVersionId,
      targetKind: row.data.targetKind,
      targetId: row.data.targetId,
      applicantDisplayName: row.data.applicantDisplayName,
      reviewStatus: row.data.reviewStatus,
      dataAccessState: row.accessState,
      sourceKind: row.data.source.kind,
      providerId: row.data.source.providerId,
      submittedAtMillis: row.data.submittedAt.toMillis(),
      revision: row.data.revision,
    })),
    nextCursor: nextOffset < rows.length ?
      encodeCursor(fingerprint, nextOffset) : null,
  };
}

/** Matches a resolved source contact or a verified account identity. */
export function customerApplicationMatches(
  application: Pick<OrganizerApplicationDocument, "contactId" | "linkedUid">,
  contactId: string,
  verifiedAccountUid: string | null
): boolean {
  return application.contactId === contactId ||
    (verifiedAccountUid !== null &&
      application.linkedUid === verifiedAccountUid);
}

/** Identity may locate an application; its grant still controls its answers. */
export function customerApplicationAccountUid(
  contact: Pick<OrganizerContactDocument,
    "organizerId" | "deletedAt" | "hiddenAt" | "identityState" |
    "linkedUid"> | undefined,
  organizerId: string
): string | null {
  if (!contact || contact.organizerId !== organizerId ||
      contact.deletedAt !== null || contact.hiddenAt != null ||
      contact.identityState === "merged") {
    throw new HttpsError("not-found", "Customer not found.");
  }
  return contact.identityState === "verified" ? contact.linkedUid : null;
}

/** Gets one manager-visible application answer snapshot. */
export async function getOrganizerApplicationDetailHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerApplicationDeps = defaultDeps
): Promise<GetOrganizerApplicationDetailCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerApplicationDetailCallablePayload
  >(
    request,
    validateGetOrganizerApplicationDetailCallablePayload,
    normalizeDetailPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    actorUid,
    "getOrganizerApplicationDetail",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const applicationSnap = await db.collection("organizerApplications")
    .doc(data.applicationId).get();
  if (!applicationSnap.exists) {
    throw new HttpsError("not-found", "Application not found.");
  }
  const application = requireDoc<OrganizerApplicationDocument>(
    applicationSnap,
    "OrganizerApplicationDocument"
  );
  if (application.organizerId !== data.organizerId) {
    throw new HttpsError("not-found", "Application not found.");
  }
  const visible = await organizerApplicationAccess({
    db, applicationId: data.applicationId, application,
  });
  return {
    organizerId: data.organizerId,
    applicationId: data.applicationId,
    contactId: await organizerApplicationContactId({
      db, applicationId: data.applicationId, application}),
    sourceResponseId: visible.sourceResponseId,
    formId: application.formId,
    formVersionId: application.formVersionId,
    targetKind: application.targetKind,
    targetId: application.targetId,
    applicantDisplayName:
      visible.accessState === "revokedParticipantGrant" ?
        "Withdrawn applicant" : application.applicantDisplayName,
    reviewStatus: application.reviewStatus,
    dataAccessState: visible.accessState,
    answers: visible.answers,
    outreach: applicationOutreach(visible.answers, visible.identity),
    reviewNote: application.reviewNote,
    assignedReviewerUid: application.assignedReviewerUid,
    submittedAtMillis: application.submittedAt.toMillis(),
    reviewedAtMillis: application.reviewedAt?.toMillis() ?? null,
    revision: application.revision,
  };
}

/** Applies one optimistic manager review transition. */
export async function reviewOrganizerApplicationHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerApplicationDeps = defaultDeps
): Promise<ReviewOrganizerApplicationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ReviewOrganizerApplicationCallablePayload
  >(
    request,
    validateReviewOrganizerApplicationCallablePayload,
    normalizeReviewPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "reviewOrganizerApplication",
    applicationReviewRateLimit);
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const ref = db.collection("organizerApplications").doc(data.applicationId);
  const now = deps.timestamp();
  const initialSourceCoverage = data.reviewStatus === "approved" ?
    await resolveOrganizerAudienceCoverage({
      db, organizerId: data.organizerId, storedCoverage: null,
    }) : "partial";
  const result = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new HttpsError("not-found",
        "Application not found.");
    }
    const application = requireDoc<OrganizerApplicationDocument>(
      snapshot, "OrganizerApplicationDocument");
    if (application.organizerId !== data.organizerId) {
      throw new HttpsError("not-found", "Application not found.");
    }
    const access = await organizerApplicationAccess({
      db, applicationId: data.applicationId, application, transaction: tx,
    });
    if (application.reviewStatus === "withdrawn" ||
        access.accessState === "revokedParticipantGrant") {
      throw new HttpsError("failed-precondition",
        "This application was withdrawn or its response is unavailable.");
    }
    const replay = application.reviewStatus === data.reviewStatus &&
      application.reviewNote === data.reviewNote &&
      application.revision === data.expectedRevision + 1 &&
      (data.reviewStatus !== "approved" || application.contactId !== null);
    if (replay) {
      return {revision: application.revision,
        contactId: application.contactId,
        reviewedAtMillis: application.reviewedAt!.toMillis()};
    }
    if (application.revision !== data.expectedRevision) {
      throw new HttpsError("aborted",
        "This application changed. Reload before reviewing it.");
    }
    let contactId = application.contactId;
    if (data.reviewStatus === "approved") {
      const outreach = applicationOutreach(access.answers, access.identity);
      contactId = await applicationAdmissionContactId({
        db, transaction: tx, applicationId: data.applicationId,
        application, access, phoneE164: outreach.phoneE164,
        email: outreach.email,
      });
      await createOrganizerContactInTransaction({
        db, transaction: tx, initialSourceCoverage, contactId,
        organizerId: data.organizerId, actorUid,
        displayName: application.applicantDisplayName.slice(0, 120),
        phoneE164: outreach.phoneE164, email: outreach.email,
        initialNote: null,
        identitySecret: (deps.identitySecret ??
          (() => organizerContactIdentityKey.value()))(),
        origin: {
          kind: access.sourceResponseId ?
            "hostFormResponse" : "hostApplicationResponse",
          formId: application.formId, responseId: application.latestResponseId,
          observedAt: application.submittedAt,
        }, now,
      });
    }
    const revision = application.revision + 1;
    tx.update(ref, {
      reviewStatus: data.reviewStatus, reviewNote: data.reviewNote,
      assignedReviewerUid: actorUid, contactId, revision,
      updatedAt: now, reviewedAt: now,
      ...(data.reviewStatus === "approved" &&
        application.reviewStatus !== "approved" ?
        {approvalNotificationBasis: {revision,
          approvedAtMillis: now.toMillis()}} : {}),
    });
    return {revision, contactId, reviewedAtMillis: now.toMillis()};
  });
  return {organizerId: data.organizerId, applicationId: data.applicationId,
    reviewStatus: data.reviewStatus, ...result};
}

async function requireFormVersion(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  formVersionId: string;
}): Promise<OrganizerApplicationFormVersionDocument> {
  const snapshot = await params.db
    .collection("organizerApplicationFormVersions")
    .doc(params.formVersionId).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Application form version not found.");
  }
  const version = requireDoc<OrganizerApplicationFormVersionDocument>(
    snapshot,
    "OrganizerApplicationFormVersionDocument"
  );
  if (version.organizerId !== params.organizerId) {
    throw new HttpsError("not-found", "Application form version not found.");
  }
  if (version.state !== "published") {
    throw new HttpsError(
      "failed-precondition",
      "Only published application forms can accept responses."
    );
  }
  return version;
}

function assertQuestionIdentity(questions: Question[]): void {
  const ids = new Set<string>();
  const keys = new Set<string>();
  const canonicalIds = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.questionId) || keys.has(question.key.toLowerCase())) {
      throw new HttpsError(
        "invalid-argument",
        "Question ids and keys must be unique."
      );
    }
    ids.add(question.questionId);
    keys.add(question.key.toLowerCase());
    if (question.canonicalFieldId) {
      if (canonicalIds.has(question.canonicalFieldId)) {
        throw new HttpsError(
          "invalid-argument",
          "A canonical field can be mapped only once per form."
        );
      }
      canonicalIds.add(question.canonicalFieldId);
    }
    if ((question.kind === "singleChoice" ||
        question.kind === "multiChoice") && question.options.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        `Question "${question.label}" needs at least one option.`
      );
    }
  }
}

function resolveMappings(params: {
  headers: string[];
  mappings: ImportMapping[];
  questions: Question[];
  allowSuggestions: boolean;
}): EffectiveMapping[] {
  const questionById = new Map(
    params.questions.map((question) => [question.questionId, question])
  );
  const explicitByIndex = new Map<number, ImportMapping>();
  const mappedQuestionIds = new Set<string>();
  for (const mapping of params.mappings) {
    if (mapping.headerIndex >= params.headers.length ||
        explicitByIndex.has(mapping.headerIndex)) {
      throw new HttpsError(
        "invalid-argument",
        "Every mapped column must reference one unique header."
      );
    }
    if (mapping.questionId) {
      if (!questionById.has(mapping.questionId)) {
        throw new HttpsError(
          "invalid-argument",
          "A column mapping references an unknown question."
        );
      }
      if (mappedQuestionIds.has(mapping.questionId)) {
        throw new HttpsError(
          "invalid-argument",
          "A question can be mapped from only one source column."
        );
      }
      mappedQuestionIds.add(mapping.questionId);
    }
    explicitByIndex.set(mapping.headerIndex, mapping);
  }
  return params.headers.map((header, headerIndex) => {
    const explicit = explicitByIndex.get(headerIndex);
    if (explicit?.questionId) {
      return {
        headerIndex,
        question: questionById.get(explicit.questionId)!,
        transform: explicit.transform,
        confidence: "explicit" as const,
      };
    }
    if (!params.allowSuggestions) {
      return {
        headerIndex,
        question: null,
        transform: explicit?.transform ?? "trim",
        confidence: "none" as const,
      };
    }
    const suggestion = suggestQuestion(header, params.questions,
      mappedQuestionIds);
    if (suggestion.question) {
      mappedQuestionIds.add(suggestion.question.questionId);
    }
    return {
      headerIndex,
      question: suggestion.question,
      transform: explicit?.transform ?? "trim",
      confidence: suggestion.confidence,
    };
  });
}

function suggestQuestion(
  header: string,
  questions: Question[],
  excluded: Set<string>
): {question: Question | null; confidence: "exact" | "alias" | "none"} {
  const normalized = normalizeHeader(header);
  const exact = questions.find((question) =>
    !excluded.has(question.questionId) &&
    (normalizeHeader(question.label) === normalized ||
      normalizeHeader(question.key) === normalized)
  );
  if (exact) return {question: exact, confidence: "exact"};
  const canonicalId = canonicalFieldForNormalizedHeader(normalized);
  const alias = canonicalId ? questions.find((question) =>
    !excluded.has(question.questionId) &&
    question.canonicalFieldId === canonicalId
  ) : null;
  return alias ?
    {question: alias, confidence: "alias"} :
    {question: null, confidence: "none"};
}

export function prepareApplicationRows(params: {
  headers: string[];
  rows: ImportRow[];
  mappings: EffectiveMapping[];
  questions: Question[];
}): PreparedApplicationRow[] {
  const mappedQuestionIds = new Set(params.mappings
    .map((mapping) => mapping.question?.questionId)
    .filter((id): id is string => Boolean(id)));
  const unmappedRequired = params.questions
    .filter((question) => question.required &&
      !mappedQuestionIds.has(question.questionId));
  return params.rows.map((row) => {
    const errors: PreviewError[] = [];
    if (row.values.length !== params.headers.length) {
      errors.push({
        questionId: null,
        code: "columnCountMismatch",
        message:
          "This row does not have the same number of values as the header.",
      });
    }
    for (const question of unmappedRequired) {
      errors.push({
        questionId: question.questionId,
        code: "requiredQuestionUnmapped",
        message: `Required question "${question.label}" is not mapped.`,
      });
    }
    const answers: Answer[] = [];
    for (const mapping of params.mappings) {
      if (!mapping.question) continue;
      const raw = row.values[mapping.headerIndex] ?? null;
      const parsed = parseAnswer(raw, mapping.question, mapping.transform);
      if (parsed.error) {
        errors.push({
          questionId: mapping.question.questionId,
          ...parsed.error,
        });
      }
      answers.push(answerSnapshot(mapping.question, parsed.value));
    }
    const displayName = applicationDisplayName(answers);
    if (!displayName) {
      errors.push({
        questionId: null,
        code: "displayNameMissing",
        message: "Map a name field so this application can be reviewed safely.",
      });
    }
    return {rowId: row.rowId, displayName, answers, errors};
  });
}

function parseAnswer(
  rawValue: string | null,
  question: Question,
  transform: ImportMapping["transform"]
): {value: AnswerValue; error: Omit<PreviewError, "questionId"> | null} {
  const raw = rawValue?.trim() ?? "";
  if (!raw) {
    return {
      value: emptyAnswerValue(),
      error: question.required ? {
        code: "requiredValueMissing",
        message: `"${question.label}" is required.`,
      } : null,
    };
  }
  if (question.kind === "number" || transform === "number") {
    const value = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(value)) {
      return invalidValue(question, "invalidNumber", "Enter a valid number.");
    }
    return {value: answerValue({valueKind: "number", numberValue: value}),
      error: null};
  }
  if (question.kind === "boolean" || transform === "boolean") {
    const normalized = raw.toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) {
      return {value: answerValue({valueKind: "boolean", booleanValue: true}),
        error: null};
    }
    if (["false", "no", "n", "0"].includes(normalized)) {
      return {value: answerValue({valueKind: "boolean", booleanValue: false}),
        error: null};
    }
    return invalidValue(
      question,
      "invalidBoolean",
      "Use yes/no or true/false."
    );
  }
  if (question.kind === "date" || transform === "isoDate") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) ||
        Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
      return invalidValue(
        question,
        "invalidDate",
        "Use an ISO date in YYYY-MM-DD format."
      );
    }
    return {value: answerValue({valueKind: "date", dateValue: raw}),
      error: null};
  }
  if (question.kind === "phone" || transform === "e164") {
    const phone = normalizeE164(raw);
    if (!phone) {
      return invalidValue(
        question,
        "invalidPhone",
        "Include a full international phone number, for example +919876543210."
      );
    }
    return {value: answerValue({valueKind: "text", textValue: phone}),
      error: null};
  }
  if (question.kind === "email") {
    const email = raw.toLowerCase();
    if (!isValidEmail(email)) {
      return invalidValue(
        question,
        "invalidEmail",
        "Enter a valid email address."
      );
    }
    return {value: answerValue({valueKind: "text", textValue: email}),
      error: null};
  }
  if (question.kind === "url" || transform === "assetUrl") {
    const url = safeHttpUrl(raw);
    if (!url) {
      return invalidValue(
        question,
        "invalidUrl",
        "Enter a valid http or https URL."
      );
    }
    return {value: answerValue({valueKind: "text", textValue: url}),
      error: null};
  }
  if (question.kind === "singleChoice" ||
      question.kind === "multiChoice" || transform === "splitOptions") {
    const values = question.kind === "singleChoice" ? [raw] :
      raw.split(/[;,]/).map((value) => value.trim()).filter(Boolean);
    const optionsByInput = new Map<string, string>();
    for (const option of question.options) {
      optionsByInput.set(option.value.toLowerCase(), option.value);
      optionsByInput.set(option.label.toLowerCase(), option.value);
    }
    const normalized = values.map((value) =>
      optionsByInput.get(value.toLowerCase()) ?? null);
    if (normalized.some((value) => value === null)) {
      return invalidValue(
        question,
        "invalidOption",
        `One or more values are not valid options for "${question.label}".`
      );
    }
    return {
      value: answerValue({
        valueKind: "options",
        optionValues: normalized as string[],
      }),
      error: null,
    };
  }
  return {
    value: answerValue({valueKind: "text", textValue: raw}),
    error: null,
  };
}

function invalidValue(
  question: Question,
  code: string,
  message: string
): {value: AnswerValue; error: Omit<PreviewError, "questionId">} {
  return {
    value: emptyAnswerValue(),
    error: {code, message: `${question.label}: ${message}`},
  };
}

function answerSnapshot(question: Question, value: AnswerValue): Answer {
  return {
    questionId: question.questionId,
    questionKey: question.key,
    questionLabel: question.label,
    questionKind: question.kind,
    canonicalFieldId: question.canonicalFieldId,
    privacyClass: question.privacyClass,
    hostPresentation: question.hostPresentation,
    value,
  };
}

function answerValue(overrides: Partial<AnswerValue>): AnswerValue {
  return {
    valueKind: "empty",
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    optionValues: [],
    assetIds: [],
    ...overrides,
  };
}

function emptyAnswerValue(): AnswerValue {
  return answerValue({});
}

function applicationDisplayName(answers: Answer[]): string | null {
  const canonicalText = (id: Answer["canonicalFieldId"]): string | null => {
    const answer = answers.find(
      (candidate) => candidate.canonicalFieldId === id
    );
    return answer?.value.textValue?.trim() || null;
  };
  const displayName = canonicalText("displayName");
  if (displayName) return displayName.slice(0, 160);
  const name = [canonicalText("givenName"), canonicalText("familyName")]
    .filter(Boolean).join(" ").trim();
  return name ? name.slice(0, 160) : null;
}

export function applicationOutreach(
  answers: Answer[],
  identity?: {phoneE164: string | null; email: string | null}
): GetOrganizerApplicationDetailCallableResponse["outreach"] {
  const text = (field: Answer["canonicalFieldId"]): string | null =>
    answers.find((answer) => answer.canonicalFieldId === field)
      ?.value.textValue?.trim() || null;
  const phoneE164 = normalizeE164(text("phoneNumber") ?? "") ??
    normalizeE164(identity?.phoneE164 ?? "");
  const submittedEmail = text("email")?.toLowerCase() ?? null;
  const emailCandidate = submittedEmail && isValidEmail(submittedEmail) ?
    submittedEmail : identity?.email?.trim().toLowerCase() ?? null;
  const instagram = text("instagramHandle");
  const linkedin = text("linkedinUrl");
  return {
    phoneE164,
    email: emailCandidate && isValidEmail(emailCandidate) ?
      emailCandidate : null,
    instagramUrl: safeInstagramUrl(instagram),
    linkedinUrl: safeLinkedinUrl(linkedin),
  };
}

function safeInstagramUrl(value: string | null): string | null {
  if (!value) return null;
  const handle = value.replace(/^@/, "");
  if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    return `https://www.instagram.com/${handle}/`;
  }
  const url = safeHttpUrl(value);
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "instagram.com" || host.endsWith(".instagram.com") ?
      url : null;
  } catch {
    return null;
  }
}

function safeLinkedinUrl(value: string | null): string | null {
  const url = value ? safeHttpUrl(value) : null;
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com") ?
      url : null;
  } catch {
    return null;
  }
}

function assertTarget(
  kind: ImportOrganizerApplicationsCallablePayload["targetKind"],
  targetId: string | null
): void {
  if ((kind === "organizer") !== (targetId === null)) {
    throw new HttpsError(
      "invalid-argument",
      "Organizer applications omit targetId; event and campaign " +
        "applications require it."
    );
  }
}

function importResponse(
  receiptId: string,
  receipt: OrganizerApplicationImportReceiptDocument,
  replayed: boolean
): ImportOrganizerApplicationsCallableResponse {
  return {
    receiptId,
    status: receipt.status,
    rowCount: receipt.rowCount,
    createdCount: receipt.createdCount,
    skippedCount: receipt.skippedCount,
    errors: receipt.errors,
    replayed,
  };
}

function canonicalImportPayload(
  data: ImportOrganizerApplicationsCallablePayload
): Record<string, unknown> {
  return {
    organizerId: data.organizerId,
    formId: data.formId,
    formVersionId: data.formVersionId,
    targetKind: data.targetKind,
    targetId: data.targetId,
    mappingId: data.mappingId,
    fileName: data.fileName,
    format: data.format,
    headers: data.headers,
    mappings: [...data.mappings].sort((a, b) =>
      a.headerIndex - b.headerIndex),
    rows: data.rows,
  };
}

function applicationComparator(
  sort: NonNullable<ListOrganizerApplicationsCallablePayload["sort"]>
): (a: {id: string; data: OrganizerApplicationDocument},
  b: {id: string; data: OrganizerApplicationDocument}) => number {
  if (sort === "name") {
    return (a, b) => a.data.applicantDisplayNameNormalized.localeCompare(
      b.data.applicantDisplayNameNormalized
    ) || a.id.localeCompare(b.id);
  }
  const direction = sort === "oldest" ? 1 : -1;
  return (a, b) => direction * (
    a.data.submittedAt.toMillis() - b.data.submittedAt.toMillis()
  ) || a.id.localeCompare(b.id);
}

function encodeCursor(fingerprint: string, offset: number): string {
  return Buffer.from(JSON.stringify({version: 2, fingerprint, offset}), "utf8")
    .toString("base64url");
}

function decodeCursor(cursor: string | null, fingerprint: string): number {
  if (!cursor) return 0;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const decoded = JSON.parse(json) as {
      version?: unknown;
      fingerprint?: unknown;
      offset?: unknown;
    };
    if (decoded.version !== 2 || decoded.fingerprint !== fingerprint ||
        !Number.isInteger(decoded.offset) || (decoded.offset as number) < 0 ||
        (decoded.offset as number) > maxListScan) {
      throw new Error("invalid cursor");
    }
    return decoded.offset as number;
  } catch {
    throw new HttpsError("invalid-argument", "Application cursor is invalid.");
  }
}

function scopedId(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex")
    .slice(0, 48);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function canonicalFieldForNormalizedHeader(
  value: string
): Question["canonicalFieldId"] {
  return canonicalFieldByNormalizedAlias.get(value) ?? null;
}

function normalizeE164(value: string): string | null {
  const normalized = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(normalized) ? normalized : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ?
      url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizePublishPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    organizerId: normalizedString(value.organizerId),
    formId: normalizedNullableString(value.formId),
    title: normalizedString(value.title),
    description: normalizedNullableString(value.description),
    consentCopy: normalizedString(value.consentCopy),
    consentVersion: normalizedString(value.consentVersion),
    retentionCopy: normalizedString(value.retentionCopy),
  };
}

export function normalizeTabularPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const normalized: Record<string, unknown> = {
    ...value,
    organizerId: normalizedString(value.organizerId),
    formVersionId: normalizedString(value.formVersionId),
  };
  if ("formId" in value) {
    normalized.formId = normalizedString(value.formId);
  }
  if ("targetId" in value) {
    normalized.targetId = normalizedNullableString(value.targetId);
  }
  if ("mappingId" in value) {
    normalized.mappingId = normalizedNullableString(value.mappingId);
  }
  if ("importKey" in value) {
    normalized.importKey = normalizedString(value.importKey);
  }
  if ("fileName" in value) {
    normalized.fileName = normalizedString(value.fileName);
  }
  return normalized;
}

function normalizeListPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    organizerId: normalizedString(value.organizerId),
    contactId: normalizedNullableString(value.contactId),
    formId: normalizedNullableString(value.formId),
    targetId: normalizedNullableString(value.targetId),
    query: normalizedNullableString(value.query),
    cursor: normalizedNullableString(value.cursor),
  };
}

function normalizeDetailPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    organizerId: normalizedString(value.organizerId),
    applicationId: normalizedString(value.applicationId),
  };
}

function normalizeReviewPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    organizerId: normalizedString(value.organizerId),
    applicationId: normalizedString(value.applicationId),
    reviewNote: normalizedNullableString(value.reviewNote),
  };
}

function normalizedString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function normalizedNullableString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const publishOrganizerApplicationForm = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => publishOrganizerApplicationFormHandler(request)
);

export const previewOrganizerApplicationImport = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => previewOrganizerApplicationImportHandler(request)
);

export const importOrganizerApplications = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120, maxInstances: 10}),
  (request) => importOrganizerApplicationsHandler(request)
);

export const listOrganizerApplications = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => listOrganizerApplicationsHandler(request)
);

export const getOrganizerApplicationDetail = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => getOrganizerApplicationDetailHandler(request)
);

export const reviewOrganizerApplication = onCall(
  appCheckCallableOptionsWithSecrets([organizerContactIdentityKey],
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => reviewOrganizerApplicationHandler(request)
);
