import type {Firestore, Transaction} from "firebase-admin/firestore";
import type {OrganizerSenderConnectionDocument as Connection} from
  "../../shared/generated/organizerSenderConnectionDocument";
import {validateOrganizerSenderConnectionDocument} from
  "../../shared/generated/validators/organizerSenderConnectionDocument";
import {validateEventWhatsappDispatchDocument} from
  "../../shared/generated/validators/eventWhatsappDispatchDocument";
import {operationContentHash} from "../../operations/durableActions";
import {FirestoreMessageOutbox, PrepareDispatchResource} from
  "./firestoreMessageOutbox";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import type {GuestLinkSigningKeys} from
  "../../platform/guestLinkSigningKeys";
import {Grant, guestCollections, parseGrant,
  requireDocumentId} from "./guestRecords";
import type {MessageRecord, OutboxFacts} from "./messageOutbox";
import type {RouteReadiness} from "./messagingPolicy";
import {readWhatsappMessagePermission} from "./messagePermissionReader";
import {messageAllowsSender} from "./lateJoinDispatchPolicy";
import {whatsappConsentSender} from "./whatsappConsentSender";
import type {Permission} from "./whatsappPermissionRecords";
import {whatsappEndpointHash} from "./whatsappReplyProtocol";
import {newWhatsappWithdrawalGrant, parseWhatsappWithdrawalGrant,
  whatsappWithdrawalMatchesPermission, WHATSAPP_WITHDRAWAL_GRANTS} from
  "./whatsappWithdrawalRecords";
import {WhatsappReplyStore} from "./whatsappReplyStore";
import {parseWhatsappBudget, WhatsappBudget, WHATSAPP_BUDGETS,
  WHATSAPP_DISPATCHES, whatsappBudgetId, whatsappBudgetScopes} from
  "./whatsappSpend";
import {parseWhatsappPolicy, renderEventWhatsapp, RenderedWhatsapp,
  WhatsappPolicy, WHATSAPP_POLICIES, whatsappReplyPayloads} from
  "./whatsappTemplate";
import {withdrawalGrantId} from "./messageConsentCollections";

type Intent = MessageRecord["intent"];
type BlockReason = Extract<RouteReadiness["state"], {kind: "blocked"}>[
  "reason"];
export interface WhatsappSenderConfig {
  connection: Connection;
  policy: WhatsappPolicy;
}
export interface WhatsappMaterial extends WhatsappSenderConfig {
  permission: Permission;
  rendered: RenderedWhatsapp;
  grant: Grant;
  budgets: [WhatsappBudget, WhatsappBudget];
  stopRecordHash: string | null;
}
export interface ClaimedWhatsappMaterial extends WhatsappMaterial {
  replies: ReturnType<typeof whatsappReplyPayloads>;
}
type ReadResult = {facts: OutboxFacts; material: WhatsappMaterial | null};

/** Current, sender-scoped authority. It performs no secret or provider I/O. */
export class WhatsappDispatchStore {
  constructor(private readonly db: Firestore,
    private readonly senderId: string,
    private readonly keys: GuestLinkSigningKeys,
    private readonly clock: () => number = Date.now) {
    requireDocumentId(senderId);
  }

  async sender(): Promise<WhatsappSenderConfig | null> {
    const [connection, policy] = await Promise.all([
      this.db.collection("organizerSenderConnections").doc(this.senderId).get(),
      this.db.collection(WHATSAPP_POLICIES).doc(this.senderId).get(),
    ]);
    return this.config(connection.data(), policy.data());
  }

  /** Paused or absent ceilings stop before a worker loads a Meta token. */
  async spendingAvailable(linkId: string, expected: WhatsappSenderConfig,
    now: number): Promise<boolean> {
    if (!/^[a-f0-9]{32}$/.test(linkId)) return false;
    return this.db.runTransaction(async (tx) => {
      const [connectionSnap, policySnap, grantSnap] = await tx.getAll(
        this.db.collection("organizerSenderConnections").doc(this.senderId),
        this.db.collection(WHATSAPP_POLICIES).doc(this.senderId),
        this.db.collection(guestCollections.grants).doc(linkId));
      const config = this.config(connectionSnap.data(), policySnap.data());
      if (!config || !grantSnap.exists ||
          operationContentHash(config) !== operationContentHash(expected)) {
        return false;
      }
      let grant: Grant;
      try {
        grant = parseGrant(grantSnap.data());
      } catch {
        return false;
      }
      const {policy} = config;
      if (policy.status !== "ready" || policy.activation.approvedAt > now ||
          now >= Math.min(policy.activation.validUntil,
            policy.quote.validUntil) || grant.linkId !== linkId ||
          grant.revokedAt !== null || grant.issuedAt > now ||
          grant.expiresAt <= now ||
          grant.context.organizerId !== config.connection.organizerId) {
        return false;
      }
      const scopes = whatsappBudgetScopes(grant.context, now);
      const snaps = await tx.getAll(...scopes.map((scope) => this.db
        .collection(WHATSAPP_BUDGETS).doc(whatsappBudgetId(this.senderId,
          policy.quote.currency, scope))));
      if (snaps.some((snap) => !snap.exists)) return false;
      try {
        const budgets = snaps.map((snap) =>
          parseWhatsappBudget(snap.data()));
        return budgets.every((budget, index) =>
          budget.budgetId === whatsappBudgetId(this.senderId,
            policy.quote.currency, scopes[index]) &&
          budget.status === "active" && budget.startsAt <= now &&
          budget.endsAt > now && budget.updatedAt <= now &&
          budget.limitMicros - budget.chargedMicros >=
            policy.quote.maxMicrosPerMessage);
      } catch {
        return false;
      }
    }, {readOnly: true});
  }

  outbox(linkId: string): FirestoreMessageOutbox {
    return new FirestoreMessageOutbox(this.db, async (tx, intent, now) => {
      if (intent.permittedRoutes.some((r) => r !== "organizerEventWhatsapp")) {
        throw new Error("Multi-route messages require the channel composer");
      }
      return this.readFacts(tx, intent, linkId, now);
    }, this.clock);
  }

  /** Exposed to the shared route composer without granting a send permit. */
  async readFacts(tx: Transaction, intent: Intent, linkId: string,
    now: number, expected?: WhatsappSenderConfig): Promise<OutboxFacts> {
    const result = await this.read(tx, intent, linkId, now);
    if (expected && result.material && operationContentHash(expected) !==
        operationContentHash({connection: result.material.connection,
          policy: result.material.policy})) {
      return {gate: result.facts.gate,
        routes: [{routeId: "organizerEventWhatsapp",
          state: {kind: "blocked", reason: "channelUnavailable"}}]};
    }
    return result.facts;
  }

  /** Material, both debits and optional native replies share the claim. */
  prepare(linkId: string, expected: WhatsappSenderConfig):
    PrepareDispatchResource<ClaimedWhatsappMaterial> {
    return async (tx, record, attempt, now) => {
      const result = await this.read(tx, record.intent, linkId, now);
      const material = result.material;
      const route = result.facts.routes[0];
      if (!material || route?.state.kind !== "eligible" ||
          route.state.candidate.mode !== "live" ||
          operationContentHash({connection: material.connection,
            policy: material.policy}) !== operationContentHash(expected) ||
          route.state.permissionRevision !==
            attempt.authorization.permissionRevision ||
          operationContentHash(route.state.candidate.binding) !==
            operationContentHash(attempt.binding)) return {kind: "withheld"};
      const ref = this.db.collection(WHATSAPP_DISPATCHES)
        .doc(attempt.attemptId);
      if ((await tx.get(ref)).exists) return {kind: "withheld"};
      const replies = whatsappReplyPayloads(material.rendered,
        attempt.attemptId);
      const native = replies.length ? await new WhatsappReplyStore(this.db)
        .prepare("templateQuickReply", material.rendered.replies.map((r) =>
          r.choiceId), material.permission)(tx, record, attempt, now) : null;
      if (native?.kind === "withheld") return {kind: "withheld"};
      const {connection, policy, permission, rendered, budgets} = material;
      const withdrawalRef = this.db.collection(WHATSAPP_WITHDRAWAL_GRANTS)
        .doc(withdrawalGrantId("whatsapp", linkId));
      const withdrawalSnap = await tx.get(withdrawalRef);
      const withdrawal = withdrawalSnap.exists ?
        parseWhatsappWithdrawalGrant(withdrawalSnap.data()) :
        newWhatsappWithdrawalGrant(permission, material.grant, now);
      if (withdrawal.linkId !== linkId ||
          !whatsappWithdrawalMatchesPermission(withdrawal, permission) ||
          withdrawal.guestGrantHash !== operationContentHash(material.grant) ||
          withdrawal.expiresAt < permission.expiresAt ||
          withdrawal.issuedAt > now) return {kind: "withheld"};
      const dispatch = {schemaVersion: 1, attemptId: attempt.attemptId,
        messageId: record.messageId, context: record.intent.context,
        senderId: this.senderId, bindingRevision: connection.revision,
        providerAccountId: connection.wabaId,
        providerPhoneNumberId: connection.phoneNumberId,
        senderHash: operationContentHash(connection),
        policyHash: rendered.policyHash, policyRevision: policy.revision,
        permissionId: permission.permissionId,
        permissionRevision: permission.revision,
        permissionHash: operationContentHash(permission),
        recipientEndpointId: permission.recipientEndpointId,
        endpointHash: whatsappEndpointHash(permission.phoneE164),
        templateDocumentId: rendered.templateDocumentId,
        templateHash: rendered.templateHash, payloadHash: rendered.payloadHash,
        quoteRevision: policy.quote.revision, grantId: linkId,
        currency: rendered.currency, maxCostMicros: rendered.maxCostMicros,
        budgetIds: budgets.map((b) => b.budgetId),
        replyBindingId: native ? native.value.attemptId : null,
        stopRecordHash: material.stopRecordHash, createdAt: now};
      if (!validateEventWhatsappDispatchDocument(dispatch)) {
        throw new Error("Invalid WhatsApp debit evidence");
      }
      const debited = budgets.map((budget) => parseWhatsappBudget({...budget,
        chargedMicros: budget.chargedMicros + rendered.maxCostMicros,
        revision: budget.revision + 1, updatedAt: now}));
      return {kind: "ready", value: {...material, replies},
        validUntil: Math.min(route.state.validUntil,
          native?.validUntil ?? route.state.validUntil), commit: () => {
          tx.create(ref, dispatch);
          native?.commit();
          if (!withdrawalSnap.exists) tx.create(withdrawalRef, withdrawal);
          for (const budget of debited) {
            tx.set(this.db.collection(WHATSAPP_BUDGETS).doc(budget.budgetId),
              budget);
          }
        }};
    };
  }

  private config(connection: unknown, value: unknown):
    WhatsappSenderConfig | null {
    if (!validateOrganizerSenderConnectionDocument(connection)) return null;
    const sender = whatsappConsentSender(this.senderId,
      connection.organizerId, connection, value);
    if (!sender?.connectionReady || !sender.policy) return null;
    return {connection, policy: parseWhatsappPolicy(value)};
  }

  private async read(tx: Transaction, intent: Intent, linkId: string,
    now: number): Promise<ReadResult> {
    if (!/^[a-f0-9]{32}$/.test(linkId) || linkId.length !== 32) {
      throw new Error("Invalid WhatsApp guest grant id");
    }
    const gate = await readEventAssistanceMessageGate(this.db, tx, intent, now);
    const blocked = (reason: BlockReason): ReadResult => ({material: null,
      facts: {gate, routes: [{routeId: "organizerEventWhatsapp",
        state: {kind: "blocked", reason}}]}});
    if (gate.kind === "stop" || intent.context.mode !== "live") {
      return blocked("policyBlocked");
    }
    if (!messageAllowsSender(intent, "organizerEventWhatsapp", this.senderId)) {
      return blocked("policyBlocked");
    }
    const context = intent.context;
    const [connectionSnap, policySnap, grantSnap] =
      await tx.getAll(
        this.db.collection("organizerSenderConnections").doc(this.senderId),
        this.db.collection(WHATSAPP_POLICIES).doc(this.senderId),
        this.db.collection(guestCollections.grants).doc(linkId));
    const config = this.config(connectionSnap.data(), policySnap.data());
    if (!config || config.connection.organizerId !== context.organizerId) {
      return blocked("notProvisioned");
    }
    const {connection, policy} = config;
    const consent = await readWhatsappMessagePermission(this.db, tx,
      {context, attendeeId: intent.attendeeId, senderId: this.senderId},
      connection, now);
    if (consent.kind === "blocked") return blocked(consent.reason);
    const {permission, source, stop} = consent;
    const scopes = whatsappBudgetScopes(context, now);
    const purpose = intent.kind === "joiningUpdate" ?
      "joiningUpdate" : intent.noticeKind;
    const approved = policy.templates.find((t) => t.purpose === purpose);
    if (!approved || !grantSnap.exists) return blocked("templateUnavailable");
    const [templateSnap, ...budgetSnaps] =
      await tx.getAll(
        this.db.collection("organizerMessageTemplates")
          .doc(approved.templateDocumentId),
        ...scopes.map((scope) => this.db.collection(WHATSAPP_BUDGETS)
          .doc(whatsappBudgetId(this.senderId, policy.quote.currency, scope))));
    const grant = parseGrant(grantSnap.data());
    if (grant.linkId !== linkId) return blocked("templateUnavailable");
    let rendered: RenderedWhatsapp;
    try {
      rendered = renderEventWhatsapp({policy, template: templateSnap.data(),
        templateDocumentId: approved.templateDocumentId, intent, grant,
        keys: this.keys, eventTitle: source.eventTitle,
        phoneE164: permission.phoneE164, now});
    } catch {
      return blocked("templateUnavailable");
    }
    if (budgetSnaps.some((s) => !s.exists)) return blocked("budgetExceeded");
    const budgets = budgetSnaps.map((s) => parseWhatsappBudget(s.data())) as
      [WhatsappBudget, WhatsappBudget];
    if (budgets.some((b, i) => b.budgetId !== whatsappBudgetId(this.senderId,
      rendered.currency, scopes[i]) || b.status !== "active" ||
      b.startsAt > now || b.endsAt <= now || b.updatedAt > now ||
      b.limitMicros - b.chargedMicros < rendered.maxCostMicros)) {
      return blocked("budgetExceeded");
    }
    const validUntil = Math.min(now + 30_000, gate.validUntil,
      permission.expiresAt, rendered.validUntil,
      ...budgets.map((b) => b.endsAt));
    return {material: {connection, policy, permission, rendered, grant,
      budgets, stopRecordHash: stop ? operationContentHash(stop) : null},
    facts: {gate, routes: [{routeId: "organizerEventWhatsapp", state: {
      kind: "eligible", checkedAt: now, validUntil,
      permissionRevision: "wa-authority:" + operationContentHash([
        config, permission, grant, rendered.payloadHash, stop,
      ]), candidate: {mode: "live", binding: {
        routeId: "organizerEventWhatsapp", transport: "whatsapp",
        provider: "meta", senderIdentity: "organizerManaged",
        senderId: this.senderId, bindingRevision: connection.revision,
        recipientEndpointId: permission.recipientEndpointId,
        fallbackOwner: "catch",
      }},
    }}]}};
  }
}
