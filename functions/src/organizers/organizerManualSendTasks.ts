import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {
  organizerCommunicationPlanCapabilityVersion,
  resolveIndividualCommunicationPlan,
} from "../communications/organizerCommunicationPlan";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import type {
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  OrganizerManualSendTaskDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerManualSendTasksCallablePayload} from
  "../shared/generated/listOrganizerManualSendTasksCallablePayload";
import type {ListOrganizerManualSendTasksCallableResponse} from
  "../shared/generated/listOrganizerManualSendTasksCallableResponse";
import type {MarkOrganizerManualSendTaskCallablePayload} from
  "../shared/generated/markOrganizerManualSendTaskCallablePayload";
import type {OpenOrganizerManualSendTaskCallablePayload} from
  "../shared/generated/openOrganizerManualSendTaskCallablePayload";
import type {OrganizerManualSendTaskCallableResponse} from
  "../shared/generated/organizerManualSendTaskCallableResponse";
import type {PrepareOrganizerManualSendTaskCallablePayload} from
  "../shared/generated/prepareOrganizerManualSendTaskCallablePayload";
import type {ReplanOrganizerManualSendTasksCallablePayload} from
  "../shared/generated/replanOrganizerManualSendTasksCallablePayload";
import type {ReplanOrganizerManualSendTasksCallableResponse} from
  "../shared/generated/replanOrganizerManualSendTasksCallableResponse";
import type {ValidateOrganizerManualSendTaskLaunchCallablePayload} from
  "../shared/generated/validateOrganizerManualSendTaskLaunchCallablePayload";
import {
  validateListOrganizerManualSendTasksCallablePayload,
} from
  "../shared/generated/validators/listOrganizerManualSendTasksInput";
import {
  validateMarkOrganizerManualSendTaskCallablePayload,
} from
  "../shared/generated/validators/markOrganizerManualSendTaskInput";
import {
  validateOpenOrganizerManualSendTaskCallablePayload,
} from
  "../shared/generated/validators/openOrganizerManualSendTaskInput";
import {
  validatePrepareOrganizerManualSendTaskCallablePayload,
} from
  "../shared/generated/validators/prepareOrganizerManualSendTaskInput";
import {
  validateReplanOrganizerManualSendTasksCallablePayload,
} from
  "../shared/generated/validators/replanOrganizerManualSendTasksInput";
import {
  validateValidateOrganizerManualSendTaskLaunchCallablePayload,
} from
  "../shared/generated/validators/validateOrganizerManualSendTaskLaunchInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  hashCanonical,
  hashEndpoint,
  organizerContactChannelStateId,
} from "./organizerCampaignModel";

const manualTaskTtlMillis = 30 * 24 * 60 * 60 * 1000;

interface ManualSendTaskDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ManualSendTaskDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

type ReplanResult =
  ReplanOrganizerManualSendTasksCallableResponse["results"][number];

export async function prepareOrganizerManualSendTaskHandler(
  request: CallableRequest<unknown>,
  deps: ManualSendTaskDeps = defaultDeps,
): Promise<OrganizerManualSendTaskCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    PrepareOrganizerManualSendTaskCallablePayload
  >(
    request,
    validatePrepareOrganizerManualSendTaskCallablePayload,
    normalizeManualTaskPayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "prepareOrganizerManualSendTask", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const now = deps.now();
  const taskId = organizerManualSendTaskId(
    data.organizerId,
    actorUid,
    data.requestId,
  );
  const requestHash = hashCanonical({
    organizerId: data.organizerId,
    contactId: data.contactId,
    intent: data.intent,
    prefillText: data.prefillText,
  });
  const taskRef = db.collection("organizerManualSendTasks").doc(taskId);
  const contactRef = db.collection("organizerContacts").doc(data.contactId);
  const channelRef = db.collection("organizerContactChannelStates").doc(
    organizerContactChannelStateId(data.organizerId, data.contactId),
  );
  const task = await db.runTransaction(async (transaction) => {
    const [existingSnapshot, contactSnapshot, channelSnapshot] =
      await Promise.all([
        transaction.get(taskRef),
        transaction.get(contactRef),
        transaction.get(channelRef),
      ]);
    const existing = existingSnapshot.data() as
      OrganizerManualSendTaskDocument | undefined;
    if (existing) {
      if (
        existing.organizerId !== data.organizerId ||
        existing.idempotencyKey !== data.requestId ||
        existing.requestHash !== requestHash
      ) {
        throw new HttpsError(
          "already-exists",
          "This handoff request id was already used for different work.",
        );
      }
      const active = activeManualTask(
        existing,
        data.organizerId,
        existing.revision,
        now,
      );
      return assertManualHandoffLaunchable({
        task: active,
        contact: contactSnapshot.data() as
          OrganizerContactDocument | undefined,
        channelState: channelSnapshot.data() as
          OrganizerContactChannelStateDocument | undefined,
        organizerId: data.organizerId,
      });
    }
    const contact = activeOrganizerContact(
      contactSnapshot.data() as OrganizerContactDocument | undefined,
      data.organizerId,
    );
    const channelState = channelSnapshot.data() as
      OrganizerContactChannelStateDocument | undefined;
    const plan = currentIndividualPlan(data.contactId, contact, channelState);
    const handoff = plan.routes.find((route) =>
      route.routeId === "personalWhatsappHandoff",
    );
    if (handoff?.availability !== "available" || !contact.phoneE164) {
      throw new HttpsError(
        "failed-precondition",
        "This customer is not currently available for a WhatsApp handoff.",
      );
    }
    const task: OrganizerManualSendTaskDocument = {
      organizerId: data.organizerId,
      taskId,
      contactId: data.contactId,
      sourceKind: "individualConversation",
      sourceId: data.contactId,
      intent: data.intent,
      routeId: "personalWhatsappHandoff",
      deliveryMode: "byHand",
      status: "queued",
      active: true,
      revision: 1,
      idempotencyKey: data.requestId,
      requestHash,
      displayNameSnapshot:
        contact.displayNameOverride?.trim() || contact.displayName,
      endpointE164Snapshot: contact.phoneE164,
      endpointHash: hashEndpoint(contact.phoneE164),
      permissionSnapshot: {
        whatsappStatus: contact.whatsappStatus === "optedIn" ?
          "optedIn" : "unknown",
        adminSuppressed: false,
        recordedAt: now,
      },
      capabilitySnapshot: {
        version: organizerCommunicationPlanCapabilityVersion,
        managedRouteAvailable:
          plan.routes.some((route) =>
            route.executionMode === "managedDelivery" &&
            route.availability === "available"),
      },
      prefillText: data.prefillText,
      prefillHash: hashCanonical(data.prefillText),
      openCount: 0,
      createdByUid: actorUid,
      updatedByUid: actorUid,
      createdAt: now,
      updatedAt: now,
      openedAt: null,
      hostMarkedSentAt: null,
      skippedAt: null,
      cancelledAt: null,
      supersededAt: null,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + manualTaskTtlMillis,
      ),
    };
    transaction.create(taskRef, task);
    return task;
  });
  return manualTaskResponse(task, now);
}

export async function listOrganizerManualSendTasksHandler(
  request: CallableRequest<unknown>,
  deps: ManualSendTaskDeps = defaultDeps,
): Promise<ListOrganizerManualSendTasksCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListOrganizerManualSendTasksCallablePayload
  >(
    request,
    validateListOrganizerManualSendTasksCallablePayload,
    normalizeManualTaskPayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerManualSendTasks", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const activeOnly = data.activeOnly ?? true;
  const limit = data.limit ?? 25;
  const cursor = decodeManualTaskCursor(data.cursor ?? null);
  if (
    cursor &&
    (cursor.organizerId !== data.organizerId ||
      cursor.activeOnly !== activeOnly)
  ) {
    throw new HttpsError("invalid-argument", "Manual task cursor mismatch.");
  }
  const now = deps.now();
  let query: FirebaseFirestore.Query = db.collection("organizerManualSendTasks")
    .where("organizerId", "==", data.organizerId);
  query = activeOnly ? query
    .where("active", "==", true)
    .where("expiresAt", ">", now)
    .orderBy("expiresAt", "asc")
    .orderBy("updatedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc") : query
    .orderBy("updatedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc");
  if (cursor) {
    query = activeOnly ? query.startAfter(
      admin.firestore.Timestamp.fromMillis(cursor.expiresAtMillis!),
      admin.firestore.Timestamp.fromMillis(cursor.updatedAtMillis),
      cursor.taskId,
    ) : query.startAfter(
      admin.firestore.Timestamp.fromMillis(cursor.updatedAtMillis),
      cursor.taskId,
    );
  }
  const snapshot = await query.limit(limit + 1).get();
  const visible = snapshot.docs.slice(0, limit);
  const final = visible.at(-1);
  return {
    organizerId: data.organizerId,
    tasks: visible.map((document) => manualTaskResponse(
      document.data() as OrganizerManualSendTaskDocument,
      now,
    )),
    nextCursor: snapshot.size > limit && final ? encodeManualTaskCursor({
      organizerId: data.organizerId,
      activeOnly,
      expiresAtMillis: activeOnly ?
        (final.data() as OrganizerManualSendTaskDocument)
          .expiresAt.toMillis() : null,
      updatedAtMillis:
        (final.data() as OrganizerManualSendTaskDocument).updatedAt.toMillis(),
      taskId: final.id,
    }) : null,
  };
}

export async function openOrganizerManualSendTaskHandler(
  request: CallableRequest<unknown>,
  deps: ManualSendTaskDeps = defaultDeps,
): Promise<OrganizerManualSendTaskCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    OpenOrganizerManualSendTaskCallablePayload
  >(
    request,
    validateOpenOrganizerManualSendTaskCallablePayload,
    normalizeManualTaskPayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "openOrganizerManualSendTask", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const now = deps.now();
  const taskRef = db.collection("organizerManualSendTasks").doc(data.taskId);
  const updated = await db.runTransaction(async (transaction) => {
    const task = await readLaunchableManualTask({
      transaction,
      db,
      organizerId: data.organizerId,
      taskId: data.taskId,
      expectedRevision: data.expectedRevision,
      now,
    });
    const next: OrganizerManualSendTaskDocument = {
      ...task,
      status: "handoffOpened",
      revision: task.revision + 1,
      openCount: task.openCount + 1,
      updatedByUid: actorUid,
      updatedAt: now,
      openedAt: now,
    };
    transaction.update(taskRef, {
      status: next.status,
      revision: next.revision,
      openCount: next.openCount,
      updatedByUid: next.updatedByUid,
      updatedAt: next.updatedAt,
      openedAt: next.openedAt,
    });
    return next;
  });
  return manualTaskResponse(updated, now);
}

export async function validateOrganizerManualSendTaskLaunchHandler(
  request: CallableRequest<unknown>,
  deps: ManualSendTaskDeps = defaultDeps,
): Promise<OrganizerManualSendTaskCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ValidateOrganizerManualSendTaskLaunchCallablePayload
  >(
    request,
    validateValidateOrganizerManualSendTaskLaunchCallablePayload,
    normalizeManualTaskPayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    actorUid,
    "validateOrganizerManualSendTaskLaunch",
    {maxRequests: 30, windowMs: 60 * 1000},
  );
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const now = deps.now();
  const task = await db.runTransaction((transaction) =>
    readLaunchableManualTask({
      transaction,
      db,
      organizerId: data.organizerId,
      taskId: data.taskId,
      expectedRevision: data.expectedRevision,
      now,
    }),
  );
  return manualTaskResponse(task, now);
}

export async function markOrganizerManualSendTaskHandler(
  request: CallableRequest<unknown>,
  deps: ManualSendTaskDeps = defaultDeps,
): Promise<OrganizerManualSendTaskCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    MarkOrganizerManualSendTaskCallablePayload
  >(
    request,
    validateMarkOrganizerManualSendTaskCallablePayload,
    normalizeManualTaskPayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "markOrganizerManualSendTask", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const now = deps.now();
  const taskRef = db.collection("organizerManualSendTasks").doc(data.taskId);
  const updated = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(taskRef);
    const task = activeManualTask(
      snapshot.data() as OrganizerManualSendTaskDocument | undefined,
      data.organizerId,
      data.expectedRevision,
      now,
    );
    const next = terminalManualTask(task, data.action, actorUid, now);
    transaction.update(taskRef, {
      status: next.status,
      active: false,
      revision: next.revision,
      updatedByUid: actorUid,
      updatedAt: now,
      hostMarkedSentAt: next.hostMarkedSentAt,
      skippedAt: next.skippedAt,
      cancelledAt: next.cancelledAt,
    });
    return next;
  });
  return manualTaskResponse(updated, now);
}

export async function replanOrganizerManualSendTasksHandler(
  request: CallableRequest<unknown>,
  deps: ManualSendTaskDeps = defaultDeps,
): Promise<ReplanOrganizerManualSendTasksCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ReplanOrganizerManualSendTasksCallablePayload
  >(
    request,
    validateReplanOrganizerManualSendTasksCallablePayload,
    normalizeManualTaskPayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "replanOrganizerManualSendTasks", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const taskSnapshots = await db.getAll(...data.taskIds.map((taskId) =>
    db.collection("organizerManualSendTasks").doc(taskId),
  ));
  const tasks = taskSnapshots.map((snapshot) => {
    const task = snapshot.data() as OrganizerManualSendTaskDocument | undefined;
    if (!task || task.organizerId !== data.organizerId) {
      throw new HttpsError("not-found", "Manual send task not found.");
    }
    return task;
  });
  const contactIds = [...new Set(tasks.map((task) => task.contactId))];
  const contactSnapshots = await db.getAll(...contactIds.map((contactId) =>
    db.collection("organizerContacts").doc(contactId),
  ));
  const channelSnapshots = await db.getAll(...contactIds.map((contactId) =>
    db.collection("organizerContactChannelStates").doc(
      organizerContactChannelStateId(data.organizerId, contactId),
    ),
  ));
  const contacts = new Map(contactIds.map((contactId, index) => [
    contactId,
    contactSnapshots[index].data() as OrganizerContactDocument | undefined,
  ]));
  const channels = new Map(contactIds.map((contactId, index) => [
    contactId,
    channelSnapshots[index].data() as
      OrganizerContactChannelStateDocument | undefined,
  ]));
  const now = deps.now();
  return {
    organizerId: data.organizerId,
    results: tasks.map((task) => manualTaskReplanResult({
      task,
      contact: contacts.get(task.contactId),
      channelState: channels.get(task.contactId),
      organizerId: data.organizerId,
      now,
    })),
    resolvedAtMillis: now.toMillis(),
  };
}

export function organizerManualSendTaskId(
  organizerId: string,
  actorUid: string,
  requestId: string,
): string {
  const digest = createHash("sha256")
    .update(`${organizerId}|${actorUid}|${requestId}`)
    .digest("hex")
    .slice(0, 48);
  return `omst_${digest}`;
}

export function terminalManualTask(
  task: OrganizerManualSendTaskDocument,
  action: "hostMarkedSent" | "skipped" | "cancelled",
  actorUid: string,
  now: FirebaseFirestore.Timestamp,
): OrganizerManualSendTaskDocument {
  if (!task.active || !["queued", "handoffOpened"].includes(task.status)) {
    throw new HttpsError("failed-precondition", "Manual task is not active.");
  }
  if (action === "hostMarkedSent" && task.status !== "handoffOpened") {
    throw new HttpsError(
      "failed-precondition",
      "Open the handoff before marking it sent.",
    );
  }
  return {
    ...task,
    status: action,
    active: false,
    revision: task.revision + 1,
    updatedByUid: actorUid,
    updatedAt: now,
    hostMarkedSentAt: action === "hostMarkedSent" ? now : null,
    skippedAt: action === "skipped" ? now : null,
    cancelledAt: action === "cancelled" ? now : null,
  };
}

export function manualTaskReplanResult(params: {
  task: OrganizerManualSendTaskDocument;
  contact: OrganizerContactDocument | undefined;
  channelState: OrganizerContactChannelStateDocument | undefined;
  organizerId: string;
  now: FirebaseFirestore.Timestamp;
}): ReplanResult {
  const {task, contact, channelState, organizerId, now} = params;
  if (!task.active || task.expiresAt.toMillis() <= now.toMillis()) {
    return {
      taskId: task.taskId,
      contactId: task.contactId,
      disposition: "taskInactive",
      recommendedRouteId: null,
      blocker: null,
    };
  }
  if (
    !contact ||
    contact.organizerId !== organizerId ||
    contact.deletedAt !== null ||
    contact.hiddenAt != null ||
    contact.identityState === "merged"
  ) {
    return {
      taskId: task.taskId,
      contactId: task.contactId,
      disposition: "unavailable",
      recommendedRouteId: null,
      blocker: "contactUnavailable",
    };
  }
  if (
    contact.phoneE164 &&
    hashEndpoint(contact.phoneE164) !== task.endpointHash
  ) {
    return {
      taskId: task.taskId,
      contactId: task.contactId,
      disposition: "unavailable",
      recommendedRouteId: null,
      blocker: "endpointChanged",
    };
  }
  const plan = currentIndividualPlan(task.contactId, contact, channelState);
  const recommended = plan.recommendedRouteId;
  if (recommended === "catchChat") {
    return {
      taskId: task.taskId,
      contactId: task.contactId,
      disposition: "managedRouteAvailable",
      recommendedRouteId: recommended,
      blocker: null,
    };
  }
  if (recommended === "personalWhatsappHandoff") {
    return {
      taskId: task.taskId,
      contactId: task.contactId,
      disposition: "keepByHand",
      recommendedRouteId: recommended,
      blocker: null,
    };
  }
  const handoff = plan.routes.find((route) =>
    route.routeId === "personalWhatsappHandoff",
  );
  return {
    taskId: task.taskId,
    contactId: task.contactId,
    disposition: "unavailable",
    recommendedRouteId: null,
    blocker: manualHandoffBlocker(handoff?.blocker),
  };
}

function currentIndividualPlan(
  contactId: string,
  contact: OrganizerContactDocument,
  channelState: OrganizerContactChannelStateDocument | undefined,
) {
  return resolveIndividualCommunicationPlan({
    contactId,
    displayName: contact.displayNameOverride?.trim() || contact.displayName,
    linkedUid: contact.linkedUid,
    identityState: contact.identityState === "merged" ?
      "ambiguous" : contact.identityState,
    ambiguousCandidateCount: contact.ambiguousCandidateContactIds.length,
    phoneE164: contact.phoneE164,
    email: contact.email ?? null,
    whatsappStatus: contact.whatsappStatus,
    whatsappAdminSuppressed: channelState?.adminSuppressed === true,
  });
}

interface LaunchableManualTaskRead {
  transaction: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  taskId: string;
  expectedRevision: number;
  now: FirebaseFirestore.Timestamp;
}

async function readLaunchableManualTask(
  params: LaunchableManualTaskRead,
): Promise<OrganizerManualSendTaskDocument> {
  const {transaction, db, organizerId, taskId, expectedRevision, now} = params;
  const taskRef = db.collection("organizerManualSendTasks").doc(taskId);
  const taskSnapshot = await transaction.get(taskRef);
  const task = activeManualTask(
    taskSnapshot.data() as OrganizerManualSendTaskDocument | undefined,
    organizerId,
    expectedRevision,
    now,
  );
  const contactRef = db.collection("organizerContacts").doc(task.contactId);
  const channelRef = db.collection("organizerContactChannelStates").doc(
    organizerContactChannelStateId(organizerId, task.contactId),
  );
  const [contactSnapshot, channelSnapshot] = await Promise.all([
    transaction.get(contactRef),
    transaction.get(channelRef),
  ]);
  return assertManualHandoffLaunchable({
    task,
    contact: contactSnapshot.data() as OrganizerContactDocument | undefined,
    channelState: channelSnapshot.data() as
      OrganizerContactChannelStateDocument | undefined,
    organizerId,
  });
}

export function assertManualHandoffLaunchable(params: {
  task: OrganizerManualSendTaskDocument;
  contact: OrganizerContactDocument | undefined;
  channelState: OrganizerContactChannelStateDocument | undefined;
  organizerId: string;
}): OrganizerManualSendTaskDocument {
  const {task, channelState, organizerId} = params;
  const contact = activeOrganizerContact(params.contact, organizerId);
  const handoff = currentIndividualPlan(
    task.contactId,
    contact,
    channelState,
  ).routes.find((route) => route.routeId === "personalWhatsappHandoff");
  if (
    handoff?.availability !== "available" ||
    !contact.phoneE164 ||
    hashEndpoint(contact.phoneE164) !== task.endpointHash
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The customer endpoint or handoff permission changed. " +
        "Start a fresh handoff.",
    );
  }
  return task;
}

function manualHandoffBlocker(
  blocker: string | null | undefined,
): ReplanResult["blocker"] {
  return switchValue(blocker, {
    missingPhone: "missingPhone",
    organizerSuppressed: "organizerSuppressed",
    contactOptedOut: "contactOptedOut",
  }) ?? "contactUnavailable";
}

function switchValue<T extends string>(
  value: string | null | undefined,
  values: Record<string, T>,
): T | null {
  return value == null ? null : values[value] ?? null;
}

function activeOrganizerContact(
  contact: OrganizerContactDocument | undefined,
  organizerId: string,
): OrganizerContactDocument {
  if (
    !contact ||
    contact.organizerId !== organizerId ||
    contact.deletedAt !== null ||
    contact.hiddenAt != null ||
    contact.identityState === "merged"
  ) {
    throw new HttpsError("not-found", "Customer not found.");
  }
  return contact;
}

function activeManualTask(
  task: OrganizerManualSendTaskDocument | undefined,
  organizerId: string,
  expectedRevision: number,
  now: FirebaseFirestore.Timestamp,
): OrganizerManualSendTaskDocument {
  if (!task || task.organizerId !== organizerId) {
    throw new HttpsError("not-found", "Manual send task not found.");
  }
  if (task.revision !== expectedRevision) {
    throw new HttpsError(
      "aborted",
      "Manual send task changed. Refresh before continuing.",
    );
  }
  if (
    !task.active ||
    !["queued", "handoffOpened"].includes(task.status) ||
    task.expiresAt.toMillis() <= now.toMillis()
  ) {
    throw new HttpsError("failed-precondition", "Manual task is not active.");
  }
  return task;
}

function manualTaskResponse(
  task: OrganizerManualSendTaskDocument,
  now: FirebaseFirestore.Timestamp,
): OrganizerManualSendTaskCallableResponse {
  const expired = task.expiresAt.toMillis() <= now.toMillis();
  return {
    organizerId: task.organizerId,
    taskId: task.taskId,
    contactId: task.contactId,
    displayName: task.displayNameSnapshot,
    intent: task.intent,
    routeId: task.routeId,
    deliveryMode: task.deliveryMode,
    status: expired && task.active ? "expired" : task.status,
    active: expired ? false : task.active,
    revision: task.revision,
    phoneE164: task.endpointE164Snapshot,
    prefillText: task.prefillText,
    openCount: task.openCount,
    createdAtMillis: task.createdAt.toMillis(),
    updatedAtMillis: task.updatedAt.toMillis(),
    openedAtMillis: task.openedAt?.toMillis() ?? null,
    expiresAtMillis: task.expiresAt.toMillis(),
  };
}

interface ManualTaskCursor {
  organizerId: string;
  activeOnly: boolean;
  expiresAtMillis: number | null;
  updatedAtMillis: number;
  taskId: string;
}

function encodeManualTaskCursor(cursor: ManualTaskCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeManualTaskCursor(value: string | null):
  ManualTaskCursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as ManualTaskCursor;
    if (
      typeof decoded.organizerId !== "string" ||
      typeof decoded.activeOnly !== "boolean" ||
      (decoded.activeOnly ?
        !Number.isSafeInteger(decoded.expiresAtMillis) :
        decoded.expiresAtMillis !== null) ||
      !Number.isSafeInteger(decoded.updatedAtMillis) ||
      typeof decoded.taskId !== "string"
    ) throw new Error("invalid");
    return decoded;
  } catch {
    throw new HttpsError("invalid-argument", "Invalid manual task cursor.");
  }
}

function normalizeManualTaskPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const result = {...value as Record<string, unknown>};
  for (const [key, child] of Object.entries(result)) {
    if (typeof child === "string") result[key] = child.trim();
  }
  if (Array.isArray(result.taskIds)) {
    result.taskIds = result.taskIds.map((item) =>
      typeof item === "string" ? item.trim() : item,
    );
  }
  return result;
}

const manualTaskCallableLimits = {
  timeoutSeconds: 60,
  maxInstances: 30,
  concurrency: 40,
};

export const prepareOrganizerManualSendTask = onCall(
  appCheckCallableOptionsWithLimits(manualTaskCallableLimits),
  (request) => prepareOrganizerManualSendTaskHandler(request),
);
export const listOrganizerManualSendTasks = onCall(
  appCheckCallableOptionsWithLimits(manualTaskCallableLimits),
  (request) => listOrganizerManualSendTasksHandler(request),
);
export const openOrganizerManualSendTask = onCall(
  appCheckCallableOptionsWithLimits(manualTaskCallableLimits),
  (request) => openOrganizerManualSendTaskHandler(request),
);
export const validateOrganizerManualSendTaskLaunch = onCall(
  appCheckCallableOptionsWithLimits(manualTaskCallableLimits),
  (request) => validateOrganizerManualSendTaskLaunchHandler(request),
);
export const markOrganizerManualSendTask = onCall(
  appCheckCallableOptionsWithLimits(manualTaskCallableLimits),
  (request) => markOrganizerManualSendTaskHandler(request),
);
export const replanOrganizerManualSendTasks = onCall(
  appCheckCallableOptionsWithLimits(manualTaskCallableLimits),
  (request) => replanOrganizerManualSendTasksHandler(request),
);
