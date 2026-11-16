import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {EventAssistanceSmsPermissionDocument as Permission} from
  "../../shared/generated/eventAssistanceSmsPermissionDocument";
import type {EventAssistanceSmsBudgetDocument as Budget} from
  "../../shared/generated/eventAssistanceSmsBudgetDocument";
import {validateEventAssistanceSmsBudgetDocument} from
  "../../shared/generated/validators/eventAssistanceSmsBudgetDocument";
import {validateEventAssistanceSmsDispatchDocument} from
  "../../shared/generated/validators/eventAssistanceSmsDispatchDocument";
import {operationContentHash} from "../../operations/durableActions";
import {
  FirestoreMessageOutbox, PrepareDispatchResource,
} from "./firestoreMessageOutbox";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import type {GuestLinkSigningKeys} from "./guestLinkTokens";
import {
  Grant, guestCollections, parseGrant,
  requireDocumentId,
} from "./guestRecords";
import type {MessageRecord, OutboxFacts} from "./messageOutbox";
import type {RouteReadiness} from "./messagingPolicy";
import {newSmsReportCredential} from "./smsReportCredentials";
import {
  parseSmsConfig, renderEventSms, RenderedSms, SmsConfig,
} from "./smsProtocol";
export {smsEndpointId} from "./smsProtocol";
export {smsCollections, smsPermissionId, parseSmsPermission} from
  "./smsPermissionRecords";
import {smsCollections} from "./smsPermissionRecords";
import {newSmsWithdrawalGrant, parseSmsWithdrawalGrant,
  smsWithdrawalMatchesPermission, SMS_WITHDRAWAL_GRANTS} from
  "./smsWithdrawalRecords";

import {readSmsMessagePermission} from "./messagePermissionReader";
import {messageAllowsSender} from "./lateJoinDispatchPolicy";
import {withdrawalGrantId} from "./messageConsentCollections";

export type {Permission, Budget};
type Intent = MessageRecord["intent"];
export interface SmsMaterial {
  config: SmsConfig;
  permission: Permission;
  rendered: RenderedSms;
  grantId: string;
  grant: Grant;
  budgets: [Budget, Budget];
}
export interface ClaimedSmsMaterial extends SmsMaterial {
  /** Per-attempt report credential; never persisted or returned to a guest. */
  reportToken: string;
}
type MaterialResult = {facts: OutboxFacts; material: SmsMaterial | null};
type BlockReason = Extract<RouteReadiness["state"], {kind: "blocked"}>[
  "reason"];

export function smsBudgetScopes(context: Permission["context"], now: number):
  [Budget["scope"], Budget["scope"]] {
  // India sender-day budget uses Asia/Kolkata's fixed UTC+05:30 offset.
  const day = new Date(now + 19_800_000).toISOString().slice(0, 10);
  return [{kind: "event", context}, {kind: "senderDay", day}];
}

export function smsBudgetId(senderId: string, scope: Budget["scope"]): string {
  return "sms-budget:" + operationContentHash([senderId, scope]);
}

export function parseSmsBudget(value: unknown): Budget {
  if (!validateEventAssistanceSmsBudgetDocument(value) ||
      value.budgetId !== smsBudgetId(value.senderId, value.scope) ||
      value.endsAt <= value.startsAt || value.updatedAt < value.startsAt ||
      value.chargedMicros > value.limitMicros) {
    throw new Error("Invalid SMS spending authority");
  }
  if (value.scope.kind === "senderDay") {
    const start = Date.parse(value.scope.day + "T00:00:00+05:30");
    if (!Number.isSafeInteger(start) || value.startsAt !== start ||
        value.endsAt !== start + 86_400_000) {
      throw new Error("SMS sender-day budget has the wrong window");
    }
  }
  return value;
}

/** Concrete sender/permission/roster/template and spend reader for SMS. */
export class SmsDispatchStore {
  constructor(private readonly db: Firestore,
    private readonly senderId: string,
    private readonly keys: GuestLinkSigningKeys,
    private readonly clock: () => number = Date.now) {
    requireDocumentId(senderId);
  }

  async sender(): Promise<SmsConfig | null> {
    const snap = await this.db.collection(smsCollections.senders)
      .doc(this.senderId).get();
    if (!snap.exists) return null;
    const config = parseSmsConfig(snap.data());
    if (config.senderId !== this.senderId) {
      throw new Error("SMS sender mismatch");
    }
    return config;
  }

  /** Paused or absent ceilings stop before a worker loads SMS credentials. */
  async spendingAvailable(linkId: string, expected: SmsConfig,
    now: number): Promise<boolean> {
    if (!/^[a-f0-9]{32}$/.test(linkId)) return false;
    return this.db.runTransaction(async (tx) => {
      const [senderSnap, grantSnap] = await tx.getAll(
        this.db.collection(smsCollections.senders).doc(this.senderId),
        this.db.collection(guestCollections.grants).doc(linkId));
      if (!senderSnap.exists || !grantSnap.exists) return false;
      let config: SmsConfig;
      let grant: Grant;
      try {
        config = parseSmsConfig(senderSnap.data());
        grant = parseGrant(grantSnap.data());
      } catch {
        return false;
      }
      if (operationContentHash(config) !== operationContentHash(expected) ||
          config.senderId !== this.senderId || config.status !== "ready" ||
          config.activation.approvedAt > now ||
          now >= Math.min(config.activation.validUntil,
            config.quote.validUntil) || grant.linkId !== linkId ||
          grant.revokedAt !== null || grant.issuedAt > now ||
          grant.expiresAt <= now) return false;
      const scopes = smsBudgetScopes(grant.context, now);
      const snaps = await tx.getAll(...scopes.map((scope) => this.db
        .collection(smsCollections.budgets)
        .doc(smsBudgetId(this.senderId, scope))));
      if (snaps.some((snap) => !snap.exists)) return false;
      try {
        const budgets = snaps.map((snap) => parseSmsBudget(snap.data()));
        return budgets.every((budget, index) =>
          budget.budgetId === smsBudgetId(this.senderId, scopes[index]) &&
          budget.currency === config.quote.currency &&
          budget.status === "active" && budget.startsAt <= now &&
          budget.endsAt > now && budget.updatedAt <= now &&
          budget.limitMicros > budget.chargedMicros);
      } catch {
        return false;
      }
    }, {readOnly: true});
  }

  outbox(linkId: string): FirestoreMessageOutbox {
    if (!/^[a-f0-9]{32}$/.test(linkId)) throw new Error("Invalid SMS grant id");
    return new FirestoreMessageOutbox(this.db, async (tx, intent, now) => {
      if (intent.permittedRoutes.some((r) => r !== "catchEventSms")) {
        throw new Error("Multi-route messages require the channel composer");
      }
      return this.readFacts(tx, intent, linkId, now);
    }, this.clock);
  }

  /** A loaded credential can only make its exact sender snapshot eligible. */
  async readFacts(tx: Transaction, intent: Intent, linkId: string,
    now: number, expected?: SmsConfig): Promise<OutboxFacts> {
    const result = await this.read(tx, intent, linkId, now);
    if (expected && result.material &&
        operationContentHash(expected) !==
          operationContentHash(result.material.config)) {
      return {gate: result.facts.gate, routes: [{routeId: "catchEventSms",
        state: {kind: "blocked", reason: "channelUnavailable"}}]};
    }
    return result.facts;
  }

  /** Exact material and both budget debits commit with the outbox claim. */
  prepare(linkId: string, expectedConfig: SmsConfig):
    PrepareDispatchResource<ClaimedSmsMaterial> {
    return async (tx, record, attempt, now) => {
      const result = await this.read(tx, record.intent, linkId, now);
      const material = result.material;
      if (!material || operationContentHash(material.config) !==
          operationContentHash(expectedConfig)) {
        return {kind: "withheld"};
      }
      const route = result.facts.routes[0];
      if (route?.state.kind !== "eligible" ||
          route.state.permissionRevision !==
            attempt.authorization.permissionRevision ||
          route.state.candidate.mode !== "live" ||
          operationContentHash(route.state.candidate.binding) !==
            operationContentHash(attempt.binding)) return {kind: "withheld"};
      const dispatchRef = this.db.collection(smsCollections.dispatches)
        .doc(attempt.attemptId);
      if ((await tx.get(dispatchRef)).exists) return {kind: "withheld"};
      const {config, permission, rendered, budgets} = material;
      const withdrawalRef = this.db.collection(SMS_WITHDRAWAL_GRANTS)
        .doc(withdrawalGrantId("sms", linkId));
      const withdrawalSnap = await tx.get(withdrawalRef);
      const withdrawal = withdrawalSnap.exists ?
        parseSmsWithdrawalGrant(withdrawalSnap.data()) :
        newSmsWithdrawalGrant(permission, material.grant, now);
      if (withdrawal.linkId !== linkId ||
          !smsWithdrawalMatchesPermission(withdrawal, permission) ||
          withdrawal.guestGrantHash !== operationContentHash(material.grant) ||
          withdrawal.expiresAt < permission.expiresAt ||
          withdrawal.issuedAt > now) return {kind: "withheld"};
      const report = newSmsReportCredential();
      const dispatch = {schemaVersion: 1, attemptId: attempt.attemptId,
        messageId: record.messageId, senderId: config.senderId,
        bindingRevision: config.revision,
        configHash: operationContentHash(config),
        permissionId: permission.permissionId,
        permissionRevision: permission.revision,
        recipientEndpointId: permission.recipientEndpointId,
        reportTokenHash: report.hash, senderMask: config.mask,
        payloadHash: rendered.payloadHash,
        templateId: rendered.template.templateId,
        templateRevision: rendered.template.revision,
        quoteRevision: config.quote.revision, grantId: material.grantId,
        encoding: rendered.encoding, segments: rendered.segments,
        maxCostMicros: rendered.maxCostMicros,
        budgetIds: budgets.map((b) => b.budgetId), createdAt: now};
      if (!validateEventAssistanceSmsDispatchDocument(dispatch)) {
        throw new Error("Invalid SMS debit evidence");
      }
      const debited = budgets.map((budget) => parseSmsBudget({...budget,
        chargedMicros: budget.chargedMicros + rendered.maxCostMicros,
        revision: budget.revision + 1, updatedAt: now}));
      return {kind: "ready", value: {...material, reportToken: report.token},
        validUntil: route.state.validUntil, commit: () => {
          tx.create(dispatchRef, dispatch);
          if (!withdrawalSnap.exists) tx.create(withdrawalRef, withdrawal);
          for (const budget of debited) {
            tx.set(this.db.collection(smsCollections.budgets)
              .doc(budget.budgetId), budget);
          }
        }};
    };
  }

  private async read(tx: Transaction, intent: Intent, linkId: string,
    now: number): Promise<MaterialResult> {
    const gate = await readEventAssistanceMessageGate(this.db, tx, intent, now);
    const blocked = (reason: BlockReason): MaterialResult => ({
      facts: {gate, routes: [{routeId: "catchEventSms",
        state: {kind: "blocked", reason}}]}, material: null,
    });
    if (gate.kind === "stop" || intent.context.mode !== "live") {
      return blocked("policyBlocked");
    }
    if (!messageAllowsSender(intent, "catchEventSms", this.senderId)) {
      return blocked("policyBlocked");
    }
    const context = intent.context;
    const scopes = smsBudgetScopes(context, now);
    const [senderSnap, grantSnap,
      ...budgetSnaps] =
      await tx.getAll(
        this.db.collection(smsCollections.senders).doc(this.senderId),
        this.db.collection(guestCollections.grants).doc(linkId),
        ...scopes.map((scope) => this.db.collection(smsCollections.budgets)
          .doc(smsBudgetId(this.senderId, scope))));
    if (!senderSnap.exists) return blocked("notProvisioned");
    const config = parseSmsConfig(senderSnap.data());
    if (config.senderId !== this.senderId || config.status !== "ready" ||
        config.activation.approvedAt > now ||
        now >= config.activation.validUntil) {
      return blocked("notProvisioned");
    }
    const consent = await readSmsMessagePermission(this.db, tx,
      {context, attendeeId: intent.attendeeId, senderId: this.senderId}, now);
    if (consent.kind === "blocked") return blocked(consent.reason);
    const {permission, source} = consent;
    if (!grantSnap.exists) return blocked("templateUnavailable");
    const grant = parseGrant(grantSnap.data());
    if (grant.linkId !== linkId) return blocked("templateUnavailable");
    let rendered: RenderedSms;
    try {
      rendered = renderEventSms({config, intent, grant, keys: this.keys,
        eventTitle: source.eventTitle, now});
    } catch {
      return blocked("templateUnavailable");
    }
    if (budgetSnaps.some((snap) => !snap.exists)) {
      return blocked("budgetExceeded");
    }
    const budgets = budgetSnaps.map((snap) => parseSmsBudget(snap.data())) as
      [Budget, Budget];
    if (budgets.some((budget, i) =>
      budget.budgetId !== smsBudgetId(this.senderId, scopes[i]) ||
      budget.status !== "active" || budget.startsAt > now ||
      budget.endsAt <= now || budget.updatedAt > now ||
      budget.limitMicros - budget.chargedMicros < rendered.maxCostMicros)) {
      return blocked("budgetExceeded");
    }
    const validUntil = Math.min(now + 30_000, gate.validUntil,
      permission.expiresAt, rendered.validUntil,
      ...budgets.map((b) => b.endsAt));
    return {material: {config, permission, rendered, grantId: linkId,
      grant, budgets},
    facts: {gate, routes: [{routeId: "catchEventSms", state: {
      kind: "eligible", checkedAt: now, validUntil,
      permissionRevision: "sms-authority:" + operationContentHash([
        config, permission, grant, rendered.payloadHash,
      ]), candidate: {mode: "live", binding: {
        routeId: "catchEventSms", transport: "sms", provider: "gupshup",
        senderIdentity: "catchPlatform", senderId: this.senderId,
        bindingRevision: config.revision,
        recipientEndpointId: permission.recipientEndpointId,
        fallbackOwner: "catch",
      }},
    }}]}};
  }
}
