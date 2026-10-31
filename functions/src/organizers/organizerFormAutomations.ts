import {addExistingOrganizerContactTag} from "./organizerContacts";
import {createHash, randomUUID} from "crypto";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {normalizePayloadStrings} from "../shared/callablePayloadNormalization";
import {requireAuth} from "../shared/auth";
import {createActivityForActiveUserIfAbsent} from "../shared/notifications";
import type {CreateOrganizerFormAutomationCallablePayload} from
  "../shared/generated/createOrganizerFormAutomationCallablePayload";
import type {CreateOrganizerFormAutomationCallableResponse} from
  "../shared/generated/createOrganizerFormAutomationCallableResponse";
import type {
  OrganizerApplicationDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactTagVocabularyDocument,
  OrganizerDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerFormAutomationRunDocument,
  OrganizerFormDocument,
  OrganizerFormResponseDocument,
  OrganizerFormVersionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerFormAutomationRunsCallablePayload} from
  "../shared/generated/listOrganizerFormAutomationRunsCallablePayload";
import type {ListOrganizerFormAutomationRunsCallableResponse} from
  "../shared/generated/listOrganizerFormAutomationRunsCallableResponse";
import type {SetOrganizerFormAutomationStateCallablePayload} from
  "../shared/generated/setOrganizerFormAutomationStateCallablePayload";
import type {SetOrganizerFormAutomationStateCallableResponse} from
  "../shared/generated/setOrganizerFormAutomationStateCallableResponse";
import {
  validateCreateOrganizerFormAutomationCallablePayload,
} from
  "../shared/generated/validators/createOrganizerFormAutomationInput";
import {
  validateListOrganizerFormAutomationRunsCallablePayload,
} from
  "../shared/generated/validators/listOrganizerFormAutomationRunsInput";
import {
  validateSetOrganizerFormAutomationStateCallablePayload,
} from
  "../shared/generated/validators/setOrganizerFormAutomationStateInput";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {organizerContactIdentityKey} from "./organizerAudienceSecrets";
import {convertOrganizerFormResponseHandler} from "./organizerFormConversions";

import {organizerManagerUserIds} from "../shared/organizerHosts";
import {
  OrganizerAutomationEvent,
  OrganizerAutomationEventKind,
  readOrganizerAutomationEvent,
  organizerAutomationDueMillis,
} from "./organizerAutomationSource";
import {
  deliverOrganizerAutomationWebhook,
  publicWebhookUrl,
} from "./organizerAutomationWebhook";
import {
  validateAutomationCampaignRecipe,
} from "./organizerCampaigns";
import {
  handoffAutomationMessage,
  syncAutomationCompanionMoments,
} from "./organizerAutomationHandoff";
import {buildMomentRunnerDeps} from "../moments/momentWiring";
import {dispatchMomentRun} from "../moments/momentRunner";

type RuleProjection = CreateOrganizerFormAutomationCallableResponse;
type AutomationAction =
  OrganizerFormAutomationRuleDocument["actions"][number];
type AutomationCondition = NonNullable<
  OrganizerFormAutomationRuleDocument["condition"]
>;
type AnswerValue = OrganizerFormResponseDocument["answers"][string];
type ActionResult =
  OrganizerFormAutomationRunDocument["actionResults"][number];
export type FormAutomationEventKind = "submitted" | "withdrawn";

export interface AutomationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
  identitySecret: () => string;
  deliverWebhook?: typeof deliverOrganizerAutomationWebhook;
  /** Messaging actions hand off to the moments orchestration layer; the
   *  seam owns durable intent minting + companion run dispatch. */
  handoffMessage?: typeof handoffAutomationMessage;
  dispatchMomentRun?: (runId: string) => Promise<unknown>;
}

const defaultDeps: AutomationDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
  identitySecret: () => organizerContactIdentityKey.value(),
};

const maxAutomationAttempts = 5;
type FormConsequenceProjection = NonNullable<
  OrganizerFormDocument["consequenceProjection"]
>;
type AutomationActionKind =
  OrganizerFormAutomationRuleDocument["actions"][number]["kind"];
const automationActionKinds: readonly AutomationActionKind[] = [
  "notifyTeam",
  "addOrganizerTag",
  "createCrmContact",
  "addApplicationQueue",
  "proposeEventAttendee",
  "signedWebhook",
  "campaignHandoff",
];

interface RunCursor {
  version: 1;
  organizerId: string;
  formId: string | null;
  ruleId: string | null;
  createdAtMillis: number;
  runId: string;
}

/** Creates or replaces a revisioned rule and never returns webhook secrets. */
export async function createOrganizerFormAutomationHandler(
  request: CallableRequest<unknown>,
  deps: AutomationDeps = defaultDeps,
): Promise<CreateOrganizerFormAutomationCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<CreateOrganizerFormAutomationCallablePayload>(
      request,
      validateCreateOrganizerFormAutomationCallablePayload,
      normalizeCreateAutomationPayload,
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createOrganizerFormAutomation", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const ruleId =
    data.ruleId ??
    deterministicId(
      "formrule",
      data.organizerId,
      data.formId ?? "organizer",
      data.requestId,
    );
  const ruleRef = db.collection("organizerFormAutomationRules").doc(ruleId);
  const prior = (await ruleRef.get()).data() as
    | OrganizerFormAutomationRuleDocument
    | undefined;
  if (prior && prior.organizerId !== data.organizerId) {
    throw new HttpsError("not-found", "Automation not found.");
  }
  const actions = data.actions.map((action) => {
    const existing = prior?.actions.find(
      (item) => item.actionId === action.actionId,
    );
    if (
      action.kind === "signedWebhook" &&
      !action.webhookSecret &&
      existing?.kind === "signedWebhook" &&
      existing.webhookUrl === action.webhookUrl
    ) {
      return {...action, webhookSecret: existing.webhookSecret};
    }
    return action;
  });
  const form = await automationFormContext(
    db,
    data.organizerId,
    data.formId,
    data.trigger,
  );
  await validateAutomationInput(
    {...data, actions},
    form.version,
    db,
    deps.timestamp(),
  );
  const rule = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ruleRef);
    const formSnap = form.ref ? await tx.get(form.ref) : null;
    const currentForm = formSnap?.data() as OrganizerFormDocument | undefined;
    const existing = snapshot.data() as
      | OrganizerFormAutomationRuleDocument
      | undefined;
    if (existing && existing.organizerId !== data.organizerId) {
      throw new HttpsError("not-found", "Automation not found.");
    }
    const previousFormRef =
      existing?.formId && existing.formId !== data.formId ?
        db.collection("organizerForms").doc(existing.formId) :
        null;
    const previousForm = previousFormRef ?
      ((await tx.get(previousFormRef)).data() as
          | OrganizerFormDocument
          | undefined) :
      undefined;
    if (!existing && data.expectedRevision !== null) throw revisionConflict();
    if (
      existing &&
      data.ruleId === null &&
      sameAutomation(existing, {...data, actions})
    ) {
      return existing;
    }
    if (existing && existing.revision !== data.expectedRevision) {
      throw revisionConflict();
    }
    if (!existing) {
      const rules = await tx.get(
        db
          .collection("organizerFormAutomationRules")
          .where("organizerId", "==", data.organizerId)
          .limit(101),
      );
      if (rules.size >= 100) {
        throw new HttpsError(
          "resource-exhausted",
          "The organizer already has 100 automations.",
        );
      }
    }
    if (form.ref && currentForm?.organizerId !== data.organizerId) {
      throw new HttpsError("not-found", "Form not found.");
    }
    if (
      data.trigger === "answerMatches" &&
      currentForm?.activeVersionId !== form.versionId
    ) {
      throw revisionConflict();
    }
    const now = deps.timestamp();
    const updated: OrganizerFormAutomationRuleDocument = {
      organizerId: data.organizerId,
      formId: data.formId,
      name: data.name,
      enabled: data.enabled,
      revision: (existing?.revision ?? 0) + 1,
      trigger: data.trigger,
      triggerEventId: data.triggerEventId ?? null,
      delayMinutes: data.delayMinutes ?? 0,
      condition: data.condition,
      conditionVersionId:
        data.trigger === "answerMatches" ? form.versionId : null,
      actions,
      createdByUid: existing?.createdByUid ?? actorUid,
      updatedByUid: actorUid,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    // Companion-moment projections sync in the rule's own transaction —
    // reads must precede the rule write, so sync runs first.
    await syncAutomationCompanionMoments({
      tx, db, ruleId, rule: updated, actorUid,
      nowMillis: now.toMillis(),
    });
    tx.set(ruleRef, updated);
    if (currentForm && form.ref) {
      const consequenceProjection = updateConsequenceProjection(
        currentForm.consequenceProjection,
        existing?.formId === updated.formId ? existing : null,
        updated,
      );
      if (consequenceProjection) {
        tx.set(form.ref, {
          ...currentForm,
          consequenceProjection,
          updatedAt: now,
        });
      }
    }
    if (
      previousForm?.organizerId === data.organizerId &&
      previousFormRef &&
      existing
    ) {
      const consequenceProjection = updateConsequenceProjection(
        previousForm.consequenceProjection,
        existing,
        {...existing, enabled: false},
      );
      if (consequenceProjection) {
        tx.set(previousFormRef, {
          ...previousForm,
          consequenceProjection,
          updatedAt: now,
        });
      }
    }
    return updated;
  });
  return ruleProjection(ruleId, rule);
}

async function automationFormContext(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  formId: string | null,
  trigger: OrganizerFormAutomationRuleDocument["trigger"],
): Promise<{
  ref: FirebaseFirestore.DocumentReference | null;
  version: OrganizerFormVersionDocument | null;
  versionId: string | null;
}> {
  if (!formId) {
    if (trigger !== "applicationAccepted" && trigger !== "eventAttended") {
      throw new HttpsError(
        "invalid-argument",
        "Choose a form for this trigger.",
      );
    }
    return {ref: null, version: null, versionId: null};
  }
  if (trigger === "eventAttended") {
    throw new HttpsError(
      "invalid-argument",
      "Attendance uses an event scope.",
    );
  }
  const ref = db.collection("organizerForms").doc(formId);
  const form = (await ref.get()).data() as OrganizerFormDocument | undefined;
  if (!form && trigger === "applicationAccepted") {
    const legacy = (
      await db.collection("organizerApplicationForms").doc(formId).get()
    ).data();
    if (legacy?.organizerId === organizerId) {
      return {ref: null, version: null, versionId: null};
    }
  }
  if (!form || form.organizerId !== organizerId) {
    throw new HttpsError("not-found", "Form not found.");
  }
  if (!form.activeVersionId) {
    throw new HttpsError(
      "failed-precondition",
      "Publish the form before adding automations.",
    );
  }
  const version = (
    await db
      .collection("organizerFormVersions")
      .doc(form.activeVersionId)
      .get()
  ).data() as OrganizerFormVersionDocument | undefined;
  if (
    !version ||
    version.organizerId !== organizerId ||
    version.formId !== formId
  ) {
    throw new HttpsError("not-found", "Published form version not found.");
  }
  return {ref, version, versionId: form.activeVersionId};
}

/** Enabling is approval of the displayed configuration for future events. */
export async function setOrganizerFormAutomationStateHandler(
  request: CallableRequest<unknown>,
  deps: AutomationDeps = defaultDeps,
): Promise<SetOrganizerFormAutomationStateCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<SetOrganizerFormAutomationStateCallablePayload>(
      request,
      validateSetOrganizerFormAutomationStateCallablePayload,
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "setOrganizerFormAutomationState", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const ref = db.collection("organizerFormAutomationRules").doc(data.ruleId);
  const current = (await ref.get()).data() as
    | OrganizerFormAutomationRuleDocument
    | undefined;
  if (!current || current.organizerId !== data.organizerId) {
    throw new HttpsError("not-found", "Automation not found.");
  }
  const form = data.enabled ?
    await automationFormContext(
      db,
      current.organizerId,
      current.formId,
      current.trigger,
    ) :
    {
      ref: current.formId ?
        db.collection("organizerForms").doc(current.formId) :
        null,
      version: null,
      versionId: null,
    };
  if (
    data.enabled &&
    current.trigger === "answerMatches" &&
    current.conditionVersionId !== form.versionId
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The published form changed. Edit and review this condition again.",
    );
  }
  if (data.enabled) {
    await validateAutomationInput(
      {
        ...current,
        ruleId: data.ruleId,
        requestId: `enable_${data.ruleId}`,
        expectedRevision: current.revision,
      },
      form.version,
      db,
      deps.timestamp(),
    );
  }
  const rule = await db.runTransaction(async (tx) => {
    const live = (
      await tx.get(ref)
    ).data() as OrganizerFormAutomationRuleDocument;
    const formSnap = form.ref ? await tx.get(form.ref) : null;
    const liveForm = formSnap?.data() as OrganizerFormDocument | undefined;
    if (!live || live.revision !== data.expectedRevision) {
      throw revisionConflict();
    }
    if (
      data.enabled &&
      live.trigger === "answerMatches" &&
      liveForm?.activeVersionId !== form.versionId
    ) {
      throw revisionConflict();
    }
    const now = deps.timestamp();
    const updated = {
      ...live,
      enabled: data.enabled,
      revision: live.revision + 1,
      updatedByUid: actorUid,
      updatedAt: now,
    };
    // Companion-moment projections sync in the rule's own transaction —
    // reads must precede the rule write, so sync runs first.
    await syncAutomationCompanionMoments({
      tx, db, ruleId: data.ruleId, rule: updated, actorUid,
      nowMillis: now.toMillis(),
    });
    tx.set(ref, updated);
    if (liveForm?.organizerId === data.organizerId && form.ref) {
      const consequenceProjection = updateConsequenceProjection(
        liveForm.consequenceProjection,
        live,
        updated,
      );
      if (consequenceProjection) {
        tx.set(form.ref, {
          ...liveForm,
          consequenceProjection,
          updatedAt: now,
        });
      }
    }
    return updated;
  });
  return ruleProjection(data.ruleId, rule);
}

export function updateConsequenceProjection(
  current: OrganizerFormDocument["consequenceProjection"],
  previousRule: OrganizerFormAutomationRuleDocument | null,
  nextRule: OrganizerFormAutomationRuleDocument,
): FormConsequenceProjection | undefined {
  if (!current || current.coverage !== "exact") return current;
  const previousKinds = enabledActionKinds(previousRule);
  const nextKinds = enabledActionKinds(nextRule);
  const counts = {...current.enabledAutomationActionKindCounts};
  for (const kind of automationActionKinds) {
    const delta =
      Number(nextKinds.has(kind)) - Number(previousKinds.has(kind));
    const nextCount = counts[kind] + delta;
    if (nextCount < 0) {
      throw new HttpsError(
        "internal",
        "Form consequence projection is inconsistent.",
      );
    }
    counts[kind] = nextCount;
  }
  return {
    ...current,
    enabledAutomationActionKinds: automationActionKinds.filter(
      (kind) => counts[kind] > 0,
    ),
    enabledAutomationActionKindCounts: counts,
  };
}

function enabledActionKinds(
  rule: OrganizerFormAutomationRuleDocument | null,
): Set<AutomationActionKind> {
  if (!rule?.enabled) return new Set();
  return new Set(rule.actions.map((action) => action.kind));
}

/** Lists bounded rule definitions and execution history. */
export async function listOrganizerFormAutomationRunsHandler(
  request: CallableRequest<unknown>,
  deps: AutomationDeps = defaultDeps,
): Promise<ListOrganizerFormAutomationRunsCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<ListOrganizerFormAutomationRunsCallablePayload>(
      request,
      validateListOrganizerFormAutomationRunsCallablePayload,
      (value) =>
        normalizePayloadStrings(value, {
          stringFields: ["organizerId"],
          nullableStringFields: ["formId", "ruleId", "cursor"],
        }),
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerFormAutomationRuns", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const cursor = decodeRunCursor(data.cursor, data);
  let runQuery: FirebaseFirestore.Query = db
    .collection("organizerFormAutomationRuns")
    .where("organizerId", "==", data.organizerId)
    .orderBy("createdAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc")
    .limit(data.limit + 1);
  if (data.formId) runQuery = runQuery.where("formId", "==", data.formId);
  if (data.ruleId) runQuery = runQuery.where("ruleId", "==", data.ruleId);
  if (cursor) {
    runQuery = runQuery.startAfter(
      admin.firestore.Timestamp.fromMillis(cursor.createdAtMillis),
      cursor.runId,
    );
  }
  let ruleQuery = db
    .collection("organizerFormAutomationRules")
    .where("organizerId", "==", data.organizerId);
  if (data.formId) ruleQuery = ruleQuery.where("formId", "==", data.formId);
  const [rules, runs] = await Promise.all([
    ruleQuery.limit(101).get(),
    runQuery.get(),
  ]);
  if (rules.size > 100) {
    throw new HttpsError("resource-exhausted", "Automation limit exceeded.");
  }
  const page = runs.docs.slice(0, data.limit);
  const last = page.at(-1);
  return {
    rules: rules.docs.map((doc) =>
      ruleProjection(
        doc.id,
        doc.data() as OrganizerFormAutomationRuleDocument,
      ),
    ),
    runs: page.map((doc) =>
      runProjection(doc.id, doc.data() as OrganizerFormAutomationRunDocument),
    ),
    nextCursor:
      runs.size > data.limit && last ?
        encodeRunCursor({
          version: 1,
          organizerId: data.organizerId,
          formId: data.formId,
          ruleId: data.ruleId,
          createdAtMillis: (
              last.data().createdAt as FirebaseFirestore.Timestamp
          ).toMillis(),
          runId: last.id,
        }) :
        null,
  };
}

/** Dispatches only a new lifecycle edge, then reloads its current authority. */
export async function dispatchOrganizerFormAutomations(
  responseId: string,
  before: OrganizerFormResponseDocument | undefined,
  after: OrganizerFormResponseDocument | undefined,
  deps: AutomationDeps = defaultDeps,
): Promise<void> {
  const kind = formAutomationEventKind(before, after);
  if (kind) await dispatchAutomationEvent(kind, responseId, deps);
}

export async function dispatchOrganizerApplicationAutomations(
  applicationId: string,
  before: OrganizerApplicationDocument | undefined,
  after: OrganizerApplicationDocument | undefined,
  deps: AutomationDeps = defaultDeps,
): Promise<void> {
  if (
    before?.reviewStatus !== "approved" &&
    after?.reviewStatus === "approved"
  ) {
    await dispatchAutomationEvent("applicationAccepted", applicationId, deps);
  }
}

export async function dispatchOrganizerAttendanceAutomations(
  edgeId: string,
  before: OrganizerContactEventEdgeDocument | undefined,
  after: OrganizerContactEventEdgeDocument | undefined,
  deps: AutomationDeps = defaultDeps,
): Promise<void> {
  if (
    after?.checkedIn &&
    !after.cancelled &&
    (!before?.checkedIn || before.cancelled)
  ) {
    await dispatchAutomationEvent("eventAttended", edgeId, deps);
  }
}

async function dispatchAutomationEvent(
  kind: OrganizerAutomationEventKind,
  sourceId: string,
  deps: AutomationDeps,
): Promise<void> {
  const event = await readOrganizerAutomationEvent(
    deps.firestore(),
    kind,
    sourceId,
  );
  if (!event) return;
  const rules = await deps
    .firestore()
    .collection("organizerFormAutomationRules")
    .where("organizerId", "==", event.organizerId)
    .where("enabled", "==", true)
    .limit(101)
    .get();
  if (rules.size > 100) {
    throw new HttpsError("resource-exhausted", "Automation limit exceeded.");
  }
  for (const doc of rules.docs) {
    const rule = doc.data() as OrganizerFormAutomationRuleDocument;
    if (automationEventMatches(rule, event)) {
      await enqueueAutomationRule(event, doc.id, rule, deps);
    }
  }
}

export async function processDueOrganizerAutomations(
  deps: AutomationDeps = defaultDeps,
): Promise<void> {
  const due = await deps
    .firestore()
    .collection("organizerFormAutomationRuns")
    .where("dueAt", "<=", deps.timestamp())
    .orderBy("dueAt")
    .limit(100)
    .get();
  const deadline = deps.timestamp().toMillis() + 180000;
  for (const run of due.docs) {
    if (deps.timestamp().toMillis() >= deadline) break;
    await processOrganizerAutomationRun(run.id, deps);
  }
}

/** Returns only meaningful response lifecycle edges; drafts never execute. */
export function formAutomationEventKind(
  before: OrganizerFormResponseDocument | undefined,
  after: OrganizerFormResponseDocument | undefined,
): FormAutomationEventKind | null {
  if (after?.status === "submitted" && before?.status !== "submitted") {
    return "submitted";
  }
  if (after?.status === "withdrawn" && before?.status === "submitted") {
    return "withdrawn";
  }
  return null;
}

/**
 * Keeps application-purpose forms compatible with the established Host
 * application queue without requiring every organizer to configure a rule.
 */
export async function projectApplicationPurposeResponse(
  responseId: string,
  before: OrganizerFormResponseDocument | undefined,
  after: OrganizerFormResponseDocument | undefined,
  deps: AutomationDeps = defaultDeps,
): Promise<void> {
  const eventKind = formAutomationEventKind(before, after);
  if (!after || !eventKind) return;
  const versionSnap = await deps
    .firestore()
    .collection("organizerFormVersions")
    .doc(after.versionId)
    .get();
  if (!versionSnap.exists) return;
  const version = requireDoc<OrganizerFormVersionDocument>(
    versionSnap,
    "OrganizerFormVersionDocument",
  );
  if (
    version.formId !== after.formId ||
    version.organizerId !== after.organizerId ||
    version.definition.purpose !== "application"
  ) {
    return;
  }
  if (eventKind === "withdrawn") {
    const applicationId = deterministicId("formapplication", responseId);
    const ref = deps
      .firestore()
      .collection("organizerApplications")
      .doc(applicationId);
    await deps.firestore().runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const application = snapshot.data() as {reviewStatus?: string};
      if (application.reviewStatus === "withdrawn") return;
      tx.update(ref, {
        reviewStatus: "withdrawn",
        updatedAt: deps.timestamp(),
      });
    });
    return;
  }
  const request = {
    data: {
      organizerId: after.organizerId,
      responseId,
      kind: "application",
      eventId: null,
      overrides: {},
      requestId: `application_projection_${responseId}`,
    },
    auth: {uid: "system_form_application_projection", token: {}},
  } as unknown as CallableRequest<unknown>;
  const result = await convertOrganizerFormResponseHandler(request, {
    firestore: deps.firestore,
    checkRateLimit: async () => undefined,
    timestamp: deps.timestamp,
    identitySecret: deps.identitySecret,
    requireManagerAuthority: false,
  });
  if (result.status !== "completed") {
    throw new Error("Application response projection did not complete.");
  }
}

async function enqueueAutomationRule(
  event: OrganizerAutomationEvent,
  ruleId: string,
  rule: OrganizerFormAutomationRuleDocument,
  deps: AutomationDeps,
): Promise<void> {
  if (rule.updatedAt.toMillis() > event.occurredAt.toMillis()) return;
  const runId = deterministicId(
    "formrun",
    ruleId,
    String(rule.revision),
    event.sourceId,
    event.kind,
  );
  const db = deps.firestore();
  const ref = db.collection("organizerFormAutomationRuns").doc(runId);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const now = deps.timestamp();
    const run: OrganizerFormAutomationRunDocument = {
      organizerId: event.organizerId,
      formId: event.formId,
      ruleId,
      ruleRevision: rule.revision,
      responseId: event.response ? event.sourceId : null,
      sourceId: event.sourceId,
      sourceOccurredAt: event.occurredAt,
      eventKind: event.kind,
      status: "pending",
      attemptCount: 0,
      actionResults: [],
      errorCode: null,
      errorMessage: null,
      dueAt: admin.firestore.Timestamp.fromMillis(
        organizerAutomationDueMillis(event, rule),
      ),
      leaseOwner: null,
      leaseExpiresAt: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    tx.create(ref, run);
  });
  await processOrganizerAutomationRun(runId, deps);
}

/** Leases fence workers; successful action identities survive retries. */
export async function processOrganizerAutomationRun(
  runId: string,
  deps: AutomationDeps = defaultDeps,
): Promise<void> {
  const db = deps.firestore();
  const ref = db.collection("organizerFormAutomationRuns").doc(runId);
  const owner = randomUUID();
  const run = await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      | OrganizerFormAutomationRunDocument
      | undefined;
    const now = deps.timestamp();
    if (
      !current ||
      ["succeeded", "skipped"].includes(current.status) ||
      !current.dueAt ||
      current.dueAt.toMillis() > now.toMillis() ||
      (current.leaseExpiresAt?.toMillis() ?? 0) > now.toMillis()
    ) {
      return null;
    }
    if (current.attemptCount >= maxAutomationAttempts) {
      // Retire an exhausted lease from the due query without a sixth attempt.
      // Partial updates preserve every recorded action result.
      tx.update(ref, {
        status: "failed",
        errorCode: "attempt_limit_exhausted",
        errorMessage:
          "Automation stopped after its final attempt did not complete. " +
          "Review its recorded action results.",
        dueAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        completedAt: now,
        updatedAt: now,
      });
      return null;
    }
    const leaseExpiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 330000,
    );
    const claimed = {
      ...current,
      status: "running" as const,
      attemptCount: current.attemptCount + 1,
      leaseOwner: owner,
      leaseExpiresAt,
      dueAt: leaseExpiresAt,
      updatedAt: now,
      completedAt: null,
    };
    tx.set(ref, claimed);
    return claimed;
  });
  if (!run) return;
  const update = async (data: Partial<OrganizerFormAutomationRunDocument>) =>
    db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as
        | OrganizerFormAutomationRunDocument
        | undefined;
      if (current?.leaseOwner !== owner) {
        throw new HttpsError(
          "aborted",
          "Automation execution lease changed.",
        );
      }
      tx.update(ref, data);
    });
  const results = [...run.actionResults];
  try {
    const rule = (
      await db
        .collection("organizerFormAutomationRules")
        .doc(run.ruleId)
        .get()
    ).data() as OrganizerFormAutomationRuleDocument | undefined;
    const event = await readOrganizerAutomationEvent(
      db,
      run.eventKind,
      run.sourceId ?? run.responseId!,
    );
    if (
      !rule?.enabled ||
      rule.revision !== run.ruleRevision ||
      !event ||
      event.organizerId !== run.organizerId ||
      rule.organizerId !== run.organizerId ||
      !automationEventMatches(rule, event)
    ) {
      await update({
        status: "skipped",
        errorCode: "source_or_rule_changed",
        errorMessage:
          "The automation was paused or edited, " +
          "or its source became unavailable.",
        dueAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        completedAt: deps.timestamp(),
        updatedAt: deps.timestamp(),
      });
      return;
    }
    await requireOrganizerManager({
      db,
      organizerId: rule.organizerId,
      actorUid: rule.updatedByUid,
    });
    const dueMillis =
      Math.max(
        run.sourceOccurredAt?.toMillis() ?? event.occurredAt.toMillis(),
        event.eventEndAt?.toMillis() ?? 0,
      ) +
      (rule.delayMinutes ?? 0) * 60000;
    if (dueMillis > deps.timestamp().toMillis()) {
      await update({
        status: "pending",
        dueAt: admin.firestore.Timestamp.fromMillis(dueMillis),
        attemptCount: run.attemptCount - 1,
        leaseOwner: null,
        leaseExpiresAt: null,
      });
      return;
    }
    for (const action of rule.actions) {
      if (
        results.some(
          (r) =>
            r.actionId === action.actionId &&
            (r.status === "succeeded" ||
              r.status === "skipped" ||
              (r.status === "failed" && !retryableActionError(r.errorCode))),
        )
      ) {
        continue;
      }
      // Recheck between actions too: a pause must stop remaining side effects.
      const current = (
        await db
          .collection("organizerFormAutomationRules")
          .doc(run.ruleId)
          .get()
      ).data() as OrganizerFormAutomationRuleDocument;
      const liveEvent = await readOrganizerAutomationEvent(
        db,
        event.kind,
        event.sourceId,
      );
      if (
        !current?.enabled ||
        current.revision !== run.ruleRevision ||
        !liveEvent ||
        !automationEventMatches(current, liveEvent)
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Automation or source changed.",
        );
      }
      await requireOrganizerManager({
        db,
        organizerId: current.organizerId,
        actorUid: current.updatedByUid,
      });
      const result = await runAutomationAction({
        db,
        deps,
        runId,
        ruleId: run.ruleId,
        event: liveEvent,
        rule: current,
        action,
      });
      replaceActionResult(results, result);
      await update({actionResults: results, updatedAt: deps.timestamp()});
    }
    const failures = results.filter((r) => r.status === "failed");
    const skipped = results.filter((r) => r.status === "skipped");
    const retry =
      failures.some((r) => retryableActionError(r.errorCode)) &&
      run.attemptCount < maxAutomationAttempts;
    await update({
      actionResults: results,
      status: failures.length ?
        failures.length === results.length ?
          "failed" :
          "partiallyFailed" :
        skipped.length === results.length ?
          "skipped" :
          "succeeded",
      errorCode: failures.length ? "action_failed" : null,
      errorMessage: failures.length ?
        failures
          .map((r) => `${r.kind}: ${r.errorCode}`)
          .join("; ")
          .slice(0, 500) :
        null,
      dueAt: retry ?
        admin.firestore.Timestamp.fromMillis(
          deps.timestamp().toMillis() + 60000 * 2 ** run.attemptCount,
        ) :
        null,
      leaseOwner: null,
      leaseExpiresAt: null,
      completedAt: retry ? null : deps.timestamp(),
      updatedAt: deps.timestamp(),
    });
  } catch (error) {
    const permanent =
      error instanceof HttpsError &&
      ["permission-denied", "not-found", "failed-precondition"].includes(
        error.code,
      );
    const retry = !permanent && run.attemptCount < maxAutomationAttempts;
    await update({
      status: permanent ? "skipped" : "failed",
      errorCode: errorCode(error),
      errorMessage: permanent ?
        "Current authority or source no longer permits this automation." :
        "Automation execution failed. Review its actions and configuration.",
      dueAt: retry ?
        admin.firestore.Timestamp.fromMillis(
          deps.timestamp().toMillis() + 60000 * 2 ** run.attemptCount,
        ) :
        null,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: deps.timestamp(),
      completedAt: retry ? null : deps.timestamp(),
    });
  }
}

interface AutomationActionContext {
  db: FirebaseFirestore.Firestore;
  deps: AutomationDeps;
  runId: string;
  ruleId: string;
  event: OrganizerAutomationEvent;
  rule: OrganizerFormAutomationRuleDocument;
  action: AutomationAction;
}

async function runAutomationAction(
  params: AutomationActionContext,
): Promise<ActionResult> {
  try {
    let resultId: string | null = null;
    const {action, event, rule, deps} = params;
    switch (action.kind) {
    case "signedWebhook":
      resultId = deterministicId("delivery", params.runId, action.actionId);
      await (deps.deliverWebhook ?? deliverOrganizerAutomationWebhook)({
        url: action.webhookUrl!,
        secret: action.webhookSecret!,
        deliveryId: resultId,
        ruleId: params.ruleId,
        ruleRevision: rule.revision,
        event,
        timestampMillis: deps.timestamp().toMillis(),
      });
      break;
    case "campaignHandoff":
      if (!event.contactId) {
        return actionResult(action, "skipped", null, "no_contact");
      }
      {
        const handoff = await (
          deps.handoffMessage ?? handoffAutomationMessage
        )({
          db: params.db,
          automationRunId: params.runId,
          ruleId: params.ruleId,
          event,
          rule,
          action,
          nowMillis: () => deps.timestamp().toMillis(),
        });
        const dispatch = deps.dispatchMomentRun ??
          ((runId: string) => dispatchMomentRun(
            buildMomentRunnerDeps({firestore: deps.firestore}), runId));
        // A future-due run waits for the moments sweep — dispatching now
        // would only bounce off the claim's business-delay recheck.
        const dispatched = handoff.dueAtMillis >
            deps.timestamp().toMillis() ?
          "deferred" : await dispatch(handoff.momentRunId);
        if (dispatched === "notFound") {
          throw new HttpsError(
            "internal", "Automation moment run vanished after handoff.");
        }
        if (dispatched === "skipped" || dispatched === "notPlanned") {
          // A pause/disable between handoff and dispatch withholds the
          // send; the run doc carries the skip reason for the audit row.
          return actionResult(
            action, "skipped", handoff.momentRunId, "moment_not_armed");
        }
        resultId = handoff.momentRunId;
      }
      break;
    case "notifyTeam":
      resultId = await notifyAutomationTeam(params);
      break;
    case "createCrmContact":
      resultId = await convertAutomationResponse(
        params,
        "crmContact",
        null,
      );
      break;
    case "addApplicationQueue":
      resultId = await convertAutomationResponse(
        params,
        "application",
        null,
      );
      break;
    case "proposeEventAttendee":
      resultId = await convertAutomationResponse(
        params,
        "eventAttendeeProposal",
        action.eventId,
      );
      break;
    case "addOrganizerTag":
      resultId = await addAutomationTag(params);
      break;
    }
    return actionResult(action, "succeeded", resultId, null);
  } catch (error) {
    return actionResult(params.action, "failed", null, errorCode(error));
  }
}

async function notifyAutomationTeam(
  params: AutomationActionContext,
): Promise<string> {
  const organizer = (
    await params.db
      .collection("organizers")
      .doc(params.event.organizerId)
      .get()
  ).data() as OrganizerDocument;
  const uids = organizerManagerUserIds(organizer);
  await Promise.all(
    uids.map((uid) =>
      createActivityForActiveUserIfAbsent(params.db, {
        id: `formResponse_${params.runId}_${uid}`,
        uid,
        type: "formResponse",
        title: params.rule.name,
        body: "An organizer automation was triggered.",
        organizerId: params.event.organizerId,
        createdAt: params.deps.timestamp(),
      }),
    ),
  );
  return `team_notification_${params.runId}`;
}

async function convertAutomationResponse(
  params: AutomationActionContext,
  kind: "crmContact" | "application" | "eventAttendeeProposal",
  eventId: string | null,
): Promise<string | null> {
  if (!params.event.response || params.event.kind === "withdrawn") {
    throw new HttpsError(
      "failed-precondition",
      "This action requires a submitted form response.",
    );
  }
  const result = await convertOrganizerFormResponseHandler(
    {
      data: {
        organizerId: params.event.organizerId,
        responseId: params.event.sourceId,
        kind,
        eventId,
        overrides: {},
        requestId: `autorun_${params.runId}`,
      },
      auth: {uid: params.rule.updatedByUid},
    } as CallableRequest<unknown>,
    {
      firestore: params.deps.firestore,
      checkRateLimit: async () => undefined,
      timestamp: params.deps.timestamp,
      identitySecret: params.deps.identitySecret,
    },
  );
  if (result.status !== "completed") {
    throw new Error("Form conversion is incomplete.");
  }
  return result.resultId;
}

async function addAutomationTag(
  params: AutomationActionContext,
): Promise<string> {
  const contactId =
    params.event.contactId ??
    (await convertAutomationResponse(params, "crmContact", null));
  if (!contactId || !params.action.tagId) {
    throw new Error("Contact or tag is missing.");
  }
  await addExistingOrganizerContactTag({
    db: params.db, organizerId: params.event.organizerId, contactId,
    tagId: params.action.tagId, actorUid: params.rule.updatedByUid,
    now: params.deps.timestamp(),
  });
  return contactId;
}

async function validateAutomationInput(
  data: CreateOrganizerFormAutomationCallablePayload,
  version: OrganizerFormVersionDocument | null,
  db: FirebaseFirestore.Firestore,
  now: FirebaseFirestore.Timestamp,
): Promise<void> {
  if ((data.trigger === "answerMatches") !== Boolean(data.condition)) {
    throw new HttpsError(
      "invalid-argument",
      "Only answer-matching triggers require a condition.",
    );
  }
  const questions =
    version?.definition.sections.flatMap((section) => section.questions) ??
    [];
  if (data.condition) {
    const question = questions.find(
      (q) =>
        q.questionId === data.condition!.questionId &&
        q.hostPresentation === "filterable" &&
        q.privacyClass !== "sensitive",
    );
    if (!question) {
      throw new HttpsError(
        "invalid-argument",
        "Choose a filterable published question.",
      );
    }
    const {operator, expectedValues} = data.condition;
    const presence = operator === "answered" || operator === "notAnswered";
    const numeric = operator === "greaterThan" || operator === "lessThan";
    const validValues = expectedValues.every((value) => {
      if (question.kind === "boolean") return typeof value === "boolean";
      if (question.kind === "number") return typeof value === "number";
      if (["singleChoice", "multiChoice"].includes(question.kind)) {
        return question.options.some((option) => option.value === value);
      }
      return typeof value === "string";
    });
    if (
      (presence ?
        expectedValues.length !== 0 :
        expectedValues.length === 0) ||
      !validValues ||
      (numeric && (question.kind !== "number" || expectedValues.length !== 1))
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Choose an answer supported by the published question.",
      );
    }
  }
  if (data.triggerEventId) {
    const event = (
      await db.collection("events").doc(data.triggerEventId).get()
    ).data();
    if (
      data.trigger !== "eventAttended" ||
      !event ||
      (event.organizerId) !== data.organizerId
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Choose an organizer-owned attendance event.",
      );
    }
  }
  if (
    new Set(data.actions.map((a) => a.actionId)).size !== data.actions.length
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Automation action ids must be unique.",
    );
  }
  for (const action of data.actions) {
    const responseOnly = [
      "createCrmContact",
      "addApplicationQueue",
      "proposeEventAttendee",
    ].includes(action.kind);
    if (
      (responseOnly &&
        !["responseSubmitted", "answerMatches"].includes(data.trigger)) ||
      (data.trigger === "responseWithdrawn" &&
        !["signedWebhook", "notifyTeam"].includes(action.kind))
    ) {
      throw new HttpsError(
        "invalid-argument",
        "This action cannot run for the selected trigger.",
      );
    }
    if (action.kind === "signedWebhook") {
      if (!action.webhookUrl || !action.webhookSecret) {
        throw new HttpsError(
          "invalid-argument",
          "Webhooks need a URL and signing secret.",
        );
      }
      publicWebhookUrl(action.webhookUrl);
    } else if (action.webhookUrl || action.webhookSecret) {
      throw new HttpsError(
        "invalid-argument",
        "Webhook settings require a webhook action.",
      );
    }
    if (action.kind === "addOrganizerTag") {
      const vocabulary = (
        await db
          .collection("organizerContactTagVocabularies")
          .doc(data.organizerId)
          .get()
      ).data() as OrganizerContactTagVocabularyDocument | undefined;
      if (
        !action.tagId ||
        !vocabulary?.tags.some((t) => t.tagId === action.tagId)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Choose an existing organizer tag.",
        );
      }
    } else if (action.tagId) {
      throw new HttpsError("invalid-argument", "Unexpected tag setting.");
    }
    if (action.kind === "proposeEventAttendee") {
      const event = action.eventId ?
        (await db.collection("events").doc(action.eventId).get()).data() :
        null;
      if (
        !event ||
        (event.organizerId) !== data.organizerId
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Choose an organizer-owned event.",
        );
      }
    } else if (action.eventId) {
      throw new HttpsError("invalid-argument", "Unexpected event setting.");
    }
    if (action.kind === "campaignHandoff") {
      if (
        action.channel !== "whatsapp" ||
        !action.campaignId ||
        !action.campaignRevision
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Choose a configured WhatsApp draft message.",
        );
      }
      await validateAutomationCampaignRecipe(
        db,
        data.organizerId,
        action.campaignId,
        action.campaignRevision,
        now,
      );
    } else if (
      action.channel ||
      action.campaignId ||
      action.campaignRevision
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Message settings require a campaign action.",
      );
    }
  }
}

function automationEventMatches(
  rule: OrganizerFormAutomationRuleDocument,
  event: OrganizerAutomationEvent,
): boolean {
  if (rule.formId && rule.formId !== event.formId) return false;
  if (rule.triggerEventId && rule.triggerEventId !== event.eventId) {
    return false;
  }
  if (rule.trigger === "applicationAccepted") {
    return event.kind === "applicationAccepted";
  }
  if (rule.trigger === "eventAttended") return event.kind === "eventAttended";
  return (
    event.response !== null &&
    (rule.trigger !== "answerMatches" ||
      rule.conditionVersionId === event.response.versionId) &&
    automationMatches(rule, event.response, event.kind)
  );
}

function automationMatches(
  rule: OrganizerFormAutomationRuleDocument,
  response: OrganizerFormResponseDocument,
  eventKind: OrganizerAutomationEventKind,
): boolean {
  if (rule.trigger === "responseSubmitted") return eventKind === "submitted";
  if (rule.trigger === "responseWithdrawn") return eventKind === "withdrawn";
  return (
    eventKind === "submitted" &&
    rule.condition !== null &&
    conditionMatches(rule.condition, response.answers)
  );
}

function conditionMatches(
  condition: AutomationCondition,
  answers: OrganizerFormResponseDocument["answers"],
): boolean {
  const answer = answers[condition.questionId];
  const values = Array.isArray(answer) ? answer : [answer];
  const expected = condition.expectedValues;
  switch (condition.operator) {
  case "answered":
    return !isEmptyAnswer(answer);
  case "notAnswered":
    return isEmptyAnswer(answer);
  case "equals":
    return expected.some((value) => answer === value);
  case "notEquals":
    return expected.every((value) => answer !== value);
  case "contains":
    return expected.some((value) => values.includes(value));
  case "notContains":
    return expected.every((value) => !values.includes(value));
  case "greaterThan":
    return (
      typeof answer === "number" &&
        typeof expected[0] === "number" &&
        answer > expected[0]
    );
  case "lessThan":
    return (
      typeof answer === "number" &&
        typeof expected[0] === "number" &&
        answer < expected[0]
    );
  }
}

function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function retryableActionError(code: string | null): boolean {
  return [
    "unavailable",
    "deadline_exceeded",
    "resource_exhausted",
    "aborted",
    "internal",
    "action_failed",
  ].includes(code ?? "action_failed");
}

function actionResult(
  action: AutomationAction,
  status: ActionResult["status"],
  resultId: string | null,
  code: string | null,
): ActionResult {
  return {
    actionId: action.actionId,
    kind: action.kind,
    status,
    resultId,
    errorCode: code,
  };
}

function replaceActionResult(
  results: OrganizerFormAutomationRunDocument["actionResults"],
  result: ActionResult,
): void {
  const index = results.findIndex(
    (candidate) => candidate.actionId === result.actionId,
  );
  if (index >= 0) results[index] = result;
  else results.push(result);
}

function ruleProjection(
  ruleId: string,
  rule: OrganizerFormAutomationRuleDocument,
): RuleProjection {
  return {
    ruleId,
    organizerId: rule.organizerId,
    formId: rule.formId,
    name: rule.name,
    enabled: rule.enabled,
    revision: rule.revision,
    trigger: rule.trigger,
    triggerEventId: rule.triggerEventId ?? null,
    delayMinutes: rule.delayMinutes ?? 0,
    condition: rule.condition,
    actions: rule.actions.map((action) => ({
      actionId: action.actionId,
      kind: action.kind,
      tagId: action.tagId,
      eventId: action.eventId,
      webhookUrl: action.webhookUrl,
      webhookSecretConfigured: Boolean(action.webhookSecret),
      channel: action.channel,
      campaignId: action.campaignId ?? null,
      campaignRevision: action.campaignRevision ?? null,
    })),
    updatedAtMillis: rule.updatedAt.toMillis(),
  };
}

function runProjection(
  runId: string,
  run: OrganizerFormAutomationRunDocument,
): ListOrganizerFormAutomationRunsCallableResponse["runs"][number] {
  return {
    runId,
    ruleId: run.ruleId,
    ruleRevision: run.ruleRevision,
    responseId: run.responseId,
    sourceId: run.sourceId ?? run.responseId,
    dueAtMillis: run.dueAt?.toMillis() ?? null,
    eventKind: run.eventKind,
    status: run.status,
    attemptCount: run.attemptCount,
    actionResults: run.actionResults,
    errorMessage: run.errorMessage,
    createdAtMillis: run.createdAt.toMillis(),
    completedAtMillis: run.completedAt?.toMillis() ?? null,
  };
}

function sameAutomation(
  existing: OrganizerFormAutomationRuleDocument,
  data: CreateOrganizerFormAutomationCallablePayload,
): boolean {
  return (
    JSON.stringify({
      name: existing.name,
      enabled: existing.enabled,
      trigger: existing.trigger,
      condition: existing.condition,
      triggerEventId: existing.triggerEventId ?? null,
      delayMinutes: existing.delayMinutes ?? 0,
      actions: existing.actions,
    }) ===
    JSON.stringify({
      name: data.name,
      enabled: data.enabled,
      trigger: data.trigger,
      condition: data.condition,
      triggerEventId: data.triggerEventId ?? null,
      delayMinutes: data.delayMinutes ?? 0,
      actions: data.actions,
    })
  );
}

function normalizeCreateAutomationPayload(value: unknown): unknown {
  return normalizePayloadStrings(value, {
    stringFields: ["organizerId", "requestId", "name"],
    nullableStringFields: ["formId", "ruleId", "triggerEventId"],
  });
}

function revisionConflict(): HttpsError {
  return new HttpsError(
    "aborted",
    "This automation changed on another device. Reload and try again.",
  );
}

function errorCode(error: unknown): string {
  if (error instanceof HttpsError) return error.code.replaceAll("-", "_");
  return "action_failed";
}

function encodeRunCursor(cursor: RunCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeRunCursor(
  value: string | null,
  expected: Pick<RunCursor, "organizerId" | "formId" | "ruleId">,
): RunCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString(),
    ) as RunCursor;
    if (
      parsed.version !== 1 ||
      parsed.organizerId !== expected.organizerId ||
      parsed.formId !== expected.formId ||
      parsed.ruleId !== expected.ruleId ||
      !Number.isInteger(parsed.createdAtMillis) ||
      !parsed.runId
    ) {
      throw new Error("invalid cursor");
    }
    return parsed;
  } catch {
    throw new HttpsError("invalid-argument", "Automation cursor is invalid.");
  }
}

function deterministicId(prefix: string, ...parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join("\u001f"))
    .digest("hex")
    .slice(0, 32);
  return `${prefix}_${digest}`;
}

export const createOrganizerFormAutomation = onCall(
  appCheckCallableOptionsWithLimits({
    timeoutSeconds: 90,
    maxInstances: 20,
    concurrency: 10,
  }),
  (request) => createOrganizerFormAutomationHandler(request),
);

export const setOrganizerFormAutomationState = onCall(
  appCheckCallableOptionsWithLimits({
    timeoutSeconds: 60,
    maxInstances: 20,
    concurrency: 20,
  }),
  (request) => setOrganizerFormAutomationStateHandler(request),
);

export const listOrganizerFormAutomationRuns = onCall(
  appCheckCallableOptionsWithLimits({
    timeoutSeconds: 60,
    maxInstances: 20,
    concurrency: 20,
  }),
  (request) => listOrganizerFormAutomationRunsHandler(request),
);

export const onOrganizerFormResponseAutomated = onDocumentWritten(
  {
    document: "organizerFormResponses/{responseId}",
    retry: true,
    timeoutSeconds: 300,
    maxInstances: 20,
    secrets: [organizerContactIdentityKey],
  },
  async (event) => {
    const before = event.data?.before.data() as
      | OrganizerFormResponseDocument
      | undefined;
    const after = event.data?.after.data() as
      | OrganizerFormResponseDocument
      | undefined;
    await Promise.all([
      projectApplicationPurposeResponse(
        event.params.responseId,
        before,
        after,
      ),
      dispatchOrganizerFormAutomations(
        event.params.responseId,
        before,
        after,
      ),
    ]);
  },
);

export const onOrganizerApplicationAutomated = onDocumentWritten(
  {
    document: "organizerApplications/{applicationId}",
    retry: true,
    timeoutSeconds: 300,
    maxInstances: 20,
    secrets: [organizerContactIdentityKey],
  },
  (event) =>
    dispatchOrganizerApplicationAutomations(
      event.params.applicationId,
      event.data?.before.data() as OrganizerApplicationDocument | undefined,
      event.data?.after.data() as OrganizerApplicationDocument | undefined,
    ),
);

export const onOrganizerAttendanceAutomated = onDocumentWritten(
  {
    document: "organizerContactEventEdges/{edgeId}",
    retry: true,
    timeoutSeconds: 300,
    maxInstances: 20,
    secrets: [organizerContactIdentityKey],
  },
  (event) =>
    dispatchOrganizerAttendanceAutomations(
      event.params.edgeId,
      event.data?.before.data() as
        | OrganizerContactEventEdgeDocument
        | undefined,
      event.data?.after.data() as
        | OrganizerContactEventEdgeDocument
        | undefined,
    ),
);

export const retryOrganizerAutomations = onSchedule(
  {
    schedule: "every 1 minutes",
    timeoutSeconds: 300,
    maxInstances: 1,
    secrets: [organizerContactIdentityKey],
  },
  () => processDueOrganizerAutomations(),
);
