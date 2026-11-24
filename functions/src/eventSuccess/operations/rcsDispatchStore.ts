import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {FirestoreMessageOutbox, PrepareDispatchResource} from
  "./firestoreMessageOutbox";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import type {GuestLinkSigningKeys} from
  "../../platform/guestLinkSigningKeys";
import {Grant, guestCollections, parseGrant, parseGuest, requireDocumentId}
  from "./guestRecords";
import type {MessageRecord, OutboxFacts} from "./messageOutbox";
import type {RouteReadiness} from "./messagingPolicy";
import {messageAllowsSender} from "./lateJoinDispatchPolicy";
import {Permission, rcsConsentCollections, rcsStopHash} from "./rcsConsent";
import {readRcsMessagePermission} from "./rcsPermissionReader";
import {RcsConfig, PreparedRcsContent, RenderedRcs, parseRcsConfig,
  prepareEventRcs, renderEventRcs, rcsPhoneHash} from "./rcsProtocol";
import {prepareRcsWithdrawal} from "./rcsWithdrawalRecords";
import {RcsBudget, RcsCapability, RCS_BUDGETS, RCS_DISPATCHES, rcsBudgetId,
  rcsBudgetScopes, parseRcsBudget, parseRcsCapability, parseRcsDispatch,
  rcsAttemptScopeHash} from
  "./rcsDispatchRecords";

type Intent = MessageRecord["intent"];
type BlockReason = Extract<RouteReadiness["state"], {kind: "blocked"}>[
  "reason"];
export interface RcsMaterial {
  config: RcsConfig;
  permission: Extract<Permission, {status: "granted"}>;
  grant: Grant;
  eventTitle: string;
  capability: RcsCapability;
  prepared: PreparedRcsContent;
  budgets: [RcsBudget, RcsBudget];
  deliveryExpiresAt: number;
}
export interface ClaimedRcsMaterial extends RcsMaterial {rendered: RenderedRcs}
type MaterialResult = {facts: OutboxFacts; material: RcsMaterial | null};

/** Capability I/O precedes reservation; dispatch is transactional. */
export class RcsDispatchStore {
  constructor(private readonly db: Firestore,
    private readonly senderId: string,
    private readonly keys: GuestLinkSigningKeys,
    private readonly clock: () => number = Date.now) {
    requireDocumentId(senderId);
  }

  async sender(): Promise<RcsConfig | null> {
    const snap = await this.db.collection(rcsConsentCollections.senders)
      .doc(this.senderId).get();
    if (!snap.exists) return null;
    const config = parseRcsConfig(snap.data());
    if (config.senderId !== this.senderId) throw new Error("RCS sender drift");
    return config;
  }

  /** A current consent and original guest episode permit a capability lookup.
   * No cached phone or network observation grants delivery authority.
   */
  async capabilityTarget(linkId: string, expected: RcsConfig, now: number) {
    this.requireLink(linkId);
    return transact(this.db, async (tx) => {
      const [senderSnap, grantSnap] = await tx.getAll(
        this.db.collection(rcsConsentCollections.senders).doc(this.senderId),
        this.db.collection(guestCollections.grants).doc(linkId));
      if (!senderSnap.exists || !grantSnap.exists) return null;
      const config = parseRcsConfig(senderSnap.data());
      if (operationContentHash(config) !== operationContentHash(expected) ||
          !this.senderReady(config, now)) return null;
      const grant = parseGrant(grantSnap.data());
      if (grant.linkId !== linkId || grant.revokedAt !== null ||
          grant.issuedAt > now || grant.expiresAt <= now) return null;
      const scopes = rcsBudgetScopes(grant.context, now);
      const budgetSnaps = await tx.getAll(...scopes.map((scope) =>
        this.db.collection(RCS_BUDGETS)
          .doc(rcsBudgetId(this.senderId, scope))));
      if (budgetSnaps.some((snap) => !snap.exists)) return null;
      let budgets: [RcsBudget, RcsBudget];
      try {
        budgets = budgetSnaps.map((snap) =>
          parseRcsBudget(snap.data())) as [RcsBudget, RcsBudget];
      } catch {
        return null;
      }
      if (!this.budgetsReady(budgets, scopes, config, now)) return null;
      const consent = await readRcsMessagePermission(this.db, tx,
        {context: grant.context, attendeeId: grant.attendeeId,
          senderId: this.senderId}, config, now);
      if (consent.kind !== "allowed" || !config.recipientPrefixes.some((p) =>
        consent.permission.phoneE164.startsWith(p))) return null;
      const guestSnap = await tx.get(this.db.collection(guestCollections.guests)
        .doc(grant.guestId));
      if (!guestSnap.exists) return null;
      const guest = parseGuest(guestSnap.data());
      if (guest.guestId !== grant.guestId ||
          guest.episodeId !== grant.episodeId ||
          guest.lifecycle !== "active" ||
          guest.attendeeGeneration !== consent.permission.attendeeGeneration ||
          guest.sourceGeneration !== consent.permission.sourceGeneration) {
        return null;
      }
      return {permission: consent.permission, grant};
    });
  }

  outbox(linkId: string, expected: RcsConfig,
    capability: RcsCapability | null) {
    this.requireLink(linkId);
    return new FirestoreMessageOutbox(this.db, async (tx, intent, now) => {
      if (intent.permittedRoutes.some((r) => r !== "catchEventRcs")) {
        throw new Error("Multi-route messages require the channel composer");
      }
      return this.readFacts(tx, intent, linkId, now, expected, capability);
    }, this.clock);
  }

  async readFacts(tx: Transaction, intent: Intent, linkId: string, now: number,
    expected: RcsConfig, capability: RcsCapability | null):
    Promise<OutboxFacts> {
    const result = await this.read(tx, intent, linkId, now, expected,
      capability);
    return result.facts;
  }

  prepare(linkId: string, expected: RcsConfig,
    capability: RcsCapability | null):
    PrepareDispatchResource<ClaimedRcsMaterial> {
    return async (tx, record, attempt, now) => {
      const result = await this.read(tx, record.intent, linkId, now, expected,
        capability);
      const material = result.material;
      const route = result.facts.routes[0];
      if (!material || route?.state.kind !== "eligible" ||
          route.state.candidate.mode !== "live" ||
          route.state.permissionRevision !==
            attempt.authorization.permissionRevision ||
          operationContentHash(route.state.candidate.binding) !==
            operationContentHash(attempt.binding)) return {kind: "withheld"};
      const ref = this.db.collection(RCS_DISPATCHES).doc(attempt.attemptId);
      if ((await tx.get(ref)).exists) return {kind: "withheld"};
      const {permission, config, grant, budgets} = material;
      const guestSnap = await tx.get(this.db.collection(guestCollections.guests)
        .doc(grant.guestId));
      if (!guestSnap.exists) return {kind: "withheld"};
      const guest = parseGuest(guestSnap.data());
      if (guest.guestId !== grant.guestId ||
          guest.episodeId !== grant.episodeId ||
          guest.sourceGeneration !== permission.sourceGeneration ||
          guest.attendeeGeneration !== permission.attendeeGeneration) {
        return {kind: "withheld"};
      }
      const withdrawal = await prepareRcsWithdrawal(this.db, tx, permission,
        grant, now);
      const rendered = renderEventRcs({config, grant, keys: this.keys, now,
        intent: record.intent, eventTitle: material.eventTitle,
        supportsOpenUrl: material.capability.supportsOpenUrl,
        attemptId: attempt.attemptId, expiresBy: material.deliveryExpiresAt});
      const debited = budgets.map((budget) => parseRcsBudget({...budget,
        revision: budget.revision + 1, updatedAt: now,
        chargedMicros: budget.chargedMicros + rendered.maxCostMicros}));
      const dispatch = parseRcsDispatch({schemaVersion: 1,
        attemptId: attempt.attemptId, messageId: record.messageId,
        context: permission.context, attendeeId: permission.attendeeId,
        senderId: config.senderId, agentId: config.agentId,
        region: config.region, bindingRevision: config.revision,
        configHash: operationContentHash(config),
        permissionId: permission.permissionId,
        permissionRevision: permission.revision,
        permissionHash: operationContentHash(permission),
        recipientEndpointId: permission.recipientEndpointId,
        endpointHash: rcsPhoneHash(permission.phoneE164),
        capability: material.capability, grantId: grant.linkId,
        guestGrantHash: operationContentHash(grant),
        payloadHash: rendered.payloadHash,
        authorityHash: rendered.authorityHash,
        intentHash: operationContentHash(record.intent),
        attemptScopeHash: rcsAttemptScopeHash(attempt),
        replyBinding: material.prepared.choices.length === 0 ? null : {
          guestId: guest.guestId, episodeId: guest.episodeId,
          guestRevision: guest.revision,
          attendeeGeneration: guest.attendeeGeneration,
          sourceGeneration: guest.sourceGeneration,
          subjectUid: permission.subjectUid,
          ...(permission.recipientBinding ?
            {recipientBinding: permission.recipientBinding} : {}),
          expiresAt: Math.min(record.intent.expiresAt, grant.expiresAt,
            permission.expiresAt, material.deliveryExpiresAt),
          choices: material.prepared.choices.map(({index}) => ({index,
            choiceId: record.intent.choices[index].choiceId})),
        },
        providerMessageId: rendered.providerMessageId,
        expiresAt: rendered.expiresAt, createdAt: now,
        quoteRevision: config.quote.revision, currency: config.quote.currency,
        maxCostMicros: rendered.maxCostMicros,
        budgetDebits: budgets.map((before, i) => ({budgetId: before.budgetId,
          approvalId: before.approvalId, revisionBefore: before.revision,
          revisionAfter: debited[i].revision,
          chargedBeforeMicros: before.chargedMicros,
          chargedAfterMicros: debited[i].chargedMicros}))});
      return {kind: "ready", value: {...material, rendered},
        validUntil: Math.min(route.state.validUntil, rendered.validUntil),
        commit: () => {
          tx.create(ref, dispatch);
          withdrawal.commit();
          for (const budget of debited) {
            tx.set(this.db.collection(RCS_BUDGETS)
              .doc(budget.budgetId), budget);
          }
        }};
    };
  }

  private async read(tx: Transaction, intent: Intent, linkId: string,
    now: number, expected: RcsConfig, capability: RcsCapability | null):
    Promise<MaterialResult> {
    this.requireLink(linkId);
    const gate = await readEventAssistanceMessageGate(this.db, tx, intent, now);
    const blocked = (reason: BlockReason): MaterialResult => ({material: null,
      facts: {gate, routes: [{routeId: "catchEventRcs",
        state: {kind: "blocked", reason}}]}});
    if (gate.kind === "stop" || intent.context.mode !== "live" ||
        !messageAllowsSender(intent, "catchEventRcs", this.senderId)) {
      return blocked("policyBlocked");
    }
    const scopes = rcsBudgetScopes(intent.context, now);
    const [senderSnap, grantSnap, ...budgetSnaps] = await tx.getAll(
      this.db.collection(rcsConsentCollections.senders).doc(this.senderId),
      this.db.collection(guestCollections.grants).doc(linkId),
      ...scopes.map((s) => this.db.collection(RCS_BUDGETS)
        .doc(rcsBudgetId(this.senderId, s))));
    if (!senderSnap.exists) return blocked("notProvisioned");
    const config = parseRcsConfig(senderSnap.data());
    if (!this.senderReady(config, now)) return blocked("notProvisioned");
    if (operationContentHash(config) !== operationContentHash(expected)) {
      return blocked("channelUnavailable");
    }
    const consent = await readRcsMessagePermission(this.db, tx,
      {context: intent.context, attendeeId: intent.attendeeId,
        senderId: this.senderId}, config, now);
    if (consent.kind === "blocked") return blocked(consent.reason);
    const {permission, source, subscription} = consent;
    if (!config.recipientPrefixes.some((p) =>
      permission.phoneE164.startsWith(p))) {
      return blocked("channelUnavailable");
    }
    if (budgetSnaps.some((s) => !s.exists)) return blocked("budgetExceeded");
    let budgets: [RcsBudget, RcsBudget];
    try {
      budgets = budgetSnaps.map((s) => parseRcsBudget(s.data())) as
        [RcsBudget, RcsBudget];
    } catch {
      return blocked("budgetExceeded");
    }
    if (!this.budgetsReady(budgets, scopes, config, now)) {
      return blocked("budgetExceeded");
    }
    if (!capability) return blocked("channelUnavailable");
    parseRcsCapability(capability);
    if (capability.senderId !== config.senderId ||
        capability.agentId !== config.agentId ||
        capability.configHash !== operationContentHash(config) ||
        capability.permissionHash !== operationContentHash(permission) ||
        capability.recipientEndpointId !== permission.recipientEndpointId ||
        capability.checkedAt > now || capability.validUntil <= now) {
      return blocked("channelUnavailable");
    }
    if (!grantSnap.exists) return blocked("templateUnavailable");
    const grant = parseGrant(grantSnap.data());
    if (grant.linkId !== linkId) return blocked("templateUnavailable");
    let prepared: PreparedRcsContent;
    try {
      prepared = prepareEventRcs({config, intent, grant, keys: this.keys, now,
        eventTitle: source.eventTitle,
        supportsOpenUrl: capability.supportsOpenUrl});
    } catch {
      return blocked("templateUnavailable");
    }
    if (budgets.some((budget) =>
      budget.limitMicros - budget.chargedMicros < prepared.maxCostMicros)) {
      return blocked("budgetExceeded");
    }
    const validUntil = Math.min(now + 30_000, gate.validUntil,
      permission.expiresAt, prepared.validUntil, capability.validUntil,
      ...budgets.map((b) => b.endsAt));
    return {material: {config, permission, grant, prepared, capability,
      budgets, eventTitle: source.eventTitle, deliveryExpiresAt: Math.min(
        permission.expiresAt, source.eventEnd > now ? source.eventEnd :
          Math.floor(source.eventEnd) + 86_400_000)}, facts: {gate, routes: [{
      routeId: "catchEventRcs", state: {kind: "eligible", checkedAt: now,
        validUntil, permissionRevision: "rcs-authority:" +
          operationContentHash([
            config, permission, prepared.authorityHash,
            rcsStopHash(subscription),
          ]), candidate: {mode: "live", binding: {routeId: "catchEventRcs",
          transport: "rcs", provider: "googleRbm",
          senderIdentity: "catchPlatform", senderId: this.senderId,
          bindingRevision: config.revision,
          recipientEndpointId: permission.recipientEndpointId,
          fallbackOwner: "catch"}}}}]}};
  }

  private requireLink(linkId: string) {
    if (!/^[a-f0-9]{32}$/.test(linkId)) throw new Error("Invalid RCS grant id");
  }

  private senderReady(config: RcsConfig, now: number) {
    return config.senderId === this.senderId && config.status === "ready" &&
      config.activation.approvedAt <= now && config.activation.validUntil > now;
  }

  private budgetsReady(budgets: [RcsBudget, RcsBudget],
    scopes: ReturnType<typeof rcsBudgetScopes>, config: RcsConfig,
    now: number): boolean {
    return budgets.every((budget, index) =>
      budget.budgetId === rcsBudgetId(this.senderId, scopes[index]) &&
      budget.agentId === config.agentId &&
      budget.currency === config.quote.currency &&
      budget.status === "active" && budget.startsAt <= now &&
      budget.endsAt > now && budget.updatedAt <= now &&
      budget.limitMicros - budget.chargedMicros >=
        config.quote.maxMicrosPerMessage);
  }
}
