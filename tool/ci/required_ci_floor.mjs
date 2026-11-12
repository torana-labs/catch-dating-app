import assert from "node:assert/strict";

/**
 * When a source CI run counts as passing for a website release.
 *
 * A run whose own conclusion is success always counts. Owner decision,
 * 11 Nov 2026 (sprint floor): a run that concluded failure also counts when
 * its "Required CI" job succeeded, meaning every gating lane passed, and every
 * job that did not succeed belongs to a lane the sprint took out of Required
 * CI's needs. Those lanes still run and report. Before this, a red reporting
 * lane made the whole run red, so no commit could be released during the
 * sprint. Revisit this when the sprint floor ends: restore the lanes to
 * Required CI's needs, empty REPORTING_LANES, and the rule reduces to "the
 * whole run succeeded" again.
 *
 * REPORTING_LANES must equal the `$reporting` list of the Required CI job in
 * .github/workflows/ci.yml; required_ci_floor.test.mjs pins the two.
 */
export const REQUIRED_CI_JOB = "Required CI";
export const REPORTING_LANES = Object.freeze(["app-builds", "docs-policy", "operations", "tools"]);

const SUCCEEDED = new Set(["success", "skipped"]);

/** The CI lane a job belongs to: "tools / Tool checks (x)" is in tools. */
export const laneOfJob = (name) => String(name ?? "").split(" / ")[0];

/**
 * Whether a completed source CI run passes the release gate. `jobs` are the
 * run's jobs for its own attempt; they are needed only when the run's
 * conclusion is not success.
 */
export function sourceCiPasses({run, jobs}) {
  if (run?.status !== "completed") return false;
  if (run.conclusion === "success") return true;
  if (run.conclusion !== "failure") return false;
  assert.ok(Array.isArray(jobs), "Source CI jobs are required to read a failed run's Required CI result.");
  for (const job of jobs) {
    assert.ok(job.run_id === run.id && job.run_attempt === run.run_attempt,
      "Source CI jobs must come from the run's own attempt.");
  }
  const required = jobs.filter((job) => job.name === REQUIRED_CI_JOB);
  if (required.length !== 1 || required[0].status !== "completed" || required[0].conclusion !== "success") {
    return false;
  }
  const unsuccessful = jobs.filter((job) => job.status !== "completed" || !SUCCEEDED.has(job.conclusion));
  return unsuccessful.every((job) => job.status === "completed" && REPORTING_LANES.includes(laneOfJob(job.name)));
}
