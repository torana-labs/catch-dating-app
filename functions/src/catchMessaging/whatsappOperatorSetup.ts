import type {CatchWhatsappOperatorSetupOperationDocument} from
  "../shared/generated/catchWhatsappOperatorSetupOperationDocument";
import {createHash} from "node:crypto";
import {ADMIN_ROLE_CLAIMS} from "../platform/adminAuth";
import type {CatchAppAuthority, CatchFirebaseObservation,
  CatchVerifiedSession} from "./whatsappAppAuthority";

/** Internal source only; no callable, index export or default live grant. */
export interface OperatorSetupScope {
  projectId: string;
  actorUid: string;
  actorEmailSha256: string;
  recipientUid: string;
  endpointHash: string;
  appId: string;
  wabaId: string;
  phoneNumberId: string;
  credentialVersionSha256: string;
}
export interface OperatorSetupSnapshot {
  actor: {
    auth: CatchFirebaseObservation;
    session: CatchVerifiedSession;
    emailSha256: string;
    googleSubjectSha256: string;
    claims: Record<string, unknown>;
  };
  recipient: {
    auth: CatchFirebaseObservation;
    claims: Record<string, unknown>;
  };
  existingOwnerUids: string[];
  authorityExists: boolean;
  bootstrapExists: boolean;
  actorAssignmentExists: boolean;
  actorAssignment?: Record<string, unknown>;
}
export interface OperatorSetupPlan {
  schemaVersion: 1;
  planId: string;
  scope: OperatorSetupScope;
  sourceSha: string;
  createdAtMillis: number;
  expiresAtMillis: number;
  actorCreationTimeMillis: number;
  recipientCreationTimeMillis: number;
  actorTokensValidAfterMillis: number;
  recipientTokensValidAfterMillis: number;
  googleSubjectSha256: string;
  beforeClaimsSha256: string;
  desiredClaimsSha256: string;
  recipientClaimsSha256: string;
  grantNonce: string;
  createReviewRef: string;
  revokeReviewRef: string;
  actorAssignmentSha256?: string;
  expectedActorRevision: 0;
  expectedRecipientRevision: 0;
}
export type OperatorSetupPhase = "reserved" | "auth-intent" |
  "auth-confirmed" | "seeded" | "root-active" | "prepare-intent" |
  "prepared" | "finalize-intent" | "complete" | "publish-intent" |
  "published" | "readiness-intent" | "ready" | "revoke-intent" | "revoked";
export type OperatorSetupOperation =
  CatchWhatsappOperatorSetupOperationDocument;
export interface OperatorSetupRequest {
  planId: string;
  planSha256: string;
  replayKey: string;
}
export interface OperatorSetupJournal {
  reserve(plan: OperatorSetupPlan, request: OperatorSetupRequest):
    Promise<OperatorSetupOperation>;
  read(plan: OperatorSetupPlan, request: OperatorSetupRequest):
    Promise<OperatorSetupOperation>;
  advance(plan: OperatorSetupPlan, request: OperatorSetupRequest,
    from: OperatorSetupPhase, to: OperatorSetupPhase): Promise<boolean>;
  seed(plan: OperatorSetupPlan, request: OperatorSetupRequest): Promise<void>;
  activateRoot(plan: OperatorSetupPlan, request: OperatorSetupRequest):
    Promise<"fresh-sign-in-required" | "active">;
  recipient(plan: OperatorSetupPlan): Promise<CatchAppAuthority>;
  prepareReceive(plan: OperatorSetupPlan, request: OperatorSetupRequest):
    Promise<void>;
  finalizeReceive(plan: OperatorSetupPlan, request: OperatorSetupRequest):
    Promise<void>;
  assertComplete(plan: OperatorSetupPlan, includeRecipient?: boolean):
    Promise<void>;
}
export interface OperatorSetupSources {
  scope: OperatorSetupScope;
  sourceSha: string;
  now(): number;
  snapshot(): Promise<OperatorSetupSnapshot>;
  actor(): Promise<OperatorSetupSnapshot["actor"]>;
  /** Independently reviewed immutable server source, never request JSON. */
  loadReviewedPlan(planId: string): Promise<OperatorSetupPlan | null>;
  /** Missing by default. Future activation wires separately approved policy. */
  authorizeApply?: (planSha256: string) => Promise<void>;
  setActorClaims(claims: Record<string, unknown>,
    request: OperatorSetupRequest): Promise<void>;
  readiness?: {
    publish(reference: string, request: OperatorSetupRequest): Promise<void>;
    apply(reference: string, request: OperatorSetupRequest): Promise<void>;
    /** Resume a proven exact approved revoke receipt without re-admission. */
    resumeRevoke?: (reference: string, request: OperatorSetupRequest) =>
      Promise<void>;
    /** Exact saved publication/audit, not an inferred success or auto retry. */
    reconcile(reference: string, action: "publish" | "apply" | "revoke",
      request: OperatorSetupRequest):
      Promise<boolean>;
  };
}
export const setupHash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) =>
      [key, canonical((value as Record<string, unknown>)[key])]));
  }
  if (value === null || typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))) return value;
  setupUnavailable();
}
export function setupUnavailable(): never {
  throw new Error("Protected Catch operator setup unavailable.");
}
export function setupExact(value: unknown, keys: string[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) {
    setupUnavailable();
  }
}
const hash = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const id = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(v);
const millis = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
export function validateSetupScope(scope: OperatorSetupScope): void {
  setupExact(scope, ["projectId", "actorUid", "actorEmailSha256",
    "recipientUid", "endpointHash", "appId", "wabaId", "phoneNumberId",
    "credentialVersionSha256"]);
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u.test(scope.projectId) ||
      !id(scope.actorUid) || !id(scope.recipientUid) ||
      ![scope.actorEmailSha256, scope.endpointHash,
        scope.credentialVersionSha256].every(hash) ||
      ![scope.appId, scope.wabaId, scope.phoneNumberId]
        .every((v) => typeof v === "string" && /^[1-9][0-9]{4,31}$/u.test(v))) {
    setupUnavailable();
  }
}
/** A consolidated operator keeps one Auth identity and one authority record. */
export const isConsolidatedOperator = (scope: OperatorSetupScope): boolean =>
  scope.actorUid === scope.recipientUid;

/** Bind the existing projection, including metadata, before any role write. */
export function operatorAssignmentHash(value: Record<string, unknown>): string {
  return setupHash(JSON.parse(JSON.stringify(value)));
}
export function assertLegacyOperatorAssignment(value: unknown,
  scope: OperatorSetupScope): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    setupUnavailable();
  }
  const record = value as Record<string, unknown>;
  if (record.targetUid !== scope.actorUid || record.disabled !== false ||
      record.status !== "active" || setupHash(record.roles) !==
        setupHash(["admin"])) setupUnavailable();
}
export function setupAssignmentMatches(plan: OperatorSetupPlan,
  snapshot: Pick<OperatorSetupSnapshot,
    "actorAssignmentExists" | "actorAssignment">): boolean {
  if (!isConsolidatedOperator(plan.scope)) {
    return !snapshot.actorAssignmentExists;
  }
  if (!snapshot.actorAssignmentExists || !snapshot.actorAssignment) {
    return false;
  }
  assertLegacyOperatorAssignment(snapshot.actorAssignment, plan.scope);
  return operatorAssignmentHash(snapshot.actorAssignment) ===
    plan.actorAssignmentSha256;
}
export function operatorRootCapabilities(scope: OperatorSetupScope):
  CatchAppAuthority["capabilities"] {
  return isConsolidatedOperator(scope) ? ["receive", "reply", "review"] :
    ["reply", "review"];
}
export function validateSetupPlan(plan: OperatorSetupPlan): void {
  setupExact(plan, ["schemaVersion", "planId", "scope", "sourceSha",
    "createdAtMillis", "expiresAtMillis", "actorCreationTimeMillis",
    "recipientCreationTimeMillis", "actorTokensValidAfterMillis",
    "recipientTokensValidAfterMillis", "googleSubjectSha256",
    "beforeClaimsSha256", "desiredClaimsSha256", "recipientClaimsSha256",
    "grantNonce", "createReviewRef", "revokeReviewRef",
    "expectedActorRevision", "expectedRecipientRevision",
    ...(isConsolidatedOperator(plan.scope) ? ["actorAssignmentSha256"] : [])]);
  validateSetupScope(plan.scope);
  if (isConsolidatedOperator(plan.scope) &&
      (!hash(plan.actorAssignmentSha256) ||
        plan.beforeClaimsSha256 !== setupHash({admin: true}) ||
        plan.desiredClaimsSha256 !==
          setupHash({admin: true, adminOwner: true}) ||
        plan.recipientClaimsSha256 !== plan.beforeClaimsSha256 ||
        plan.actorCreationTimeMillis !== plan.recipientCreationTimeMillis ||
        plan.actorTokensValidAfterMillis !==
          plan.recipientTokensValidAfterMillis)) setupUnavailable();
  if (plan.schemaVersion !== 1 || !id(plan.planId) ||
      !/^[a-f0-9]{40}$/u.test(plan.sourceSha) ||
      ![plan.createdAtMillis, plan.expiresAtMillis,
        plan.actorCreationTimeMillis, plan.recipientCreationTimeMillis,
        plan.actorTokensValidAfterMillis, plan.recipientTokensValidAfterMillis]
        .every(millis) || plan.expiresAtMillis <= plan.createdAtMillis ||
      plan.expiresAtMillis - plan.createdAtMillis > 15 * 60 * 1000 ||
      ![plan.googleSubjectSha256, plan.beforeClaimsSha256,
        plan.desiredClaimsSha256, plan.recipientClaimsSha256,
        plan.grantNonce].every(hash) || !id(plan.createReviewRef) ||
      !id(plan.revokeReviewRef) ||
      plan.createReviewRef === plan.revokeReviewRef ||
      plan.expectedActorRevision !== 0 || plan.expectedRecipientRevision !==
        0) {
    setupUnavailable();
  }
}
export function validateSetupRequest(value: unknown): OperatorSetupRequest {
  setupExact(value, ["planId", "planSha256", "replayKey"]);
  const r = value as OperatorSetupRequest;
  if (!id(r.planId) || !hash(r.planSha256) || !hash(r.replayKey)) {
    setupUnavailable();
  }
  return {...r};
}
export function desiredOperatorClaims(claims: Record<string, unknown>):
Record<string, unknown> {
  if (!claims || Object.getPrototypeOf(claims) !== Object.prototype) {
    setupUnavailable();
  }
  const copy = canonical({...claims, adminOwner: true}) as
    Record<string, unknown>;
  if (Buffer.byteLength(JSON.stringify(copy), "utf8") > 1000) {
    setupUnavailable();
  }
  return copy;
}
function observation(a: CatchFirebaseObservation, uid: string,
  projectId: string, now: number): void {
  setupExact(a, ["projectId", "uid", "creationTimeMillis", "observedAtMillis",
    "disabled", "relevantRoles", "endpointHash", "tokensValidAfterMillis"]);
  if (a.uid !== uid || a.projectId !== projectId || a.disabled !== false ||
      ![a.creationTimeMillis, a.observedAtMillis,
        a.tokensValidAfterMillis].every(millis) ||
      a.creationTimeMillis > a.observedAtMillis ||
      a.tokensValidAfterMillis > a.observedAtMillis ||
      a.observedAtMillis > now || now - a.observedAtMillis >= 30000 ||
      !(a.endpointHash === null || hash(a.endpointHash)) ||
      !Array.isArray(a.relevantRoles) || new Set(a.relevantRoles).size !==
      a.relevantRoles.length || !a.relevantRoles.every((r) =>
    r === "adminOwner" || r === "support")) setupUnavailable();
}
export function assertSetupSnapshot(scope: OperatorSetupScope,
  snapshot: OperatorSetupSnapshot, now: number): void {
  validateSetupScope(scope);
  if (!millis(now)) setupUnavailable();
  const a = snapshot.actor;
  observation(a.auth, scope.actorUid, scope.projectId, now);
  observation(snapshot.recipient.auth, scope.recipientUid, scope.projectId,
    now);
  setupExact(a.session, ["projectId", "uid", "authTimeSeconds",
    "expiresAtSeconds"]);
  if (a.emailSha256 !== scope.actorEmailSha256 ||
      !hash(a.googleSubjectSha256) ||
      snapshot.recipient.auth.endpointHash !== scope.endpointHash ||
      a.session.projectId !== scope.projectId ||
      a.session.uid !== scope.actorUid ||
      ![a.session.authTimeSeconds, a.session.expiresAtSeconds].every(millis) ||
      a.session.authTimeSeconds * 1000 > now ||
      now - a.session.authTimeSeconds * 1000 > 15 * 60 * 1000 ||
      a.session.expiresAtSeconds * 1000 <= now ||
      a.session.authTimeSeconds * 1000 < a.auth.tokensValidAfterMillis ||
      a.session.authTimeSeconds < Math.floor(
        a.auth.creationTimeMillis / 1000) ||
      !Array.isArray(snapshot.existingOwnerUids) ||
      !snapshot.existingOwnerUids.every(id) ||
      new Set(snapshot.existingOwnerUids).size !==
        snapshot.existingOwnerUids.length ||
      a.auth.relevantRoles.includes("adminOwner") !==
        (a.claims.adminOwner === true) ||
      a.auth.relevantRoles.includes("support") !==
        (a.claims.support === true) ||
      snapshot.recipient.auth.relevantRoles.includes("adminOwner") !==
        (snapshot.recipient.claims.adminOwner === true) ||
      snapshot.recipient.auth.relevantRoles.includes("support") !==
        (snapshot.recipient.claims.support === true)) setupUnavailable();
  setupHash(a.claims);
  setupHash(snapshot.recipient.claims);
  if (isConsolidatedOperator(scope) &&
      (setupHash(a.claims) !== setupHash(snapshot.recipient.claims) ||
        a.auth.creationTimeMillis !==
          snapshot.recipient.auth.creationTimeMillis ||
        a.auth.tokensValidAfterMillis !==
          snapshot.recipient.auth.tokensValidAfterMillis ||
        a.auth.endpointHash !== scope.endpointHash)) setupUnavailable();
}
/** Read-only plan; receipt excludes tokens, raw claims and endpoints. */
export function planOperatorSetup(scope: OperatorSetupScope,
  snapshot: OperatorSetupSnapshot, options: {
    planId: string; sourceSha: string; grantNonce: string;
    createReviewRef: string; revokeReviewRef: string; now: number;
  }): OperatorSetupPlan {
  assertSetupSnapshot(scope, snapshot, options.now);
  const consolidated = isConsolidatedOperator(scope);
  if (consolidated) {
    assertLegacyOperatorAssignment(snapshot.actorAssignment, scope);
    if (!snapshot.actorAssignmentExists ||
        setupHash(snapshot.actor.claims) !== setupHash({admin: true})) {
      setupUnavailable();
    }
  }
  const recipientClaims = snapshot.recipient.claims;
  // Preserve only the explicitly observed legacy {admin: true} shape. The
  // reviewed plan binds its full hash, exact recipient and source; this claim
  // supplies no Catch capability and is never written by bootstrap.
  const preserveLegacyAdmin = Object.keys(recipientClaims).length === 1 &&
    Object.hasOwn(recipientClaims, "admin") && recipientClaims.admin === true;
  if (snapshot.authorityExists || snapshot.bootstrapExists ||
      (!consolidated && snapshot.actorAssignmentExists) ||
      snapshot.existingOwnerUids.length ||
      (!consolidated && ADMIN_ROLE_CLAIMS.some((role) =>
        snapshot.actor.claims[role] === true)) ||
      (!preserveLegacyAdmin && ADMIN_ROLE_CLAIMS.some((role) =>
        recipientClaims[role] === true))) {
    setupUnavailable();
  }
  const plan: OperatorSetupPlan = {schemaVersion: 1,
    planId: options.planId, scope: structuredClone(scope),
    sourceSha: options.sourceSha, createdAtMillis: options.now,
    expiresAtMillis: options.now + 15 * 60 * 1000,
    actorCreationTimeMillis: snapshot.actor.auth.creationTimeMillis,
    recipientCreationTimeMillis: snapshot.recipient.auth.creationTimeMillis,
    actorTokensValidAfterMillis: snapshot.actor.auth.tokensValidAfterMillis,
    recipientTokensValidAfterMillis:
      snapshot.recipient.auth.tokensValidAfterMillis,
    googleSubjectSha256: snapshot.actor.googleSubjectSha256,
    beforeClaimsSha256: setupHash(snapshot.actor.claims),
    desiredClaimsSha256: setupHash(desiredOperatorClaims(
      snapshot.actor.claims)),
    recipientClaimsSha256: setupHash(snapshot.recipient.claims),
    grantNonce: options.grantNonce, createReviewRef: options.createReviewRef,
    revokeReviewRef: options.revokeReviewRef,
    ...(consolidated ? {actorAssignmentSha256:
      operatorAssignmentHash(snapshot.actorAssignment!)} : {}),
    expectedActorRevision: 0, expectedRecipientRevision: 0};
  validateSetupPlan(plan);
  return plan;
}
export function assertPlannedSetupIdentity(plan: OperatorSetupPlan,
  snapshot: OperatorSetupSnapshot, now: number): void {
  assertSetupSnapshot(plan.scope, snapshot, now);
  if (snapshot.actor.auth.creationTimeMillis !== plan.actorCreationTimeMillis ||
      snapshot.recipient.auth.creationTimeMillis !==
        plan.recipientCreationTimeMillis ||
      snapshot.actor.auth.tokensValidAfterMillis !==
        plan.actorTokensValidAfterMillis ||
      snapshot.recipient.auth.tokensValidAfterMillis !==
        plan.recipientTokensValidAfterMillis ||
      snapshot.actor.googleSubjectSha256 !== plan.googleSubjectSha256 ||
      !(isConsolidatedOperator(plan.scope) ?
        [plan.beforeClaimsSha256, plan.desiredClaimsSha256].includes(
          setupHash(snapshot.recipient.claims)) :
        setupHash(snapshot.recipient.claims) === plan.recipientClaimsSha256) ||
      snapshot.existingOwnerUids.some((uid) => uid !== plan.scope.actorUid)) {
    setupUnavailable();
  }
}

/** Phase journal prevents blind cross-service retries. Auth has no claim CAS.
 * A last read cannot exclude a concurrent Console/Admin write after that read.
 * Before live wiring, the operator must review this residual lost-update race.
 * Observed drift fails closed; intent survives every unknown outcome. */
export class CatchWhatsappOperatorSetup {
  constructor(readonly sources: OperatorSetupSources,
    readonly journal: OperatorSetupJournal) {}
  private async reviewed(input: unknown) {
    const request = validateSetupRequest(input);
    const plan = structuredClone(await this.sources.loadReviewedPlan(
      request.planId));
    if (!plan) setupUnavailable();
    validateSetupPlan(plan);
    if (plan.planId !== request.planId || setupHash(plan) !==
      request.planSha256 ||
        setupHash(plan.scope) !== setupHash(this.sources.scope) ||
        plan.sourceSha !== this.sources.sourceSha ||
        !this.sources.authorizeApply) setupUnavailable();
    await this.sources.authorizeApply(request.planSha256);
    return {plan, request};
  }
  async apply(input: unknown): Promise<{state: string}> {
    const {plan, request} = await this.reviewed(input);
    const initial = await this.sources.snapshot();
    assertPlannedSetupIdentity(plan, initial, this.sources.now());
    let operation = await this.journal.reserve(plan, request);
    for (let step = 0; step < 12; step++) {
      const phase = operation.phase;
      if (["complete", "publish-intent", "published", "readiness-intent",
        "ready", "revoke-intent", "revoked"].includes(phase)) {
        await this.journal.assertComplete(plan);
        return {state: phase};
      }
      if (this.sources.now() >= plan.expiresAtMillis) setupUnavailable();
      const snapshot = await this.sources.snapshot();
      assertPlannedSetupIdentity(plan, snapshot, this.sources.now());
      const claimsHash = setupHash(snapshot.actor.claims);
      if (phase === "reserved") {
        if (claimsHash !== plan.beforeClaimsSha256 ||
            snapshot.existingOwnerUids.length || snapshot.authorityExists ||
            !setupAssignmentMatches(plan, snapshot)) {
          setupUnavailable();
        }
        const won = await this.journal.advance(plan, request,
          "reserved", "auth-intent");
        if (won) {
          // Re-read after winning the intent; never overwrite observed drift.
          const latest = await this.sources.snapshot();
          assertPlannedSetupIdentity(plan, latest, this.sources.now());
          if (setupHash(latest.actor.claims) !== plan.beforeClaimsSha256 ||
              latest.existingOwnerUids.length || latest.authorityExists ||
              !setupAssignmentMatches(plan, latest)) {
            setupUnavailable();
          }
          try {
            await this.sources.setActorClaims(desiredOperatorClaims(
              latest.actor.claims), request);
          } catch {
            return {state: "reconciliation-required"};
          }
        }
      } else if (phase === "auth-intent") {
        if (claimsHash === plan.beforeClaimsSha256) {
          return {state: "reconciliation-required"};
        }
        if (claimsHash !== plan.desiredClaimsSha256) setupUnavailable();
        await this.journal.advance(plan, request, "auth-intent",
          "auth-confirmed");
      } else {
        if (claimsHash !== plan.desiredClaimsSha256 ||
            !snapshot.actor.auth.relevantRoles.includes("adminOwner")) {
          setupUnavailable();
        }
        if (phase === "auth-confirmed") {
          await this.journal.seed(plan, request);
        } else if (phase === "seeded") {
          const state = await this.journal.activateRoot(plan, request);
          if (state === "fresh-sign-in-required") return {state};
        } else if (phase === "root-active") {
          if (await this.journal.advance(plan, request,
            "root-active", "prepare-intent")) {
            try {
              await this.journal.prepareReceive(plan, request);
            } catch {
              return {state: "reconciliation-required"};
            }
          }
        } else if (phase === "prepare-intent" &&
            isConsolidatedOperator(plan.scope)) {
          await this.journal.prepareReceive(plan, request);
        } else if (phase === "prepare-intent") {
          const target = await this.journal.recipient(plan);
          if (target.state === "denied" && target.revision === 1) {
            return {state: "reconciliation-required"};
          }
          if (target.state !== "granting" || target.revision !== 2 ||
              target.pending?.nonce !== plan.grantNonce ||
              target.pending.issuer.uid !== plan.scope.actorUid ||
              target.pending.issuer.revision !== 2 ||
              setupHash(target.pending.capabilities) !==
                setupHash(["receive"]) ||
              target.pending.endpointHash !== plan.scope.endpointHash ||
              target.pending.expiresAtMillis !== plan.expiresAtMillis) {
            setupUnavailable();
          }
          await this.journal.advance(plan, request, "prepare-intent",
            "prepared");
        } else if (phase === "prepared") {
          if (await this.journal.advance(plan, request,
            "prepared", "finalize-intent")) {
            try {
              await this.journal.finalizeReceive(plan, request);
            } catch {
              return {state: "reconciliation-required"};
            }
          }
        } else if (phase === "finalize-intent" &&
            isConsolidatedOperator(plan.scope)) {
          await this.journal.finalizeReceive(plan, request);
        } else if (phase === "finalize-intent") {
          const target = await this.journal.recipient(plan);
          if (!isConsolidatedOperator(plan.scope) &&
              target.state === "granting" && target.revision === 2) {
            return {state: "reconciliation-required"};
          }
          await this.journal.assertComplete(plan);
          await this.journal.advance(plan, request, "finalize-intent",
            "complete");
        } else setupUnavailable();
      }
      operation = await this.journal.read(plan, request);
    }
    setupUnavailable();
  }
  async readiness(input: unknown, action: "publish" | "apply" | "revoke"):
  Promise<{state: string}> {
    const {plan, request} = await this.reviewed(input);
    if (!this.sources.readiness) setupUnavailable();
    await this.journal.assertComplete(plan, action !== "revoke");
    const phase = (await this.journal.read(plan, request)).phase;
    const transitions = {
      publish: ["complete", "publish-intent", "published"],
      apply: ["published", "readiness-intent", "ready"],
      revoke: ["ready", "revoke-intent", "revoked"],
    } as const;
    const [from, intent, done] = transitions[action];
    const reference = action === "revoke" ? plan.revokeReviewRef :
      plan.createReviewRef;
    if (phase === done) {
      if (!await this.sources.readiness.reconcile(reference, action, request)) {
        setupUnavailable();
      }
      return {state: done};
    }
    if (phase !== from && phase !== intent) setupUnavailable();
    if (phase === from && await this.journal.advance(plan, request, from,
      intent)) {
      try {
        if (action === "publish") {
          await this.sources.readiness.publish(reference, request);
        } else await this.sources.readiness.apply(reference, request);
      } catch {
        return {state: "reconciliation-required"};
      }
    }
    let reconciled = await this.sources.readiness.reconcile(reference,
      action, request);
    if (!reconciled && phase === intent && action === "revoke" &&
        this.sources.readiness.resumeRevoke) {
      try {
        await this.sources.readiness.resumeRevoke(reference, request);
      } catch {
        return {state: "reconciliation-required"};
      }
      reconciled = await this.sources.readiness.reconcile(reference,
        action, request);
    }
    if (!reconciled) return {state: "reconciliation-required"};
    await this.journal.advance(plan, request, intent, done);
    return {state: done};
  }
}
