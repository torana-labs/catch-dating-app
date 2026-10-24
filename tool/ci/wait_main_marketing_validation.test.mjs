import assert from "node:assert/strict";
import test from "node:test";
import {inspectMarketingValidation, isMainCiSource, selectCaptureBinding, selectSameSourceRun, waitMainMarketingValidation} from "./wait_main_marketing_validation.mjs";
const repository = "owner/repo", sourceSha = "a".repeat(40);
const canonical = {id: 7, path: ".github/workflows/ci.yml"};
const run = {id: 10, run_number: 9, run_attempt: 2, workflow_id: 7,
  name: "CI", path: canonical.path, event: "push", head_branch: "main", head_sha: sourceSha,
  repository: {id: 1, full_name: repository}, head_repository: {id: 1, full_name: repository},
  status: "in_progress", conclusion: null, run_started_at: "2026-10-17T01:00:00Z"};
const job = (id, name, conclusion = "success") => ({id, name, conclusion,
  run_id: run.id, run_attempt: run.run_attempt, head_sha: sourceSha, status: "completed", started_at: "2026-10-17T01:01:00Z", completed_at: "2026-10-17T01:02:00Z"});
const jobs = [job(20, "marketing / Validate marketing website"),
  job(21, "capture-freshness / Render and validate 12 canonical iPhone captures")];

const artifact = {id: 40, expired: false, created_at: "2026-10-17T01:01:30Z", name: `canonical-marketing-${sourceSha}-${run.id}-${run.run_attempt}`,
  digest: `sha256:${"d".repeat(64)}`, workflow_run: {id: run.id, repository_id: 1, head_repository_id: 1, head_sha: sourceSha}};

const queueBranch = `gh-readonly-queue/main/pr-841-${"b".repeat(40)}`;
const queueRun = {...run, id: 11, run_number: 10, run_attempt: 1, event: "merge_group", head_branch: queueBranch,
  status: "completed", conclusion: "success"};
const queueJob = (id, name, conclusion = "success") => ({...job(id, name, conclusion), run_id: queueRun.id,
  run_attempt: queueRun.run_attempt});
const queueJobs = [queueJob(30, jobs[0].name), queueJob(31, jobs[1].name)];
const queueArtifact = {...artifact, id: 41, name: `canonical-marketing-${sourceSha}-${queueRun.id}-${queueRun.run_attempt}`,
  workflow_run: {...artifact.workflow_run, id: queueRun.id}};

// Push and merge-queue listings are answered separately; `listings` and
// `queueListings` step through successive answers for one event.
function fixture({artifacts = [artifact], runs = [run], results = jobs, canonicalResult = canonical, listings, sleep,
  queueRuns = [], queueResults = queueJobs, queueArtifacts = [queueArtifact], queueListings} = {}) {
  const step = (answers, fallback) => {
    let index = 0;
    return () => answers ? answers[Math.min(index++, answers.length - 1)] : fallback;
  };
  const pushListing = step(listings, runs), queueListing = step(queueListings, queueRuns);
  const all = () => [...runs, ...queueRuns, ...(listings ?? []).flat(), ...(queueListings ?? []).flat()];
  return {repository, sourceSha, onWait: () => {}, maxWaitMs: 1,
    now: (() => {let time = 0; return () => time++;})(), sleep: sleep ?? (async () => {}),
    request: async (endpoint, options) => {
      if (endpoint.endsWith("workflows/ci.yml")) return canonicalResult;
      const id = Number(endpoint.match(/\/runs\/(\d+)\//u)?.[1]);
      const queued = id === queueRun.id;
      if (/\/attempts\/\d+$/u.test(endpoint)) return all().find(candidate => candidate.id === id);
      if (endpoint.includes("/artifacts?")) { assert.equal(options.paginate, true); return [{artifacts: queued ? queueArtifacts : artifacts}]; }
      if (endpoint.includes("/jobs?")) { assert.equal(options.paginate, true); return [{jobs: queued ? queueResults : results}]; }
      assert.ok(endpoint.includes(`head_sha=${sourceSha}`));
      return {workflow_runs: endpoint.includes("event=merge_group") ? queueListing() : pushListing()};
    }};
}

test("same-source Marketing and capture jobs are reused before unrelated CI finishes", async () => {
  const result = await waitMainMarketingValidation(fixture());
  assert.equal(result.validated, true);
  assert.deepEqual(result.jobIds, [20, 21]);
  assert.equal(result.captureBinding.artifactId, "40");
  assert.equal(result.captureBinding.artifactDigest, artifact.digest);
  assert.equal(result.sourceCiRunAttempt, 2); assert.equal(result.sourceSha, sourceSha);
});

test("an explicitly skipped Marketing lane requests standalone validation, never reuse", async () => {
  const result = await waitMainMarketingValidation(fixture({results: [job(22, "marketing", "skipped"), job(23, "capture-freshness", "skipped")]}));
  assert.equal(result.validated, false); assert.deepEqual(result.jobIds, []);
});

for (const conclusion of ["failure", "cancelled", "timed_out", "neutral", "skipped"]) {
  for (const index of [0, 1]) test(`${jobs[index].name}=${conclusion} cannot authorize packaging`, async () => {
    const bad = structuredClone(jobs); bad[index].conclusion = conclusion;
    await assert.rejects(() => waitMainMarketingValidation(fixture({results: bad})), /did not succeed|did not execute successfully/);
  });
}

const cancelledRun = {...run, status: "completed", conclusion: "cancelled"};

test("a newer merge cancelling CI after its jobs succeeded keeps their exact evidence", async () => {
  const result = await waitMainMarketingValidation(fixture({runs: [cancelledRun]}));
  assert.equal(result.validated, true);
  assert.equal(result.captureBinding.artifactId, "40");
  assert.equal(result.authority, "same-source-marketing-and-capture-jobs");
});

test("CI cancelled before its capture job finished hands validation to the standalone path", async () => {
  for (const results of [
    [jobs[0], job(21, jobs[1].name, "cancelled")],
    [job(20, jobs[0].name, "cancelled"), job(21, jobs[1].name, "cancelled")],
  ]) {
    const result = await waitMainMarketingValidation(fixture({runs: [cancelledRun], results}));
    assert.deepEqual([result.validated, result.captureProduced, result.captureBinding], [false, false, undefined]);
    assert.equal(result.reason, "source-ci-cancelled-before-evidence");
  }
});

test("a cancelled run cannot reuse captures created outside its capture job", async () => {
  const late = {...artifact, created_at: "2026-10-17T01:05:00Z"};
  await assert.rejects(() => waitMainMarketingValidation(fixture({runs: [cancelledRun], artifacts: [late]})),
    /cancelled before its capture job succeeded/);
});

test("CI that failed for any other reason still blocks packaging", async () => {
  await assert.rejects(() => waitMainMarketingValidation(fixture({runs: [{...run, status: "completed", conclusion: "failure"}]})),
    /ended failure/);
});

test("missing jobs and a completed run without evidence fail closed", async () => {
  await assert.rejects(() => waitMainMarketingValidation(fixture({results: []})), /Timed out/);
  await assert.rejects(() => waitMainMarketingValidation(fixture({runs: [{...run, status: "completed", conclusion: "success"}], results: [jobs[0]]})), /no usable Marketing/);
});

for (const [field, value] of [["run_attempt", 1], ["run_id", 99], ["head_sha", "b".repeat(40)], ["id", 0]]) {
  test(`job ${field} mismatch cannot reuse another execution`, () => {
    const wrong = structuredClone(jobs); wrong[0][field] = value;
    assert.throws(() => inspectMarketingValidation({run, jobs: wrong, sourceSha}), /Wrong source or attempt/);
  });
}

for (const [field, value] of [["workflow_id", 8], ["path", ".github/workflows/other.yml"], ["name", "Other"], ["run_attempt", 0], ["repository", {id: 1, full_name: "foreign/repo"}], ["head_repository", {id: 2, full_name: repository}]]) {
  test(`run ${field} mismatch cannot reuse foreign validation`, () => {
    assert.throws(() => selectSameSourceRun({runs: [{...run, [field]: value}], canonical, repository, sourceSha}), /invalid workflow, repository, or attempt/);
  });
}

for (const change of [{head_sha: "b".repeat(40)}, {event: "pull_request"}, {head_branch: "feature"}]) {
  test(`unrelated run ${JSON.stringify(change)} is never reused`, async () => {
    await assert.rejects(() => waitMainMarketingValidation(fixture({runs: [{...run, ...change}]})), /Timed out/);
  });
}

test("a newer merge cancelling CI during the final identity recheck keeps succeeded evidence", async () => {
  const result = await waitMainMarketingValidation(fixture({listings: [[run], [cancelledRun]]}));
  assert.equal(result.validated, true);
});

test("failure during the final identity recheck revokes reuse", async () => {
  await assert.rejects(() => waitMainMarketingValidation(fixture({listings: [[run], [{...run, status: "completed", conclusion: "failure"}]]})), /failed during inspection/);
});

test("a newer attempt cannot reuse successful jobs from the previous attempt", async () => {
  await assert.rejects(() => waitMainMarketingValidation(fixture({listings: [[run], [{...run, run_attempt: 3}]]})), /Timed out/);
});

test("ambiguous job records and canonical workflow mismatch fail closed", async () => {
  assert.throws(() => inspectMarketingValidation({run, jobs: [...jobs, jobs[0]], sourceSha}), /Ambiguous/);
  await assert.rejects(() => waitMainMarketingValidation(fixture({canonicalResult: {...canonical, path: "other"}})), /Canonical CI workflow identity/);
});

for (const [label, artifacts] of [
  ["missing", []], ["duplicate", [artifact, artifact]],
  ["expired", [{...artifact, expired: true}]],
  ["previous-attempt", [{...artifact, name: `canonical-marketing-${sourceSha}-${run.id}-1`}]],
  ["wrong-source", [{...artifact, workflow_run: {...artifact.workflow_run, head_sha: "b".repeat(40)}}]],
  ["wrong-run", [{...artifact, workflow_run: {...artifact.workflow_run, id: 99}}]],
  ["foreign-repository", [{...artifact, workflow_run: {...artifact.workflow_run, repository_id: 2}}]],
  ["invalid-digest", [{...artifact, digest: "sha256:bad"}]],
]) test(`${label} capture artifact cannot authorize a successful job-only reuse`, async () => {
  await assert.rejects(() => waitMainMarketingValidation(fixture({artifacts})));
});

test("artifact selection ignores unrelated names instead of selecting a floating latest", () => {
  const binding = selectCaptureBinding({artifacts: [{...artifact, id: 999, name: "newest unrelated"}, artifact],
    run, canonical, repository, sourceSha});
  assert.equal(binding.artifactId, "40");
  assert.equal(binding.workflowRef, `${repository}/.github/workflows/ci.yml@refs/heads/main`);
  assert.equal(binding.workflowDefinitionSha, sourceSha);
});

test("rehydrated old successful jobs with new IDs and run_attempt cannot authorize reuse", async () => {
  const reused = jobs.map(entry => ({...entry, id: entry.id + 100,
    started_at: "2026-10-17T00:01:00Z", completed_at: "2026-10-17T00:02:00Z"}));
  await assert.rejects(() => waitMainMarketingValidation(fixture({results: reused})), /not executed in this CI attempt/);
});

test("a native-only CI change reuses its captures while requiring standalone React validation", async () => {
  const result = await waitMainMarketingValidation(fixture({results: [job(22, "marketing", "skipped"), jobs[1]]}));
  assert.equal(result.validated, false);
  assert.equal(result.captureProduced, true);
  assert.deepEqual(result.jobIds, [21]);
  assert.equal(result.captureBinding.artifactId, "40");
});

test("a skipped Marketing job waits for the existing capture producer instead of duplicating it", async () => {
  await assert.rejects(() => waitMainMarketingValidation(fixture({results: [job(22, "marketing", "skipped"),
    {...jobs[1], status: "in_progress", conclusion: null}]})), /Timed out/);
});

const cancelledBeforeEvidence = [job(20, jobs[0].name, "cancelled"), job(21, jobs[1].name, "cancelled")];

test("the merge queue run of the same commit is the evidence when main's push run was cancelled first", async () => {
  const result = await waitMainMarketingValidation(fixture({runs: [cancelledRun], results: cancelledBeforeEvidence,
    queueRuns: [queueRun]}));
  assert.deepEqual([result.validated, result.sourceCiRunId, result.sourceCiEvent], [true, queueRun.id, "merge_group"]);
  assert.deepEqual(result.jobIds, [30, 31]);
  assert.equal(result.captureBinding.artifactId, "41");
  // The importer checks the binding against the caller the receipt recorded.
  assert.equal(result.captureBinding.workflowRef, `${repository}/.github/workflows/ci.yml@refs/heads/${queueBranch}`);
});

test("every caller agrees on the completed merge queue run while main's push run is still going", async () => {
  const result = await waitMainMarketingValidation(fixture({runs: [run], results: [], queueRuns: [queueRun]}));
  assert.equal(result.sourceCiRunId, queueRun.id);
});

test("a merge queue run that did not succeed, or ran no website validation, leaves the push run as evidence", async () => {
  for (const queueRuns of [[{...queueRun, conclusion: "failure"}], [{...queueRun, status: "in_progress", conclusion: null}]]) {
    const result = await waitMainMarketingValidation(fixture({queueRuns}));
    assert.equal(result.sourceCiRunId, run.id);
  }
  const skipped = [queueJob(32, "marketing", "skipped"), queueJob(33, "capture-freshness", "skipped")];
  const result = await waitMainMarketingValidation(fixture({queueRuns: [queueRun], queueResults: skipped}));
  assert.deepEqual([result.sourceCiRunId, result.sourceCiEvent], [run.id, "push"]);
});

for (const head_branch of ["main", "gh-readonly-queue/develop/pr-841-" + "b".repeat(40), "gh-readonly-queue/main/pr-841", "feature"]) {
  test(`a merge group run on ${head_branch} is not main's queue`, async () => {
    const result = await waitMainMarketingValidation(fixture({queueRuns: [{...queueRun, head_branch}]}));
    assert.equal(result.sourceCiRunId, run.id);
  });
}

test("merge queue evidence that changes during inspection is refused", async () => {
  await assert.rejects(() => waitMainMarketingValidation(fixture({runs: [cancelledRun], results: cancelledBeforeEvidence,
    queueListings: [[queueRun], [{...queueRun, run_attempt: 2}]]})), /changed during inspection/);
});

test("main's push run and its merge queue run are both CI for a commit on main", () => {
  assert.equal(isMainCiSource(run), true);
  assert.equal(isMainCiSource(queueRun), true);
  for (const change of [{event: "pull_request"}, {event: "merge_group", head_branch: "main"}, {event: "push", head_branch: queueBranch}]) {
    assert.equal(isMainCiSource({...run, ...change}), false, JSON.stringify(change));
  }
});
