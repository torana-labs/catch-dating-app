import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import type {EventDocument, EventSuccessPlanDocument,
  OrganizerFormDocument as Form,
  OrganizerFormResponseDocument as Response,
  OrganizerFormVersionDocument as Version,
  EventAssignmentFeatureConsentDocument as Consent} from
  "../shared/generated/firestoreAdminTypes";
import type {
  ConfigureEventAssignmentFeaturesCallablePayload as ConfigInput} from
  "../shared/generated/configureEventAssignmentFeaturesCallablePayload";
import type {
  ConfigureEventAssignmentFeaturesCallableResponse as ConfigResult} from
  "../shared/generated/configureEventAssignmentFeaturesCallableResponse";
import type {
  PreviewEventAssignmentFeaturesCallablePayload as PreviewInput} from
  "../shared/generated/previewEventAssignmentFeaturesCallablePayload";
import type {
  PreviewEventAssignmentFeaturesCallableResponse as PreviewResult} from
  "../shared/generated/previewEventAssignmentFeaturesCallableResponse";
import type {
  ListEventAssignmentFeatureChoicesCallablePayload as ChoicesInput} from
  "../shared/generated/listEventAssignmentFeatureChoicesCallablePayload";
import type {
  ListEventAssignmentFeatureChoicesCallableResponse as ChoicesResult} from
  "../shared/generated/listEventAssignmentFeatureChoicesCallableResponse";
import type {
  SetEventAssignmentFeatureConsentCallablePayload as ConsentInput} from
  "../shared/generated/setEventAssignmentFeatureConsentCallablePayload";
import type {
  SetEventAssignmentFeatureConsentCallableResponse as ConsentResult} from
  "../shared/generated/setEventAssignmentFeatureConsentCallableResponse";
import {validateConfigureEventAssignmentFeaturesCallablePayload} from
  "../shared/generated/validators/configureEventAssignmentFeaturesInput";
import {validatePreviewEventAssignmentFeaturesCallablePayload} from
  "../shared/generated/validators/previewEventAssignmentFeaturesInput";
import {validateListEventAssignmentFeatureChoicesCallablePayload} from
  "../shared/generated/validators/listEventAssignmentFeatureChoicesInput";
import {validateSetEventAssignmentFeatureConsentCallablePayload} from
  "../shared/generated/validators/setEventAssignmentFeatureConsentInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {eventOrganizerRef, isEventOrganizerManager,
  requireEventOrganizer} from "../shared/eventOrganizers";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {loadEventSuccessRoster,
  loadEventSuccessRosterParticipant} from "./eventSuccessRoster";
import {assignmentFeatureConsentId, assignmentFeatureRuleMatchesVersion,
  authorizedAssignmentFeatureSnapshot,
  loadAuthorizedAssignmentFeatures,
  readAssignmentFeatureConsent} from "./assignmentFeatureConsent";
import {type AssignmentFeatureRule, type AssignmentFeatureValue,
  buildAssignmentFeatureScoringContext,
  normalizeAssignmentFeature,
  validateAssignmentFeatureRules} from "./assignmentFeatureScoring";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(), rateLimit: checkRateLimit};
const hash = (text: string) => createHash("sha256").update(text)
  .digest("hex");

/** Own-answer choices and old grants remain visible for withdrawal. */
export async function listEventAssignmentFeatureChoicesHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults
): Promise<ChoicesResult> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<ChoicesInput>(request,
    validateListEventAssignmentFeatureChoicesCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listEventAssignmentFeatureChoices", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const consentSnap = await db.collection("eventAssignmentFeatureConsents")
    .where("eventId", "==", data.eventId)
    .where("uid", "==", uid).limit(1001).get();
  if (consentSnap.size > 1000) {
    throw new HttpsError("failed-precondition",
      "Too many matching decisions to list safely.");
  }
  const decisions = new Map(consentSnap.docs.map((snap) => {
    const decision = readAssignmentFeatureConsent(snap);
    if (decision.eventId !== data.eventId || decision.uid !== uid ||
        snap.id !== assignmentFeatureConsentId(data.eventId, uid,
          decision.featureId)) throw unavailable();
    return [decision.featureId, decision];
  }));
  const choices: ChoicesResult["choices"] = [];
  const phone = request.auth?.token.phone_number;
  const isPhoneVerified = typeof phone === "string" &&
    /^\+[1-9][0-9]{6,14}$/u.test(phone);
  if (isPhoneVerified && await loadEventSuccessRosterParticipant(
    db, data.eventId, uid)) {
    const [eventSnap, planSnap] = await Promise.all([
      db.collection("events").doc(data.eventId).get(),
      db.collection("eventSuccessPlans").doc(data.eventId).get(),
    ]);
    if (eventSnap.exists && planSnap.exists) {
      const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
      const plan = requireDoc<EventSuccessPlanDocument>(planSnap,
        "EventSuccessPlanDocument");
      const organizerId = event.organizerId;
      const rules = validateAssignmentFeatureRules(
        plan.assignmentFeatureRules ?? []);
      if (plan.eventId === data.eventId && plan.organizerId === event.organizerId &&
          event.status !== "cancelled") {
        const versionIds = [...new Set(rules.map((rule) =>
          rule.versionId))];
        const versionSnaps = await Promise.all(versionIds.map((id) =>
          db.collection("organizerFormVersions").doc(id).get()));
        const versions = new Map(versionSnaps.filter((snap) => snap.exists)
          .map((snap) => [snap.id, requireDoc<Version>(snap,
            "OrganizerFormVersionDocument")]));
        const formIds = [...new Set(rules.map((rule) => rule.formId))];
        for (const formId of formIds) {
          const responses = await db.collection("organizerFormResponses")
            .where("formId", "==", formId)
            .where("respondentUid", "==", uid)
            .orderBy("submittedAt", "desc").limit(20).get();
          for (const responseSnap of responses.docs) {
            const response = requireDoc<Response>(responseSnap,
              "OrganizerFormResponseDocument");
            if (response.respondentUid !== uid ||
                response.identityKind !== "phoneVerified" ||
                response.identity.phoneE164 !== phone ||
                response.status !== "submitted" ||
                response.withdrawnAt !== null ||
                response.organizerId !== organizerId) continue;
            for (const rule of rules.filter((item) =>
              item.formId === formId &&
              item.versionId === response.versionId)) {
              const version = versions.get(rule.versionId);
              if (!version || !assignmentFeatureRuleMatchesVersion(rule,
                rule.versionId, version, organizerId)) continue;
              const candidate = {eventId: data.eventId, organizerId, uid,
                responseId: responseSnap.id, featureId: rule.featureId,
                formId: rule.formId, versionId: rule.versionId,
                questionId: rule.questionId,
                transformVersion: rule.transformVersion,
                purpose: "eventAssignmentMatching" as const,
                status: "granted" as const,
                receiptId: "preview"};
              const snapshot = authorizedAssignmentFeatureSnapshot({
                eventId: data.eventId, organizerId, uid, rule,
                decision: candidate, responseId: responseSnap.id,
                response, versionId: rule.versionId, version});
              if (!snapshot || !normalizeAssignmentFeature(rule, snapshot,
                {eventId: data.eventId, organizerId, uid})) continue;
              const question = version.definition.sections.flatMap((s) =>
                s.questions).find((q) => q.questionId === rule.questionId);
              if (!question) continue;
              const current = decisions.get(rule.featureId);
              choices.push({featureId: rule.featureId,
                responseId: responseSnap.id, questionLabel: question.label,
                answerLabel: ownAnswerLabel(snapshot.value,
                  question.options),
                status: current?.responseId === responseSnap.id ?
                  current.status : "notGranted",
                revision: current?.revision ?? 0, canGrant: true});
            }
          }
        }
      }
    }
  }
  for (const decision of decisions.values()) {
    if (choices.some((choice) => choice.featureId === decision.featureId &&
        choice.responseId === decision.responseId)) continue;
    choices.push({featureId: decision.featureId,
      responseId: decision.responseId, questionLabel: null,
      answerLabel: null, status: decision.status,
      revision: decision.revision, canGrant: false});
  }
  if (choices.length > 1000) throw unavailable();
  choices.sort((a, b) => a.featureId.localeCompare(b.featureId) ||
    a.responseId.localeCompare(b.responseId));
  return {eventId: data.eventId, choices};
}

type FormSection = Version["definition"]["sections"][number];
type FormQuestion = FormSection["questions"][number];

function ownAnswerLabel(
  value: AssignmentFeatureValue,
  options: FormQuestion["options"]
): string {
  const label = (id: string) => options.find((option) =>
    option.optionId === id)?.label ?? id;
  if (value.kind === "number") return String(value.value);
  if (value.kind === "set") {
    return value.optionIds.map(label).join(", ").slice(0, 500);
  }
  return label(value.optionId);
}

/** Manager preview returns a source catalog and aggregate coverage. */
export async function previewEventAssignmentFeaturesHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults
): Promise<PreviewResult> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<PreviewInput>(request,
    validatePreviewEventAssignmentFeaturesCallablePayload);
  const rules = validateAssignmentFeatureRules(data.rules as
    AssignmentFeatureRule[]);
  const db = deps.db();
  await deps.rateLimit(db, uid, "previewEventAssignmentFeatures", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const [eventSnap, planSnap] = await Promise.all([
    db.collection("events").doc(data.eventId).get(),
    db.collection("eventSuccessPlans").doc(data.eventId).get(),
  ]);
  if (!eventSnap.exists || !planSnap.exists) throw unavailable();
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const plan = requireDoc<EventSuccessPlanDocument>(planSnap,
    "EventSuccessPlanDocument");
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) throw unavailable();
  if (plan.eventId !== data.eventId || plan.organizerId !== event.organizerId ||
      event.status === "cancelled" ||
      plan.structureConfig?.topology === "sequence") {
    throw new HttpsError("failed-precondition",
      "Structured matching preview is unavailable for this event.");
  }
  const savedRules = validateAssignmentFeatureRules(
    plan.assignmentFeatureRules ?? []);
  const organizerId = event.organizerId;
  const formIds = [...new Set([...(data.sourceFormIds ?? []),
    ...rules.map((rule) => rule.formId)])];
  if (formIds.length > 8) throw unavailable();
  const formSnaps = await Promise.all(formIds.map((id) =>
    db.collection("organizerForms").doc(id).get()));
  const forms = new Map(formSnaps.filter((snap) => snap.exists)
    .map((snap) => [snap.id, requireDoc<Form>(snap,
      "OrganizerFormDocument")]));
  if (formIds.some((id) => forms.get(id)?.organizerId !== organizerId)) {
    throw unavailable();
  }
  const versionIds = [...new Set([...forms.values()]
    .map((form) => form.activeVersionId).filter((id): id is string =>
      typeof id === "string")
    .concat(rules.map((rule) => rule.versionId)))];
  if (versionIds.length > 8) throw unavailable();
  const versionSnaps = await Promise.all(versionIds.map((id) =>
    db.collection("organizerFormVersions").doc(id).get()));
  const versions = new Map(versionSnaps.filter((snap) => snap.exists)
    .map((snap) => [snap.id, requireDoc<Version>(snap,
      "OrganizerFormVersionDocument")]));
  if (rules.some((rule) => {
    const version = versions.get(rule.versionId);
    return !version || !assignmentFeatureRuleMatchesVersion(rule,
      rule.versionId, version, organizerId);
  })) {
    throw new HttpsError("failed-precondition",
      "A matching rule no longer maps to a published custom question.");
  }
  const sources: PreviewResult["sources"] = [];
  for (const [formId, form] of forms) {
    for (const [versionId, version] of versions) {
      if (version.formId !== formId ||
          version.organizerId !== organizerId) continue;
      const questions = version.definition.sections.flatMap((section) =>
        section.questions).filter((question) =>
        question.privacyClass === "organizerCustom" &&
        ["singleChoice", "multiChoice", "number"].includes(question.kind) &&
        question.options.length <= 40).map((question) => ({
        questionId: question.questionId, label: question.label,
        kind: question.kind as "singleChoice" | "multiChoice" | "number",
        minNumber: question.validation?.minNumber ?? null,
        maxNumber: question.validation?.maxNumber ?? null,
        options: question.options.map((option) => ({
          optionId: option.optionId, label: option.label,
        })),
      }));
      if (questions.length > 100) throw unavailable();
      sources.push({formId, formTitle: form.title, versionId,
        isActiveVersion: form.activeVersionId === versionId, questions});
    }
  }
  if (sources.length > 8) throw unavailable();
  const roster = await loadEventSuccessRoster(db, data.eventId, 1000);
  const eligibleUids = roster.filter((item) => item.status === "signedUp" ||
    item.status === "attended").map((item) => item.uid);
  if (eligibleUids.length > 1000) {
    throw new HttpsError("failed-precondition",
      "Structured matching preview supports up to 1000 roster members.");
  }
  const snapshots = await loadAuthorizedAssignmentFeatures({db,
    eventId: data.eventId, organizerId, eligibleUids, rules});
  const context = buildAssignmentFeatureScoringContext({
    eventId: data.eventId, organizerId, eligibleUids, rules, snapshots});
  const rows = rules.map((rule) => {
    const grantedCount = snapshots.filter((snapshot) =>
      snapshot.featureId === rule.featureId).length;
    const usableCount = [...context.valuesByUid.values()].filter((values) =>
      values.has(rule.featureId)).length;
    return {featureId: rule.featureId, kind: rule.kind, mode: rule.mode,
      weight: rule.weight, grantedCount, usableCount,
      missingCount: eligibleUids.length - usableCount};
  });
  return {eventId: data.eventId,
    revision: plan.assignmentFeatureRevision ?? 0,
    rosterCount: eligibleUids.length,
    coverageBasis: "currentEventRoster", sources, rows, savedRules};
}

/** Host config validates source lineage and changes no participant grant. */
export async function configureEventAssignmentFeaturesHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults
): Promise<ConfigResult> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<ConfigInput>(request,
    validateConfigureEventAssignmentFeaturesCallablePayload);
  const rules = validateAssignmentFeatureRules(data.rules as
    AssignmentFeatureRule[]);
  const db = deps.db();
  await deps.rateLimit(db, uid, "configureEventAssignmentFeatures", {
    maxRequests: 20, windowMs: 60 * 60 * 1000,
  });
  const eventRef = db.collection("events").doc(data.eventId);
  const planRef = db.collection("eventSuccessPlans").doc(data.eventId);
  const digest = hash(JSON.stringify(rules));
  return db.runTransaction(async (tx) => {
    const [eventSnap, planSnap] = await Promise.all([
      tx.get(eventRef), tx.get(planRef),
    ]);
    if (!eventSnap.exists || !planSnap.exists) throw unavailable();
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const plan = requireDoc<EventSuccessPlanDocument>(planSnap,
      "EventSuccessPlanDocument");
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, uid)) throw unavailable();
    if (event.status === "cancelled" || plan.eventId !== data.eventId ||
        plan.organizerId !== event.organizerId || plan.status !== "setup" ||
        plan.structureConfig?.topology === "sequence") {
      throw new HttpsError("failed-precondition",
        "This event cannot use structured matching configuration.");
    }
    const revision = plan.assignmentFeatureRevision ?? 0;
    if (plan.assignmentFeatureRequestId === data.requestId) {
      if (plan.assignmentFeatureConfigHash !== digest) throw unavailable();
      return {eventId: data.eventId, revision, replayed: true};
    }
    if (revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "Assignment feature setup changed.");
    }
    const versionIds = [...new Set(rules.map((rule) => rule.versionId))];
    const versions = await Promise.all(versionIds.map((id) =>
      tx.get(db.collection("organizerFormVersions").doc(id))));
    const byVersion = new Map(versions.filter((snap) => snap.exists)
      .map((snap) => [snap.id, requireDoc<Version>(snap,
        "OrganizerFormVersionDocument")]));
    const organizerId = event.organizerId;
    if (rules.some((rule) => {
      const version = byVersion.get(rule.versionId);
      return !version || !assignmentFeatureRuleMatchesVersion(
        rule, rule.versionId, version, organizerId);
    })) {
      throw new HttpsError("failed-precondition",
        "A matching feature no longer maps to a published custom question.");
    }
    const nextRevision = revision + 1;
    tx.update(planRef, {assignmentFeatureRules: rules,
      assignmentFeatureRevision: nextRevision,
      assignmentFeatureRequestId: data.requestId,
      assignmentFeatureConfigHash: digest, updatedAt: deps.now()});
    return {eventId: data.eventId, revision: nextRevision, replayed: false};
  });
}

/** Only the verified respondent can grant or withdraw this separate use. */
export async function setEventAssignmentFeatureConsentHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults
): Promise<ConsentResult> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<ConsentInput>(request,
    validateSetEventAssignmentFeatureConsentCallablePayload);
  const phone = request.auth?.token.phone_number;
  if (data.decision === "grant" &&
      (typeof phone !== "string" ||
        !/^\+[1-9][0-9]{6,14}$/u.test(phone))) {
    throw new HttpsError("failed-precondition", "Verify this phone first.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "setEventAssignmentFeatureConsent", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  if (data.decision === "grant" &&
      !await loadEventSuccessRosterParticipant(db, data.eventId, uid)) {
    throw unavailable();
  }
  const consentRef = db.collection("eventAssignmentFeatureConsents")
    .doc(assignmentFeatureConsentId(data.eventId, uid, data.featureId));
  return db.runTransaction(async (tx) => {
    const [eventSnap, planSnap, responseSnap, currentSnap, deleted] =
      await Promise.all([
        tx.get(db.collection("events").doc(data.eventId)),
        tx.get(db.collection("eventSuccessPlans").doc(data.eventId)),
        tx.get(db.collection("organizerFormResponses").doc(data.responseId)),
        tx.get(consentRef),
        tx.get(db.collection("deletedUsers").doc(uid)),
      ]);
    const previous = currentSnap.exists ?
      readAssignmentFeatureConsent(currentSnap) : null;
    const expectedStatus = data.decision === "grant" ? "granted" :
      "withdrawn";
    if (previous?.lastRequestId === data.requestId) {
      if (previous.responseId !== data.responseId ||
          previous.status !== expectedStatus) throw unavailable();
      return {eventId: data.eventId, featureId: data.featureId,
        status: previous.status, revision: previous.revision,
        receiptId: previous.receiptId, replayed: true};
    }
    const revision = previous?.revision ?? 0;
    if (revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "Matching consent changed.");
    }
    const receiptId = "afcr_" + hash([data.eventId, uid,
      data.featureId, data.requestId].join("|")).slice(0, 48);
    if (data.decision === "withdraw") {
      if (!previous || previous.eventId !== data.eventId ||
          previous.uid !== uid ||
          previous.featureId !== data.featureId ||
          previous.responseId !== data.responseId) throw unavailable();
      const next: Consent = {...previous, status: "withdrawn",
        receiptId, revision: revision + 1,
        lastRequestId: data.requestId, updatedAt: deps.now()};
      tx.set(consentRef, next);
      return {eventId: data.eventId, featureId: data.featureId,
        status: "withdrawn", revision: next.revision,
        receiptId, replayed: false};
    }
    if (!eventSnap.exists || !planSnap.exists ||
        !responseSnap.exists || deleted.exists) throw unavailable();
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const plan = requireDoc<EventSuccessPlanDocument>(planSnap,
      "EventSuccessPlanDocument");
    const response = requireDoc<Response>(responseSnap,
      "OrganizerFormResponseDocument");
    const organizerId = event.organizerId;
    if (plan.eventId !== data.eventId || plan.organizerId !== event.organizerId ||
        event.status === "cancelled" || response.respondentUid !== uid ||
        response.identity.phoneE164 !== phone ||
        response.status !== "submitted" || response.withdrawnAt !== null) {
      throw unavailable();
    }
    const rule = (plan.assignmentFeatureRules ?? []).find((item) =>
      item.featureId === data.featureId) as AssignmentFeatureRule | undefined;
    if (!rule) throw unavailable();
    const source = rule;
    if (source.formId !== response.formId ||
        source.versionId !== response.versionId ||
        source.questionId === undefined ||
        (previous && (previous.eventId !== data.eventId ||
          previous.organizerId !== organizerId || previous.uid !== uid ||
          previous.featureId !== data.featureId))) throw unavailable();
    const versionSnap = await tx.get(db.collection("organizerFormVersions")
      .doc(source.versionId));
    if (!versionSnap.exists) throw unavailable();
    const version = requireDoc<Version>(versionSnap,
      "OrganizerFormVersionDocument");
    const candidate = {eventId: data.eventId, organizerId, uid,
      responseId: data.responseId, featureId: data.featureId,
      formId: source.formId, versionId: source.versionId,
      questionId: source.questionId,
      transformVersion: source.transformVersion,
      purpose: "eventAssignmentMatching" as const,
      status: "granted" as const, receiptId};
    const snapshot = authorizedAssignmentFeatureSnapshot({
      eventId: data.eventId, organizerId, uid, rule,
      decision: candidate, responseId: data.responseId, response,
      versionId: rule.versionId, version});
    if (!assignmentFeatureRuleMatchesVersion(rule,
      rule.versionId, version, organizerId) || !snapshot ||
        !normalizeAssignmentFeature(rule, snapshot,
          {eventId: data.eventId, organizerId, uid})) throw unavailable();
    const now = deps.now();
    const next: Consent = {...candidate, status: "granted",
      revision: revision + 1, lastRequestId: data.requestId,
      createdAt: previous?.createdAt ?? now, updatedAt: now};
    tx.set(consentRef, next);
    return {eventId: data.eventId, featureId: data.featureId,
      status: "granted", revision: revision + 1,
      receiptId, replayed: false};
  });
}

function unavailable(): HttpsError {
  return new HttpsError("permission-denied",
    "This matching answer choice is unavailable.");
}

export const configureEventAssignmentFeatures = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30,
    maxInstances: 20}),
  (request) => configureEventAssignmentFeaturesHandler(request));
export const listEventAssignmentFeatureChoices = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30,
    maxInstances: 20}),
  (request) => listEventAssignmentFeatureChoicesHandler(request));
export const previewEventAssignmentFeatures = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30,
    maxInstances: 20}),
  (request) => previewEventAssignmentFeaturesHandler(request));
export const setEventAssignmentFeatureConsent = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30,
    maxInstances: 20}),
  (request) => setEventAssignmentFeatureConsentHandler(request));
