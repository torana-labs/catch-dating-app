import type {Firestore, Transaction} from "firebase-admin/firestore";
import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {operationContentHash} from "../../operations/durableActions";
import type {EventAssistanceOperationalNoticeQuotaDocument as Quota} from
  "../../shared/generated/eventAssistanceOperationalNoticeQuotaDocument";
import type {
  EventAssistanceOperationalNoticePublicationDocument as Receipt,
} from
  "../../shared/generated/eventAssistanceOperationalNoticePublicationDocument";
// eslint-disable-next-line max-len
import {validateEventAssistanceOperationalNoticeQuotaDocument} from "../../shared/generated/validators/eventAssistanceOperationalNoticeQuotaDocument";
// eslint-disable-next-line max-len
import {validateEventAssistanceOperationalNoticePublicationDocument} from "../../shared/generated/validators/eventAssistanceOperationalNoticePublicationDocument";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {prepareGuestMessagePublication} from "./guestMessagePublication";
import {guestCollections, parseThread, readGuestSourceFacts,
  requireDocumentId, threadIdentity} from "./guestRecords";
import {assistanceMessageId, parseMessageRecord} from "./messageOutbox";
import {operationalNoticeContentHash, OperationalNoticeIntent,
  parseMessageIntent} from "./messageProtocol";
import {ASSISTANCE_POLICY_VERSION} from "./policySettings";
import {readSettingState, resolveSetting} from "./policySettingsReader";
import {sameMessageContext} from "./messagingPolicy";

export const OPERATIONAL_NOTICE_QUOTAS =
  "eventAssistanceOperationalNoticeQuotas";
export const OPERATIONAL_NOTICE_PUBLICATIONS =
  "eventAssistanceOperationalNoticePublications";

export type OperationalNoticeSourceKind = "planChange" | "followUp";
type LiveContext = Extract<OperationalNoticeIntent["context"],
  {mode: "live"}>;
type NoticeChoice = OperationalNoticeIntent["choices"][number];
type SourceChoice = Omit<NoticeChoice, "value"> & {value:
  {kind: "acknowledge"} |
  Extract<NoticeChoice["value"], {kind: "requestHelp"}>};

export interface OperationalNoticeSource<K extends
  OperationalNoticeSourceKind> {
  kind: K;
  context: LiveContext;
  eventId: string;
  attendeeId: string;
  groupId: string;
  sourceId: string;
  revision: number;
  occurredAt: number;
  validUntil: number;
  title: string;
  body: string;
  choices: readonly SourceChoice[];
}

export interface OperationalNoticeSourceRequest<K extends
  OperationalNoticeSourceKind> {
  context: LiveContext;
  attendeeId: string;
  episodeId: string;
  policyBinding: {
    groupId: string;
    settingId: string;
    expectedRevision: number;
  };
  source: {kind: K; sourceId: string; expectedRevision: number};
}

/**
 * A domain adapter must establish that this source exists and affects the
 * requested guest. The publisher never accepts caller-authored message copy.
 */
export interface OperationalNoticeSourceReader<K extends
  OperationalNoticeSourceKind> {
  readonly kind: K;
  read(db: Firestore, tx: Transaction,
    request: OperationalNoticeSourceRequest<K>, now: number):
    Promise<OperationalNoticeSource<K> | null>;
}

type HeldReason = "sourceUnavailable" | "sourceChanged" |
  "policyUnavailable" | "quotaReached" | "outsideWindow" |
  "sourceAlreadyPublished";
type PreparedPublication = {
  kind: "prepared";
  messageId: string;
  threadId: string;
  intent: OperationalNoticeIntent;
  ordinal: number;
  commit: () => void;
};
type ReplayedPublication = {
  kind: "replayed";
  messageId: string;
  threadId: string;
  intent: OperationalNoticeIntent;
  ordinal: number;
};

/**
 * Reads domain source, current host policy, roster generation and quota before
 * staging an atomic message, delivery-work, quota and publication receipt.
 */
export async function prepareOperationalNoticePublication<K extends
  OperationalNoticeSourceKind>(db: Firestore, tx: Transaction,
  request: OperationalNoticeSourceRequest<K>,
  reader: OperationalNoticeSourceReader<K>,
  clock: () => number = Date.now): Promise<PreparedPublication |
    ReplayedPublication | {kind: "held"; reason: HeldReason}> {
  validateRequest(request, reader.kind);
  const now = checkedNow(clock());
  const descriptor = sourceDescriptor(request.source.kind);
  const guestSource = await readGuestSourceFacts(db, tx, request.context,
    request.attendeeId);
  const quotaId = operationalNoticeQuotaId(request.context,
    request.attendeeId, guestSource.attendeeGeneration,
    guestSource.sourceGeneration, descriptor.workflowKind);
  const publicationId = operationalNoticePublicationId(quotaId,
    request.source.sourceId, request.source.expectedRevision);
  const quotaRef = db.collection(OPERATIONAL_NOTICE_QUOTAS).doc(quotaId);
  const receiptRef = db.collection(OPERATIONAL_NOTICE_PUBLICATIONS)
    .doc(publicationId);
  const [quotaSnap, receiptSnap] = await tx.getAll(quotaRef, receiptRef);
  const quota = quotaSnap.exists ? parseQuota(quotaSnap.data(), {
    quotaId, context: request.context, attendeeId: request.attendeeId,
    attendeeGeneration: guestSource.attendeeGeneration,
    sourceGeneration: guestSource.sourceGeneration,
    workflowKind: descriptor.workflowKind,
  }) : null;
  if (receiptSnap.exists) {
    return readPublicationReplay(db, tx, receiptSnap.data(), {
      publicationId, quotaId, quota, request,
      workflowKind: descriptor.workflowKind,
    });
  }
  const source = await reader.read(db, tx, structuredClone(request), now);
  if (!source) return {kind: "held", reason: "sourceUnavailable"};
  validateSource(source, request, reader.kind, now);
  if (source.revision !== request.source.expectedRevision) {
    return {kind: "held", reason: "sourceChanged"};
  }
  const eventSnap = await tx.get(db.collection("events")
    .doc(request.context.eventId));
  const settingState = await readSettingState(db, tx, {
    context: request.context, groupId: source.groupId,
    workflowKind: descriptor.workflowKind,
  }, eventSnap, () => now);
  const resolved = resolveSetting(settingState);
  const template = resolved.template;
  if (resolved.status !== "configured" || !resolved.selected || !template ||
      resolved.selected.groupId !== request.policyBinding.groupId ||
      resolved.selected.settingId !== request.policyBinding.settingId ||
      resolved.selected.revision !== request.policyBinding.expectedRevision ||
      template.kind !== descriptor.workflowKind ||
      template.config.templateIntent !== request.source.kind ||
      template.setting.kind !== "enabled" ||
      template.setting.authority !== "executeWithinPolicy") {
    return {kind: "held", reason: "policyUnavailable"};
  }
  const delivery = template.config.delivery;
  if ((quota?.count ?? 0) >= template.config.maximumPerGuest) {
    return {kind: "held", reason: "quotaReached"};
  }
  const serviceEnd = guestSource.eventEnd + 86_400_000;
  const windowEnd = request.source.kind === "planChange" ?
    guestSource.eventEnd : serviceEnd;
  const phaseOpen = request.source.kind === "planChange" ?
    guestSource.eventStatus === "active" && now < guestSource.eventEnd :
    guestSource.eventStatus === "active" && now >= guestSource.eventEnd &&
      now < serviceEnd;
  const expiresAt = Math.min(source.validUntil, windowEnd,
    source.occurredAt + template.config.expiryMinutes * 60_000);
  if (!phaseOpen || now >= expiresAt || source.occurredAt >= expiresAt) {
    return {kind: "held", reason: "outsideWindow"};
  }
  const choices = source.choices.map((choice) => ({...structuredClone(choice),
    value: choice.value.kind === "acknowledge" ?
      {kind: "acknowledge" as const, instructionRevision: source.revision} :
      structuredClone(choice.value)}));
  const workflow = {kind: descriptor.workflowKind,
    occurrenceId: source.sourceId};
  const intentId = "message:" + operationContentHash([request.context,
    request.attendeeId, request.episodeId, workflow, source.revision]);
  const unbound = parseMessageIntent({schemaVersion: 1, intentId, revision: 1,
    context: request.context, eventId: request.context.eventId,
    attendeeId: request.attendeeId, episodeId: request.episodeId, workflow,
    createdAt: source.occurredAt, expiresAt,
    permittedRoutes: delivery.routes.map((route) => route.routeId),
    deliveryPolicy: structuredClone(delivery.policy),
    kind: "operationalNotice", noticeKind: descriptor.noticeKind,
    title: source.title, body: source.body,
    instructionRevision: source.revision, choices,
  }) as OperationalNoticeIntent;
  const intent = parseMessageIntent({...unbound, automation: {
    kind: "operationalNotice", noticeKind: descriptor.noticeKind,
    policyVersion: ASSISTANCE_POLICY_VERSION, groupId: source.groupId,
    settingId: resolved.selected.settingId,
    settingRevision: resolved.selected.revision,
    sourceId: source.sourceId, sourceRevision: source.revision,
    contentHash: operationalNoticeContentHash(unbound),
    routes: structuredClone(delivery.routes),
  }}) as OperationalNoticeIntent;
  const threadId = threadIdentity(intent);
  const threadSnap = await tx.get(db.collection(guestCollections.threads)
    .doc(threadId));
  const thread = threadSnap.exists ? parseThread(threadSnap.data()) : null;
  const publication = await prepareGuestMessagePublication(db, tx, intent,
    thread?.revision ?? null, clock);
  const messageId = assistanceMessageId(intent);
  const ordinal = (quota?.count ?? 0) + 1;
  const nextQuota = parseQuota({schemaVersion: 1, quotaId,
    context: request.context, eventId: request.context.eventId,
    attendeeId: request.attendeeId,
    attendeeGeneration: guestSource.attendeeGeneration,
    sourceGeneration: guestSource.sourceGeneration,
    workflowKind: descriptor.workflowKind, count: ordinal,
    revision: (quota?.revision ?? 0) + 1,
    createdAt: quota?.createdAt ?? now, updatedAt: now}, {
    quotaId, context: request.context, attendeeId: request.attendeeId,
    attendeeGeneration: guestSource.attendeeGeneration,
    sourceGeneration: guestSource.sourceGeneration,
    workflowKind: descriptor.workflowKind,
  });
  const receipt = parseReceipt({schemaVersion: 1, publicationId, quotaId,
    context: request.context, eventId: request.context.eventId,
    attendeeId: request.attendeeId, episodeId: request.episodeId,
    sourceKind: request.source.kind,
    workflowKind: descriptor.workflowKind, sourceId: source.sourceId,
    sourceRevision: source.revision, messageId,
    threadId: publication.thread.threadId, ordinal,
    contentHash: operationalNoticeContentHash(intent),
    intentHash: operationContentHash(intent),
    sourceOccurredAt: source.occurredAt, createdAt: now});
  return {kind: "prepared", messageId, threadId, intent, ordinal,
    commit: () => {
      const committedAt = checkedNow(clock());
      if (committedAt < now || committedAt >= expiresAt) {
        throw new Error("Operational notice publication snapshot expired");
      }
      publication.commit();
      if (quota) tx.set(quotaRef, nextQuota);
      else tx.create(quotaRef, nextQuota);
      tx.create(receiptRef, receipt);
    }};
}

/** Trusted publisher; concrete domain adapters are injected by live workers. */
export class OperationalNoticePublisher<K extends
  OperationalNoticeSourceKind> {
  constructor(private readonly db: Firestore,
    private readonly reader: OperationalNoticeSourceReader<K>,
    private readonly clock: () => number = Date.now) {}

  async publish(request: OperationalNoticeSourceRequest<K>) {
    return transact(this.db, async (tx) => {
      const result = await prepareOperationalNoticePublication(this.db, tx,
        request, this.reader, this.clock);
      if (result.kind !== "prepared") return result;
      result.commit();
      const {commit, ...published} = result;
      void commit;
      return {...published, kind: "published" as const};
    });
  }
}

export function operationalNoticeQuotaId(context: LiveContext,
  attendeeId: string, attendeeGeneration: string, sourceGeneration: string,
  workflowKind: Quota["workflowKind"]) {
  return "notice-quota:" + operationContentHash([context, attendeeId,
    attendeeGeneration, sourceGeneration, workflowKind]);
}

export function operationalNoticePublicationId(quotaId: string,
  sourceId: string, sourceRevision: number) {
  return "notice-publication:" + operationContentHash([
    quotaId, sourceId, sourceRevision]);
}

function validateRequest<K extends OperationalNoticeSourceKind>(
  request: OperationalNoticeSourceRequest<K>, readerKind: K) {
  requireDocumentId(request.context.eventId);
  requireDocumentId(request.attendeeId);
  requireDocumentId(request.episodeId);
  requireDocumentId(request.policyBinding.groupId);
  requireDocumentId(request.policyBinding.settingId);
  if (!Number.isSafeInteger(request.policyBinding.expectedRevision) ||
      request.policyBinding.expectedRevision < 1) {
    throw new Error("Invalid operational notice policy binding");
  }
  requireDocumentId(request.source.sourceId);
  if (request.context.mode !== "live" || request.source.kind !== readerKind ||
      !Number.isSafeInteger(request.source.expectedRevision) ||
      request.source.expectedRevision < 1) {
    throw new Error("Invalid operational notice publication request");
  }
}

function validateSource<K extends OperationalNoticeSourceKind>(
  source: OperationalNoticeSource<K>,
  request: OperationalNoticeSourceRequest<K>, readerKind: K, now: number) {
  requireDocumentId(source.groupId);
  requireDocumentId(source.sourceId);
  if (source.kind !== readerKind ||
      !sameMessageContext(source.context, request.context) ||
      source.eventId !== request.context.eventId ||
      source.attendeeId !== request.attendeeId ||
      source.sourceId !== request.source.sourceId ||
      !Number.isSafeInteger(source.revision) || source.revision < 1 ||
      !Number.isSafeInteger(source.occurredAt) || source.occurredAt < 0 ||
      source.occurredAt > now || !Number.isSafeInteger(source.validUntil) ||
      source.validUntil <= source.occurredAt) {
    throw new Error("Operational notice source is outside its request");
  }
}

function sourceDescriptor(kind: OperationalNoticeSourceKind) {
  return kind === "planChange" ? {
    noticeKind: "planChanged" as const,
    workflowKind: "planChangeCommunication" as const,
  } : {noticeKind: "followUp" as const,
    workflowKind: "postEventFollowUp" as const};
}

function checkedNow(now: number) {
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new Error("Invalid operational notice clock");
  }
  return now;
}

function parseQuota(value: unknown, expected: Pick<Quota, "quotaId" |
  "context" | "attendeeId" | "attendeeGeneration" | "sourceGeneration" |
  "workflowKind">): Quota {
  if (!validateEventAssistanceOperationalNoticeQuotaDocument(value)) {
    throw new Error("Invalid operational notice quota");
  }
  const quota = value;
  if (quota.quotaId !== expected.quotaId ||
      quota.eventId !== (expected.context.mode === "live" ?
        expected.context.eventId : "") ||
      !sameMessageContext(quota.context, expected.context) ||
      quota.attendeeId !== expected.attendeeId ||
      quota.attendeeGeneration !== expected.attendeeGeneration ||
      quota.sourceGeneration !== expected.sourceGeneration ||
      quota.workflowKind !== expected.workflowKind ||
      quota.createdAt > quota.updatedAt || quota.revision !== quota.count) {
    throw new Error("Operational notice quota identity mismatch");
  }
  return quota;
}

function parseReceipt(value: unknown): Receipt {
  if (!validateEventAssistanceOperationalNoticePublicationDocument(value)) {
    throw new Error("Invalid operational notice publication receipt");
  }
  return value;
}

async function readPublicationReplay<K extends OperationalNoticeSourceKind>(
  db: Firestore, tx: Transaction, value: unknown, expected: {
    publicationId: string;
    quotaId: string;
    quota: Quota | null;
    request: OperationalNoticeSourceRequest<K>;
    workflowKind: Quota["workflowKind"];
  }): Promise<ReplayedPublication |
    {kind: "held"; reason: "sourceAlreadyPublished"}> {
  const receipt = parseReceipt(value);
  const {request} = expected;
  if (receipt.publicationId !== expected.publicationId ||
      receipt.quotaId !== expected.quotaId ||
      !sameMessageContext(receipt.context, request.context) ||
      receipt.eventId !== request.context.eventId ||
      receipt.attendeeId !== request.attendeeId ||
      receipt.sourceKind !== request.source.kind ||
      receipt.workflowKind !== expected.workflowKind ||
      receipt.sourceId !== request.source.sourceId ||
      receipt.sourceRevision !== request.source.expectedRevision ||
      !expected.quota || receipt.ordinal > expected.quota.count ||
      receipt.createdAt > expected.quota.updatedAt) {
    throw new Error("Operational notice publication receipt mismatch");
  }
  const record = parseMessageRecord((await tx.get(db.collection(
    EVENT_ASSISTANCE_MESSAGES).doc(receipt.messageId))).data());
  const intent = record.intent;
  const descriptor = sourceDescriptor(request.source.kind);
  if (record.messageId !== receipt.messageId ||
      intent.kind !== "operationalNotice" || !intent.automation ||
      !sameMessageContext(intent.context, request.context) ||
      intent.eventId !== request.context.eventId ||
      intent.attendeeId !== request.attendeeId ||
      intent.episodeId !== receipt.episodeId ||
      intent.noticeKind !== descriptor.noticeKind ||
      intent.workflow.kind !== descriptor.workflowKind ||
      intent.workflow.occurrenceId !== receipt.sourceId ||
      intent.automation.sourceId !== receipt.sourceId ||
      intent.automation.sourceRevision !== receipt.sourceRevision ||
      threadIdentity(intent) !== receipt.threadId ||
      operationalNoticeContentHash(intent) !== receipt.contentHash ||
      operationContentHash(intent) !== receipt.intentHash) {
    throw new Error("Operational notice publication evidence mismatch");
  }
  if (receipt.episodeId !== request.episodeId) {
    return {kind: "held", reason: "sourceAlreadyPublished"};
  }
  return {kind: "replayed", messageId: receipt.messageId,
    threadId: receipt.threadId, intent, ordinal: receipt.ordinal};
}
