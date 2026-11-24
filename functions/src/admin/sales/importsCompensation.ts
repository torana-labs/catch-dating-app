import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {canonical, importAccountHash,
  type ImportAccountEffect} from "./imports";
import {invalidateFitQueueInTransaction} from "../salesFitQueue/service";
import type {SalesPrincipal} from "./types";

export interface ImportCompensationInput {
  importId: string;
  organizerId: string;
}
export interface ImportCompensationApply extends ImportCompensationInput {
  requestId: string;
  previewHash: string;
  reason: string;
}

type Mode = "archive_companion" | "remove_cohorts" | "blocked";
interface Decision {
  mode: Mode;
  blockers: string[];
  importId: string;
  organizerId: string;
  accountRevision: number | null;
  cohortIdsRemoved: string[];
  previewHash: string;
  alreadyCompensated: boolean;
}

/** Explicit inventory of durable dependent work written by Sales services. */
export const COMPENSATION_DEPENDENCY_COLLECTIONS = [
  "salesTasks", "salesOpportunities", "salesActivities",
  "salesContactRelationships", "salesEvidence", "salesEvidenceProposals",
  "salesSuppressionDecisions", "salesPilotPlans", "salesQuotes",
  "salesQuoteVersions", "salesCommercialDecisions",
  "salesOpportunityStageHistory", "salesHostSettlementAttestations",
  "salesHostSettlementEvidenceUses", "salesHostSettlementIdentities",
  "salesIntelligenceAssessments", "salesIntelligenceClauses",
  "salesIntelligenceScoreSnapshots", "salesOutreachDrafts",
  "salesDemoBlueprints",
  "salesImportHistoryRows", "salesImportHistoryRecords",
] as const;

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertOwner(principal: SalesPrincipal): void {
  if (!principal.uid || principal.clientId ||
      !principal.roles.includes("adminOwner")) {
    throw new HttpsError("permission-denied",
      "Current Admin Owner authority is required for compensation.");
  }
}

function validEffect(value: unknown, organizerId: string):
  value is ImportAccountEffect {
  if (!value || typeof value !== "object") return false;
  const effect = value as Partial<ImportAccountEffect>;
  return effect.organizerId === organizerId &&
    typeof effect.created === "boolean" &&
    Number.isInteger(effect.revisionAfter) &&
    (effect.revisionBefore === null ||
      Number.isInteger(effect.revisionBefore)) &&
    Array.isArray(effect.sourceRowIds) && effect.sourceRowIds.length > 0 &&
    [effect.cohortIdsBefore, effect.cohortIdsAfter, effect.cohortIdsAdded]
      .every((items) => Array.isArray(items) &&
        items.every((item) => typeof item === "string")) &&
    typeof effect.cohortMutationIdAfter === "string" &&
    (effect.cohortMutationIdBefore === null ||
      typeof effect.cohortMutationIdBefore === "string") &&
    (effect.createdAccountHash === null ||
      typeof effect.createdAccountHash === "string");
}

async function decision(
  db: FirebaseFirestore.Firestore,
  read: (ref: FirebaseFirestore.DocumentReference | FirebaseFirestore.Query) =>
    Promise<FirebaseFirestore.DocumentSnapshot |
      FirebaseFirestore.QuerySnapshot>,
  input: ImportCompensationInput,
): Promise<Decision> {
  const effectId = sha(`${input.importId}\u0000${input.organizerId}`);
  const jobRef = db.collection("salesImportJobs").doc(input.importId);
  const accountRef = db.collection("organizerSalesAccounts")
    .doc(input.organizerId);
  const compensatedRef = db.collection("salesImportCompensations")
    .doc(effectId);
  const [jobSnap, accountSnap, compensatedSnap] = await Promise.all([
    read(jobRef), read(accountRef), read(compensatedRef),
  ]) as FirebaseFirestore.DocumentSnapshot[];
  const account = accountSnap.data();
  const blockers: string[] = [];
  const job = jobSnap.data();
  const effects = job?.accountEffects;
  const effect = Array.isArray(effects) ? effects.find((candidate) =>
    candidate?.organizerId === input.organizerId) : null;
  if (!jobSnap.exists || job?.status !== "applied" ||
      !validEffect(effect, input.organizerId)) {
    blockers.push("import_proof_missing");
  }
  if (!accountSnap.exists || account?.classification !== "sales_private") {
    blockers.push("private_account_missing");
  }
  if (account?.researchStatus === "archived" && !compensatedSnap.exists) {
    blockers.push("account_already_archived");
  }
  if (effect && validEffect(effect, input.organizerId) && account) {
    if (account.cohortMutationId !== effect.cohortMutationIdAfter ||
        canonical(account.cohortIds) !== canonical(effect.cohortIdsAfter)) {
      blockers.push("cohort_changed_since_import");
    }
    if (!Array.isArray(account.cohortIds) ||
        effect.cohortIdsAdded.some((id) => !account.cohortIds.includes(id))) {
      blockers.push("import_cohort_membership_missing");
    }
  }
  const siblings = await read(db.collection("salesImportRows")
    .where("organizerId", "==", input.organizerId).limit(51)) as
      FirebaseFirestore.QuerySnapshot;
  if (siblings.size >= 51) blockers.push("lineage_query_overflow");
  if (siblings.docs.some((row) => row.data().importId !== input.importId)) {
    blockers.push("sibling_import_membership");
  }
  let mode: Mode = "blocked";
  if (!compensatedSnap.exists && blockers.length === 0 && effect) {
    const pristine = effect.created && effect.createdAccountHash &&
      importAccountHash(account) === effect.createdAccountHash &&
      account?.revision === effect.revisionAfter;
    if (pristine) {
      const checks = await Promise.all([
        ...COMPENSATION_DEPENDENCY_COLLECTIONS.map((collection) =>
          read(db.collection(collection)
            .where("organizerId", "==", input.organizerId).limit(1))),
        read(db.collection("salesOutreachJobs")
          .where("sourceRequest.organizerId", "==", input.organizerId)
          .limit(1)),
        read(accountRef.collection("customValues").limit(1)),
      ]) as FirebaseFirestore.QuerySnapshot[];
      if (checks.some((snapshot) => snapshot.size > 0)) {
        if (effect.cohortIdsAdded.length === 0) {
          blockers.push("dependent_business_work");
        }
      } else {
        mode = "archive_companion";
      }
    }
    if (mode === "blocked" && blockers.length === 0) {
      mode = effect.cohortIdsAdded.length > 0 ? "remove_cohorts" : "blocked";
      if (mode === "blocked") blockers.push("no_owned_cohort_change");
    }
  }
  const base = {mode, blockers, importId: input.importId,
    organizerId: input.organizerId,
    accountRevision: typeof account?.revision === "number" ?
      account.revision : null,
    cohortIdsRemoved: mode !== "blocked" ?
      effect.cohortIdsAdded : [],
    alreadyCompensated: compensatedSnap.exists};
  return {...base, previewHash: sha(canonical({base,
    cohortMutationId: account?.cohortMutationId ?? null,
    effectId, accountHash: account ? importAccountHash(account) : null}))};
}

/** Read-only, owner-reviewed plan. It never changes the original job. */
export async function previewImportCompensation(
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  input: ImportCompensationInput,
): Promise<Record<string, unknown>> {
  assertOwner(principal);
  return {...await decision(db, (ref) => ref.get(), input)};
}

/** Atomic correction and immutable cross-request effect marker. */
export async function applyImportCompensation(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  input: ImportCompensationApply,
  now: string,
): Promise<Record<string, unknown>> {
  assertOwner(principal);
  const plan = await decision(db, (ref) => "where" in ref ?
    tx.get(ref as FirebaseFirestore.Query) :
    tx.get(ref as FirebaseFirestore.DocumentReference), input);
  if (plan.alreadyCompensated) {
    return {importId: input.importId, organizerId: input.organizerId,
      status: "already_compensated"};
  }
  if (plan.previewHash !== input.previewHash) {
    throw new HttpsError("aborted", "Compensation changed since review.");
  }
  if (plan.mode === "blocked") {
    throw new HttpsError("failed-precondition",
      `Compensation blocked: ${plan.blockers.join(", ")}`);
  }
  const effectId = sha(`${input.importId}\u0000${input.organizerId}`);
  const job = (await tx.get(db.collection("salesImportJobs")
    .doc(input.importId))).data();
  const effect = (job?.accountEffects as ImportAccountEffect[])
    .find((item) => item.organizerId === input.organizerId);
  if (!effect) {
    throw new HttpsError("failed-precondition", "Import effect proof missing.");
  }
  const accountRef = db.collection("organizerSalesAccounts")
    .doc(input.organizerId);
  const account = (await tx.get(accountRef)).data()!;
  const nextToken = sha(`compensation\u0000${effectId}`);
  if (plan.mode === "archive_companion") {
    tx.update(accountRef, {researchStatus: "archived",
      suppressionStatus: "held", suppressionReason: input.reason,
      suppressionAt: now, suppressionBy: principal.uid,
      assignedOwnerUid: null, nextAction: null,
      cohortIds: effect.cohortIdsBefore,
      cohortMutationId: nextToken, revision: account.revision + 1,
      updatedAt: now, updatedBy: principal.uid});
  } else {
    tx.update(accountRef, {cohortIds: account.cohortIds.filter((id: string) =>
      !effect.cohortIdsAdded.includes(id)),
    cohortMutationId: nextToken, revision: account.revision + 1,
    updatedAt: now, updatedBy: principal.uid});
  }
  invalidateFitQueueInTransaction(tx, db, input.organizerId, now);
  tx.create(db.collection("salesImportCompensations").doc(effectId), {
    schemaVersion: 1, classification: "sales_private", effectId,
    importId: input.importId, organizerId: input.organizerId,
    mode: plan.mode, sourceRowIds: effect.sourceRowIds,
    cohortIdsRemoved: plan.cohortIdsRemoved, beforeRevision: account.revision,
    afterRevision: account.revision + 1,
    beforeCohortMutationId: effect.cohortMutationIdAfter,
    afterCohortMutationId: nextToken, reason: input.reason,
    createdAt: now, createdBy: principal.uid, requestId: input.requestId,
  });
  return {importId: input.importId, organizerId: input.organizerId,
    status: "compensated", mode: plan.mode,
    cohortIdsRemoved: plan.cohortIdsRemoved,
    accountRevision: account.revision + 1};
}
