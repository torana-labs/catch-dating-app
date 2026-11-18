import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {BIGQUERY_CHANGELOGS, BIGQUERY_STREAMED} from "./inventory.mjs";
import {TakedownError} from "./plan.mjs";
import {caseRoot, sha256} from "./actions.mjs";

// BigQuery mode: after the Firestore apply, the export extensions' changelog
// tables still hold every version of each deleted document, and the streamed
// analytics tables hold rows by organizer_id. Like the deck-era purge, the
// SQL is fixed, ids reach BigQuery only as the @ids array parameter (read
// from a file), DML waits out the streaming buffer, every table is counted
// before and after, and rows that remain fail the run. Matching rows are
// first exported to the preservation bucket. Output is counts only.

export const STREAMING_BUFFER_WAIT_MS = 90 * 60 * 1000;
const BUFFER_MARGIN_MS = 15 * 60 * 1000;

/** The fixed statements, by table and column. Table names come only from inventory.mjs. */
export function statements(table, column) {
  if (!/^[a-z_]+\.[a-z_]+$/u.test(table) || !["document_id", "organizer_id"].includes(column)) {
    throw new TakedownError("Unsupported BigQuery table.");
  }
  return {
    count: `SELECT COUNT(*) AS row_count FROM \`${table}\` WHERE ${column} IN UNNEST(@ids)`,
    select: `SELECT * FROM \`${table}\` WHERE ${column} IN UNNEST(@ids)`,
    delete: `DELETE FROM \`${table}\` WHERE ${column} IN UNNEST(@ids)`,
  };
}

/** The tables to clean and the ids for each, from the apply manifest. */
export function bigqueryTargets(applyManifest) {
  const targets = [];
  for (const [collection, table] of Object.entries(BIGQUERY_CHANGELOGS)) {
    targets.push({table, column: "document_id", ids: [...new Set(applyManifest.bigquery?.[collection] ?? [])].sort()});
  }
  for (const table of BIGQUERY_STREAMED) {
    targets.push({table, column: "organizer_id", ids: [...new Set(applyManifest.organizerIds ?? [])].sort()});
  }
  return targets;
}

function parameterFile(directory, ids) {
  const file = path.join(directory, `ids-${sha256(ids.join("\n")).slice(0, 12)}.json`);
  fs.writeFileSync(file, JSON.stringify([{name: "ids", parameterType: {type: "ARRAY", arrayType: {type: "STRING"}},
    parameterValue: {arrayValues: ids.map((value) => ({value}))}}]));
  return file;
}

/**
 * Runs the BigQuery cleanup. `runBq(args)` runs the bq CLI and resolves to
 * its stdout (rejecting on failure); `now()` is injectable for tests.
 */
export async function cleanBigQuery({applyManifest, projectId, store, runBq, now, caseId}) {
  if (!applyManifest) throw new TakedownError("No apply run exists for this case. Run apply first.");
  const completedAt = Date.parse(applyManifest.completedAt);
  const readyAt = completedAt + STREAMING_BUFFER_WAIT_MS;
  if (!Number.isFinite(completedAt) || now().getTime() < readyAt) {
    throw new TakedownError("The apply run's changes can still be in BigQuery's streaming buffer, which DML cannot " +
      `touch. Retry after ${new Date(readyAt).toISOString().slice(0, 16)}Z.`);
  }
  const bq = (args) => runBq(["--quiet", "--headless", `--project_id=${projectId}`, "--location=asia-south1", ...args]);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "organizer-takedown-bq-"));
  const stampText = now().toISOString().replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z");
  const rows = [];
  try {
    for (const target of bigqueryTargets(applyManifest)) {
      if (target.ids.length === 0) {
        rows.push({table: target.table, ids: 0, before: null, after: null, preserved: 0});
        continue;
      }
      const sql = statements(target.table, target.column);
      const params = parameterFile(directory, target.ids);
      let metadata;
      try {
        metadata = JSON.parse(await bq(["--format=json", "show", target.table]));
      } catch {
        throw new TakedownError(`Cannot read ${target.table}.`);
      }
      const oldest = Number(metadata?.streamingBuffer?.oldestEntryTime ?? NaN);
      if (Number.isFinite(oldest) && oldest <= completedAt + BUFFER_MARGIN_MS) {
        throw new TakedownError(`${target.table}'s streaming buffer still holds rows from around the apply run. Retry later.`);
      }
      const count = async () => Number(JSON.parse(await bq(["--format=json", "query", "--use_legacy_sql=false",
        `--parameter=${params}`, sql.count]))[0]?.row_count ?? NaN);
      const before = await count();
      // Preserve the rows before deleting them.
      const selected = await bq(["--format=json", "--max_rows=1000000", "query", "--use_legacy_sql=false",
        `--parameter=${params}`, sql.select]);
      const preserved = JSON.parse(selected || "[]").length;
      const bytes = Buffer.from(selected || "[]");
      await store.file(`${caseRoot(caseId)}bigquery/${stampText}/${target.table}.json`).save(bytes, {resumable: false,
        contentType: "application/json", metadata: {cacheControl: "private, no-store", metadata: {sha256: sha256(bytes)}}});
      await bq(["query", "--use_legacy_sql=false", "--dry_run", `--parameter=${params}`, sql.delete]);
      try {
        await bq(["query", "--use_legacy_sql=false", `--parameter=${params}`, sql.delete]);
      } catch (error) {
        if (/streaming buffer/iu.test(String(error?.stdout ?? error?.message ?? ""))) {
          throw new TakedownError(`BigQuery refused the delete from ${target.table}: rows are still in its streaming ` +
            "buffer. Nothing was deleted from it. Retry later.");
        }
        throw new TakedownError(`The delete from ${target.table} failed.`);
      }
      const after = await count();
      rows.push({table: target.table, ids: target.ids.length, before, after, preserved});
      if (after !== 0) throw Object.assign(new TakedownError(`${after} row(s) remain in ${target.table}. Run bigquery mode again.`), {rows});
    }
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
  return rows;
}
