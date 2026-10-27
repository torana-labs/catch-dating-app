import {createHash} from "crypto";
import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {
  appCheckCallableOptionsWithLimits,
  appCheckCallableOptionsWithSecrets,
} from "../shared/callableOptions";
import {normalizePayloadStrings} from
  "../shared/callablePayloadNormalization";
import {requireAuth} from "../shared/auth";
import type {ConvertOrganizerFormResponseCallablePayload} from
  "../shared/generated/convertOrganizerFormResponseCallablePayload";
import type {ConvertOrganizerFormResponseCallableResponse} from
  "../shared/generated/convertOrganizerFormResponseCallableResponse";
import type {
  OrganizerApplicationDocument,
  OrganizerApplicationResponseDocument,
  OrganizerContactDocument,
  OrganizerContactOriginDocument,
  OrganizerFormConversionReceiptDocument,
  OrganizerFormDocument,
  OrganizerFormResponseDocument,
  OrganizerFormVersionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {PreviewOrganizerFormConversionCallablePayload} from
  "../shared/generated/previewOrganizerFormConversionCallablePayload";
import type {PreviewOrganizerFormConversionCallableResponse} from
  "../shared/generated/previewOrganizerFormConversionCallableResponse";
import {
  validateConvertOrganizerFormResponseCallablePayload,
} from
  "../shared/generated/validators/convertOrganizerFormResponseInput";
import {
  validatePreviewOrganizerFormConversionCallablePayload,
} from
  "../shared/generated/validators/previewOrganizerFormConversionInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {organizerContactIdentityKey} from "./organizerAudienceSecrets";
import {createOrganizerContactInTransaction} from "./organizerContacts";
import {resolveOrganizerAudienceCoverage} from "./organizerAudienceCoverage";
import {organizerContactOriginId} from "../shared/organizerContactOrigins";
import {authorizeFormMutation} from "./organizerFormTarget";
import {
  eventAttendeeId,
  importEventAttendeesForHost,
  normalizeRosterPhone,
} from "../events/eventAttendees";

import {formConversionReceiptId} from "./organizerFormAdmissionIdentity";

type ConversionFields =
  PreviewOrganizerFormConversionCallableResponse["fields"];
type ConversionField = ConversionFields[number];
type FormSections = OrganizerFormVersionDocument["definition"]["sections"];
type FormSection = FormSections[number];
type FormQuestionKind = FormSection["questions"][number]["kind"];
type ApplicationAnswers = OrganizerApplicationResponseDocument["answers"];
type ApplicationAnswerValue = ApplicationAnswers[number]["value"];

export const organizerFormFollowUpUnavailableMessage =
  "Follow-up handoff needs an approved messaging template and recipient " +
  "permission. Open the customer in Sends to review and approve the message.";

interface FormConversionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
  identitySecret: () => string;
  requireManagerAuthority?: boolean;
  // An internal handoff must not turn historical replay into new authority.
  requireSubmittedSource?: boolean;
}

const defaultDeps: FormConversionDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
  identitySecret: () => organizerContactIdentityKey.value(),
};

interface ConversionContext {
  response: OrganizerFormResponseDocument;
  version: OrganizerFormVersionDocument;
  form: OrganizerFormDocument;
  fields: ConversionField[];
  warnings: string[];
  allowed: boolean;
  existingResultId: string | null;
}

/** Produces an exact, read-only downstream conversion review. */
export async function previewOrganizerFormConversionHandler(
  request: CallableRequest<unknown>,
  deps: FormConversionDeps = defaultDeps
): Promise<PreviewOrganizerFormConversionCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    PreviewOrganizerFormConversionCallablePayload
  >(
    request,
    validatePreviewOrganizerFormConversionCallablePayload,
    normalizeConversionPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "previewOrganizerFormConversion", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const context = await conversionContext(db, data);
  return {
    organizerId: data.organizerId,
    formId: context.response.formId,
    responseId: data.responseId,
    kind: data.kind,
    eventId: data.eventId,
    allowed: context.allowed,
    fields: context.fields,
    warnings: context.warnings,
    existingResultId: context.existingResultId,
  };
}

/** Applies one reviewed conversion under a deterministic receipt. */
export async function convertOrganizerFormResponseHandler(
  request: CallableRequest<unknown>,
  deps: FormConversionDeps = defaultDeps
): Promise<ConvertOrganizerFormResponseCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ConvertOrganizerFormResponseCallablePayload
  >(
    request,
    validateConvertOrganizerFormResponseCallablePayload,
    normalizeConversionPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "convertOrganizerFormResponse", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  if (deps.requireManagerAuthority !== false) {
    await requireOrganizerManager({
      db,
      organizerId: data.organizerId,
      actorUid,
    });
  }
  if (data.kind === "crmContact" || data.kind === "application") {
    return convertResponseInTransaction({db, data, actorUid, deps});
  }
  const context = await conversionContext(db, data);
  if (!context.allowed) {
    throw new HttpsError(
      "failed-precondition",
      context.warnings[0] ?? "This response cannot be converted."
    );
  }
  const receiptId = formConversionReceiptId(
    data.responseId, data.kind, data.eventId);
  const receiptRef = db.collection("organizerFormConversionReceipts")
    .doc(receiptId);
  let receipt = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(receiptRef);
    if (snapshot.exists) {
      const existing = requireDoc<OrganizerFormConversionReceiptDocument>(
        snapshot,
        "OrganizerFormConversionReceiptDocument"
      );
      if (existing.organizerId !== data.organizerId ||
          existing.responseId !== data.responseId ||
          existing.kind !== data.kind) {
        throw new HttpsError("already-exists", "Conversion receipt conflict.");
      }
      if (existing.status === "failed") {
        const retried: OrganizerFormConversionReceiptDocument = {
          ...existing,
          requestId: data.requestId,
          actorUid,
          status: "pending",
          fields: context.fields,
          updatedAt: deps.timestamp(),
          completedAt: null,
        };
        tx.set(receiptRef, retried);
        return retried;
      }
      return existing;
    }
    const now = deps.timestamp();
    const created: OrganizerFormConversionReceiptDocument = {
      organizerId: data.organizerId,
      formId: context.response.formId,
      responseId: data.responseId,
      kind: data.kind,
      requestId: data.requestId,
      actorUid,
      status: "pending",
      fields: context.fields,
      resultId: null,
      undoStatus: "notAvailable",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    tx.create(receiptRef, created);
    return created;
  });
  if (receipt.status === "pending") {
    try {
      const resultId = context.existingResultId ??
        await applyEventAttendeeConversion({
          db,
          data,
          actorUid,
          context,
          identitySecret: deps.identitySecret(),
          now: deps.timestamp(),
        });
      const now = deps.timestamp();
      await receiptRef.update({
        status: "completed",
        resultId,
        undoStatus: "notAvailable",
        updatedAt: now,
        completedAt: now,
      });
      receipt = {
        ...receipt,
        status: "completed",
        resultId,
        undoStatus: "notAvailable",
        updatedAt: now,
        completedAt: now,
      };
    } catch (error) {
      await receiptRef.update({
        status: "failed",
        updatedAt: deps.timestamp(),
      });
      throw error;
    }
  }
  return conversionProjection(receiptId, receipt);
}

async function conversionContext(
  db: FirebaseFirestore.Firestore,
  data: Pick<PreviewOrganizerFormConversionCallablePayload,
    "organizerId" | "responseId" | "kind" | "eventId" | "overrides">,
  tx?: FirebaseFirestore.Transaction,
  reviewedFields?: ConversionFields
): Promise<ConversionContext> {
  const read = (ref: FirebaseFirestore.DocumentReference) =>
    tx ? tx.get(ref) : ref.get();
  const responseSnap = await read(db.collection("organizerFormResponses")
    .doc(data.responseId));
  if (!responseSnap.exists) {
    throw new HttpsError("not-found", "Form response not found.");
  }
  const response = requireDoc<OrganizerFormResponseDocument>(
    responseSnap,
    "OrganizerFormResponseDocument"
  );
  if (response.organizerId !== data.organizerId) {
    throw new HttpsError("not-found", "Form response not found.");
  }
  const [formSnap, versionSnap, receiptSnap] = await Promise.all([
    read(db.collection("organizerForms").doc(response.formId)),
    read(db.collection("organizerFormVersions").doc(response.versionId)),
    read(db.collection("organizerFormConversionReceipts")
      .doc(formConversionReceiptId(
        data.responseId, data.kind, data.eventId))),
  ]);
  const form = requireDoc<OrganizerFormDocument>(
    formSnap,
    "OrganizerFormDocument"
  );
  const version = requireDoc<OrganizerFormVersionDocument>(
    versionSnap,
    "OrganizerFormVersionDocument"
  );
  const receipt = receiptSnap.exists ?
    requireDoc<OrganizerFormConversionReceiptDocument>(
      receiptSnap,
      "OrganizerFormConversionReceiptDocument"
    ) : null;
  if (form.organizerId !== data.organizerId ||
      version.organizerId !== data.organizerId ||
      version.formId !== response.formId) {
    throw new HttpsError("not-found", "Form response not found.");
  }
  const fields = reviewedFields ??
    conversionFields(response, version, data.overrides);
  if (data.kind === "eventAttendeeProposal" && data.eventId) {
    fields.push({destinationField: "eventId", label: "Event",
      value: data.eventId, origin: "hostOverride", conflict: null});
  }
  const warnings: string[] = [];
  let allowed = response.status === "submitted" && !response.withdrawnAt;
  if (!allowed) warnings.push("Withdrawn responses cannot be converted.");
  if (data.kind === "followUp") {
    warnings.push(organizerFormFollowUpUnavailableMessage);
    allowed = false;
  }
  if ((data.kind === "crmContact" || data.kind === "followUp") &&
      !response.identity.email && !response.identity.phoneE164) {
    warnings.push("A verified or submitted email or phone number is required.");
    allowed = false;
  }
  if (data.kind === "crmContact" && !response.identity.displayName &&
      !fieldValue(fields, "displayName")) {
    warnings.push("Add a display name before creating a CRM contact.");
    allowed = false;
  }
  if (data.kind === "application" &&
      version.definition.purpose !== "application") {
    warnings.push("Only application forms can enter the application queue.");
    allowed = false;
  }
  if (data.kind === "eventAttendeeProposal") {
    const crm = await conversionContext(db, {...data,
      kind: "crmContact", eventId: null}, tx);
    if (!crm.allowed) {
      allowed = false;
      warnings.push(...crm.warnings);
    }
    if (!data.eventId) {
      warnings.push("Choose an event for this attendee proposal.");
      allowed = false;
    } else {
      const eventSnap = await read(db.collection("events").doc(data.eventId));
      if (!eventSnap.exists ||
          eventSnap.data()?.organizerId !== data.organizerId) {
        warnings.push("The selected event is not managed by this organizer.");
        allowed = false;
      } else {
        const currentAttendeeId = eventAttendeeId(data.eventId,
          `external:${data.responseId.toLowerCase()}`);
        const receiptEventId = receipt?.fields.find((field) =>
          field.destinationField === "eventId")?.value;
        const completedAttendeeId = receipt?.status === "completed" &&
          receipt.organizerId === data.organizerId &&
          receipt.formId === response.formId &&
          receipt.responseId === data.responseId &&
          receipt.kind === "eventAttendeeProposal" &&
          receiptEventId === data.eventId ? receipt.resultId : null;
        // Completed receipts are immutable provenance for legacy phone/email
        // destinations. New and pending conversions use the response key.
        const destinationId = completedAttendeeId ?? currentAttendeeId;
        const edge = await read(db.collection("organizerContactEventEdges")
          .doc(destinationId));
        const target = crmContactConversionTarget({
          existingResultId: crm.existingResultId, responseId: data.responseId,
          formId: response.formId, submittedAt: response.submittedAt,
        });
        if (edge.exists && edge.data()?.contactId !== target.contactId) {
          warnings.push("This roster entry belongs to another CRM contact. " +
            "Review and merge the duplicate contacts before admission.");
          allowed = false;
        }
      }
    }
  }
  let existingResultId = receipt?.resultId ?? null;
  if (!existingResultId && data.kind === "crmContact" && !tx) {
    existingResultId = await findExistingContact(db, response, fields, tx);
    if (existingResultId) {
      warnings.push("An existing CRM contact matches this response.");
    }
  }
  return {
    response,
    version,
    form,
    fields,
    warnings,
    allowed,
    existingResultId,
  };
}

/** Source authority, destination and completion share a single commit. */
async function convertResponseInTransaction(params: {
  db: FirebaseFirestore.Firestore;
  data: ConvertOrganizerFormResponseCallablePayload;
  actorUid: string;
  deps: FormConversionDeps;
}): Promise<ConvertOrganizerFormResponseCallableResponse> {
  const {db, data, actorUid, deps} = params;
  const receiptId = formConversionReceiptId(
    data.responseId, data.kind, data.eventId);
  const receiptRef = db.collection("organizerFormConversionReceipts")
    .doc(receiptId);
  const initialSourceCoverage = data.kind === "crmContact" ?
    await resolveOrganizerAudienceCoverage({
      db, organizerId: data.organizerId, storedCoverage: null,
    }) : "partial";
  return db.runTransaction(async (tx) => {
    // The internal application-purpose projector has no manager actor.
    // Its submitted-source authority still participates in this transaction.
    if (deps.requireManagerAuthority !== false) {
      await authorizeFormMutation({db, tx, actorUid,
        organizerId: data.organizerId});
    }
    const receiptSnap = await tx.get(receiptRef);
    const existing = receiptSnap.exists ?
      requireDoc<OrganizerFormConversionReceiptDocument>(receiptSnap,
        "OrganizerFormConversionReceiptDocument") : null;
    if (existing && (existing.organizerId !== data.organizerId ||
        existing.responseId !== data.responseId ||
        existing.kind !== data.kind)) {
      throw new HttpsError("already-exists", "Conversion receipt conflict.");
    }
    // A completed conversion may be replayed after source withdrawal, but
    // never by an actor whose current manager/account authority was lost.
    if (existing?.status === "completed") {
      if (deps.requireSubmittedSource) {
        assertConversionAllowed(await conversionContext(
          db, data, tx, existing.fields));
      }
      return conversionProjection(receiptId, existing);
    }
    const context = await conversionContext(db, data, tx, existing?.fields);
    if (deps.requireSubmittedSource) assertConversionAllowed(context);
    const now = deps.timestamp();
    let resultId: string;
    if (data.kind === "application") {
      resultId = await applyApplicationConversion({db, data, actorUid,
        context, now, tx});
    } else {
      const originRef = db.collection("organizerContactOrigins")
        .doc(organizerContactOriginId({organizerId: data.organizerId,
          sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
          sourceEntityId: data.responseId}));
      const originSnap = await tx.get(originRef);
      if (originSnap.exists) {
        // Recover an older destination-success / receipt-failure attempt.
        // Provenance, not an endpoint match, proves this response completed.
        const origin = requireDoc<OrganizerContactOriginDocument>(originSnap,
          "OrganizerContactOriginDocument");
        if (origin.organizerId !== data.organizerId ||
            origin.formId !== context.response.formId ||
            origin.responseId !== data.responseId ||
            origin.sourceEntityId !== data.responseId ||
            origin.sourceKind !== "hostForm" ||
            origin.sourceEntityKind !== "hostFormResponse") {
          throw new HttpsError("already-exists", "Conversion origin conflict.");
        }
        const contact = await tx.get(db.collection("organizerContacts")
          .doc(origin.currentContactId));
        if (!contact.exists ||
            contact.data()?.organizerId !== data.organizerId) {
          throw new HttpsError("failed-precondition",
            "Converted contact is unavailable.");
        }
        resultId = origin.currentContactId;
      } else {
        assertConversionAllowed(context);
        const target = crmContactConversionTarget({
          existingResultId: await findExistingContact(
            db, context.response, context.fields, tx),
          responseId: data.responseId, formId: context.response.formId,
          submittedAt: context.response.submittedAt,
        });
        const displayName = fieldValue(context.fields, "displayName") ??
          context.response.identity.displayName ?? "Form respondent";
        const result = await createOrganizerContactInTransaction({
          db, transaction: tx, initialSourceCoverage,
          organizerId: data.organizerId, actorUid,
          displayName: String(displayName).slice(0, 120),
          phoneE164: stringField(context.fields, "phoneNumber") ??
            context.response.identity.phoneE164,
          email: stringField(context.fields, "email") ??
            context.response.identity.email,
          initialNote: `Created from form response ${data.responseId}.`,
          identitySecret: deps.identitySecret(),
          contactId: target.contactId, origin: target.origin, now,
        });
        resultId = result.contactId;
      }
    }
    const receipt: OrganizerFormConversionReceiptDocument = {
      organizerId: data.organizerId, formId: context.response.formId,
      responseId: data.responseId, kind: data.kind,
      requestId: existing?.requestId ?? data.requestId,
      actorUid: existing?.actorUid ?? actorUid, fields: context.fields,
      status: "completed", resultId, undoStatus: "notAvailable",
      createdAt: existing?.createdAt ?? now, updatedAt: now, completedAt: now,
    };
    tx.set(receiptRef, receipt);
    return conversionProjection(receiptId, receipt);
  });
}

function assertConversionAllowed(context: ConversionContext): void {
  if (!context.allowed) {
    throw new HttpsError("failed-precondition",
      context.warnings[0] ?? "This response cannot be converted.");
  }
}

/**
 * Resolves both new and matched form respondents through the same provenance
 * writer. A matched contact is not a reason to discard the form origin.
 */
export function crmContactConversionTarget(params: {
  existingResultId: string | null;
  responseId: string;
  formId: string;
  submittedAt: FirebaseFirestore.Timestamp;
}): {
  contactId: string;
  origin: {
    kind: "hostFormResponse";
    formId: string;
    responseId: string;
    observedAt: FirebaseFirestore.Timestamp;
  };
} {
  return {
    contactId: params.existingResultId ?? deterministicResultId(
      "formcontact",
      params.responseId
    ),
    origin: {
      kind: "hostFormResponse",
      formId: params.formId,
      responseId: params.responseId,
      observedAt: params.submittedAt,
    },
  };
}

async function applyEventAttendeeConversion(params: {
  db: FirebaseFirestore.Firestore;
  data: ConvertOrganizerFormResponseCallablePayload;
  actorUid: string;
  identitySecret: string;
  context: ConversionContext;
  now: FirebaseFirestore.Timestamp;
}): Promise<string> {
  // Resolve/create the reviewed person before the attendee trigger can run.
  await convertOrganizerFormResponseHandler({
    auth: {uid: params.actorUid, token: {}},
    data: {...params.data, kind: "crmContact", eventId: null},
  } as CallableRequest<unknown>, {
    firestore: () => params.db,
    checkRateLimit: async () => undefined,
    timestamp: () => params.now,
    identitySecret: () => params.identitySecret,
    requireSubmittedSource: true,
  });
  const eventId = params.data.eventId!;
  const displayName = String(
    fieldValue(params.context.fields, "displayName") ??
    params.context.response.identity.displayName ?? "Form respondent"
  ).slice(0, 120);
  const phone = stringField(params.context.fields, "phoneNumber") ??
    params.context.response.identity.phoneE164;
  const normalizedPhone = normalizeRosterPhone(phone).value;
  const email = (stringField(params.context.fields, "email") ??
    params.context.response.identity.email)?.toLocaleLowerCase("en") ?? null;
  // Form admission is one reviewed response/ticket. Keep its returned ID on
  // the same attendee-level reference that the canonical import writes.
  const stableKey = `external:${params.data.responseId.toLowerCase()}`;
  const result = await importEventAttendeesForHost({
    hostUid: params.actorUid,
    authorizeSource: async (tx, replayed) => {
      await authorizeFormMutation({db: params.db, tx,
        actorUid: params.actorUid, organizerId: params.data.organizerId});
      if (replayed) return;
      const current = await conversionContext(params.db, params.data, tx);
      assertConversionAllowed(current);
      if (!isDeepStrictEqual(current.response, params.context.response) ||
          !isDeepStrictEqual(current.version, params.context.version)) {
        throw new HttpsError("aborted",
          "The form response changed. Review it before admission.");
      }
    },
    payload: {
      eventId,
      importKey: `form_${params.data.responseId}`.slice(0, 120),
      fileName: "Catch form response",
      format: "manual",
      rows: [{
        rowId: params.data.responseId.slice(0, 120),
        displayName,
        phone: normalizedPhone,
        email,
        externalReference: params.data.responseId,
        arrivalGroup: null,
        ticketType: null,
        status: "registered",
      }],
    },
  }, {
    firestore: () => params.db,
    checkRateLimit: async () => undefined,
    timestamp: () => params.now,
  });
  if (result.createdCount + result.updatedCount !== 1) {
    throw new HttpsError(
      "failed-precondition",
      result.errors[0]?.message ?? "The attendee could not be added."
    );
  }
  return eventAttendeeId(eventId, stableKey);
}

async function applyApplicationConversion(params: {
  db: FirebaseFirestore.Firestore;
  data: ConvertOrganizerFormResponseCallablePayload;
  actorUid: string;
  context: ConversionContext;
  now: FirebaseFirestore.Timestamp;
  tx: FirebaseFirestore.Transaction;
}): Promise<string> {
  const applicationId = deterministicResultId(
    "formapplication",
    params.data.responseId
  );
  const applicationRef = params.db.collection("organizerApplications")
    .doc(applicationId);
  const compatibilityResponseRef = params.db
    .collection("organizerApplicationResponses")
    .doc(params.data.responseId);
  const displayName = String(
    fieldValue(params.context.fields, "displayName") ??
    params.context.response.identity.displayName ?? "Form respondent"
  ).slice(0, 160);
  const {tx} = params;
  const [existing, response] = await Promise.all([
    tx.get(applicationRef), tx.get(compatibilityResponseRef),
  ]);
  if (existing.exists) {
    const application = existing.data() as OrganizerApplicationDocument;
    const snapshot = response.data() as
      OrganizerApplicationResponseDocument | undefined;
    if (application.organizerId !== params.data.organizerId ||
        application.formId !== params.context.response.formId ||
        application.formVersionId !== params.context.response.versionId ||
        application.latestResponseId !== params.data.responseId ||
        application.source.kind !== "native" ||
        application.source.externalResponseId !== params.data.responseId ||
        snapshot?.organizerId !== params.data.organizerId ||
        snapshot.applicationId !== applicationId ||
        snapshot.formId !== application.formId ||
        snapshot.formVersionId !== application.formVersionId) {
      throw new HttpsError("already-exists", "Conversion result conflict.");
    }
    return applicationId;
  }
  assertConversionAllowed(params.context);
  const source = {
    kind: "native" as const,
    providerId: null,
    externalFormId: null,
    externalResponseId: params.data.responseId,
    importReceiptId: null,
  };
  const application: OrganizerApplicationDocument = {
    organizerId: params.data.organizerId,
    formId: params.context.response.formId,
    formVersionId: params.context.response.versionId,
    targetKind: params.context.version.definition.defaultTargetKind,
    targetId: params.context.version.definition.defaultTargetId,
    linkedUid: params.context.response.respondentUid,
    contactId: null,
    applicantDisplayName: displayName,
    applicantDisplayNameNormalized: displayName.toLowerCase(),
    reviewStatus: "submitted",
    latestResponseId: params.data.responseId,
    source,
    assignedReviewerUid: null,
    reviewNote: null,
    revision: Math.max(1, params.now.toMillis()),
    submittedAt: params.context.response.submittedAt,
    updatedAt: params.now,
    reviewedAt: null,
  };
  const questions = new Map(params.context.version.definition.sections
    .flatMap((section) => section.questions)
    .map((question) => [question.questionId, question]));
  const compatibility: OrganizerApplicationResponseDocument = {
    organizerId: params.data.organizerId,
    applicationId,
    formId: params.context.response.formId,
    formVersionId: params.context.response.versionId,
    linkedUid: params.context.response.respondentUid,
    answers: params.context.response.answerSnapshots.flatMap((answer) => {
      const question = questions.get(answer.questionId);
      return question ? [{
        questionId: answer.questionId,
        questionKey: answer.key,
        questionLabel: answer.label,
        questionKind: compatibilityQuestionKind(question.kind),
        canonicalFieldId: question.canonicalFieldId,
        privacyClass: question.privacyClass,
        hostPresentation: question.hostPresentation,
        value: compatibilityAnswer(question.kind, answer.answer),
      }] : [];
    }).slice(0, 100),
    source,
    consentVersion: params.context.response.consentVersion,
    grantId: null,
    submittedAt: params.context.response.submittedAt,
  };
  tx.create(applicationRef, application);
  tx.create(compatibilityResponseRef, compatibility);
  return applicationId;
}

function conversionFields(
  response: OrganizerFormResponseDocument,
  version: OrganizerFormVersionDocument,
  overrides: Record<string, string | number | boolean | null>
): ConversionField[] {
  const fields = new Map<string, ConversionField>();
  const add = (
    destinationField: string,
    label: string,
    value: string | number | boolean | null,
    origin: ConversionField["origin"]
  ) => fields.set(destinationField, {
    destinationField,
    label,
    value,
    origin,
    conflict: null,
  });
  if (response.identity.displayName) {
    add("displayName", "Display name", response.identity.displayName,
      response.identity.origin === "respondentGranted" ?
        "verifiedIdentity" : "formAnswer");
  }
  if (response.identity.email) {
    add("email", "Email", response.identity.email,
      response.identity.origin === "respondentGranted" ?
        "verifiedIdentity" : "formAnswer");
  }
  if (response.identity.phoneE164) {
    add("phoneNumber", "Phone number", response.identity.phoneE164,
      response.identity.origin === "respondentGranted" ?
        "verifiedIdentity" : "formAnswer");
  }
  const answers = new Map(response.answerSnapshots.map((answer) =>
    [answer.questionId, answer.answer]));
  for (const question of version.definition.sections.flatMap((section) =>
    section.questions)) {
    if (!question.canonicalFieldId) continue;
    const answer = answers.get(question.questionId);
    if (answer === undefined || answer === null) continue;
    add(
      question.canonicalFieldId,
      question.label,
      Array.isArray(answer) ? answer.join(" | ") : answer,
      "formAnswer"
    );
  }
  for (const [destinationField, value] of Object.entries(overrides)) {
    add(destinationField, destinationField, value, "hostOverride");
  }
  return [...fields.values()].slice(0, 100);
}

async function findExistingContact(
  db: FirebaseFirestore.Firestore,
  response: OrganizerFormResponseDocument,
  fields: ConversionFields,
  tx?: FirebaseFirestore.Transaction
): Promise<string | null> {
  const clauses: ["phoneE164" | "email", string][] = [];
  const phone = normalizeRosterPhone(stringField(fields, "phoneNumber")).value;
  const email = stringField(fields, "email")?.trim().toLowerCase();
  if (phone) clauses.push(["phoneE164", phone]);
  if (email) clauses.push(["email", email]);
  const candidates = new Set<string>();
  for (const [field, value] of clauses) {
    const query = db.collection("organizerContacts")
      .where("organizerId", "==", response.organizerId)
      .where(field, "==", value)
      .limit(10);
    const snapshot = tx ? await tx.get(query) : await query.get();
    if (snapshot.size === 10) {
      throw new HttpsError("failed-precondition",
        "Review duplicate contacts before converting this response.");
    }
    for (const doc of snapshot.docs) {
      const contact = doc.data() as OrganizerContactDocument;
      if (contact.deletedAt !== null || contact.hiddenAt !== null ||
          contact.mergedIntoContactId !== null) continue;
      if (contact.linkedUid && response.respondentUid &&
          contact.linkedUid !== response.respondentUid) {
        throw new HttpsError("failed-precondition",
          "The matching customer belongs to another account.");
      }
      candidates.add(doc.id);
    }
  }
  if (candidates.size > 1) {
    throw new HttpsError("failed-precondition",
      "The response matches conflicting contacts. Review duplicates first.");
  }
  return [...candidates][0] ?? null;
}

function compatibilityQuestionKind(
  kind: FormQuestionKind
): OrganizerApplicationResponseDocument["answers"][number]["questionKind"] {
  if (kind === "acknowledgement") return "boolean";
  if (kind === "signature") return "file";
  return kind;
}

function compatibilityAnswer(
  kind: FormQuestionKind,
  answer: OrganizerFormResponseDocument["answers"][string]
): ApplicationAnswerValue {
  const empty = {
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    optionValues: [] as string[],
    assetIds: [] as string[],
  };
  if (answer === null || answer === "" ||
      Array.isArray(answer) && answer.length === 0) {
    return {valueKind: "empty", ...empty};
  }
  if (kind === "file" || kind === "signature") {
    return {valueKind: "assets", ...empty, assetIds: Array.isArray(answer) ?
      answer : [String(answer)]};
  }
  if (kind === "singleChoice" || kind === "multiChoice") {
    return {valueKind: "options", ...empty, optionValues:
      Array.isArray(answer) ? answer : [String(answer)]};
  }
  if (kind === "date") {
    return {valueKind: "date", ...empty, dateValue: String(answer)};
  }
  if (typeof answer === "number") {
    return {valueKind: "number", ...empty, numberValue: answer};
  }
  if (typeof answer === "boolean") {
    return {valueKind: "boolean", ...empty, booleanValue: answer};
  }
  return {valueKind: "text", ...empty, textValue: String(answer)};
}

function fieldValue(
  fields: ConversionField[],
  destinationField: string
): ConversionField["value"] | null {
  return fields.find((field) =>
    field.destinationField === destinationField)?.value ?? null;
}

function stringField(
  fields: ConversionField[],
  destinationField: string
): string | null {
  const value = fieldValue(fields, destinationField);
  return typeof value === "string" && value ? value : null;
}

function conversionProjection(
  receiptId: string,
  receipt: OrganizerFormConversionReceiptDocument
): ConvertOrganizerFormResponseCallableResponse {
  return {
    receiptId,
    organizerId: receipt.organizerId,
    formId: receipt.formId,
    responseId: receipt.responseId,
    kind: receipt.kind,
    status: receipt.status,
    fields: receipt.fields,
    resultId: receipt.resultId,
    undoStatus: receipt.undoStatus,
    completedAtMillis: receipt.completedAt?.toMillis() ?? null,
  };
}

function normalizeConversionPayload(value: unknown): unknown {
  return normalizePayloadStrings(value, {
    stringFields: ["organizerId", "responseId"],
    nullableStringFields: ["eventId"],
  });
}

function deterministicResultId(prefix: string, ...parts: string[]): string {
  const digest = createHash("sha256").update(parts.join("\u001f"))
    .digest("hex").slice(0, 32);
  return `${prefix}_${digest}`;
}

export const previewOrganizerFormConversion = onCall(
  appCheckCallableOptionsWithLimits({
    timeoutSeconds: 60,
    maxInstances: 20,
    concurrency: 20,
  }),
  (request) => previewOrganizerFormConversionHandler(request)
);

export const convertOrganizerFormResponse = onCall(
  appCheckCallableOptionsWithSecrets([organizerContactIdentityKey], {
    timeoutSeconds: 90,
    maxInstances: 20,
    concurrency: 10,
  }),
  (request) => convertOrganizerFormResponseHandler(request)
);
