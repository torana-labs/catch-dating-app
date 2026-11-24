import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import test from "node:test";
import {classifyWorktree, parseWorktreeList, sweepWorktrees} from "./sweep_merged_worktrees.mjs";

test("classifyWorktree removes only clean, idle, merged worktrees", () => {
  const merged = {ancestorOfMain: true, idleHours: 24, minIdleHours: 6};
  assert.deepEqual(classifyWorktree(merged), {action: "remove", reason: "in-origin-main"});
  assert.deepEqual(classifyWorktree({idleHours: 24, mergedPullRequest: 42}),
    {action: "remove", reason: "merged-pr-42"});
  assert.equal(classifyWorktree({...merged, primary: true}).reason, "primary-checkout");
  assert.equal(classifyWorktree({...merged, locked: true}).reason, "locked");
  assert.equal(classifyWorktree({...merged, dirty: true}).reason, "uncommitted-changes");
  assert.equal(classifyWorktree({...merged, inUse: true}).reason, "process-running-inside");
  assert.equal(classifyWorktree({...merged, openPullRequest: true}).reason, "open-pull-request");
  assert.equal(classifyWorktree({...merged, unstartedClaim: true}).reason, "claimed-not-started");
  assert.equal(classifyWorktree({...merged, ancestorOfMain: false}).reason, "unmerged-commits");
  assert.equal(classifyWorktree({...merged, idleHours: 1}).reason, "recent-activity:in-origin-main");
  assert.equal(classifyWorktree({missing: true}).action, "prune");
});

test("parseWorktreeList reads branches, detached heads and locks", () => {
  const entries = parseWorktreeList([
    "worktree /repo", "HEAD aaa", "branch refs/heads/main", "",
    "worktree /repo/.claude/worktrees/x", "HEAD bbb", "detached", "locked", "",
  ].join("\n"));
  assert.deepEqual(entries, [
    {path: "/repo", head: "aaa", branch: "main", locked: false, prunable: false},
    {path: "/repo/.claude/worktrees/x", head: "bbb", branch: null, locked: true, prunable: false},
  ]);
});

function sh(cwd, ...args) {
  return execFileSync("git", args, {cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
}

function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sweep-wt-")));
  const origin = path.join(root, "origin.git");
  const repo = path.join(root, "repo");
  sh(root, "init", "--bare", "-b", "main", origin);
  sh(root, "init", "-b", "main", repo);
  sh(repo, "config", "user.email", "t@example.com");
  sh(repo, "config", "user.name", "t");
  fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/\n");
  fs.writeFileSync(path.join(repo, "a.txt"), "a\n");
  sh(repo, "add", ".");
  sh(repo, "commit", "-m", "base");
  sh(repo, "remote", "add", "origin", origin);
  sh(repo, "push", "-q", "origin", "main");
  sh(repo, "fetch", "-q", "origin");
  const add = (name, branch) => {
    const wt = path.join(root, name);
    sh(repo, "worktree", "add", "-q", "-b", branch, wt, "origin/main");
    return wt;
  };
  const merged = add("merged", "claude/merged");
  fs.mkdirSync(path.join(merged, "node_modules"));
  fs.writeFileSync(path.join(merged, "node_modules", "dep.js"), "x\n");
  const dirty = add("dirty", "claude/dirty");
  fs.writeFileSync(path.join(dirty, "new.txt"), "work\n");
  const open = add("open", "claude/open");
  const unmerged = add("unmerged", "claude/unmerged");
  fs.writeFileSync(path.join(unmerged, "b.txt"), "b\n");
  sh(unmerged, "add", ".");
  sh(unmerged, "commit", "-q", "-m", "work");
  const squashed = add("squashed", "claude/squashed");
  fs.writeFileSync(path.join(squashed, "c.txt"), "c\n");
  sh(squashed, "add", ".");
  sh(squashed, "commit", "-q", "-m", "squashed elsewhere");
  return {root, repo, merged, dirty, open, unmerged, squashed, squashedHead: sh(squashed, "rev-parse", "HEAD")};
}

test("sweepWorktrees reports, then removes only finished worktrees", () => {
  const f = fixture();
  try {
    const later = () => new Date(Date.now() + 48 * 3600 * 1000);
    const github = () => ({
      available: true,
      mergedByHead: new Map([[f.squashedHead, 7]]),
      openBranches: new Set(["claude/open"]),
    });
    const run = (apply, now = later) => sweepWorktrees({
      cwd: f.repo, apply, fetch: false, now, github, processCwds: () => [],
    });
    const reasons = (report) => Object.fromEntries(report.results.map((r) => [path.basename(r.path), r.reason]));

    const recent = run(false, () => new Date());
    assert.equal(reasons(recent).merged, "recent-activity:in-origin-main");

    const dry = run(false);
    assert.deepEqual(reasons(dry), {
      repo: "primary-checkout",
      merged: "in-origin-main",
      dirty: "uncommitted-changes",
      open: "open-pull-request",
      unmerged: "unmerged-commits",
      squashed: "merged-pr-7",
    });
    assert.ok(fs.existsSync(f.merged), "dry run removes nothing");

    const applied = run(true);
    const outcomes = Object.fromEntries(applied.results.map((r) => [path.basename(r.path), r.outcome ?? null]));
    assert.equal(outcomes.merged, "removed");
    assert.equal(outcomes.squashed, "removed");
    assert.ok(!fs.existsSync(f.merged));
    assert.ok(!fs.existsSync(f.squashed));
    for (const kept of [f.dirty, f.open, f.unmerged]) assert.ok(fs.existsSync(kept));
    assert.match(sh(f.repo, "branch", "--list", "claude/squashed"), /claude\/squashed/u, "branches stay");
  } finally {
    fs.rmSync(f.root, {recursive: true, force: true});
  }
});

test("sweepWorktrees removes a worktree whose head is an earlier commit of a merged PR", () => {
  const f = fixture();
  try {
    const asked = [];
    const report = sweepWorktrees({
      cwd: f.repo, apply: true, fetch: false,
      now: () => new Date(Date.now() + 48 * 3600 * 1000),
      github: () => ({
        available: true,
        mergedByHead: new Map(),
        openBranches: new Set(["claude/open"]),
        mergedContaining: (sha) => { asked.push(sha); return sha === f.squashedHead ? 9 : null; },
      }),
      processCwds: () => [],
    });
    const byName = Object.fromEntries(report.results.map((r) => [path.basename(r.path), r]));
    assert.equal(byName.squashed.reason, "merged-pr-9");
    assert.equal(byName.squashed.outcome, "removed");
    assert.equal(byName.unmerged.reason, "unmerged-commits");
    assert.ok(fs.existsSync(f.unmerged));
    // Only clean worktrees the cheap checks left undecided cost a GitHub lookup.
    assert.deepEqual(new Set(asked), new Set([sh(f.unmerged, "rev-parse", "HEAD"), f.squashedHead]));
  } finally {
    fs.rmSync(f.root, {recursive: true, force: true});
  }
});

test("sweepWorktrees keeps a worktree a process is running in", () => {
  const f = fixture();
  try {
    const report = sweepWorktrees({
      cwd: f.repo, apply: true, fetch: false,
      now: () => new Date(Date.now() + 48 * 3600 * 1000),
      github: () => ({available: false, mergedByHead: new Map(), openBranches: new Set()}),
      processCwds: () => [path.join(f.merged, "node_modules")],
    });
    const merged = report.results.find((r) => r.path === f.merged);
    assert.equal(merged.reason, "process-running-inside");
    assert.ok(fs.existsSync(f.merged));
  } finally {
    fs.rmSync(f.root, {recursive: true, force: true});
  }
});

test("sweepWorktrees keeps a claimed task worktree that has no commits yet", () => {
  const f = fixture();
  try {
    const fresh = path.join(f.root, "fresh");
    sh(f.repo, "worktree", "add", "-q", "-b", "codex/fresh", fresh, "origin/main");
    const head = sh(fresh, "rev-parse", "HEAD");
    const claims = path.join(f.repo, ".git", "catch-worktree-claims");
    fs.mkdirSync(claims, {recursive: true});
    fs.writeFileSync(path.join(claims, "fresh.json"), JSON.stringify({
      taskId: "fresh", baseSha: head, branch: "codex/fresh", worktreePath: fresh, claimedPaths: ["a.txt"],
    }));
    const report = sweepWorktrees({
      cwd: f.repo, apply: true, fetch: false, now: () => new Date(Date.now() + 48 * 3600 * 1000),
      github: () => ({available: true, mergedByHead: new Map(), openBranches: new Set()}),
      processCwds: () => [],
    });
    const row = report.results.find((r) => path.basename(r.path) === "fresh");
    assert.equal(row.reason, "claimed-not-started");
    assert.equal(row.outcome, undefined);
    assert.ok(fs.existsSync(fresh), "the fresh task worktree stays");
    assert.ok(!fs.existsSync(f.merged), "an unclaimed finished worktree still goes");
  } finally {
    fs.rmSync(f.root, {recursive: true, force: true});
  }
});
