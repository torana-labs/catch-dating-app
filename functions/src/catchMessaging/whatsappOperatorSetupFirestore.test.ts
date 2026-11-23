import {validateCatchWhatsappOperatorSetupOperationDocument} from
  "../shared/generated/validators/catchWhatsappOperatorSetupOperationDocument";
import {validateCatchWhatsappOperatorSetupAuditDocument} from
  "../shared/generated/validators/catchWhatsappOperatorSetupAuditDocument";
import assert from "node:assert/strict";
import {test} from "node:test";
import {createHash} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import {CatchAppAuthorityStore, withCatchFreshAuthContext} from
  "./whatsappAppAuthorityStore";
import {CatchWhatsappOperatorSetup, planOperatorSetup, setupHash} from
  "./whatsappOperatorSetup";
import type {OperatorSetupPlan, OperatorSetupSources,
  OperatorSetupSnapshot} from
  "./whatsappOperatorSetup";
import {FirestoreOperatorSetupJournal, OPERATOR_SETUP_OPERATIONS,
  OPERATOR_SETUP_AUDITS} from "./whatsappOperatorSetupFirestore";
import {createOperatorReadinessAdapters} from "./whatsappOperatorSetupSources";
import {catchReadinessEvidenceDecisionDigest} from
  "./whatsappReadinessEvidence";
import {catchReadinessIngressId, catchReadinessPublicationDigest} from
  "./whatsappReadinessFirestore";
import {catchReadinessRecordDigest} from "./whatsappReadinessProvisioning";
import type {ReadinessApproval} from "./whatsappReadinessProvisioning";
import type {CatchWhatsappReadinessApprovalDocument} from
  "../shared/generated/catchWhatsappReadinessApprovalDocument";
import type {CatchWhatsappReplyReadinessDocument} from
  "../shared/generated/catchWhatsappReplyReadinessDocument";

type Data = Record<string, unknown>;
type Ref = {path: string; id: string; get: () => Promise<unknown>;
  collection: (name: string) => {doc: (id: string) => Ref}};
/** Synthetic serialized atomic store. Enforces create-only, read-before-write,
 * single SDK attempt and simulates a lost response AFTER the actual commit. */
class TestDb {
  projectId = "demo-catch-setup";
  databaseId = "(default)";
  records = new Map<string, Data>();
  afterCommit?: (writes: Map<string, Data>) => void;
  private tail: Promise<unknown> = Promise.resolve();
  ref(path: string): Ref {
    return {path, id: path.split("/").at(-1)!,
      get: async () => this.snapshot(path),
      collection: (name: string) => this.collection(`${path}/${name}`)};
  }
  snapshot(path: string) {
    const value = this.records.get(path);
    return {id: path.split("/").at(-1), exists: value !== undefined,
      data: () => value && structuredClone(value)};
  }
  collection(name: string) {
    return {...this.query(name),
      doc: (id: string) => this.ref(`${name}/${id}`)};
  }
  query(name: string, filters: Array<[string, string, unknown]> = [],
    limit = 100) {
    return {where: (key: string, operator: string, value: unknown) =>
      this.query(name, [...filters, [key, operator, value]], limit),
    limit: (count: number) => this.query(name, filters, count),
    get: async () => {
      const docs = [...this.records].filter(([path, value]) =>
        path.startsWith(name + "/") && filters.every(([key, op, expected]) =>
          op === "array-contains" ? Array.isArray(value[key]) &&
            (value[key] as unknown[]).includes(expected) : value[key] ===
              expected))
        .slice(0, limit).map(([path]) => this.snapshot(path));
      return {docs, empty: docs.length === 0};
    }};
  }
  async runTransaction<T>(callback: (tx: {
    get: (ref: Ref) => Promise<unknown>;
    create: (ref: Ref, value: Data) => void;
    update: (ref: Ref, value: Data) => void;
  }) => Promise<T>, options: {maxAttempts: number}): Promise<T> {
    assert.equal(options.maxAttempts, 1);
    const pending = this.tail.then(async () => {
      const writes = new Map<string, Data>();
      const result = await callback({get: async (ref) => {
        assert.equal(writes.size, 0, "reads precede every write");
        return ref.get();
      }, create: (ref, value) => {
        assert.ok(!this.records.has(ref.path) && !writes.has(ref.path));
        writes.set(ref.path, {...value});
      }, update: (ref, value) => {
        assert.ok(this.records.has(ref.path));
        writes.set(ref.path, {...this.records.get(ref.path), ...value});
      }});
      for (const [path, value] of writes) this.records.set(path, value);
      this.afterCommit?.(writes);
      return result;
    });
    this.tail = pending.catch(() => undefined);
    return pending;
  }
}
function fixture(consolidated = false) {
  let now = 1800000000000;
  let authTime = now / 1000 - 1;
  let claims: Data = consolidated ? {admin: true} :
    {tenantLabel: "synthetic", nested: {flag: true}};
  let setterCalls = 0;
  let setterMode: "normal" | "throw-before" | "commit-then-throw" = "normal";
  let recipientEndpoint = "b".repeat(64);
  let actorDisabled = false;
  let recipientCreation = 1001;
  const memory = new TestDb();
  const db = memory as unknown as Firestore;
  const scope = {projectId: memory.projectId, actorUid: "operator",
    actorEmailSha256: "a".repeat(64),
    recipientUid: consolidated ? "operator" : "recipient",
    endpointHash: recipientEndpoint, appId: "10001", wabaId: "10002",
    phoneNumberId: "10003", credentialVersionSha256: "c".repeat(64)};
  if (consolidated) {
    memory.records.set("adminRoleAssignments/operator", {
      targetUid: "operator", disabled: false,
      status: "active", roles: ["admin"],
      displayName: "Preserved operator", email: "operator@example.test",
    });
  }
  const observation = (uid: string) => ({projectId: scope.projectId, uid,
    creationTimeMillis: uid === scope.recipientUid ? recipientCreation : 1001,
    observedAtMillis: now, disabled: uid === "operator" && actorDisabled,
    relevantRoles: uid === "operator" && claims.adminOwner === true ?
      ["adminOwner" as const] : [],
    endpointHash: uid === scope.recipientUid ? recipientEndpoint : null,
    tokensValidAfterMillis: 0});
  const session = () => ({projectId: scope.projectId, uid: "operator",
    authTimeSeconds: authTime, expiresAtSeconds: now / 1000 + 1800});
  const actor = async () => ({auth: observation("operator"), session: session(),
    emailSha256: scope.actorEmailSha256, googleSubjectSha256: "d".repeat(64),
    claims: structuredClone(claims)});
  let plan: OperatorSetupPlan;
  const sources: OperatorSetupSources = {scope, sourceSha: "e".repeat(40),
    now: () => now, actor,
    snapshot: async (): Promise<OperatorSetupSnapshot> => (
      {actor: await actor(),
        recipient: {auth: observation(scope.recipientUid),
          claims: consolidated ? structuredClone(claims) : {}},
        existingOwnerUids: claims.adminOwner === true ? ["operator"] : [],
        authorityExists: [...memory.records.keys()].some((path) =>
          path.startsWith("catchWhatsappAppAuthorities/")),
        bootstrapExists: memory.records.has(OPERATOR_SETUP_OPERATIONS + "/" +
        scope.projectId), actorAssignmentExists:
          memory.records.has("adminRoleAssignments/operator"),
        ...(consolidated ? {actorAssignment:
          memory.records.get("adminRoleAssignments/operator")} : {})}),
    loadReviewedPlan: async (id) => id === plan.planId ? structuredClone(plan) :
      null,
    authorizeApply: async (digest) => assert.equal(digest, setupHash(plan)),
    setActorClaims: async (next) => {
      setterCalls++;
      if (setterMode === "throw-before") throw new Error("synthetic private");
      claims = structuredClone(next);
      if (setterMode === "commit-then-throw") {
        throw new Error("synthetic lost successful response");
      }
    },
  };
  const firebase = {observe: async (uid: string) => observation(uid),
    verifySession: async (uid: string, token: string) => {
      assert.equal(uid, "operator");
      assert.equal(token, "synthetic-google-token");
      return session();
    }};
  const store = new CatchAppAuthorityStore(db, {projectId: scope.projectId,
    now: () => now, firebase,
    withAuditedAuthFence: async () => {
      throw new Error("no external issuer");
    },
    withFreshAuthContext: (identity, callback) =>
      withCatchFreshAuthContext(firebase, identity, callback, () => now)});
  const journal = new FirestoreOperatorSetupJournal(db, store, sources,
    async () => "synthetic-google-token");
  const engine = new CatchWhatsappOperatorSetup(sources, journal);
  const initialize = async () => {
    plan = planOperatorSetup(scope, await sources.snapshot(),
      {planId: "reviewed-plan", sourceSha: sources.sourceSha, now,
        grantNonce: "f".repeat(64), createReviewRef: "review-create",
        revokeReviewRef: "review-revoke"});
  };
  const request = () => ({planId: plan.planId, planSha256: setupHash(plan),
    replayKey: "1".repeat(64)});
  return {memory, db, sources, store, journal, engine, initialize, request,
    plan: () => plan, setters: () => setterCalls,
    claims: () => structuredClone(claims),
    changeClaims: (value: Data) => {
      claims = value;
    },
    setterMode: (value: typeof setterMode) => {
      setterMode = value;
    },
    changePhone: () => {
      recipientEndpoint = "9".repeat(64);
    },
    recreateRecipient: () => {
      recipientCreation++;
    },
    disableActor: () => {
      actorDisabled = true;
    },
    signIn: () => {
      now += 2000; authTime = now / 1000;
    }};
}
test("concrete bootstrap journals " +
  "role/seed/root/receive and requires new sign-in",
async () => {
  const f = fixture();
  await f.initialize();
  assert.equal(f.memory.records.size, 0);
  assert.deepEqual(await f.engine.apply(f.request()),
    {state: "fresh-sign-in-required"});
  assert.equal(f.setters(), 1);
  assert.deepEqual(f.claims(), {tenantLabel: "synthetic",
    nested: {flag: true},
    adminOwner: true});
  assert.deepEqual(f.memory.records.get("adminRoleAssignments/operator")
    ?.roles, ["adminOwner"]);
  assert.ok(f.memory.records.has(
    "adminAuditLogs/catch_operator_bootstrap_demo-catch-setup"));
  f.signIn();
  assert.deepEqual(await f.engine.apply(f.request()), {state: "complete"});
  assert.deepEqual(f.memory.records.get(
    "catchWhatsappAppAuthorities/operator")
    ?.capabilities, ["review", "reply"]);
  const recipient = f.memory.records.get(
    "catchWhatsappAppAuthorities/recipient");
  assert.deepEqual(recipient?.capabilities, ["receive"]);
  assert.equal(recipient?.endpointHash, f.sources.scope.endpointHash);
  assert.equal(recipient?.revision, 3);
  const count = f.memory.records.size;
  assert.deepEqual(await f.engine.apply(f.request()), {state: "complete"});
  assert.equal(f.memory.records.size, count);
  assert.equal(f.setters(), 1);
  assert.equal([...f.memory.records.keys()].filter((p) =>
    p.startsWith(OPERATOR_SETUP_AUDITS + "/")).length, 9);
  const operation = f.memory.records.get(OPERATOR_SETUP_OPERATIONS + "/" +
    f.sources.scope.projectId);
  assert.ok(validateCatchWhatsappOperatorSetupOperationDocument(operation));
  assert.equal(validateCatchWhatsappOperatorSetupOperationDocument(
    {...operation, expiresAt: 1}), false); // TTL cannot enter permanent state.
  for (const [path, row] of f.memory.records) {
    if (!path.startsWith(OPERATOR_SETUP_AUDITS + "/")) continue;
    assert.ok(validateCatchWhatsappOperatorSetupAuditDocument(row));
    assert.equal(validateCatchWhatsappOperatorSetupAuditDocument(
      {...row, rawClaims: {adminOwner: true}}), false);
  }
  await assert.rejects(f.engine.apply({...f.request(),
    replayKey: "2".repeat(64)}));
});
for (const mode of ["throw-before", "commit-then-throw"] as const) {
  test(`unknown Auth ${mode} never dispatches a second claim replacement`,
    async () => {
      const f = fixture();
      await f.initialize();
      f.setterMode(mode);
      assert.deepEqual(await f.engine.apply(f.request()),
        {state: "reconciliation-required"});
      f.setterMode("normal");
      const result = await f.engine.apply(f.request());
      assert.equal(result.state, mode === "throw-before" ?
        "reconciliation-required" : "fresh-sign-in-required");
      assert.equal(f.setters(), 1);
    });
}
test("lost seed commit response reconciles permanent " +
  "receipts without resetting",
async () => {
  const f = fixture();
  await f.initialize();
  f.memory.afterCommit = (writes) => {
    if ([...writes.values()].some((row) => row.phase === "seeded")) {
      f.memory.afterCommit = undefined;
      throw new Error("lost actual commit response");
    }
  };
  await assert.rejects(f.engine.apply(f.request()));
  f.signIn();
  assert.deepEqual(await f.engine.apply(f.request()), {state: "complete"});
  assert.equal(f.setters(), 1);
  assert.equal(f.memory.records.get("catchWhatsappAppAuthorities/operator")
    ?.revision, 2);
});
for (const state of ["granting", "active"]) {
  test(`receive ${state} unknown commit reconciles nonce/CAS`,
    async () => {
      const f = fixture();
      await f.initialize();
      await f.engine.apply(f.request());
      f.signIn();
      f.memory.afterCommit = (writes) => {
        if (writes.get("catchWhatsappAppAuthorities/recipient")?.state ===
          state) {
          f.memory.afterCommit = undefined;
          throw new Error("unknown receive commit outcome");
        }
      };
      assert.deepEqual(await f.engine.apply(f.request()),
        {state: "reconciliation-required"});
      assert.deepEqual(await f.engine.apply(f.request()), {state: "complete"});
      assert.equal(f.memory.records.get("catchWhatsappAppAuthorities/recipient")
        ?.revision, 3);
    });
}
test("concurrent requests have a single claim dispatch " +
  "and project bootstrap slot",
async () => {
  const f = fixture();
  await f.initialize();
  await Promise.allSettled([f.engine.apply(f.request()),
    f.engine.apply(f.request())]);
  assert.equal(f.setters(), 1);
  f.signIn();
  assert.deepEqual(await f.engine.apply(f.request()), {state: "complete"});
  assert.equal([...f.memory.records.keys()].filter((p) =>
    p.startsWith(OPERATOR_SETUP_OPERATIONS + "/")).length, 1);
});
test("drift observed after durable intent is never overwritten", async () => {
  const f = fixture();
  await f.initialize();
  f.memory.afterCommit = (writes) => {
    if ([...writes.values()].some((row) => row.phase === "auth-intent")) {
      f.changeClaims({...f.claims(), anotherUnrelatedClaim: true});
    }
  };
  await assert.rejects(f.engine.apply(f.request()));
  assert.equal(f.setters(), 0);
  assert.equal(f.memory.records.get(OPERATOR_SETUP_OPERATIONS + "/" +
    f.sources.scope.projectId)?.phase, "auth-intent");
});
test("missing activation policy, " +
  "role/phone/incarnation drift and revocation deny",
async () => {
  for (const mutate of [(f: ReturnType<typeof fixture>) => {
    f.sources.authorizeApply = undefined;
  }, (f: ReturnType<typeof fixture>) => f.changePhone(),
  (f: ReturnType<typeof fixture>) => f.recreateRecipient(),
  (f: ReturnType<typeof fixture>) => f.disableActor(),
  (f: ReturnType<typeof fixture>) => f.changeClaims({})]) {
    const f = fixture();
    await f.initialize();
    await f.engine.apply(f.request());
    f.signIn();
    mutate(f);
    await assert.rejects(f.engine.apply(f.request()));
    assert.equal(f.memory.records.get("catchWhatsappAppAuthorities/recipient")
      ?.state, "denied");
  }
  const f = fixture();
  await f.initialize();
  await f.engine.apply(f.request());
  f.signIn();
  await f.engine.apply(f.request());
  const path = "catchWhatsappAppAuthorities/operator";
  f.memory.records.set(path, {...f.memory.records.get(path), revision: 3});
  await assert.rejects(f.engine.apply(f.request()));
});
test("pre-existing actor assignment blocks before any " +
  "Auth dispatch", async () => {
  const f = fixture();
  await f.initialize();
  f.memory.records.set("adminRoleAssignments/operator", {roles: ["support"]});
  await assert.rejects(f.engine.apply(f.request()));
  assert.equal(f.setters(), 0);
  assert.ok(!f.memory.records.has("catchWhatsappAppAuthorities/operator"));
});
test("direct receive adapters require activation and " +
  "durable exact intent", async () => {
  const f = fixture();
  await f.initialize();
  f.sources.authorizeApply = undefined;
  await assert.rejects(f.journal.prepareReceive(f.plan(), f.request()));
  await assert.rejects(f.journal.finalizeReceive(f.plan(), f.request()));
  assert.equal(f.memory.records.size, 0);
});
test("root revision drift before receive transaction prevents the grant itself",
  async () => {
    const f = fixture();
    await f.initialize();
    await f.engine.apply(f.request());
    f.signIn();
    f.memory.afterCommit = (writes) => {
      if ([...writes.values()].some((row) => row.phase === "prepare-intent")) {
        const path = "catchWhatsappAppAuthorities/operator";
        f.memory.records.set(path, {...f.memory.records.get(path),
          revision: 3});
      }
    };
    assert.deepEqual(await f.engine.apply(f.request()),
      {state: "reconciliation-required"});
    assert.equal(f.memory.records.get("catchWhatsappAppAuthorities/recipient")
      ?.revision, 1);
  });
async function readinessFixture() {
  const f = fixture();
  await f.initialize();
  await f.engine.apply(f.request());
  f.signIn();
  await f.engine.apply(f.request());
  const scope = f.sources.scope;
  const now = f.sources.now();
  const cutover = now - 1000;
  const identity = {projectId: scope.projectId, wabaId: scope.wabaId,
    phoneNumberId: scope.phoneNumberId, recipientUid: scope.recipientUid,
    endpointHash: scope.endpointHash};
  const bytes = Buffer.from(JSON.stringify(
    {schema: "catch.whatsapp-history-archive/v1",
      identity, atomicIngressStartedAtMillis: cutover,
      segments: [{fromMillis: 0, throughMillis: cutover, records: [{
        messageId: "synthetic-history-message", receivedAtMillis: 1000,
        endpointHash: scope.endpointHash, messageType: "text", text: "hello",
        textTruncated: false}]}]}));
  const hashBytes = createHash("sha256").update(bytes).digest("hex");
  const approval: ReadinessApproval = {approvalId: f.plan().createReviewRef,
    action: "create", scope: {...identity, evidenceSha256: hashBytes},
    reviewerUid: scope.actorUid, reviewedAtMillis: now,
    expiresAtMillis: now + 60000, atomicIngressStartedAtMillis: cutover,
    expectedRecordSha256: null};
  const ingress = {schemaVersion: 1 as const,
    ingressId: catchReadinessIngressId(approval.scope),
    projectId: scope.projectId,
    wabaId: scope.wabaId, phoneNumberId: scope.phoneNumberId,
    state: "active" as const,
    evidenceSha256: "5".repeat(64), atomicIngressStartedAtMillis: cutover,
    verifiedAtMillis: now};
  f.memory.records.set("catchWhatsappReadinessIngress/" + ingress.ingressId,
    ingress);
  const readinessKey = "cwready_" + createHash("sha256").update(JSON.stringify([
    scope.wabaId, scope.phoneNumberId, scope.endpointHash,
  ])).digest("hex");
  const document = (ref: string): CatchWhatsappReadinessApprovalDocument => {
    const revoke = ref === f.plan().revokeReviewRef;
    return {schemaVersion: 1, approvalId: ref,
      approval: {...approval, approvalId: ref,
        action: revoke ? "revoke" : "create",
        expectedRecordSha256: revoke ? catchReadinessRecordDigest(
          f.memory.records.get("catchWhatsappReplyReadiness/" + readinessKey) as
            unknown as CatchWhatsappReplyReadinessDocument) : null},
      state: "approved", ingressEvidenceSha256: ingress.evidenceSha256,
      consumedAtMillis: null, recordSha256: null};
  };
  let revokeRoles: unknown = ["adminOwner"];
  const review = (ref: string) => ({approval: document(ref), reviewSession: {
    projectId: scope.projectId, reviewerUid: scope.actorUid,
    roles: (ref === f.plan().revokeReviewRef ? revokeRoles :
      ["adminOwner"]) as string[],
    disabled: false, authTimeMillis: now, tokensValidAfterMillis: 0,
    observedAtMillis: now, tokenExpiresAtMillis: now + 1800000,
    decisionSha256: catchReadinessEvidenceDecisionDigest(document(ref)),
    authenticationAuditSha256: "6".repeat(64)}});
  const archive = {archiveBytes: Uint8Array.from(bytes), trustedPin: {
    schema: "catch.whatsapp-history-audit-pin/v1" as const,
    approvalId: approval.approvalId, scope: {...approval.scope},
    sourceAuditSha256: "7".repeat(64), atomicIngressStartedAtMillis: cutover,
    coveredThroughMillis: cutover}};
  const ingressEvidence = {document: ingress,
    sourceAuditSha256: ingress.evidenceSha256,
    deployedRevisionSha256: "8".repeat(64)};
  const fingerprint = (uid: string) => JSON.stringify({creationTimeMillis: 1001,
    disabled: false,
    relevantRoles: uid === scope.actorUid ? ["adminOwner"] : [],
    endpointHash: uid === scope.recipientUid ? scope.endpointHash : null,
    tokensValidAfterMillis: 0});
  const fenceHash = createHash("sha256").update(JSON.stringify([
    "catch.fresh-auth/v1", scope.projectId, [scope.actorUid,
      scope.recipientUid],
    [fingerprint(scope.actorUid), fingerprint(scope.recipientUid)], now,
  ])).digest("hex");
  // Independent synthetic publication from approved source facts,
  // never obtained by trusting the digest on the stored publication itself.
  const expectedPublication = catchReadinessPublicationDigest({
    ...review(approval.approvalId), ingress: ingressEvidence, archive,
    projectId: scope.projectId, authorityFenceSha256: fenceHash});
  let historyReads = 0;
  let permitHistory = true;
  const adapter = createOperatorReadinessAdapters({plan: f.plan(),
    sources: f.sources, store: f.store,
    actorIdToken: async () => "synthetic-google-token",
    evidence: {actualProjectId: scope.projectId, now: f.sources.now,
      loadAuthenticatedReview: async (ref) => review(ref),
      loadVerifiedAtomicIngress: async () => ingressEvidence,
      loadAuditedArchive: async () => {
        historyReads++;
        if (!permitHistory) throw new Error("history access forbidden");
        return archive;
      }},
    publicationAudit: {verifyImmutablePublication: async (binding) => {
      assert.deepEqual(binding, {projectId: scope.projectId,
        approvalId: approval.approvalId,
        publicationSha256: expectedPublication});
    }},
  });
  f.sources.readiness = adapter;
  return {...f, adapter, readinessKey, historyReads: () => historyReads,
    setRevokeRoles: (roles: unknown) => {
      revokeRoles = roles;
    },
    forbidHistory: () => {
      permitHistory = false;
    }};
}
test("protected readiness publishes/applies atomically " +
  "and revokes after STOP/deletion",
async () => {
  const f = await readinessFixture();
  await assert.rejects(f.adapter.publish(f.plan().createReviewRef,
    f.request()));
  assert.deepEqual(await f.engine.readiness(f.request(), "publish"),
    {state: "published"});
  assert.deepEqual(await f.engine.readiness(f.request(), "apply"),
    {state: "ready"});
  const key = f.readinessKey.slice("cwready_".length);
  f.memory.records.set("catchWhatsappEndpointStops/cwstop_" + key,
    {syntheticStop: true});
  f.memory.records.set("deletedUsers/recipient", {syntheticDeletion: true});
  const observe = f.store.deps.firebase.observe;
  f.store.deps.firebase.observe = async (uid) => {
    if (uid === "recipient") {
      throw new Error(
        "deleted recipient must not be read");
    }
    return observe(uid);
  };
  f.forbidHistory();
  const reads = f.historyReads();
  assert.deepEqual(await f.engine.readiness(f.request(), "revoke"),
    {state: "revoked"});
  assert.equal(f.historyReads(), reads);
  assert.equal(f.memory.records.get("catchWhatsappReplyReadiness/" +
      f.readinessKey)?.state, "revoked");
  const size = f.memory.records.size;
  assert.deepEqual(await f.engine.readiness(f.request(), "revoke"),
    {state: "revoked"});
  assert.equal(f.memory.records.size, size);
});
test("unknown readiness commit has saved exact phase; replay never republishes",
  async () => {
    const f = await readinessFixture();
    f.memory.afterCommit = (writes) => {
      if ([...writes.values()].some((row) => row.phase === "published")) {
        f.memory.afterCommit = undefined;
        throw new Error("lost publication response");
      }
    };
    assert.deepEqual(await f.engine.readiness(f.request(), "publish"),
      {state: "reconciliation-required"});
    const reads = f.historyReads();
    assert.deepEqual(await f.engine.readiness(f.request(), "publish"),
      {state: "published"});
    assert.equal(f.historyReads(), reads);
    const key = f.readinessKey.slice("cwready_".length);
    f.memory.records.set("catchWhatsappEndpointStops/cwstop_" + key,
      {syntheticStop: true});
    assert.deepEqual(await f.engine.readiness(f.request(), "apply"),
      {state: "reconciliation-required"});
    assert.ok(!f.memory.records.has(
      "catchWhatsappReplyReadiness/" + f.readinessKey));
  });

for (const lostPhase of ["approved", "revoked"]) {
  test(`lost revoke ${lostPhase} response resumes only saved exact state`,
    async () => {
      const f = await readinessFixture();
      await f.engine.readiness(f.request(), "publish");
      await f.engine.readiness(f.request(), "apply");
      let approvalsCreated = 0;
      const approvalPath = "catchWhatsappReadinessApprovals/" +
        f.plan().revokeReviewRef;
      f.memory.afterCommit = (writes) => {
        const approval = writes.get(approvalPath);
        if (approval?.state === "approved") approvalsCreated++;
        if (approval?.state === (lostPhase === "approved" ?
          "approved" : "consumed")) {
          f.memory.afterCommit = (later) => {
            if (later.get(approvalPath)?.state === "approved") {
              approvalsCreated++;
            }
          };
          throw new Error("lost revoke transaction response");
        }
      };
      assert.deepEqual(await f.engine.readiness(f.request(), "revoke"),
        {state: "reconciliation-required"});
      f.forbidHistory();
      const historyReads = f.historyReads();
      assert.deepEqual(await f.engine.readiness(f.request(), "revoke"),
        {state: "revoked"});
      assert.equal(approvalsCreated, 1);
      assert.equal(f.historyReads(), historyReads);
      assert.equal(f.memory.records.get(approvalPath)?.state, "consumed");
      assert.equal(f.memory.records.get(OPERATOR_SETUP_OPERATIONS + "/" +
        f.sources.scope.projectId)?.phase, "revoked");
    });
}
test("revoke resume rejects receipt swap between proof and actual apply",
  async () => {
    const f = await readinessFixture();
    await f.engine.readiness(f.request(), "publish");
    await f.engine.readiness(f.request(), "apply");
    const path = "catchWhatsappReadinessApprovals/" + f.plan().revokeReviewRef;
    f.memory.afterCommit = (writes) => {
      if (writes.get(path)?.state === "approved") {
        f.memory.afterCommit = undefined;
        throw new Error("lost admission response");
      }
    };
    await f.engine.readiness(f.request(), "revoke");
    f.memory.afterCommit = (writes) => {
      if (!writes.size) {
        f.memory.afterCommit = undefined;
        f.memory.records.set(path, {...f.memory.records.get(path),
          ingressEvidenceSha256: "9".repeat(64)});
      }
    };
    await assert.rejects(f.adapter.resumeRevoke!(f.plan().revokeReviewRef,
      f.request()));
    assert.equal(f.memory.records.get(path)?.state, "approved");
    assert.equal(f.memory.records.get("catchWhatsappReplyReadiness/" +
      f.readinessKey)?.state, "ready");
    assert.ok(!f.memory.records.has("catchWhatsappReadinessAudits/" +
      f.plan().revokeReviewRef));
  });
test("protected revoke rejects string, duplicate and unknown role facts",
  async () => {
    for (const roles of ["adminOwner", ["adminOwner", "adminOwner"],
      ["adminOwner", "invented"]]) {
      const f = await readinessFixture();
      await f.engine.readiness(f.request(), "publish");
      await f.engine.readiness(f.request(), "apply");
      f.setRevokeRoles(roles);
      assert.deepEqual(await f.engine.readiness(f.request(), "revoke"),
        {state: "reconciliation-required"});
      assert.ok(!f.memory.records.has("catchWhatsappReadinessApprovals/" +
        f.plan().revokeReviewRef));
      assert.equal(f.memory.records.get("catchWhatsappReplyReadiness/" +
        f.readinessKey)?.state, "ready");
    }
  });


test("consolidated bootstrap preserves Admin " +
  "and activates one endpoint-bound root",
async () => {
  const f = fixture(true);
  await f.initialize();
  assert.deepEqual(await f.engine.apply(f.request()),
    {state: "fresh-sign-in-required"});
  assert.deepEqual(f.claims(), {admin: true, adminOwner: true});
  const assignment = f.memory.records.get("adminRoleAssignments/operator")!;
  assert.deepEqual(assignment.roles, ["admin", "adminOwner"]);
  assert.equal(assignment.displayName, "Preserved operator");
  assert.equal(assignment.email, "operator@example.test");
  f.signIn();
  assert.deepEqual(await f.engine.apply(f.request()), {state: "complete"});
  const authorities = [...f.memory.records].filter(([path]) =>
    path.startsWith("catchWhatsappAppAuthorities/"));
  assert.equal(authorities.length, 1);
  assert.equal(authorities[0][1].revision, 2);
  assert.equal(authorities[0][1].grantedBy, null);
  assert.equal(authorities[0][1].endpointHash, f.sources.scope.endpointHash);
  assert.deepEqual(authorities[0][1].capabilities,
    ["receive", "reply", "review"]);
  assert.deepEqual(await f.engine.apply(f.request()), {state: "complete"});
  assert.equal(f.setters(), 1);
  f.changePhone();
  await assert.rejects(f.engine.apply(f.request()));
});
for (const mode of ["throw-before", "commit-then-throw"] as const) {
  test(`consolidated unknown Auth ${mode} does not retry claim replacement`,
    async () => {
      const f = fixture(true);
      await f.initialize();
      f.setterMode(mode);
      assert.deepEqual(await f.engine.apply(f.request()),
        {state: "reconciliation-required"});
      f.setterMode("normal");
      const result = await f.engine.apply(f.request());
      assert.equal(result.state, mode === "throw-before" ?
        "reconciliation-required" : "fresh-sign-in-required");
      assert.equal(f.setters(), 1);
    });
}
test("consolidated assignment drift blocks before Auth and before seed",
  async () => {
    for (const when of ["before-auth", "after-auth"] as const) {
      const f = fixture(true);
      await f.initialize();
      if (when === "after-auth") {
        f.setterMode("commit-then-throw");
        await f.engine.apply(f.request());
      }
      f.memory.records.get("adminRoleAssignments/operator")!.displayName =
        "Concurrent update";
      await assert.rejects(f.engine.apply(f.request()));
      assert.equal(f.setters(), when === "before-auth" ? 0 : 1);
      assert.equal([...f.memory.records.keys()].some((path) =>
        path.startsWith("catchWhatsappAppAuthorities/")), false);
    }
  });
