import {redactResponseSummary} from "../hostReadModels/responseRedaction";
import {responseSummaryId} from "../hostReadModels/responseIds";
import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {GetParticipantOrganizerApplicationFormCallablePayload} from
  "../shared/generated/getParticipantOrganizerApplicationFormCallablePayload";
import type {GetParticipantOrganizerApplicationFormCallableResponse} from
  "../shared/generated/getParticipantOrganizerApplicationFormCallableResponse";
import type {RevokeParticipantOrganizerDataGrantCallablePayload} from
  "../shared/generated/revokeParticipantOrganizerDataGrantCallablePayload";
import type {RevokeParticipantOrganizerDataGrantCallableResponse} from
  "../shared/generated/revokeParticipantOrganizerDataGrantCallableResponse";
import type {SubmitParticipantOrganizerApplicationCallablePayload} from
  "../shared/generated/submitParticipantOrganizerApplicationCallablePayload";
import type {SubmitParticipantOrganizerApplicationCallableResponse} from
  "../shared/generated/submitParticipantOrganizerApplicationCallableResponse";
import type {
  OrganizerApplicationDocument,
  OrganizerApplicationAssetDocument,
  OrganizerApplicationFormDocument,
  OrganizerApplicationFormVersionDocument,
  OrganizerApplicationResponseDocument,
  ParticipantIntakeProfileDocument,
  ParticipantOrganizerDataGrantDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  validateGetParticipantOrganizerApplicationFormCallablePayload,
} from
  "../shared/generated/validators/getParticipantOrganizerApplicationFormInput";
import {
  validateRevokeParticipantOrganizerDataGrantCallablePayload,
} from
  "../shared/generated/validators/revokeParticipantOrganizerDataGrantInput";
import {
  validateSubmitParticipantOrganizerApplicationCallablePayload,
} from
  "../shared/generated/validators/submitParticipantOrganizerApplicationInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";

type Question = OrganizerApplicationFormVersionDocument["questions"][number];
type Answer = OrganizerApplicationResponseDocument["answers"][number];
type AnswerValue = Answer["value"];
type CanonicalFieldId = NonNullable<Question["canonicalFieldId"]>;
type Suggestion = GetParticipantOrganizerApplicationFormCallableResponse[
  "questions"
][number]["suggestion"];

interface ParticipantApplicationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ParticipantApplicationDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
};

/**
 * Authentication proves which participant owns the private suggestions. It
 * does not grant an organizer access to any of those values.
 */
export async function getParticipantOrganizerApplicationFormHandler(
  request: CallableRequest<unknown>,
  deps: ParticipantApplicationDeps = defaultDeps
): Promise<GetParticipantOrganizerApplicationFormCallableResponse> {
  const uid = requireAuth(request);
  const verifiedPhone = requireVerifiedPhone(request);
  const data = validateCallableWithAjv<
    GetParticipantOrganizerApplicationFormCallablePayload
  >(
    request,
    validateGetParticipantOrganizerApplicationFormCallablePayload,
    normalizeParticipantFormPayload
  );
  assertTarget(data.targetKind, data.targetId);
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    uid,
    "getParticipantOrganizerApplicationForm",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const {form, version} = await requireActiveParticipantForm({
    db,
    organizerId: data.organizerId,
    formId: data.formId,
  });
  if (form.defaultTargetKind !== data.targetKind) {
    throw new HttpsError("failed-precondition", "Application target mismatch.");
  }
  await requireTargetBelongsToOrganizer({
    db,
    organizerId: data.organizerId,
    targetKind: data.targetKind,
    targetId: data.targetId,
  });
  const [intakeSnap, profileSnap] = await Promise.all([
    db.collection("participantIntakeProfiles").doc(uid).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const intake = intakeSnap.data() as
    ParticipantIntakeProfileDocument | undefined;
  const profile = profileSnap.data() as UserProfileDocument | undefined;
  const now = deps.timestamp();
  return {
    organizerId: data.organizerId,
    formId: data.formId,
    formVersionId: form.activeVersionId!,
    targetKind: data.targetKind,
    targetId: data.targetId,
    title: version.title,
    description: version.description,
    questions: version.questions.map((question) => ({
      question,
      suggestion: participantSuggestion({
        question,
        intake,
        profile,
        verifiedPhone,
        now,
      }),
    })),
    consentCopy: version.consentCopy,
    consentVersion: version.consentVersion,
    retentionCopy: version.retentionCopy,
  };
}

/** Creates one immutable response snapshot and one exact, revocable grant. */
export async function submitParticipantOrganizerApplicationHandler(
  request: CallableRequest<unknown>,
  deps: ParticipantApplicationDeps = defaultDeps
): Promise<SubmitParticipantOrganizerApplicationCallableResponse> {
  const uid = requireAuth(request);
  requireVerifiedPhone(request);
  const data = validateCallableWithAjv<
    SubmitParticipantOrganizerApplicationCallablePayload
  >(
    request,
    validateSubmitParticipantOrganizerApplicationCallablePayload,
    normalizeParticipantSubmissionPayload
  );
  assertTarget(data.targetKind, data.targetId);
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    uid,
    "submitParticipantOrganizerApplication",
    {maxRequests: 10, windowMs: 60 * 60 * 1000}
  );
  const {form, version} = await requireActiveParticipantForm({
    db,
    organizerId: data.organizerId,
    formId: data.formId,
  });
  if (form.activeVersionId !== data.formVersionId ||
      form.defaultTargetKind !== data.targetKind ||
      version.consentVersion !== data.consentVersion) {
    throw new HttpsError(
      "aborted",
      "This application form changed. Review the current form and try again."
    );
  }
  await requireTargetBelongsToOrganizer({
    db,
    organizerId: data.organizerId,
    targetKind: data.targetKind,
    targetId: data.targetId,
  });
  const answers = prepareReviewedNativeAnswers({
    inputs: data.answers,
    questions: version.questions,
    reviewedQuestionIds: data.reviewedQuestionIds,
  });
  const displayName = applicationDisplayName(answers) ?? "Catch applicant";
  const fieldsToSave = reviewedIntakeFields({
    answers,
    questions: version.questions,
    canonicalFieldIds: data.saveToIntakeCanonicalFieldIds,
  });
  const applicationId = participantApplicationId(
    data.organizerId,
    uid,
    data.submissionKey
  );
  const responseId = `${applicationId}_r1`;
  const grantId = participantOrganizerGrantId(applicationId);
  await requireSubmittedAssets({
    db,
    organizerId: data.organizerId,
    applicationId,
    responseId,
    participantUid: uid,
    answers,
  });
  const applicationRef = db.collection("organizerApplications")
    .doc(applicationId);
  const responseRef = db.collection("organizerApplicationResponses")
    .doc(responseId);
  const grantRef = db.collection("participantOrganizerDataGrants")
    .doc(grantId);
  const intakeRef = db.collection("participantIntakeProfiles").doc(uid);
  const now = deps.timestamp();
  const source: OrganizerApplicationDocument["source"] = {
    kind: "native",
    providerId: null,
    externalFormId: null,
    externalResponseId: null,
    importReceiptId: null,
  };
  return db.runTransaction(async (tx) => {
    const [applicationSnap, responseSnap, grantSnap, intakeSnap] =
      await Promise.all([
        tx.get(applicationRef),
        tx.get(responseRef),
        tx.get(grantRef),
        tx.get(intakeRef),
      ]);
    if (applicationSnap.exists || responseSnap.exists || grantSnap.exists) {
      const application = applicationSnap.data() as
        OrganizerApplicationDocument | undefined;
      const response = responseSnap.data() as
        OrganizerApplicationResponseDocument | undefined;
      const grant = grantSnap.data() as
        ParticipantOrganizerDataGrantDocument | undefined;
      if (!application || !response || !grant ||
          application.organizerId !== data.organizerId ||
          application.linkedUid !== uid ||
          response.linkedUid !== uid ||
          grant.participantUid !== uid ||
          grant.revokedAt !== null ||
          JSON.stringify(response.answers) !== JSON.stringify(answers)) {
        throw new HttpsError(
          "failed-precondition",
          "This submission key was already used for different application data."
        );
      }
      const existingIntake = intakeSnap.data() as
        ParticipantIntakeProfileDocument | undefined;
      return {
        organizerId: data.organizerId,
        applicationId,
        responseId,
        grantId,
        reviewStatus: "submitted" as const,
        intakeProfileRevision: existingIntake?.revision ?? null,
        replayed: true,
      };
    }
    const application: OrganizerApplicationDocument = {
      organizerId: data.organizerId,
      formId: data.formId,
      formVersionId: data.formVersionId,
      targetKind: data.targetKind,
      targetId: data.targetId,
      linkedUid: uid,
      contactId: null,
      applicantDisplayName: displayName,
      applicantDisplayNameNormalized: normalizeSearch(displayName),
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
      linkedUid: uid,
      answers,
      source,
      consentVersion: version.consentVersion,
      grantId,
      submittedAt: now,
    };
    const grant: ParticipantOrganizerDataGrantDocument = {
      participantUid: uid,
      organizerId: data.organizerId,
      applicationId,
      responseId,
      formVersionId: data.formVersionId,
      purpose: "organizerApplicationReview",
      grantedQuestionIds: answers.map((answer) => answer.questionId),
      grantedCanonicalFieldIds: [...new Set(answers
        .map((answer) => answer.canonicalFieldId)
        .filter((field): field is CanonicalFieldId => field !== null))],
      consentVersion: version.consentVersion,
      consentCopyHash: sha256(version.consentCopy),
      grantedAt: now,
      revokedAt: null,
    };
    tx.create(applicationRef, application);
    tx.create(responseRef, response);
    tx.create(grantRef, grant);
    let intakeProfileRevision: number | null = null;
    if (fieldsToSave.length > 0) {
      const existing = intakeSnap.data() as
        ParticipantIntakeProfileDocument | undefined;
      const fieldById = new Map((existing?.fields ?? []).map((field) => [
        field.canonicalFieldId,
        field,
      ]));
      for (const field of fieldsToSave) {
        fieldById.set(field.canonicalFieldId, {
          canonicalFieldId: field.canonicalFieldId,
          value: field.value,
          sourceApplicationId: applicationId,
          reviewedByParticipantAt: now,
          updatedAt: now,
        });
      }
      intakeProfileRevision = (existing?.revision ?? 0) + 1;
      const intake: ParticipantIntakeProfileDocument = {
        fields: [...fieldById.values()].sort((left, right) =>
          left.canonicalFieldId.localeCompare(right.canonicalFieldId)
        ),
        revision: intakeProfileRevision,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      tx.set(intakeRef, intake);
    }
    return {
      organizerId: data.organizerId,
      applicationId,
      responseId,
      grantId,
      reviewStatus: "submitted" as const,
      intakeProfileRevision,
      replayed: false,
    };
  });
}

/** Revokes Host answer access while retaining the platform audit snapshot. */
export async function revokeParticipantOrganizerDataGrantHandler(
  request: CallableRequest<unknown>,
  deps: ParticipantApplicationDeps = defaultDeps
): Promise<RevokeParticipantOrganizerDataGrantCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    RevokeParticipantOrganizerDataGrantCallablePayload
  >(
    request,
    validateRevokeParticipantOrganizerDataGrantCallablePayload,
    normalizeParticipantRevocationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    uid,
    "revokeParticipantOrganizerDataGrant",
    {maxRequests: 10, windowMs: 60 * 60 * 1000}
  );
  const grantRef = db.collection("participantOrganizerDataGrants")
    .doc(participantOrganizerGrantId(data.applicationId));
  const applicationRef = db.collection("organizerApplications")
    .doc(data.applicationId);
  const now = deps.timestamp();
  const summaryRef = db.collection("hostResponseSummaries")
    .doc(responseSummaryId("application", data.applicationId));
  return db.runTransaction(async (tx) => {
    const [grantSnap, applicationSnap, summarySnap] = await Promise.all([
      tx.get(grantRef),
      tx.get(applicationRef), tx.get(summaryRef),
    ]);
    const grant = grantSnap.data() as
      ParticipantOrganizerDataGrantDocument | undefined;
    const application = applicationSnap.data() as
      OrganizerApplicationDocument | undefined;
    if (!grant || !application || grant.participantUid !== uid ||
        application.linkedUid !== uid ||
        grant.organizerId !== data.organizerId ||
        application.organizerId !== data.organizerId) {
      throw new HttpsError("not-found", "Application grant not found.");
    }
    // Privacy removal is part of revocation, including idempotent replays.
    const redacted = redactResponseSummary(summarySnap.data(),
      data.organizerId, "application", data.applicationId,
      grant.revokedAt?.toMillis() ?? now.toMillis());
    const removeIdentity = () => {
      if (redacted) tx.set(summaryRef, redacted);
      else tx.delete(summaryRef);
    };
    if (grant.revokedAt !== null) {
      removeIdentity();
      return {
        organizerId: data.organizerId,
        applicationId: data.applicationId,
        revokedAtMillis: grant.revokedAt.toMillis(),
        revision: application.revision,
        replayed: true,
      };
    }
    if (application.revision !== data.expectedRevision) {
      throw new HttpsError(
        "aborted",
        "This application changed. Reload it before revoking access."
      );
    }
    const revision = application.revision + 1;
    removeIdentity();
    tx.update(grantRef, {revokedAt: now});
    tx.update(applicationRef, {
      reviewStatus: "withdrawn",
      revision,
      updatedAt: now,
    });
    return {
      organizerId: data.organizerId,
      applicationId: data.applicationId,
      revokedAtMillis: now.toMillis(),
      revision,
      replayed: false,
    };
  });
}

export function participantOrganizerGrantId(applicationId: string): string {
  return `${applicationId}_grant`;
}

export function hostVisibleApplicationAnswers(params: {
  response: OrganizerApplicationResponseDocument;
  responseId: string;
  grant: ParticipantOrganizerDataGrantDocument | undefined;
}): {answers: Answer[]; accessState:
  "organizerImported" | "activeParticipantGrant" |
  "revokedParticipantGrant"} {
  if (params.response.source.kind !== "native") {
    return {answers: params.response.answers, accessState: "organizerImported"};
  }
  const grant = params.grant;
  if (!grant || grant.revokedAt !== null ||
      grant.applicationId !== params.response.applicationId ||
      grant.responseId !== params.responseId ||
      grant.organizerId !== params.response.organizerId ||
      grant.participantUid !== params.response.linkedUid ||
      grant.purpose !== "organizerApplicationReview" ||
      params.response.grantId !==
        participantOrganizerGrantId(params.response.applicationId)) {
    return {answers: [], accessState: "revokedParticipantGrant"};
  }
  const questionIds = new Set(grant.grantedQuestionIds);
  const canonicalIds = new Set(grant.grantedCanonicalFieldIds);
  return {
    answers: params.response.answers.filter((answer) =>
      questionIds.has(answer.questionId) &&
      (answer.canonicalFieldId === null ||
        canonicalIds.has(answer.canonicalFieldId))
    ),
    accessState: "activeParticipantGrant",
  };
}

export function prepareReviewedNativeAnswers(params: {
  inputs: SubmitParticipantOrganizerApplicationCallablePayload["answers"];
  questions: Question[];
  reviewedQuestionIds: string[];
}): Answer[] {
  const questionIds = params.questions.map((question) => question.questionId);
  const reviewedIds = [...params.reviewedQuestionIds].sort();
  if (JSON.stringify([...questionIds].sort()) !== JSON.stringify(reviewedIds)) {
    throw new HttpsError(
      "invalid-argument",
      "Review every question in the current form before submitting."
    );
  }
  const inputById = new Map<string,
    SubmitParticipantOrganizerApplicationCallablePayload["answers"][number]>();
  for (const input of params.inputs) {
    if (inputById.has(input.questionId)) {
      throw new HttpsError("invalid-argument", "Answer each question once.");
    }
    inputById.set(input.questionId, input);
  }
  if (inputById.size !== params.questions.length) {
    throw new HttpsError(
      "invalid-argument",
      "Submit one reviewed answer for every question in the current form."
    );
  }
  return params.questions.map((question) => {
    const input = inputById.get(question.questionId);
    if (!input) {
      throw new HttpsError("invalid-argument", "Application answer missing.");
    }
    assertAnswerMatchesQuestion(question, input.value);
    return {
      questionId: question.questionId,
      questionKey: question.key,
      questionLabel: question.label,
      questionKind: question.kind,
      canonicalFieldId: question.canonicalFieldId,
      privacyClass: question.privacyClass,
      hostPresentation: question.hostPresentation,
      value: input.value,
    };
  });
}

function reviewedIntakeFields(params: {
  answers: Answer[];
  questions: Question[];
  canonicalFieldIds: CanonicalFieldId[];
}): Array<{canonicalFieldId: CanonicalFieldId; value: AnswerValue}> {
  const questionByCanonicalId = new Map(params.questions
    .filter((question): question is Question & {
      canonicalFieldId: CanonicalFieldId
    } => question.canonicalFieldId !== null)
    .map((question) => [question.canonicalFieldId, question]));
  const answerByCanonicalId = new Map(params.answers
    .filter((answer): answer is Answer & {
      canonicalFieldId: CanonicalFieldId
    } => answer.canonicalFieldId !== null)
    .map((answer) => [answer.canonicalFieldId, answer]));
  return params.canonicalFieldIds.map((canonicalFieldId) => {
    const question = questionByCanonicalId.get(canonicalFieldId);
    const answer = answerByCanonicalId.get(canonicalFieldId);
    if (!question || !answer ||
        question.prefillPolicy !== "participantReviewRequired" ||
        isEmptyValue(answer.value) || answer.value.valueKind === "assets") {
      throw new HttpsError(
        "invalid-argument",
        `Field ${canonicalFieldId} cannot be saved as reusable intake data.`
      );
    }
    return {canonicalFieldId, value: answer.value};
  });
}

function participantSuggestion(params: {
  question: Question;
  intake: ParticipantIntakeProfileDocument | undefined;
  profile: UserProfileDocument | undefined;
  verifiedPhone: string;
  now: FirebaseFirestore.Timestamp;
}): Suggestion {
  const fieldId = params.question.canonicalFieldId;
  if (!fieldId ||
      params.question.prefillPolicy !== "participantReviewRequired") {
    return null;
  }
  const portable = params.intake?.fields.find((field) =>
    field.canonicalFieldId === fieldId && field.value.valueKind !== "assets"
  );
  if (portable && answerMatchesQuestion(params.question, portable.value)) {
    return reviewRequiredSuggestion(portable.value, "portableIntake");
  }
  if (fieldId === "phoneNumber") {
    const value = answerValue({
      valueKind: "text",
      textValue: params.verifiedPhone,
    });
    return answerMatchesQuestion(params.question, value) ?
      reviewRequiredSuggestion(value, "verifiedAuth") : null;
  }
  const value = privateProfileValue(fieldId, params.profile, params.now);
  return value && answerMatchesQuestion(params.question, value) ?
    reviewRequiredSuggestion(value, "privateProfile") : null;
}

function privateProfileValue(
  fieldId: CanonicalFieldId,
  profile: UserProfileDocument | undefined,
  now: FirebaseFirestore.Timestamp
): AnswerValue | null {
  if (!profile || profile.deleted === true) return null;
  const text = (value: unknown): AnswerValue | null =>
    typeof value === "string" && value.trim() ?
      answerValue({valueKind: "text", textValue: value.trim()}) : null;
  const options = (value: unknown): AnswerValue | null => {
    const values = Array.isArray(value) ? value.filter((item): item is string =>
      typeof item === "string" && item.length > 0
    ) : typeof value === "string" && value.length > 0 ? [value] : [];
    return values.length > 0 ? answerValue({
      valueKind: "options",
      optionValues: values,
    }) : null;
  };
  switch (fieldId) {
  case "givenName": return text(profile.firstName);
  case "familyName": return text(profile.lastName);
  case "displayName": return text(profile.displayName);
  case "dateOfBirth": return !profile.dateOfBirth ? null : answerValue({
    valueKind: "date",
    dateValue: profile.dateOfBirth.toDate().toISOString().slice(0, 10),
  });
  case "age": return !profile.dateOfBirth ? null : answerValue({
    valueKind: "number",
    numberValue: ageAt(profile.dateOfBirth.toDate(), now.toDate()),
  });
  case "gender": return options(profile.gender);
  case "email": return text(profile.email);
  case "instagramHandle": return text(profile.instagramHandle);
  case "city": return text(profile.city);
  case "heightCm": return typeof profile.height === "number" ? answerValue({
    valueKind: "number", numberValue: profile.height,
  }) : null;
  case "occupation": return text(profile.occupation);
  case "company": return text(profile.company);
  case "education": return options(profile.education);
  case "languages": return options(profile.languages);
  case "relationshipGoal": return options(profile.relationshipGoal);
  case "interestedInGenders": return options(profile.interestedInGenders);
  case "drinking": return options(profile.drinking);
  case "smoking": return options(profile.smoking);
  case "religion": return options(profile.religion);
  case "workout": return options(profile.workout);
  case "diet": return options(profile.diet);
  case "children": return options(profile.children);
  case "phoneNumber":
  case "linkedinUrl":
  case "profilePhoto":
    return null;
  }
}

function assertAnswerMatchesQuestion(
  question: Question,
  value: AnswerValue
): void {
  if (!answerMatchesQuestion(question, value)) {
    throw new HttpsError(
      "invalid-argument",
      `Answer for ${question.questionId} does not match the published question.`
    );
  }
  if (question.required && isEmptyValue(value)) {
    throw new HttpsError(
      "invalid-argument",
      `Answer ${question.questionId} is required.`
    );
  }
}

function answerMatchesQuestion(
  question: Question,
  value: AnswerValue
): boolean {
  if (!answerValueShapeIsCanonical(value)) return false;
  if (isEmptyValue(value)) return !question.required;
  const expectedKinds: Record<Question["kind"], AnswerValue["valueKind"][]> = {
    shortText: ["text"],
    longText: ["text"],
    singleChoice: ["options"],
    multiChoice: ["options"],
    date: ["date"],
    phone: ["text"],
    email: ["text"],
    url: ["text"],
    number: ["number"],
    boolean: ["boolean"],
    file: ["assets"],
  };
  if (!expectedKinds[question.kind].includes(value.valueKind)) return false;
  if (question.kind === "phone" && !normalizeE164(value.textValue ?? "")) {
    return false;
  }
  if (question.kind === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.textValue ?? "")) {
    return false;
  }
  if (question.kind === "url") {
    try {
      const url = new URL(value.textValue ?? "");
      if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    } catch {
      return false;
    }
  }
  if (question.kind === "singleChoice" && value.optionValues.length !== 1) {
    return false;
  }
  if (question.kind === "singleChoice" || question.kind === "multiChoice") {
    const allowed = new Set(question.options.map((option) => option.value));
    if (new Set(value.optionValues).size !== value.optionValues.length ||
        value.optionValues.some((option) => !allowed.has(option))) return false;
  }
  return true;
}

function answerValueShapeIsCanonical(value: AnswerValue): boolean {
  const noText = value.textValue === null;
  const noNumber = value.numberValue === null;
  const noBoolean = value.booleanValue === null;
  const noDate = value.dateValue === null;
  const noOptions = value.optionValues.length === 0;
  const noAssets = value.assetIds.length === 0;
  switch (value.valueKind) {
  case "empty":
    return noText && noNumber && noBoolean && noDate && noOptions && noAssets;
  case "text":
    return typeof value.textValue === "string" &&
      value.textValue.trim().length > 0 && noNumber && noBoolean && noDate &&
      noOptions && noAssets;
  case "number":
    return typeof value.numberValue === "number" && Number.isFinite(
      value.numberValue
    ) && noText && noBoolean && noDate && noOptions && noAssets;
  case "boolean":
    return typeof value.booleanValue === "boolean" && noText && noNumber &&
      noDate && noOptions && noAssets;
  case "date":
    return typeof value.dateValue === "string" &&
      /^\d{4}-\d{2}-\d{2}$/u.test(value.dateValue) && noText && noNumber &&
      noBoolean && noOptions && noAssets;
  case "options":
    return value.optionValues.length > 0 && noText && noNumber && noBoolean &&
      noDate && noAssets;
  case "assets":
    return value.assetIds.length > 0 && noText && noNumber && noBoolean &&
      noDate && noOptions;
  }
}

function isEmptyValue(value: AnswerValue): boolean {
  return value.valueKind === "empty";
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

function reviewRequiredSuggestion(
  value: AnswerValue,
  source: NonNullable<Suggestion>["source"]
): NonNullable<Suggestion> {
  return {value, source, requiresParticipantReview: true};
}

async function requireActiveParticipantForm(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  formId: string;
}): Promise<{form: OrganizerApplicationFormDocument;
  version: OrganizerApplicationFormVersionDocument}> {
  const formSnap = await params.db.collection("organizerApplicationForms")
    .doc(params.formId).get();
  if (!formSnap.exists) {
    throw new HttpsError("not-found", "Application form not found.");
  }
  const form = requireDoc<OrganizerApplicationFormDocument>(
    formSnap,
    "OrganizerApplicationFormDocument"
  );
  if (form.organizerId !== params.organizerId ||
      form.status !== "published" || !form.activeVersionId) {
    throw new HttpsError("not-found", "Application form not found.");
  }
  const versionSnap = await params.db
    .collection("organizerApplicationFormVersions")
    .doc(form.activeVersionId).get();
  if (!versionSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Application form unavailable."
    );
  }
  const version = requireDoc<OrganizerApplicationFormVersionDocument>(
    versionSnap,
    "OrganizerApplicationFormVersionDocument"
  );
  if (version.organizerId !== params.organizerId ||
      version.formId !== params.formId || version.state !== "published") {
    throw new HttpsError(
      "failed-precondition",
      "Application form unavailable."
    );
  }
  return {form, version};
}

async function requireSubmittedAssets(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  applicationId: string;
  responseId: string;
  participantUid: string;
  answers: Answer[];
}): Promise<void> {
  const references = params.answers.flatMap((answer) =>
    answer.value.assetIds.map((assetId) => ({
      assetId,
      questionId: answer.questionId,
    }))
  );
  if (references.length === 0) return;
  const snapshots = await params.db.getAll(...references.map((reference) =>
    params.db.collection("organizerApplicationAssets").doc(reference.assetId)
  ));
  for (let index = 0; index < snapshots.length; index += 1) {
    const asset = snapshots[index].data() as
      OrganizerApplicationAssetDocument | undefined;
    const reference = references[index];
    if (!asset || asset.organizerId !== params.organizerId ||
        asset.applicationId !== params.applicationId ||
        asset.responseId !== params.responseId ||
        asset.questionId !== reference.questionId ||
        asset.uploadedByUid !== params.participantUid ||
        asset.status !== "ready" || asset.deletedAt !== null) {
      throw new HttpsError(
        "failed-precondition",
        "One application upload is not ready for this submission."
      );
    }
  }
}

async function requireTargetBelongsToOrganizer(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  targetKind: "organizer" | "event" | "campaign";
  targetId: string | null;
}): Promise<void> {
  if (params.targetKind === "organizer") return;
  const collection = params.targetKind === "event" ?
    "events" : "organizerCampaigns";
  const snap = await params.db.collection(collection)
    .doc(params.targetId!).get();
  const row = snap.data() as Record<string, unknown> | undefined;
  const organizerId = row?.organizerId;
  if (!row || organizerId !== params.organizerId) {
    throw new HttpsError("not-found", "Application target not found.");
  }
}

function requireVerifiedPhone(request: CallableRequest<unknown>): string {
  const raw = request.auth?.token.phone_number;
  const phone = normalizeE164(typeof raw === "string" ? raw : "");
  if (!phone) {
    throw new HttpsError(
      "failed-precondition",
      "Verify your phone number before opening this application."
    );
  }
  return phone;
}

function assertTarget(
  kind: "organizer" | "event" | "campaign",
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

function applicationDisplayName(answers: Answer[]): string | null {
  const canonicalText = (id: Answer["canonicalFieldId"]): string | null =>
    answers.find((answer) => answer.canonicalFieldId === id)
      ?.value.textValue?.trim() || null;
  const displayName = canonicalText("displayName");
  if (displayName) return displayName.slice(0, 160);
  const name = [canonicalText("givenName"), canonicalText("familyName")]
    .filter(Boolean).join(" ").trim();
  return name ? name.slice(0, 160) : null;
}

function participantApplicationId(
  organizerId: string,
  uid: string,
  submissionKey: string
): string {
  return createHash("sha256")
    .update(["native_application", organizerId, uid, submissionKey]
      .join("\u001f"))
    .digest("hex").slice(0, 48);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeE164(value: string): string | null {
  const normalized = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(normalized) ? normalized : null;
}

function ageAt(birthDate: Date, currentDate: Date): number {
  let age = currentDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday = currentDate.getUTCMonth() < birthDate.getUTCMonth() ||
    (currentDate.getUTCMonth() === birthDate.getUTCMonth() &&
      currentDate.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizeParticipantFormPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    organizerId: normalizedString(value.organizerId),
    formId: normalizedString(value.formId),
    targetId: normalizedNullableString(value.targetId),
  };
}

function normalizeParticipantSubmissionPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    organizerId: normalizedString(value.organizerId),
    formId: normalizedString(value.formId),
    formVersionId: normalizedString(value.formVersionId),
    targetId: normalizedNullableString(value.targetId),
    submissionKey: normalizedString(value.submissionKey),
    consentVersion: normalizedString(value.consentVersion),
  };
}

function normalizeParticipantRevocationPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    organizerId: normalizedString(value.organizerId),
    applicationId: normalizedString(value.applicationId),
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

export const getParticipantOrganizerApplicationForm = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 40}),
  (request) => getParticipantOrganizerApplicationFormHandler(request)
);

export const submitParticipantOrganizerApplication = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 40}),
  (request) => submitParticipantOrganizerApplicationHandler(request)
);

export const revokeParticipantOrganizerDataGrant = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 40}),
  (request) => revokeParticipantOrganizerDataGrantHandler(request)
);
