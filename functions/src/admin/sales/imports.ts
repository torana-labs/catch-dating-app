import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {newSalesAccount} from "./account";
import {invalidateFitQueueInTransaction} from "../salesFitQueue/service";
import type {SalesPrincipal} from "./types";

export interface ImportRow {
  sourceRowId: string;
  organizerId: string | null;
  name: string;
  researchStatus: string;
  summary?: string | null;
  originalScore?: Record<string, string | number | boolean | null> | null;
  originalCells?: Array<{column: string; value: string}>;
  cohortIds?: string[];
}
export interface ImportPacket {
  sourceId: string;
  contentHash: string;
  mappingVersion: string;
  rows: ImportRow[];
}
export interface ImportApply extends ImportPacket {
  requestId: string;
  previewHash: string;
}
interface RowDecision {
  sourceRowId: string;
  organizerId: string | null;
  disposition: "created" | "matched" | "duplicate" | "unresolved" | "rejected";
  reason: string;
  accountRevision: number | null;
}

/** Immutable proof for a future, bounded compensating Sales action. */
export interface ImportAccountEffect {
  organizerId: string;
  sourceRowIds: string[];
  created: boolean;
  revisionBefore: number | null;
  revisionAfter: number;
  cohortIdsBefore: string[];
  cohortIdsAfter: string[];
  cohortIdsAdded: string[];
  cohortMutationIdBefore: string | null;
  cohortMutationIdAfter: string;
  createdAccountHash: string | null;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function importAccountHash(value: unknown): string {
  return sha(canonical(value));
}

function assertEmployee(principal: SalesPrincipal): void {
  if (principal.clientId) {
    throw new HttpsError(
      "permission-denied",
      "Reviewed imports require an employee session.",
    );
  }
}

function assertPacketSize(packet: ImportPacket): void {
  if (Buffer.byteLength(JSON.stringify(packet), "utf8") > 500_000) {
    throw new HttpsError("invalid-argument",
      "Import batch exceeds 500 KB. Use smaller source rows.");
  }
}

async function evaluateRows(
  db: FirebaseFirestore.Firestore,
  packet: ImportPacket,
  get: (
    ref: FirebaseFirestore.DocumentReference,
  ) => Promise<FirebaseFirestore.DocumentSnapshot>,
): Promise<RowDecision[]> {
  const seenRows = new Set<string>();
  const organizerDecisions = new Map<string, RowDecision>();
  const decisions: RowDecision[] = [];
  for (const row of packet.rows) {
    const sourceKey = `${packet.sourceId}\u0000${row.sourceRowId}`;
    const base = {sourceRowId: row.sourceRowId, organizerId: row.organizerId};
    if (seenRows.has(sourceKey)) {
      decisions.push({
        ...base,
        disposition: "duplicate",
        reason: "repeated_source_row",
        accountRevision: null,
      });
      continue;
    }
    seenRows.add(sourceKey);
    if (!row.organizerId) {
      decisions.push({
        ...base,
        disposition: "unresolved",
        reason: "identity_unresolved",
        accountRevision: null,
      });
      continue;
    }
    const sourceRef = db.collection("salesImportRows").doc(sha(sourceKey));
    const sourceSnap = await get(sourceRef);
    if (sourceSnap.exists) {
      const changed =
        sourceSnap.data()?.sourceContentHash !== packet.contentHash;
      decisions.push({
        ...base,
        disposition: changed ? "rejected" : "duplicate",
        reason: changed ? "source_content_conflict" : "source_row_imported",
        accountRevision: null,
      });
      continue;
    }
    const prior = organizerDecisions.get(row.organizerId);
    if (prior) {
      const previouslyAccepted = prior.disposition === "created" ||
        prior.disposition === "matched";
      decisions.push({...base,
        disposition: previouslyAccepted ? "matched" : prior.disposition,
        reason: previouslyAccepted ? "same_batch_organizer" : prior.reason,
        accountRevision: prior.accountRevision});
      continue;
    }
    const organizerRef = db.collection("organizers").doc(row.organizerId);
    const accountRef = db
      .collection("organizerSalesAccounts")
      .doc(row.organizerId);
    const [organizerSnap, accountSnap] = await Promise.all([
      get(organizerRef),
      get(accountRef),
    ]);
    let decision: RowDecision;
    if (!organizerSnap.exists) {
      decision = {
        ...base,
        disposition: "rejected",
        reason: "canonical_organizer_missing",
        accountRevision: null,
      };
    } else if (
      accountSnap.exists &&
      accountSnap.data()?.classification !== "sales_private"
    ) {
      decision = {
        ...base,
        disposition: "rejected",
        reason: "account_contract_invalid",
        accountRevision: null,
      };
    } else if (accountSnap.exists &&
      accountSnap.data()?.researchStatus === "archived") {
      decision = {
        ...base,
        disposition: "rejected",
        reason: "private_account_archived",
        accountRevision: null,
      };
    } else if (accountSnap.exists) {
      decision = {
        ...base,
        disposition: "matched",
        reason: "existing_private_account",
        accountRevision: Number(accountSnap.data()?.revision),
      };
    } else {
      decision = {
        ...base,
        disposition: "created",
        reason: "new_private_companion",
        accountRevision: 0,
      };
    }
    organizerDecisions.set(row.organizerId, decision);
    decisions.push(decision);
  }
  return decisions;
}

function previewHash(packet: ImportPacket, decisions: RowDecision[]): string {
  return sha(canonical({packet, decisions}));
}

/** Read-only preview with one disposition per source row. */
export async function previewSalesImport(
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  packet: ImportPacket,
): Promise<Record<string, unknown>> {
  assertEmployee(principal);
  assertPacketSize(packet);
  const decisions = await evaluateRows(db, packet, (ref) => ref.get());
  return {
    previewHash: previewHash(packet, decisions),
    rows: decisions,
    counts: countDecisions(decisions),
    packetRowCount: packet.rows.length,
    scope: "reviewed_batch",
    effectsApplied: false,
  };
}

export async function applySalesImport(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  input: ImportApply,
  now: string,
): Promise<Record<string, unknown>> {
  assertEmployee(principal);
  const packet: ImportPacket = {
    sourceId: input.sourceId,
    contentHash: input.contentHash,
    mappingVersion: input.mappingVersion,
    rows: input.rows,
  };
  assertPacketSize(packet);
  const decisions = await evaluateRows(db, packet, (ref) => tx.get(ref));
  if (previewHash(packet, decisions) !== input.previewHash) {
    throw new HttpsError(
      "aborted",
      "Import changed since the reviewed preview.",
    );
  }
  const importKey = `${principal.uid}\u0000${input.requestId}`;
  const importId = `import-${sha(importKey).slice(0, 24)}`;
  const jobRef = db.collection("salesImportJobs").doc(importId);
  const jobSnap = await tx.get(jobRef);
  if (jobSnap.exists) {
    throw new HttpsError("already-exists", "Import job already exists.");
  }
  const createdIds = [
    ...new Set(
      decisions
        .filter(
          (decision) =>
            decision.disposition === "created" && decision.organizerId,
        )
        .map((decision) => decision.organizerId as string),
    ),
  ];
  const matchedIds = [
    ...new Set(decisions.filter((decision) =>
      decision.disposition === "matched" && decision.organizerId)
      .map((decision) => decision.organizerId as string)),
  ].filter((id) => !createdIds.includes(id));
  const canonicalSnapshots = await Promise.all(
    createdIds.map(
      async (id) =>
        [id, await tx.get(db.collection("organizers").doc(id))] as const,
    ),
  );
  const canonicalById = new Map(canonicalSnapshots);
  const accountSnapshots = await Promise.all(matchedIds.map(async (id) =>
    [id, await tx.get(db.collection("organizerSalesAccounts")
      .doc(id))] as const));
  const accountById = new Map(accountSnapshots);
  const cohortsById = new Map<string, Set<string>>();
  input.rows.forEach((row, index) => {
    if (!row.organizerId ||
      !["created", "matched"].includes(decisions[index].disposition)) return;
    const cohorts = cohortsById.get(row.organizerId) ?? new Set<string>();
    for (const cohortId of row.cohortIds ?? []) cohorts.add(cohortId);
    cohortsById.set(row.organizerId, cohorts);
  });
  const accountUpdates: Array<{
    ref: FirebaseFirestore.DocumentReference;
    cohortIds: string[];
    revision: number;
    cohortMutationId: string;
  }> = [];
  const accountEffects: ImportAccountEffect[] = [];
  for (const [organizerId, cohorts] of cohortsById) {
    if (cohorts.size > 30) {
      throw new HttpsError("failed-precondition",
        "Sales account cohort limit exceeded.");
    }
    const accountSnap = accountById.get(organizerId);
    const sourceRowIds = input.rows.filter((row, index) =>
      row.organizerId === organizerId &&
      ["created", "matched"].includes(decisions[index].disposition))
      .map((row) => row.sourceRowId);
    const nextToken = sha(`${importId}\u0000${organizerId}`);
    if (!accountSnap) {
      const canonicalSnap = canonicalById.get(organizerId);
      if (!canonicalSnap?.exists) {
        throw new HttpsError("aborted",
          "Canonical organizer changed during import review.");
      }
      const createdAccount = {...newSalesAccount(organizerId,
        canonicalSnap.data() ?? {}, principal.uid, now, "needs_research"),
      cohortIds: [...cohorts], cohortMutationId: nextToken};
      accountEffects.push({organizerId, sourceRowIds, created: true,
        revisionBefore: null, revisionAfter: createdAccount.revision,
        cohortIdsBefore: [], cohortIdsAfter: [...cohorts],
        cohortIdsAdded: [...cohorts], cohortMutationIdBefore: null,
        cohortMutationIdAfter: nextToken,
        createdAccountHash: importAccountHash(createdAccount)});
      continue;
    }
    const account = accountSnap.data();
    const matchedDecision = decisions.find((decision) =>
      decision.organizerId === organizerId &&
      decision.disposition === "matched");
    if (!accountSnap.exists || account?.classification !== "sales_private" ||
      account.revision !== matchedDecision?.accountRevision) {
      throw new HttpsError("aborted",
        "Sales account changed during import review.");
    }
    const existing = account.cohortIds;
    if (!Array.isArray(existing) ||
      existing.some((value) => typeof value !== "string")) {
      throw new HttpsError("aborted", "Sales account cohorts are invalid.");
    }
    const merged = [...new Set([...existing, ...cohorts])];
    if (merged.length > 30) {
      throw new HttpsError("failed-precondition",
        "Sales account cohort limit exceeded.");
    }
    const changed = cohorts.size > 0;
    accountEffects.push({organizerId, sourceRowIds, created: false,
      revisionBefore: account.revision,
      revisionAfter: account.revision + (changed ? 1 : 0),
      cohortIdsBefore: [...existing], cohortIdsAfter: merged,
      cohortIdsAdded: merged.filter((id) => !existing.includes(id)),
      cohortMutationIdBefore: account.cohortMutationId ?? null,
      cohortMutationIdAfter: changed ? nextToken :
        (account.cohortMutationId ?? "initial"),
      createdAccountHash: null});
    if (changed) {
      accountUpdates.push({ref: accountSnap.ref, cohortIds: merged,
        revision: account.revision + 1, cohortMutationId: nextToken});
    }
  }
  for (const update of accountUpdates) {
    tx.update(update.ref, {cohortIds: update.cohortIds,
      cohortMutationId: update.cohortMutationId,
      revision: update.revision, updatedAt: now, updatedBy: principal.uid});
    invalidateFitQueueInTransaction(tx, db, update.ref.id, now);
  }
  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    const decision = decisions[index];
    const lineage = {
      schemaVersion: 1,
      classification: "sales_private",
      importId,
      sourceId: input.sourceId,
      sourceRowId: row.sourceRowId,
      sourceContentHash: input.contentHash,
      mappingVersion: input.mappingVersion,
      organizerId: row.organizerId,
      disposition: decision.disposition,
      reason: decision.reason,
      originalScore: row.originalScore ?? null,
      originalResearchStatus: row.researchStatus,
      originalSummary: row.summary ?? null,
      originalCells: row.originalCells ?? null,
      cohortIds: row.cohortIds ?? [],
      importedAt: now,
      importedBy: principal.uid,
    };
    tx.create(
      jobRef.collection("rows").doc(String(index).padStart(3, "0")),
      lineage,
    );
    if (
      decision.disposition !== "created" &&
      decision.disposition !== "matched"
    ) {
      continue;
    }
    const sourceKey = `${input.sourceId}\u0000${row.sourceRowId}`;
    tx.create(db.collection("salesImportRows").doc(sha(sourceKey)), lineage);
    if (decision.disposition === "created" && row.organizerId) {
      const canonicalSnap = canonicalById.get(row.organizerId);
      if (!canonicalSnap?.exists) {
        throw new HttpsError(
          "aborted",
          "Canonical organizer changed during import review.",
        );
      }
      const effect = accountEffects.find((item) =>
        item.organizerId === row.organizerId);
      tx.create(
        db.collection("organizerSalesAccounts").doc(row.organizerId),
        {...newSalesAccount(
          row.organizerId,
          canonicalSnap.data() ?? {},
          principal.uid,
          now,
          "needs_research",
        ), cohortIds: [...(cohortsById.get(row.organizerId) ?? [])],
        cohortMutationId: effect?.cohortMutationIdAfter},
      );
      invalidateFitQueueInTransaction(tx, db, row.organizerId, now);
    }
  }
  const counts = countDecisions(decisions);
  tx.create(jobRef, {
    schemaVersion: 1,
    classification: "sales_private",
    importId,
    sourceId: input.sourceId,
    contentHash: input.contentHash,
    mappingVersion: input.mappingVersion,
    previewHash: input.previewHash,
    rowCount: input.rows.length,
    counts,
    accountEffects,
    status: "applied",
    createdAt: now,
    createdBy: principal.uid,
  });
  return {
    importId,
    counts,
    rows: decisions,
    packetRowCount: input.rows.length,
    scope: "reviewed_batch",
    effectsApplied: true,
  };
}

/** Applied batches, newest first. Hosts stay out: they are read per batch. */
export async function listSalesImports(
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  input: {limit?: number; cursor?: string},
): Promise<Record<string, unknown>> {
  assertEmployee(principal);
  const jobs = db.collection("salesImportJobs");
  const limit = input.limit ?? 25;
  let query = jobs.orderBy("createdAt", "desc");
  if (input.cursor) {
    const cursor = await jobs.doc(input.cursor).get();
    if (!cursor.exists) {
      throw new HttpsError("invalid-argument", "Import page is out of date.");
    }
    query = query.startAfter(cursor);
  }
  const page = await query.limit(limit + 1).get();
  const docs = page.docs.slice(0, limit);
  return {
    rows: docs.map((doc) => {
      const job = doc.data();
      return {
        importId: doc.id,
        sourceId: job.sourceId,
        rowCount: job.rowCount,
        counts: job.counts,
        appliedAt: job.createdAt,
        appliedBy: job.createdBy,
      };
    }),
    nextCursor: page.docs.length > docs.length ?
      docs.at(-1)?.id ?? null : null,
  };
}

/** One batch's hosts, so a correction picks a host rather than typing IDs. */
export async function listSalesImportHosts(
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  input: {importId: string},
): Promise<Record<string, unknown>> {
  assertEmployee(principal);
  const job = await db.collection("salesImportJobs").doc(input.importId).get();
  if (!job.exists) throw new HttpsError("not-found", "Import not found.");
  const effects: unknown = job.data()?.accountEffects;
  const ids = [...new Set((Array.isArray(effects) ? effects : [])
    .map((effect) => (effect as {organizerId?: unknown}).organizerId)
    .filter((id): id is string => typeof id === "string"))];
  const accounts = await Promise.all(ids.map((id) =>
    db.collection("organizerSalesAccounts").doc(id).get()));
  return {
    rows: accounts.map((account) => ({
      importId: input.importId,
      organizerId: account.id,
      name: account.data()?.name ?? account.id,
    })),
  };
}

function countDecisions(
  decisions: RowDecision[],
): Record<RowDecision["disposition"], number> {
  const counts = {
    created: 0,
    matched: 0,
    duplicate: 0,
    unresolved: 0,
    rejected: 0,
  };
  for (const row of decisions) counts[row.disposition] += 1;
  return counts;
}
