// Run records for backfill and migration tools (FIX-7): every tool under
// tool/data/ that writes to Firestore records each applied run in
// dataToolRuns/{runId}: which tool, at which commit, against which project,
// what it counted and when. Dry runs write nothing, so they leave no record.
// Shape: contracts/firestore/data_tool_runs.schema.json.
// tool/data/check_run_records.mjs fails when a writing tool skips this helper.
import {execFileSync} from "node:child_process";
import {randomBytes} from "node:crypto";
import path from "node:path";
import {repoRoot} from "../../lib/repo_paths.mjs";

export const DATA_TOOL_RUNS = "dataToolRuns";
/** Days a run record is kept; the collection's TTL policy deletes it then. */
export const RUN_RECORD_TTL_DAYS = 365;
const DAY_MILLIS = 24 * 60 * 60 * 1000;
const COUNT_KEY = /^[A-Za-z0-9_.:-]{1,120}$/u;

/**
 * The commit the tool runs from, and whether tracked files differ from it.
 * Null when Git is unavailable, so a missing Git never blocks a repair.
 * @param {{cwd?: string, exec?: Function}} [options] Repo and runner.
 * @return {{sha: string|null, dirty: boolean|null}} Commit facts.
 */
export function gitCommit({cwd = repoRoot, exec = execFileSync} = {}) {
  try {
    const sha = String(exec("git", ["rev-parse", "HEAD"], {cwd,
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]})).trim();
    const status = String(exec("git",
      ["status", "--porcelain", "--untracked-files=no"], {cwd,
        encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}));
    return {sha: /^[0-9a-f]{40}$/u.test(sha) ? sha : null,
      dirty: status.trim().length > 0};
  } catch {
    return {sha: null, dirty: null};
  }
}

/**
 * The repository path of a tool, from its import.meta.url or a path.
 * @param {string} tool File URL or path.
 * @return {string} Path relative to the repository root.
 */
export function toolPath(tool) {
  const file = tool.startsWith("file:") ? new URL(tool).pathname : tool;
  return path.relative(repoRoot, path.resolve(repoRoot, file))
    .split(path.sep).join("/");
}

/**
 * Counts as a map of non-negative integers under short keys.
 * @param {Record<string, number>} counts Raw counts.
 * @return {Record<string, number>} Checked counts.
 */
export function checkedCounts(counts = {}) {
  const out = {};
  for (const [key, value] of Object.entries(counts)) {
    if (!COUNT_KEY.test(key)) throw new Error(`Run record count key ${key} is not allowed.`);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Run record count ${key} must be a non-negative integer.`);
    }
    out[key] = value;
  }
  return out;
}

function failureText(error) {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  return `${name}: ${message.split("\n")[0]}`.slice(0, 500);
}

/**
 * Starts a run record: writes it as running, so a run that dies midway still
 * leaves a trace, and returns the calls that close it.
 * @param {FirebaseFirestore.Firestore} db Admin Firestore.
 * @param {object} options Run facts.
 * @param {string} options.tool The tool's import.meta.url or repo path.
 * @param {string} options.projectId The Firebase project written to.
 * @param {string|null} [options.scope] What the run covers, such as the
 *   migration names; never personal data.
 * @param {() => number} [options.now] Clock.
 * @param {{sha: string|null, dirty: boolean|null}} [options.commit] Commit.
 * @return {Promise<{runId: string, finish: Function, fail: Function}>}
 */
export async function startRunRecord(db, {
  tool, projectId, scope = null, now = Date.now, commit = gitCommit(),
}) {
  if (!projectId) throw new Error("A run record needs the project id.");
  const repoTool = toolPath(tool);
  const startedMillis = now();
  const slug = path.basename(repoTool).replace(/\.[^.]+$/u, "")
    .replace(/[^A-Za-z0-9_-]/gu, "-").slice(0, 80);
  const runId = `${slug}_${startedMillis}_${randomBytes(4).toString("hex")}`;
  const ref = db.collection(DATA_TOOL_RUNS).doc(runId);
  await ref.set({
    schemaVersion: 1,
    runId,
    tool: repoTool,
    scope: scope === null ? null : String(scope).slice(0, 500),
    projectId,
    commitSha: commit.sha,
    commitDirty: commit.dirty,
    status: "running",
    counts: {},
    failure: null,
    startedAt: new Date(startedMillis),
    finishedAt: null,
    expiresAt: new Date(startedMillis + RUN_RECORD_TTL_DAYS * DAY_MILLIS),
  });
  const close = (fields) => ref.update({...fields,
    finishedAt: new Date(now())});
  return {
    runId,
    finish: (counts) => close({status: "succeeded",
      counts: checkedCounts(counts)}),
    fail: (error, counts = {}) => close({status: "failed",
      counts: checkedCounts(counts), failure: failureText(error)}),
  };
}

/**
 * Runs an apply phase inside a run record. The work returns its counts; a
 * thrown error is recorded as failed and then rethrown.
 * @param {FirebaseFirestore.Firestore} db Admin Firestore.
 * @param {object} options As for startRunRecord.
 * @param {(run: {runId: string, counts: Record<string, number>}) =>
 *   Promise<Record<string, number>|void>} work The writes.
 * @return {Promise<{runId: string, counts: Record<string, number>}>}
 */
export async function withRunRecord(db, options, work) {
  const record = await startRunRecord(db, options);
  // Work may add to these as it goes, so a failure keeps partial counts.
  const counts = {};
  try {
    const result = await work({runId: record.runId, counts});
    Object.assign(counts, result ?? {});
  } catch (error) {
    await record.fail(error, counts);
    throw error;
  }
  await record.finish(counts);
  return {runId: record.runId, counts};
}
