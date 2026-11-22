import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  executeTaskCommand,
  TaskUsageError,
} from "./worktree_guard.mjs";

test("start requires an exact SHA and a direct repository-owned target", (context) => {
  const fixture = createRepository(context);

  assert.throws(
    () => guard(fixture.root, [
      "start",
      "--task-id", "short-base",
      "--base-sha", fixture.baseSha.slice(0, 12),
      "--paths", "owned",
    ]),
    (error) => error instanceof TaskUsageError && /exact 40-character/u.test(error.message),
  );
  assert.throws(
    () => guard(fixture.root, [
      "start",
      "--task-id", "missing-base",
      "--base-sha", "f".repeat(40),
      "--paths", "owned",
    ]),
    TaskUsageError,
  );

  const nestedTarget = path.join(
    fixture.root,
    ".claude",
    "worktrees",
    "nested",
    "not-a-direct-child",
  );
  assert.throws(
    () => guard(fixture.root, [
      "start",
      "--task-id", "nested-target",
      "--base-sha", fixture.baseSha,
      "--paths", "owned",
      "--worktree", nestedTarget,
    ]),
    (error) => error instanceof TaskUsageError && /direct physical children/u.test(error.message),
  );
  assert.equal(fs.existsSync(nestedTarget), false);
  assert.deepEqual(claimFiles(fixture.root), []);
});

test("start refuses an exact commit that is not the fetched origin/main", (context) => {
  const fixture = createRepository(context);
  fs.appendFileSync(path.join(fixture.root, "outside.txt"), "local branch work\n");
  commitAll(fixture.root, "local branch work");
  const nonMainSha = gitText(fixture.root, ["rev-parse", "HEAD"]);
  assert.notEqual(nonMainSha, fixture.baseSha);

  assert.throws(
    () => guard(fixture.root, [
      "start",
      "--task-id", "non-main-base",
      "--base-sha", nonMainSha,
      "--paths", "owned",
    ]),
    (error) => error instanceof TaskUsageError && /must match origin\/main/u.test(error.message),
  );
  assert.equal(
    fs.existsSync(path.join(fixture.root, ".claude", "worktrees", "non-main-base")),
    false,
  );
  assert.deepEqual(claimFiles(fixture.root), []);
});

test("start creates a full exact-base worktree and never pushes or sets an upstream", (context) => {
  const fixture = createRepository(context);
  const gitCalls = [];
  const execution = guard(fixture.root, [
    "start",
    "--task-id", "exact-start",
    "--base-sha", fixture.baseSha,
    "--paths", "owned",
  ], {runner: recordingGitRunner(gitCalls)});

  assert.equal(execution.status, 0);
  const worktree = execution.result.worktreePath;
  assert.equal(path.dirname(worktree), path.join(fixture.root, ".claude", "worktrees"));
  assert.equal(gitText(worktree, ["rev-parse", "HEAD"]), fixture.baseSha);
  assert.equal(gitText(worktree, ["branch", "--show-current"]), "codex/exact-start");
  assert.equal(fs.existsSync(path.join(worktree, "owned", "allowed.txt")), true);
  assert.equal(fs.existsSync(path.join(worktree, "outside.txt")), true);
  assert.notEqual(gitResult(worktree, [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}",
  ]).status, 0);
  assert.equal(gitCalls.some((args) => args[0] === "push"), false);
  assert.equal(gitCalls.some((args) => args[0] === "sparse-checkout"), false);
  assert.equal(gitCalls.some((args) => args[0] === "submodule"), false);

  const commonDir = gitText(fixture.root, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]);
  assert.equal(
    path.dirname(execution.result.claimPath),
    path.join(commonDir, "catch-worktree-claims"),
  );
  const claim = JSON.parse(fs.readFileSync(execution.result.claimPath, "utf8"));
  assert.deepEqual(Object.keys(claim).sort(), [
    "baseSha",
    "branch",
    "claimedPaths",
    "createdAt",
    "taskId",
    "worktreePath",
  ]);
});

test("start refuses overlapping claims and permits disjoint worktrees", (context) => {
  const fixture = createRepository(context);
  start(fixture, "owns-directory", ["owned"]);

  assert.throws(
    () => start(fixture, "nested-overlap", ["owned/future.txt"]),
    (error) => error instanceof TaskUsageError && /overlaps owns-directory/u.test(error.message),
  );
  assert.equal(
    fs.existsSync(path.join(fixture.root, ".claude", "worktrees", "nested-overlap")),
    false,
  );

  const disjoint = start(fixture, "disjoint-file", ["outside.txt"]);
  assert.equal(disjoint.status, 0);
  assert.equal(claimFiles(fixture.root).length, 2);
});

test("scope extends ownership atomically while preserving dirty work and task identity", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "extend-scope", ["owned"]);
  const worktree = execution.result.worktreePath;
  const other = start(fixture, "other-scope", ["unrelated"]);
  const otherBefore = fs.readFileSync(other.result.claimPath, "utf8");
  const claimBefore = JSON.parse(fs.readFileSync(execution.result.claimPath, "utf8"));
  fs.appendFileSync(path.join(worktree, "owned", "allowed.txt"), "keep dirty work\n");
  const bytesBefore = fs.readFileSync(path.join(worktree, "owned", "allowed.txt"), "utf8");
  const calls = [];
  const result = guard(fixture.root, ["scope", "--worktree", worktree,
    "--paths", "./outside.txt,owned"], {runner: recordingGitRunner(calls)});
  assert.equal(result.status, 0);
  assert.equal(result.result.extended, true);
  assert.deepEqual(result.result.addedPaths, ["outside.txt"]);
  const after = JSON.parse(fs.readFileSync(execution.result.claimPath, "utf8"));
  assert.deepEqual(after, {...claimBefore, claimedPaths: ["outside.txt", "owned"]});
  assert.equal(fs.statSync(execution.result.claimPath).mode & 0o777, 0o600);
  assert.equal(fs.readFileSync(other.result.claimPath, "utf8"), otherBefore);
  assert.equal(fs.readFileSync(path.join(worktree, "owned", "allowed.txt"), "utf8"), bytesBefore);
  assert.equal(gitText(worktree, ["rev-parse", "HEAD"]), fixture.baseSha);
  assert.equal(calls.some((args) => ["add", "commit", "reset", "switch", "checkout", "push"].includes(args[0])), false);
  fs.appendFileSync(path.join(worktree, "outside.txt"), "now in scope\n");
  assert.equal(guard(worktree, ["doctor"]).status, 0);
  const bytes = fs.readFileSync(execution.result.claimPath, "utf8");
  const repeated = guard(worktree, ["scope", "--paths", "outside.txt"]);
  assert.equal(repeated.status, 0);
  assert.equal(repeated.result.extended, false);
  assert.deepEqual(repeated.result.addedPaths, []);
  assert.equal(fs.readFileSync(execution.result.claimPath, "utf8"), bytes);
  assert.equal(fs.readdirSync(path.dirname(execution.result.claimPath)).some((name) => name.endsWith(".tmp") || name.endsWith(".lock")), false);
});

test("scope rejects overlap and invalid options without changing either claim", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "scope-invalid", ["owned"]);
  const other = start(fixture, "scope-owner", ["outside.txt"]);
  const before = fs.readFileSync(execution.result.claimPath, "utf8");
  const otherBefore = fs.readFileSync(other.result.claimPath, "utf8");
  for (const args of [
    ["--paths", "outside.txt/nested"],
    ["--paths", "../outside"],
    ["--paths", ".git/config"],
    ["--paths", "new", "--branch", "codex/other"],
    ["--paths", "new", "--base-sha", fixture.baseSha],
    ["--paths", "new", "--task-id", "replacement"],
    ["--paths", "new", "--abandon"],
    [],
  ]) {
    assert.throws(() => guard(execution.result.worktreePath, ["scope", ...args]), TaskUsageError);
    assert.equal(fs.readFileSync(execution.result.claimPath, "utf8"), before);
    assert.equal(fs.readFileSync(other.result.claimPath, "utf8"), otherBefore);
  }
});

test("scope refuses to retroactively claim existing dirty or committed out-of-scope edits", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "scope-retroactive", ["owned"]);
  const worktree = execution.result.worktreePath;
  const before = fs.readFileSync(execution.result.claimPath, "utf8");
  fs.appendFileSync(path.join(worktree, "outside.txt"), "outside edit\n");
  for (const committed of [false, true]) {
    if (committed) commitAll(worktree, "outside edit");
    const result = guard(worktree, ["scope", "--paths", "outside.txt"]);
    assert.equal(result.status, 1);
    assert.equal(result.result.extended, false);
    assert.ok(result.result.blockers.includes("out_of_scope_changes"));
    assert.equal(fs.readFileSync(execution.result.claimPath, "utf8"), before);
  }
});

test("scope refuses changed branch identity and lost base ancestry", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "scope-identity", ["owned"]);
  const worktree = execution.result.worktreePath;
  const before = fs.readFileSync(execution.result.claimPath, "utf8");
  const checkBlocked = (blocker) => {
    const result = guard(worktree, ["scope", "--paths", "outside.txt"]);
    assert.equal(result.status, 1);
    assert.ok(result.result.blockers.includes(blocker));
    assert.equal(fs.readFileSync(execution.result.claimPath, "utf8"), before);
  };
  git(worktree, ["checkout", "--detach"]);
  checkBlocked("worktree_detached");
  git(worktree, ["checkout", "-b", "codex/changed-identity"]);
  checkBlocked("branch_mismatch");
  git(worktree, ["checkout", execution.result.branch]);
  const unrelated = gitText(worktree, ["commit-tree", gitText(worktree, ["write-tree"]), "-m", "unrelated root"]);
  git(worktree, ["reset", "--hard", unrelated]);
  checkBlocked("base_not_ancestor_of_head");
});

test("scope preserves the old claim when its atomic replacement fails", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "scope-write-failure", ["owned"]);
  const before = fs.readFileSync(execution.result.claimPath, "utf8");
  context.mock.method(fs, "renameSync", () => { throw new Error("simulated rename failure"); });
  assert.throws(() => guard(execution.result.worktreePath, ["scope", "--paths", "outside.txt"]), /simulated rename failure/u);
  assert.equal(fs.readFileSync(execution.result.claimPath, "utf8"), before);
  assert.deepEqual(fs.readdirSync(path.dirname(execution.result.claimPath)), [path.basename(execution.result.claimPath)]);
});

test("scope honors the existing task transition lock", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "scope-locked", ["owned"]);
  const before = fs.readFileSync(execution.result.claimPath, "utf8");
  const lockPath = path.join(path.dirname(execution.result.claimPath), ".start-finish.lock");
  fs.writeFileSync(lockPath, "existing transition");
  assert.throws(() => guard(execution.result.worktreePath, ["scope", "--paths", "outside.txt"]), /Another task transition is active/u);
  assert.equal(fs.readFileSync(execution.result.claimPath, "utf8"), before);
  assert.equal(fs.readFileSync(lockPath, "utf8"), "existing transition");
});

test("doctor reports staged, unstaged, and untracked paths without treating in-scope dirt as authority", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "dirty-doctor", ["owned"]);
  const worktree = execution.result.worktreePath;

  fs.appendFileSync(path.join(worktree, "owned", "allowed.txt"), "unstaged\n");
  fs.writeFileSync(path.join(worktree, "owned", "staged.txt"), "staged\n");
  git(worktree, ["add", "owned/staged.txt"]);
  fs.writeFileSync(path.join(worktree, "outside-untracked.txt"), "outside\n");

  const doctor = guard(worktree, ["doctor"]);
  assert.equal(doctor.status, 1);
  assert.equal(doctor.result.dirty, true);
  assert.deepEqual(doctor.result.dirtyPaths, [
    "outside-untracked.txt",
    "owned/allowed.txt",
    "owned/staged.txt",
  ]);
  assert.deepEqual(doctor.result.committedPaths, []);
  assert.deepEqual(doctor.result.outOfScopePaths, ["outside-untracked.txt"]);
  assert.ok(doctor.result.blockers.includes("out_of_scope_changes"));
});

test("doctor detects committed out-of-scope changes while keeping committed in-scope work clean", (context) => {
  const outsideFixture = createRepository(context);
  const outsideExecution = start(outsideFixture, "committed-outside", ["owned"]);
  const outsideWorktree = outsideExecution.result.worktreePath;
  fs.appendFileSync(path.join(outsideWorktree, "outside.txt"), "outside commit\n");
  commitAll(outsideWorktree, "outside change");

  const outsideDoctor = guard(outsideWorktree, ["doctor"]);
  assert.equal(outsideDoctor.status, 1);
  assert.equal(outsideDoctor.result.dirty, false);
  assert.deepEqual(outsideDoctor.result.dirtyPaths, []);
  assert.deepEqual(outsideDoctor.result.committedPaths, ["outside.txt"]);
  assert.deepEqual(outsideDoctor.result.outOfScopePaths, ["outside.txt"]);

  const insideFixture = createRepository(context);
  const insideExecution = start(insideFixture, "committed-inside", ["owned"]);
  const insideWorktree = insideExecution.result.worktreePath;
  fs.appendFileSync(path.join(insideWorktree, "owned", "allowed.txt"), "inside commit\n");
  commitAll(insideWorktree, "inside change");
  const insideDoctor = guard(insideWorktree, ["doctor"]);
  assert.equal(insideDoctor.status, 0);
  assert.equal(insideDoctor.result.dirty, false);
  assert.deepEqual(insideDoctor.result.committedPaths, ["owned/allowed.txt"]);
  assert.deepEqual(insideDoctor.result.outOfScopePaths, []);
});

test("doctor and finish refuse a head that no longer descends from the exact base", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "ancestry-loss", ["owned"]);
  const worktree = execution.result.worktreePath;
  const tree = gitText(worktree, ["write-tree"]);
  const unrelated = gitText(worktree, ["commit-tree", tree, "-m", "unrelated root"]);
  git(worktree, ["reset", "--hard", unrelated]);

  const doctor = guard(worktree, ["doctor"]);
  assert.equal(doctor.status, 1);
  assert.ok(doctor.result.blockers.includes("base_not_ancestor_of_head"));
  const finish = guard(worktree, ["finish"]);
  assert.equal(finish.status, 1);
  assert.equal(finish.result.finished, false);
  assert.ok(finish.result.blockers.includes("base_not_ancestor_of_head"));
  assert.equal(fs.existsSync(execution.result.claimPath), true);
});

test("main updates stay outside task scope while task edits remain visible", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "merge-main", ["owned"]);
  const worktree = execution.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "owned", "allowed.txt"), "task work\n");
  commitAll(worktree, "task work");
  fs.appendFileSync(path.join(fixture.root, "outside.txt"), "upstream work\n");
  commitAll(fixture.root, "upstream work");
  git(fixture.root, ["push", "origin", "main"]);
  const mainSha = gitText(fixture.root, ["rev-parse", "HEAD"]);
  // Main advancing alone must not make its new file bytes look like a task edit.
  assert.deepEqual(guard(worktree, ["doctor"]).result.committedPaths, ["owned/allowed.txt"]);
  git(worktree, ["merge", "--no-edit", "origin/main"]);
  const doctor = guard(worktree, ["doctor"]);
  assert.equal(doctor.status, 0);
  assert.equal(doctor.result.baseSha, fixture.baseSha);
  assert.equal(doctor.result.scopeBaseSha, mainSha);
  assert.deepEqual(doctor.result.committedPaths, ["owned/allowed.txt"]);
  assert.deepEqual(doctor.result.outOfScopePaths, []);
  fs.appendFileSync(path.join(worktree, "outside.txt"), "task changed upstream owner\n");
  commitAll(worktree, "outside task change");
  assert.deepEqual(guard(worktree, ["doctor"]).result.outOfScopePaths, ["outside.txt"]);
});

test("a missing main ref retains the original scope scan", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "missing-main-ref", ["owned"]);
  const worktree = execution.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "outside.txt"), "outside task change\n");
  commitAll(worktree, "outside task change");
  git(worktree, ["update-ref", "-d", "refs/remotes/origin/main"]);
  const doctor = guard(worktree, ["doctor"]);
  assert.equal(doctor.status, 1);
  assert.equal(doctor.result.scopeBaseSha, fixture.baseSha);
  assert.deepEqual(doctor.result.outOfScopePaths, ["outside.txt"]);
});

test("finish refuses uncommitted, upstream-less, and unpushed unique work", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "finish-blockers", ["owned"]);
  const worktree = execution.result.worktreePath;

  fs.appendFileSync(path.join(worktree, "owned", "allowed.txt"), "dirty\n");
  const dirty = guard(worktree, ["finish"]);
  assert.equal(dirty.status, 1);
  assert.ok(dirty.result.blockers.includes("uncommitted_changes"));
  assert.equal(fs.existsSync(execution.result.claimPath), true);

  git(worktree, ["reset", "--hard", "HEAD"]);
  fs.appendFileSync(path.join(worktree, "owned", "allowed.txt"), "committed\n");
  commitAll(worktree, "unique work");
  const noUpstream = guard(worktree, ["finish"]);
  assert.equal(noUpstream.status, 1);
  assert.ok(noUpstream.result.blockers.includes("branch_has_no_upstream"));

  git(worktree, ["branch", "--set-upstream-to", "origin/main"]);
  const unpushed = guard(worktree, ["finish"]);
  assert.equal(unpushed.status, 1);
  assert.ok(unpushed.result.blockers.includes("unpushed_commits"));
  assert.equal(unpushed.result.unpushedCommits, 1);
  assert.equal(fs.existsSync(execution.result.claimPath), true);
});

test("finish abandon releases clean unpushed out-of-scope work with an attributable record", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "abandon-clean", ["owned"]);
  const worktree = execution.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "outside.txt"), "committed outside scope\n");
  commitAll(worktree, "unpushable proposal");

  const normalFinish = guard(worktree, ["finish"]);
  assert.equal(normalFinish.status, 1);
  assert.ok(normalFinish.result.blockers.includes("branch_has_no_upstream"));
  assert.ok(normalFinish.result.blockers.includes("out_of_scope_changes"));

  const abandonedAt = new Date("2026-08-15T09:30:00.000Z");
  const abandoned = guard(worktree, [
    "finish",
    "--abandon",
    "--reason", "Superseded by the integrated host fix",
    "--by", "release-owner@catch.local",
  ], {now: () => abandonedAt});

  assert.equal(abandoned.status, 0);
  assert.equal(abandoned.result.finished, true);
  assert.equal(abandoned.result.abandoned, true);
  assert.equal(fs.existsSync(execution.result.claimPath), false);
  assert.equal(fs.existsSync(worktree), true);
  assert.equal(fs.existsSync(abandoned.result.abandonRecordPath), true);
  const record = JSON.parse(fs.readFileSync(abandoned.result.abandonRecordPath, "utf8"));
  assert.equal(record.taskId, "abandon-clean");
  assert.equal(record.abandonedAt, abandonedAt.toISOString());
  assert.equal(record.abandonedBy, "release-owner@catch.local");
  assert.equal(record.reason, "Superseded by the integrated host fix");
  assert.deepEqual(record.outOfScopePaths, ["outside.txt"]);
  assert.ok(record.ignoredInspectionBlockers.includes("out_of_scope_changes"));
});

test("finish abandon requires a reason and refuses a dirty worktree", (context) => {
  const fixture = createRepository(context);
  const execution = start(fixture, "abandon-dirty", ["owned"]);
  const worktree = execution.result.worktreePath;

  assert.throws(
    () => guard(worktree, ["finish", "--abandon"]),
    (error) => error instanceof TaskUsageError && /--reason is required/u.test(error.message),
  );

  fs.appendFileSync(path.join(worktree, "owned", "allowed.txt"), "uncommitted\n");
  const abandoned = guard(worktree, [
    "finish",
    "--abandon",
    "--reason", "No longer needed",
  ]);
  assert.equal(abandoned.status, 1);
  assert.equal(abandoned.result.finished, false);
  assert.equal(abandoned.result.abandoned, false);
  assert.deepEqual(abandoned.result.blockers, ["uncommitted_changes"]);
  assert.equal(fs.existsSync(execution.result.claimPath), true);
  assert.deepEqual(abandonmentFiles(fixture.root), []);
});

test("finish cannot orphan an unchanged or pushed worktree by releasing its claim", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "handoff-retained", ["owned"]);
  const worktree = task.result.worktreePath;
  for (const pushed of [false, true]) {
    if (pushed) {
      fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "pushed\n");
      commitAll(worktree, "pushed work");
      git(worktree, ["push", "--set-upstream", "origin", task.result.branch]);
    }
    const before = fs.readFileSync(task.result.claimPath, "utf8");
    const refused = guard(worktree, ["finish"]);
    assert.equal(refused.status, 1);
    assert.equal(refused.result.finished, false);
    assert.ok(refused.result.blockers.includes("closeout_disposition_required"));
    const retained = guard(worktree, ["finish", "--retain", "--reason", "Awaiting PR acceptance; task owner will retire after merge"]);
    assert.equal(retained.status, 0);
    assert.equal(retained.result.finished, false);
    assert.equal(retained.result.readyForHandoff, true);
    assert.equal(retained.result.claimRetained, true);
    assert.equal(retained.result.retired, false);
    assert.match(retained.result.retainedReason, /Awaiting PR/u);
    assert.equal(fs.readFileSync(task.result.claimPath, "utf8"), before);
    assert.equal(fs.existsSync(worktree), true);
  }
  git(fixture.root, ["merge", "--no-edit", task.result.branch]);
  git(fixture.root, ["push", "origin", "main"]);
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  const retired = guard(fixture.root, [...retirementArgs(task, head, head), "--apply"]);
  assert.equal(retired.result.retired, true);
  assert.equal(fs.existsSync(worktree), false);
  assert.equal(fs.existsSync(task.result.claimPath), false);
});

test("retained handoff requires a reason and rejects ambiguous dispositions", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retention-options", ["owned"]);
  for (const args of [["finish", "--retain"], ["finish", "--retain", "--reason", " "],
    ["finish", "--retain", "--abandon", "--reason", "ambiguous"], ["doctor", "--retain"]]) {
    assert.throws(() => guard(task.result.worktreePath, args), TaskUsageError);
    assert.equal(fs.existsSync(task.result.claimPath), true);
  }
});

test("start rejects stale lifecycle instructions even with the correct new-task base", (context) => {
  const fixture = createRepository(context);
  fs.writeFileSync(path.join(fixture.root, "AGENTS.md"), "current closeout rules\n");
  commitAll(fixture.root, "new lifecycle");
  git(fixture.root, ["push", "origin", "main"]);
  const current = gitText(fixture.root, ["rev-parse", "HEAD"]);
  git(fixture.root, ["checkout", "--detach", fixture.baseSha]);
  assert.throws(() => guard(fixture.root, ["start", "--task-id", "stale-launcher",
    "--base-sha", current, "--paths", "owned"]), /launcher instructions\/tooling differ/u);
  assert.deepEqual(claimFiles(fixture.root), []);
  git(fixture.root, ["checkout", "main"]);
  const task = start({...fixture, baseSha: current}, "fresh-launcher", ["owned"]);
  assert.equal(task.status, 0);
});

test("a failed worktree add rolls back its claim without deleting unrelated Git state", (context) => {
  const fixture = createRepository(context);
  git(fixture.root, ["branch", "codex/branch-collision", fixture.baseSha]);
  const branchesBefore = gitText(fixture.root, ["branch", "--format=%(refname)"]);

  assert.throws(
    () => guard(fixture.root, [
      "start",
      "--task-id", "branch-collision",
      "--base-sha", fixture.baseSha,
      "--paths", "owned",
    ]),
    TaskUsageError,
  );

  assert.deepEqual(claimFiles(fixture.root), []);
  assert.equal(
    fs.existsSync(path.join(fixture.root, ".claude", "worktrees", "branch-collision")),
    false,
  );
  assert.equal(gitText(fixture.root, ["branch", "--format=%(refname)"]), branchesBefore);
});

test("stale reports old claims and unclaimed worktrees without deleting either", (context) => {
  const fixture = createRepository(context);
  const old = new Date("2026-01-01T00:00:00.000Z");
  const current = new Date("2026-01-10T00:00:00.000Z");
  const claimed = start(fixture, "old-claim", ["owned"], {now: () => old});
  const unclaimedPath = path.join(fixture.root, ".claude", "worktrees", "unclaimed");
  git(fixture.root, [
    "worktree",
    "add",
    "-b",
    "codex/unclaimed",
    unclaimedPath,
    fixture.baseSha,
  ]);
  const claimBefore = fs.readFileSync(claimed.result.claimPath, "utf8");
  const worktreesBefore = gitText(fixture.root, ["worktree", "list", "--porcelain"]);

  const report = guard(fixture.root, ["stale", "--stale-days", "1"], {
    now: () => current,
  });
  assert.equal(report.status, 0);
  assert.equal(report.result.deletionAuthorized, false);
  assert.ok(report.result.candidates.some((candidate) =>
    candidate.taskId === "old-claim" &&
    candidate.reasons.includes("claim_older_than_threshold")));
  assert.ok(report.result.candidates.some((candidate) =>
    candidate.status === "unclaimed" && candidate.worktreePath === unclaimedPath));

  assert.equal(fs.readFileSync(claimed.result.claimPath, "utf8"), claimBefore);
  assert.equal(fs.existsSync(claimed.result.worktreePath), true);
  assert.equal(fs.existsSync(unclaimedPath), true);
  assert.equal(gitText(fixture.root, ["worktree", "list", "--porcelain"]), worktreesBefore);
});

test("retire reports before applying and repeated merged closeout is idempotent", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-merged", ["owned"]);
  const worktree = task.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "accepted\n");
  commitAll(worktree, "accepted work");
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  git(fixture.root, ["merge", "--no-ff", task.result.branch, "-m", "integrate"]);
  git(fixture.root, ["push", "origin", "main"]);
  const args = retirementArgs(task, head, gitText(fixture.root, ["rev-parse", "HEAD"]));
  const report = guard(fixture.root, args);
  assert.equal(report.status, 0);
  assert.equal(report.result.disposition, "eligible");
  assert.equal(report.result.equivalence, "ancestor");
  assert.equal(report.result.retired, false);
  assert.equal(fs.existsSync(worktree), true);
  assert.equal(fs.existsSync(task.result.claimPath), true);

  const applied = guard(fixture.root, [...args, "--apply"]);
  assert.equal(applied.status, 0);
  assert.equal(applied.result.retired, true);
  assert.equal(fs.existsSync(worktree), false);
  assert.equal(fs.existsSync(task.result.claimPath), false);
  assert.equal(gitText(fixture.root, ["rev-parse", `refs/heads/${task.result.branch}`]), head);
  const calls = [];
  const repeated = guard(fixture.root, [...args, "--apply"], {runner: recordingGitRunner(calls)});
  assert.equal(repeated.status, 0);
  assert.equal(repeated.result.disposition, "already_absent");
  assert.equal(repeated.result.retired, false);
  assert.equal(calls.some((args) => args[0] === "worktree" && args[1] === "remove"), false);
  assert.equal(calls.some((args) => ["push", "branch", "update-ref"].includes(args[0])), false);
});

test("retire proves full squash paths and keeps unique history in local and live remote refs", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-squash", ["owned"]);
  const worktree = task.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "first\n");
  commitAll(worktree, "first");
  git(worktree, ["mv", "owned/allowed.txt", "owned/renamed.txt"]);
  fs.writeFileSync(path.join(worktree, "owned/new.txt"), "new\n");
  commitAll(worktree, "rename and add");
  git(worktree, ["push", "--set-upstream", "origin", task.result.branch]);
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  git(fixture.root, ["merge", "--squash", task.result.branch]);
  commitAll(fixture.root, "squash accepted work");
  git(fixture.root, ["push", "origin", "main"]);
  const accepted = gitText(fixture.root, ["rev-parse", "HEAD"]);
  assert.equal(gitResult(fixture.root, ["merge-base", "--is-ancestor", head, accepted]).status, 1);
  const applied = guard(fixture.root, [...retirementArgs(task, head, accepted), "--apply"]);
  assert.equal(applied.status, 0);
  assert.equal(applied.result.equivalence, "exact_task_paths");
  assert.equal(applied.result.uniqueCommits, 2);
  assert.equal(applied.result.retired, true);
  assert.equal(gitText(fixture.root, ["rev-parse", `refs/heads/${task.result.branch}`]), head);
  assert.equal(gitText(fixture.remote, ["rev-parse", `refs/heads/${task.result.branch}`]), head);
  assert.equal(applied.result.refsDeleted, false);
});

test("retire refuses partial squash incorporation, stale main and stale remote recovery", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-unproven", ["owned"]);
  const worktree = task.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "accepted?\n");
  fs.writeFileSync(path.join(worktree, "owned/missing.txt"), "unique\n");
  commitAll(worktree, "unique work");
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  git(worktree, ["push", "--set-upstream", "origin", task.result.branch]);
  fs.appendFileSync(path.join(fixture.root, "owned/allowed.txt"), "accepted?\n");
  commitAll(fixture.root, "incomplete integration");
  git(fixture.root, ["push", "origin", "main"]);
  const args = retirementArgs(task, head, gitText(fixture.root, ["rev-parse", "HEAD"]));
  assertRetained(fixture, task, args, "accepted_source_not_equivalent");
  // The tracking ref still says pushed: live remote inspection must disagree.
  git(fixture.remote, ["update-ref", `refs/heads/${task.result.branch}`, fixture.baseSha]);
  assertRetained(fixture, task, args, "unique_history_not_remotely_preserved");
  git(fixture.remote, ["update-ref", "refs/heads/main", fixture.baseSha]);
  assertRetained(fixture, task, args, "main_not_current");
});

test("retire preserves dirty, untracked, ignored files and common stashes", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-files", ["owned"]);
  const worktree = task.result.worktreePath;
  const args = retirementArgs(task, fixture.baseSha, fixture.baseSha);
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "staged\n");
  git(worktree, ["add", "owned/allowed.txt"]);
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "unstaged\n");
  fs.writeFileSync(path.join(worktree, "owned/untracked.txt"), "unique untracked\n");
  assertRetained(fixture, task, args, "uncommitted_changes");
  git(worktree, ["stash", "push", "--include-untracked", "-m", "preserved recovery"]);
  const stash = gitText(worktree, ["rev-parse", "refs/stash"]);
  fs.appendFileSync(path.join(fixture.root, ".git/info/exclude"), "ignored-evidence.txt\n");
  fs.writeFileSync(path.join(worktree, "ignored-evidence.txt"), "original failure evidence\n");
  const retained = assertRetained(fixture, task, args, "ignored_files_require_preservation");
  assert.deepEqual(retained.result.ignoredPaths, ["ignored-evidence.txt"]);
  assert.equal(fs.readFileSync(path.join(worktree, "ignored-evidence.txt"), "utf8"), "original failure evidence\n");
  assert.deepEqual(retained.result.retainedStashes, [stash]);
  assert.equal(gitText(fixture.root, ["rev-parse", "refs/stash"]), stash);
});

// A squash that lands after other work reached main carries that work too.
// These fixtures replay the 18-19 Nov cases: the task's manifest edit, plus a
// concurrent change another PR made to the same file before the squash.
// Each entry spans four lines, like a manifest entry's fields, so edits to
// different fields of nearby entries stay in separate merge hunks.
const manifestLines = Array.from({length: 24}, (_, index) => [`entry-${index}: original`,
  `entry-${index} description`, `entry-${index} checks`, `entry-${index} impact`]).flat();

function concurrentSquashFixture(context, taskId, {taskEdit, mainEdit, squashEdit}) {
  const fixture = createRepository(context);
  fs.writeFileSync(path.join(fixture.root, "owned/manifest.txt"), `${manifestLines.join("\n")}\n`);
  fs.writeFileSync(path.join(fixture.root, "owned/runner.txt"), "runner: original\none\ntwo\nthree\nhelper: original\n");
  commitAll(fixture.root, "seed manifest");
  git(fixture.root, ["push", "origin", "main"]);
  fixture.baseSha = gitText(fixture.root, ["rev-parse", "HEAD"]);
  const task = start(fixture, taskId, ["owned"]);
  const worktree = task.result.worktreePath;
  taskEdit(worktree);
  commitAll(worktree, "task work");
  git(worktree, ["push", "--set-upstream", "origin", task.result.branch]);
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  mainEdit(fixture.root);
  commitAll(fixture.root, "concurrent pull request");
  const concurrent = gitText(fixture.root, ["rev-parse", "HEAD"]);
  git(fixture.root, ["merge", "--squash", task.result.branch]);
  squashEdit?.(fixture.root);
  commitAll(fixture.root, "squash of the task");
  git(fixture.root, ["push", "origin", "main"]);
  return {fixture, task, worktree, head, concurrent, accepted: gitText(fixture.root, ["rev-parse", "HEAD"])};
}

function editLines(root, file, edit) {
  const target = path.join(root, file);
  const lines = fs.readFileSync(target, "utf8").trimEnd().split("\n");
  fs.writeFileSync(target, `${edit(lines).join("\n")}\n`);
}

const concurrentCases = [
  // #2123 rewrote every manifest entry's safety field; #2099 had already
  // changed one other entry's checks and impactPaths.
  ["a broad task rewrite plus another PR's edit to one entry (#2123 with #2099)", {
    taskEdit: (root) => editLines(root, "owned/manifest.txt",
      (lines) => lines.map((line) => line.replace("original", "surface"))),
    mainEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => {
      lines.splice(4 * 20 + 2, 1, "entry-20 checks: catalog", "entry-20 impact: catalog test");
      return lines;
    }),
  }],
  // #2151 removed lines from three entries; the command-client PR had added
  // two impactPaths elsewhere in the same file.
  ["task deletions plus another PR's additions (#2151 with the command-client move)", {
    taskEdit: (root) => editLines(root, "owned/manifest.txt",
      (lines) => lines.filter((line) => !["entry-2: original", "entry-9: original", "entry-15: original"].includes(line))),
    mainEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => {
      lines.splice(4 * 21 + 3, 0, "entry-21 impact: package path");
      lines.splice(4 * 4 + 3, 0, "entry-4 impact: package path");
      return lines;
    }),
  }],
  // C6 (#2057) touched a second task file and a file outside the task's paths.
  ["another PR's edits to two task files and an outside file (C6, #2057)", {
    taskEdit: (root) => {
      editLines(root, "owned/manifest.txt", (lines) => lines.map((line) => (line === "entry-3: original" ? "entry-3: task" : line)));
      editLines(root, "owned/runner.txt", (lines) => lines.map((line) => line.replace("runner: original", "runner: task")));
    },
    mainEdit: (root) => {
      editLines(root, "owned/manifest.txt", (lines) => lines.map((line) => (line === "entry-17 checks" ? "entry-17 checks: every check" : line)));
      editLines(root, "owned/runner.txt", (lines) => lines.map((line) => line.replace("helper: original", "helper: report every failure")));
      fs.appendFileSync(path.join(root, "outside.txt"), "ci requirements\n");
    },
  }],
];

for (const [name, edits] of concurrentCases) {
  test(`retire accepts a squash that also carries main's changes: ${name}`, (context) => {
    const {fixture, task, head, concurrent, accepted} = concurrentSquashFixture(context, "retire-main-delta", edits);
    // The plain comparison fails: the accepted commit also holds main's lines.
    assert.equal(gitResult(fixture.root, ["diff", "--quiet", head, accepted, "--", "owned"]).status, 1);
    const applied = guard(fixture.root, [...retirementArgs(task, head, accepted), "--apply"]);
    assert.equal(applied.status, 0, JSON.stringify(applied.result));
    assert.equal(applied.result.equivalence, "task_paths_plus_main");
    assert.deepEqual(applied.result.mainDeltaCommits, [concurrent]);
    assert.equal(applied.result.retired, true);
    assert.equal(gitText(fixture.remote, ["rev-parse", `refs/heads/${task.result.branch}`]), head);
  });
}

const concurrentMainEdit = (root) => editLines(root, "owned/manifest.txt",
  (lines) => lines.map((line) => (line === "entry-20 checks" ? "entry-20 checks: other pull request" : line)));

test("retire keeps the worktree when the squash drops a unique task line, despite main's changes", (context) => {
  const {fixture, task, head, worktree, accepted} = concurrentSquashFixture(context, "retire-main-delta-dropped", {
    taskEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => [...lines, "entry-24: task", "entry-25: unique task"]),
    mainEdit: concurrentMainEdit,
    squashEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => lines.filter((line) => line !== "entry-25: unique task")),
  });
  assertRetained(fixture, task, retirementArgs(task, head, accepted), "accepted_source_not_equivalent");
  assert.match(fs.readFileSync(path.join(worktree, "owned/manifest.txt"), "utf8"), /entry-25: unique task/u);
});

test("retire keeps the worktree when the squash carries a line from a commit that never reached main", (context) => {
  const {fixture, task, head, accepted} = concurrentSquashFixture(context, "retire-main-delta-unmerged", {
    taskEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => [...lines, "entry-24: task"]),
    mainEdit: concurrentMainEdit,
    // An unmerged branch's line, typed into the squash: not in the task head
    // and not in any ancestor of the accepted commit.
    squashEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => [...lines, "entry-26: unmerged branch"]),
  });
  assertRetained(fixture, task, retirementArgs(task, head, accepted), "accepted_source_not_equivalent");
});

test("retire keeps the worktree when the squash restores a line the task deleted", (context) => {
  const {fixture, task, head, accepted} = concurrentSquashFixture(context, "retire-main-delta-restored", {
    taskEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => lines
      .filter((line) => line !== "entry-8: original")
      .map((line) => (line === "entry-2: original" ? "entry-2: task" : line))),
    mainEdit: concurrentMainEdit,
    squashEdit: (root) => editLines(root, "owned/manifest.txt", (lines) => {
      lines.splice(lines.indexOf("entry-8 description"), 0, "entry-8: original");
      return lines;
    }),
  });
  assertRetained(fixture, task, retirementArgs(task, head, accepted), "accepted_source_not_equivalent");
});

test("retire treats pattern-bearing task filenames literally during squash verification", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-literal-paths", ["owned"]);
  const worktree = task.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "accepted\n");
  fs.writeFileSync(path.join(worktree, "owned/new[1].txt"), "unique omitted file\n");
  commitAll(worktree, "task with literal bracket filename");
  git(worktree, ["push", "--set-upstream", "origin", task.result.branch]);
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  fs.appendFileSync(path.join(fixture.root, "owned/allowed.txt"), "accepted\n");
  commitAll(fixture.root, "squash omitted the bracket file");
  git(fixture.root, ["push", "origin", "main"]);
  const accepted = gitText(fixture.root, ["rev-parse", "HEAD"]);
  assertRetained(fixture, task, retirementArgs(task, head, accepted), "accepted_source_not_equivalent");
  assert.equal(fs.readFileSync(path.join(worktree, "owned/new[1].txt"), "utf8"), "unique omitted file\n");
});

test("retire refuses omitted filenames with leading Git pathspec magic", (context) => {
  const fixture = createRepository(context);
  const literalName = ":(top)unique.txt";
  const task = start(fixture, "retire-pathspec-magic", ["owned", literalName]);
  const worktree = task.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "accepted\n");
  fs.writeFileSync(path.join(worktree, literalName), "unique omitted source\n");
  commitAll(worktree, "task with leading pathspec magic filename");
  git(worktree, ["push", "--set-upstream", "origin", task.result.branch]);
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  fs.appendFileSync(path.join(fixture.root, "owned/allowed.txt"), "accepted\n");
  commitAll(fixture.root, "squash omitted literal magic filename");
  git(fixture.root, ["push", "origin", "main"]);
  const accepted = gitText(fixture.root, ["rev-parse", "HEAD"]);
  // Prove the real Git failure mode: an ordinary pathspec silently skips the
  // literal file. The guard must reject that very same incomplete integration.
  assert.equal(gitResult(fixture.root, ["diff", "--quiet", "--no-renames", head,
    accepted, "--", literalName, "owned/allowed.txt"]).status, 0);
  assertRetained(fixture, task, retirementArgs(task, head, accepted), "accepted_source_not_equivalent");
  assert.equal(fs.readFileSync(path.join(worktree, literalName), "utf8"), "unique omitted source\n");
  fs.writeFileSync(path.join(fixture.root, literalName), "unique omitted source\n");
  commitAll(fixture.root, "incorporate the literal magic filename");
  git(fixture.root, ["push", "origin", "main"]);
  const incorporated = gitText(fixture.root, ["rev-parse", "HEAD"]);
  const eligible = guard(fixture.root, retirementArgs(task, head, incorporated));
  assert.equal(eligible.status, 0);
  assert.equal(eligible.result.disposition, "eligible");
  assert.equal(eligible.result.equivalence, "exact_task_paths");
  assert.equal(fs.existsSync(task.result.claimPath), true);
  assert.equal(fs.existsSync(worktree), true);
});

test("retire requires exact identity, external clearance and no foreign active claims", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-owners", ["owned"]);
  const args = retirementArgs(task, fixture.baseSha, fixture.baseSha);
  assertRetained(fixture, task, args.slice(0, 9), "manual_clearance_required");
  const wrongId = [...args]; wrongId[2] = "another-task";
  assertRetained(fixture, task, wrongId, "task_identity_mismatch");
  const wrongHead = [...args]; wrongHead[6] = "f".repeat(40);
  assertRetained(fixture, task, wrongHead, "head_changed");
  const other = start(fixture, "foreign-owner", ["outside.txt"]);
  const claim = JSON.parse(fs.readFileSync(other.result.claimPath, "utf8"));
  claim.claimedPaths = ["owned"];
  fs.writeFileSync(other.result.claimPath, JSON.stringify(claim));
  const retained = assertRetained(fixture, task, args, "other_active_claims");
  assert.match(retained.result.retention.find((row) => row.reason === "other_active_claims").nextAction, /foreign-owner/u);
  assert.equal(fs.existsSync(other.result.claimPath), true);
  assert.equal(fs.existsSync(other.result.worktreePath), true);
});

test("retire preserves locked worktrees and refuses execution from the target", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-locked", ["owned"]);
  const args = retirementArgs(task, fixture.baseSha, fixture.baseSha);
  git(fixture.root, ["worktree", "lock", "--reason", "runtime owner", task.result.worktreePath]);
  assertRetained(fixture, task, args, "worktree_locked");
  git(fixture.root, ["worktree", "unlock", task.result.worktreePath]);
  const inside = guard(task.result.worktreePath, [...args, "--apply"]);
  assert.ok(inside.result.blockers.includes("retirement_from_target"));
  assert.equal(fs.existsSync(task.result.claimPath), true);
});

test("retire retains the claim after a normal Git refusal and never forces removal", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-refusal", ["owned"]);
  const args = retirementArgs(task, fixture.baseSha, fixture.baseSha);
  const calls = [];
  const runner = ({cwd, args}) => {
    calls.push([...args]);
    if (args[0] === "worktree" && args[1] === "remove") {
      fs.writeFileSync(path.join(task.result.worktreePath, "owned/raced.txt"), "late unique work\n");
    }
    return gitResult(cwd, args);
  };
  const retained = guard(fixture.root, [...args, "--apply"], {runner});
  assert.equal(retained.status, 1);
  assert.ok(retained.result.blockers.includes("git_remove_refused"));
  assert.equal(fs.existsSync(task.result.claimPath), true);
  assert.equal(fs.readFileSync(path.join(task.result.worktreePath, "owned/raced.txt"), "utf8"), "late unique work\n");
  assert.equal(calls.filter((args) => args[0] === "worktree" && args[1] === "remove").length, 1);
  assert.equal(calls.some((args) => args.includes("--force") || args.includes("-f") || args.includes("-D")), false);
  assertRetained(fixture, task, args, "uncommitted_changes");
});

test("retire rejects nonphysical paths, unsupported force and cross-command apply", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-paths", ["owned"]);
  const args = retirementArgs(task, fixture.baseSha, fixture.baseSha);
  assert.throws(() => guard(fixture.root, [...args, "--force"]), TaskUsageError);
  assert.throws(() => guard(fixture.root, ["finish", "--worktree", task.result.worktreePath, "--apply"]), TaskUsageError);
  const escape = [...args]; escape[4] = fixture.root;
  assert.throws(() => guard(fixture.root, escape), TaskUsageError);
  const dangling = path.join(fixture.root, ".claude/worktrees/dangling");
  fs.symlinkSync(path.join(fixture.container, "absent"), dangling);
  const link = [...args]; link[4] = dangling;
  assert.throws(() => guard(fixture.root, link), TaskUsageError);
  assert.equal(fs.existsSync(task.result.claimPath), true);
});

test("retire reports ignored directory roots without losing preservation protection", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-cache-roots", ["owned"]);
  fs.appendFileSync(path.join(fixture.root, ".git/info/exclude"), "node_modules/\nbuild/\n");
  for (const file of ["node_modules/pkg/index.js", "build/reports/recovery.json"]) {
    const target = path.join(task.result.worktreePath, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, "preserve until reviewed");
  }
  const retained = assertRetained(fixture, task, retirementArgs(task, fixture.baseSha, fixture.baseSha),
    "ignored_files_require_preservation");
  assert.deepEqual(retained.result.ignoredPaths, ["build/", "node_modules/"]);
  assert.equal(fs.existsSync(path.join(task.result.worktreePath, "build/reports/recovery.json")), true);
});

function retirementArgs(task, headSha, acceptedSha) {
  return ["retire", "--task-id", task.result.taskId, "--worktree", task.result.worktreePath,
    "--head-sha", headSha, "--accepted-sha", acceptedSha,
    "--by", "test-task-owner", "--clearance", "Synthetic fixture accepted; no foreign consumers; recovery verified; fixture-only removal authorized."];
}

function assertRetained(fixture, task, args, blocker) {
  const execution = guard(fixture.root, [...args, "--apply"]);
  assert.equal(execution.status, 1);
  assert.ok(execution.result.blockers.includes(blocker), JSON.stringify(execution.result));
  assert.equal(execution.result.retired, false);
  assert.equal(fs.existsSync(task.result.worktreePath), true);
  assert.equal(fs.existsSync(task.result.claimPath), true);
  assert.ok(execution.result.retention.every((row) => row.path === task.result.worktreePath && row.accountableOwner && row.nextAction));
  return execution;
}

function createRepository(context) {
  const container = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "catch-worktree-guard-")),
  );
  const root = path.join(container, "repo");
  const remote = path.join(container, "origin.git");
  fs.mkdirSync(root);
  context.after(() => fs.rmSync(container, {recursive: true, force: true}));

  git(container, ["init", "--bare", remote]);
  git(container, ["init", "--initial-branch=main", root]);
  git(root, ["config", "user.name", "Catch Worktree Test"]);
  git(root, ["config", "user.email", "worktree-test@catch.local"]);
  git(root, ["config", "commit.gpgsign", "false"]);
  git(root, ["config", "branch.autoSetupMerge", "false"]);
  git(root, ["remote", "add", "origin", remote]);

  fs.mkdirSync(path.join(root, "owned"));
  fs.writeFileSync(path.join(root, "owned", "allowed.txt"), "base\n");
  fs.writeFileSync(path.join(root, "outside.txt"), "outside base\n");
  fs.writeFileSync(path.join(root, ".gitignore"), ".claude/worktrees/\n");
  commitAll(root, "base");
  git(root, ["push", "--set-upstream", "origin", "main"]);
  return {baseSha: gitText(root, ["rev-parse", "HEAD"]), container, remote, root};
}

function start(fixture, taskId, claimedPaths, {now, runner} = {}) {
  return guard(fixture.root, [
    "start",
    "--task-id", taskId,
    "--base-sha", fixture.baseSha,
    "--paths", claimedPaths.join(","),
  ], {now, runner});
}

function guard(cwd, args, options = {}) {
  return executeTaskCommand({cwd, args, ...options});
}

function commitAll(cwd, message) {
  git(cwd, ["add", "--all"]);
  git(cwd, ["commit", "-m", message]);
}

function claimFiles(root) {
  const claimsRoot = path.join(root, ".git", "catch-worktree-claims");
  if (!fs.existsSync(claimsRoot)) return [];
  return fs.readdirSync(claimsRoot)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function abandonmentFiles(root) {
  const recordsRoot = path.join(root, ".git", "catch-worktree-claims", "abandoned");
  if (!fs.existsSync(recordsRoot)) return [];
  return fs.readdirSync(recordsRoot)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function recordingGitRunner(calls) {
  return ({cwd, args}) => {
    calls.push([...args]);
    return gitResult(cwd, args);
  };
}

function gitText(cwd, args) {
  const result = gitResult(cwd, args);
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
  );
  return result.stdout.trim();
}

function git(cwd, args) {
  gitText(cwd, args);
}

function gitResult(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

test("retire accepts the pull request head ref GitHub keeps after a merge queue deletes the branch", (context) => {
  const fixture = createRepository(context);
  const task = start(fixture, "retire-queue-merged", ["owned"]);
  const worktree = task.result.worktreePath;
  fs.appendFileSync(path.join(worktree, "owned/allowed.txt"), "queued change\n");
  commitAll(worktree, "first");
  fs.writeFileSync(path.join(worktree, "owned/new.txt"), "new\n");
  commitAll(worktree, "second");
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  git(worktree, ["push", "--set-upstream", "origin", task.result.branch]);
  git(fixture.root, ["merge", "--squash", task.result.branch]);
  commitAll(fixture.root, "queue squash");
  git(fixture.root, ["push", "origin", "main"]);
  const accepted = gitText(fixture.root, ["rev-parse", "HEAD"]);
  // The merge queue deleted the branch; only a mismatched pull ref remains.
  git(worktree, ["push", "origin", "--delete", task.result.branch]);
  git(fixture.remote, ["update-ref", "refs/pull/12/head", fixture.baseSha]);
  const args = retirementArgs(task, head, accepted);
  assertRetained(fixture, task, args, "unique_history_not_remotely_preserved");
  git(fixture.remote, ["update-ref", "refs/pull/12/head", head]);
  const applied = guard(fixture.root, [...args, "--apply"]);
  assert.equal(applied.status, 0, JSON.stringify(applied.result));
  assert.equal(applied.result.equivalence, "exact_task_paths");
  assert.equal(applied.result.retainedRemoteRef, "refs/pull/12/head");
  assert.equal(applied.result.retired, true);
  assert.equal(gitText(fixture.root, ["rev-parse", `refs/heads/${task.result.branch}`]), head);
});

test("retire accepts claude/ task branches and still retains backup branches", (context) => {
  const fixture = createRepository(context);
  for (const [taskId, branch, retained] of [
    ["retire-claude-branch", "claude/retire-claude-branch", false],
    ["retire-claude-backup", "claude/backup/retire-claude-backup", true],
  ]) {
    const task = guard(fixture.root, ["start", "--task-id", taskId, "--base-sha", fixture.baseSha,
      "--paths", `owned/${taskId}.txt`, "--branch", branch]);
    assert.equal(task.status, 0, JSON.stringify(task.result));
    const execution = guard(fixture.root, [...retirementArgs(task, fixture.baseSha, fixture.baseSha), "--apply"]);
    assert.equal(execution.result.blockers.includes("protected_branch"), retained, JSON.stringify(execution.result));
  }
});
