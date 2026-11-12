import fs from "node:fs";
import path from "node:path";
import {isDeepStrictEqual} from "node:util";

/**
 * Copy-forward Firestore migrations for collection consolidation.
 *
 * A migration copies each source document to a target document. It never
 * deletes or updates a source document, and it never overwrites a target:
 * targets are written with `create()`, so a retry after a partial run is a
 * no-op for documents already copied. Under the 7 Nov 2026 data hold, the old
 * collections stay in place until the owner lifts the hold.
 *
 * A copy step is {source, target, targetId(id, data), transform(data, id)}:
 * - `source` is a top-level collection id;
 * - `targetId` returns the target document id, or null to skip;
 * - `transform` returns the target document data, or null to skip.
 *
 * A fill step is {kind: "fill", collection, fill(data, id)}: `fill` returns
 * fields to add to the same document, or null. Only fields the document does
 * not already hold (absent, null, or an empty list or map) may be returned, so
 * no information is overwritten, and each update
 * is preconditioned on the document's last update time.
 */

const PAGE_SIZE = 500;
const WRITE_BATCH = 400;

export async function planMigration(db, migration) {
  const steps = [];
  for (const step of migration.steps) {
    steps.push(await planStep(db, step));
  }
  return {
    migration: migration.name,
    description: migration.description,
    steps,
    totals: totals(steps),
  };
}

async function planStep(db, step) {
  if (step.kind === "fill") return planFillStep(db, step);
  const result = {
    source: step.source,
    target: step.target,
    scanned: 0,
    toCreate: [],
    alreadyCopied: 0,
    conflicts: [],
    skipped: [],
  };
  for await (const doc of pagedDocs(db.collection(step.source))) {
    result.scanned += 1;
    const data = doc.data();
    // Ids and transforms may be async and may read (never write) other data.
    const targetId = await step.targetId(doc.id, data, db);
    const next = targetId === null ? null : await step.transform(data, doc.id, db);
    if (targetId === null || next === null) {
      result.skipped.push({sourcePath: doc.ref.path, reason: step.skipReason ?? "not migrated"});
      continue;
    }
    const targetRef = db.collection(step.target).doc(targetId);
    const existing = await targetRef.get();
    if (existing.exists) {
      if (isDeepStrictEqual(existing.data(), next)) {
        result.alreadyCopied += 1;
      } else {
        result.conflicts.push({sourcePath: doc.ref.path, targetPath: targetRef.path});
      }
      continue;
    }
    result.toCreate.push({sourcePath: doc.ref.path, targetPath: targetRef.path, data: next});
  }
  return result;
}

async function planFillStep(db, step) {
  const result = {
    kind: "fill",
    source: step.collection,
    target: step.collection,
    scanned: 0,
    toCreate: [],
    toFill: [],
    alreadyCopied: 0,
    conflicts: [],
    skipped: [],
  };
  for await (const doc of pagedDocs(db.collection(step.collection))) {
    result.scanned += 1;
    const data = doc.data();
    // A fill may be async and may read other collections (never write).
    const fields = await step.fill(data, doc.id, db);
    if (fields === null) continue;
    const present = Object.keys(fields).filter((field) => !isEmptyValue(data[field]));
    if (present.length > 0) {
      result.conflicts.push({sourcePath: doc.ref.path, targetPath: doc.ref.path, fields: present});
      continue;
    }
    result.toFill.push({sourcePath: doc.ref.path, targetPath: doc.ref.path, data: fields,
      updateTime: doc.updateTime});
  }
  return result;
}

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.keys(value).length === 0;
  }
  return false;
}

async function* pagedDocs(collectionRef) {
  let last = null;
  for (;;) {
    let query = collectionRef.orderBy("__name__").limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    for (const doc of snap.docs) yield doc;
    if (snap.docs.length < PAGE_SIZE) return;
    last = snap.docs[snap.docs.length - 1];
  }
}

function totals(steps) {
  return steps.reduce((sum, step) => ({
    scanned: sum.scanned + step.scanned,
    toCreate: sum.toCreate + step.toCreate.length + (step.toFill?.length ?? 0),
    alreadyCopied: sum.alreadyCopied + step.alreadyCopied,
    conflicts: sum.conflicts + step.conflicts.length,
    skipped: sum.skipped + step.skipped.length,
  }), {scanned: 0, toCreate: 0, alreadyCopied: 0, conflicts: 0, skipped: 0});
}

/**
 * Writes the plan's new target documents. Refuses to run when the plan has
 * conflicts. Every write is a create, so an existing target fails the batch
 * instead of being overwritten.
 */
export async function applyMigrationPlan(db, plan) {
  if (plan.totals.conflicts > 0) {
    throw new Error(
      `${plan.migration}: ${plan.totals.conflicts} target document(s) already ` +
      "exist with different data. Resolve them before applying."
    );
  }
  let created = 0;
  for (const step of plan.steps) {
    for (let i = 0; i < step.toCreate.length; i += WRITE_BATCH) {
      const batch = db.batch();
      for (const write of step.toCreate.slice(i, i + WRITE_BATCH)) {
        batch.create(db.doc(write.targetPath), write.data);
      }
      await batch.commit();
      created += Math.min(WRITE_BATCH, step.toCreate.length - i);
    }
    for (let i = 0; i < (step.toFill ?? []).length; i += WRITE_BATCH) {
      const batch = db.batch();
      for (const write of step.toFill.slice(i, i + WRITE_BATCH)) {
        batch.update(db.doc(write.targetPath), write.data,
          write.updateTime ? {lastUpdateTime: write.updateTime} : undefined);
      }
      await batch.commit();
      created += Math.min(WRITE_BATCH, step.toFill.length - i);
    }
  }
  return {migration: plan.migration, created};
}

/** Saves the exact documents an apply will create, before it runs. */
export function writePlanBackup(filePath, plans) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, JSON.stringify({
    writtenAt: new Date().toISOString(),
    plans: plans.map((plan) => ({
      migration: plan.migration,
      totals: plan.totals,
      steps: plan.steps.map((step) => ({
        source: step.source,
        target: step.target,
        toCreate: step.toCreate.map((write) => ({
          sourcePath: write.sourcePath,
          targetPath: write.targetPath,
          data: serializable(write.data),
        })),
        toFill: (step.toFill ?? []).map((write) => ({
          targetPath: write.targetPath,
          data: serializable(write.data),
        })),
        conflicts: step.conflicts,
        skipped: step.skipped,
      })),
    })),
  }, null, 2));
}

function serializable(value) {
  if (value === null || typeof value !== "object") return value;
  if (typeof value.toMillis === "function" && "seconds" in value) {
    return {_seconds: value.seconds, _nanoseconds: value.nanoseconds};
  }
  if (Array.isArray(value)) return value.map(serializable);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializable(v)]));
}

export function summarizePlan(plan) {
  return {
    migration: plan.migration,
    totals: plan.totals,
    steps: plan.steps.map((step) => ({
      source: step.source,
      target: step.target,
      scanned: step.scanned,
      toCreate: step.toCreate.length + (step.toFill?.length ?? 0),
      alreadyCopied: step.alreadyCopied,
      conflicts: step.conflicts,
      skipped: step.skipped.length,
    })),
  };
}
