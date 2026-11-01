import {readPaymentRoute} from "../payments/paymentRouting";
import {readReadyRouteAccount} from
  "../payments/formPayments/razorpayRouteFormAuthority";
import {createHash, randomBytes} from "crypto";
import {authorizeFormMutation, requireOrganizerFormEventTarget} from
  "./organizerFormTarget";
import {validateFormCapabilities} from "./organizerFormCapabilities";
import {requireReadyFormPaymentConnection} from
  "../payments/formPayments/formPaymentConnectionPolicy";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {CreateOrganizerFormCallablePayload} from
  "../shared/generated/createOrganizerFormCallablePayload";
import type {CreateOrganizerFormCallableResponse} from
  "../shared/generated/createOrganizerFormCallableResponse";
import type {DeleteOrganizerFormDraftCallablePayload} from
  "../shared/generated/deleteOrganizerFormDraftCallablePayload";
import type {DeleteOrganizerFormDraftCallableResponse} from
  "../shared/generated/deleteOrganizerFormDraftCallableResponse";
import type {DuplicateOrganizerFormCallablePayload} from
  "../shared/generated/duplicateOrganizerFormCallablePayload";
import type {DuplicateOrganizerFormCallableResponse} from
  "../shared/generated/duplicateOrganizerFormCallableResponse";
import type {GetOrganizerFormEditorCallablePayload} from
  "../shared/generated/getOrganizerFormEditorCallablePayload";
import type {GetOrganizerFormEditorCallableResponse} from
  "../shared/generated/getOrganizerFormEditorCallableResponse";
import type {ListOrganizerFormsCallablePayload} from
  "../shared/generated/listOrganizerFormsCallablePayload";
import type {ListOrganizerFormsCallableResponse} from
  "../shared/generated/listOrganizerFormsCallableResponse";
import type {ListOrganizerFormTemplatesCallablePayload} from
  "../shared/generated/listOrganizerFormTemplatesCallablePayload";
import type {ListOrganizerFormTemplatesCallableResponse} from
  "../shared/generated/listOrganizerFormTemplatesCallableResponse";
import type {PublishOrganizerFormCallablePayload} from
  "../shared/generated/publishOrganizerFormCallablePayload";
import type {PublishOrganizerFormCallableResponse} from
  "../shared/generated/publishOrganizerFormCallableResponse";
import type {SetOrganizerFormLifecycleCallablePayload} from
  "../shared/generated/setOrganizerFormLifecycleCallablePayload";
import type {SetOrganizerFormLifecycleCallableResponse} from
  "../shared/generated/setOrganizerFormLifecycleCallableResponse";
import type {UpdateOrganizerFormDraftCallablePayload} from
  "../shared/generated/updateOrganizerFormDraftCallablePayload";
import type {UpdateOrganizerFormDraftCallableResponse} from
  "../shared/generated/updateOrganizerFormDraftCallableResponse";
import type {ValidateOrganizerFormDraftCallablePayload} from
  "../shared/generated/validateOrganizerFormDraftCallablePayload";
import type {ValidateOrganizerFormDraftCallableResponse} from
  "../shared/generated/validateOrganizerFormDraftCallableResponse";
import type {
  OrganizerFormDocument,
  OrganizerFormDraftDocument,
  OrganizerFormVersionDocument,
  OrganizerPaymentConnectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  organizerFormTemplateCatalog,
} from "../shared/generated/catalogs/organizerFormTemplateCatalog";
import {
  validateCreateOrganizerFormCallablePayload,
} from "../shared/generated/validators/createOrganizerFormInput";
import {
  validateDeleteOrganizerFormDraftCallablePayload,
} from "../shared/generated/validators/deleteOrganizerFormDraftInput";
import {
  validateDuplicateOrganizerFormCallablePayload,
} from "../shared/generated/validators/duplicateOrganizerFormInput";
import {
  validateGetOrganizerFormEditorCallablePayload,
} from "../shared/generated/validators/getOrganizerFormEditorInput";
import {
  validateListOrganizerFormsCallablePayload,
} from "../shared/generated/validators/listOrganizerFormsInput";
import {
  validateListOrganizerFormTemplatesCallablePayload,
} from
  "../shared/generated/validators/listOrganizerFormTemplatesInput";
import {
  validatePublishOrganizerFormCallablePayload,
} from "../shared/generated/validators/publishOrganizerFormInput";
import {
  validateSetOrganizerFormLifecycleCallablePayload,
} from
  "../shared/generated/validators/setOrganizerFormLifecycleInput";
import {
  validateUpdateOrganizerFormDraftCallablePayload,
} from "../shared/generated/validators/updateOrganizerFormDraftInput";
import {
  validateValidateOrganizerFormDraftCallablePayload,
} from
  "../shared/generated/validators/validateOrganizerFormDraftInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {normalizePayloadStrings} from
  "../shared/callablePayloadNormalization";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {checkInstanceRateLimit} from "../shared/instanceRateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";

type FormDefinition = OrganizerFormDraftDocument["definition"];
type WireDefinition = UpdateOrganizerFormDraftCallablePayload["definition"];
type FormSummary = ListOrganizerFormsCallableResponse["items"][number];
type ValidationIssue =
  ValidateOrganizerFormDraftCallableResponse["issues"][number];
type Question = FormDefinition["sections"][number]["questions"][number];
type QuestionValidation = Question["validation"];
type FormConsequenceProjection = NonNullable<
  OrganizerFormDocument["consequenceProjection"]
>;
type FormIdentityPolicy = NonNullable<
  FormConsequenceProjection["identityPolicy"]
>;

interface OrganizerFormsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
  publicFormId: () => string;
}

const defaultDeps: OrganizerFormsDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
  publicFormId: () => randomBytes(24).toString("base64url"),
};

interface FormTemplateQuestion {
  key: string;
  label: string;
  helpText: string | null;
  kind: Question["kind"];
  required: boolean;
  canonicalFieldId: Question["canonicalFieldId"];
  privacyClass: Question["privacyClass"];
  options?: Array<{label: string; value: string}>;
}

interface FormTemplate {
  id: string;
  version: number;
  title: string;
  description: string | null;
  purpose: FormDefinition["purpose"];
  identityPolicy: FormDefinition["identityPolicy"];
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    questions: FormTemplateQuestion[];
  }>;
}

const formTemplates = (organizerFormTemplateCatalog as unknown as {
  templates: FormTemplate[];
}).templates;

interface FormsCursor {
  version: 2;
  organizerId: string;
  filterHash: string;
  updatedAtMillis: number;
  formId: string;
}

/** Template content and materializer revision are reviewed together. */
export function organizerFormTemplateReview(templateId: string): {
  templateId: string; templateVersion: number; templateHash: string;
  materializerVersion: 1; title: string;
} {
  const template = formTemplates.find((item) => item.id === templateId);
  if (!template) {
    throw new HttpsError("invalid-argument", "Form template not found.");
  }
  return {templateId, templateVersion: template.version,
    templateHash: createHash("sha256").update(JSON.stringify({template,
      definition: materializeTemplate({template, formId: "review-template",
        title: template.title, defaultTargetKind: "organizer",
        defaultTargetId: null})})).digest("hex"),
    materializerVersion: 1, title: template.title};
}

/** Shared atomic draft owner; callers complete all other reads before this. */
export async function createOrganizerFormInTransaction(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  actorUid: string; organizerId: string; formId: string; templateId: string;
  title: string | null; defaultTargetKind: FormDefinition["defaultTargetKind"];
  defaultTargetId: string | null; publicFormId: string;
  timestamp: () => FirebaseFirestore.Timestamp;
}): Promise<{form: OrganizerFormDocument; draft: OrganizerFormDraftDocument}> {
  const {db, tx, actorUid, organizerId, formId, title, defaultTargetKind,
    defaultTargetId, publicFormId, timestamp} = params;
  assertTarget(defaultTargetKind, defaultTargetId);
  const template = formTemplates.find((item) => item.id === params.templateId);
  if (!template) {
    throw new HttpsError("invalid-argument", "Form template not found.");
  }
  const formRef = db.collection("organizerForms").doc(formId);
  const draftRef = db.collection("organizerFormDrafts").doc(formId);
  await authorizeFormMutation({db, tx, actorUid,
    organizerId});
  const [formSnap, draftSnap] = await Promise.all([
    tx.get(formRef),
    tx.get(draftRef),
  ]);
  if (formSnap.exists) {
    return requireOwnedFormAndDraft({
      formSnap,
      draftSnap,
      organizerId,
    });
  }
  if (draftSnap.exists) {
    throw new HttpsError(
      "internal",
      "A form draft exists without its metadata record."
    );
  }
  await requireOrganizerFormEventTarget({db, tx,
    organizerId,
    kind: defaultTargetKind,
    targetId: defaultTargetId,
    nowMillis: timestamp().toMillis()});
  const now = timestamp();
  const definition = materializeTemplate({
    template,
    formId,
    title: title ?? template.title,
    defaultTargetKind,
    defaultTargetId,
  });
  const form: OrganizerFormDocument = {
    organizerId,
    createdByUid: actorUid,
    title: definition.title,
    description: definition.description,
    purpose: definition.purpose,
    status: "draft",
    templateId: template.id,
    publicFormId,
    defaultTargetKind: definition.defaultTargetKind,
    defaultTargetId: definition.defaultTargetId,
    activeVersionId: null,
    draftRevision: 1,
    publishedVersion: 0,
    submittedResponseCount: 0,
    consequenceProjection: exactConsequenceProjection(
      definition.identityPolicy
    ),
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    lastResponseAt: null,
  };
  const draft: OrganizerFormDraftDocument = {
    organizerId,
    formId,
    revision: 1,
    definition,
    updatedByUid: actorUid,
    createdAt: now,
    updatedAt: now,
  };
  tx.create(formRef, form);
  tx.create(draftRef, draft);
  return {form, draft};
}

/** Creates an idempotent generic form draft from a source-owned template. */
export async function createOrganizerFormHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<CreateOrganizerFormCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<CreateOrganizerFormCallablePayload>(
    request,
    validateCreateOrganizerFormCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: [
        "organizerId",
        "templateId",
        "requestId",
        "defaultTargetKind",
      ],
      nullableStringFields: ["title", "defaultTargetId"],
    })
  );
  assertTarget(data.defaultTargetKind, data.defaultTargetId);
  const template = formTemplates.find((item) => item.id === data.templateId);
  if (!template) {
    throw new HttpsError("invalid-argument", "Form template not found.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createOrganizerForm", {
    maxRequests: 20, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});

  const formId = deterministicFormId(
    "create",
    data.organizerId,
    actorUid,
    data.requestId
  );
  const publicFormId = deps.publicFormId();
  const result = await db.runTransaction((tx) =>
    createOrganizerFormInTransaction({db, tx, actorUid,
      organizerId: data.organizerId, formId, templateId: template.id,
      title: data.title ?? null, defaultTargetKind: data.defaultTargetKind,
      defaultTargetId: data.defaultTargetId, publicFormId,
      timestamp: deps.timestamp}));
  return projectEditor(formId, result.form, result.draft);
}

/** Replaces a draft under an optimistic revision guard. */
export async function updateOrganizerFormDraftHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<UpdateOrganizerFormDraftCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    UpdateOrganizerFormDraftCallablePayload
  >(
    request,
    validateUpdateOrganizerFormDraftCallablePayload,
    normalizeFormMutationPayload
  );
  const definition = definitionFromWire(data.definition);
  assertTarget(definition.defaultTargetKind, definition.defaultTargetId);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "updateOrganizerFormDraft", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const formRef = db.collection("organizerForms").doc(data.formId);
  const draftRef = db.collection("organizerFormDrafts").doc(data.formId);
  const result = await db.runTransaction(async (tx) => {
    await authorizeFormMutation({db, tx, actorUid,
      organizerId: data.organizerId});
    const [formSnap, draftSnap] = await Promise.all([
      tx.get(formRef),
      tx.get(draftRef),
    ]);
    const current = requireOwnedFormAndDraft({
      formSnap,
      draftSnap,
      organizerId: data.organizerId,
    });
    if (current.form.status === "archived") {
      throw new HttpsError(
        "failed-precondition",
        "Archived forms cannot be edited. Duplicate this form instead."
      );
    }
    if (current.draft.revision !== data.expectedRevision) {
      throw revisionConflict();
    }
    if (current.form.publishedVersion > 0 &&
        current.form.purpose !== definition.purpose) {
      throw new HttpsError(
        "failed-precondition",
        "A form purpose cannot change after its first publication."
      );
    }
    await requireOrganizerFormEventTarget({db, tx,
      organizerId: data.organizerId,
      kind: definition.defaultTargetKind,
      targetId: definition.defaultTargetId,
      nowMillis: deps.timestamp().toMillis()});
    const now = deps.timestamp();
    const revision = current.draft.revision + 1;
    const form: OrganizerFormDocument = {
      ...current.form,
      title: definition.title,
      description: definition.description,
      purpose: definition.purpose,
      defaultTargetKind: definition.defaultTargetKind,
      defaultTargetId: definition.defaultTargetId,
      consequenceProjection: synchronizeConsequenceIdentity(
        current.form.consequenceProjection,
        definition.identityPolicy
      ),
      draftRevision: revision,
      updatedAt: now,
    };
    const draft: OrganizerFormDraftDocument = {
      ...current.draft,
      revision,
      definition,
      updatedByUid: actorUid,
      updatedAt: now,
    };
    tx.set(formRef, form);
    tx.set(draftRef, draft);
    return {form, draft};
  });
  return projectEditor(data.formId, result.form, result.draft);
}

/** Returns one manager-authorized form and its editable definition. */
export async function getOrganizerFormEditorHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<GetOrganizerFormEditorCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerFormEditorCallablePayload
  >(
    request,
    validateGetOrganizerFormEditorCallablePayload,
    normalizeFormIdentityPayload
  );
  const db = deps.firestore();
  checkInstanceRateLimit(actorUid, "getOrganizerFormEditor", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const [formSnap, draftSnap] = await Promise.all([
    db.collection("organizerForms").doc(data.formId).get(),
    db.collection("organizerFormDrafts").doc(data.formId).get(),
  ]);
  const result = requireOwnedFormAndDraft({
    formSnap,
    draftSnap,
    organizerId: data.organizerId,
  });
  return projectEditor(data.formId, result.form, result.draft);
}

/** Lists one organizer's forms with bounded scan and opaque pagination. */
export async function listOrganizerFormsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<ListOrganizerFormsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListOrganizerFormsCallablePayload>(
    request,
    validateListOrganizerFormsCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["organizerId"],
      nullableStringFields: ["query", "cursor"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerForms", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const filterHash = createHash("sha256").update(JSON.stringify({
    organizerId: data.organizerId,
    statuses: [...data.statuses].sort(),
    purposes: [...data.purposes].sort(),
    query: data.query?.trim().toLowerCase() ?? "",
    order: "updatedAt:desc,id:desc",
  })).digest("hex");
  const cursor = decodeFormsCursor(data.cursor, data.organizerId, filterHash);
  const scanLimit = Math.min(Math.max(data.limit * 4, data.limit + 1), 400);
  let query: FirebaseFirestore.Query = db.collection("organizerForms")
    .where("organizerId", "==", data.organizerId)
    .orderBy("updatedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc")
    .limit(scanLimit);
  if (cursor) {
    query = query.startAfter(
      admin.firestore.Timestamp.fromMillis(cursor.updatedAtMillis),
      cursor.formId
    );
  }
  const snapshot = await query.get();
  const statuses = new Set(data.statuses);
  const purposes = new Set(data.purposes);
  const normalizedQuery = data.query?.trim().toLowerCase() ?? "";
  const items: FormSummary[] = [];
  let stopIndex = snapshot.docs.length;
  for (let index = 0; index < snapshot.docs.length; index += 1) {
    const doc = snapshot.docs[index];
    const form = requireDoc<OrganizerFormDocument>(
      doc,
      "OrganizerFormDocument"
    );
    if (form.organizerId !== data.organizerId) continue;
    if (statuses.size > 0 ? !statuses.has(form.status) :
      form.status === "archived") {
      continue;
    }
    if (purposes.size > 0 && !purposes.has(form.purpose)) continue;
    if (normalizedQuery && !`${form.title} ${form.description ?? ""}`
      .toLowerCase().includes(normalizedQuery)) {
      continue;
    }
    items.push(projectSummary(doc.id, form));
    if (items.length === data.limit) {
      stopIndex = index + 1;
      break;
    }
  }
  const hasMore = stopIndex < snapshot.docs.length ||
    snapshot.docs.length === scanLimit;
  const cursorDoc = hasMore && stopIndex > 0 ?
    snapshot.docs[stopIndex - 1] : null;
  return {
    organizerId: data.organizerId,
    items,
    nextCursor: cursorDoc ? encodeFormsCursor(cursorDoc,
      data.organizerId, filterHash) : null,
  };
}

/** Runs the same semantic validation used by publication without writing. */
export async function validateOrganizerFormDraftHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<ValidateOrganizerFormDraftCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ValidateOrganizerFormDraftCallablePayload
  >(
    request,
    validateValidateOrganizerFormDraftCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["organizerId"],
      nullableStringFields: ["formId"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "validateOrganizerFormDraft", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  if (data.formId) {
    const formSnap = await db.collection("organizerForms")
      .doc(data.formId).get();
    requireOwnedForm(formSnap, data.organizerId);
  }
  const definition = definitionFromWire(data.definition);
  const issues = validateOrganizerFormDefinition(definition);
  return {valid: !issues.some((issue) => issue.severity === "error"), issues};
}

/** Publishes one immutable version or replays the current version safely. */
export async function publishOrganizerFormHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<PublishOrganizerFormCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<PublishOrganizerFormCallablePayload>(
    request,
    validatePublishOrganizerFormCallablePayload,
    normalizeFormMutationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "publishOrganizerForm", {
    maxRequests: 20, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const formRef = db.collection("organizerForms").doc(data.formId);
  const draftRef = db.collection("organizerFormDrafts").doc(data.formId);
  const form = await db.runTransaction(async (tx) => {
    await authorizeFormMutation({db, tx, actorUid,
      organizerId: data.organizerId});
    const [formSnap, draftSnap] = await Promise.all([
      tx.get(formRef),
      tx.get(draftRef),
    ]);
    const current = requireOwnedFormAndDraft({
      formSnap,
      draftSnap,
      organizerId: data.organizerId,
    });
    if (current.form.status === "archived") {
      throw new HttpsError(
        "failed-precondition",
        "Archived forms cannot be published. Duplicate this form instead."
      );
    }
    if (current.draft.revision !== data.expectedRevision) {
      throw revisionConflict();
    }
    const issues = validateOrganizerFormDefinition(current.draft.definition);
    const error = issues.find((issue) => issue.severity === "error");
    if (error) {
      throw new HttpsError(
        "failed-precondition",
        `${error.message} (${error.path})`
      );
    }
    await requireOrganizerFormEventTarget({db, tx,
      organizerId: data.organizerId,
      kind: current.draft.definition.defaultTargetKind,
      targetId: current.draft.definition.defaultTargetId,
      nowMillis: deps.timestamp().toMillis()});
    const payment = current.draft.definition.payment;
    if (payment) {
      const connectionSnap = payment.connectionId ? await tx.get(
        db.collection("organizerPaymentConnections").doc(payment.connectionId)
      ) : null;
      const connection = connectionSnap?.exists ?
        requireDoc<OrganizerPaymentConnectionDocument>(connectionSnap,
          "OrganizerPaymentConnectionDocument") : null;
      const {selection} = await readPaymentRoute({db, tx,
        organizerId: data.organizerId, purpose: "formFee",
        legacySelection: connection ? {route: "razorpayOAuth",
          mode: connection.mode, currency: "INR", merchantCountry: "IN"} :
          undefined});
      if (selection.currency !== "INR" || selection.merchantCountry !== "IN") {
        throw new HttpsError("failed-precondition",
          "Unsupported fee currency.");
      }
      if (selection.route === "razorpayRoute") {
        await readReadyRouteAccount({db, tx, organizerId: data.organizerId});
      } else if (selection.route === "razorpayOAuth") {
        const ready = requireReadyFormPaymentConnection(connection,
          data.organizerId, deps.timestamp().toMillis());
        if (ready.mode !== selection.mode) {
          throw new HttpsError("failed-precondition", "Payment mode mismatch.");
        }
      } else {
        throw new HttpsError("failed-precondition",
          "Payment route unavailable.");
      }
    }
    if (current.form.activeVersionId) {
      const activeSnap = await tx.get(
        db.collection("organizerFormVersions")
          .doc(current.form.activeVersionId)
      );
      if (activeSnap.exists) {
        const active = requireDoc<OrganizerFormVersionDocument>(
          activeSnap,
          "OrganizerFormVersionDocument"
        );
        if (active.sourceDraftRevision === data.expectedRevision &&
            sameDefinition(active.definition, current.draft.definition)) {
          if (current.form.status === "published") return current.form;
          const resumed: OrganizerFormDocument = {
            ...current.form,
            status: "published",
            pausedAt: null,
            archivedAt: null,
            updatedAt: deps.timestamp(),
          };
          tx.set(formRef, resumed);
          return resumed;
        }
      }
    }
    const now = deps.timestamp();
    const version = current.form.publishedVersion + 1;
    const versionId = `${data.formId}_v${version}`;
    const versionDoc: OrganizerFormVersionDocument = {
      organizerId: data.organizerId,
      formId: data.formId,
      version,
      sourceDraftRevision: current.draft.revision,
      definition: current.draft.definition,
      createdByUid: actorUid,
      createdAt: now,
      publishedAt: now,
    };
    const published: OrganizerFormDocument = {
      ...current.form,
      title: current.draft.definition.title,
      description: current.draft.definition.description,
      purpose: current.draft.definition.purpose,
      status: "published",
      defaultTargetKind: current.draft.definition.defaultTargetKind,
      defaultTargetId: current.draft.definition.defaultTargetId,
      consequenceProjection: synchronizeConsequenceIdentity(
        current.form.consequenceProjection,
        current.draft.definition.identityPolicy
      ),
      activeVersionId: versionId,
      publishedVersion: version,
      updatedAt: now,
      publishedAt: now,
      pausedAt: null,
      archivedAt: null,
    };
    tx.create(
      db.collection("organizerFormVersions").doc(versionId),
      versionDoc
    );
    tx.set(formRef, published);
    return published;
  });
  return projectSummary(data.formId, form);
}

/** Applies an expected-state lifecycle transition. */
export async function setOrganizerFormLifecycleHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<SetOrganizerFormLifecycleCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    SetOrganizerFormLifecycleCallablePayload
  >(
    request,
    validateSetOrganizerFormLifecycleCallablePayload,
    normalizeFormMutationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "setOrganizerFormLifecycle", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const formRef = db.collection("organizerForms").doc(data.formId);
  const form = await db.runTransaction(async (tx) => {
    await authorizeFormMutation({db, tx, actorUid,
      organizerId: data.organizerId});
    const snap = await tx.get(formRef);
    const current = requireOwnedForm(snap, data.organizerId);
    if (current.status !== data.expectedStatus) {
      throw new HttpsError(
        "aborted",
        "This form changed since it was opened. Reload and try again."
      );
    }
    const now = deps.timestamp();
    let next: OrganizerFormDocument;
    if (data.action === "pause") {
      if (current.status !== "published" || !current.activeVersionId) {
        throw invalidTransition("Only a published form can be paused.");
      }
      next = {...current, status: "paused", pausedAt: now, updatedAt: now};
    } else if (data.action === "resume") {
      if (current.status !== "paused" || !current.activeVersionId) {
        throw invalidTransition("Only a paused form can be resumed.");
      }
      const versionSnap = await tx.get(db.collection("organizerFormVersions")
        .doc(current.activeVersionId));
      if (!versionSnap.exists) {
        throw invalidTransition("The published form version is missing.");
      }
      const version = requireDoc<OrganizerFormVersionDocument>(versionSnap,
        "OrganizerFormVersionDocument");
      if (version.organizerId !== data.organizerId ||
          version.formId !== data.formId) {
        throw invalidTransition("The published form version needs review.");
      }
      await requireOrganizerFormEventTarget({db, tx,
        organizerId: data.organizerId,
        kind: version.definition.defaultTargetKind,
        targetId: version.definition.defaultTargetId,
        nowMillis: now.toMillis()});
      next = {...current, status: "published", pausedAt: null, updatedAt: now};
    } else {
      if (current.status === "archived") return current;
      next = {
        ...current,
        status: "archived",
        archivedAt: now,
        pausedAt: null,
        updatedAt: now,
      };
    }
    tx.set(formRef, next);
    return next;
  });
  return projectSummary(data.formId, form);
}

/** Duplicates a form into a new draft with remapped nested identities. */
export async function duplicateOrganizerFormHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<DuplicateOrganizerFormCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<DuplicateOrganizerFormCallablePayload>(
    request,
    validateDuplicateOrganizerFormCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["organizerId", "sourceFormId", "requestId"],
      nullableStringFields: ["title"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "duplicateOrganizerForm", {
    maxRequests: 20, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const formId = deterministicFormId(
    "duplicate",
    data.organizerId,
    actorUid,
    data.requestId
  );
  const sourceFormRef = db.collection("organizerForms")
    .doc(data.sourceFormId);
  const sourceDraftRef = db.collection("organizerFormDrafts")
    .doc(data.sourceFormId);
  const formRef = db.collection("organizerForms").doc(formId);
  const draftRef = db.collection("organizerFormDrafts").doc(formId);
  const publicFormId = deps.publicFormId();
  const result = await db.runTransaction(async (tx) => {
    await authorizeFormMutation({db, tx, actorUid,
      organizerId: data.organizerId});
    const [sourceFormSnap, sourceDraftSnap, formSnap, draftSnap] =
      await Promise.all([
        tx.get(sourceFormRef),
        tx.get(sourceDraftRef),
        tx.get(formRef),
        tx.get(draftRef),
      ]);
    if (formSnap.exists) {
      return requireOwnedFormAndDraft({
        formSnap,
        draftSnap,
        organizerId: data.organizerId,
      });
    }
    const source = requireOwnedFormAndDraft({
      formSnap: sourceFormSnap,
      draftSnap: sourceDraftSnap,
      organizerId: data.organizerId,
    });
    const title = data.title ?? `${source.form.title} copy`;
    const definition = remapDefinition(source.draft.definition, formId, title);
    await requireOrganizerFormEventTarget({db, tx,
      organizerId: data.organizerId,
      kind: definition.defaultTargetKind,
      targetId: definition.defaultTargetId,
      nowMillis: deps.timestamp().toMillis()});
    const now = deps.timestamp();
    const form: OrganizerFormDocument = {
      organizerId: data.organizerId,
      createdByUid: actorUid,
      title,
      description: definition.description,
      purpose: definition.purpose,
      status: "draft",
      templateId: source.form.templateId,
      publicFormId,
      defaultTargetKind: definition.defaultTargetKind,
      defaultTargetId: definition.defaultTargetId,
      activeVersionId: null,
      draftRevision: 1,
      publishedVersion: 0,
      submittedResponseCount: 0,
      consequenceProjection: exactConsequenceProjection(
        definition.identityPolicy
      ),
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      pausedAt: null,
      archivedAt: null,
      lastResponseAt: null,
    };
    const draft: OrganizerFormDraftDocument = {
      organizerId: data.organizerId,
      formId,
      revision: 1,
      definition,
      updatedByUid: actorUid,
      createdAt: now,
      updatedAt: now,
    };
    tx.create(formRef, form);
    tx.create(draftRef, draft);
    return {form, draft};
  });
  return projectEditor(formId, result.form, result.draft);
}

/** Hard-deletes only a never-published draft and its metadata atomically. */
export async function deleteOrganizerFormDraftHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<DeleteOrganizerFormDraftCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    DeleteOrganizerFormDraftCallablePayload
  >(
    request,
    validateDeleteOrganizerFormDraftCallablePayload,
    normalizeFormMutationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "deleteOrganizerFormDraft", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const formRef = db.collection("organizerForms").doc(data.formId);
  const draftRef = db.collection("organizerFormDrafts").doc(data.formId);
  await db.runTransaction(async (tx) => {
    const [formSnap, draftSnap] = await Promise.all([
      tx.get(formRef),
      tx.get(draftRef),
    ]);
    const current = requireOwnedFormAndDraft({
      formSnap,
      draftSnap,
      organizerId: data.organizerId,
    });
    if (current.draft.revision !== data.expectedRevision) {
      throw revisionConflict();
    }
    if (current.form.status !== "draft" ||
        current.form.publishedVersion !== 0 ||
        current.form.activeVersionId !== null) {
      throw new HttpsError(
        "failed-precondition",
        "Only a never-published draft can be permanently deleted."
      );
    }
    tx.delete(draftRef);
    tx.delete(formRef);
  });
  return {organizerId: data.organizerId, formId: data.formId, deleted: true};
}

/** Returns the source-controlled gallery without exposing draft storage. */
export async function listOrganizerFormTemplatesHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormsDeps = defaultDeps
): Promise<ListOrganizerFormTemplatesCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListOrganizerFormTemplatesCallablePayload
  >(
    request,
    validateListOrganizerFormTemplatesCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["organizerId"],
    })
  );
  const db = deps.firestore();
  checkInstanceRateLimit(actorUid, "listOrganizerFormTemplates", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  return {
    templates: formTemplates.map((template) => ({
      templateId: template.id,
      version: template.version,
      title: template.title,
      description: template.description,
      purpose: template.purpose,
      identityPolicy: template.identityPolicy,
      sectionCount: template.sections.length,
      questionCount: template.sections.reduce(
        (sum, section) => sum + section.questions.length,
        0
      ),
    })),
  };
}

/** Semantic form validation shared by preview, save feedback, and publish. */
export function validateOrganizerFormDefinition(
  definition: FormDefinition
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (
    code: string,
    path: string,
    message: string,
    severity: ValidationIssue["severity"] = "error"
  ) => issues.push({code, path, message, severity});
  validateFormCapabilities(definition, add);
  if (!definition.title.trim()) {
    add("emptyTitle", "title", "Give this form a title.");
  }
  try {
    assertTarget(definition.defaultTargetKind, definition.defaultTargetId);
  } catch (error) {
    add(
      "invalidTarget",
      "defaultTargetId",
      error instanceof Error ? error.message : "Choose a valid target."
    );
  }
  if (definition.availability.opensAt && definition.availability.closesAt &&
      definition.availability.opensAt.toMillis() >=
      definition.availability.closesAt.toMillis()) {
    add(
      "invalidAvailability",
      "availability.closesAt",
      "The closing time must be after the opening time."
    );
  }
  const sectionIds = new Set<string>();
  const questionIds = new Set<string>();
  const questionsById = new Map<string, Question>();
  const questionKeys = new Set<string>();
  const canonicalIds = new Set<string>();
  const sectionOrder = new Map<string, number>();
  const questionSectionOrder = new Map<string, number>();
  let questionCount = 0;
  definition.sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections.${sectionIndex}`;
    if (sectionIds.has(section.sectionId)) {
      add("duplicateSectionId", `${sectionPath}.sectionId`,
        "Every section needs a unique identity.");
    }
    sectionIds.add(section.sectionId);
    sectionOrder.set(section.sectionId, sectionIndex);
    if (!section.title.trim()) {
      add("emptySectionTitle", `${sectionPath}.title`,
        "Give this section a title.");
    }
    section.questions.forEach((question, questionIndex) => {
      questionCount += 1;
      questionSectionOrder.set(question.questionId, sectionIndex);
      const path = `${sectionPath}.questions.${questionIndex}`;
      if (questionIds.has(question.questionId)) {
        add("duplicateQuestionId", `${path}.questionId`,
          "Every question needs a unique identity.");
      }
      questionIds.add(question.questionId);
      questionsById.set(question.questionId, question);
      const normalizedKey = question.key.toLowerCase();
      if (questionKeys.has(normalizedKey)) {
        add("duplicateQuestionKey", `${path}.key`,
          "Every question key must be unique.");
      }
      questionKeys.add(normalizedKey);
      if (!question.label.trim()) {
        add("emptyQuestionLabel", `${path}.label`,
          "Give this question a label.");
      }
      if (question.canonicalFieldId) {
        if (canonicalIds.has(question.canonicalFieldId)) {
          add("duplicateCanonicalField", `${path}.canonicalFieldId`,
            "A person field can be mapped only once per form.");
        }
        canonicalIds.add(question.canonicalFieldId);
        assertCanonicalKind(question, path, add);
      }
      validateQuestion(question, path, add);
    });
  });
  if (questionCount === 0) {
    add(
      "noQuestions",
      "sections",
      "Add at least one question before publishing."
    );
  }
  if (questionCount > 200) {
    add(
      "tooManyQuestions",
      "sections",
      "Forms can contain at most 200 questions. Split this into multiple forms."
    );
  }
  const ruleIds = new Set<string>();
  const navigationSources = new Map<number, string>();
  definition.logicRules.forEach((rule, ruleIndex) => {
    const path = `logicRules.${ruleIndex}`;
    if (ruleIds.has(rule.ruleId)) {
      add("duplicateLogicRuleId", `${path}.ruleId`,
        "Every logic rule needs a unique identity.");
    }
    ruleIds.add(rule.ruleId);
    for (const condition of rule.conditions) {
      const sourceQuestion = questionsById.get(condition.questionId);
      if (!sourceQuestion) {
        add("unknownConditionQuestion", `${path}.conditions`,
          "A logic condition references a question that no longer exists.");
      }
      const needsValue = condition.operator !== "answered" &&
        condition.operator !== "notAnswered";
      if (needsValue && condition.expectedValues.length === 0) {
        add("missingConditionValue", `${path}.conditions`,
          "This logic condition needs a comparison value.");
      }
      if (!needsValue && condition.expectedValues.length > 0) {
        add("unexpectedConditionValue", `${path}.conditions`,
          "Answered conditions cannot include comparison values.");
      }
      if (sourceQuestion && needsValue) {
        validateConditionValues({condition, question: sourceQuestion, path,
          add});
      }
    }
    validateLogicTarget({
      rule,
      path,
      questionIds,
      sectionIds,
      questionSectionOrder,
      sectionOrder,
      add,
    });
    if (rule.action === "routeToSection" || rule.action === "finish") {
      const sourceOrder = Math.max(...rule.conditions.map((condition) =>
        questionSectionOrder.get(condition.questionId) ?? -1));
      const existingRuleId = navigationSources.get(sourceOrder);
      if (existingRuleId) {
        add("ambiguousNavigation", `${path}.action`,
          `Only one navigation rule can leave a section. ${existingRuleId} ` +
          "already controls this section.");
      } else {
        navigationSources.set(sourceOrder, rule.ruleId);
      }
    }
  });
  validateCompletion(definition, add);
  if (definition.purpose === "waiver") {
    const questions = definition.sections.flatMap((section) =>
      section.questions);
    if (!questions.some((question) =>
      question.kind === "acknowledgement" && question.required)) {
      add("waiverAcknowledgement", "sections",
        "A waiver needs a required acknowledgement.");
    }
    if (!questions.some((question) =>
      question.kind === "signature" && question.required)) {
      add("waiverSignature", "sections",
        "A waiver needs a required signature.");
    }
  }
  if (definition.identityPolicy === "anonymous" &&
      definition.sections.some((section) => section.questions.some(
        (question) => question.kind === "signature"
      ))) {
    add("anonymousSignature", "identityPolicy",
      "Signature forms need a verified email, phone number, or Catch account.");
  }
  return issues;
}

function validateConditionValues(params: {
  condition: FormDefinition["logicRules"][number]["conditions"][number];
  question: Question;
  path: string;
  add: (
    code: string,
    path: string,
    message: string,
    severity?: ValidationIssue["severity"]
  ) => void;
}): void {
  const {condition, question, path, add} = params;
  if ((condition.operator === "greaterThan" ||
       condition.operator === "lessThan") && question.kind !== "number") {
    add("invalidNumericCondition", `${path}.conditions`,
      "Greater-than and less-than logic require a number question.");
  }
  if ((condition.operator === "greaterThan" ||
       condition.operator === "lessThan") &&
      condition.expectedValues.some((value) => typeof value !== "number")) {
    add("invalidNumericConditionValue", `${path}.conditions`,
      "Numeric logic needs a numeric comparison value.");
  }
  if ((question.kind === "singleChoice" ||
       question.kind === "multiChoice") &&
      condition.expectedValues.some((value) =>
        !question.options.some((option) => option.value === value))) {
    add("unknownConditionOption", `${path}.conditions`,
      "Choice logic must use an option that still exists.");
  }
  if (question.kind === "boolean" &&
      condition.expectedValues.some((value) => typeof value !== "boolean")) {
    add("invalidBooleanConditionValue", `${path}.conditions`,
      "Boolean logic needs a true or false comparison value.");
  }
}

function validateQuestion(
  question: Question,
  path: string,
  add: (
    code: string,
    path: string,
    message: string,
    severity?: ValidationIssue["severity"]
  ) => void
): void {
  const choice = question.kind === "singleChoice" ||
    question.kind === "multiChoice";
  if (choice && question.options.length < 2) {
    add("missingOptions", `${path}.options`,
      "Choice questions need at least two options.");
  }
  if (!choice && question.options.length > 0) {
    add("unexpectedOptions", `${path}.options`,
      "Only choice questions can have options.");
  }
  const optionIds = new Set<string>();
  const optionValues = new Set<string>();
  for (const option of question.options) {
    if (optionIds.has(option.optionId) ||
        optionValues.has(option.value.toLowerCase())) {
      add("duplicateOption", `${path}.options`,
        "Choice option identities and values must be unique.");
    }
    optionIds.add(option.optionId);
    optionValues.add(option.value.toLowerCase());
  }
  const validation = question.validation;
  if (validation.minLength !== null && validation.maxLength !== null &&
      validation.minLength > validation.maxLength) {
    add("invalidLengthRange", `${path}.validation`,
      "Minimum length cannot exceed maximum length.");
  }
  if (validation.minNumber !== null && validation.maxNumber !== null &&
      validation.minNumber > validation.maxNumber) {
    add("invalidNumberRange", `${path}.validation`,
      "Minimum number cannot exceed maximum number.");
  }
  if (validation.earliestDate !== null && validation.latestDate !== null &&
      validation.earliestDate > validation.latestDate) {
    add("invalidDateRange", `${path}.validation`,
      "Earliest date cannot be after latest date.");
  }
  if (validation.minSelections !== null &&
      validation.maxSelections !== null &&
      validation.minSelections > validation.maxSelections) {
    add("invalidSelectionRange", `${path}.validation`,
      "Minimum selections cannot exceed maximum selections.");
  }
  if (!choice && (validation.minSelections !== null ||
      validation.maxSelections !== null)) {
    add("unexpectedSelectionValidation", `${path}.validation`,
      "Selection limits apply only to choice questions.");
  }
  if (question.kind !== "file" &&
      (validation.maxFileCount !== null ||
       validation.maxFileSizeBytes !== null ||
       validation.allowedMimeTypes.length > 0)) {
    add("unexpectedFileValidation", `${path}.validation`,
      "File limits apply only to file questions.");
  }
}

function assertCanonicalKind(
  question: Question,
  path: string,
  add: (
    code: string,
    path: string,
    message: string,
    severity?: ValidationIssue["severity"]
  ) => void
): void {
  const expectedByField: Partial<Record<
    NonNullable<Question["canonicalFieldId"]>,
    Question["kind"][]
  >> = {
    email: ["email"],
    phoneNumber: ["phone"],
    dateOfBirth: ["date"],
    age: ["number"],
    heightCm: ["number"],
    linkedinUrl: ["url"],
    profilePhoto: ["file"],
  };
  const allowed = expectedByField[question.canonicalFieldId!];
  if (allowed && !allowed.includes(question.kind)) {
    add("canonicalKindMismatch", `${path}.kind`,
      "This question type does not match its mapped person field.");
  }
}

function validateLogicTarget(params: {
  rule: FormDefinition["logicRules"][number];
  path: string;
  questionIds: Set<string>;
  sectionIds: Set<string>;
  questionSectionOrder: Map<string, number>;
  sectionOrder: Map<string, number>;
  add: (
    code: string,
    path: string,
    message: string,
    severity?: ValidationIssue["severity"]
  ) => void;
}): void {
  const questionAction = params.rule.action === "showQuestion" ||
    params.rule.action === "hideQuestion";
  const sectionAction = params.rule.action === "showSection" ||
    params.rule.action === "hideSection" ||
    params.rule.action === "routeToSection";
  if (questionAction &&
      (!params.rule.targetQuestionId ||
       !params.questionIds.has(params.rule.targetQuestionId))) {
    params.add("invalidQuestionTarget", `${params.path}.targetQuestionId`,
      "Choose a question that still exists.");
  }
  if (questionAction && params.rule.targetQuestionId &&
      params.rule.conditions.some((condition) =>
        condition.questionId === params.rule.targetQuestionId)) {
    params.add("selfReferentialVisibility", `${params.path}.targetQuestionId`,
      "A visibility rule cannot depend on the question it controls.");
  }
  if (sectionAction &&
      (!params.rule.targetSectionId ||
       !params.sectionIds.has(params.rule.targetSectionId))) {
    params.add("invalidSectionTarget", `${params.path}.targetSectionId`,
      "Choose a section that still exists.");
  }
  if (!questionAction && params.rule.targetQuestionId !== null) {
    params.add("unexpectedQuestionTarget", `${params.path}.targetQuestionId`,
      "This logic action cannot target a question.");
  }
  if (!sectionAction && params.rule.targetSectionId !== null) {
    params.add("unexpectedSectionTarget", `${params.path}.targetSectionId`,
      "This logic action cannot target a section.");
  }
  if ((params.rule.action === "showSection" ||
       params.rule.action === "hideSection") &&
      params.rule.targetSectionId) {
    const targetOrder = params.sectionOrder.get(params.rule.targetSectionId);
    if (targetOrder !== undefined && params.rule.conditions.some(
      (condition) =>
        params.questionSectionOrder.get(condition.questionId) === targetOrder
    )) {
      params.add("selfReferentialVisibility", `${params.path}.targetSectionId`,
        "A section visibility rule must depend on an earlier section.");
    }
  }
  if (params.rule.action === "routeToSection" &&
      params.rule.targetSectionId) {
    const targetOrder = params.sectionOrder.get(params.rule.targetSectionId);
    const sourceSectionOrder = Math.max(...params.rule.conditions.map(
      (condition) => params.questionSectionOrder.get(condition.questionId) ??
        Number.MAX_SAFE_INTEGER
    ));
    if (targetOrder !== undefined && targetOrder <= sourceSectionOrder) {
      params.add("backwardRoute", `${params.path}.targetSectionId`,
        "Section routes must move forward to prevent navigation cycles.");
    }
  }
}

function validateCompletion(
  definition: FormDefinition,
  add: (
    code: string,
    path: string,
    message: string,
    severity?: ValidationIssue["severity"]
  ) => void
): void {
  const completion = definition.completion;
  if (completion.actionKind === "none" &&
      (completion.actionLabel !== null || completion.actionUrl !== null)) {
    add("unexpectedCompletionAction", "completion",
      "Remove the action label and destination when no action is selected.");
  }
  if (completion.actionKind !== "none" && !completion.actionLabel?.trim()) {
    add("missingCompletionLabel", "completion.actionLabel",
      "Give the completion action a label.");
  }
  if (completion.actionKind === "externalUrl" && !completion.actionUrl) {
    add("missingCompletionUrl", "completion.actionUrl",
      "Add a destination URL for the completion action.");
  }
  if (completion.actionKind !== "externalUrl" &&
      completion.actionUrl !== null) {
    add("unexpectedCompletionUrl", "completion.actionUrl",
      "Only an external link action can include a URL.");
  }
}

function materializeTemplate(params: {
  template: FormTemplate;
  formId: string;
  title: string;
  defaultTargetKind: FormDefinition["defaultTargetKind"];
  defaultTargetId: string | null;
}): FormDefinition {
  return {
    title: params.title,
    description: params.template.description,
    purpose: params.template.purpose,
    defaultTargetKind: params.defaultTargetKind,
    defaultTargetId: params.defaultTargetId,
    identityPolicy: params.template.identityPolicy,
    sections: params.template.sections.map((section, sectionIndex) => ({
      sectionId: scopedNestedId("section", params.formId, section.id),
      title: section.title,
      description: section.description,
      pageBreak: sectionIndex > 0,
      questions: section.questions.map((question) => ({
        questionId: scopedNestedId("question", params.formId, question.key),
        key: question.key,
        label: question.label,
        helpText: question.helpText,
        kind: question.kind,
        required: question.required,
        options: (question.options ?? []).map((option, optionIndex) => ({
          optionId: scopedNestedId(
            "option",
            params.formId,
            `${question.key}_${optionIndex}`
          ),
          label: option.label,
          value: option.value,
        })),
        canonicalFieldId: question.canonicalFieldId,
        privacyClass: question.privacyClass,
        prefillPolicy: question.canonicalFieldId ?
          "participantReviewRequired" : "never",
        hostPresentation: "detailOnly",
        validation: defaultQuestionValidation(question),
      })),
    })),
    logicRules: [],
    appearance: {
      preset: params.template.id === "blank" ? "minimal" : "activity",
      logoAssetId: null,
      coverAssetId: null,
      activityKind: templateActivityKind(params.template.id),
    },
    availability: {
      opensAt: null,
      closesAt: null,
      responseLimit: null,
      closedMessage: null,
    },
    consent: {
      consentCopy:
        "I consent to this organizer receiving and using my answers for " +
        "the purpose described on this form.",
      consentVersion: `${params.template.id}-v${params.template.version}`,
      retentionCopy:
        "The organizer keeps these answers only for its stated operational " +
        "purpose and applicable legal obligations.",
    },
    completion: {
      title: "Thanks — your response was received",
      message: "The organizer will follow up if another step is needed.",
      actionKind: "none",
      actionLabel: null,
      actionUrl: null,
    },
  };
}

function defaultQuestionValidation(
  question: FormTemplateQuestion
): QuestionValidation {
  const numberRange = question.key === "rating" ?
    {minNumber: 1, maxNumber: 5} :
    question.key === "teamSize" ?
      {minNumber: 1, maxNumber: 100} :
      {minNumber: null, maxNumber: null};
  return {
    minLength: null,
    maxLength: question.kind === "longText" ? 4000 :
      question.kind === "shortText" ? 500 : null,
    ...numberRange,
    earliestDate: null,
    latestDate: null,
    minSelections: null,
    maxSelections: null,
    maxFileCount: question.kind === "file" ? 5 : null,
    maxFileSizeBytes: question.kind === "file" ? 10 * 1024 * 1024 : null,
    allowedMimeTypes: [],
    patternPreset: null,
    customError: null,
  };
}

function templateActivityKind(templateId: string): string | null {
  if (templateId === "run-walk-participation") return "runWalk";
  if (templateId === "racket-session") return "racketSport";
  if (templateId === "quiz-team-night") return "quizTeam";
  if (templateId === "dinner-guest-intake") return "dinner";
  return null;
}

function remapDefinition(
  source: FormDefinition,
  formId: string,
  title: string
): FormDefinition {
  const sectionIds = new Map(source.sections.map((section) => [
    section.sectionId,
    scopedNestedId("section", formId, section.sectionId),
  ]));
  const questionIds = new Map(source.sections.flatMap((section) =>
    section.questions.map((question) => [
      question.questionId,
      scopedNestedId("question", formId, question.questionId),
    ] as const)));
  return {
    ...source,
    title,
    sections: source.sections.map((section) => ({
      ...section,
      sectionId: sectionIds.get(section.sectionId)!,
      questions: section.questions.map((question) => ({
        ...question,
        questionId: questionIds.get(question.questionId)!,
        options: question.options.map((option) => ({
          ...option,
          optionId: scopedNestedId("option", formId, option.optionId),
        })),
      })),
    })),
    logicRules: source.logicRules.map((rule) => ({
      ...rule,
      ruleId: scopedNestedId("rule", formId, rule.ruleId),
      conditions: rule.conditions.map((condition) => ({
        ...condition,
        questionId: questionIds.get(condition.questionId) ??
          condition.questionId,
      })),
      targetQuestionId: rule.targetQuestionId ?
        questionIds.get(rule.targetQuestionId) ?? null : null,
      targetSectionId: rule.targetSectionId ?
        sectionIds.get(rule.targetSectionId) ?? null : null,
    })),
  };
}

function projectEditor(
  formId: string,
  form: OrganizerFormDocument,
  draft: OrganizerFormDraftDocument
): GetOrganizerFormEditorCallableResponse {
  return {
    form: projectSummary(formId, form),
    definition: definitionToWire(draft.definition),
    validationIssues: validateOrganizerFormDefinition(draft.definition),
  };
}

export function projectSummary(
  formId: string,
  form: OrganizerFormDocument
): FormSummary {
  return {
    organizerId: form.organizerId,
    formId,
    title: form.title,
    description: form.description,
    purpose: form.purpose,
    status: form.status,
    templateId: form.templateId,
    publicFormId: form.publicFormId,
    defaultTargetKind: form.defaultTargetKind,
    defaultTargetId: form.defaultTargetId,
    activeVersionId: form.activeVersionId,
    draftRevision: form.draftRevision,
    publishedVersion: form.publishedVersion,
    submittedResponseCount: form.submittedResponseCount,
    consequences: consequenceSummary(form.consequenceProjection),
    updatedAtMillis: form.updatedAt.toMillis(),
    publishedAtMillis: form.publishedAt?.toMillis() ?? null,
    lastResponseAtMillis: form.lastResponseAt?.toMillis() ?? null,
  };
}

function emptyAutomationActionKindCounts():
FormConsequenceProjection["enabledAutomationActionKindCounts"] {
  return {
    notifyTeam: 0,
    addOrganizerTag: 0,
    createCrmContact: 0,
    addApplicationQueue: 0,
    proposeEventAttendee: 0,
    signedWebhook: 0,
    campaignHandoff: 0,
  };
}

function exactConsequenceProjection(
  identityPolicy: FormIdentityPolicy
): FormConsequenceProjection {
  return {
    version: 1,
    coverage: "exact",
    identityPolicy,
    enabledAutomationActionKinds: [],
    enabledAutomationActionKindCounts: emptyAutomationActionKindCounts(),
  };
}

function synchronizeConsequenceIdentity(
  current: OrganizerFormDocument["consequenceProjection"],
  identityPolicy: FormIdentityPolicy
): FormConsequenceProjection {
  if (!current) {
    return {
      ...exactConsequenceProjection(identityPolicy),
      coverage: "identityOnly",
    };
  }
  return {...current, identityPolicy};
}

function consequenceSummary(
  projection: OrganizerFormDocument["consequenceProjection"]
): FormSummary["consequences"] {
  if (!projection) {
    return {
      coverage: "unavailable",
      identityPolicy: null,
      enabledAutomationActionKinds: [],
    };
  }
  return {
    coverage: projection.coverage,
    identityPolicy: projection.identityPolicy,
    enabledAutomationActionKinds: projection.enabledAutomationActionKinds,
  };
}

function definitionFromWire(definition: WireDefinition): FormDefinition {
  return {
    ...definition,
    availability: {
      ...definition.availability,
      opensAt: timestampFromWire(definition.availability.opensAt),
      closesAt: timestampFromWire(definition.availability.closesAt),
    },
  };
}

function definitionToWire(definition: FormDefinition): WireDefinition {
  return {
    ...definition,
    availability: {
      ...definition.availability,
      opensAt: timestampToWire(definition.availability.opensAt),
      closesAt: timestampToWire(definition.availability.closesAt),
    },
  };
}

function timestampFromWire(
  value: WireDefinition["availability"]["opensAt"]
): FirebaseFirestore.Timestamp | null {
  return value ? new admin.firestore.Timestamp(
    value._seconds,
    value._nanoseconds
  ) : null;
}

function timestampToWire(
  value: FirebaseFirestore.Timestamp | null
): WireDefinition["availability"]["opensAt"] {
  return value ? {
    _seconds: value.seconds,
    _nanoseconds: value.nanoseconds,
  } : null;
}

function requireOwnedFormAndDraft(params: {
  formSnap: FirebaseFirestore.DocumentSnapshot;
  draftSnap: FirebaseFirestore.DocumentSnapshot;
  organizerId: string;
}): {form: OrganizerFormDocument; draft: OrganizerFormDraftDocument} {
  const form = requireOwnedForm(params.formSnap, params.organizerId);
  if (!params.draftSnap.exists) {
    throw new HttpsError("not-found", "Form draft not found.");
  }
  const draft = requireDoc<OrganizerFormDraftDocument>(
    params.draftSnap,
    "OrganizerFormDraftDocument"
  );
  if (draft.organizerId !== params.organizerId ||
      draft.formId !== params.formSnap.id) {
    throw new HttpsError("not-found", "Form draft not found.");
  }
  return {form, draft};
}

function requireOwnedForm(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  organizerId: string
): OrganizerFormDocument {
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Form not found.");
  }
  const form = requireDoc<OrganizerFormDocument>(
    snapshot,
    "OrganizerFormDocument"
  );
  if (form.organizerId !== organizerId) {
    throw new HttpsError("not-found", "Form not found.");
  }
  return form;
}

function assertTarget(
  kind: FormDefinition["defaultTargetKind"],
  targetId: string | null
): void {
  if (kind === "organizer" && targetId !== null) {
    throw new HttpsError(
      "invalid-argument",
      "An organizer-wide form cannot include another target id."
    );
  }
  if (kind !== "organizer" && targetId === null) {
    throw new HttpsError(
      "invalid-argument",
      "Event and campaign forms need a target."
    );
  }
}

function deterministicFormId(
  action: string,
  organizerId: string,
  actorUid: string,
  requestId: string
): string {
  const digest = createHash("sha256")
    .update(`${action}\u0000${organizerId}\u0000${actorUid}\u0000${requestId}`)
    .digest("hex")
    .slice(0, 32);
  return `form_${digest}`;
}

function scopedNestedId(
  prefix: string,
  formId: string,
  source: string
): string {
  const digest = createHash("sha256")
    .update(`${prefix}\u0000${formId}\u0000${source}`)
    .digest("hex")
    .slice(0, 24);
  return `${prefix}_${digest}`;
}

function encodeFormsCursor(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  organizerId: string,
  filterHash: string
): string {
  const form = requireDoc<OrganizerFormDocument>(
    doc,
    "OrganizerFormDocument"
  );
  return Buffer.from(JSON.stringify({
    version: 2,
    organizerId,
    filterHash,
    updatedAtMillis: form.updatedAt.toMillis(),
    formId: doc.id,
  } satisfies FormsCursor)).toString("base64url");
}

function decodeFormsCursor(value: string | null, organizerId: string,
  filterHash: string): FormsCursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    );
    if (!decoded || typeof decoded !== "object" ||
        decoded.version !== 2 || decoded.organizerId !== organizerId ||
        decoded.filterHash !== filterHash ||
        !Number.isSafeInteger(decoded.updatedAtMillis) ||
        decoded.updatedAtMillis < 0 ||
        typeof decoded.formId !== "string" ||
        !decoded.formId) {
      throw new Error("invalid");
    }
    return decoded as FormsCursor;
  } catch {
    throw new HttpsError("invalid-argument",
      "The form list changed. Refresh to continue.");
  }
}

function sameDefinition(left: FormDefinition, right: FormDefinition): boolean {
  return JSON.stringify(definitionToWire(left)) ===
    JSON.stringify(definitionToWire(right));
}

function revisionConflict(): HttpsError {
  return new HttpsError(
    "aborted",
    "This form changed since it was opened. Reload and try again."
  );
}

function invalidTransition(message: string): HttpsError {
  return new HttpsError("failed-precondition", message);
}

function normalizeFormIdentityPayload(value: unknown): unknown {
  return normalizePayloadStrings(value, {
    stringFields: ["organizerId", "formId"],
  });
}

function normalizeFormMutationPayload(value: unknown): unknown {
  return normalizePayloadStrings(value, {
    stringFields: ["organizerId", "formId", "expectedStatus", "action"],
  });
}

const organizerFormCallableLimits = {
  timeoutSeconds: 60,
  maxInstances: 20,
};

export const createOrganizerForm = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => createOrganizerFormHandler(request)
);

export const updateOrganizerFormDraft = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => updateOrganizerFormDraftHandler(request)
);

export const getOrganizerFormEditor = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => getOrganizerFormEditorHandler(request)
);

export const listOrganizerForms = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => listOrganizerFormsHandler(request)
);

export const validateOrganizerFormDraft = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => validateOrganizerFormDraftHandler(request)
);

export const publishOrganizerForm = onCall(
  appCheckCallableOptionsWithLimits({
    ...organizerFormCallableLimits,
    memory: "512MiB",
  }),
  (request) => publishOrganizerFormHandler(request)
);

export const setOrganizerFormLifecycle = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => setOrganizerFormLifecycleHandler(request)
);

export const duplicateOrganizerForm = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => duplicateOrganizerFormHandler(request)
);

export const deleteOrganizerFormDraft = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => deleteOrganizerFormDraftHandler(request)
);

export const listOrganizerFormTemplates = onCall(
  appCheckCallableOptionsWithLimits(organizerFormCallableLimits),
  (request) => listOrganizerFormTemplatesHandler(request)
);
