import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  auditBranches,
  classifyBranchEvidence,
  pruneBranches,
  summarizeBranches,
} from "./branch_hygiene.mjs";

const scriptPath = fileURLToPath(new URL("./branch_hygiene.mjs", import.meta.url));

test("classifyBranchEvidence protects open work and separates safe integration from abandonment", () => {
  assert.deepEqual(
    classifyBranchEvidence({
      ageDays: 30,
      ancestorOfBase: true,
      changedPathsMatchBase: true,
      mergedPullRequest: true,
      openPullRequest: true,
      staleDays: 7,
      treeWitness: true,
    }),
    {category: "active", proof: "open-pull-request"},
  );
  assert.deepEqual(
    classifyBranchEvidence({
      ageDays: 30,
      ancestorOfBase: true,
      baseOfOpenPullRequest: true,
      changedPathsMatchBase: true,
      mergedPullRequest: false,
      openPullRequest: false,
      staleDays: 7,
      treeWitness: true,
    }),
    {category: "active", proof: "base-of-open-pull-request"},
  );
  assert.equal(
    classifyBranchEvidence({
      ageDays: 30,
      ancestorOfBase: false,
      changedPathsMatchBase: false,
      mergedPullRequest: false,
      openPullRequest: false,
      staleDays: 7,
      treeWitness: true,
    }).category,
    "integrated",
  );
  assert.equal(
    classifyBranchEvidence({
      ageDays: 6,
      ancestorOfBase: false,
      changedPathsMatchBase: false,
      mergedPullRequest: false,
      openPullRequest: false,
      staleDays: 7,
      treeWitness: false,
    }).category,
    "recent",
  );
  assert.equal(
    classifyBranchEvidence({
      ageDays: 7,
      ancestorOfBase: false,
      changedPathsMatchBase: false,
      mergedPullRequest: false,
      openPullRequest: false,
      staleDays: 7,
      treeWitness: false,
    }).category,
    "abandoned",
  );
});

test("summarizeBranches exposes a non-vacuous safe-prune count", () => {
  assert.deepEqual(
    summarizeBranches([
      {category: "integrated", safeToPrune: true},
      {category: "integrated", safeToPrune: false},
      {category: "active", safeToPrune: false},
      {category: "recent", safeToPrune: false},
      {category: "abandoned", safeToPrune: false},
    ]),
    {
      total: 5,
      active: 1,
      recent: 1,
      integrated: 2,
      abandoned: 1,
      safeToPrune: 1,
    },
  );
});

test("CLI audits remote refs, protects open PRs, and fails on abandoned code", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "catch-branch-hygiene-"));
  git(repo, ["init", "-q", "-b", "main"]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "Catch Test"]);

  write(repo, "base.txt", "base\n");
  commitAll(repo, "base", "2026-01-01T00:00:00Z");
  const base = git(repo, ["rev-parse", "HEAD"]);

  git(repo, ["switch", "-q", "-c", "merged-ancestor"]);
  write(repo, "merged.txt", "merged\n");
  commitAll(repo, "merged ancestor", "2026-01-02T00:00:00Z");
  const mergedAncestor = git(repo, ["rev-parse", "HEAD"]);
  git(repo, ["switch", "-q", "main"]);
  git(repo, ["merge", "-q", "--ff-only", "merged-ancestor"]);

  git(repo, ["switch", "-q", "-c", "abandoned", base]);
  write(repo, "abandoned.txt", "unique\n");
  commitAll(repo, "abandoned", "2026-01-03T00:00:00Z");
  const abandoned = git(repo, ["rev-parse", "HEAD"]);

  git(repo, ["switch", "-q", "-c", "active", base]);
  write(repo, "active.txt", "reviewed\n");
  commitAll(repo, "active", "2026-01-04T00:00:00Z");
  const active = git(repo, ["rev-parse", "HEAD"]);

  git(repo, ["switch", "-q", "main"]);
  const main = git(repo, ["rev-parse", "HEAD"]);
  git(repo, ["update-ref", "refs/remotes/origin/main", main]);
  git(repo, ["update-ref", "refs/remotes/origin/merged-ancestor", mergedAncestor]);
  git(repo, ["update-ref", "refs/remotes/origin/abandoned", abandoned]);
  git(repo, ["update-ref", "refs/remotes/origin/active", active]);
  git(repo, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);

  const pulls = path.join(repo, "pulls.json");
  fs.writeFileSync(
    pulls,
    JSON.stringify([
      {
        number: 7,
        state: "OPEN",
        baseRefName: "main",
        headRefName: "active",
        headRefOid: active,
        url: "https://example.test/pull/7",
      },
    ]),
  );
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--repo",
      repo,
      "--base",
      "origin/main",
      "--pull-requests",
      pulls,
      "--stale-days",
      "0",
      "--prune-after-days",
      "0",
      "--fail-on-abandoned",
      "--json",
    ],
    {encoding: "utf8"},
  );
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.integrated, 1);
  assert.equal(report.summary.active, 1);
  assert.equal(report.summary.abandoned, 1);
  assert.equal(report.summary.total, 3);
  assert.equal(report.summary.safeToPrune, 1);
  assert.equal(
    report.branches.find((branch) => branch.name === "merged-ancestor").proof,
    "ancestor-of-base",
  );
  assert.equal(
    report.branches.find((branch) => branch.name === "active").pullRequest.number,
    7,
  );
});

test("prune deletes only integrated refs that did not move after the audit", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-branch-prune-"));
  const remote = path.join(root, "remote.git");
  const repo = path.join(root, "repo");
  git(root, ["init", "-q", "--bare", "-b", "main", remote]);
  git(root, ["init", "-q", "-b", "main", repo]);
  git(repo, ["remote", "add", "origin", remote]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "Catch Test"]);

  write(repo, "base.txt", "base\n");
  commitAll(repo, "base", "2026-01-01T00:00:00Z");
  const base = git(repo, ["rev-parse", "HEAD"]);
  write(repo, "merged.txt", "merged\n");
  commitAll(repo, "merged", "2026-01-02T00:00:00Z");
  const main = git(repo, ["rev-parse", "HEAD"]);
  git(repo, ["switch", "-q", "-c", "abandoned", base]);
  write(repo, "abandoned.txt", "unique\n");
  commitAll(repo, "abandoned", "2026-01-03T00:00:00Z");
  const abandoned = git(repo, ["rev-parse", "HEAD"]);
  git(repo, ["switch", "-q", "main"]);

  const integrated = [
    "merged",
    "moved-after-audit",
    "stack-base",
    "open-head-other-base",
    "gh-readonly-queue/main/pr-1-abc",
  ];
  for (const name of integrated) git(repo, ["push", "-q", "origin", `${main}:refs/heads/${name}`]);
  git(repo, ["push", "-q", "origin", "main", `${abandoned}:refs/heads/abandoned`]);
  git(repo, ["fetch", "-q", "origin"]);

  const report = auditBranches({
    repo,
    base: "origin/main",
    remote: "origin",
    staleDays: 0,
    pruneAfterDays: 0,
    now: new Date("2026-02-01T00:00:00Z"),
    pullRequests: [
      {number: 1, state: "OPEN", headRefName: "stacked", baseRefName: "stack-base"},
      {number: 2, state: "OPEN", headRefName: "open-head-other-base", baseRefName: "stack-base"},
    ],
  });
  const byName = Object.fromEntries(report.branches.map((branch) => [branch.name, branch]));
  assert.equal(byName["stack-base"].proof, "base-of-open-pull-request");
  assert.equal(byName["open-head-other-base"].proof, "open-pull-request");
  assert.equal(byName["gh-readonly-queue/main/pr-1-abc"].safeToPrune, false);
  assert.equal(byName.abandoned.category, "abandoned");

  // Someone pushes to a safe-looking branch between the audit and the prune.
  write(repo, "late.txt", "late\n");
  commitAll(repo, "late push", "2026-01-04T00:00:00Z");
  git(repo, ["push", "-q", "origin", "HEAD:refs/heads/moved-after-audit"]);

  const pruned = pruneBranches({repo, remote: "origin", report});
  assert.deepEqual(
    pruned.map(({name, deleted}) => ({name, deleted})),
    [
      {name: "merged", deleted: true},
      {name: "moved-after-audit", deleted: false},
    ],
  );
  const remaining = git(remote, ["for-each-ref", "--format=%(refname:short)", "refs/heads"])
    .split("\n")
    .sort();
  assert.deepEqual(remaining, [
    "abandoned",
    "gh-readonly-queue/main/pr-1-abc",
    "main",
    "moved-after-audit",
    "open-head-other-base",
    "stack-base",
  ]);
});

test("CLI refuses to prune without pull-request protection", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--prune"], {encoding: "utf8"});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--prune requires --pull-requests/u);
});

test("weekly prune workflow deletes only through the leased classifier", () => {
  const repoRoot = path.resolve(path.dirname(scriptPath), "../..");
  const source = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/branch-prune.yml"),
    "utf8",
  );
  assert.match(source, /cron: "17 2 \* \* 1"/u);
  assert.match(source, /contents: write/u);
  assert.match(source, /node tool\/git\/branch_hygiene\.mjs[^\n]*\\\n(?:[^\n]*\\\n)*\s*--prune/u);
  assert.match(source, /--pull-requests build\/branch-prune\/pull-requests\.json/u);
  assert.doesNotMatch(source, /git push|gh api --method DELETE/u);
});

test("scheduled workflow reports safe refs without granting branch deletion authority", () => {
  const repoRoot = path.resolve(path.dirname(scriptPath), "../..");
  const source = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/branch-hygiene.yml"),
    "utf8",
  );
  assert.match(source, /cron: "41 1 \* \* \*"/u);
  assert.match(source, /contents: read/u);
  assert.doesNotMatch(source, /contents: write/u);
  assert.doesNotMatch(source, /gh api --method DELETE/u);
  assert.match(source, /summary\.safeToPrune/u);
  assert.match(source, /--fail-on-abandoned/u);
  assert.match(source, /Code outside main requires review/u);
});

function git(repo, args, env = {}) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    env: {...process.env, ...env},
  }).trim();
}

function write(repo, relativePath, source) {
  const file = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}

function commitAll(repo, message, date) {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", message], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
}
