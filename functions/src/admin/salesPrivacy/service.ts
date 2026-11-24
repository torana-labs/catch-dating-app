/* eslint-disable max-len */
import {HttpsError} from "firebase-functions/v2/https";
import {invalidateFitQueueInTransaction} from "../salesFitQueue/service";
import type {SalesPrincipal} from "../sales/types";
import {firestoreInventoryPort, inventorySalesOrganizer,
  type SalesPrivacyInventory, type InventoryItem} from "./inventory";
import {MAX_BATCH_ITEMS, PRIVACY_BATCH_RECEIPTS, PRIVACY_PLANS,
  PRIVACY_POLICIES, PRIVACY_RESTRICTIONS, privacyHash, privacyId,
  privacyRequestId} from "./model";

export interface PrivacyDeps {
  db: FirebaseFirestore.Firestore;
  now: () => Date;
  /** Must re-read current Auth user and Admin Owner role on every invocation. */
  authorizeOwner: (principal: SalesPrincipal) => Promise<void>;
  inventory?: typeof inventorySalesOrganizer;
}
export interface PrivacyPolicy {
  schemaVersion: 1;
  classification: "sales_private";
  policyId: "current";
  revision: number;
  status: "reviewed";
  sourceReference: string;
  sourceHash: string;
  financeDisposition: "retain_pending_finance_review";
  financeReason: string;
  auditDisposition: "retain_pending_audit_review";
  auditReason: string;
  externalCopies: "unverified";
  policyHash: string;
  requestId: string;
  reviewedByUid: string;
  reviewedAt: string;
}
export interface PrivacyRestriction {
  schemaVersion: 1;
  classification: "sales_private";
  organizerId: string;
  status: "restricted" | "processing" | "internal_processed_with_unresolved";
  revision: number;
  reason: string;
  requestId: string;
  materialHash: string;
  restrictedByUid: string;
  restrictedAt: string;
  activePlanId: string | null;
}
export interface PrivacyPlan {
  schemaVersion: 1;
  classification: "sales_private";
  planId: string;
  requestId: string;
  organizerId: string;
  restrictionRevision: number;
  policyHash: string;
  inventoryHash: string;
  items: InventoryItem[];
  blockers: SalesPrivacyInventory["blockers"];
  cursor: number;
  status: "reviewed" | "processing" | "internal_processed_with_unresolved";
  reviewedByUid: string;
  reviewedAt: string;
  updatedAt: string;
}

function owner(principal: SalesPrincipal): void {
  if (!principal.uid || principal.clientId ||
      !principal.roles.includes("adminOwner")) {
    throw new HttpsError("permission-denied",
      "Current Admin Owner authority is required for Sales privacy.");
  }
}
async function authorize(deps: PrivacyDeps, principal: SalesPrincipal) {
  owner(principal); await deps.authorizeOwner(principal);
}
function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpsError("invalid-argument", "Expected an object.");
  }
  return raw as Record<string, unknown>;
}
function only(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new HttpsError("invalid-argument", "Unexpected privacy field.");
  }
}
function text(raw: unknown, label: string, max: number): string {
  if (typeof raw !== "string" || !raw.trim() || raw.length > max) {
    throw new HttpsError("invalid-argument", `Invalid ${label}.`);
  }
  return raw.trim();
}
function revision(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) < 0) {
    throw new HttpsError("invalid-argument", "Invalid revision.");
  }
  return raw as number;
}
function digest(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !/^[a-f0-9]{64}$/u.test(raw)) {
    throw new HttpsError("invalid-argument", `Invalid ${label}.`);
  }
  return raw;
}
function policyFrom(raw: FirebaseFirestore.DocumentData | undefined): PrivacyPolicy {
  if (!raw || raw.classification !== "sales_private" ||
      raw.status !== "reviewed" || raw.policyId !== "current" ||
      raw.financeDisposition !== "retain_pending_finance_review" ||
      raw.auditDisposition !== "retain_pending_audit_review" ||
      raw.externalCopies !== "unverified" ||
      !Number.isSafeInteger(raw.revision) || raw.revision < 1 ||
      typeof raw.policyHash !== "string") {
    throw new HttpsError("failed-precondition",
      "A current reviewed Sales privacy retention policy is required.");
  }
  const material = {sourceReference: raw.sourceReference,
    sourceHash: raw.sourceHash, financeDisposition: raw.financeDisposition,
    financeReason: raw.financeReason,
    auditDisposition: raw.auditDisposition, auditReason: raw.auditReason,
    externalCopies: raw.externalCopies};
  if (privacyHash(material) !== raw.policyHash) {
    throw new HttpsError("failed-precondition",
      "Reviewed Sales privacy policy hash is invalid.");
  }
  return raw as PrivacyPolicy;
}
function restrictionFrom(raw: FirebaseFirestore.DocumentData | undefined,
  organizerId: string): PrivacyRestriction {
  if (!raw || raw.classification !== "sales_private" ||
      raw.organizerId !== organizerId || !Number.isSafeInteger(raw.revision) ||
      raw.revision < 1) {
    throw new HttpsError("failed-precondition",
      "Restrict this organizer before reviewing a cleanup plan.");
  }
  return raw as PrivacyRestriction;
}
function planFrom(raw: FirebaseFirestore.DocumentData | undefined,
  organizerId: string, planId: string): PrivacyPlan {
  if (!raw || raw.classification !== "sales_private" ||
      raw.organizerId !== organizerId || raw.planId !== planId ||
      !Array.isArray(raw.items) || !Number.isSafeInteger(raw.cursor) ||
      raw.cursor < 0 || raw.cursor > raw.items.length) {
    throw new HttpsError("failed-precondition", "Privacy plan is invalid.");
  }
  if (raw.items.some((item: unknown) => {
    const entry = item as Partial<InventoryItem>;
    return !entry || typeof entry.path !== "string" ||
      !allowedPlanPath(entry.path) || typeof entry.contentHash !== "string" ||
      !/^[a-f0-9]{64}$/u.test(entry.contentHash) ||
      !["delete", "retain_finance", "retain_audit"].includes(
        String(entry.disposition));
  })) throw new HttpsError("failed-precondition", "Privacy plan is invalid.");
  return raw as PrivacyPlan;
}
function safePlan(plan: PrivacyPlan) {
  return {planId: plan.planId,
    organizerId: plan.organizerId, policyHash: plan.policyHash,
    inventoryHash: plan.inventoryHash, cursor: plan.cursor,
    itemCount: plan.items.length,
    retainedCount: plan.items.filter((item) => item.disposition !== "delete").length,
    unresolvedCount: plan.blockers.length, blockers: plan.blockers,
    status: plan.status};
}

export async function reviewSalesPrivacyPolicy(deps: PrivacyDeps,
  principal: SalesPrincipal, raw: unknown) {
  const input = object(raw);
  only(input, ["requestId", "expectedRevision", "sourceReference",
    "sourceHash", "financeReason", "auditReason"]);
  const requestId = privacyRequestId(input.requestId);
  const expectedRevision = revision(input.expectedRevision);
  const material = {sourceReference: text(input.sourceReference,
    "policy reference", 240), sourceHash: digest(input.sourceHash,
    "policy source hash"), financeDisposition:
    "retain_pending_finance_review" as const,
  financeReason: text(input.financeReason, "finance retention reason", 500),
  auditDisposition: "retain_pending_audit_review" as const,
  auditReason: text(input.auditReason, "audit retention reason", 500),
  externalCopies: "unverified" as const};
  const policyHash = privacyHash(material);
  await authorize(deps, principal);
  const ref = deps.db.collection(PRIVACY_POLICIES).doc("current");
  return deps.db.runTransaction(async (tx) => {
    await authorize(deps, principal);
    const current = (await tx.get(ref)).data();
    if (current?.requestId === requestId && current?.policyHash === policyHash) {
      return {policy: policyFrom(current)};
    }
    if ((current?.revision ?? 0) !== expectedRevision) {
      throw new HttpsError("aborted", "Privacy policy changed; review it again.");
    }
    const policy: PrivacyPolicy = {schemaVersion: 1,
      classification: "sales_private", policyId: "current",
      revision: expectedRevision + 1, status: "reviewed", ...material,
      policyHash, requestId, reviewedByUid: principal.uid,
      reviewedAt: deps.now().toISOString()};
    tx.set(ref, policy);
    return {policy};
  });
}

export async function restrictSalesOrganizer(deps: PrivacyDeps,
  principal: SalesPrincipal, raw: unknown) {
  const input = object(raw);
  only(input, ["organizerId", "requestId", "reason"]);
  const organizerId = privacyId(input.organizerId, "organizer ID");
  const requestId = privacyRequestId(input.requestId);
  const reason = text(input.reason, "restriction reason", 500);
  const materialHash = privacyHash([organizerId, reason]);
  await authorize(deps, principal);
  const ref = deps.db.collection(PRIVACY_RESTRICTIONS).doc(organizerId);
  return deps.db.runTransaction(async (tx) => {
    await authorize(deps, principal);
    const existing = (await tx.get(ref)).data();
    if (existing) {
      if (existing.requestId === requestId &&
          existing.materialHash === materialHash) {
        return {
          restriction: restrictionFrom(existing, organizerId)};
      }
      throw new HttpsError("already-exists",
        "This organizer already has a permanent Sales restriction.");
    }
    const now = deps.now().toISOString();
    const restriction: PrivacyRestriction = {schemaVersion: 1,
      classification: "sales_private", organizerId, status: "restricted",
      revision: 1, reason, requestId, materialHash,
      restrictedByUid: principal.uid, restrictedAt: now, activePlanId: null};
    tx.create(ref, restriction);
    invalidateFitQueueInTransaction(tx, deps.db, organizerId, now);
    return {restriction};
  });
}

export async function previewSalesPrivacyPlan(deps: PrivacyDeps,
  principal: SalesPrincipal, raw: unknown) {
  const input = object(raw); only(input, ["organizerId"]);
  const organizerId = privacyId(input.organizerId, "organizer ID");
  await authorize(deps, principal);
  const [restrictionSnap, policySnap] = await Promise.all([
    deps.db.collection(PRIVACY_RESTRICTIONS).doc(organizerId).get(),
    deps.db.collection(PRIVACY_POLICIES).doc("current").get(),
  ]);
  const restriction = restrictionFrom(restrictionSnap.data(), organizerId);
  const policy = policyFrom(policySnap.data());
  const inventory = await (deps.inventory ?? inventorySalesOrganizer)(
    firestoreInventoryPort(deps.db), organizerId);
  await authorize(deps, principal);
  return {organizerId, restrictionRevision: restriction.revision,
    activePlanId: restriction.activePlanId,
    policyHash: policy.policyHash, inventoryHash: inventory.inventoryHash,
    counts: inventory.counts, blockers: inventory.blockers,
    overflow: inventory.overflow, effectsApplied: false};
}

export async function reviewSalesPrivacyPlan(deps: PrivacyDeps,
  principal: SalesPrincipal, raw: unknown) {
  const input = object(raw);
  only(input, ["organizerId", "requestId", "restrictionRevision",
    "policyHash", "inventoryHash", "expectedActivePlanId"]);
  const organizerId = privacyId(input.organizerId, "organizer ID");
  const requestId = privacyRequestId(input.requestId);
  const restrictionRevision = revision(input.restrictionRevision);
  const policyHash = digest(input.policyHash, "policy hash");
  const inventoryHash = digest(input.inventoryHash, "inventory hash");
  const expectedActivePlanId = input.expectedActivePlanId === null ? null :
    privacyId(input.expectedActivePlanId, "active plan ID");
  await authorize(deps, principal);
  const inventory = await (deps.inventory ?? inventorySalesOrganizer)(
    firestoreInventoryPort(deps.db), organizerId);
  if (inventory.overflow || inventory.items.length === 0 ||
      inventory.inventoryHash !== inventoryHash) {
    throw new HttpsError("failed-precondition",
      "Privacy inventory changed or exceeded its bound; preview again.");
  }
  const planId = `privacy-${privacyHash([organizerId,
    restrictionRevision, policyHash, inventoryHash]).slice(0, 40)}`;
  const restrictionRef = deps.db.collection(PRIVACY_RESTRICTIONS).doc(organizerId);
  const policyRef = deps.db.collection(PRIVACY_POLICIES).doc("current");
  const planRef = deps.db.collection(PRIVACY_PLANS).doc(planId);
  return deps.db.runTransaction(async (tx) => {
    await authorize(deps, principal);
    const [restrictionSnap, policySnap, planSnap] = await Promise.all([
      tx.get(restrictionRef), tx.get(policyRef), tx.get(planRef)]);
    const restriction = restrictionFrom(restrictionSnap.data(), organizerId);
    const policy = policyFrom(policySnap.data());
    if (planSnap.exists && restriction.activePlanId === planId &&
        policy.policyHash === policyHash) {
      const prior = planFrom(planSnap.data(), organizerId, planId);
      if (prior.requestId !== requestId) {
        throw new HttpsError("already-exists",
          "This reviewed privacy plan belongs to another request.");
      }
      return {plan: safePlan(prior)};
    }
    if (restriction.revision !== restrictionRevision ||
        policy.policyHash !== policyHash ||
        restriction.activePlanId !== expectedActivePlanId) {
      throw new HttpsError("aborted", "Privacy case or policy changed.");
    }
    if (planSnap.exists) {
      throw new HttpsError("already-exists",
        "This privacy plan was already reviewed.");
    }
    const now = deps.now().toISOString();
    const plan: PrivacyPlan = {schemaVersion: 1,
      classification: "sales_private", planId, requestId, organizerId,
      restrictionRevision, policyHash, inventoryHash,
      items: inventory.items, blockers: inventory.blockers, cursor: 0,
      status: "reviewed", reviewedByUid: principal.uid,
      reviewedAt: now, updatedAt: now};
    tx.create(planRef, plan);
    tx.update(restrictionRef, {activePlanId: planId, revision:
      restriction.revision + 1});
    return {plan: safePlan(plan)};
  });
}

function allowedPlanPath(path: string): boolean {
  const parts = path.split("/");
  const direct = new Set(["organizerSalesAccounts", "salesContacts",
    "salesTasks", "salesOpportunities", "salesActivities", "salesEvidence",
    "salesEvidenceProposals", "salesInboundIntents",
    "salesContactRelationships", "salesSuppressionDecisions",
    "salesImportRows", "salesImportCompensations",
    "salesImportHistoryRows", "salesImportHistoryRecords",
    "salesIntelligenceAssessments", "salesIntelligenceClauses",
    "salesIntelligenceScoreSnapshots", "salesOutreachDrafts", "salesProviderAttempts", "salesPilotPlans",
    "salesQuotes", "salesQuoteVersions", "salesCommercialDecisions",
    "salesOpportunityStageHistory", "salesDemoBlueprints", "salesDemoSetups",
    "salesFitQueueEntries", "salesHostSettlementAttestations",
    "salesHostSettlementEvidenceUses", "salesHostSettlementIdentities",
    "salesImportJobs", "salesOutreachJobs", "salesActionReceipts",
    "salesIntelligenceReceipts",
    "salesDemoInvitations", "salesDemoSessions",
    "adminAuditLogs", "adminActionExecutions"]);
  return parts.length === 2 && direct.has(parts[0]) && Boolean(parts[1]) ||
    parts.length === 4 && Boolean(parts[1]) && Boolean(parts[3]) &&
      (parts[0] === "organizerSalesAccounts" && parts[2] === "customValues" ||
       parts[0] === "salesImportJobs" && parts[2] === "rows");
}

export async function applySalesPrivacyBatch(deps: PrivacyDeps,
  principal: SalesPrincipal, raw: unknown) {
  const input = object(raw);
  only(input, ["organizerId", "planId", "requestId", "expectedCursor"]);
  const organizerId = privacyId(input.organizerId, "organizer ID");
  const planId = privacyId(input.planId, "plan ID");
  const requestId = privacyRequestId(input.requestId);
  const expectedCursor = revision(input.expectedCursor);
  await authorize(deps, principal);
  const restrictionRef = deps.db.collection(PRIVACY_RESTRICTIONS).doc(organizerId);
  const policyRef = deps.db.collection(PRIVACY_POLICIES).doc("current");
  const planRef = deps.db.collection(PRIVACY_PLANS).doc(planId);
  const receiptId = `privacy-batch-${privacyHash([planId, expectedCursor])
    .slice(0, 40)}`;
  const receiptRef = deps.db.collection(PRIVACY_BATCH_RECEIPTS).doc(receiptId);
  return deps.db.runTransaction(async (tx) => {
    await authorize(deps, principal);
    const [restrictionSnap, policySnap, planSnap, receiptSnap] =
      await Promise.all([tx.get(restrictionRef), tx.get(policyRef),
        tx.get(planRef), tx.get(receiptRef)]);
    const restriction = restrictionFrom(restrictionSnap.data(), organizerId);
    const policy = policyFrom(policySnap.data());
    const plan = planFrom(planSnap.data(), organizerId, planId);
    if (restriction.activePlanId !== planId ||
        plan.policyHash !== policy.policyHash ||
        plan.restrictionRevision > restriction.revision) {
      throw new HttpsError("aborted", "Privacy plan or retention policy changed.");
    }
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data();
      if (receipt?.requestId !== requestId ||
          receipt?.planId !== planId || receipt?.expectedCursor !== expectedCursor) {
        throw new HttpsError("already-exists",
          "This privacy batch cursor belongs to another request.");
      }
      return {batch: receipt.result};
    }
    if (plan.cursor !== expectedCursor || plan.cursor >= plan.items.length) {
      throw new HttpsError("aborted", "Privacy plan cursor changed.");
    }
    const batch = plan.items.slice(plan.cursor, plan.cursor + MAX_BATCH_ITEMS);
    const reads = await Promise.all(batch.map((item) => {
      if (!allowedPlanPath(item.path)) {
        throw new HttpsError(
          "failed-precondition", "Privacy plan contains an unsafe path.");
      }
      return tx.get(deps.db.doc(item.path));
    }));
    for (let index = 0; index < batch.length; index++) {
      if (!reads[index].exists ||
          privacyHash(reads[index].data()) !== batch[index].contentHash) {
        throw new HttpsError("aborted",
          "A privacy source changed; review a new inventory.");
      }
    }
    for (const item of batch) {
      if (item.disposition !== "delete") continue;
      if (item.path.startsWith("salesContacts/")) {
        const contactId = item.path.split("/")[1];
        const related = await tx.get(deps.db.collection(
          "salesContactRelationships").where("contactId", "==", contactId)
          .limit(MAX_BATCH_ITEMS + 1));
        if (related.docs.some((doc) => doc.data().organizerId !== organizerId) ||
            related.docs.length > MAX_BATCH_ITEMS) {
          throw new HttpsError("aborted",
            "A shared contact relationship changed; review the inventory.");
        }
      }
    }
    const nextCursor = plan.cursor + batch.length;
    const status = nextCursor === plan.items.length ?
      "internal_processed_with_unresolved" : "processing";
    const result = {organizerId, planId, previousCursor: plan.cursor,
      nextCursor, itemCount: plan.items.length,
      deletedCount: batch.filter((item) => item.disposition === "delete").length,
      retainedCount: batch.filter((item) => item.disposition !== "delete").length,
      unresolvedCount: plan.blockers.length, status,
      completeDeletion: false, receiptId};
    for (const item of batch) {
      if (item.disposition === "delete") {
        tx.delete(deps.db.doc(item.path));
      }
    }
    const now = deps.now().toISOString();
    tx.update(planRef, {cursor: nextCursor, status, updatedAt: now});
    tx.update(restrictionRef, {status, revision: restriction.revision + 1});
    tx.create(receiptRef, {schemaVersion: 1, classification: "sales_private",
      receiptId, organizerId, planId, expectedCursor, requestId,
      result, createdAt: now, actorUid: principal.uid});
    return {batch: result};
  });
}

export async function getSalesPrivacyCase(deps: PrivacyDeps,
  principal: SalesPrincipal, raw: unknown) {
  const input = object(raw); only(input, ["organizerId"]);
  const organizerId = privacyId(input.organizerId, "organizer ID");
  await authorize(deps, principal);
  const [restrictionSnap, policySnap] = await Promise.all([
    deps.db.collection(PRIVACY_RESTRICTIONS).doc(organizerId).get(),
    deps.db.collection(PRIVACY_POLICIES).doc("current").get(),
  ]);
  const restriction = restrictionSnap.data();
  const policy = policySnap.exists ? policyFrom(policySnap.data()) : null;
  const safePolicy = policy ? {revision: policy.revision,
    policyHash: policy.policyHash, sourceReference: policy.sourceReference,
    reviewedAt: policy.reviewedAt,
    financeDisposition: policy.financeDisposition,
    auditDisposition: policy.auditDisposition,
    financeReason: policy.financeReason,
    auditReason: policy.auditReason} : null;
  if (!restriction) {
    await authorize(deps, principal);
    return {organizerId, restricted: false, plan: null, policy: safePolicy,
      completeDeletion: false};
  }
  const current = restrictionFrom(restriction, organizerId);
  const plan = current.activePlanId ? (await deps.db.collection(PRIVACY_PLANS)
    .doc(current.activePlanId).get()).data() : undefined;
  await authorize(deps, principal);
  return {organizerId, restricted: true,
    restriction: {status: current.status, revision: current.revision,
      restrictedAt: current.restrictedAt, reason: current.reason},
    plan: plan ? safePlan(planFrom(plan, organizerId,
      current.activePlanId!)) : null, policy: safePolicy,
    completeDeletion: false};
}
