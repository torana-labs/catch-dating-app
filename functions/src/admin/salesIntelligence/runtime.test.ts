/* eslint-disable max-len */
import type {CallableRequest} from "firebase-functions/v2/https";
import {currentPartnerActor} from "../../partners/callables";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateGenerateSalesPartnerOutreachCallablePayload} from "../../shared/generated/validators/generateSalesPartnerOutreachInput";
import {validateGetSalesPartnerOutreachJobCallablePayload} from "../../shared/generated/validators/getSalesPartnerOutreachJobInput";
import {validateGetSalesPartnerOutreachDraftCallablePayload} from "../../shared/generated/validators/getSalesPartnerOutreachDraftInput";
import {validateReviewSalesPartnerOutreachDraftCallablePayload} from "../../shared/generated/validators/reviewSalesPartnerOutreachDraftInput";
import {validateCopySalesPartnerOutreachDraftCallablePayload} from "../../shared/generated/validators/copySalesPartnerOutreachDraftInput";
import {validateRecordSalesPartnerManualSendCallablePayload} from "../../shared/generated/validators/recordSalesPartnerManualSendInput";
import {validateSalesActivityDocument} from "../../shared/generated/validators/salesActivityDocument";
import {validateGetSalesPartnerPreparationCallablePayload} from "../../shared/generated/validators/getSalesPartnerPreparationInput";
import {validateAdminGetSalesIntelligenceCatalogResponse} from "../../shared/generated/validators/adminGetSalesIntelligenceCatalogResponse";
import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {test} from "node:test";
import {qualificationPolicyHash} from "../sales/qualificationPolicy";
import {salesRelationshipId} from "../sales/records";
import type {SalesPrincipal} from "../sales/types";
import {parsePolicy} from "./model";
import {claimDraftJob, claimPartnerDraftJob, completePartnerDraftJob,
  getDraftJob, getPartnerDraftJob, jobIdFor} from "./job";
import {generatePartnerOutreachDraft, generateSalesOutreachDraft} from "./runtime";
import {buildOutreachInput, buildPartnerOutreachInput, recordPartnerOperationsDraft,
  getPartnerOutreachDraft, reviewPartnerOutreachDraft, copyPartnerOutreachDraft,
  recordPartnerManualSend, getPartnerPreparation, getIntelligenceCatalog, reviewIntelligenceClause,
  type DraftRequest, type IntelligenceDeps} from "./service";
import {PARTNER_TERMS_VERSION, type PartnerDeps} from "../../partners/model";

const started = "2026-09-28T10:00:00.000Z";
const sampleRequest = {requestId: "draft-request-123",
  sourceRequest: {organizerId: "org-one", contactId: "contact-one",
    opportunityId: "opportunity-one", observationIds: ["observation-one"],
    capabilityIds: ["capability-one"], referenceIds: [], ctaIds: ["cta-one"],
    channel: "email", purpose: "first_message"}};
const actor: SalesPrincipal = {uid: "employee-one", roles: ["admin"]};

class MemoryDb {
  docs = new Map<string, Record<string, unknown>>();
  doc(name: string) {
    return new MemoryRef(this, name);
  }
  collection(name: string) {
    return new MemoryQuery(this, name);
  }
  async runTransaction<T>(callback: (tx: MemoryTx) => Promise<T>): Promise<T> {
    const tx = new MemoryTx(this);
    const result = await callback(tx);
    tx.commit();
    return result;
  }
}
class MemoryRef {
  constructor(private db: MemoryDb, readonly path: string) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
  async get() {
    return snap(this.id, this.db.docs.get(this.path));
  }
}
class MemoryQuery {
  private filters: Array<[string, unknown]> = [];
  private cap = 100;
  constructor(private db: MemoryDb, private base: string) {}
  doc(name: string) {
    return new MemoryRef(this.db, `${this.base}/${name}`);
  }
  where(key: string, _op: string, value: unknown) {
    this.filters.push([key, value]); return this;
  }
  limit(value: number) {
    this.cap = value; return this;
  }
  async get() {
    const docs = [...this.db.docs.entries()].filter(([key, value]) =>
      key.startsWith(`${this.base}/`) &&
      key.slice(this.base.length + 1).indexOf("/") === -1 &&
      this.filters.every(([field, expected]) => value[field] === expected))
      .slice(0, this.cap).map(([key, value]) =>
        snap(key.split("/").at(-1)!, value));
    return {docs, size: docs.length};
  }
}
function snap(id: string, value?: Record<string, unknown>) {
  return {id, exists: value !== undefined, data: () => value};
}
class MemoryTx {
  private changes: Array<() => void> = [];
  constructor(private db: MemoryDb) {}
  get(target: MemoryRef | MemoryQuery) {
    return target.get();
  }
  create(ref: MemoryRef, value: Record<string, unknown>) {
    if (this.db.docs.has(ref.path)) throw new Error("already exists");
    this.changes.push(() => this.db.docs.set(ref.path, value));
  }
  set(ref: MemoryRef, value: Record<string, unknown>) {
    this.changes.push(() => this.db.docs.set(ref.path, value));
  }
  update(ref: MemoryRef, patch: Record<string, unknown>) {
    this.changes.push(() => this.db.docs.set(ref.path,
      {...this.db.docs.get(ref.path), ...patch}));
  }
  commit() {
    this.changes.forEach((change) => change());
  }
}

function fixture() {
  const db = new MemoryDb();
  let currentTime = new Date(started);
  let authorized = true;
  const qualification = {policyId: "qual-synthetic", version: "v1",
    rules: [{ruleId: "identity-rule", claimKey: "identity",
      sourceTypes: ["first_party"], confidence: ["high"], minimumCount: 1,
      distinctSignalIds: false, distinctSourceRoots: false, maxAgeDays: 30}]};
  const qualified = {...qualification, policyHash: qualificationPolicyHash(qualification)};
  const policy = parsePolicy({policyId: "intel-synthetic", version: "v1",
    status: "active", promptVersion: "prompt-v1", playbookVersion: "playbook-v1",
    priorityBands: {high: 80, medium: 50}, factors: [
      "a", "b", "c", "d", "e", "f", "g"].map((id, i) => ({id,
      weight: i === 6 ? 16 : 14, claimKeys: ["identity"], maxAgeDays: 30}))});
  db.docs.set("salesSettings/qualificationPolicy", {schemaVersion: 1,
    classification: "sales_private", status: "active", ...qualified});
  db.docs.set("organizerSalesAccounts/org-one", {classification: "sales_private",
    organizerId: "org-one", revision: 2, name: "Example Collective",
    suppressionStatus: "clear", duplicateReviewRequired: false,
    researchStatus: "qualified", qualificationPolicy: {
      policyId: qualified.policyId, version: qualified.version,
      policyHash: qualified.policyHash}});
  db.docs.set("salesContacts/contact-one", {classification: "sales_private",
    contactId: "contact-one", revision: 1});
  db.docs.set(`salesContactRelationships/${salesRelationshipId("org-one", "contact-one")}`,
    {classification: "sales_private", organizerId: "org-one",
      contactId: "contact-one", revision: 3, role: "organizer",
      contactabilityStatus: "draft_reviewed", draftReviewEvidenceId: "contact-evidence"});
  db.docs.set("salesOpportunities/opportunity-one", {classification: "sales_private",
    organizerId: "org-one", opportunityId: "opportunity-one", revision: 4,
    stage: "ready_to_contact", motion: "first_pilot"});
  db.docs.set("salesIntelligencePolicies/current", {schemaVersion: 1,
    classification: "sales_private", policyRecordId: "current",
    ...policy, revision: 1, updatedAt: started, updatedBy: "owner-one"});
  for (const [evidenceId, claimKey, contactId] of [
    ["identity-evidence", "identity", undefined],
    ["observation-evidence", "operation", undefined],
    ["capability-evidence", "operation", undefined],
    ["contact-evidence", "identity", "contact-one"],
  ]) {
    db.docs.set(`salesEvidence/${evidenceId}`, {classification: "sales_private",
      evidenceId, organizerId: "org-one", contactId, claimKey,
      sourceType: "first_party", confidence: "high", sourceRef: "synthetic",
      observedAt: "2026-09-27T10:00:00.000Z", validThrough: null,
      reviewedAt: started, reviewerUid: "owner-one"});
  }
  for (const [clauseId, kind, value, evidenceIds] of [
    ["observation-one", "observation", "Your event uses applications.", ["observation-evidence"]],
    ["capability-one", "capability", "Catch can collect applications for review.", ["capability-evidence"]],
    ["cta-one", "cta", "Would a walkthrough be useful?", []],
  ] as const) {
    db.docs.set(`salesIntelligenceClauses/${clauseId}`, {schemaVersion: 1,
      classification: "sales_private", clauseId, organizerId: "org-one",
      revision: 1, kind, text: value, state: "approved", evidenceIds,
      validUntil: "2026-11-01T00:00:00.000Z", permission: "not_required",
      reviewedAt: started, reviewedBy: "owner-one", updatedAt: started,
      updatedBy: "owner-one"});
  }
  const deps: IntelligenceDeps = {db: db as unknown as FirebaseFirestore.Firestore,
    now: () => currentTime, authorize: async () => {
      if (!authorized) throw new Error("employee revoked");
    }};
  return {db, deps, clock: (iso: string) => {
    currentTime = new Date(iso);
  },
  revoke: () => {
    authorized = false;
  }};
}

// The build post-step copies these exact existing Operations modules to lib.
execFileSync(process.execPath, [path.join(__dirname,
  "../../../scripts/copy-operations-runtime.cjs")]);

test("real zero-model Operations runner creates one reviewed draft and exact retry", async () => {
  const f = fixture();
  const first = await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  assert.equal(first.status, "completed");
  assert.equal(first.idempotentReplay, false);
  const again = await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  assert.deepEqual(again.result, first.result);
  assert.equal(again.idempotentReplay, true);
  assert.equal([...f.db.docs.keys()].filter((key) =>
    key.startsWith("salesOutreachJobs/")).length, 1);
  assert.equal([...f.db.docs.keys()].filter((key) =>
    key.startsWith("salesOutreachDrafts/")).length, 1);
  assert.equal([...f.db.docs.keys()].filter((key) =>
    key.startsWith("salesIntelligenceReceipts/")).length, 1);
  const other: SalesPrincipal = {uid: "employee-two", roles: ["admin"]};
  await assert.rejects(getDraftJob(f.deps, other,
    {requestId: sampleRequest.requestId}), /not found/u);
});

test("expired lease resumes same frozen request; another active claim does not run", async () => {
  const f = fixture();
  const claimed = await claimDraftJob(f.deps, actor, sampleRequest);
  assert.equal(claimed.claimed, true);
  const busy = await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  assert.equal(busy.status, "running");
  assert.equal(f.db.docs.has(`salesOutreachJobs/${jobIdFor(actor.uid, sampleRequest.requestId)}`), true);
  f.clock("2026-09-28T10:01:01.000Z");
  const resumed = await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  assert.equal(resumed.status, "completed");
  const job = f.db.docs.get(`salesOutreachJobs/${jobIdFor(actor.uid, sampleRequest.requestId)}`);
  assert.equal(job?.attemptCount, 2);
});

test("crash after draft receipt but before job completion recovers exact artifact", async () => {
  const f = fixture();
  const first = await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  const key = `salesOutreachJobs/${jobIdFor(actor.uid, sampleRequest.requestId)}`;
  const committed = f.db.docs.get(key)!;
  f.db.docs.set(key, {...committed, status: "running", result: null,
    leaseOwner: "interrupted-worker", leaseUntil: "2026-09-28T10:01:00.000Z"});
  f.clock("2026-09-28T10:01:01.000Z");
  const recovered = await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  assert.equal(recovered.status, "completed");
  assert.deepEqual(recovered.result, first.result);
  assert.equal([...f.db.docs.keys()].filter((key) =>
    key.startsWith("salesOutreachDrafts/")).length, 1);
  assert.equal([...f.db.docs.keys()].filter((key) =>
    key.startsWith("salesIntelligenceReceipts/")).length, 1);
});

test("current-source drift and revoked employee block freeze, replay and completion", async () => {
  const changed = fixture();
  await claimDraftJob(changed.deps, actor, sampleRequest);
  changed.db.docs.set("salesIntelligenceClauses/capability-one", {
    ...changed.db.docs.get("salesIntelligenceClauses/capability-one"), revision: 2});
  changed.clock("2026-09-28T10:01:01.000Z");
  await assert.rejects(generateSalesOutreachDraft(changed.deps, actor,
    sampleRequest), /sources changed/u);
  assert.equal([...changed.db.docs.keys()].some((key) =>
    key.startsWith("salesOutreachDrafts/")), false);
  const evidenceDrift = fixture();
  await claimDraftJob(evidenceDrift.deps, actor, sampleRequest);
  evidenceDrift.db.docs.set("salesEvidence/identity-evidence", {
    ...evidenceDrift.db.docs.get("salesEvidence/identity-evidence"),
    sourceRef: "synthetic-corrected"});
  evidenceDrift.clock("2026-09-28T10:01:01.000Z");
  await assert.rejects(generateSalesOutreachDraft(evidenceDrift.deps, actor,
    sampleRequest), /sources changed/u);
  const revoked = fixture();
  await claimDraftJob(revoked.deps, actor, sampleRequest);
  revoked.revoke();
  await assert.rejects(generateSalesOutreachDraft(revoked.deps, actor,
    sampleRequest), /employee revoked/u);
  assert.equal([...revoked.db.docs.keys()].some((key) =>
    key.startsWith("salesOutreachDrafts/")), false);
});

function partnerFixture() {
  const f = fixture();
  f.db.docs.set("organizers/org-one", {name: "Synthetic", appVisibility: "hidden",
    claim: {state: "unclaimed"}, publicPage: {publicationStatus: "draft"}});
  f.db.docs.set("salesPartnerMemberships/partner-one", {schemaVersion: 1,
    classification: "sales_private", uid: "partner-one", status: "active",
    termsVersion: PARTNER_TERMS_VERSION, expiresAt: "2026-11-01T00:00:00.000Z"});
  f.db.docs.set("salesPartnerAssignments/org-one", {schemaVersion: 1,
    classification: "sales_private", organizerId: "org-one", partnerUid: "partner-one",
    revision: 2, status: "accepted", expiresAt: "2026-11-01T00:00:00.000Z"});
  const principal = {uid: "partner-one", roles: []};
  const deps: PartnerDeps = {db: f.deps.db, now: f.deps.now,
    checkAuth: async (current, employee) => {
      assert.equal(employee, false); assert.deepEqual(current.roles, []);
    }};
  return {...f, principal, partnerDeps: deps};
}

test("partner source composition shares qualification gates without borrowing employee roles", async () => {
  const f = partnerFixture();
  const result = await buildPartnerOutreachInput(f.partnerDeps, f.principal, sampleRequest.sourceRequest, 2);
  assert.equal(result.sendAuthority, false);
  assert.equal((result.bundle as {priorInteraction: unknown}).priorInteraction, null);
  await assert.rejects(buildOutreachInput(f.deps, f.principal, sampleRequest.sourceRequest),
    {code: "permission-denied"});
  await assert.rejects(buildPartnerOutreachInput(f.partnerDeps,
    {uid: "other-partner", roles: []}, sampleRequest.sourceRequest, 2), {code: "permission-denied"});
  f.db.docs.set("organizerSalesAccounts/org-one", {...f.db.docs.get("organizerSalesAccounts/org-one"),
    researchStatus: "new"});
  await assert.rejects(buildPartnerOutreachInput(f.partnerDeps, f.principal, sampleRequest.sourceRequest, 2),
    {code: "failed-precondition"});
});

test("partner source hashes bind current assignment generation and reject stale access during reads", async () => {
  const f = partnerFixture();
  const before = await buildPartnerOutreachInput(f.partnerDeps, f.principal, sampleRequest.sourceRequest, 2);
  f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), revision: 3});
  await assert.rejects(buildPartnerOutreachInput(f.partnerDeps, f.principal, sampleRequest.sourceRequest, 2),
    {code: "aborted"});
  const after = await buildPartnerOutreachInput(f.partnerDeps, f.principal, sampleRequest.sourceRequest, 3);
  assert.notEqual(before.sourceHash, after.sourceHash);
  let checks = 0;
  f.partnerDeps.checkAuth = async () => {
    if (++checks === 2) {
      f.db.docs.set("salesPartnerMemberships/partner-one",
        {...f.db.docs.get("salesPartnerMemberships/partner-one"), status: "revoked"});
    }
  };
  await assert.rejects(buildPartnerOutreachInput(f.partnerDeps, f.principal, sampleRequest.sourceRequest, 3),
    {code: "permission-denied"});
});

test("partner follow-up rejects staff notes and consumes only own manual interaction", async () => {
  const f = partnerFixture();
  const row = {classification: "sales_private", organizerId: "org-one",
    opportunityId: "opportunity-one", actorUid: "employee-one", note: "Private staff note",
    type: "outreach_sent_manual", outcome: "actor_attested_sent", providerConfirmed: false};
  f.db.docs.set("salesActivities/prior-one", row);
  const source = {...sampleRequest.sourceRequest, purpose: "follow_up", priorActivityId: "prior-one"};
  await assert.rejects(buildPartnerOutreachInput(f.partnerDeps, f.principal, source, 2),
    {code: "permission-denied"});
  f.db.docs.set("salesActivities/prior-one", {...row, actorUid: f.principal.uid, note: "Own manually recorded context"});
  const result = await buildPartnerOutreachInput(f.partnerDeps, f.principal, source, 2);
  assert.equal((result.bundle as {priorInteraction: {summary: string}}).priorInteraction.summary,
    "Own manually recorded context");
  assert.ok(!JSON.stringify(result).includes("Private staff note"));
});

test("identical employee and replacement-partner renderings retain separate scoped identities", async () => {
  const f = partnerFixture();
  await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  const employeeDraft = [...f.db.docs.entries()].find(([key]) => key.startsWith("salesOutreachDrafts/"))![1];
  const rendered = employeeDraft.draft;
  const request = sampleRequest.sourceRequest as DraftRequest;
  const source = await buildPartnerOutreachInput(f.partnerDeps, f.principal, request, 2);
  const first = await recordPartnerOperationsDraft(f.partnerDeps, f.principal, "partner-first",
    request, 2, source.bundle as Record<string, unknown>, source.sourceHash as string, rendered);
  assert.notEqual(first.draftId, employeeDraft.draftId);
  assert.deepEqual(await recordPartnerOperationsDraft(f.partnerDeps, f.principal, "partner-first",
    request, 2, source.bundle as Record<string, unknown>, source.sourceHash as string, rendered), first);
  f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), revision: 3});
  const newer = await buildPartnerOutreachInput(f.partnerDeps, f.principal, request, 3);
  const second = await recordPartnerOperationsDraft(f.partnerDeps, f.principal, "partner-next",
    request, 3, newer.bundle as Record<string, unknown>, newer.sourceHash as string, rendered);
  assert.notEqual(second.draftId, first.draftId);
  const replacement = {uid: "partner-two", roles: []};
  f.db.docs.set("salesPartnerMemberships/partner-two", {...f.db.docs.get("salesPartnerMemberships/partner-one"), uid: replacement.uid});
  f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), partnerUid: replacement.uid});
  const changed = await buildPartnerOutreachInput(f.partnerDeps, replacement, request, 3);
  const third = await recordPartnerOperationsDraft(f.partnerDeps, replacement, "partner-replaced",
    request, 3, changed.bundle as Record<string, unknown>, changed.sourceHash as string, rendered);
  assert.notEqual(third.draftId, second.draftId);
  assert.equal([...f.db.docs.keys()].filter((key) => key.startsWith("salesOutreachDrafts/")).length, 4);
});

test("participant review and copy require own current artifact on fresh calls and exact replay", async () => {
  const f = partnerFixture();
  await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  const employeeDraft = [...f.db.docs.entries()].find(([key]) => key.startsWith("salesOutreachDrafts/"))![1];
  const request = sampleRequest.sourceRequest as DraftRequest;
  const source = await buildPartnerOutreachInput(f.partnerDeps, f.principal, request, 2);
  const saved = await recordPartnerOperationsDraft(f.partnerDeps, f.principal, "partner-draft",
    request, 2, source.bundle as Record<string, unknown>, source.sourceHash as string, employeeDraft.draft);
  const target = {organizerId: "org-one", draftId: saved.draftId, expectedAssignmentRevision: 2};
  const expectedContentHash = saved.draft.contentHash;
  const copy = {...target, requestId: "copy-own", expectedContentHash};
  await assert.rejects(copyPartnerOutreachDraft(f.partnerDeps, f.principal, copy), {code: "failed-precondition"});
  const review = {...target, requestId: "review-own", expectedContentHash,
    factualValidity: "verified", tone: "approved", channelReadiness: "manual_copy_only"};
  const reviewed = await reviewPartnerOutreachDraft(f.partnerDeps, f.principal, review);
  assert.equal(reviewed.capabilityApprovalAuthority, false);
  assert.deepEqual(await reviewPartnerOutreachDraft(f.partnerDeps, f.principal, review), reviewed);
  const copied = await copyPartnerOutreachDraft(f.partnerDeps, f.principal, copy);
  assert.equal(copied.sendAuthority, false); assert.equal(copied.providerConfirmed, false);
  assert.deepEqual(await copyPartnerOutreachDraft(f.partnerDeps, f.principal, copy), copied);
  const own = await getPartnerOutreachDraft(f.partnerDeps, f.principal, target);
  assert.ok(!("reviewedBy" in own));
  await assert.rejects(getPartnerOutreachDraft(f.partnerDeps, f.principal,
    {...target, draftId: employeeDraft.draftId}), {code: "permission-denied"});
  f.db.docs.set(`salesOutreachDrafts/${saved.draftId}`, {...f.db.docs.get(`salesOutreachDrafts/${saved.draftId}`), status: "pending_review"});
  await assert.rejects(copyPartnerOutreachDraft(f.partnerDeps, f.principal, copy), {code: "failed-precondition"});
  await assert.rejects(reviewPartnerOutreachDraft(f.partnerDeps, f.principal, review), {code: "failed-precondition"});
});

test("participant draft reads and reviewed replays reject persisted prose and identity edits", async () => {
  const f = partnerFixture();
  const completed = await generatePartnerOutreachDraft(f.partnerDeps, f.principal,
    {...sampleRequest, expectedAssignmentRevision: 2});
  const draftId = String((completed.result as {draftId: string}).draftId);
  const path = `salesOutreachDrafts/${draftId}`;
  const original = f.db.docs.get(path)!;
  const draft = original.draft as Record<string, unknown>;
  const target = {organizerId: "org-one", draftId, expectedAssignmentRevision: 2};
  const review = {...target, requestId: "integrity-review", expectedContentHash: draft.contentHash,
    factualValidity: "verified", tone: "approved", channelReadiness: "manual_copy_only"};
  const copy = {...target, requestId: "integrity-copy", expectedContentHash: draft.contentHash};
  await reviewPartnerOutreachDraft(f.partnerDeps, f.principal, review);
  await copyPartnerOutreachDraft(f.partnerDeps, f.principal, copy);
  const reviewed = f.db.docs.get(path)!;
  for (const change of [{text: "Unreviewed relationship proof"}, {subject: "Unreviewed subject"},
    {contactId: "foreign-contact"}, {opportunityId: "foreign-opportunity"},
    {sentences: [{text: "Unreviewed proof", kind: "reference", sourceIds: ["reference-foreign"]}]}]) {
    f.db.docs.set(path, {...reviewed, draft: {...draft, ...change}});
    await assert.rejects(getPartnerOutreachDraft(f.partnerDeps, f.principal, target), {code: "failed-precondition"});
    await assert.rejects(reviewPartnerOutreachDraft(f.partnerDeps, f.principal, review), {code: "failed-precondition"});
    await assert.rejects(copyPartnerOutreachDraft(f.partnerDeps, f.principal, copy), {code: "failed-precondition"});
    await assert.rejects(generatePartnerOutreachDraft(f.partnerDeps, f.principal,
      {...sampleRequest, expectedAssignmentRevision: 2}), {code: "failed-precondition"});
    await assert.rejects(getPartnerDraftJob(f.partnerDeps, f.principal,
      {organizerId: "org-one", expectedAssignmentRevision: 2, requestId: sampleRequest.requestId}), {code: "failed-precondition"});
  }
  f.db.docs.set(path, reviewed);
  assert.equal((await getPartnerOutreachDraft(f.partnerDeps, f.principal, target)).status, "approved");
});


const partnerJobRequest = {...sampleRequest, expectedAssignmentRevision: 2};
const partnerJobRead = {requestId: sampleRequest.requestId, organizerId: "org-one", expectedAssignmentRevision: 2};
async function participantJobWithResult() {
  const f = partnerFixture();
  const claimed = await claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest);
  await generateSalesOutreachDraft(f.deps, actor, sampleRequest);
  const employeeDraft = [...f.db.docs.entries()].find(([key]) => key.startsWith("salesOutreachDrafts/"))![1];
  const saved = await recordPartnerOperationsDraft(f.partnerDeps, f.principal, sampleRequest.requestId,
    sampleRequest.sourceRequest as DraftRequest, 2, claimed.job.frozenBundle, claimed.job.sourceHash, employeeDraft.draft);
  return {...f, job: claimed.job, saved};
}

test("participant job claims require own accepted assignment and preserve actor roles", async () => {
  const f = partnerFixture();
  const first = await claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest);
  assert.equal(first.claimed, true);
  assert.deepEqual(first.job.participantScope, {partnerUid: f.principal.uid, assignmentRevision: 2});
  const busy = await claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest);
  assert.equal(busy.claimed, false); assert.equal(busy.job.attemptCount, 1);
  await assert.rejects(claimPartnerDraftJob(f.partnerDeps, {uid: "other-partner", roles: []}, partnerJobRequest), {code: "permission-denied"});
  await assert.rejects(getPartnerDraftJob(f.partnerDeps, f.principal, {...partnerJobRead, expectedAssignmentRevision: 3}), {code: "aborted"});
  f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), status: "revoked"});
  await assert.rejects(claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest), {code: "permission-denied"});
  await assert.rejects(getPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRead), {code: "permission-denied"});
});

test("participant job retries exhaust bounded attempts without renewing the frozen job deadline", async () => {
  const f = partnerFixture();
  const first = await claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest);
  for (const at of ["2026-09-28T10:01:01.000Z", "2026-09-28T10:02:02.000Z"]) {
    f.clock(at); const next = await claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest);
    assert.equal(next.claimed, true); assert.equal(next.job.expiresAt, first.job.expiresAt);
    assert.deepEqual(next.job.frozenBundle, first.job.frozenBundle);
  }
  f.clock("2026-09-28T10:03:03.000Z");
  await assert.rejects(claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest), {code: "resource-exhausted"});
  assert.equal(f.db.docs.get(`salesOutreachJobs/${first.job.jobId}`)?.attemptCount, 3);
  assert.equal([...f.db.docs.keys()].some((key) => key.startsWith("salesOutreachDrafts/")), false);
});

test("participant completed claim and status replay reject deleted, foreign or edited artifacts", async () => {
  const f = await participantJobWithResult();
  const finished = await completePartnerDraftJob(f.partnerDeps, f.principal, f.job, f.saved);
  const again = await claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest);
  assert.equal(again.claimed, false); assert.deepEqual(again.job.result, finished.result);
  const key = `salesOutreachDrafts/${f.saved.draftId}`;
  const stored = f.db.docs.get(key)!;
  for (const replacement of [null, {...stored, createdBy: "other-partner"},
    {...stored, draft: {...stored.draft as Record<string, unknown>, contentHash: "a".repeat(64)}}]) {
    if (replacement) f.db.docs.set(key, replacement); else f.db.docs.delete(key);
    await assert.rejects(claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest), {code: "failed-precondition"});
    await assert.rejects(getPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRead), {code: "failed-precondition"});
    f.db.docs.set(key, stored);
  }
  f.db.docs.set("salesIntelligenceClauses/capability-one", {...f.db.docs.get("salesIntelligenceClauses/capability-one"), revision: 2});
  await assert.rejects(claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest), {code: "aborted"});
  await assert.rejects(getPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRead), {code: "aborted"});
});

test("participant completion rechecks lease expiry after awaited final authorization", async () => {
  const f = await participantJobWithResult();
  const key = `salesOutreachDrafts/${f.saved.draftId}`;
  const originalGet = f.db.docs.get.bind(f.db.docs);
  let readArtifact = false;
  f.db.docs.get = (path) => {
    if (path === key) readArtifact = true; return originalGet(path);
  };
  const auth = f.partnerDeps.checkAuth;
  f.partnerDeps.checkAuth = async (...args) => {
    await auth(...args);
    if (readArtifact) {
      await Promise.resolve(); f.clock("2026-09-28T10:01:01.000Z");
    }
  };
  await assert.rejects(completePartnerDraftJob(f.partnerDeps, f.principal, f.job, f.saved), {code: "aborted"});
  assert.equal(f.db.docs.get(`salesOutreachJobs/${f.job.jobId}`)?.status, "running");
});

test("participant transaction retry rechecks a revoked assignment and commits no initial claim", async () => {
  const f = partnerFixture();
  f.db.runTransaction = async <T>(callback: (tx: MemoryTx) => Promise<T>): Promise<T> => {
    await callback(new MemoryTx(f.db)); // First attempt is deliberately discarded.
    f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), status: "revoked"});
    const retry = new MemoryTx(f.db); const result = await callback(retry); retry.commit(); return result;
  };
  await assert.rejects(claimPartnerDraftJob(f.partnerDeps, f.principal, partnerJobRequest), {code: "permission-denied"});
  assert.equal([...f.db.docs.keys()].some((key) => key.startsWith("salesOutreachJobs/")), false);
});


test("actual partner runs the shared zero-model workflow with one own result and interrupted replay", async () => {
  const f = partnerFixture();
  const first = await generatePartnerOutreachDraft(f.partnerDeps, f.principal, partnerJobRequest);
  assert.equal(first.status, "completed"); assert.equal(first.idempotentReplay, false);
  const again = await generatePartnerOutreachDraft(f.partnerDeps, f.principal, partnerJobRequest);
  assert.deepEqual(again.result, first.result); assert.equal(again.idempotentReplay, true);
  const key = `salesOutreachJobs/${jobIdFor(f.principal.uid, sampleRequest.requestId)}`;
  const committed = f.db.docs.get(key)!;
  f.db.docs.set(key, {...committed, status: "running", result: null,
    leaseOwner: "interrupted-partner-worker", leaseUntil: "2026-09-28T10:01:00.000Z"});
  f.clock("2026-09-28T10:01:01.000Z");
  const recovered = await generatePartnerOutreachDraft(f.partnerDeps, f.principal, partnerJobRequest);
  assert.deepEqual(recovered.result, first.result);
  assert.equal([...f.db.docs.keys()].filter((path) => path.startsWith("salesOutreachDrafts/")).length, 1);
  const row = [...f.db.docs.entries()].find(([path]) => path.startsWith("salesOutreachDrafts/"))![1];
  assert.equal(row.createdBy, f.principal.uid); assert.equal(row.status, "pending_review");
  assert.equal((row.draft as {sendAuthority: boolean}).sendAuthority, false);
});


test("partner preparation callable payloads reject identity, provider, send and malformed source parameters", () => {
  const target = {organizerId: "org-one", expectedAssignmentRevision: 2, draftId: "draft-own"};
  const rows: Array<[import("ajv").ValidateFunction, Record<string, unknown>]> = [
    [validateGenerateSalesPartnerOutreachCallablePayload, partnerJobRequest],
    [validateGetSalesPartnerOutreachJobCallablePayload, partnerJobRead],
    [validateGetSalesPartnerOutreachDraftCallablePayload, target],
    [validateReviewSalesPartnerOutreachDraftCallablePayload, {...target, requestId: "review-own", expectedContentHash: "a".repeat(64), factualValidity: "verified", tone: "approved", channelReadiness: "manual_copy_only"}],
    [validateCopySalesPartnerOutreachDraftCallablePayload, {...target, requestId: "copy-own", expectedContentHash: "a".repeat(64)}],
    [validateRecordSalesPartnerManualSendCallablePayload, {...target, requestId: "manual-own", expectedContentHash: "a".repeat(64), channel: "email", occurredAt: started, attestation: "i_manually_sent_this_reviewed_draft"}],
    [validateGetSalesPartnerPreparationCallablePayload, {organizerId: target.organizerId, expectedAssignmentRevision: target.expectedAssignmentRevision}],
  ];
  for (const [validator, data] of rows) {
    assert.equal(validator(data), true);
    for (const field of ["actorUid", "apiKey", "send", "providerConfirmed", "publicationAuthority"]) {
      assert.throws(() => validateCallableWithAjv({data: {...data, [field]: true}} as CallableRequest<unknown>, validator), {code: "invalid-argument"});
    }
    assert.equal(validator({...data, expectedAssignmentRevision: 0}), false);
  }
  assert.equal(validateGenerateSalesPartnerOutreachCallablePayload({...partnerJobRequest,
    sourceRequest: {...sampleRequest.sourceRequest, prose: "Unreviewed proof"}}), false);
  assert.equal(validateGenerateSalesPartnerOutreachCallablePayload({...partnerJobRequest,
    sourceRequest: {...sampleRequest.sourceRequest, observationIds: Array(13).fill("observation-one")}}), false);
});

test("partner callable Auth resolution rejects disabled, revoked, missing and malformed sessions", async () => {
  const authTime = Math.floor(Date.parse(started) / 1000);
  const request = {data: {}, auth: {uid: "partner-one", token: {auth_time: authTime}}} as unknown as CallableRequest<unknown>;
  const user = {uid: "partner-one", disabled: false, customClaims: {}, tokensValidAfterTime: started} as unknown as import("firebase-admin").auth.UserRecord;
  assert.deepEqual(await currentPartnerActor(request, async () => user), {uid: "partner-one", roles: []});
  await assert.rejects(currentPartnerActor(request, async () => ({...user, disabled: true, toJSON: () => ({})})), {code: "permission-denied"});
  await assert.rejects(currentPartnerActor(request, async () => ({...user, tokensValidAfterTime: "2026-09-28T10:00:01.000Z", toJSON: () => ({})})), {code: "permission-denied"});
  await assert.rejects(currentPartnerActor({...request, auth: {...request.auth!, token: {...request.auth!.token, auth_time: "stale"}}} as unknown as CallableRequest<unknown>, async () => user), {code: "permission-denied"});
  await assert.rejects(currentPartnerActor(request, async () => {
    throw new Error("deleted Auth user");
  }), /deleted Auth user/u);
});

async function manualSendFixture(approve = true) {
  const f = partnerFixture();
  f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), channel: "email"});
  const generated = await generatePartnerOutreachDraft(f.partnerDeps, f.principal, partnerJobRequest);
  const draftId = String((generated.result as {draftId: string}).draftId);
  const stored = f.db.docs.get(`salesOutreachDrafts/${draftId}`)!;
  const draft = stored.draft as Record<string, unknown>;
  const target = {organizerId: "org-one", draftId, expectedAssignmentRevision: 2, expectedContentHash: draft.contentHash};
  if (approve) {
    await reviewPartnerOutreachDraft(f.partnerDeps, f.principal, {...target,
      requestId: "manual-review", factualValidity: "verified", tone: "approved", channelReadiness: "manual_copy_only"});
  }
  return {...f, target, payload: {...target, requestId: "manual-send", channel: "email",
    occurredAt: started, attestation: "i_manually_sent_this_reviewed_draft"}};
}

test("partner manual-send records only a truthful attestation once and supports exact recovery", async () => {
  const f = await manualSendFixture();
  const first = await recordPartnerManualSend(f.partnerDeps, f.principal, f.payload);
  assert.equal(first.outcome, "actor_attested_sent");
  assert.equal(first.providerConfirmed, false); assert.equal(first.sendAuthority, false);
  assert.deepEqual(await recordPartnerManualSend(f.partnerDeps, f.principal, f.payload), first);
  assert.deepEqual(await recordPartnerManualSend(f.partnerDeps, f.principal,
    {...f.payload, requestId: "another-exact-manual"}), first);
  const activities = [...f.db.docs.entries()].filter(([key]) => key.startsWith("salesActivities/"));
  assert.equal(activities.length, 1); assert.equal(activities[0][1].actorUid, f.principal.uid);
  assert.equal(validateSalesActivityDocument(activities[0][1]), true);
  f.clock("2026-09-28T10:01:00.000Z");
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal,
    {...f.payload, requestId: "different-manual", occurredAt: "2026-09-28T10:00:30.000Z"}), {code: "already-exists"});
});

test("partner manual-send rejects unreviewed, wrong channel, time, content and foreign actor", async () => {
  const pending = await manualSendFixture(false);
  await assert.rejects(recordPartnerManualSend(pending.partnerDeps, pending.principal, pending.payload), {code: "failed-precondition"});
  const f = await manualSendFixture();
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal,
    {...f.payload, attestation: "provider_sent"}), {code: "invalid-argument"});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal,
    {...f.payload, channel: "whatsapp"}), {code: "failed-precondition"});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal,
    {...f.payload, occurredAt: "2026-09-28T09:59:59.000Z"}), {code: "failed-precondition"});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal,
    {...f.payload, occurredAt: "2026-09-28T10:00:01.000Z"}), {code: "invalid-argument"});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, {uid: "other-partner", roles: []}, f.payload), {code: "permission-denied"});
  const path = `salesOutreachDrafts/${f.target.draftId}`;
  const stored = f.db.docs.get(path)!;
  f.db.docs.set(path, {...stored, draft: {...stored.draft as object, text: "Fabricated proof"}});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal, f.payload), {code: "failed-precondition"});
  assert.equal([...f.db.docs.keys()].filter((key) => key.startsWith("salesActivities/")).length, 0);
});

test("manual-send replay rechecks source, assignment and immutable own activity", async () => {
  const f = await manualSendFixture();
  const saved = await recordPartnerManualSend(f.partnerDeps, f.principal, f.payload);
  const activityPath = `salesActivities/${saved.activityId}`;
  const activity = f.db.docs.get(activityPath)!;
  f.db.docs.set(activityPath, {...activity, actorUid: "employee-one"});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal, f.payload), {code: "failed-precondition"});
  f.db.docs.set(activityPath, activity);
  f.db.docs.set("salesIntelligenceClauses/capability-one", {...f.db.docs.get("salesIntelligenceClauses/capability-one"), revision: 2});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal, f.payload), {code: "aborted"});
  f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), status: "revoked"});
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal, f.payload), {code: "permission-denied"});
});

test("manual-send transaction retry rechecks revoked access without committing its first attempt", async () => {
  const f = await manualSendFixture();
  const receiptsBefore = [...f.db.docs.keys()].filter((key) => key.startsWith("salesIntelligenceReceipts/")).length;
  f.db.runTransaction = async <T>(callback: (tx: MemoryTx) => Promise<T>): Promise<T> => {
    await callback(new MemoryTx(f.db));
    f.db.docs.set("salesPartnerAssignments/org-one", {...f.db.docs.get("salesPartnerAssignments/org-one"), status: "revoked"});
    const retry = new MemoryTx(f.db); const result = await callback(retry); retry.commit(); return result;
  };
  await assert.rejects(recordPartnerManualSend(f.partnerDeps, f.principal, f.payload), {code: "permission-denied"});
  assert.equal([...f.db.docs.keys()].filter((key) => key.startsWith("salesActivities/")).length, 0);
  assert.equal([...f.db.docs.keys()].filter((key) => key.startsWith("salesIntelligenceReceipts/")).length, receiptsBefore);
});

function preparationFixture() {
  const f = partnerFixture();
  const relationshipPath = `salesContactRelationships/${salesRelationshipId("org-one", "contact-one")}`;
  f.db.docs.set(relationshipPath, {...f.db.docs.get(relationshipPath),
    relationshipId: salesRelationshipId("org-one", "contact-one"), endpoints: [{value: "private@example.test"}],
    contactabilityReason: "Private employee assessment", updatedBy: "staff-private-uid"});
  f.db.docs.set("salesContacts/contact-one", {...f.db.docs.get("salesContacts/contact-one"), displayName: "Synthetic contact"});
  f.db.docs.set("organizerSalesAccounts/org-one", {...f.db.docs.get("organizerSalesAccounts/org-one"), summary: "Private staff summary"});
  return {...f, target: {organizerId: "org-one", expectedAssignmentRevision: 2},
    owner: {uid: "owner-one", roles: ["adminOwner"]}};
}

test("preparation keeps private evidence, staff context and contact endpoints outside partner projection", async () => {
  const f = preparationFixture();
  f.db.docs.set("salesEvidence/observation-evidence", {...f.db.docs.get("salesEvidence/observation-evidence"),
    sourceRef: "https://private.example.test/contract?signature=SECRET", excerpt: "Confidential first-party contract"});
  const result = await getPartnerPreparation(f.partnerDeps, f.principal, f.target);
  const clauses = result.clauses as Array<{evidence: unknown[]}>;
  assert.equal(clauses.length, 3); assert.ok(clauses.every((row) => row.evidence.length === 0));
  for (const secret of ["SECRET", "Confidential", "Private staff", "Private employee", "private@example", "staff-private-uid", "owner-one"]) {
    assert.ok(!JSON.stringify(result).includes(secret));
  }
  const ajv = new Ajv({strict: false}); addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(path.resolve(__dirname,
    "../../../../contracts/callable_responses/get_sales_partner_preparation_response.schema.json"), "utf8")));
  assert.equal(validate(result), true, JSON.stringify(validate.errors));
  await assert.rejects(getPartnerPreparation(f.partnerDeps, {uid: "other-partner", roles: []}, f.target), {code: "permission-denied"});
  await assert.rejects(getPartnerPreparation(f.partnerDeps, f.principal,
    {...f.target, expectedAssignmentRevision: 3}), {code: "aborted"});
});

test("only explicit owner-reviewed exact public citations reach assigned partners", async () => {
  const f = preparationFixture();
  const clausePath = "salesIntelligenceClauses/observation-one";
  const sourcePath = "salesEvidence/observation-evidence";
  f.db.docs.set(clausePath, {...f.db.docs.get(clausePath), state: "draft"});
  f.db.docs.set(sourcePath, {...f.db.docs.get(sourcePath), sourceType: "public_web",
    sourceRef: "https://public.example.test/events", excerpt: "Public applications page"});
  const catalog = await getIntelligenceCatalog(f.deps, f.owner, {organizerId: "org-one"});
  const clause = (catalog.clauses as Array<{clauseId: string; partnerCitationOptions: Array<{evidenceId: string; sourceHash: string}>}>).find((row) => row.clauseId === "observation-one")!;
  const grant = clause.partnerCitationOptions[0]; assert.ok(grant);
  assert.equal(validateAdminGetSalesIntelligenceCatalogResponse(catalog), true,
    JSON.stringify(validateAdminGetSalesIntelligenceCatalogResponse.errors));
  const invalidCatalog = structuredClone(catalog);
  const invalidClause = (invalidCatalog.clauses as Array<{partnerCitationOptions: Array<Record<string, unknown>>}>).find((row) => row.partnerCitationOptions.length)!;
  invalidClause.partnerCitationOptions[0].staffNote = "must not cross the response boundary";
  assert.equal(validateAdminGetSalesIntelligenceCatalogResponse(invalidCatalog), false);
  const review = {requestId: "public-citation-review", clauseId: "observation-one", expectedRevision: 1,
    decision: "approve", partnerCitations: [{evidenceId: grant.evidenceId, sourceHash: grant.sourceHash}]};
  await assert.rejects(reviewIntelligenceClause(f.deps, actor, review), {code: "permission-denied"});
  await reviewIntelligenceClause(f.deps, f.owner, review);
  const result = await getPartnerPreparation(f.partnerDeps, f.principal, f.target);
  const observation = (result.clauses as Array<{clauseId: string; evidence: Array<{sourceRef: string; excerpt: string}>}>).find((row) => row.clauseId === "observation-one")!;
  assert.equal(observation.evidence.length, 1); assert.equal(observation.evidence[0].excerpt, "Public applications page");
  assert.ok(!JSON.stringify(result).includes("reviewedBy"));
  f.db.docs.set(sourcePath, {...f.db.docs.get(sourcePath), excerpt: "Changed unreviewed source text"});
  const changed = await getPartnerPreparation(f.partnerDeps, f.principal, f.target);
  assert.equal((changed.clauses as Array<{clauseId: string; evidence: unknown[]}>).find((row) => row.clauseId === "observation-one")!.evidence.length, 0);
});

test("citation approval rejects confidential provenance, token URLs and changed source fingerprints", async () => {
  for (const source of [{sourceType: "first_party", sourceRef: "https://private.example.test/doc"},
    {sourceType: "public_web", sourceRef: "https://public.example.test/doc?token=SECRET"},
    {sourceType: "public_web", sourceRef: "https://public.example.test/doc"}]) {
    const f = preparationFixture();
    f.db.docs.set("salesIntelligenceClauses/observation-one", {...f.db.docs.get("salesIntelligenceClauses/observation-one"), state: "draft"});
    f.db.docs.set("salesEvidence/observation-evidence", {...f.db.docs.get("salesEvidence/observation-evidence"), ...source, excerpt: "Original source"});
    await assert.rejects(reviewIntelligenceClause(f.deps, f.owner, {requestId: "reject-citation-review", clauseId: "observation-one",
      expectedRevision: 1, decision: "approve", partnerCitations: [{evidenceId: "observation-evidence", sourceHash: "a".repeat(64)}]}),
    {code: source.sourceType === "first_party" || source.sourceRef.includes("?") ? "failed-precondition" : "aborted"});
    assert.equal(f.db.docs.get("salesIntelligenceClauses/observation-one")?.state, "draft");
    assert.equal([...f.db.docs.keys()].filter((key) => key.startsWith("salesIntelligenceReceipts/")).length, 0);
  }
});

test("preparation drops evidence and contacts expiring during final authorization and denies revoked retries", async () => {
  const f = preparationFixture();
  for (const key of ["salesEvidence/observation-evidence", "salesEvidence/contact-evidence"]) {
    f.db.docs.set(key, {...f.db.docs.get(key), validThrough: "2026-09-28T10:00:01.000Z"});
  }
  const originalGet = f.db.docs.get.bind(f.db.docs); let contactRead = false;
  f.db.docs.get = (key) => {
    if (key === "salesContacts/contact-one") contactRead = true; return originalGet(key);
  };
  const auth = f.partnerDeps.checkAuth;
  f.partnerDeps.checkAuth = async (...args) => {
    await auth(...args); if (contactRead) f.clock("2026-09-28T10:00:02.000Z");
  };
  const result = await getPartnerPreparation(f.partnerDeps, f.principal, f.target);
  assert.equal((result.contacts as unknown[]).length, 0);
  assert.ok(!(result.clauses as Array<{clauseId: string}>).some((row) => row.clauseId === "observation-one"));
  const retry = preparationFixture();
  retry.db.runTransaction = async <T>(callback: (tx: MemoryTx) => Promise<T>): Promise<T> => {
    await callback(new MemoryTx(retry.db));
    retry.db.docs.set("salesPartnerAssignments/org-one", {...retry.db.docs.get("salesPartnerAssignments/org-one"), status: "revoked"});
    const tx = new MemoryTx(retry.db); const value = await callback(tx); tx.commit(); return value;
  };
  await assert.rejects(getPartnerPreparation(retry.partnerDeps, retry.principal, retry.target), {code: "permission-denied"});
});
