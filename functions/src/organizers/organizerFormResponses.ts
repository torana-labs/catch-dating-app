import {redactResponseSummary} from "../hostReadModels/responseRedaction";
import {responseSummaryId} from "../hostReadModels/responseIds";
import {readParticipantFormResponseProof} from
  "../profiles/participantFormActivitySource";
import {organizerFormEventTargetAvailable, requireOrganizerFormEventTarget} from
  "./organizerFormTarget";
import {formMessagingOffer, formMessagingChoices,
  prepareFormCommunicationIntent, normalizeFormMessagingDecision,
  prepareFormMessagingGrants} from
  "./organizerFormMessagingConsent";
import {createHash, randomBytes} from "crypto";
import {organizerFormEmbedAssets} from "./organizerFormEmbed";
import {prepareFormProfileProposal, readParticipantFormProfileProposal} from
  "./organizerFormProfileProposals";
import {requireFreeFormSubmission} from "./organizerFormCapabilities";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {BeginOrganizerFormResponseCallablePayload} from
  "../shared/generated/beginOrganizerFormResponseCallablePayload";
import type {BeginOrganizerFormResponseCallableResponse} from
  "../shared/generated/beginOrganizerFormResponseCallableResponse";
import type {CreateOrganizerFormAssetIntentCallablePayload} from
  "../shared/generated/createOrganizerFormAssetIntentCallablePayload";
import type {CreateOrganizerFormAssetIntentCallableResponse} from
  "../shared/generated/createOrganizerFormAssetIntentCallableResponse";
import type {CreateOrganizerFormShareLinkCallablePayload} from
  "../shared/generated/createOrganizerFormShareLinkCallablePayload";
import type {CreateOrganizerFormShareLinkCallableResponse} from
  "../shared/generated/createOrganizerFormShareLinkCallableResponse";
import type {GetOrganizerFormShareAssetsCallablePayload} from
  "../shared/generated/getOrganizerFormShareAssetsCallablePayload";
import type {GetOrganizerFormShareAssetsCallableResponse} from
  "../shared/generated/getOrganizerFormShareAssetsCallableResponse";
import type {GetPublicOrganizerFormCallablePayload} from
  "../shared/generated/getPublicOrganizerFormCallablePayload";
import type {GetPublicOrganizerFormCallableResponse} from
  "../shared/generated/getPublicOrganizerFormCallableResponse";
import type {FinalizeOrganizerFormAssetCallablePayload} from
  "../shared/generated/finalizeOrganizerFormAssetCallablePayload";
import type {FinalizeOrganizerFormAssetCallableResponse} from
  "../shared/generated/finalizeOrganizerFormAssetCallableResponse";
import type {SaveOrganizerFormResponseDraftCallablePayload} from
  "../shared/generated/saveOrganizerFormResponseDraftCallablePayload";
import type {SaveOrganizerFormResponseDraftCallableResponse} from
  "../shared/generated/saveOrganizerFormResponseDraftCallableResponse";
import type {SubmitOrganizerFormResponseCallablePayload} from
  "../shared/generated/submitOrganizerFormResponseCallablePayload";
import type {SubmitOrganizerFormResponseCallableResponse} from
  "../shared/generated/submitOrganizerFormResponseCallableResponse";
import type {WithdrawOrganizerFormResponseCallablePayload} from
  "../shared/generated/withdrawOrganizerFormResponseCallablePayload";
import type {WithdrawOrganizerFormResponseCallableResponse} from
  "../shared/generated/withdrawOrganizerFormResponseCallableResponse";
import type {
  OrganizerDocument,
  OrganizerFormAssetDocument,
  OrganizerFormDocument,
  OrganizerFormResponseDocument,
  OrganizerFormResponseDraftDocument,
  OrganizerFormShareLinkDocument,
  OrganizerFormVersionDocument,
  ParticipantIntakeProfileDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  validateBeginOrganizerFormResponseCallablePayload,
} from
  "../shared/generated/validators/beginOrganizerFormResponseInput";
import {
  validateCreateOrganizerFormAssetIntentCallablePayload,
} from
  "../shared/generated/validators/createOrganizerFormAssetIntentInput";
import {
  validateCreateOrganizerFormShareLinkCallablePayload,
} from
  "../shared/generated/validators/createOrganizerFormShareLinkInput";
import {
  validateGetOrganizerFormShareAssetsCallablePayload,
} from
  "../shared/generated/validators/getOrganizerFormShareAssetsInput";
import {
  validateGetPublicOrganizerFormCallablePayload,
} from "../shared/generated/validators/getPublicOrganizerFormInput";
import {
  validateFinalizeOrganizerFormAssetCallablePayload,
} from
  "../shared/generated/validators/finalizeOrganizerFormAssetInput";
import {
  validateSaveOrganizerFormResponseDraftCallablePayload,
} from
  "../shared/generated/validators/saveOrganizerFormResponseDraftInput";
import {
  validateSubmitOrganizerFormResponseCallablePayload,
} from
  "../shared/generated/validators/submitOrganizerFormResponseInput";
import {
  validateWithdrawOrganizerFormResponseCallablePayload,
} from
  "../shared/generated/validators/withdrawOrganizerFormResponseInput";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {appCheckCallableOptionsForFormUpload} from
  "../shared/organizerFormUploadIdentity";
import {normalizePayloadStrings} from
  "../shared/callablePayloadNormalization";
import {requireAuth} from "../shared/auth";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {answersForSubmission, reachableFormSections}
  from "./organizerFormLogic";
import {incrementOrganizerFormFunnel} from "./organizerFormAggregates";
import {canonicalCityMarketId, publicFormCityOptions,
  publicFormPrefillSuggestions, reusablePublicFormFields,
  organizerFormAnswerSuggestions} from
  "./organizerFormPublicFields";

type FormDefinition = OrganizerFormVersionDocument["definition"];
type PublicFormProjection = GetPublicOrganizerFormCallableResponse;
type AnswerMap = OrganizerFormResponseDraftDocument["answers"];
type Question = FormDefinition["sections"][number]["questions"][number];

interface OrganizerFormResponseDeps {
  firestore: () => FirebaseFirestore.Firestore;
  storageBucket: () => ReturnType<ReturnType<typeof admin.storage>["bucket"]>;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: OrganizerFormResponseDeps = {
  firestore: () => admin.firestore(),
  storageBucket: () => admin.storage().bucket(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
};

const responseDraftLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const submittedAssetLifetimeMs = 365 * 24 * 60 * 60 * 1000;
const assetIntentLifetimeMs = 15 * 60 * 1000;
const defaultFileSizeBytes = 10 * 1024 * 1024;
const signatureFileSizeBytes = 2 * 1024 * 1024;
const supportedFileTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const publicFormsOrigin = "https://catchdates.com";

/** Resolves only the active immutable definition and bounded organizer copy. */
export async function getPublicOrganizerFormHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<GetPublicOrganizerFormCallableResponse> {
  const data = validateCallableWithAjv<GetPublicOrganizerFormCallablePayload>(
    request,
    validateGetPublicOrganizerFormCallablePayload,
    normalizePublicFormPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ?? `public-form:${data.publicFormId}`,
    "getPublicOrganizerForm",
    {maxRequests: 120, windowMs: 60 * 1000}
  );
  const resolved = await resolvePublicForm(db, data.publicFormId, deps);
  const sourceLinkId = await resolveSourceLink(
    db,
    resolved.formId,
    data.sourceToken
  );
  await Promise.all([
    incrementOrganizerFormFunnel({
      organizerId: resolved.form.organizerId,
      formId: resolved.formId,
      versionId: resolved.versionId,
      counter: "opens",
      deps: {firestore: deps.firestore, timestamp: deps.timestamp},
    }),
    sourceLinkId ? db.collection("organizerFormShareLinks")
      .doc(sourceLinkId).update({
        openCount: admin.firestore.FieldValue.increment(1),
      }) : Promise.resolve(),
  ]);
  return resolved.projection;
}

/** Starts an idempotent, version-bound response draft. */
export async function beginOrganizerFormResponseHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<BeginOrganizerFormResponseCallableResponse> {
  const data = validateCallableWithAjv<
    BeginOrganizerFormResponseCallablePayload
  >(
    request,
    validateBeginOrganizerFormResponseCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["publicFormId", "requestId"],
      nullableStringFields: ["sourceToken", "reuseResponseId"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ?? `public-form:${data.publicFormId}`,
    "beginOrganizerFormResponse",
    {maxRequests: 20, windowMs: 60 * 1000}
  );
  const resolved = await resolvePublicForm(db, data.publicFormId, deps);
  assertAcceptingResponses(resolved.projection);
  const identity = requireResponseIdentity(
    request,
    resolved.version.definition.identityPolicy
  );
  const sourceLinkId = await resolveSourceLink(
    db,
    resolved.formId,
    data.sourceToken
  );
  const draftId = deterministicId(
    "formdraft",
    resolved.formId,
    identity.uid ?? "anonymous",
    data.requestId
  );
  const draftToken = identity.uid === null ? bearerToken(
    "form-draft-token",
    resolved.formId,
    data.requestId
  ) : null;
  const draftRef = db.collection("organizerFormResponseDrafts").doc(draftId);
  const result = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(draftRef);
    const reusedSuggestions: AnswerMap = {};
    let prefillSource: BeginOrganizerFormResponseCallableResponse[
      "prefillSource"];
    if (data.reuseResponseId) {
      const proof = identity.uid ? await readParticipantFormResponseProof({
        db, tx, uid: identity.uid, responseId: data.reuseResponseId,
        nowMillis: deps.timestamp().toMillis(),
      }) : null;
      if (!proof || proof.source.organizerId !== resolved.form.organizerId ||
          proof.source.formId !== resolved.formId) {
        throw new HttpsError("not-found", "Form response unavailable.");
      }
      const candidates = organizerFormAnswerSuggestions({
        sourceDefinition: proof.version.definition,
        targetDefinition: resolved.version.definition,
        answers: proof.response.answers,
      });
      // Reuse calls the same current answer validator as manual draft edits.
      for (const [questionId, value] of Object.entries(candidates)) {
        try {
          validateAnswerShape(resolved.version.definition,
            {[questionId]: value}, false);
          reusedSuggestions[questionId] = value;
        } catch (error) {
          if (!(error instanceof HttpsError) ||
              error.code !== "invalid-argument") throw error;
        }
      }
      if (Object.keys(reusedSuggestions).length > 0) {
        prefillSource = {responseId: proof.source.responseId,
          versionId: proof.source.versionId,
          submittedAtMillis: Math.trunc(proof.source.submittedAtMillis)};
      }
    }
    await requireOrganizerFormEventTarget({db, tx,
      organizerId: resolved.form.organizerId,
      kind: resolved.version.definition.defaultTargetKind,
      targetId: resolved.version.definition.defaultTargetId,
      nowMillis: deps.timestamp().toMillis()});
    if (snapshot.exists) {
      const existing = requireDoc<OrganizerFormResponseDraftDocument>(
        snapshot,
        "OrganizerFormResponseDraftDocument"
      );
      if (existing.formId !== resolved.formId ||
          existing.versionId !== resolved.versionId ||
          existing.respondentUid !== identity.uid ||
          (draftToken !== null &&
            existing.draftTokenHash !== hashToken(draftToken))) {
        throw new HttpsError(
          "already-exists",
          "Response draft already exists."
        );
      }
      if (existing.status !== "active") {
        throw new HttpsError(
          "failed-precondition",
          "This response draft is no longer editable."
        );
      }
      if (existing.expiresAt.toMillis() <= deps.timestamp().toMillis()) {
        throw new HttpsError(
          "deadline-exceeded",
          "This response draft has expired. Start a new response."
        );
      }
      return {draft: existing, created: false, reusedSuggestions,
        prefillSource};
    }
    const now = deps.timestamp();
    const created: OrganizerFormResponseDraftDocument = {
      organizerId: resolved.form.organizerId,
      formId: resolved.formId,
      versionId: resolved.versionId,
      publicFormId: resolved.form.publicFormId,
      status: "active",
      revision: 1,
      identityKind: identity.kind,
      respondentUid: identity.uid,
      draftTokenHash: draftToken === null ? null : hashToken(draftToken),
      answers: {},
      consentAccepted: false,
      consentVersion: resolved.version.definition.consent.consentVersion,
      sourceLinkId,
      createdAt: now,
      updatedAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + responseDraftLifetimeMs
      ),
      submittedResponseId: null,
    };
    tx.create(draftRef, created);
    if (sourceLinkId) {
      tx.update(db.collection("organizerFormShareLinks").doc(sourceLinkId), {
        startCount: admin.firestore.FieldValue.increment(1),
      });
    }
    return {draft: created, created: true, reusedSuggestions, prefillSource};
  });
  if (result.created) {
    await incrementOrganizerFormFunnel({
      organizerId: resolved.form.organizerId,
      formId: resolved.formId,
      versionId: resolved.versionId,
      counter: "starts",
      deps: {firestore: deps.firestore, timestamp: deps.timestamp},
    });
  }
  const draft = result.draft;
  let prefillSuggestions: Record<string, AnswerMap[string]> = {};
  if (identity.kind === "phoneVerified" && identity.uid) {
    const [deleted, intake, profile] = await Promise.all([
      db.collection("deletedUsers").doc(identity.uid).get(),
      db.collection("participantIntakeProfiles").doc(identity.uid).get(),
      db.collection("users").doc(identity.uid).get(),
    ]);
    if (!deleted.exists) {
      prefillSuggestions = publicFormPrefillSuggestions({
        definition: resolved.version.definition,
        intake: intake.data() as ParticipantIntakeProfileDocument | undefined,
        profile: profile.data() as UserProfileDocument | undefined,
        verifiedPhone: String(request.auth?.token.phone_number ?? ""),
      });
    }
  }
  return {
    draftId,
    draftToken,
    form: resolved.projection,
    revision: draft.revision,
    answers: draft.answers,
    prefillSuggestions: {...prefillSuggestions, ...result.reusedSuggestions},
    ...(result.prefillSource ? {prefillSource: result.prefillSource} : {}),
    consentAccepted: draft.consentAccepted,
    ...(draft.messagingDecision ?
      {messagingChoices: formMessagingChoices(draft.messagingDecision)} : {}),
    identityKind: draft.identityKind,
    expiresAtMillis: draft.expiresAt.toMillis(),
  };
}

/** Saves a complete answer snapshot under an optimistic revision guard. */
export async function saveOrganizerFormResponseDraftHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<SaveOrganizerFormResponseDraftCallableResponse> {
  const data = validateCallableWithAjv<
    SaveOrganizerFormResponseDraftCallablePayload
  >(
    request,
    validateSaveOrganizerFormResponseDraftCallablePayload,
    normalizeDraftMutationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ?? `form-draft:${data.draftId}`,
    "saveOrganizerFormResponseDraft",
    {maxRequests: 120, windowMs: 60 * 1000}
  );
  const draftRef = db.collection("organizerFormResponseDrafts")
    .doc(data.draftId);
  const draft = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(draftRef);
    const current = requireActiveDraft(
      snapshot,
      request,
      data.draftToken,
      deps
    );
    if (current.revision !== data.expectedRevision) {
      throw new HttpsError(
        "aborted",
        "This response changed on another tab. Reload and try again."
      );
    }
    const version = await getVersion(tx, db, current.versionId);
    await requireOrganizerFormEventTarget({db, tx,
      organizerId: current.organizerId,
      kind: version.definition.defaultTargetKind,
      targetId: version.definition.defaultTargetId,
      nowMillis: deps.timestamp().toMillis()});
    validateAnswerShape(version.definition, data.answers, false);
    const now = deps.timestamp();
    const messagingDecision = normalizeFormMessagingDecision({
      choices: data.messagingChoices, previous: current.messagingDecision,
      definition: version.definition,
      phoneVerified: current.identityKind === "phoneVerified" &&
        typeof request.auth?.token.phone_number === "string" &&
        /^\+[1-9]\d{6,14}$/u.test(request.auth.token.phone_number),
      now,
    });
    const updated: OrganizerFormResponseDraftDocument = {
      ...current,
      ...(messagingDecision ? {messagingDecision} : {}),
      revision: current.revision + 1,
      answers: data.answers,
      consentAccepted: data.consentAccepted,
      updatedAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + responseDraftLifetimeMs
      ),
    };
    tx.set(draftRef, updated);
    return updated;
  });
  return {
    draftId: data.draftId,
    revision: draft.revision,
    expiresAtMillis: draft.expiresAt.toMillis(),
  };
}

/** Creates a short-lived, size-bounded signed POST policy for one answer. */
export async function createOrganizerFormAssetIntentHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<CreateOrganizerFormAssetIntentCallableResponse> {
  const data = validateCallableWithAjv<
    CreateOrganizerFormAssetIntentCallablePayload
  >(
    request,
    validateCreateOrganizerFormAssetIntentCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: [
        "draftId",
        "questionId",
        "requestId",
        "originalFileName",
        "contentType",
        "sha256",
      ],
      nullableStringFields: ["draftToken"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ?? `form-draft:${data.draftId}`,
    "createOrganizerFormAssetIntent",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const draftSnap = await db.collection("organizerFormResponseDrafts")
    .doc(data.draftId).get();
  const draft = requireActiveDraft(draftSnap, request, data.draftToken, deps);
  const versionSnap = await db.collection("organizerFormVersions")
    .doc(draft.versionId).get();
  const version = requireDoc<OrganizerFormVersionDocument>(
    versionSnap,
    "OrganizerFormVersionDocument"
  );
  const question = version.definition.sections.flatMap((section) =>
    section.questions).find((candidate) =>
    candidate.questionId === data.questionId);
  if (!question || (question.kind !== "file" &&
      question.kind !== "signature")) {
    throw new HttpsError("invalid-argument", "Upload question not found.");
  }
  const policy = uploadPolicy(question);
  if (!policy.contentTypes.has(data.contentType) ||
      data.sizeBytes > policy.maxSizeBytes) {
    throw new HttpsError(
      "invalid-argument",
      "This file type or size is not allowed for this question."
    );
  }
  const assetId = deterministicId(
    "formasset",
    data.draftId,
    data.questionId,
    data.requestId
  );
  const uploadToken = bearerToken(
    "form-asset-token",
    assetId,
    data.requestId
  );
  const storagePath = [
    "organizerForms",
    draft.formId,
    data.draftId,
    assetId,
  ].join("/");
  const assetRef = db.collection("organizerFormAssets").doc(assetId);
  const now = deps.timestamp();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + assetIntentLifetimeMs
  );
  const asset = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(assetRef);
    if (snapshot.exists) {
      const existing = requireDoc<OrganizerFormAssetDocument>(
        snapshot,
        "OrganizerFormAssetDocument"
      );
      if (existing.draftId !== data.draftId ||
          existing.questionId !== data.questionId ||
          existing.respondentUid !== draft.respondentUid ||
          existing.uploadTokenHash !== hashToken(uploadToken) ||
          existing.originalFileName !== data.originalFileName ||
          existing.contentType !== data.contentType ||
          existing.declaredSizeBytes !== data.sizeBytes ||
          existing.declaredSha256 !== data.sha256) {
        throw new HttpsError("already-exists", "Upload intent already exists.");
      }
      if (existing.status === "rejected" || existing.status === "deleted" ||
          existing.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError(
          "deadline-exceeded",
          "This upload intent expired. Select the file again."
        );
      }
      return existing;
    }
    const created: OrganizerFormAssetDocument = {
      organizerId: draft.organizerId,
      formId: draft.formId,
      versionId: draft.versionId,
      draftId: data.draftId,
      questionId: data.questionId,
      respondentUid: draft.respondentUid,
      uploadTokenHash: hashToken(uploadToken),
      storagePath,
      originalFileName: data.originalFileName,
      contentType: data.contentType,
      declaredSizeBytes: data.sizeBytes,
      declaredSha256: data.sha256,
      sizeBytes: null,
      status: "uploading",
      createdAt: now,
      expiresAt,
      finalizedAt: null,
      deletedAt: null,
    };
    tx.create(assetRef, created);
    return created;
  });
  const [signedPost] = await deps.storageBucket().file(asset.storagePath)
    .generateSignedPostPolicyV4({
      expires: asset.expiresAt.toMillis(),
      fields: {
        "Content-Type": asset.contentType,
        "x-goog-meta-asset-id": assetId,
        "x-goog-meta-sha256": asset.declaredSha256,
      },
      conditions: [
        ["content-length-range", 1, policy.maxSizeBytes],
        ["eq", "$Content-Type", asset.contentType],
        ["eq", "$x-goog-meta-asset-id", assetId],
        ["eq", "$x-goog-meta-sha256", asset.declaredSha256],
      ],
    });
  return {
    assetId,
    uploadToken,
    uploadUrl: signedPost.url,
    uploadFields: signedPost.fields,
    expiresAtMillis: asset.expiresAt.toMillis(),
  };
}

/** Verifies uploaded object metadata before it can be attached to an answer. */
export async function finalizeOrganizerFormAssetHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<FinalizeOrganizerFormAssetCallableResponse> {
  const data = validateCallableWithAjv<
    FinalizeOrganizerFormAssetCallablePayload
  >(
    request,
    validateFinalizeOrganizerFormAssetCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["draftId", "assetId", "uploadToken"],
      nullableStringFields: ["draftToken"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ?? `form-draft:${data.draftId}`,
    "finalizeOrganizerFormAsset",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const [draftSnap, assetSnap] = await Promise.all([
    db.collection("organizerFormResponseDrafts").doc(data.draftId).get(),
    db.collection("organizerFormAssets").doc(data.assetId).get(),
  ]);
  const draft = requireActiveDraft(draftSnap, request, data.draftToken, deps);
  const asset = requireDoc<OrganizerFormAssetDocument>(
    assetSnap,
    "OrganizerFormAssetDocument"
  );
  requireAssetAuthority(asset, data.draftId, draft, data.uploadToken);
  if (asset.status === "ready" && asset.sizeBytes !== null) {
    return {assetId: data.assetId, status: "ready", sizeBytes: asset.sizeBytes};
  }
  if (asset.status !== "uploading" ||
      asset.expiresAt.toMillis() <= deps.timestamp().toMillis()) {
    throw new HttpsError("deadline-exceeded", "This upload intent expired.");
  }
  const file = deps.storageBucket().file(asset.storagePath);
  let metadata: import("@google-cloud/storage").FileMetadata;
  try {
    [metadata] = await file.getMetadata();
  } catch {
    throw new HttpsError("failed-precondition", "Upload has not completed.");
  }
  const sizeBytes = Number(metadata.size);
  if (!matchesAuthorizedFormAssetMetadata(metadata, asset, data.assetId)) {
    await Promise.all([
      file.delete({ignoreNotFound: true}),
      assetSnap.ref.update({status: "rejected", deletedAt: deps.timestamp()}),
    ]);
    throw new HttpsError(
      "failed-precondition",
      "The uploaded file did not match its authorized intent."
    );
  }
  const finalizedAt = deps.timestamp();
  await assetSnap.ref.update({
    status: "ready",
    sizeBytes,
    finalizedAt,
    expiresAt: draft.expiresAt,
  });
  return {assetId: data.assetId, status: "ready", sizeBytes};
}

/** XML POST x-goog-meta-asset-id is returned as metadata["asset-id"]. */
export function matchesAuthorizedFormAssetMetadata(
  metadata: import("@google-cloud/storage").FileMetadata,
  asset: Pick<OrganizerFormAssetDocument,
    "declaredSizeBytes" | "contentType" | "declaredSha256">,
  expectedAssetId: string
): boolean {
  const sizeBytes = Number(metadata.size);
  return Number.isSafeInteger(sizeBytes) && sizeBytes >= 1 &&
    sizeBytes === asset.declaredSizeBytes &&
    metadata.contentType === asset.contentType &&
    metadata.metadata?.sha256 === asset.declaredSha256 &&
    metadata.metadata?.["asset-id"] === expectedAssetId;
}

/** Submits one draft exactly once while retaining its immutable version. */
export async function submitOrganizerFormResponseHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<SubmitOrganizerFormResponseCallableResponse> {
  const data = validateCallableWithAjv<
    SubmitOrganizerFormResponseCallablePayload
  >(
    request,
    validateSubmitOrganizerFormResponseCallablePayload,
    normalizeDraftMutationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ?? `form-draft:${data.draftId}`,
    "submitOrganizerFormResponse",
    {maxRequests: 20, windowMs: 60 * 1000}
  );
  const responseId = deterministicId("formresponse", data.draftId);
  const withdrawalToken = bearerToken(
    "form-withdrawal-token",
    responseId,
    data.requestId
  );
  const draftRef = db.collection("organizerFormResponseDrafts")
    .doc(data.draftId);
  const responseRef = db.collection("organizerFormResponses")
    .doc(responseId);
  const result = await db.runTransaction(async (tx) => {
    const [draftSnap, responseSnap] = await Promise.all([
      tx.get(draftRef),
      tx.get(responseRef),
    ]);
    if (responseSnap.exists) {
      const response = requireDoc<OrganizerFormResponseDocument>(
        responseSnap,
        "OrganizerFormResponseDocument"
      );
      requireResponseAuthority(response, request, withdrawalToken);
      const version = await getVersion(tx, db, response.versionId);
      return {response, version};
    }
    const draft = requireActiveDraft(
      draftSnap,
      request,
      data.draftToken,
      deps
    );
    if (draft.revision !== data.expectedRevision) {
      throw new HttpsError(
        "aborted",
        "This response changed on another tab. Reload and try again."
      );
    }
    const [formSnap, version] = await Promise.all([
      tx.get(db.collection("organizerForms").doc(draft.formId)),
      getVersion(tx, db, draft.versionId),
    ]);
    const form = requireDoc<OrganizerFormDocument>(
      formSnap,
      "OrganizerFormDocument"
    );
    requireFreeFormSubmission(version.definition);
    const availability = availabilityFor(form, version, deps.timestamp());
    if (availability.status !== "active") {
      throw new HttpsError("failed-precondition", availability.message);
    }
    if (!draft.consentAccepted) {
      throw new HttpsError(
        "failed-precondition",
        "Review and accept the form consent before submitting."
      );
    }
    const submittedAnswers = answersForSubmission(
      version.definition,
      draft.answers
    );
    validateAnswerShape(version.definition, submittedAnswers, true);
    const now = deps.timestamp();
    const submittedAssetRefs = await requireReadyAssets({
      tx,
      db,
      draftId: data.draftId,
      draft,
      definition: version.definition,
      answers: submittedAnswers,
    });
    const {response} = await persistOrganizerFormSubmission({
      tx, db, draftId: data.draftId, draft, version, submittedAnswers,
      identity: responseIdentitySnapshot(version.definition,
        submittedAnswers, request),
      withdrawalTokenHash: draft.respondentUid === null ?
        hashToken(withdrawalToken) : null,
      submittedAssetRefs, now,
    });
    return {response, version};
  });
  return organizerFormResponseReceipt(
    db, responseId,
    result.response,
    result.version,
    result.response.respondentUid === null ? withdrawalToken : null
  );
}

/** Writes a previously validated submission inside its caller's transaction. */
export async function persistOrganizerFormSubmission(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  draftId: string;
  draft: OrganizerFormResponseDraftDocument;
  version: OrganizerFormVersionDocument;
  submittedAnswers: AnswerMap;
  identity: OrganizerFormResponseDocument["identity"];
  withdrawalTokenHash: string | null;
  submittedAssetRefs: FirebaseFirestore.DocumentReference[];
  now: FirebaseFirestore.Timestamp;
}): Promise<{responseId: string; response: OrganizerFormResponseDocument}> {
  const {tx, db, draftId, draft, version, submittedAnswers, identity,
    withdrawalTokenHash, submittedAssetRefs, now} = params;
  const responseId = deterministicId("formresponse", draftId);
  const responseRef = db.collection("organizerFormResponses").doc(responseId);
  const draftRef = db.collection("organizerFormResponseDrafts").doc(draftId);
  await requireOrganizerFormEventTarget({db, tx,
    organizerId: draft.organizerId,
    kind: version.definition.defaultTargetKind,
    targetId: version.definition.defaultTargetId, nowMillis: now.toMillis()});
  const writeMessagingGrants = await prepareFormMessagingGrants({
    tx, db, draft, definition: version.definition, responseId, now,
  });
  const writeMessagingIntent = prepareFormCommunicationIntent({
    tx, db, draft, definition: version.definition, responseId,
    endpointE164: identity.phoneE164, now,
  });
  const writeProfileProposal = await prepareFormProfileProposal({
    tx, db, draft, definition: version.definition,
    answers: submittedAnswers, responseId, now,
  });
  const reusableFields = draft.respondentUid &&
    draft.identityKind === "phoneVerified" && draft.consentAccepted ?
    reusablePublicFormFields(version.definition, submittedAnswers, now) : [];
  let writeReusableFields = () => undefined;
  if (reusableFields.length > 0 && draft.respondentUid) {
    const intakeRef = db.collection("participantIntakeProfiles")
      .doc(draft.respondentUid);
    const [intakeSnap, deleted] = await Promise.all([
      tx.get(intakeRef),
      tx.get(db.collection("deletedUsers").doc(draft.respondentUid)),
    ]);
    if (!deleted.exists) {
      const previous = intakeSnap.data() as ParticipantIntakeProfileDocument |
      undefined;
      const byId = new Map((previous?.fields ?? []).map((field) =>
        [field.canonicalFieldId, field]));
      for (const field of reusableFields) {
        byId.set(field.canonicalFieldId, field);
      }
      const updated: ParticipantIntakeProfileDocument = {
        fields: [...byId.values()].sort((left, right) =>
          left.canonicalFieldId.localeCompare(right.canonicalFieldId)),
        revision: (previous?.revision ?? 0) + 1,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      writeReusableFields = () => {
        tx.set(intakeRef, updated);
      };
    }
  }
  const response: OrganizerFormResponseDocument = {
    organizerId: draft.organizerId,
    formId: draft.formId,
    versionId: draft.versionId,
    publicFormId: draft.publicFormId,
    draftId: draftId,
    status: "submitted",
    identityKind: draft.identityKind,
    respondentUid: draft.respondentUid,
    identity,
    withdrawalTokenHash,
    answers: submittedAnswers,
    answerSnapshots: answerSnapshots(version.definition, submittedAnswers),
    consentVersion: draft.consentVersion,
    sourceLinkId: draft.sourceLinkId,
    completionMillis: Math.max(
      0,
      Math.min(
        responseDraftLifetimeMs,
        now.toMillis() - draft.createdAt.toMillis()
      )
    ),
    submittedAt: now,
    withdrawnAt: null,
  };
  writeMessagingGrants();
  writeMessagingIntent();
  writeProfileProposal();
  writeReusableFields();
  tx.create(responseRef, response);
  for (const assetRef of submittedAssetRefs) {
    tx.update(assetRef, {
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + submittedAssetLifetimeMs
      ),
    });
  }
  tx.set(draftRef, {
    ...draft,
    status: "submitted",
    submittedResponseId: responseId,
    updatedAt: now,
  } satisfies OrganizerFormResponseDraftDocument);
  tx.update(db.collection("organizerForms").doc(draft.formId), {
    submittedResponseCount: admin.firestore.FieldValue.increment(1),
    lastResponseAt: now,
    updatedAt: now,
  });
  if (draft.sourceLinkId) {
    tx.update(
      db.collection("organizerFormShareLinks").doc(draft.sourceLinkId),
      {submissionCount: admin.firestore.FieldValue.increment(1)}
    );
  }
  return {responseId, response};
}

export function responseIdentitySnapshot(
  definition: FormDefinition,
  answers: AnswerMap,
  request: CallableRequest<unknown>
): OrganizerFormResponseDocument["identity"] {
  const canonicalAnswer = (canonicalFieldId: string): string | null => {
    const question = definition.sections.flatMap((section) =>
      section.questions).find((candidate) =>
      candidate.canonicalFieldId === canonicalFieldId);
    const answer = question ? answers[question.questionId] : null;
    return typeof answer === "string" && answer.trim() ? answer.trim() : null;
  };
  // The immutable published policy controls enrichment, not ambient Auth.
  // Anonymous contact is only the respondent's submitted canonical answers.
  const auth = definition.identityPolicy === "anonymous" ? null : request.auth;
  const tokenEmail = typeof auth?.token.email === "string" ?
    auth.token.email.trim().toLowerCase() : null;
  const tokenPhone = typeof auth?.token.phone_number === "string" ?
    auth.token.phone_number.trim() : null;
  const tokenName = typeof auth?.token.name === "string" ?
    auth.token.name.trim() : null;
  const displayName = tokenName || canonicalAnswer("displayName") || [
    canonicalAnswer("givenName"),
    canonicalAnswer("familyName"),
  ].filter(Boolean).join(" ") || null;
  const email = tokenEmail || canonicalAnswer("email");
  const phoneE164 = tokenPhone || canonicalAnswer("phoneNumber");
  const hasVerifiedIdentity = Boolean(auth?.uid);
  const hasOrganizerAcquiredIdentity = Boolean(
    displayName || email || phoneE164
  );
  const origin = hasVerifiedIdentity ? "respondentGranted" :
    hasOrganizerAcquiredIdentity ? "organizerAcquired" : "anonymous";
  const searchName = (displayName || email || phoneE164)?.toLowerCase() ?? null;
  return {displayName, email, phoneE164, searchName, origin};
}

/** Withdraws a submitted response without deleting its audit envelope. */
export async function withdrawOrganizerFormResponseHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<WithdrawOrganizerFormResponseCallableResponse> {
  const data = validateCallableWithAjv<
    WithdrawOrganizerFormResponseCallablePayload
  >(
    request,
    validateWithdrawOrganizerFormResponseCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["responseId", "requestId"],
      nullableStringFields: ["withdrawalToken"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    request.auth?.uid ?? `form-response:${data.responseId}`,
    "withdrawOrganizerFormResponse",
    {maxRequests: 10, windowMs: 60 * 1000}
  );
  const responseRef = db.collection("organizerFormResponses")
    .doc(data.responseId);
  const summaryRef = db.collection("hostResponseSummaries")
    .doc(responseSummaryId("response", data.responseId));
  const response = await db.runTransaction(async (tx) => {
    const [snapshot, summarySnap] = await Promise.all([
      tx.get(responseRef), tx.get(summaryRef),
    ]);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Form response not found.");
    }
    const current = requireDoc<OrganizerFormResponseDocument>(
      snapshot,
      "OrganizerFormResponseDocument"
    );
    requireResponseAuthority(current, request, data.withdrawalToken);
    // Redaction commits with authority, including idempotent withdrawal.
    const now = deps.timestamp();
    const redacted = redactResponseSummary(summarySnap.data(),
      current.organizerId, "response", data.responseId,
      current.withdrawnAt?.toMillis() ?? now.toMillis());
    if (redacted) tx.set(summaryRef, redacted);
    else tx.delete(summaryRef);
    if (current.status === "withdrawn") return current;
    const withdrawn: OrganizerFormResponseDocument = {
      ...current,
      status: "withdrawn",
      withdrawnAt: now,
    };
    tx.set(responseRef, withdrawn);
    tx.update(db.collection("organizerForms").doc(current.formId), {
      submittedResponseCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: now,
    });
    return withdrawn;
  });
  return {
    responseId: data.responseId,
    status: "withdrawn",
    withdrawnAtMillis: response.withdrawnAt!.toMillis(),
  };
}

/** Creates a manager-owned source link with an opaque stable token. */
export async function createOrganizerFormShareLinkHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<CreateOrganizerFormShareLinkCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    CreateOrganizerFormShareLinkCallablePayload
  >(
    request,
    validateCreateOrganizerFormShareLinkCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["organizerId", "formId", "label", "requestId"],
      nullableStringFields: ["source"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createOrganizerFormShareLink", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const formSnap = await db.collection("organizerForms").doc(data.formId).get();
  const form = requireOwnedPublishedForm(formSnap, data.organizerId);
  const linkId = deterministicId(
    "formlink",
    data.organizerId,
    data.formId,
    actorUid,
    data.requestId
  );
  const sourceToken = linkId;
  const linkRef = db.collection("organizerFormShareLinks").doc(linkId);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(linkRef);
    if (snapshot.exists) {
      const existing = requireDoc<OrganizerFormShareLinkDocument>(
        snapshot,
        "OrganizerFormShareLinkDocument"
      );
      if (existing.organizerId !== data.organizerId ||
          existing.formId !== data.formId || existing.label !== data.label ||
          existing.source !== data.source) {
        throw new HttpsError("already-exists", "Share link already exists.");
      }
      return;
    }
    const created: OrganizerFormShareLinkDocument = {
      organizerId: data.organizerId,
      formId: data.formId,
      publicFormId: form.publicFormId,
      label: data.label,
      source: data.source,
      tokenHash: hashToken(sourceToken),
      createdByUid: actorUid,
      createdAt: deps.timestamp(),
      openCount: 0,
      startCount: 0,
      submissionCount: 0,
    };
    tx.create(linkRef, created);
  });
  return {
    linkId,
    label: data.label,
    source: data.source,
    sourceToken,
    url: publicFormUrl(form.publicFormId, sourceToken),
  };
}

/** Returns the canonical URL and a CSP-safe hosted iframe snippet. */
export async function getOrganizerFormShareAssetsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFormResponseDeps = defaultDeps
): Promise<GetOrganizerFormShareAssetsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerFormShareAssetsCallablePayload
  >(
    request,
    validateGetOrganizerFormShareAssetsCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["organizerId", "formId"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getOrganizerFormShareAssets", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const formSnap = await db.collection("organizerForms").doc(data.formId).get();
  const form = requireOwnedPublishedForm(formSnap, data.organizerId);
  const canonicalUrl = publicFormUrl(form.publicFormId, null);
  const {embedUrl, embedSnippet} = organizerFormEmbedAssets(
    canonicalUrl, form.title, randomBytes(12).toString("base64url")
  );
  return {
    canonicalUrl,
    embedUrl,
    embedSnippet,
  };
}

interface ResolvedPublicForm {
  formId: string;
  versionId: string;
  form: OrganizerFormDocument;
  version: OrganizerFormVersionDocument;
  projection: PublicFormProjection;
}

async function resolvePublicForm(
  db: FirebaseFirestore.Firestore,
  publicFormId: string,
  deps: OrganizerFormResponseDeps
): Promise<ResolvedPublicForm> {
  const snapshot = await db.collection("organizerForms")
    .where("publicFormId", "==", publicFormId)
    .limit(2)
    .get();
  if (snapshot.size !== 1) {
    throw new HttpsError("not-found", "Form not found.");
  }
  const formSnap = snapshot.docs[0];
  const form = requireDoc<OrganizerFormDocument>(
    formSnap,
    "OrganizerFormDocument"
  );
  if (!form.activeVersionId || form.publishedVersion < 1) {
    throw new HttpsError("not-found", "Form not found.");
  }
  const [versionSnap, presentation] = await Promise.all([
    db.collection("organizerFormVersions").doc(form.activeVersionId).get(),
    organizerPresentation(db, form.organizerId),
  ]);
  const version = requireDoc<OrganizerFormVersionDocument>(
    versionSnap,
    "OrganizerFormVersionDocument"
  );
  if (version.formId !== formSnap.id ||
      version.organizerId !== form.organizerId) {
    throw new HttpsError("not-found", "Form not found.");
  }
  const now = deps.timestamp();
  let availability = availabilityFor(form, version, now);
  if (availability.status === "active" &&
      !await organizerFormEventTargetAvailable({db,
        organizerId: form.organizerId,
        kind: version.definition.defaultTargetKind,
        targetId: version.definition.defaultTargetId,
        nowMillis: now.toMillis()})) {
    availability = {status: "closed", message:
      version.definition.availability.closedMessage ??
        "This form is not accepting responses right now."};
  }
  return {
    formId: formSnap.id,
    versionId: versionSnap.id,
    form,
    version,
    projection: {
      publicFormId,
      formId: formSnap.id,
      versionId: versionSnap.id,
      version: version.version,
      availabilityStatus: availability.status,
      availabilityMessage: availability.message,
      organizer: presentation,
      definition: definitionToWire(version.definition),
      cityOptions: publicFormCityOptions(),
      messagingOffer: formMessagingOffer(version.definition),
    },
  };
}

async function organizerPresentation(
  db: FirebaseFirestore.Firestore,
  organizerId: string
): Promise<PublicFormProjection["organizer"]> {
  const canonical = await db.collection("organizers").doc(organizerId).get();
  if (canonical.exists) {
    const organizer = requireDoc<OrganizerDocument>(
      canonical,
      "OrganizerDocument"
    );
    return {
      organizerId,
      name: organizer.name,
      logoUrl: organizer.logoPhoto?.url?.trim() ||
        organizer.profileImageUrl?.trim() || null,
    };
  }
  return {organizerId, name: "Organizer", logoUrl: null};
}

export function availabilityFor(
  form: OrganizerFormDocument,
  version: OrganizerFormVersionDocument,
  now: FirebaseFirestore.Timestamp
): {status: PublicFormProjection["availabilityStatus"]; message: string} {
  const closedCopy = version.definition.availability.closedMessage ??
    "This form is not accepting responses right now.";
  if (form.status === "archived") {
    return {status: "archived", message: closedCopy};
  }
  if (form.status === "paused") {
    return {status: "paused", message: closedCopy};
  }
  if (form.status !== "published") {
    return {status: "unavailable", message: closedCopy};
  }
  const opensAt = version.definition.availability.opensAt;
  if (opensAt && opensAt.toMillis() > now.toMillis()) {
    return {status: "notOpen", message: closedCopy};
  }
  const closesAt = version.definition.availability.closesAt;
  if (closesAt && closesAt.toMillis() <= now.toMillis()) {
    return {status: "closed", message: closedCopy};
  }
  const limit = version.definition.availability.responseLimit;
  if (limit !== null && form.submittedResponseCount +
      (form.pendingPaymentCount ?? 0) >= limit) {
    return {status: "full", message: closedCopy};
  }
  return {status: "active", message: "This form is accepting responses."};
}

function assertAcceptingResponses(projection: PublicFormProjection): void {
  if (projection.availabilityStatus !== "active") {
    throw new HttpsError(
      "failed-precondition",
      projection.availabilityMessage ??
        "This form is not accepting responses right now."
    );
  }
}

export function requireResponseIdentity(
  request: CallableRequest<unknown>,
  policy: FormDefinition["identityPolicy"]
): {
  kind: OrganizerFormResponseDraftDocument["identityKind"];
  uid: string | null;
} {
  if (policy === "anonymous") return {kind: "anonymous", uid: null};
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Verify your identity before starting this form."
    );
  }
  const token = (request.auth?.token ?? {}) as Record<string, unknown>;
  const phoneVerified = typeof token.phone_number === "string" &&
    token.phone_number.length > 0;
  const emailVerified = token.email_verified === true &&
    typeof token.email === "string" && token.email.length > 0;
  if (policy === "phoneVerified" && !phoneVerified) {
    throw new HttpsError("failed-precondition", "Verify your phone number.");
  }
  if (policy === "emailVerified" && !emailVerified) {
    throw new HttpsError("failed-precondition", "Verify your email address.");
  }
  if (policy === "emailOrPhoneVerified" &&
      !phoneVerified && !emailVerified) {
    throw new HttpsError(
      "failed-precondition",
      "Verify your phone number or email address."
    );
  }
  return {
    uid,
    kind: phoneVerified ? "phoneVerified" :
      emailVerified ? "emailVerified" : "catchAccount",
  };
}

function requireActiveDraft(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  request: CallableRequest<unknown>,
  draftToken: string | null,
  deps: OrganizerFormResponseDeps
): OrganizerFormResponseDraftDocument {
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Response draft not found.");
  }
  const draft = requireDoc<OrganizerFormResponseDraftDocument>(
    snapshot,
    "OrganizerFormResponseDraftDocument"
  );
  if (draft.status !== "active" || draft.paymentAttemptId) {
    throw new HttpsError(
      "failed-precondition",
      "This response draft is no longer editable."
    );
  }
  if (draft.expiresAt.toMillis() <= deps.timestamp().toMillis()) {
    throw new HttpsError("deadline-exceeded", "This response draft expired.");
  }
  if (draft.respondentUid !== null) {
    if (request.auth?.uid !== draft.respondentUid) {
      throw new HttpsError("permission-denied", "Response draft unavailable.");
    }
  } else if (!draftToken ||
      draft.draftTokenHash !== hashToken(draftToken)) {
    throw new HttpsError("permission-denied", "Response draft unavailable.");
  }
  return draft;
}

function requireAssetAuthority(
  asset: OrganizerFormAssetDocument,
  draftId: string,
  draft: OrganizerFormResponseDraftDocument,
  uploadToken: string
): void {
  if (asset.organizerId !== draft.organizerId ||
      asset.formId !== draft.formId ||
      asset.versionId !== draft.versionId ||
      asset.draftId !== draftId ||
      asset.respondentUid !== draft.respondentUid ||
      asset.uploadTokenHash !== hashToken(uploadToken)) {
    throw new HttpsError("permission-denied", "Form upload unavailable.");
  }
}

export function uploadPolicy(question: Question): {
  contentTypes: Set<string>;
  maxSizeBytes: number;
} {
  if (question.kind === "signature") {
    return {
      contentTypes: new Set(["image/png"]),
      maxSizeBytes: signatureFileSizeBytes,
    };
  }
  if (question.kind !== "file") {
    throw new HttpsError("invalid-argument", "Question does not accept files.");
  }
  const configured = question.validation.allowedMimeTypes;
  return {
    contentTypes: configured.length > 0 ?
      new Set(configured) : new Set(supportedFileTypes),
    maxSizeBytes: Math.min(
      question.validation.maxFileSizeBytes ?? defaultFileSizeBytes,
      25 * 1024 * 1024
    ),
  };
}

function requireResponseAuthority(
  response: OrganizerFormResponseDocument,
  request: CallableRequest<unknown>,
  withdrawalToken: string | null
): void {
  if (response.respondentUid !== null) {
    if (request.auth?.uid !== response.respondentUid) {
      throw new HttpsError("permission-denied", "Form response unavailable.");
    }
    return;
  }
  if (!withdrawalToken ||
      response.withdrawalTokenHash !== hashToken(withdrawalToken)) {
    throw new HttpsError("permission-denied", "Form response unavailable.");
  }
}

async function getVersion(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  versionId: string
): Promise<OrganizerFormVersionDocument> {
  const snapshot = await tx.get(
    db.collection("organizerFormVersions").doc(versionId)
  );
  return requireDoc<OrganizerFormVersionDocument>(
    snapshot,
    "OrganizerFormVersionDocument"
  );
}

export function validateAnswerShape(
  definition: FormDefinition,
  answers: AnswerMap,
  requireComplete: boolean
): void {
  const questions = definition.sections.flatMap((section) =>
    section.questions);
  const byId = new Map(questions.map((question) => [
    question.questionId,
    question,
  ]));
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = byId.get(questionId);
    if (!question) {
      throw invalidAnswer("This form no longer recognizes one answer.");
    }
    validateQuestionAnswer(question, answer);
  }
  if (requireComplete) {
    const reachableQuestions = reachableFormSections(definition, answers)
      .flatMap((section) => section.questions);
    for (const question of reachableQuestions) {
      if (question.required && isEmptyAnswer(answers[question.questionId])) {
        throw invalidAnswer(`${question.label} is required.`);
      }
    }
  }
}

function validateQuestionAnswer(
  question: Question,
  answer: AnswerMap[string]
): void {
  if (isEmptyAnswer(answer)) return;
  if (question.canonicalFieldId === "city" &&
      question.answerDestination === "catchProfile" &&
      canonicalCityMarketId(answer) !== answer) {
    throw invalidAnswer(`${question.label} must be a supported city.`);
  }
  const invalidType = () => invalidAnswer(
    `${question.label} has an invalid answer.`
  );
  switch (question.kind) {
  case "shortText":
  case "longText":
  case "date":
  case "phone":
  case "email":
  case "url":
    if (typeof answer !== "string") throw invalidType();
    validateTextAnswer(question, answer);
    return;
  case "file": {
    if (!Array.isArray(answer)) throw invalidType();
    const maximum = question.validation.maxFileCount ?? 1;
    if (answer.length > maximum ||
        new Set(answer).size !== answer.length) throw invalidType();
    return;
  }
  case "signature":
    if (typeof answer !== "string") throw invalidType();
    return;
  case "number":
    if (typeof answer !== "number" || !Number.isFinite(answer)) {
      throw invalidType();
    }
    if (question.validation.minNumber !== null &&
          answer < question.validation.minNumber) throw invalidType();
    if (question.validation.maxNumber !== null &&
          answer > question.validation.maxNumber) throw invalidType();
    return;
  case "boolean":
  case "acknowledgement":
    if (typeof answer !== "boolean") throw invalidType();
    if (question.required && answer !== true &&
          question.kind === "acknowledgement") throw invalidType();
    return;
  case "singleChoice": {
    if (typeof answer !== "string") throw invalidType();
    const allowed = new Set(question.options.map((option) => option.value));
    if (!allowed.has(answer)) throw invalidType();
    return;
  }
  case "multiChoice": {
    if (!Array.isArray(answer)) throw invalidType();
    const allowed = new Set(question.options.map((option) => option.value));
    if (answer.some((value) => !allowed.has(value)) ||
        new Set(answer).size !== answer.length) throw invalidType();
    const min = question.validation.minSelections;
    const max = question.validation.maxSelections;
    if (min !== null && answer.length < min) throw invalidType();
    if (max !== null && answer.length > max) throw invalidType();
    return;
  }
  }
}

export async function requireReadyAssets(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  draftId: string;
  draft: OrganizerFormResponseDraftDocument;
  definition: FormDefinition;
  answers: AnswerMap;
}): Promise<Array<FirebaseFirestore.DocumentReference>> {
  const references = params.definition.sections.flatMap((section) =>
    section.questions.flatMap((question) => {
      const answer = params.answers[question.questionId];
      if (question.kind === "file" && Array.isArray(answer)) {
        return answer.map((assetId) => ({
          assetId,
          questionId: question.questionId,
        }));
      }
      if (question.kind === "signature" &&
          typeof answer === "string" && answer) {
        return [{assetId: answer, questionId: question.questionId}];
      }
      return [];
    }));
  if (references.length === 0) return [];
  if (new Set(references.map(({assetId}) => assetId)).size !==
      references.length) {
    throw new HttpsError(
      "invalid-argument",
      "The same upload cannot answer more than one question."
    );
  }
  const documentRefs = references.map(({assetId}) =>
    params.db.collection("organizerFormAssets").doc(assetId));
  const snapshots = await Promise.all(
    documentRefs.map((reference) => params.tx.get(reference))
  );
  snapshots.forEach((snapshot, index) => {
    const asset = requireDoc<OrganizerFormAssetDocument>(
      snapshot,
      "OrganizerFormAssetDocument"
    );
    const reference = references[index];
    if (asset.organizerId !== params.draft.organizerId ||
        asset.formId !== params.draft.formId ||
        asset.versionId !== params.draft.versionId ||
        asset.draftId !== params.draftId ||
        asset.questionId !== reference.questionId ||
        asset.respondentUid !== params.draft.respondentUid ||
        asset.status !== "ready" || asset.deletedAt !== null) {
      throw new HttpsError(
        "failed-precondition",
        "One form upload is not ready for submission."
      );
    }
  });
  return documentRefs;
}

function validateTextAnswer(question: Question, answer: string): void {
  const value = answer.trim();
  const min = question.validation.minLength;
  const max = question.validation.maxLength;
  if (min !== null && value.length < min) throw invalidText(question);
  if (max !== null && value.length > max) throw invalidText(question);
  if (question.kind === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) throw invalidText(question);
  if (question.kind === "phone" &&
      !/^\+[1-9][0-9]{7,14}$/u.test(value.replace(/[\s()-]/gu, ""))) {
    throw invalidText(question);
  }
  if (question.kind === "url") {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("protocol");
      }
    } catch {
      throw invalidText(question);
    }
  }
  if (question.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw invalidText(question);
  }
  if (question.kind === "date") {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value ||
        (question.validation.earliestDate !== null &&
         value < question.validation.earliestDate) ||
        (question.validation.latestDate !== null &&
         value > question.validation.latestDate)) {
      throw invalidText(question);
    }
  }
  const pattern = question.validation.patternPreset;
  const patterns = {
    lettersAndSpaces: /^[\p{L}\p{M} '\u2019-]+$/u,
    alphanumeric: /^[\p{L}\p{M}\p{N} _.'\u2019-]+$/u,
    postalCode: /^[\p{L}\p{N} -]{3,12}$/u,
    handle: /^@?[A-Za-z0-9_.-]{2,39}$/u,
  } as const;
  if (pattern !== null && !patterns[pattern].test(value)) {
    throw invalidText(question);
  }
}

function invalidText(question: Question): HttpsError {
  return invalidAnswer(
    question.validation.customError ?? `${question.label} is invalid.`
  );
}

function invalidAnswer(message: string): HttpsError {
  return new HttpsError("invalid-argument", message);
}

function isEmptyAnswer(value: AnswerMap[string] | undefined): boolean {
  return value === undefined || value === null || value === "" ||
    (Array.isArray(value) && value.length === 0);
}

function answerSnapshots(
  definition: FormDefinition,
  answers: AnswerMap
): OrganizerFormResponseDocument["answerSnapshots"] {
  return definition.sections.flatMap((section) =>
    section.questions.flatMap((question) => {
      const answer = answers[question.questionId];
      return answer === undefined ? [] : [{
        questionId: question.questionId,
        key: question.key,
        label: question.label,
        kind: question.kind,
        answer,
      }];
    }));
}

export async function organizerFormResponseReceipt(
  db: FirebaseFirestore.Firestore,
  responseId: string,
  response: OrganizerFormResponseDocument,
  version: OrganizerFormVersionDocument,
  withdrawalToken: string | null
): Promise<SubmitOrganizerFormResponseCallableResponse> {
  let profileReviewAvailable = false;
  if (response.status === "submitted" && response.respondentUid &&
      response.identityKind === "phoneVerified") {
    try {
      await readParticipantFormProfileProposal({db,
        uid: response.respondentUid, responseId});
      profileReviewAvailable = true;
    } catch (error) {
      // Old receipts and ordinary forms have no proposal. Never mask a real
      // operational error as a completed ownership check.
      if (!(error instanceof HttpsError) || error.code !== "not-found") {
        throw error;
      }
    }
  }
  return {
    responseId,
    formId: response.formId,
    versionId: response.versionId,
    status: response.status,
    submittedAtMillis: response.submittedAt.toMillis(),
    withdrawalToken,
    completion: version.definition.completion,
    profileReviewAvailable,
  };
}

function requireOwnedPublishedForm(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  organizerId: string
): OrganizerFormDocument {
  if (!snapshot.exists) throw new HttpsError("not-found", "Form not found.");
  const form = requireDoc<OrganizerFormDocument>(
    snapshot,
    "OrganizerFormDocument"
  );
  if (form.organizerId !== organizerId) {
    throw new HttpsError("not-found", "Form not found.");
  }
  if (!form.activeVersionId || form.publishedVersion < 1 ||
      form.status === "archived") {
    throw new HttpsError(
      "failed-precondition",
      "Publish this form before sharing it."
    );
  }
  return form;
}

async function resolveSourceLink(
  db: FirebaseFirestore.Firestore,
  formId: string,
  sourceToken: string | null
): Promise<string | null> {
  if (!sourceToken) return null;
  const snapshot = await db.collection("organizerFormShareLinks")
    .doc(sourceToken)
    .get();
  if (!snapshot.exists) return null;
  const link = requireDoc<OrganizerFormShareLinkDocument>(
    snapshot,
    "OrganizerFormShareLinkDocument"
  );
  if (link.formId !== formId || link.tokenHash !== hashToken(sourceToken)) {
    return null;
  }
  return snapshot.id;
}

function publicFormUrl(
  publicFormId: string,
  sourceToken: string | null
): string {
  const url = new URL(`/f/${publicFormId}/`, publicFormsOrigin);
  if (sourceToken) url.searchParams.set("source", sourceToken);
  return url.toString();
}

function deterministicId(prefix: string, ...parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 32);
  return `${prefix}_${digest}`;
}

function bearerToken(namespace: string, ...parts: string[]): string {
  return createHash("sha256")
    .update([namespace, ...parts].join("\u0000"))
    .digest("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePublicFormPayload(value: unknown): unknown {
  return normalizePayloadStrings(value, {
    stringFields: ["publicFormId"],
    nullableStringFields: ["sourceToken"],
  });
}

function normalizeDraftMutationPayload(value: unknown): unknown {
  return normalizePayloadStrings(value, {
    stringFields: ["draftId", "requestId"],
    nullableStringFields: ["draftToken"],
  });
}

function definitionToWire(
  definition: FormDefinition
): PublicFormProjection["definition"] {
  return {
    ...definition,
    availability: {
      ...definition.availability,
      opensAt: timestampToWire(definition.availability.opensAt),
      closesAt: timestampToWire(definition.availability.closesAt),
    },
  };
}

function timestampToWire(
  value: FirebaseFirestore.Timestamp | null
): PublicFormProjection["definition"]["availability"]["opensAt"] {
  return value ? {
    _seconds: value.seconds,
    _nanoseconds: value.nanoseconds,
  } : null;
}

const publicCallableLimits = {
  timeoutSeconds: 60,
  maxInstances: 40,
};

export const getPublicOrganizerForm = onCall(
  appCheckCallableOptionsWithLimits({
    ...publicCallableLimits,
    memory: "512MiB",
  }),
  (request) => getPublicOrganizerFormHandler(request)
);

export const beginOrganizerFormResponse = onCall(
  appCheckCallableOptionsWithLimits({
    ...publicCallableLimits,
    memory: "512MiB",
  }),
  (request) => beginOrganizerFormResponseHandler(request)
);

export const saveOrganizerFormResponseDraft = onCall(
  appCheckCallableOptionsWithLimits(publicCallableLimits),
  (request) => saveOrganizerFormResponseDraftHandler(request)
);

export const createOrganizerFormAssetIntent = onCall(
  appCheckCallableOptionsForFormUpload(publicCallableLimits),
  (request) => createOrganizerFormAssetIntentHandler(request)
);

export const finalizeOrganizerFormAsset = onCall(
  appCheckCallableOptionsWithLimits({
    ...publicCallableLimits,
    memory: "512MiB",
  }),
  (request) => finalizeOrganizerFormAssetHandler(request)
);

export const submitOrganizerFormResponse = onCall(
  appCheckCallableOptionsWithLimits(publicCallableLimits),
  (request) => submitOrganizerFormResponseHandler(request)
);

export const withdrawOrganizerFormResponse = onCall(
  appCheckCallableOptionsWithLimits(publicCallableLimits),
  (request) => withdrawOrganizerFormResponseHandler(request)
);

export const createOrganizerFormShareLink = onCall(
  appCheckCallableOptionsWithLimits(publicCallableLimits),
  (request) => createOrganizerFormShareLinkHandler(request)
);

export const getOrganizerFormShareAssets = onCall(
  appCheckCallableOptionsWithLimits(publicCallableLimits),
  (request) => getOrganizerFormShareAssetsHandler(request)
);
