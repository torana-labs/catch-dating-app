import {createHash} from "node:crypto";
import {snapshotOfferPaymentTerms} from
  "../events/eventSetupPreferences/payment";
import {eventPaymentTermsHash, validateEventPaymentTerms} from
  "../events/eventSetupPreferences/resolve";
import {prepareOfferHandoff, PreparedOfferHandoff,
  ReviewedOfferHandoff} from "../organizerEventOfferHandoff/message";
import type {EventPaymentTerms, OfferPaymentSnapshot,
  ResolvedEventPreferences} from
  "../events/eventSetupPreferences/types";
import {
  applyEventOfferAction, CurrentOfferContext, EventOffer,
  EventOfferPaymentSnapshot, eventOfferId,
  OfferAction, OfferActionReceipt, OfferDomainError, OfferTransition,
} from "./eventOfferDomain";
import {BRAND} from "../shared/generated/brand";

/**
 * Application service, not a callable. The server-only Firestore adapter uses
 * one serializable transaction for every callback, including authority reads,
 * writes, receipts and audit rows. It must never trust client-supplied context
 * flags. No endpoint, collection rule, admission, seat, send or provider call
 * is installed by this module.
 */
export interface OfferAuthorityRow {
  organizerId: string;
  applicationId: string;
  /** For formResponse this ID is the submitted response ID. */
  sourceKind?: "application" | "formResponse";
  contactId: string;
  eventId: string;
}

export interface OfferApplication {
  sourceKind: "application" | "formResponse";
  organizerId: string;
  applicationId: string;
  contactId: string | null;
  latestResponseId: string;
  conversionContactId?: string | null;
  conversionStatus?: "completed" | "pending" | "failed" | null;
  reviewStatus: string;
  revision: number;
  targetKind: "organizer" | "event" | "campaign";
  targetId: string | null;
}

export interface OfferContact {
  organizerId: string;
  contactId: string;
  deleted: boolean;
  hidden: boolean;
  mergedIntoContactId: string | null;
  revision: number;
}

export interface OfferOrigin {
  organizerId: string;
  sourceResponseId: string;
  currentContactId: string;
  originContactId: string;
}

export interface OfferEvent {
  organizerId: string;
  eventId: string;
  startsAtMillis: number;
  cancelled: boolean;
  sourceRevision: number;
}

export type OfferSourceState =
  "organizerImported" | "activeParticipantGrant" |
  "submittedFormResponse" | "revokedParticipantGrant";

export interface OfferAuditEntry {
  offerId: string;
  requestId: string;
  actorUid: string;
  kind: OfferAction["kind"];
  beforeRevision: number;
  afterRevision: number;
  generation: number;
  atMillis: number;
  /** No answers, private profile fields, payment tokens or raw evidence. */
  paymentStatus: EventOffer["manualPayment"]["status"];
  bankReceiptChecked: boolean;
  reviewNote: string | null;
}

export interface OfferBatchReceipt {
  /** Historical result at commit time; not current offer state. */
  organizerId: string;
  eventId: string;
  requestId: string;
  requestHash: string;
  results: Array<{offerId: string; revision: number; generation: number}>;
}

export interface OfferTransaction {
  /** Server clock evaluated inside each transaction attempt. */
  nowMillis(): number;
  managerAuthorized(organizerId: string, actorUid: string): Promise<boolean>;
  application(applicationId: string,
    sourceKind: "application" | "formResponse"):
    Promise<OfferApplication | null>;
  sourceState(applicationId: string): Promise<OfferSourceState>;
  contact(contactId: string): Promise<OfferContact | null>;
  origin(applicationId: string, responseId: string):
    Promise<OfferOrigin | null>;
  event(eventId: string): Promise<OfferEvent | null>;
  eventPaymentTerms(eventId: string): Promise<EventPaymentTerms | null>;
  eventPreferences(eventId: string): Promise<{
    revision: number; preferences: ResolvedEventPreferences;
    paymentTerms: EventPaymentTerms;
  } | null>;
  handoffPresentation(offer: EventOffer, sourceResponseId: string):
    Promise<{event: ReviewedOfferHandoff["event"];
      recipient: ReviewedOfferHandoff["recipient"]}>;
  offer(offerId: string): Promise<EventOffer | null>;
  actionReceipt(offerId: string, requestId: string):
    Promise<OfferActionReceipt | null>;
  batchReceipt(organizerId: string, requestId: string):
    Promise<OfferBatchReceipt | null>;
  listOffers(organizerId: string, eventId: string,
    afterOfferId: string | null, limit: number):
    Promise<EventOffer[]>;
  hasMergedContactOffer(organizerId: string, eventId: string,
    canonicalContactId: string): Promise<boolean>;
  putOffer(offer: EventOffer): void;
  createActionReceipt(receipt: OfferActionReceipt): void;
  createBatchReceipt(receipt: OfferBatchReceipt): void;
  appendAudit(entry: OfferAuditEntry): void;
}

export interface OfferRepository {
  transaction<T>(callback: (tx: OfferTransaction) => Promise<T>): Promise<T>;
}

export interface OfferActor {
  /** Extracted from verified Auth, never from the action payload. */
  uid: string;
}

export interface OfferRow extends OfferAuthorityRow {
  expiresAtMillis: number;
  organizerPaymentLink: string | null;
}

export interface OfferBatchInput {
  organizerId: string;
  eventId: string;
  mode: "draft" | "offer";
  rows: OfferRow[];
}

export interface OfferBatchPreview {
  planDigest: string;
  rows: Array<{offerId: string; revision: number; generation: number;
    status: EventOffer["status"] | "new"}>;
}

export interface OfferBatchCommit extends OfferBatchInput {
  requestId: string;
  planDigest: string;
}

export interface OfferListItem {
  offerId: string;
  eventId: string;
  contactId: string;
  sourceKind: "application" | "formResponse";
  sourceId: string;
  status: EventOffer["status"];
  effectiveStatus: EventOffer["status"];
  paymentStatus: EventOffer["manualPayment"]["status"];
  revision: number;
  generation: number;
  expiresAtMillis: number;
}

/** Manager-only detail for explicit reference review; never a public view. */
export async function getEventOffer(params: {
  repository: OfferRepository;
  actor: OfferActor;
  organizerId: string;
  eventId: string;
  contactId: string;
}): Promise<{offer: EventOffer; effectiveStatus: EventOffer["status"]}> {
  const {organizerId, eventId, contactId, actor} = params;
  if (![organizerId, eventId, contactId, actor.uid].every(validId)) {
    fail("invalid", "Invalid offer detail request.");
  }
  return params.repository.transaction(async (tx) => {
    if (!await tx.managerAuthorized(organizerId, actor.uid)) {
      fail("denied", "Current organizer manager authority is required.");
    }
    const event = await tx.event(eventId);
    if (!event || event.organizerId !== organizerId) {
      fail("denied", "Event is unavailable.");
    }
    const id = eventOfferId({organizerId, eventId, contactId});
    const offer = await tx.offer(id);
    if (!offer || offer.organizerId !== organizerId ||
        offer.eventId !== eventId || offer.contactId !== contactId) {
      fail("denied", "Offer is unavailable.");
    }
    return {offer, effectiveStatus: offer.status === "offered" &&
      tx.nowMillis() >= offer.expiresAtMillis ? "expired" : offer.status};
  });
}

export async function listEventOffers(params: {
  repository: OfferRepository;
  actor: OfferActor;
  organizerId: string;
  eventId: string;
  afterOfferId?: string | null;
  limit?: number;
}): Promise<{items: OfferListItem[]; nextCursor: string | null}> {
  const {organizerId, eventId, actor} = params;
  const limit = params.limit ?? 50;
  const cursor = params.afterOfferId ?? null;
  if (!validId(organizerId) || !validId(eventId) ||
      !validId(actor.uid) || cursor !== null && !validId(cursor) ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    fail("invalid", "Invalid event offer list request.");
  }
  return params.repository.transaction(async (tx) => {
    const nowMillis = tx.nowMillis();
    if (!await tx.managerAuthorized(organizerId, actor.uid)) {
      fail("denied", "Current organizer manager authority is required.");
    }
    const event = await tx.event(eventId);
    if (!event || event.organizerId !== organizerId) {
      fail("denied", "Event is unavailable.");
    }
    const offers = await tx.listOffers(organizerId, eventId, cursor,
      limit + 1);
    const page = offers.slice(0, limit);
    for (const offer of page) {
      if (offer.organizerId !== organizerId || offer.eventId !== eventId) {
        fail("conflict", "Offer list contains a foreign event.");
      }
    }
    return {items: page.map((offer) => ({offerId: offer.offerId,
      eventId: offer.eventId, contactId: offer.contactId,
      sourceKind: offer.sourceKind ?? "application",
      sourceId: offer.applicationId, status: offer.status,
      effectiveStatus: offer.status === "offered" &&
        nowMillis >= offer.expiresAtMillis ? "expired" : offer.status,
      paymentStatus: offer.manualPayment.status,
      revision: offer.revision, generation: offer.generation,
      expiresAtMillis: offer.expiresAtMillis})),
    nextCursor: offers.length > limit ? page.at(-1)!.offerId : null};
  });
}

const MAX_BATCH_ROWS = 25;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fail(code: OfferDomainError["code"], message: string): never {
  throw new OfferDomainError(code, message);
}

function validId(value: string): boolean {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,180}$/u.test(value);
}

function validRequestId(value: string): boolean {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/u.test(value);
}

function validateBatch(input: OfferBatchInput): void {
  if (!validId(input.organizerId) || !validId(input.eventId) ||
      !["draft", "offer"].includes(input.mode) ||
      !Array.isArray(input.rows) || input.rows.length < 1 ||
      input.rows.length > MAX_BATCH_ROWS) {
    fail("invalid", "Invalid or oversized offer batch.");
  }
  const ids = new Set<string>();
  for (const row of input.rows) {
    if (!validId(row.applicationId) || !validId(row.contactId) ||
        !["application", "formResponse"].includes(
          row.sourceKind ?? "application") ||
        row.organizerId !== input.organizerId ||
        row.eventId !== input.eventId ||
        !Number.isSafeInteger(row.expiresAtMillis) ||
        (row.organizerPaymentLink !== null &&
          typeof row.organizerPaymentLink !== "string")) {
      fail("invalid", "Invalid offer row.");
    }
    const id = eventOfferId(row);
    if (ids.has(id)) fail("invalid", "Duplicate contact and event.");
    ids.add(id);
  }
}

type ResolvedContext = CurrentOfferContext & {
  authorityFingerprint: string;
  sourceResponseId: string;
};

function paymentSnapshotFor(input: {paymentTerms: EventPaymentTerms;
  expiresAtMillis: number; organizerPaymentLink: string | null;
  nowMillis: number; eventStartsAtMillis: number}):
  EventOfferPaymentSnapshot {
  const {paymentTerms: terms, expiresAtMillis, organizerPaymentLink,
    nowMillis, eventStartsAtMillis} = input;
  if (terms.expectedAmountMinor === null ||
      !Number.isSafeInteger(terms.expectedAmountMinor) ||
      terms.expectedAmountMinor < 0 ||
      terms.expectedAmountMinor > 0 && !terms.currency) {
    fail("conflict", "Choose the expected amount and currency explicitly.");
  }
  let snapshot: OfferPaymentSnapshot;
  if (terms.preferredCollection === "personalRequest") {
    if (!organizerPaymentLink || terms.expectedAmountMinor <= 0) {
      fail("conflict", "A paid personal request needs its recipient link.");
    }
    const validity = terms.offerValidityMinutes;
    if (!Number.isSafeInteger(validity) || validity === null ||
        validity < 5 || validity > 10080) {
      fail("conflict", "Configure offer validity first.");
    }
    snapshot = {eventPaymentRevision: terms.revision,
      eventPaymentHash: eventPaymentTermsHash(terms),
      reusablePaymentPageUrl: null,
      paymentInstructions: terms.paymentInstructions,
      expectedAmountMinor: terms.expectedAmountMinor,
      currency: terms.currency, messageTemplate: terms.offerMessageTemplate,
      expiresAtMillis: Math.min(nowMillis + validity * 60_000,
        eventStartsAtMillis)};
  } else {
    if (organizerPaymentLink !== null) {
      fail("conflict", "This event does not use a personal request link.");
    }
    try {
      snapshot = snapshotOfferPaymentTerms({terms, nowMillis,
        eventStartsAtMillis, allowCatchCheckout: true});
    } catch {
      return fail("conflict", "Event payment terms are not ready for offers.");
    }
  }
  if (!Number.isSafeInteger(expiresAtMillis) ||
      expiresAtMillis <= nowMillis) {
    fail("invalid", "Offer expiry is not in the future.");
  }
  if (expiresAtMillis > snapshot.expiresAtMillis) {
    fail("conflict", "Offer expiry exceeds reviewed event payment terms.");
  }
  return {...snapshot, expiresAtMillis,
    collectionMode: terms.preferredCollection,
    personalPaymentLink: organizerPaymentLink};
}

async function currentContext(tx: OfferTransaction, actor: OfferActor,
  row: OfferAuthorityRow, offerTerms?: {expiresAtMillis: number;
    organizerPaymentLink: string | null},
  historicalHandoff = false): Promise<ResolvedContext> {
  if (!validId(actor.uid) || !validId(row.organizerId) ||
      !validId(row.applicationId) || !validId(row.contactId) ||
      !validId(row.eventId)) fail("invalid", "Invalid offer identity.");
  if (!await tx.managerAuthorized(row.organizerId, actor.uid)) {
    fail("denied", "Current organizer manager authority is required.");
  }
  // The source resolver needs the application's immutable response identity.
  const application = await tx.application(row.applicationId,
    row.sourceKind ?? "application");
  const [source, contact, event, paymentTerms] = await Promise.all([
    tx.sourceState(row.applicationId), tx.contact(row.contactId),
    tx.event(row.eventId), historicalHandoff ? Promise.resolve(null) :
      tx.eventPaymentTerms(row.eventId),
  ]);
  if (!application || !contact || !event ||
      application.organizerId !== row.organizerId ||
      contact.organizerId !== row.organizerId ||
      event.organizerId !== row.organizerId ||
      application.applicationId !== row.applicationId ||
      application.sourceKind !== (row.sourceKind ?? "application") ||
      contact.contactId !== row.contactId || event.eventId !== row.eventId) {
    fail("denied", "Offer source, CRM contact or event is unavailable.");
  }
  const origin = await tx.origin(row.applicationId,
    application.latestResponseId);
  if (!origin || origin.organizerId !== row.organizerId ||
      origin.sourceResponseId !== application.latestResponseId ||
      origin.currentContactId !== row.contactId ||
      (application.sourceKind === "formResponse" &&
        (application.conversionStatus !== "completed" ||
          origin.originContactId !== application.conversionContactId)) ||
      contact.deleted || contact.hidden ||
      contact.mergedIntoContactId !== null) {
    fail("denied", "Canonical CRM identity is unavailable.");
  }
  if (!historicalHandoff && (!paymentTerms ||
      !Number.isSafeInteger(paymentTerms.revision) ||
      paymentTerms.revision < 1 ||
      paymentTerms.expectedAmountMinor === null)) {
    fail("conflict", "Configure explicit event payment terms first.");
  }
  if (paymentTerms) {
    try {
      validateEventPaymentTerms(paymentTerms);
    } catch {
      fail("conflict", "Event payment terms are malformed.");
    }
  }
  const paymentHash = paymentTerms ? eventPaymentTermsHash(paymentTerms) :
    undefined;
  const paymentSnapshot = offerTerms && paymentTerms ?
    paymentSnapshotFor({paymentTerms,
      expiresAtMillis: offerTerms.expiresAtMillis,
      organizerPaymentLink: offerTerms.organizerPaymentLink,
      nowMillis: tx.nowMillis(), eventStartsAtMillis: event.startsAtMillis}) :
    undefined;
  const authorityFingerprint = digest([application.sourceKind,
    application.latestResponseId,
    application.revision, application.reviewStatus,
    application.conversionContactId ?? null,
    application.conversionStatus ?? null,
    application.targetKind, application.targetId, source,
    contact.revision, contact.deleted, contact.hidden,
    contact.mergedIntoContactId, origin.currentContactId,
    event.startsAtMillis, event.cancelled, event.sourceRevision,
    paymentTerms?.revision ?? null, paymentHash, paymentSnapshot]);
  return {
    organizerId: row.organizerId, eventId: row.eventId,
    contactId: row.contactId, applicationId: row.applicationId,
    sourceKind: application.sourceKind,
    applicationTargetKind: application.targetKind,
    applicationTargetId: application.targetId,
    actorUid: actor.uid, actorAuthorized: true,
    applicationApproved: application.sourceKind === "application" ?
      application.reviewStatus === "approved" :
      application.reviewStatus === "submitted",
    sourceCurrent: ["organizerImported", "activeParticipantGrant",
      "submittedFormResponse"].includes(source),
    contactCurrent: !contact.deleted && !contact.hidden,
    eventCurrent: !event.cancelled,
    eventStartsAtMillis: event.startsAtMillis,
    currentPaymentHash: paymentHash,
    currentPaymentRevision: paymentTerms?.revision,
    paymentSnapshot, authorityFingerprint,
    sourceResponseId: application.latestResponseId,
  };
}

/** Read-only, manager-reviewed preview for a personal-device handoff. */
export async function prepareEventOfferHandoff(params: {
  repository: OfferRepository;
  actor: OfferActor;
  organizerId: string;
  eventId: string;
  contactId: string;
  expectedOfferRevision: number;
  expectedGeneration: number;
  issueInvitation?: (input: {organizerId: string; eventId: string;
    offerId: string; responseId: string; actorUid: string;
    expectedOfferGeneration: number; expectedOfferRevision: number}) =>
    Promise<string>;
}): Promise<PreparedOfferHandoff> {
  const {organizerId, eventId, contactId, actor,
    expectedOfferRevision, expectedGeneration} = params;
  if (![organizerId, eventId, contactId, actor.uid].every(validId) ||
      !Number.isSafeInteger(expectedOfferRevision) ||
      expectedOfferRevision < 1 ||
      !Number.isSafeInteger(expectedGeneration) ||
      expectedGeneration < 1) {
    fail("invalid", "Invalid offer handoff request.");
  }
  const prepared = await params.repository.transaction(async (tx) => {
    if (!await tx.managerAuthorized(organizerId, actor.uid)) {
      fail("denied", "Current organizer manager authority is required.");
    }
    const offerId = eventOfferId({organizerId, eventId, contactId});
    const offer = await tx.offer(offerId);
    if (!offer || offer.organizerId !== organizerId ||
        offer.eventId !== eventId || offer.contactId !== contactId ||
        offer.revision !== expectedOfferRevision ||
        offer.generation !== expectedGeneration) {
      fail("conflict", "Offer changed; review it again.");
    }
    const context = await currentContext(tx, actor, {
      organizerId, eventId, contactId,
      applicationId: offer.applicationId, sourceKind: offer.sourceKind,
    }, undefined, true);
    const presentation = await tx.handoffPresentation(offer,
      context.sourceResponseId);
    const snapshot = offer.paymentSnapshot;
    if (!snapshot || snapshot.expiresAtMillis !== offer.expiresAtMillis ||
        snapshot.personalPaymentLink !== offer.organizerPaymentLink) {
      fail("conflict", "Stored offer payment snapshot changed.");
    }
    const reviewed: ReviewedOfferHandoff = {offer: {offerId, eventId, contactId,
      status: offer.status, expiresAtMillis: offer.expiresAtMillis,
      organizerPaymentLink: snapshot.collectionMode === "reusablePage" ?
        snapshot.reusablePaymentPageUrl : snapshot.personalPaymentLink,
      paymentTermsHash: snapshot.eventPaymentHash},
    event: presentation.event,
    recipient: {...presentation.recipient,
      sourceCurrent: context.applicationApproved &&
        context.sourceCurrent &&
        (context.applicationTargetKind === "event" ?
          context.applicationTargetId === eventId :
          context.applicationTargetKind === "organizer" &&
            context.applicationTargetId === null),
      contactCurrent: context.contactCurrent &&
        presentation.recipient.contactCurrent},
    payment: {collectionMode: snapshot.collectionMode,
      expectedAmountMinor: snapshot.expectedAmountMinor,
      currency: snapshot.currency,
      reusablePaymentPageUrl: snapshot.reusablePaymentPageUrl,
      paymentInstructions: snapshot.paymentInstructions,
      eventPaymentHash: snapshot.eventPaymentHash},
    messageTemplate: snapshot.messageTemplate,
    nowMillis: tx.nowMillis()};
    return {reviewed, sourceResponseId: context.sourceResponseId};
  });
  const {reviewed, sourceResponseId} = prepared;
  const recipientFlow = reviewed.payment.collectionMode === "catchCheckout" ||
    reviewed.payment.expectedAmountMinor === 0;
  if (!recipientFlow || !params.issueInvitation) {
    return prepareOfferHandoff(reviewed);
  }
  // Validate communication/template eligibility before creating a grant. This
  // syntactic placeholder is never returned or stored. Issuance then rereads
  // current manager, offer revision, source and phone in its own transaction.
  const candidate = prepareOfferHandoff({...reviewed,
    recipientCheckoutUrl: `${BRAND.web.origin}/offer#${"A".repeat(43)}`});
  if (candidate.kind === "blocked") return candidate;
  const recipientCheckoutUrl = await params.issueInvitation({organizerId,
    eventId, offerId: reviewed.offer.offerId, responseId: sourceResponseId,
    actorUid: actor.uid, expectedOfferGeneration: expectedGeneration,
    expectedOfferRevision});
  return prepareOfferHandoff({...reviewed, recipientCheckoutUrl});
}

function audit(tx: OfferTransaction, actor: OfferActor,
  action: OfferAction, before: EventOffer | null,
  result: OfferTransition, nowMillis: number): void {
  if (result.replayed) return;
  tx.putOffer(result.offer);
  tx.createActionReceipt(result.receipt);
  tx.appendAudit({offerId: result.offer.offerId,
    requestId: action.requestId, actorUid: actor.uid, kind: action.kind,
    beforeRevision: before?.revision ?? 0,
    afterRevision: result.offer.revision,
    generation: result.offer.generation, atMillis: nowMillis,
    paymentStatus: result.offer.manualPayment.status,
    bankReceiptChecked: result.offer.manualPayment.bankReceiptChecked,
    reviewNote: result.offer.manualPayment.reviewNote});
}

/** Read authorization, state and receipt inside the same transaction. */
export async function mutateEventOffer(params: {
  repository: OfferRepository;
  actor: OfferActor;
  row: OfferAuthorityRow;
  action: OfferAction;
}): Promise<OfferTransition> {
  const {repository, actor, row, action} = params;
  if (!validRequestId(action.requestId)) {
    fail("invalid", "Invalid action request ID.");
  }
  return repository.transaction(async (tx) => {
    if (!validId(actor.uid) || !validId(row.organizerId) ||
        !validId(row.eventId) || !validId(row.contactId) ||
        !validId(row.applicationId)) {
      fail("invalid", "Invalid offer identity.");
    }
    const offerId = eventOfferId(row);
    const [current, priorReceipt] = await Promise.all([
      tx.offer(offerId), tx.actionReceipt(offerId, action.requestId),
    ]);
    if (priorReceipt) {
      if (!await tx.managerAuthorized(row.organizerId, actor.uid) ||
          !current || current.organizerId !== row.organizerId ||
          current.eventId !== row.eventId ||
          current.contactId !== row.contactId) {
        fail("denied", "Current manager and offer identity are required.");
      }
      return applyEventOfferAction({current, priorReceipt, action,
        nowMillis: tx.nowMillis(), context: {
          organizerId: row.organizerId, eventId: row.eventId,
          contactId: row.contactId, applicationId: row.applicationId,
          sourceKind: row.sourceKind ?? "application",
          applicationTargetKind: "organizer", applicationTargetId: null,
          actorUid: actor.uid, actorAuthorized: true,
          applicationApproved: false, sourceCurrent: false,
          contactCurrent: false, eventCurrent: false,
          eventStartsAtMillis: 0,
        }});
    }
    const closing = ["withdraw", "expire", "recordEvidence",
      "reconcileEvidence"].includes(action.kind);
    let context: CurrentOfferContext;
    if (closing) {
      if (!await tx.managerAuthorized(row.organizerId, actor.uid) ||
          !current || current.organizerId !== row.organizerId ||
          current.eventId !== row.eventId ||
          current.contactId !== row.contactId ||
          current.applicationId !== row.applicationId ||
          (current.sourceKind ?? "application") !==
            (row.sourceKind ?? "application")) {
        fail("denied", "Current manager and offer identity are required.");
      }
      // Closure and financial review survive source revocation, CRM merge,
      // cancellation and event start; no new offer authority is inferred.
      context = {organizerId: row.organizerId, eventId: row.eventId,
        contactId: row.contactId, applicationId: row.applicationId,
        sourceKind: row.sourceKind ?? "application",
        applicationTargetKind: "organizer", applicationTargetId: null,
        actorUid: actor.uid, actorAuthorized: true,
        applicationApproved: false, sourceCurrent: false,
        contactCurrent: false, eventCurrent: false,
        eventStartsAtMillis: 0};
    } else {
      context = await currentContext(tx, actor, row,
        action.kind === "createDraft" || action.kind === "reissueDraft" ?
          action.terms : undefined);
      if (await tx.hasMergedContactOffer(row.organizerId, row.eventId,
        row.contactId)) {
        fail("conflict", "Reconcile an earlier merged-contact offer first.");
      }
    }
    const nowMillis = tx.nowMillis();
    const result = applyEventOfferAction({current, context, action,
      nowMillis, priorReceipt});
    audit(tx, actor, action, current, result, nowMillis);
    return result;
  });
}

function batchShape(input: OfferBatchInput): unknown {
  return [input.organizerId, input.eventId, input.mode,
    input.rows.map((row) => [row.sourceKind ?? "application",
      row.applicationId, row.contactId,
      row.expiresAtMillis, row.organizerPaymentLink])];
}

async function previewInTransaction(tx: OfferTransaction,
  actor: OfferActor, input: OfferBatchInput):
  Promise<OfferBatchPreview> {
  const nowMillis = tx.nowMillis();
  const rows: OfferBatchPreview["rows"] = [];
  const authorityFingerprints: string[] = [];
  for (const row of input.rows) {
    const context = await currentContext(tx, actor, row, row);
    const offerId = eventOfferId(context);
    const current = await tx.offer(offerId);
    if (current) {
      fail("conflict", "An offer already exists for a selected contact.");
    }
    if (await tx.hasMergedContactOffer(row.organizerId, row.eventId,
      row.contactId)) {
      fail("conflict", "Reconcile an earlier merged-contact offer first.");
    }
    const trial: OfferAction = {kind: "createDraft",
      requestId: "preview000", expectedRevision: 0,
      terms: {expiresAtMillis: row.expiresAtMillis,
        organizerPaymentLink: row.organizerPaymentLink}};
    applyEventOfferAction({current: null, context, action: trial,
      nowMillis});
    rows.push({offerId, revision: 0, generation: 0, status: "new"});
    authorityFingerprints.push(context.authorityFingerprint);
  }
  return {rows, planDigest: digest([batchShape(input), rows,
    authorityFingerprints])};
}

/** Bounded, read-only preview. No reservation or authority token is issued. */
export async function previewEventOffers(params: {
  repository: OfferRepository;
  actor: OfferActor;
  input: OfferBatchInput;
}): Promise<OfferBatchPreview> {
  validateBatch(params.input);
  return params.repository.transaction((tx) => previewInTransaction(tx,
    params.actor, params.input));
}

/**
 * All-or-none batch create (optionally mark offered). A fresh transaction
 * recomputes the preview and fences changed CRM/source/event state. A retry
 * returns the immutable batch receipt without writing another audit row.
 */
export async function commitEventOffers(params: {
  repository: OfferRepository;
  actor: OfferActor;
  input: OfferBatchCommit;
}): Promise<OfferBatchReceipt> {
  const {input, actor, repository} = params;
  validateBatch(input);
  if (!validRequestId(input.requestId) ||
      !/^[0-9a-f]{64}$/u.test(input.planDigest)) {
    fail("invalid", "Invalid batch request or preview digest.");
  }
  const requestHash = digest([batchShape(input), input.planDigest]);
  return repository.transaction(async (tx) => {
    if (!await tx.managerAuthorized(input.organizerId, actor.uid)) {
      fail("denied", "Current organizer manager authority is required.");
    }
    const prior = await tx.batchReceipt(input.organizerId,
      input.requestId);
    if (prior) {
      if (prior.eventId !== input.eventId ||
          prior.requestHash !== requestHash) {
        fail("conflict", "Batch request ID was reused for different work.");
      }
      return prior;
    }
    const preview = await previewInTransaction(tx, actor, input);
    if (preview.planDigest !== input.planDigest) {
      fail("conflict", "Offer preview changed; review it again.");
    }
    // Firestore transactions require all document reads before the first write.
    const contexts: CurrentOfferContext[] = [];
    for (const row of input.rows) {
      contexts.push(await currentContext(tx, actor, row, row));
    }
    const results: OfferBatchReceipt["results"] = [];
    const effects: Array<{action: OfferAction; before: EventOffer | null;
      result: OfferTransition; atMillis: number}> = [];
    for (const [index, row] of input.rows.entries()) {
      const context = contexts[index];
      const nowMillis = tx.nowMillis();
      const first: OfferAction = {kind: "createDraft",
        requestId: `${input.requestId}_d${index}`,
        expectedRevision: 0, terms: {
          expiresAtMillis: row.expiresAtMillis,
          organizerPaymentLink: row.organizerPaymentLink,
        }};
      const created = applyEventOfferAction({current: null,
        context, action: first, nowMillis});
      effects.push({action: first, before: null, result: created,
        atMillis: nowMillis});
      let final = created.offer;
      if (input.mode === "offer") {
        const second: OfferAction = {kind: "offer",
          requestId: `${input.requestId}_o${index}`,
          expectedRevision: final.revision,
          expectedGeneration: final.generation};
        const offered = applyEventOfferAction({current: final,
          context, action: second, nowMillis});
        effects.push({action: second, before: final, result: offered,
          atMillis: nowMillis});
        final = offered.offer;
      }
      results.push({offerId: final.offerId, revision: final.revision,
        generation: final.generation});
    }
    const receipt = {organizerId: input.organizerId,
      eventId: input.eventId, requestId: input.requestId,
      requestHash, results};
    for (const effect of effects) {
      audit(tx, actor, effect.action, effect.before,
        effect.result, effect.atMillis);
    }
    tx.createBatchReceipt(receipt);
    return receipt;
  });
}

/** Current manager-only settings; reading never authorizes offer issuance. */
export async function getEventOfferConfiguration(params: {
  repository: OfferRepository;
  actor: OfferActor;
  organizerId: string;
  eventId: string;
}) {
  const {organizerId, eventId, actor} = params;
  if (![organizerId, eventId, actor.uid].every(validId)) {
    fail("invalid", "Invalid event offer configuration request.");
  }
  return params.repository.transaction(async (tx) => {
    if (!await tx.managerAuthorized(organizerId, actor.uid)) {
      fail("denied", "Current organizer manager authority is required.");
    }
    const event = await tx.event(eventId);
    if (!event || event.organizerId !== organizerId || event.cancelled) {
      fail("denied", "Event is unavailable.");
    }
    const nowMillis = tx.nowMillis();
    if (!Number.isSafeInteger(nowMillis) || nowMillis < 0) {
      fail("conflict", "Server time is unavailable.");
    }
    const saved = await tx.eventPreferences(eventId);
    const paymentTerms = saved?.paymentTerms ?? null;
    if (paymentTerms) validateEventPaymentTerms(paymentTerms);
    const validity = paymentTerms?.offerValidityMinutes;
    const suggestedExpiresAtMillis = validity != null &&
      Number.isSafeInteger(validity) && validity >= 5 && validity <= 10080 &&
      event.startsAtMillis > nowMillis ?
      Math.min(nowMillis + validity * 60_000, event.startsAtMillis) : null;
    return {organizerId, eventId, eventSourceRevision: event.sourceRevision,
      startsAtMillis: event.startsAtMillis, nowMillis, paymentTerms,
      suggestedExpiresAtMillis, preferencesRevision: saved?.revision ?? 0,
      preferences: saved?.preferences ?? null};
  });
}
