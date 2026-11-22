import {validateCatchWhatsappOperatorSetupOperationDocument} from
  "../shared/generated/validators/catchWhatsappOperatorSetupOperationDocument";
import {validateCatchWhatsappOperatorSetupAuditDocument} from
  "../shared/generated/validators/catchWhatsappOperatorSetupAuditDocument";
import {Timestamp} from "firebase-admin/firestore";
import {createAdminAuditLogInTransaction} from "../platform/adminAudit";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {authorizeCatchAppCapability, denyCatchAppAuthority,
  readCatchAppAuthority} from "./whatsappAppAuthority";
import type {CatchAppAuthority} from "./whatsappAppAuthority";
import {CATCH_APP_AUTHORITIES, CatchAppAuthorityStore} from
  "./whatsappAppAuthorityStore";
import type {CatchAuditedAuthFence, CatchFreshAuthContext} from
  "./whatsappAppAuthorityStore";
import {assertPlannedSetupIdentity, setupExact, setupHash, setupUnavailable,
  validateSetupPlan, validateSetupRequest, isConsolidatedOperator,
  setupAssignmentMatches, operatorRootCapabilities} from
  "./whatsappOperatorSetup";
import type {OperatorSetupJournal, OperatorSetupOperation, OperatorSetupPhase,
  OperatorSetupPlan, OperatorSetupRequest, OperatorSetupSources} from
  "./whatsappOperatorSetup";

export const OPERATOR_SETUP_OPERATIONS = "catchWhatsappOperatorSetupOperations";
export const OPERATOR_SETUP_AUDITS = "catchWhatsappOperatorSetupAudits";
const phases: OperatorSetupPhase[] = ["reserved", "auth-intent",
  "auth-confirmed", "seeded", "root-active", "prepare-intent", "prepared",
  "finalize-intent", "complete", "publish-intent", "published",
  "readiness-intent", "ready", "revoke-intent", "revoked"];
/** Permanent slot is project-bound, never plan-bound. No reset/delete/TTL. */
export function readOperatorSetupOperation(value: unknown,
  plan: OperatorSetupPlan,
  request: OperatorSetupRequest): OperatorSetupOperation {
  validateSetupRequest(request);
  setupExact(value, ["schemaVersion", "operationId", "projectId", "planId",
    "planSha256", "replaySha256", "scopeSha256", "actorUid", "recipientUid",
    "phase", "revision", "updatedAtMillis"]);
  if (!validateCatchWhatsappOperatorSetupOperationDocument(value)) {
    setupUnavailable();
  }
  const r = value;
  if (r.schemaVersion !== 1 || r.operationId !== plan.scope.projectId ||
      r.projectId !== plan.scope.projectId || r.planId !== plan.planId ||
      r.planSha256 !== setupHash(plan) ||
      r.planSha256 !== request.planSha256 || request.planId !== plan.planId ||
      r.replaySha256 !== setupHash(request.replayKey) ||
      r.scopeSha256 !== setupHash(plan.scope) ||
      r.actorUid !== plan.scope.actorUid ||
      r.recipientUid !== plan.scope.recipientUid ||
      !phases.includes(r.phase) || !Number.isSafeInteger(r.revision) ||
      r.revision !== phases.indexOf(r.phase) + 1 ||
      !Number.isSafeInteger(r.updatedAtMillis) ||
      r.updatedAtMillis < plan.createdAtMillis) setupUnavailable();
  return structuredClone(r);
}
/** Create-only phase receipt, in the transaction that performs the effect. */
export function commitOperatorSetupPhase(tx: Transaction, db: Firestore,
  plan: OperatorSetupPlan, before: OperatorSetupOperation | null,
  after: OperatorSetupOperation, effectSha256: string | null = null) {
  if (after.projectId !== plan.scope.projectId ||
      after.planSha256 !== setupHash(plan) ||
      (before && (phases.indexOf(after.phase) !==
        phases.indexOf(before.phase) + 1 || after.revision !==
          before.revision + 1 ||
        after.updatedAtMillis < before.updatedAtMillis))) setupUnavailable();
  const auditId = `${plan.scope.projectId}_${after.revision}`;
  const audit = {
    schemaVersion: 1, receiptKind: "phase", auditId,
    operationId: after.operationId,
    projectId: after.projectId, actorUid: after.actorUid,
    planSha256: after.planSha256, scopeSha256: after.scopeSha256,
    fromPhase: before?.phase ?? null, toPhase: after.phase,
    revision: after.revision, atMillis: after.updatedAtMillis,
    beforeSha256: before ? setupHash(before) : null,
    afterSha256: setupHash(after), effectSha256,
  };
  if (!validateCatchWhatsappOperatorSetupAuditDocument(audit)) {
    setupUnavailable();
  }
  tx.create(db.collection(OPERATOR_SETUP_AUDITS).doc(auditId), audit);
  const ref = db.collection(OPERATOR_SETUP_OPERATIONS).doc(
    plan.scope.projectId);
  if (before) tx.update(ref, {...after});
  else tx.create(ref, {...after});
}
/** Preconditions in the same transaction around the existing store. */
export function operatorBoundAuthorityStore(store: CatchAppAuthorityStore,
  sources: OperatorSetupSources, plan: OperatorSetupPlan,
  recipientRevision: 1 | 2 | 3) {
  return new class extends CatchAppAuthorityStore {
    override async principal(...args:
      Parameters<CatchAppAuthorityStore["principal"]>) {
      const principal = await super.principal(...args);
      const record = readCatchAppAuthority(principal.record);
      if (record.uid === plan.scope.actorUid) {
        const actor = await sources.actor();
        if (record.revision !== 2 || record.state !== "active" ||
            record.grantedBy !== null ||
            (isConsolidatedOperator(plan.scope) &&
              record.endpointHash !== plan.scope.endpointHash) ||
            setupHash(record.capabilities) !==
              setupHash(operatorRootCapabilities(plan.scope)) ||
            record.incarnation !== setupHash(["catch.firebase-creation/v1",
              plan.scope.projectId, plan.scope.actorUid,
              plan.actorCreationTimeMillis]) ||
            actor.emailSha256 !== plan.scope.actorEmailSha256 ||
            actor.googleSubjectSha256 !== plan.googleSubjectSha256 ||
            setupHash(actor.claims) !== plan.desiredClaimsSha256) {
          setupUnavailable();
        }
      } else if (record.uid === plan.scope.recipientUid) {
        if (record.revision !== recipientRevision ||
            record.state !== (recipientRevision === 1 ? "denied" :
              recipientRevision === 2 ? "granting" : "active") ||
            (recipientRevision === 2 && (record.pending?.nonce !==
              plan.grantNonce ||
              record.pending.issuer.revision !== 2 ||
              record.pending.issuer.uid !== plan.scope.actorUid ||
              record.pending.endpointHash !== plan.scope.endpointHash ||
              record.pending.expiresAtMillis !== plan.expiresAtMillis ||
              setupHash(record.pending.capabilities) !==
                setupHash(["receive"]))) ||
            (recipientRevision === 3 &&
              (setupHash(record.capabilities) !== setupHash(["receive"]) ||
                record.endpointHash !== plan.scope.endpointHash ||
                record.grantedBy?.revision !== 2 ||
                record.grantedBy.uid !==
                  plan.scope.actorUid))) setupUnavailable();
      } else setupUnavailable();
      return principal;
    }
  }(store.db, store.deps);
}

/** Concrete journal/CAS adapter. All transactions are single-attempt; an
 * unknown commit is reconciled from the durable phase, never blindly retried.
 * Fresh Auth observations have the same documented out-of-band race as the
 * existing store. Constructor/import performs no I/O or app initialization. */
export class FirestoreOperatorSetupJournal implements OperatorSetupJournal {
  constructor(readonly db: Firestore, readonly store: CatchAppAuthorityStore,
    readonly sources: OperatorSetupSources,
    readonly actorIdToken: () => Promise<string>) {}
  private identity(plan: OperatorSetupPlan) {
    validateSetupPlan(plan);
    if (this.store.db !== this.db || this.db.databaseId !== "(default)" ||
        Reflect.get(this.db, "projectId") !== plan.scope.projectId ||
        this.store.deps.projectId !== plan.scope.projectId ||
        setupHash(this.sources.scope) !== setupHash(plan.scope) ||
        this.sources.sourceSha !== plan.sourceSha) setupUnavailable();
  }
  private ref(plan: OperatorSetupPlan) {
    return this.db.collection(OPERATOR_SETUP_OPERATIONS)
      .doc(plan.scope.projectId);
  }
  private async fenced<T>(plan: OperatorSetupPlan, callback:
    (tx: Transaction, fence: CatchAuditedAuthFence) => Promise<T>,
  includeRecipient = true): Promise<T> {
    this.identity(plan);
    if (!this.sources.authorizeApply) setupUnavailable();
    await this.sources.authorizeApply(setupHash(plan));
    return this.store.runFenced(includeRecipient ?
      [plan.scope.actorUid, plan.scope.recipientUid] : [plan.scope.actorUid],
    callback, {uid: plan.scope.actorUid, idToken: await this.actorIdToken()});
  }
  private async current(plan: OperatorSetupPlan, fence: CatchAuditedAuthFence) {
    const s = await this.sources.snapshot();
    assertPlannedSetupIdentity(plan, s, this.sources.now());
    if (setupHash(s.actor.claims) !== plan.desiredClaimsSha256 ||
        !s.actor.auth.relevantRoles.includes("adminOwner")) setupUnavailable();
    if ("recheck" in fence) {
      await (fence as CatchFreshAuthContext).recheck();
    }
    return s;
  }
  private write(tx: Transaction, plan: OperatorSetupPlan,
    before: OperatorSetupOperation | null, after: OperatorSetupOperation,
    effectSha256: string | null = null) {
    commitOperatorSetupPhase(tx, this.db, plan, before, after, effectSha256);
  }
  private next(before: OperatorSetupOperation, phase: OperatorSetupPhase) {
    if (phases.indexOf(phase) !== phases.indexOf(before.phase) + 1 ||
        this.sources.now() < before.updatedAtMillis) setupUnavailable();
    return {...before, phase, revision: before.revision + 1,
      updatedAtMillis: this.sources.now()};
  }
  async reserve(plan: OperatorSetupPlan, request: OperatorSetupRequest) {
    return this.fenced(plan, async (tx) => {
      const snap = await tx.get(this.ref(plan));
      if (snap.exists) {
        return readOperatorSetupOperation(snap.data(), plan, request);
      }
      const [authorities, assignments, actorAssignment] = await Promise.all([
        tx.get(this.db.collection(CATCH_APP_AUTHORITIES).limit(1)),
        tx.get(this.db.collection("adminRoleAssignments")
          .where("roles", "array-contains", "adminOwner").limit(1)),
        tx.get(this.db.collection("adminRoleAssignments").doc(
          plan.scope.actorUid)),
      ]);
      const current = await this.sources.snapshot();
      assertPlannedSetupIdentity(plan, current, this.sources.now());
      if (!authorities.empty || !assignments.empty ||
          !setupAssignmentMatches(plan, {actorAssignmentExists:
            actorAssignment.exists, actorAssignment: actorAssignment.data()}) ||
          current.existingOwnerUids.length || current.authorityExists ||
          setupHash(current.actor.claims) !== plan.beforeClaimsSha256 ||
          this.sources.now() >= plan.expiresAtMillis) setupUnavailable();
      const r: OperatorSetupOperation = {schemaVersion: 1,
        operationId: plan.scope.projectId, projectId: plan.scope.projectId,
        planId: plan.planId, planSha256: request.planSha256,
        replaySha256: setupHash(request.replayKey),
        scopeSha256: setupHash(plan.scope), actorUid: plan.scope.actorUid,
        recipientUid: plan.scope.recipientUid, phase: "reserved", revision: 1,
        updatedAtMillis: this.sources.now()};
      readOperatorSetupOperation(r, plan, request);
      this.write(tx, plan, null, r);
      return r;
    });
  }
  async read(plan: OperatorSetupPlan, request: OperatorSetupRequest) {
    this.identity(plan);
    return readOperatorSetupOperation((await this.ref(plan).get()).data(),
      plan, request);
  }
  async advance(plan: OperatorSetupPlan, request: OperatorSetupRequest,
    from: OperatorSetupPhase, to: OperatorSetupPhase) {
    return this.fenced(plan, async (tx) => {
      const before = readOperatorSetupOperation(
        (await tx.get(this.ref(plan))).data(), plan, request);
      if (before.phase !== from) return false;
      this.write(tx, plan, before, this.next(before, to));
      return true;
    }, to !== "revoke-intent" && to !== "revoked");
  }
  async seed(plan: OperatorSetupPlan, request: OperatorSetupRequest) {
    await this.fenced(plan, async (tx, fence) => {
      const before = readOperatorSetupOperation(
        (await tx.get(this.ref(plan))).data(), plan, request);
      if (before.phase !== "auth-confirmed") return;
      const actorRef = this.db.collection(CATCH_APP_AUTHORITIES)
        .doc(plan.scope.actorUid);
      const recipientRef = this.db.collection(CATCH_APP_AUTHORITIES)
        .doc(plan.scope.recipientUid);
      const assignmentRef = this.db.collection("adminRoleAssignments")
        .doc(plan.scope.actorUid);
      const [actor, recipient, assignment, owners] = await Promise.all([
        tx.get(actorRef), tx.get(recipientRef), tx.get(assignmentRef),
        tx.get(this.db.collection(CATCH_APP_AUTHORITIES).limit(1)),
      ]);
      if (actor.exists || recipient.exists ||
          !setupAssignmentMatches(plan, {actorAssignmentExists:
            assignment.exists, actorAssignment: assignment.data()}) ||
        !owners.empty) {
        setupUnavailable();
      }
      await this.current(plan, fence);
      const at = this.sources.now();
      const seed = (uid: string) => denyCatchAppAuthority(null,
        {projectId: plan.scope.projectId, uid}, 0, at);
      tx.create(actorRef, {...seed(plan.scope.actorUid)});
      if (!isConsolidatedOperator(plan.scope)) {
        tx.create(recipientRef, {...seed(plan.scope.recipientUid)});
      }
      if (isConsolidatedOperator(plan.scope)) {
        tx.update(assignmentRef, {roles: ["admin", "adminOwner"],
          updatedAt: Timestamp.fromMillis(at),
          updatedByUid: plan.scope.actorUid});
      } else {
        tx.create(assignmentRef, {targetUid: plan.scope.actorUid, email: null,
          displayName: null, disabled: false, roles: ["adminOwner"],
          status: "active", updatedAt: Timestamp.fromMillis(at),
          updatedByUid: plan.scope.actorUid});
      }
      createAdminAuditLogInTransaction(tx, this.db,
        {uid: plan.scope.actorUid, roles: ["adminOwner"]}, {
          action: "catchWhatsappOperatorBootstrap",
          targetPath: assignmentRef.path,
          before: {claimsSha256: plan.beforeClaimsSha256},
          after: {claimsSha256: plan.desiredClaimsSha256},
          note: "Exact reviewed one-time operator setup; source receipt bound.",
        }, {docId: `catch_operator_bootstrap_${plan.scope.projectId}`});
      this.write(tx, plan, before, this.next(before, "seeded"), setupHash([
        seed(plan.scope.actorUid), seed(plan.scope.recipientUid)]));
    });
  }
  async activateRoot(plan: OperatorSetupPlan, request: OperatorSetupRequest):
  Promise<"fresh-sign-in-required" | "active"> {
    return this.fenced(plan, async (tx, fence) => {
      const before = readOperatorSetupOperation(
        (await tx.get(this.ref(plan))).data(), plan, request);
      if (before.phase !== "seeded") setupUnavailable();
      const actorRef = this.db.collection(CATCH_APP_AUTHORITIES)
        .doc(plan.scope.actorUid);
      const targetRef = this.db.collection(CATCH_APP_AUTHORITIES)
        .doc(plan.scope.recipientUid);
      const [actor, target] = await Promise.all([
        tx.get(actorRef), tx.get(targetRef),
      ]);
      const seed = (uid: string) => denyCatchAppAuthority(null,
        {projectId: plan.scope.projectId, uid}, 0, before.updatedAtMillis);
      if (setupHash(actor.data()) !== setupHash(seed(plan.scope.actorUid)) ||
          setupHash(target.data()) !==
            setupHash(seed(plan.scope.recipientUid))) {
        setupUnavailable();
      }
      const current = await this.current(plan, fence);
      const denied = readCatchAppAuthority(actor.data());
      if (current.actor.session.authTimeSeconds < denied.authNotBeforeSeconds) {
        return "fresh-sign-in-required";
      }
      const root: CatchAppAuthority = {...denied, state: "active", revision: 2,
        incarnation: setupHash(["catch.firebase-creation/v1",
          plan.scope.projectId, plan.scope.actorUid,
          plan.actorCreationTimeMillis]), updatedAtMillis: this.sources.now(),
        capabilities: isConsolidatedOperator(plan.scope) ?
          operatorRootCapabilities(plan.scope) : ["review", "reply"],
        endpointHash: isConsolidatedOperator(plan.scope) ?
          plan.scope.endpointHash : null};
      for (const capability of ["review", "reply"] as const) {
        authorizeCatchAppCapability({record: root, auth: current.actor.auth,
          session: current.actor.session}, capability, this.sources.now(),
        {projectId: plan.scope.projectId, uid: plan.scope.actorUid});
      }
      if (isConsolidatedOperator(plan.scope)) {
        authorizeCatchAppCapability({record: root,
          auth: current.recipient.auth},
        "receive", this.sources.now(), {projectId: plan.scope.projectId,
          uid: plan.scope.recipientUid,
          endpointHash: plan.scope.endpointHash});
      }
      tx.update(actorRef, {...root});
      this.write(tx, plan, before, this.next(before, "root-active"),
        setupHash(root));
      return "active";
    });
  }
  async recipient(plan: OperatorSetupPlan) {
    return this.fenced(plan, async (tx, fence) => {
      const p = await this.store.principal(tx, fence,
        plan.scope.recipientUid, "none");
      return readCatchAppAuthority(p.record);
    });
  }
  private async grantStore(plan: OperatorSetupPlan,
    request: OperatorSetupRequest,
    from: "prepare-intent" | "finalize-intent", to: "prepared" | "complete") {
    this.identity(plan);
    if (!this.sources.authorizeApply) setupUnavailable();
    await this.sources.authorizeApply(setupHash(plan));
    const bound = operatorBoundAuthorityStore(this.store, this.sources, plan,
      from === "prepare-intent" ? 1 : 2);
    const original = bound.runFenced.bind(bound);
    bound.runFenced = (uids, callback, actor) => original(uids, async (tx,
      fence) => {
      const before = readOperatorSetupOperation(
        (await tx.get(this.ref(plan))).data(), plan, request);
      if (before.phase !== from) setupUnavailable();
      await this.current(plan, fence);
      const result = await callback(tx, fence);
      this.write(tx, plan, before, {...before, phase: to,
        revision: before.revision + 1, updatedAtMillis: this.sources.now()},
      setupHash(result));
      return result;
    }, actor);
    return bound;
  }
  /** Self-receive is activated with the root, never by granting to oneself.
   * Retain the phase chain and exact effect hashes, with current authority and
   * each receipt committed in the same transaction. */
  private async confirmConsolidatedReceive(plan: OperatorSetupPlan,
    request: OperatorSetupRequest, from: "prepare-intent" | "finalize-intent",
    to: "prepared" | "complete") {
    await this.fenced(plan, async (tx, fence) => {
      const before = readOperatorSetupOperation(
        (await tx.get(this.ref(plan))).data(), plan, request);
      if (before.phase !== from) setupUnavailable();
      const root = await tx.get(this.db.collection(CATCH_APP_AUTHORITIES)
        .doc(plan.scope.actorUid));
      const bound = operatorBoundAuthorityStore(this.store, this.sources,
        plan, 3);
      await bound.readinessBindings(tx, fence, {
        reviewerUid: plan.scope.actorUid,
        recipientUid: plan.scope.recipientUid,
        endpointHash: plan.scope.endpointHash});
      await this.current(plan, fence);
      this.write(tx, plan, before, this.next(before, to),
        setupHash(root.data()));
    });
  }
  async prepareReceive(plan: OperatorSetupPlan, request: OperatorSetupRequest) {
    if (isConsolidatedOperator(plan.scope)) {
      await this.confirmConsolidatedReceive(plan, request,
        "prepare-intent", "prepared");
      return;
    }
    const store = await this.grantStore(plan, request, "prepare-intent",
      "prepared");
    await store.prepare(plan.scope.actorUid, await this.actorIdToken(),
      plan.scope.recipientUid, {expectedRevision: 1, nonce: plan.grantNonce,
        capabilities: ["receive"], endpointHash: plan.scope.endpointHash,
        expiresAtMillis: plan.expiresAtMillis});
  }
  async finalizeReceive(plan: OperatorSetupPlan,
    request: OperatorSetupRequest) {
    if (isConsolidatedOperator(plan.scope)) {
      await this.confirmConsolidatedReceive(plan, request,
        "finalize-intent", "complete");
      return;
    }
    const store = await this.grantStore(plan, request, "finalize-intent",
      "complete");
    await store.finalize(plan.scope.actorUid, await this.actorIdToken(),
      plan.scope.recipientUid, {expectedRevision: 2, nonce: plan.grantNonce});
  }
  async assertComplete(plan: OperatorSetupPlan, includeRecipient = true) {
    await this.fenced(plan, async (tx, fence) => {
      const actor = await this.store.principal(tx, fence,
        plan.scope.actorUid, "protected");
      const root = readCatchAppAuthority(actor.record);
      const current = await this.sources.actor();
      if (root.revision !== 2 || root.grantedBy !== null ||
          setupHash(root.capabilities) !==
            setupHash(operatorRootCapabilities(plan.scope)) ||
          current.emailSha256 !== plan.scope.actorEmailSha256 ||
          current.googleSubjectSha256 !== plan.googleSubjectSha256 ||
          setupHash(current.claims) !== plan.desiredClaimsSha256) {
        setupUnavailable();
      }
      const binding = authorizeCatchAppCapability(actor, "review",
        this.sources.now(), {projectId: plan.scope.projectId,
          uid: plan.scope.actorUid});
      if (includeRecipient) {
        const recipient = await this.store.principal(tx, fence,
          plan.scope.recipientUid, "none");
        const target = readCatchAppAuthority(recipient.record);
        if (isConsolidatedOperator(plan.scope) ?
          setupHash(target) !== setupHash(root) :
          (target.revision !== 3 ||
            setupHash(target.capabilities) !== setupHash(["receive"]) ||
            setupHash(target.grantedBy) !== setupHash(binding))) {
          setupUnavailable();
        }
        authorizeCatchAppCapability(recipient, "receive", this.sources.now(),
          {projectId: plan.scope.projectId, uid: plan.scope.recipientUid,
            endpointHash: plan.scope.endpointHash});
      }
      if ("recheck" in fence) {
        await (fence as CatchFreshAuthContext).recheck();
      }
    }, includeRecipient);
  }
}
