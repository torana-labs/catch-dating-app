/* eslint-disable max-len */
import {assertSalesMaterialPrivacyOpen} from "../sales/privacyBoundary";
import {assertSalesPrivacyOpen, assertSalesPrivacyOpenRead} from "../salesPrivacy/model";
import {invalidateFitQueueInTransaction} from "../salesFitQueue/service";
import {createAdminAuditLogInTransaction} from "../../platform/adminAudit";
import {hasCurrentDraftContact} from "../sales/suppression";
import {salesRelationshipId} from "../sales/records";
import {assertQualifiedByRuntimePolicy} from "../sales/qualificationPolicy";
import type {SalesPrincipal} from "../sales/types";
import {assertSalesStaffAccount, assertSalesStaffScope,
  isAssignedSalesStaff} from "../sales/staffAccess";
import {requireAssignment} from "../../partners/service";
import {expectRevision, type PartnerActor, type PartnerDeps} from "../../partners/model";
import {Assessment, Clause, IntelligencePolicy, ScoreSnapshot,
  currentReviewedEvidence, evaluateScore, fail, hash, id, iso, object, parsePolicy, requestId,
  revision, text, uniqueIds} from "./model";

export interface IntelligenceDeps {
  db: FirebaseFirestore.Firestore;
  now: () => Date;
  authorize: (principal: SalesPrincipal, owner: boolean) => Promise<void>;
}
const POLICY_REF = "salesIntelligencePolicies/current";
const MAX_EVIDENCE = 50;

function employee(principal: SalesPrincipal): void {
  if (principal.clientId || !principal.roles.some((role) =>
    role === "admin" || role === "adminOwner" || role === "salesStaff")) {
    fail("permission-denied", "An employee Sales role is required.");
  }
}
function owner(principal: SalesPrincipal): void {
  employee(principal);
  if (!principal.roles.includes("adminOwner")) {
    fail("permission-denied", "Admin Owner review is required.");
  }
}
function receiptId(principal: SalesPrincipal, action: string,
  request: string): string {
  return `intel-${hash([principal.uid, action, request]).slice(0, 32)}`;
}
function assessmentIdFor(organizerId: string, factorId: string): string {
  return `assess-${hash([organizerId, factorId]).slice(0, 32)}`;
}
async function mutate<T extends Record<string, unknown>>(
  deps: IntelligenceDeps, principal: SalesPrincipal, action: string,
  request: string, material: unknown, ownerOnly: boolean,
  apply: (tx: FirebaseFirestore.Transaction, now: string) => Promise<T>,
  replayGuard?: (tx: FirebaseFirestore.Transaction) => Promise<void>,
): Promise<T> {
  (ownerOnly ? owner : employee)(principal);
  return mutateAuthorized(deps, principal, action, request, material,
    {beforeTransaction: () => deps.authorize(principal, ownerOnly),
      inTransaction: () => deps.authorize(principal, ownerOnly)}, apply, replayGuard);
}

interface IntelligenceMutationAccess {
  beforeTransaction: () => Promise<void>;
  inTransaction: (tx: FirebaseFirestore.Transaction) => Promise<void>;
}
async function mutateAuthorized<T extends Record<string, unknown>>(
  deps: Pick<IntelligenceDeps, "db" | "now">, principal: SalesPrincipal,
  action: string, request: string, material: unknown,
  access: IntelligenceMutationAccess,
  apply: (tx: FirebaseFirestore.Transaction, now: string) => Promise<T>,
  replayGuard?: (tx: FirebaseFirestore.Transaction) => Promise<void>,
): Promise<T> {
  await access.beforeTransaction();
  const db = deps.db;
  const ref = db.collection("salesIntelligenceReceipts")
    .doc(receiptId(principal, action, request));
  const materialHash = hash([principal.uid, action, material]);
  return db.runTransaction(async (tx) => {
    await access.inTransaction(tx);
    await assertSalesMaterialPrivacyOpen(db, material, tx);
    const scoped = material as {clauseId?: string; draftId?: string};
    await assertSalesStaffScope(db, principal, tx);
    const accountId = (material as {organizerId?: string})?.organizerId;
    if (accountId) await assertSalesStaffAccount(db, principal, accountId, tx);
    if (scoped?.clauseId) {
      const clause = (await tx.get(db.collection("salesIntelligenceClauses").doc(scoped.clauseId))).data();
      if (isAssignedSalesStaff(principal)) {
        await assertSalesStaffAccount(db, principal, id(clause?.organizerId), tx);
      }
      await assertSalesMaterialPrivacyOpen(db, clause, tx);
    }
    if (scoped?.draftId) {
      const draft = (await tx.get(db.collection("salesOutreachDrafts").doc(scoped.draftId))).data();
      if (isAssignedSalesStaff(principal)) {
        await assertSalesStaffAccount(db, principal, id(draft?.organizerId), tx);
        if (draft?.participantScope) fail("permission-denied", "Partner drafts retain their separate authority.");
      }
      await assertSalesMaterialPrivacyOpen(db, draft, tx);
    }
    const existing = await tx.get(ref);
    if (existing.exists) {
      const data = existing.data();
      await assertSalesMaterialPrivacyOpen(db, data, tx);
      if (data?.materialHash !== materialHash || data?.actorUid !== principal.uid ||
          data?.action !== action) {
        return fail("already-exists", "Request ID belongs to different material.");
      }
      if (replayGuard) await replayGuard(tx);
      await access.inTransaction(tx);
      return data.result as T;
    }
    const now = deps.now().toISOString();
    await access.inTransaction(tx);
    const result = await apply(tx, now);
    tx.create(ref, {schemaVersion: 1, classification: "sales_private",
      receiptId: ref.id, actorUid: principal.uid, action, requestId: request,
      materialHash, result, createdAt: now});
    createAdminAuditLogInTransaction(tx, db, principal, {
      action: `salesIntelligence.${action}`,
      targetPath: "salesIntelligenceReceipts/" + ref.id,
      after: {receiptId: ref.id, materialHash},
    }, {docId: `sales_intelligence_${ref.id}`});
    return result;
  });
}

interface PartnerDraftScope {
  partnerUid: string; assignmentRevision: number; renderedDraftId: string;
}
function partnerDraftAccess(deps: PartnerDeps, actor: PartnerActor,
  organizerId: string, expectedAssignmentRevision: number,
  draftId?: string): IntelligenceMutationAccess {
  const expected = revision(expectedAssignmentRevision);
  return {beforeTransaction: () => deps.checkAuth(actor, false),
    inTransaction: async (tx) => {
      const assignment = await requireAssignment(deps, actor, tx, organizerId);
      expectRevision(assignment.revision, expected);
      if (!draftId) return;
      const stored = (await tx.get(deps.db.collection("salesOutreachDrafts").doc(draftId))).data();
      if (stored?.classification !== "sales_private" || stored.organizerId !== organizerId ||
          stored.createdBy !== actor.uid || stored.participantScope?.partnerUid !== actor.uid ||
          stored.participantScope?.assignmentRevision !== expected ||
          typeof stored.participantScope?.renderedDraftId !== "string" ||
          stored.draftId !== draftId || stored.draft?.draftId !== draftId ||
          draftId !== `draft-partner-${hash({organizerId, participantScope: stored.participantScope})}` ||
          stored.sourceRequest?.organizerId !== organizerId) {
        fail("permission-denied", "Current own assignment-bound draft is required.");
      }
    }};
}
function accountOk(row: FirebaseFirestore.DocumentData | undefined,
  organizerId: string): boolean {
  return row?.classification === "sales_private" &&
    row.organizerId === organizerId && row.researchStatus !== "archived" &&
    Number.isInteger(row.revision);
}
async function requireAccount(tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore, organizerId: string) {
  await assertSalesPrivacyOpen(tx, db, organizerId);
  const snap = await tx.get(db.collection("organizerSalesAccounts").doc(organizerId));
  if (!snap.exists || !accountOk(snap.data(), organizerId)) {
    return fail("not-found", "Private Sales account not found.");
  }
  return snap.data()!;
}
function requireCurrentPolicy(raw: FirebaseFirestore.DocumentData | undefined): IntelligencePolicy {
  if (!raw || raw.classification !== "sales_private" ||
      raw.policyRecordId !== "current" || !Number.isInteger(raw.revision)) {
    return fail("failed-precondition", "Versioned intelligence policy is unavailable.");
  }
  const policyRevision = raw.revision as number;
  const updatedAt = raw.updatedAt as string;
  const updatedBy = raw.updatedBy as string;
  const material = {policyId: raw.policyId, version: raw.version,
    status: raw.status, factors: raw.factors,
    priorityBands: raw.priorityBands,
    promptVersion: raw.promptVersion,
    playbookVersion: raw.playbookVersion};
  const parsed = parsePolicy(material);
  return {schemaVersion: 1, classification: "sales_private",
    policyRecordId: "current",
    revision: policyRevision, updatedAt, updatedBy, ...parsed};
}

export async function saveIntelligencePolicy(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown) {
  const input = object(payload, ["requestId", "expectedRevision", "policy"]);
  const request = requestId(input.requestId);
  const expectedRevision = revision(input.expectedRevision);
  const policy = parsePolicy(input.policy);
  return mutate(deps, principal, "policy.save", request,
    {expectedRevision, policy}, true, async (tx, now) => {
      const ref = deps.db.doc(POLICY_REF);
      const snap = await tx.get(ref);
      if (Number(snap.data()?.revision ?? 0) !== expectedRevision) {
        return fail("aborted", "Intelligence policy changed since review.");
      }
      const next: IntelligencePolicy = {schemaVersion: 1,
        classification: "sales_private", policyRecordId: "current", ...policy,
        revision: expectedRevision + 1, updatedAt: now,
        updatedBy: principal.uid};
      tx.set(ref, next);
      return {policy: next};
    });
}

export async function saveFactorAssessment(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown) {
  const input = object(payload, ["requestId", "organizerId", "factorId",
    "expectedRevision", "state", "value", "evidenceIds", "reason"]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const factorId = id(input.factorId);
  const expectedRevision = revision(input.expectedRevision);
  const state = input.state;
  const evidenceIds = uniqueIds(input.evidenceIds, 8);
  const value = input.value;
  const reason = input.reason === null ? null : text(input.reason, 240);
  if (!["known", "unknown", "disputed"].includes(String(state)) ||
      (state === "known" && (!Number.isInteger(value) || (value as number) < 0 ||
        (value as number) > 5 || evidenceIds.length === 0 || reason !== null)) ||
      (state !== "known" && (value !== null || !reason))) {
    return fail("invalid-argument", "Assessment needs reviewed evidence or an explicit gap.");
  }
  return mutate(deps, principal, "assessment.save", request,
    {organizerId, factorId, expectedRevision, state, value, evidenceIds, reason},
    false, async (tx, now) => {
      await requireAccount(tx, deps.db, organizerId);
      const policy = requireCurrentPolicy((await tx.get(deps.db.doc(POLICY_REF))).data());
      const factor = policy.factors.find((row) => row.id === factorId);
      if (!factor || policy.status !== "active") {
        return fail("failed-precondition", "Factor is not in the current policy.");
      }
      for (const evidenceId of evidenceIds) {
        const evidence = (await tx.get(deps.db.collection("salesEvidence").doc(evidenceId))).data();
        if (!currentReviewedEvidence(evidence, organizerId, now) ||
            !factor.claimKeys.includes(evidence?.claimKey) ||
            Date.parse(evidence?.observedAt) < Date.parse(now) -
              factor.maxAgeDays * 86_400_000) {
          return fail("failed-precondition", "Assessment source is not reviewed Sales evidence.");
        }
      }
      const assessmentId = assessmentIdFor(organizerId, factorId);
      const ref = deps.db.collection("salesIntelligenceAssessments").doc(assessmentId);
      if (Number((await tx.get(ref)).data()?.revision ?? 0) !== expectedRevision) {
        return fail("aborted", "Assessment changed since review.");
      }
      const assessment: Assessment = {schemaVersion: 1,
        classification: "sales_private", assessmentId, organizerId, factorId,
        revision: expectedRevision + 1, state: state as Assessment["state"],
        value: value as number | null, evidenceIds, reason,
        reviewedAt: now, reviewerUid: principal.uid};
      tx.set(ref, assessment);
      invalidateFitQueueInTransaction(tx, deps.db, organizerId, now);
      return {assessment};
    });
}

export async function getIntelligenceScore(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown): Promise<{snapshot: ScoreSnapshot}> {
  employee(principal);
  const input = object(payload, ["organizerId"]);
  const organizerId = id(input.organizerId);
  await assertSalesStaffAccount(deps.db, principal, organizerId);
  await deps.authorize(principal, false);
  const db = deps.db;
  const [accountSnap, policySnap, evidenceSnap] = await Promise.all([
    db.collection("organizerSalesAccounts").doc(organizerId).get(),
    db.doc(POLICY_REF).get(),
    db.collection("salesEvidence").where("organizerId", "==", organizerId).limit(MAX_EVIDENCE + 1).get(),
  ]);
  await deps.authorize(principal, false);
  if (!accountSnap.exists || !accountOk(accountSnap.data(), organizerId)) {
    return fail("not-found", "Private Sales account not found.");
  }
  if (evidenceSnap.size > MAX_EVIDENCE) {
    return fail("resource-exhausted", "Evidence must be curated before scoring.");
  }
  const policy = requireCurrentPolicy(policySnap.data());
  const assessments = await Promise.all(policy.factors.map((factor) =>
    db.collection("salesIntelligenceAssessments")
      .doc(assessmentIdFor(organizerId, factor.id)).get()));
  await deps.authorize(principal, false);
  const snapshot = evaluateScore(policy, organizerId,
    accountSnap.data()!.revision as number,
    assessments.filter((doc) => doc.exists).map((doc) => doc.data() as Assessment),
    evidenceSnap.docs.map((doc) => doc.data()), deps.now().toISOString());
  await assertSalesPrivacyOpenRead(db, organizerId);
  await assertSalesStaffAccount(db, principal, organizerId);
  return {snapshot};
}

/** Bounded, private current catalog for selecting reviewed evidence and prose. */
export async function getIntelligenceCatalog(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown): Promise<Record<string, unknown>> {
  employee(principal);
  const input = object(payload, ["organizerId"]);
  const organizerId = id(input.organizerId);
  await assertSalesStaffAccount(deps.db, principal, organizerId);
  await deps.authorize(principal, false);
  const db = deps.db;
  const [account, policySnap, clauseSnap] = await Promise.all([
    db.collection("organizerSalesAccounts").doc(organizerId).get(),
    db.doc(POLICY_REF).get(),
    db.collection("salesIntelligenceClauses")
      .where("organizerId", "==", organizerId).limit(51).get(),
  ]);
  await deps.authorize(principal, false);
  if (!accountOk(account.data(), organizerId)) {
    return fail("not-found", "Private Sales account not found.");
  }
  if (clauseSnap.size > 50) {
    return fail("resource-exhausted", "Private catalog needs curation before review.");
  }
  const policy = policySnap.exists ? requireCurrentPolicy(policySnap.data()) : null;
  const assessmentSnaps = policy ? await Promise.all(policy.factors.map((factor) =>
    db.collection("salesIntelligenceAssessments")
      .doc(assessmentIdFor(organizerId, factor.id)).get())) : [];
  await deps.authorize(principal, false);
  const assessments = assessmentSnaps.filter((doc) => doc.exists)
    .map((doc) => doc.data() as Assessment);
  const clauses = clauseSnap.docs.map((doc) => doc.data() as Clause);
  if (assessments.some((row) => row.classification !== "sales_private" ||
      row.organizerId !== organizerId ||
      (policy && !policy.factors.some((factor) => factor.id === row.factorId))) ||
      clauses.some((row) => row.classification !== "sales_private" ||
        row.organizerId !== organizerId)) {
    return fail("failed-precondition", "Private catalog contains invalid records.");
  }
  const citationOptions = new Map<string, Array<Record<string, unknown>>>();
  for (const clause of clauses) {
    const options = [];
    for (const evidenceId of uniqueIds(clause.evidenceIds, 8)) {
      const evidence = (await db.collection("salesEvidence").doc(evidenceId).get()).data();
      if (!currentReviewedEvidence(evidence, organizerId, deps.now().toISOString())) continue;
      try {
        const citation = publicPartnerCitation(evidence!, organizerId);
        options.push({...citation, sourceHash: hash(citation)});
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "failed-precondition")) throw error;
      }
    }
    citationOptions.set(clause.clauseId, options);
  }
  await deps.authorize(principal, false);
  await assertSalesPrivacyOpenRead(db, organizerId);
  await assertSalesStaffAccount(db, principal, organizerId);
  return {policy, assessments: assessments.map((row) => ({
    schemaVersion: 1, classification: "sales_private", assessmentId: row.assessmentId,
    organizerId: row.organizerId, factorId: row.factorId, revision: row.revision,
    state: row.state, value: row.value, evidenceIds: row.evidenceIds,
    reason: row.reason, reviewedAt: row.reviewedAt, reviewerUid: row.reviewerUid,
  })).sort((a, b) => a.factorId.localeCompare(b.factorId)),
  clauses: clauses.map((row) => ({schemaVersion: 1,
    classification: "sales_private", clauseId: row.clauseId,
    organizerId: row.organizerId, revision: row.revision, kind: row.kind,
    text: row.text, state: row.state, evidenceIds: row.evidenceIds,
    validUntil: row.validUntil, permission: row.permission,
    partnerCitations: row.partnerCitations ?? [],
    partnerCitationOptions: citationOptions.get(row.clauseId) ?? [],
    reviewedAt: row.reviewedAt, reviewedBy: row.reviewedBy,
    updatedAt: row.updatedAt, updatedBy: row.updatedBy,
  })).sort((a, b) => a.clauseId.localeCompare(b.clauseId)),
  evaluatedAt: deps.now().toISOString()};
}

/** An intentionally capped organizer list; full drafts require current-source get. */
export async function listOutreachDrafts(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown): Promise<Record<string, unknown>> {
  employee(principal);
  const input = object(payload, ["organizerId"]);
  const organizerId = id(input.organizerId);
  await assertSalesStaffAccount(deps.db, principal, organizerId);
  await deps.authorize(principal, false);
  const [account, draftsSnap] = await Promise.all([
    deps.db.collection("organizerSalesAccounts").doc(organizerId).get(),
    deps.db.collection("salesOutreachDrafts")
      .where("organizerId", "==", organizerId).limit(51).get(),
  ]);
  await deps.authorize(principal, false);
  if (!accountOk(account.data(), organizerId)) {
    return fail("not-found", "Private Sales account not found.");
  }
  if (draftsSnap.size > 50) {
    return fail("resource-exhausted", "Draft list needs curation before review.");
  }
  const rows = draftsSnap.docs.map((doc) => doc.data()).filter((row) =>
    !isAssignedSalesStaff(principal) || !row.participantScope);
  if (rows.some((row) => row.classification !== "sales_private" ||
      row.organizerId !== organizerId || typeof row.draftId !== "string" ||
      typeof row.draft?.contentHash !== "string" ||
      typeof row.createdAt !== "string")) {
    return fail("failed-precondition", "Private draft list contains invalid records.");
  }
  await deps.authorize(principal, false);
  await assertSalesStaffAccount(deps.db, principal, organizerId);
  return {rows: rows.map((row) => ({draftId: row.draftId,
    contactId: row.contactId, opportunityId: row.opportunityId,
    subject: row.draft.subject, status: row.status,
    contentHash: row.draft.contentHash, createdAt: row.createdAt,
    reviewedAt: row.reviewedAt})).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt) || a.draftId.localeCompare(b.draftId))};
}

export async function saveScoreSnapshot(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown) {
  const input = object(payload, ["requestId", "organizerId",
    "expectedAccountRevision", "expectedPolicyRevision"]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const expectedAccountRevision = revision(input.expectedAccountRevision);
  const expectedPolicyRevision = revision(input.expectedPolicyRevision);
  return mutate(deps, principal, "score.snapshot", request,
    {organizerId, expectedAccountRevision, expectedPolicyRevision},
    false, async (tx, now) => {
      const db = deps.db;
      const account = await requireAccount(tx, db, organizerId);
      const policy = requireCurrentPolicy((await tx.get(db.doc(POLICY_REF))).data());
      if (account.revision !== expectedAccountRevision ||
          policy.revision !== expectedPolicyRevision) {
        return fail("aborted", "Reviewed score sources changed.");
      }
      const [assessmentSnaps, evidence] = await Promise.all([
        Promise.all(policy.factors.map((factor) =>
          tx.get(db.collection("salesIntelligenceAssessments")
            .doc(assessmentIdFor(organizerId, factor.id))))),
        tx.get(db.collection("salesEvidence")
          .where("organizerId", "==", organizerId).limit(MAX_EVIDENCE + 1)),
      ]);
      if (evidence.size > MAX_EVIDENCE) {
        return fail("resource-exhausted", "Evidence must be curated before scoring.");
      }
      const snapshot = evaluateScore(policy, organizerId, account.revision,
        assessmentSnaps.filter((doc) => doc.exists)
          .map((doc) => doc.data() as Assessment),
        evidence.docs.map((doc) => doc.data()), now);
      tx.create(db.collection("salesIntelligenceScoreSnapshots")
        .doc(snapshot.snapshotId), snapshot);
      return {snapshot};
    });
}

export async function saveIntelligenceClause(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown) {
  const input = object(payload, ["requestId", "clauseId", "organizerId",
    "expectedRevision", "kind", "text", "evidenceIds", "validUntil",
    "permission"]);
  const request = requestId(input.requestId);
  const clauseId = id(input.clauseId);
  const organizerId = id(input.organizerId);
  const expectedRevision = revision(input.expectedRevision);
  const kind = input.kind;
  const sentence = text(input.text);
  const evidenceIds = uniqueIds(input.evidenceIds, 8);
  const validUntil = iso(input.validUntil);
  const permission = input.permission;
  if (!["observation", "capability", "reference", "cta"].includes(String(kind)) ||
      !["not_required", "private_mention", "withdrawn"].includes(String(permission)) ||
      (kind === "reference" && permission !== "private_mention") ||
      (kind !== "cta" && evidenceIds.length === 0)) {
    return fail("invalid-argument", "Invalid bounded clause source or permission.");
  }
  return mutate(deps, principal, "clause.save", request,
    {clauseId, organizerId, expectedRevision, kind, sentence,
      evidenceIds, validUntil, permission}, false, async (tx, now) => {
      await requireAccount(tx, deps.db, organizerId);
      if (Date.parse(validUntil) <= Date.parse(now)) {
        return fail("failed-precondition", "Clause expiry must be in the future.");
      }
      for (const evidenceId of evidenceIds) {
        const evidence = (await tx.get(deps.db.collection("salesEvidence").doc(evidenceId))).data();
        if (!currentReviewedEvidence(evidence, organizerId, now)) {
          return fail("failed-precondition", "Clause source is not current reviewed evidence.");
        }
      }
      const ref = deps.db.collection("salesIntelligenceClauses").doc(clauseId);
      const prior = (await tx.get(ref)).data();
      if (Number(prior?.revision ?? 0) !== expectedRevision ||
          (prior && prior.organizerId !== organizerId)) {
        return fail("aborted", "Clause changed since review.");
      }
      const clause: Clause = {schemaVersion: 1, classification: "sales_private",
        clauseId, organizerId, revision: expectedRevision + 1,
        kind: kind as Clause["kind"], text: sentence, state: "draft",
        evidenceIds, validUntil, permission: permission as Clause["permission"],
        reviewedAt: null, reviewedBy: null, updatedAt: now,
        updatedBy: principal.uid};
      tx.set(ref, clause);
      return {clause};
    });
}

export async function reviewIntelligenceClause(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown) {
  const input = object(payload, ["requestId", "clauseId", "expectedRevision",
    "decision", "partnerCitations"]);
  const request = requestId(input.requestId);
  const clauseId = id(input.clauseId);
  const expectedRevision = revision(input.expectedRevision);
  const decision = input.decision;
  if (input.partnerCitations !== undefined && (!Array.isArray(input.partnerCitations) || input.partnerCitations.length > 8)) {
    fail("invalid-argument", "Choose at most eight explicitly shared public citations.");
  }
  const partnerCitations = (input.partnerCitations as unknown[] | undefined ?? []).map((raw) => {
    const row = object(raw, ["evidenceId", "sourceHash"]);
    const sourceHash = text(row.sourceHash, 64);
    if (!/^[a-f0-9]{64}$/u.test(sourceHash)) fail("invalid-argument", "Exact public citation fingerprint is required.");
    return {evidenceId: id(row.evidenceId), sourceHash};
  });
  if (new Set(partnerCitations.map((row) => row.evidenceId)).size !== partnerCitations.length ||
      (decision === "withdraw" && partnerCitations.length)) {
    fail("invalid-argument", "A withdrawal cannot grant citations; choose each public source once.");
  }
  if (decision !== "approve" && decision !== "withdraw") {
    return fail("invalid-argument", "Explicit clause decision required.");
  }
  return mutate(deps, principal, "clause.review", request,
    {clauseId, expectedRevision, decision,
      ...(input.partnerCitations !== undefined ? {partnerCitations} : {})}, true, async (tx, now) => {
      const ref = deps.db.collection("salesIntelligenceClauses").doc(clauseId);
      const prior = (await tx.get(ref)).data() as Clause | undefined;
      if (!prior || prior.classification !== "sales_private") {
        return fail("not-found", "Clause not found.");
      }
      if (prior.revision !== expectedRevision) {
        return fail("aborted", "Clause changed since review.");
      }
      if (decision === "approve" && (prior.state !== "draft" ||
          prior.permission === "withdrawn" || Date.parse(prior.validUntil) <= Date.parse(now))) {
        return fail("failed-precondition", "Clause is not eligible for approval.");
      }
      await requireAccount(tx, deps.db, prior.organizerId);
      if (partnerCitations.some((row) => !prior.evidenceIds.includes(row.evidenceId))) {
        fail("invalid-argument", "Only this clause's linked evidence can be shared.");
      }
      const evidenceDeadlines = [];
      for (const evidenceId of prior.evidenceIds) {
        const evidence = (await tx.get(deps.db.collection("salesEvidence").doc(evidenceId))).data();
        if (!currentReviewedEvidence(evidence, prior.organizerId, now)) {
          return fail("failed-precondition", "Reviewed clause source changed.");
        }
        if (evidence?.validThrough) evidenceDeadlines.push(Date.parse(evidence.validThrough));
        const grant = partnerCitations.find((row) => row.evidenceId === evidenceId);
        if (grant && hash(publicPartnerCitation(evidence!, prior.organizerId)) !== grant.sourceHash) {
          fail("aborted", "Public citation changed since sharing review.");
        }
      }
      await deps.authorize(principal, true);
      const reviewedAt = deps.now().toISOString();
      if (decision === "approve" && (Date.parse(prior.validUntil) <= Date.parse(reviewedAt) ||
          evidenceDeadlines.some((deadline) => deadline <= Date.parse(reviewedAt)))) {
        fail("failed-precondition", "Clause or citation expired during owner review.");
      }
      const clause: Clause = {...prior, revision: prior.revision + 1,
        state: decision === "approve" ? "approved" : "withdrawn",
        partnerCitations, reviewedAt, reviewedBy: principal.uid,
        updatedAt: reviewedAt, updatedBy: principal.uid};
      tx.set(ref, clause);
      return {clause};
    });
}

export async function buildOutreachInput(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown,
  tx?: FirebaseFirestore.Transaction): Promise<Record<string, unknown>> {
  employee(principal);
  return buildOutreachInputCore(deps, payload, {
    authorize: async (readTx) => {
      await deps.authorize(principal, false);
      await assertSalesStaffAccount(deps.db, principal,
        id((payload as {organizerId?: unknown}).organizerId), readTx);
      return null;
    },
  }, tx);
}

/** Partner composition consumes approved platform clauses, never employee access. */
export async function buildPartnerOutreachInput(deps: PartnerDeps,
  actor: PartnerActor, payload: unknown, expectedAssignmentRevision: number,
  tx?: FirebaseFirestore.Transaction): Promise<Record<string, unknown>> {
  const expected = revision(expectedAssignmentRevision);
  const input = object(payload, ["organizerId", "contactId", "opportunityId",
    "observationIds", "capabilityIds", "referenceIds", "ctaIds",
    "channel", "purpose", "priorActivityId"]);
  const organizerId = id(input.organizerId);
  return buildOutreachInputCore(deps, input, {
    priorActivityActorUid: actor.uid,
    authorize: async (readTx) => {
      const assignment = await requireAssignment(deps, actor, readTx, organizerId);
      expectRevision(assignment.revision, expected);
      return {organizerId, partnerUid: actor.uid, assignmentRevision: assignment.revision};
    },
  }, tx);
}

interface OutreachSourceAccess {
  authorize: (tx: FirebaseFirestore.Transaction) => Promise<Record<string, unknown> | null>;
  priorActivityActorUid?: string;
}

async function buildOutreachInputCore(deps: Pick<IntelligenceDeps, "db" | "now">,
  payload: unknown, access: OutreachSourceAccess,
  tx?: FirebaseFirestore.Transaction): Promise<Record<string, unknown>> {
  if (!tx) {
    return deps.db.runTransaction((readTx) =>
      buildOutreachInputCore(deps, payload, access, readTx));
  }
  const input = object(payload, ["organizerId", "contactId", "opportunityId",
    "observationIds", "capabilityIds", "referenceIds", "ctaIds",
    "channel", "purpose", "priorActivityId"]);
  const organizerId = id(input.organizerId);
  const contactId = id(input.contactId);
  const opportunityId = id(input.opportunityId);
  const observationIds = uniqueIds(input.observationIds, 12);
  const capabilityIds = uniqueIds(input.capabilityIds, 12);
  const referenceIds = uniqueIds(input.referenceIds, 8);
  const ctaIds = uniqueIds(input.ctaIds, 8);
  if (observationIds.length < 1 || capabilityIds.length < 1 || ctaIds.length < 1 ||
      !["email", "message"].includes(String(input.channel)) ||
      !["first_message", "follow_up"].includes(String(input.purpose)) ||
      (input.purpose === "follow_up" && !input.priorActivityId) ||
      (input.purpose === "first_message" && input.priorActivityId)) {
    return fail("invalid-argument", "A grounded outreach purpose and clauses are required.");
  }
  const authorizationScope = await access.authorize(tx);
  const db = deps.db;
  await assertSalesPrivacyOpen(tx, db, organizerId);
  const read = (ref: FirebaseFirestore.DocumentReference) =>
    tx ? tx.get(ref) : ref.get();
  const now = deps.now().toISOString();
  const clauseIds = [...observationIds, ...capabilityIds, ...referenceIds, ...ctaIds];
  if (new Set(clauseIds).size !== clauseIds.length) {
    return fail("invalid-argument", "Clause IDs must be unique across kinds.");
  }
  const [accountSnap, contactSnap, relationshipSnap, opportunitySnap,
    policySnap, ...clauseSnaps] = await Promise.all([
    read(db.collection("organizerSalesAccounts").doc(organizerId)),
    read(db.collection("salesContacts").doc(contactId)),
    read(db.collection("salesContactRelationships")
      .doc(salesRelationshipId(organizerId, contactId))),
    read(db.collection("salesOpportunities").doc(opportunityId)),
    read(db.doc(POLICY_REF)),
    ...clauseIds.map((clauseId) => read(db.collection("salesIntelligenceClauses").doc(clauseId))),
  ]);
  const account = accountSnap.data();
  const contact = contactSnap.data();
  const relationship = relationshipSnap.data();
  const opportunity = opportunitySnap.data();
  const policy = requireCurrentPolicy(policySnap.data());
  const draftContact = await hasCurrentDraftContact(db, organizerId, contactId, now, tx);
  await access.authorize(tx);
  if (!accountOk(account, organizerId) || account?.suppressionStatus !== "clear" ||
      account.duplicateReviewRequired || account.researchStatus !== "qualified" ||
      !account.qualificationPolicy || !contact ||
      contact.classification !== "sales_private" ||
      relationship?.classification !== "sales_private" ||
      opportunity?.classification !== "sales_private" ||
      opportunity.organizerId !== organizerId || !draftContact ||
      policy.status !== "active") {
    return fail("failed-precondition", "Current Sales identity or contact review blocks drafting.");
  }
  const qualification = await assertQualifiedByRuntimePolicy(
    tx, db, organizerId, now);
  if (hash(qualification) !== hash(account.qualificationPolicy)) {
    return fail("failed-precondition", "Sales qualification policy changed since review.");
  }
  // Qualification and contactability can remain eligible after an evidence
  // edit. Bind the draft to the complete bounded current evidence set too.
  const allEvidence = await tx.get(db.collection("salesEvidence")
    .where("organizerId", "==", organizerId).limit(MAX_EVIDENCE + 1));
  if (allEvidence.size > MAX_EVIDENCE) {
    return fail("resource-exhausted", "Evidence must be curated before drafting.");
  }
  const clauses = clauseSnaps.map((snap) => snap.data() as Clause | undefined);
  const sourceEvidence: Array<Record<string, unknown>> = [];
  const expectedKinds = [
    ...observationIds.map(() => "observation"),
    ...capabilityIds.map(() => "capability"),
    ...referenceIds.map(() => "reference"),
    ...ctaIds.map(() => "cta"),
  ];
  for (let index = 0; index < clauses.length; index++) {
    const clause = clauses[index];
    if (!clause || clause.organizerId !== organizerId ||
        clause.kind !== expectedKinds[index] || clause.state !== "approved" ||
        clause.permission === "withdrawn" ||
        (clause.kind === "reference" && clause.permission !== "private_mention") ||
        Date.parse(clause.validUntil) <= Date.parse(now)) {
      return fail("failed-precondition", "Approved clause is no longer eligible.");
    }
    for (const evidenceId of clause.evidenceIds) {
      const evidence = (await read(db.collection("salesEvidence").doc(evidenceId))).data();
      if (!currentReviewedEvidence(evidence, organizerId, now)) {
        return fail("failed-precondition", "Clause evidence is not current.");
      }
      sourceEvidence.push({evidenceId, claimKey: evidence?.claimKey,
        sourceRef: evidence?.sourceRef, observedAt: evidence?.observedAt,
        validThrough: evidence?.validThrough, reviewedAt: evidence?.reviewedAt,
        reviewerUid: evidence?.reviewerUid,
        normalizedValue: evidence?.normalizedValue, excerpt: evidence?.excerpt});
    }
  }
  const prior = input.priorActivityId ?
    (await read(db.collection("salesActivities").doc(id(input.priorActivityId)))).data() : null;
  if (input.priorActivityId && (prior?.organizerId !== organizerId ||
      prior?.opportunityId !== opportunityId)) {
    return fail("failed-precondition", "Prior interaction does not match this opportunity.");
  }
  if (prior && access.priorActivityActorUid &&
      (prior.actorUid !== access.priorActivityActorUid ||
       prior.type !== "outreach_sent_manual" || prior.outcome !== "actor_attested_sent" ||
       prior.providerConfirmed !== false)) {
    return fail("permission-denied", "Partner follow-up requires their own manually attested interaction.");
  }
  const make = (ids: string[]) => ids.map((clauseId) => {
    const clause = clauses[clauseIds.indexOf(clauseId)]!;
    return {id: clause.clauseId, text: clause.text, revision: clause.revision,
      organizerId, approved: true, validUntil: clause.validUntil};
  });
  const bundle = {schemaVersion: 1,
    organizer: {organizerId, name: account.name, revision: account.revision,
      identityStatus: "verified"},
    contact: {contactId, revision: relationship.revision,
      role: relationship.role, eligibility: "eligible",
      suppressionStatus: "clear", claimStatus: "not_required"},
    opportunity: {opportunityId, revision: opportunity.revision,
      stage: opportunity.stage, motion: opportunity.motion},
    language: "en", channel: input.channel, purpose: input.purpose,
    evaluatedAt: now, evidenceConflictStatus: "clear",
    policy: {promptVersion: policy.promptVersion,
      playbookVersion: policy.playbookVersion, modelId: "disabled"},
    observations: make(observationIds), capabilities: make(capabilityIds),
    references: make(referenceIds),
    ctas: ctaIds.map((clauseId) => {
      const clause = clauses[clauseIds.indexOf(clauseId)]!;
      return {id: clause.clauseId, text: clause.text, revision: clause.revision};
    }),
    priorInteraction: prior ? {activityId: id(input.priorActivityId),
      summary: prior.note, revision: 0} : null};
  await access.authorize(tx);
  return {bundle, sourceHash: hash({material: materialBundle(bundle),
    ...(authorizationScope ? {participantScope: authorizationScope} : {}),
    intelligencePolicy: policy,
    contactRecordRevision: contact.revision,
    allEvidence: allEvidence.docs.map((doc) => ({id: doc.id,
      data: doc.data()})).sort((a, b) => a.id.localeCompare(b.id)),
    sourceEvidence: sourceEvidence.sort((a, b) =>
      String(a.evidenceId).localeCompare(String(b.evidenceId)))}),
  sendAuthority: false};
}

export interface DraftRequest {
  organizerId: string; contactId: string; opportunityId: string;
  observationIds: string[]; capabilityIds: string[]; referenceIds: string[];
  ctaIds: string[]; channel: "email" | "message";
  purpose: "first_message" | "follow_up"; priorActivityId?: string;
}
interface RenderedDraft {
  draftId: string; organizerId: string; contactId: string;
  opportunityId: string; inputHash: string; contentHash: string;
  subject: string | null; text: string; sentences: Array<{
    text: string; kind: string; sourceIds: string[]}>;
  sourceRevisions: Record<string, number>; sendAuthority: false;
  reviewStatus: "pending_review";
}
function materialBundle(bundle: Record<string, unknown>): string {
  const rest = {...bundle};
  delete rest.evaluatedAt;
  return hash(rest);
}
function checkedDraft(value: unknown, bundle: Record<string, unknown>): RenderedDraft {
  const row = object(value, ["schemaVersion", "draftId", "organizerId",
    "contactId", "opportunityId", "language", "channel", "subject",
    "text", "sentences", "selection", "inputHash", "contentHash",
    "sourceRevisions", "model", "reviewStatus", "sendAuthority"]);
  const organizer = bundle.organizer as Record<string, unknown>;
  const contact = bundle.contact as Record<string, unknown>;
  const opportunity = bundle.opportunity as Record<string, unknown>;
  const expected = [
    ...(bundle.purpose === "follow_up" ? [{kind: "prior_interaction",
      id: (bundle.priorInteraction as Record<string, unknown>).activityId,
      text: (bundle.priorInteraction as Record<string, unknown>).summary}] : []),
    ...["observations", "capabilities", "references", "ctas"].flatMap((key) =>
      (bundle[key] as Array<Record<string, unknown>>).map((item) => ({
        kind: key === "observations" ? "observation" :
          key === "capabilities" ? "capability" :
            key === "references" ? "reference" : "cta",
        id: item.id, text: item.text,
      }))),
  ];
  const sentences = row.sentences;
  const model = object(row.model, ["modelId", "promptVersion",
    "playbookVersion", "cacheHit", "usage"]);
  const usage = object(model.usage, ["inputTokens", "outputTokens",
    "costMicros"]);
  if (row.schemaVersion !== 1 || row.organizerId !== organizer.organizerId ||
      row.contactId !== contact.contactId ||
      row.opportunityId !== opportunity.opportunityId ||
      row.language !== "en" || row.channel !== bundle.channel ||
      row.reviewStatus !== "pending_review" || row.sendAuthority !== false ||
      row.inputHash !== hash(bundle) ||
      model.modelId !== "deterministic" || model.cacheHit !== false ||
      Object.values(usage).some((value) => value !== 0) ||
      !Array.isArray(sentences) || sentences.length < 3 || sentences.length > 5) {
    return fail("failed-precondition", "Rendered outreach artifact differs from frozen Sales input.");
  }
  const used = new Set<string>();
  for (const sentence of sentences) {
    const part = object(sentence, ["text", "kind", "sourceIds"]);
    const sourceIds = part.sourceIds;
    if (!Array.isArray(sourceIds) || sourceIds.length !== 1 ||
        typeof sourceIds[0] !== "string" || used.has(sourceIds[0]) ||
        !expected.some((item) => item.id === sourceIds[0] &&
          item.kind === part.kind && item.text === part.text)) {
      return fail("failed-precondition", "Draft contains a sentence outside approved clauses.");
    }
    used.add(sourceIds[0]);
  }
  const parts = sentences as RenderedDraft["sentences"];
  const kinds = parts.map((part) => part.kind);
  if (hash(kinds) !== hash([...(bundle.purpose === "follow_up" ?
    ["prior_interaction"] : []), "observation", "capability",
  ...(kinds.includes("reference") ? ["reference"] : []), "cta"])) {
    return fail("failed-precondition", "Draft sentence sequence is not approved.");
  }
  const body = parts.map((part) => part.text).join("\n\n");
  if (body !== row.text || body.length > 2500 ||
      row.contentHash !== hash({subject: row.subject, text: body}) ||
      typeof row.draftId !== "string" ||
      !row.draftId.startsWith("draft-")) {
    return fail("failed-precondition", "Rendered text or hash is invalid.");
  }
  const revisions = row.sourceRevisions;
  if (!revisions || typeof revisions !== "object" || Array.isArray(revisions)) {
    return fail("failed-precondition", "Draft source revisions are missing.");
  }
  const expectedRevisions = Object.fromEntries([
    [organizer.organizerId, organizer.revision],
    [contact.contactId, contact.revision],
    [opportunity.opportunityId, opportunity.revision],
    ...["observations", "capabilities", "references", "ctas"].flatMap((key) =>
      (bundle[key] as Array<Record<string, unknown>>).map((item) => [item.id, item.revision])),
    ...(bundle.priorInteraction ? [[
      (bundle.priorInteraction as Record<string, unknown>).activityId,
      (bundle.priorInteraction as Record<string, unknown>).revision]] : []),
  ]);
  if (hash(revisions) !== hash(expectedRevisions)) {
    return fail("failed-precondition", "Draft source revisions differ from current input.");
  }
  return row as unknown as RenderedDraft;
}

/** Trusted Operations worker persistence hook; never exported as a browser callable. */
export async function recordOperationsDraft(deps: IntelligenceDeps,
  principal: SalesPrincipal, request: string, sourceRequest: DraftRequest,
  frozenBundle: Record<string, unknown>, frozenSourceHash: string,
  rendered: unknown) {
  requestId(request);
  const draft = checkedDraft(rendered, frozenBundle);
  const material = {sourceRequest, frozenBundle, frozenSourceHash, draft};
  return mutate(deps, principal, "draft.record", request, material, false,
    async (tx, now) => {
      const current = await buildOutreachInput(deps, principal, sourceRequest, tx);
      if (current.sourceHash !== frozenSourceHash ||
          materialBundle(current.bundle as Record<string, unknown>) !==
            materialBundle(frozenBundle)) {
        return fail("aborted", "Outreach sources changed during drafting.");
      }
      return persistOperationsDraft(tx, deps.db, principal.uid, now,
        sourceRequest, frozenBundle, frozenSourceHash, draft);
    });
}

async function persistOperationsDraft(tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore, actorUid: string, now: string,
  sourceRequest: DraftRequest, frozenBundle: Record<string, unknown>,
  frozenSourceHash: string, draft: RenderedDraft, participantScope?: PartnerDraftScope) {
  const ref = db.collection("salesOutreachDrafts").doc(draft.draftId);
  const prior = await tx.get(ref);
  if (prior.exists) {
    return fail("already-exists", "Draft identity already exists.");
  }
  const stored = {schemaVersion: 1, classification: "sales_private",
    draftId: draft.draftId, organizerId: sourceRequest.organizerId,
    contactId: sourceRequest.contactId,
    opportunityId: sourceRequest.opportunityId,
    sourceRequest, sourceMaterialHash: materialBundle(frozenBundle),
    sourceHash: frozenSourceHash,
    inputHash: draft.inputHash, draft, status: "pending_review",
    createdAt: now, createdBy: actorUid,
    reviewedAt: null, reviewedBy: null,
    ...(participantScope ? {participantScope} : {})};
  tx.create(ref, stored);
  return {draftId: draft.draftId, draft, status: stored.status};
}

/** Trusted Operations persistence; actual participant roles remain unchanged. */
export async function recordPartnerOperationsDraft(deps: PartnerDeps,
  actor: PartnerActor, request: string, sourceRequest: DraftRequest,
  expectedAssignmentRevision: number, frozenBundle: Record<string, unknown>,
  frozenSourceHash: string, rendered: unknown) {
  requestId(request);
  const organizerId = id(sourceRequest.organizerId);
  const expected = revision(expectedAssignmentRevision);
  const renderedDraft = checkedDraft(rendered, frozenBundle);
  const participantScope = {partnerUid: actor.uid, assignmentRevision: expected,
    renderedDraftId: renderedDraft.draftId};
  const draft = {...renderedDraft, draftId: `draft-partner-${hash({organizerId,
    participantScope})}`};
  const material = {organizerId, sourceRequest, participantScope, frozenBundle, frozenSourceHash, draft};
  const currentSource = async (tx: FirebaseFirestore.Transaction) => {
    const current = await buildPartnerOutreachInput(deps, actor, sourceRequest, expected, tx);
    if (current.sourceHash !== frozenSourceHash ||
        materialBundle(current.bundle as Record<string, unknown>) !== materialBundle(frozenBundle)) {
      fail("aborted", "Outreach sources changed during drafting.");
    }
  };
  return mutateAuthorized(deps, actor, "partner.draft.record", request, material,
    partnerDraftAccess(deps, actor, organizerId, expected), async (tx, now) => {
      await currentSource(tx);
      return persistOperationsDraft(tx, deps.db, actor.uid, now,
        sourceRequest, frozenBundle, frozenSourceHash, draft, participantScope);
    }, async (tx) => {
      await currentSource(tx);
      await requirePartnerDraft(deps, actor, tx, organizerId, draft.draftId, expected);
    });
}

async function requireCurrentDraft(deps: IntelligenceDeps,
  principal: SalesPrincipal, tx: FirebaseFirestore.Transaction, draftId: string) {
  if (isAssignedSalesStaff(principal)) {
    const stored = (await tx.get(deps.db.collection("salesOutreachDrafts").doc(draftId))).data();
    if (stored?.participantScope) {
      fail("permission-denied", "Partner drafts retain their separate authority.");
    }
  }
  return requireCurrentDraftCore(deps, tx, draftId,
    (sourceRequest) => buildOutreachInput(deps, principal, sourceRequest, tx));
}
async function requirePartnerDraft(deps: PartnerDeps, actor: PartnerActor,
  tx: FirebaseFirestore.Transaction, organizerId: string, draftId: string,
  expectedAssignmentRevision: number) {
  await partnerDraftAccess(deps, actor, organizerId, expectedAssignmentRevision, draftId).inTransaction(tx);
  return requireCurrentDraftCore(deps, tx, draftId,
    (sourceRequest) => buildPartnerOutreachInput(deps, actor,
      sourceRequest, expectedAssignmentRevision, tx));
}
async function requireCurrentDraftCore(deps: Pick<IntelligenceDeps, "db" | "now">,
  tx: FirebaseFirestore.Transaction, draftId: string,
  currentSource: (sourceRequest: unknown) => Promise<Record<string, unknown>>) {
  const ref = deps.db.collection("salesOutreachDrafts").doc(draftId);
  const stored = (await tx.get(ref)).data();
  if (!stored || stored.classification !== "sales_private") {
    return fail("not-found", "Private outreach draft not found.");
  }
  const current = await currentSource(stored.sourceRequest);
  if (current.sourceHash !== stored.sourceHash ||
      materialBundle(current.bundle as Record<string, unknown>) !==
        stored.sourceMaterialHash) {
    return fail("aborted", "Outreach sources changed; prepare a new draft.");
  }
  assertPersistedOutreachDraftIntegrity(stored, draftId,
    current.bundle as Record<string, unknown>);
  return {ref, stored};
}

/** Shared read/replay check; saved content and approved sources must agree. */
export function assertPersistedOutreachDraftIntegrity(stored: FirebaseFirestore.DocumentData,
  draftId: string, currentBundle: Record<string, unknown>): void {
  const draft = stored.draft;
  if (stored.schemaVersion !== 1 || stored.draftId !== draftId ||
      !stored.sourceRequest || !draft || draft.draftId !== draftId || stored.inputHash !== draft.inputHash ||
      ["organizerId", "contactId", "opportunityId"].some((key) =>
        stored[key] !== stored.sourceRequest[key] || draft[key] !== stored.sourceRequest[key]) ||
      (draft.subject !== null && (typeof draft.subject !== "string" || draft.subject.length > 160)) ||
      typeof draft.text !== "string" || draft.text.length > 2500 ||
      draft.contentHash !== hash({subject: draft.subject, text: draft.text})) {
    return fail("failed-precondition", "Stored outreach content differs from its exact artifact.");
  }
  // Sources are unchanged, but persisted prose/citations must still match them.
  // The source material excludes evaluatedAt, so use the fresh bundle hash only
  // for this deterministic clause validation without changing the saved artifact.
  checkedDraft({...draft, inputHash: hash(currentBundle)}, currentBundle);
}

export async function reviewOutreachDraft(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown) {
  const input = object(payload, ["requestId", "draftId", "expectedContentHash",
    "factualValidity", "tone", "channelReadiness"]);
  const request = requestId(input.requestId);
  const draftId = id(input.draftId);
  const expectedContentHash = text(input.expectedContentHash, 64);
  if (input.factualValidity !== "verified" || input.tone !== "approved" ||
      input.channelReadiness !== "manual_copy_only") {
    return fail("invalid-argument", "Explicit factual, tone and manual-channel review required.");
  }
  return mutate(deps, principal, "draft.review", request,
    {draftId, expectedContentHash, factualValidity: input.factualValidity,
      tone: input.tone, channelReadiness: input.channelReadiness}, false,
    async (tx, now) => {
      const {ref, stored} = await requireCurrentDraft(deps, principal, tx, draftId);
      if (stored.status !== "pending_review" ||
          stored.draft.contentHash !== expectedContentHash) {
        return fail("aborted", "Exact draft has changed since review.");
      }
      tx.update(ref, {status: "approved", reviewedAt: now,
        reviewedBy: principal.uid});
      return {draftId, exactContentHash: expectedContentHash,
        factualValidity: "verified", tone: "approved",
        channelReadiness: "manual_copy_only", sendAuthority: false,
        providerConfirmed: false, reviewedAt: now};
    }, async (tx) => {
      await requireCurrentDraft(deps, principal, tx, draftId);
    });
}

export async function copyOutreachDraft(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown) {
  const input = object(payload, ["requestId", "draftId", "expectedContentHash"]);
  const request = requestId(input.requestId);
  const draftId = id(input.draftId);
  const expectedContentHash = text(input.expectedContentHash, 64);
  return mutate(deps, principal, "draft.copy", request,
    {draftId, expectedContentHash}, false, async (tx, now) => {
      const {stored} = await requireCurrentDraft(deps, principal, tx, draftId);
      if (stored.status !== "approved" ||
          stored.draft.contentHash !== expectedContentHash) {
        return fail("failed-precondition", "Current reviewed draft is required for copying.");
      }
      return {draftId, subject: stored.draft.subject as string | null,
        text: stored.draft.text as string, exactContentHash: expectedContentHash,
        copiedAt: now, sendAuthority: false, providerConfirmed: false};
    }, async (tx) => {
      await requireCurrentDraft(deps, principal, tx, draftId);
    });
}

export async function getOutreachDraft(deps: IntelligenceDeps,
  principal: SalesPrincipal, payload: unknown): Promise<Record<string, unknown>> {
  employee(principal);
  const input = object(payload, ["draftId"]);
  const draftId = id(input.draftId);
  await deps.authorize(principal, false);
  const result = await deps.db.runTransaction(async (tx) => {
    const {stored} = await requireCurrentDraft(deps, principal, tx, draftId);
    return {draftId, draft: stored.draft, status: stored.status,
      reviewedAt: stored.reviewedAt, reviewedBy: stored.reviewedBy,
      sendAuthority: false};
  });
  await deps.authorize(principal, false);
  await assertSalesMaterialPrivacyOpen(deps.db, result);
  return result;
}

/** Participant composition review never approves platform capabilities or proof. */
export async function reviewPartnerOutreachDraft(deps: PartnerDeps,
  actor: PartnerActor, payload: unknown) {
  const input = object(payload, ["requestId", "organizerId", "draftId",
    "expectedAssignmentRevision", "expectedContentHash", "factualValidity", "tone", "channelReadiness"]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const draftId = id(input.draftId);
  const expected = revision(input.expectedAssignmentRevision);
  const expectedContentHash = text(input.expectedContentHash, 64);
  if (input.factualValidity !== "verified" || input.tone !== "approved" ||
      input.channelReadiness !== "manual_copy_only") {
    fail("invalid-argument", "Explicit factual, tone and manual-channel review required.");
  }
  const current = (tx: FirebaseFirestore.Transaction) =>
    requirePartnerDraft(deps, actor, tx, organizerId, draftId, expected);
  return mutateAuthorized(deps, actor, "partner.draft.review", request,
    {organizerId, draftId, expectedAssignmentRevision: expected, expectedContentHash,
      factualValidity: input.factualValidity, tone: input.tone, channelReadiness: input.channelReadiness},
    partnerDraftAccess(deps, actor, organizerId, expected, draftId), async (tx, now) => {
      const {ref, stored} = await current(tx);
      if (stored.status !== "pending_review" || stored.draft.contentHash !== expectedContentHash) {
        fail("aborted", "Exact own draft changed since review.");
      }
      tx.update(ref, {status: "approved", reviewedAt: now, reviewedBy: actor.uid});
      return {draftId, exactContentHash: expectedContentHash, compositionReviewed: true,
        capabilityApprovalAuthority: false, sendAuthority: false, providerConfirmed: false};
    }, async (tx) => {
      const {stored} = await current(tx);
      if (stored.status !== "approved" || stored.reviewedBy !== actor.uid ||
          stored.draft.contentHash !== expectedContentHash) {
        fail("failed-precondition", "Current own composition review is required for replay.");
      }
    });
}

export async function copyPartnerOutreachDraft(deps: PartnerDeps,
  actor: PartnerActor, payload: unknown) {
  const input = object(payload, ["requestId", "organizerId", "draftId",
    "expectedAssignmentRevision", "expectedContentHash"]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const draftId = id(input.draftId);
  const expected = revision(input.expectedAssignmentRevision);
  const expectedContentHash = text(input.expectedContentHash, 64);
  const current = (tx: FirebaseFirestore.Transaction) =>
    requirePartnerDraft(deps, actor, tx, organizerId, draftId, expected);
  return mutateAuthorized(deps, actor, "partner.draft.copy", request,
    {organizerId, draftId, expectedAssignmentRevision: expected, expectedContentHash},
    partnerDraftAccess(deps, actor, organizerId, expected, draftId), async (tx, now) => {
      const {stored} = await current(tx);
      if (stored.status !== "approved" || stored.reviewedBy !== actor.uid ||
          stored.draft.contentHash !== expectedContentHash) {
        fail("failed-precondition", "Current own reviewed draft is required for copying.");
      }
      return {draftId, subject: stored.draft.subject as string | null,
        text: stored.draft.text as string, exactContentHash: expectedContentHash,
        copiedAt: now, sendAuthority: false, providerConfirmed: false};
    }, async (tx) => {
      const {stored} = await current(tx);
      if (stored.status !== "approved" || stored.reviewedBy !== actor.uid ||
          stored.draft.contentHash !== expectedContentHash) {
        fail("failed-precondition", "Current own reviewed draft is required for copying.");
      }
    });
}

export async function getPartnerOutreachDraft(deps: PartnerDeps,
  actor: PartnerActor, payload: unknown) {
  const input = object(payload, ["organizerId", "draftId", "expectedAssignmentRevision"]);
  const organizerId = id(input.organizerId);
  const draftId = id(input.draftId);
  const expected = revision(input.expectedAssignmentRevision);
  await deps.checkAuth(actor, false);
  return deps.db.runTransaction(async (tx) => {
    const {stored} = await requirePartnerDraft(deps, actor, tx, organizerId, draftId, expected);
    await partnerDraftAccess(deps, actor, organizerId, expected, draftId).inTransaction(tx);
    return {draftId, draft: stored.draft, status: stored.status,
      reviewedAt: stored.reviewedAt, sendAuthority: false};
  });
}

/** Records a human's attestation after sending outside Catch. No provider send. */
export async function recordPartnerManualSend(deps: PartnerDeps,
  actor: PartnerActor, payload: unknown) {
  const input = object(payload, ["requestId", "organizerId", "draftId",
    "expectedAssignmentRevision", "expectedContentHash", "channel", "occurredAt", "attestation"]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const draftId = id(input.draftId);
  const expected = revision(input.expectedAssignmentRevision);
  const expectedContentHash = text(input.expectedContentHash, 64);
  const occurredAt = iso(input.occurredAt);
  const channel = input.channel;
  if (input.attestation !== "i_manually_sent_this_reviewed_draft" ||
      !["email", "whatsapp", "other"].includes(String(channel))) {
    fail("invalid-argument", "Confirm that you manually sent this exact reviewed draft.");
  }
  const material = {organizerId, draftId, expectedAssignmentRevision: expected,
    expectedContentHash, channel, occurredAt, attestation: input.attestation};
  const activityId = `partner-send-${hash({actorUid: actor.uid, organizerId,
    draftId, expectedContentHash, expectedAssignmentRevision: expected}).slice(0, 48)}`;
  const activityRef = deps.db.collection("salesActivities").doc(activityId);
  const access = partnerDraftAccess(deps, actor, organizerId, expected, draftId);
  const current = async (tx: FirebaseFirestore.Transaction) => {
    const {stored} = await requirePartnerDraft(deps, actor, tx, organizerId, draftId, expected);
    const assignment = await requireAssignment(deps, actor, tx, organizerId);
    expectRevision(assignment.revision, expected);
    const at = Date.parse(occurredAt);
    if (stored.status !== "approved" || stored.reviewedBy !== actor.uid ||
        stored.draft.contentHash !== expectedContentHash ||
        channel !== assignment.channel ||
        (stored.draft.channel === "email" ? channel !== "email" :
          !["whatsapp", "other"].includes(String(channel))) ||
        !Number.isFinite(Date.parse(stored.reviewedAt)) || at < Date.parse(stored.reviewedAt)) {
      fail("failed-precondition", "Current own reviewed draft and established channel are required.");
    }
    return stored;
  };
  const matches = (row: FirebaseFirestore.DocumentData | undefined, opportunityId: string) =>
    row?.schemaVersion === 1 && row.classification === "sales_private" &&
    row.activityId === activityId && row.organizerId === organizerId &&
    row.opportunityId === opportunityId && row.actorUid === actor.uid &&
    row.type === "outreach_sent_manual" && row.outcome === "actor_attested_sent" &&
    row.providerConfirmed === false && row.channel === channel && row.occurredAt === occurredAt &&
    row.note === `Partner attested manual sending of reviewed draft ${draftId}; content hash ${expectedContentHash}.`;
  return mutateAuthorized(deps, actor, "partner.draft.manual_send", request, material,
    access, async (tx) => {
      const stored = await current(tx);
      const existing = await tx.get(activityRef);
      if (existing.exists && !matches(existing.data(), stored.draft.opportunityId)) {
        fail("already-exists", "This draft already has a different manual-send attestation.");
      }
      // All reads and final current authority precede writes; time is fresh after Auth.
      await access.inTransaction(tx);
      const recordedAt = deps.now().toISOString();
      if (Date.parse(occurredAt) > Date.parse(recordedAt)) {
        fail("invalid-argument", "Manual sending time cannot be in the future.");
      }
      if (!existing.exists) {
        tx.create(activityRef, {schemaVersion: 1,
          classification: "sales_private", activityId, organizerId,
          opportunityId: stored.draft.opportunityId, type: "outreach_sent_manual",
          channel, outcome: "actor_attested_sent", providerConfirmed: false,
          occurredAt, recordedAt,
          note: `Partner attested manual sending of reviewed draft ${draftId}; content hash ${expectedContentHash}.`,
          actorUid: actor.uid});
      }
      return {organizerId, draftId, activityId, exactContentHash: expectedContentHash,
        occurredAt, outcome: "actor_attested_sent", providerConfirmed: false, sendAuthority: false};
    }, async (tx) => {
      const stored = await current(tx);
      const activity = await tx.get(activityRef);
      if (!matches(activity.data(), stored.draft.opportunityId)) {
        fail("failed-precondition", "Manual-send attestation changed; refresh before retrying.");
      }
    });
}

/** Approved participant preparation, projected separately from employee catalog. */
export async function getPartnerPreparation(deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, ["organizerId", "expectedAssignmentRevision"]);
  const organizerId = id(input.organizerId);
  const expected = revision(input.expectedAssignmentRevision);
  await deps.checkAuth(actor, false);
  return deps.db.runTransaction(async (tx) => {
    const access = async () => {
      const assignment = await requireAssignment(deps, actor, tx, organizerId);
      expectRevision(assignment.revision, expected);
    };
    await access();
    const [accountSnap, clauseSnap, relationshipSnap, opportunitySnap, evidenceSnap] = await Promise.all([
      tx.get(deps.db.collection("organizerSalesAccounts").doc(organizerId)),
      tx.get(deps.db.collection("salesIntelligenceClauses").where("organizerId", "==", organizerId).limit(51)),
      tx.get(deps.db.collection("salesContactRelationships").where("organizerId", "==", organizerId).limit(26)),
      tx.get(deps.db.collection("salesOpportunities").where("organizerId", "==", organizerId).limit(26)),
      tx.get(deps.db.collection("salesEvidence").where("organizerId", "==", organizerId).limit(MAX_EVIDENCE + 1)),
    ]);
    if (clauseSnap.size > 50 || relationshipSnap.size > 25 || opportunitySnap.size > 25 || evidenceSnap.size > MAX_EVIDENCE) {
      fail("resource-exhausted", "Preparation needs curation before participant review.");
    }
    const at = deps.now().toISOString();
    const account = accountSnap.data();
    if (!accountOk(account, organizerId)) fail("failed-precondition", "Current canonical Sales identity is required.");
    const clauses = [];
    const evidenceById = new Map(evidenceSnap.docs.map((snap) => [snap.id, snap.data()]));
    for (const snap of clauseSnap.docs) {
      const row = snap.data();
      if (row.classification !== "sales_private" || row.organizerId !== organizerId ||
          row.clauseId !== snap.id) fail("failed-precondition", "Preparation contains an invalid clause.");
      if (row.state !== "approved" || row.permission === "withdrawn" ||
          Date.parse(String(row.validUntil)) <= Date.parse(at) ||
          !Number.isFinite(Date.parse(String(row.validUntil)))) continue;
      if (row.kind === "reference" && row.permission !== "private_mention") continue;
      const evidence = [];
      const sourceDeadlines: number[] = [];
      let eligible = true;
      for (const evidenceId of uniqueIds(row.evidenceIds, 8)) {
        const source = evidenceById.get(evidenceId);
        if (!currentReviewedEvidence(source, organizerId, at)) {
          eligible = false; break;
        }
        if (source!.validThrough) sourceDeadlines.push(Date.parse(source!.validThrough));
        // Source provenance is not a disclosure grant. Only an owner-reviewed,
        // exact safe public citation fingerprint can authorize participant sharing.
        const grant = (row.partnerCitations ?? []).find((item: {evidenceId: string; sourceHash: string}) => item.evidenceId === evidenceId);
        if (!grant) continue;
        let citation: Record<string, unknown>;
        try {
          citation = publicPartnerCitation(source!, organizerId);
        } catch (error) {
          if (error instanceof Error && "code" in error && error.code === "failed-precondition") continue;
          throw error;
        }
        if (grant.sourceHash !== hash(citation)) continue;
        evidence.push(citation);
      }
      if (!eligible) continue;
      clauses.push({clauseId: row.clauseId, kind: row.kind, text: row.text,
        revision: row.revision, validUntil: row.validUntil, evidence, sourceDeadlines});
    }
    const contacts = [];
    for (const snap of relationshipSnap.docs) {
      const row = snap.data();
      if (row.classification !== "sales_private" || row.organizerId !== organizerId ||
          row.relationshipId !== snap.id || row.relationshipId !== salesRelationshipId(organizerId, row.contactId)) {
        fail("failed-precondition", "Preparation contains an invalid contact relationship.");
      }
      if (!await hasCurrentDraftContact(deps.db, organizerId, row.contactId, at, tx)) continue;
      const contact = (await tx.get(deps.db.collection("salesContacts").doc(row.contactId))).data();
      if (contact?.classification !== "sales_private" || contact.contactId !== row.contactId) continue;
      const reviewEvidence = evidenceById.get(row.draftReviewEvidenceId);
      contacts.push({contactId: contact.contactId, displayName: contact.displayName, role: row.role,
        validThrough: reviewEvidence?.validThrough ?? null});
    }
    const opportunities = opportunitySnap.docs.map((snap) => {
      const row = snap.data();
      if (row.classification !== "sales_private" || row.organizerId !== organizerId ||
          row.opportunityId !== snap.id) fail("failed-precondition", "Preparation contains an invalid opportunity.");
      return {opportunityId: row.opportunityId, stage: row.stage, motion: row.motion};
    });
    await access();
    const evaluatedAt = deps.now().toISOString();
    // Repeat after the final awaited authorization; expiry can cross that wait.
    const currentClauses = clauses.filter((row) => Date.parse(row.validUntil) > Date.parse(evaluatedAt) &&
      row.sourceDeadlines.every((deadline) => deadline > Date.parse(evaluatedAt)))
      .map((row) => ({clauseId: row.clauseId, kind: row.kind, text: row.text,
        revision: row.revision, validUntil: row.validUntil, evidence: row.evidence}));
    return {organizerId, assignmentRevision: expected, researchStatus: account!.researchStatus,
      contacts: contacts.filter((row) => !row.validThrough || Date.parse(row.validThrough) > Date.parse(evaluatedAt))
        .map((row) => ({contactId: row.contactId, displayName: row.displayName, role: row.role})),
      opportunities, clauses: currentClauses, evaluatedAt,
      sendAuthority: false, capabilityApprovalAuthority: false};
  });
}

/** The same projection is shown to the owner before explicit sharing approval. */
function publicPartnerCitation(source: FirebaseFirestore.DocumentData,
  organizerId: string): Record<string, unknown> {
  if (source.classification !== "sales_private" || source.organizerId !== organizerId ||
      source.sourceType !== "public_web" || !["high", "medium", "low"].includes(source.confidence)) {
    fail("failed-precondition", "Only explicit public-web citations can be shared.");
  }
  let url: URL;
  try {
    url = new URL(source.sourceRef);
  } catch {
    return fail("failed-precondition", "Public citation URL is invalid.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !url.hostname.includes(".") || url.hostname.endsWith(".local") || url.hostname.endsWith(".localhost")) {
    fail("failed-precondition", "A public citation cannot contain access credentials or query tokens.");
  }
  return {evidenceId: id(source.evidenceId), sourceRef: text(url.href, 320),
    observedAt: iso(source.observedAt), validThrough: source.validThrough ? iso(source.validThrough) : null,
    excerpt: source.excerpt ? text(source.excerpt, 500) : null,
    confidence: source.confidence};
}
