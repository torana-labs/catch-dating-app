#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {parseArgs} from "node:util";
import {fileURLToPath} from "node:url";

const defaultRepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
// GitHub creates and deletes merge-queue refs itself; pruning one would
// abort the queued group it is testing.
const githubManagedBranchPrefixes = ["gh-readonly-queue/"];

export function classifyBranchEvidence({
  ageDays,
  ancestorOfBase,
  baseOfOpenPullRequest = false,
  changedPathsMatchBase,
  mergedPullRequest,
  openPullRequest,
  staleDays,
  treeWitness,
}) {
  if (openPullRequest) {
    return {category: "active", proof: "open-pull-request"};
  }
  if (baseOfOpenPullRequest) {
    return {category: "active", proof: "base-of-open-pull-request"};
  }
  if (ancestorOfBase) {
    return {category: "integrated", proof: "ancestor-of-base"};
  }
  if (treeWitness) {
    return {category: "integrated", proof: "tip-tree-in-base-history"};
  }
  if (mergedPullRequest) {
    return {category: "integrated", proof: "exact-tip-merged-pull-request"};
  }
  if (changedPathsMatchBase) {
    return {category: "integrated", proof: "branch-paths-match-base"};
  }
  if (ageDays < staleDays) {
    return {category: "recent", proof: "within-review-window"};
  }
  return {category: "abandoned", proof: "stale-without-open-pull-request"};
}

export function summarizeBranches(branches) {
  const summary = {
    total: branches.length,
    active: 0,
    recent: 0,
    integrated: 0,
    abandoned: 0,
    safeToPrune: 0,
  };
  for (const branch of branches) {
    summary[branch.category] += 1;
    if (branch.safeToPrune) summary.safeToPrune += 1;
  }
  return summary;
}

export function auditBranches({
  repo,
  base,
  remote,
  local = false,
  staleDays,
  pruneAfterDays,
  pullRequests = [],
  now = new Date(),
}) {
  const baseCommit = resolveCommit(repo, base);
  const baseBranch = base.replace(new RegExp(`^${escapeRegExp(remote)}/`, "u"), "");
  const baseTrees = readBaseTreeWitnesses(repo, baseCommit);
  const refs = readBranches(repo, {remote, local}).filter((entry) =>
    local
      ? entry.branch !== baseBranch
      : entry.shortName !== base && entry.fullName !== `refs/remotes/${remote}/HEAD`,
  );
  const branches = refs.map((entry) => {
    const tipCommit = resolveCommit(repo, entry.shortName);
    const tipTree = runGit(repo, ["rev-parse", `${tipCommit}^{tree}`]).trim();
    const ageDays = Math.max(
      0,
      (now.getTime() / 1000 - entry.committerUnix) / 86_400,
    );
    // Any open PR protects its head, whatever its base, and its base:
    // deleting a PR's base branch closes the PR.
    const openPullRequest = pullRequests.find(
      (pullRequest) =>
        pullRequest?.state === "OPEN" && pullRequest?.headRefName === entry.branch,
    );
    const baseOfOpenPullRequest = pullRequests.some(
      (pullRequest) =>
        pullRequest?.state === "OPEN" && pullRequest?.baseRefName === entry.branch,
    );
    const mergedPullRequest = pullRequests.find((pullRequest) => {
      const mergeCommit = pullRequest?.mergeCommit?.oid;
      return (
        pullRequest?.state === "MERGED" &&
        pullRequest?.headRefName === entry.branch &&
        pullRequest?.headRefOid === tipCommit &&
        pullRequest?.baseRefName === baseBranch &&
        typeof mergeCommit === "string" &&
        isAncestor(repo, mergeCommit, baseCommit)
      );
    });
    const mergeBase = runGit(repo, ["merge-base", baseCommit, tipCommit]).trim();
    const changedPaths = readChangedPaths(repo, mergeBase, tipCommit);
    const changedPathsMatchBase = changedPaths.every((filePath) =>
      pathMatches(repo, baseCommit, tipCommit, filePath),
    );
    const counts = readAheadBehind(repo, baseCommit, tipCommit);
    const classification = classifyBranchEvidence({
      ageDays,
      ancestorOfBase: isAncestor(repo, tipCommit, baseCommit),
      baseOfOpenPullRequest,
      changedPathsMatchBase,
      mergedPullRequest: mergedPullRequest != null,
      openPullRequest: openPullRequest != null,
      staleDays,
      treeWitness: baseTrees.has(tipTree),
    });
    const safeToPrune =
      classification.category === "integrated" &&
      ageDays >= pruneAfterDays &&
      !githubManagedBranchPrefixes.some((prefix) => entry.branch.startsWith(prefix));

    return {
      name: entry.branch,
      ref: entry.shortName,
      tipCommit,
      tipTree,
      subject: entry.subject,
      committedAt: new Date(entry.committerUnix * 1000).toISOString(),
      ageDays: round(ageDays),
      behindBase: counts.left,
      aheadOfBase: counts.right,
      changedPathCount: changedPaths.length,
      changedPaths: changedPaths.slice(0, 50),
      changedPathsTruncated: changedPaths.length > 50,
      pullRequest: publicPullRequest(openPullRequest ?? mergedPullRequest),
      ...classification,
      safeToPrune,
    };
  });
  branches.sort(compareBranches);
  return {
    schemaVersion: 1,
    tool: "branch-hygiene",
    generatedAt: now.toISOString(),
    repository: path.resolve(repo),
    namespace: local ? "local" : "remote",
    remote,
    base: {ref: base, commit: baseCommit},
    policy: {staleDays, pruneAfterDays},
    summary: summarizeBranches(branches),
    branches,
  };
}

// Deletes each safe-to-prune remote branch only while the remote still points
// at the audited tip, so a push made after the audit keeps the branch.
export function pruneBranches({repo, remote, report}) {
  return report.branches
    .filter((branch) => branch.safeToPrune)
    .map((branch) => {
      const ref = `refs/heads/${branch.name}`;
      const args = [
        "push",
        "--porcelain",
        `--force-with-lease=${ref}:${branch.tipCommit}`,
        remote,
        `:${ref}`,
      ];
      const result = spawnSync("git", args, {cwd: repo, encoding: "utf8"});
      return {
        name: branch.name,
        tipCommit: branch.tipCommit,
        proof: branch.proof,
        deleted: result.status === 0,
        detail: result.status === 0
          ? null
          : (result.stderr || result.stdout || "git push failed").trim(),
      };
    });
}

function runCli() {
  try {
    const {values} = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: false,
      strict: true,
      options: {
        base: {type: "string", default: "origin/main"},
        remote: {type: "string", default: "origin"},
        repo: {type: "string", default: defaultRepoRoot},
        "pull-requests": {type: "string"},
        "stale-days": {type: "string", default: "7"},
        "prune-after-days": {type: "string", default: "1"},
        "fail-on-abandoned": {type: "boolean", default: false},
        prune: {type: "boolean", default: false},
        local: {type: "boolean", default: false},
        json: {type: "boolean", default: false, short: "j"},
        help: {type: "boolean", default: false, short: "h"},
      },
    });
    if (values.help) {
      printHelp();
      return;
    }
    const staleDays = parseNonNegativeNumber(values["stale-days"], "--stale-days");
    const pruneAfterDays = parseNonNegativeNumber(
      values["prune-after-days"],
      "--prune-after-days",
    );
    if (values.prune && values.local) {
      throw new Error("--prune deletes remote branches and cannot be combined with --local.");
    }
    if (values.prune && !values["pull-requests"]) {
      throw new Error("--prune requires --pull-requests so open-PR branches stay protected.");
    }
    const pullRequests = values["pull-requests"]
      ? readPullRequests(values["pull-requests"])
      : [];
    const report = auditBranches({
      repo: path.resolve(values.repo),
      base: values.base,
      remote: values.remote,
      local: values.local,
      staleDays,
      pruneAfterDays,
      pullRequests,
    });
    if (values.prune) {
      report.pruned = pruneBranches({
        repo: path.resolve(values.repo),
        remote: values.remote,
        report,
      });
    }
    if (values.json) console.log(JSON.stringify(report, null, 2));
    else printHumanReport(report);
    if (values["fail-on-abandoned"] && report.summary.abandoned > 0) {
      process.exitCode = 1;
    }
    if (report.pruned?.some((entry) => !entry.deleted)) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printHelp();
    process.exitCode = error?.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION" ? 64 : 2;
  }
}

function readBranches(repo, {remote, local}) {
  const refNamespace = local ? "refs/heads" : `refs/remotes/${remote}`;
  const output = runGit(repo, [
    "for-each-ref",
    "--format=%(refname)%00%(refname:short)%00%(objectname)%00%(committerdate:unix)%00%(subject)",
    refNamespace,
  ]);
  return output
    .split("\n")
    .filter(Boolean)
    .map((row) => {
      const [fullName, shortName, objectName, committerUnix, subject = ""] = row.split("\0");
      if (!fullName || !shortName || !objectName || !/^\d+$/u.test(committerUnix)) {
        throw new Error(`Malformed git for-each-ref row: ${row}`);
      }
      return {
        fullName,
        shortName,
        branch: local
          ? shortName
          : shortName.replace(new RegExp(`^${escapeRegExp(remote)}/`, "u"), ""),
        objectName,
        committerUnix: Number(committerUnix),
        subject,
      };
    });
}

function readBaseTreeWitnesses(repo, baseCommit) {
  const output = runGit(repo, ["log", "--format=%T", baseCommit]);
  return new Set(output.split("\n").map((value) => value.trim()).filter(Boolean));
}

function readChangedPaths(repo, mergeBase, tipCommit) {
  const output = runGit(repo, [
    "diff",
    "--name-only",
    "-z",
    `${mergeBase}..${tipCommit}`,
  ]);
  return output.split("\0").filter(Boolean).sort(compareText);
}

function pathMatches(repo, baseCommit, tipCommit, filePath) {
  const result = spawnSync(
    "git",
    ["diff", "--quiet", baseCommit, tipCommit, "--", filePath],
    {cwd: repo, encoding: "utf8"},
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw gitError(result, ["diff", "--quiet", baseCommit, tipCommit, "--", filePath]);
}

function readAheadBehind(repo, baseCommit, tipCommit) {
  const output = runGit(repo, [
    "rev-list",
    "--left-right",
    "--count",
    `${baseCommit}...${tipCommit}`,
  ]).trim();
  const match = /^(\d+)\s+(\d+)$/u.exec(output);
  if (!match) throw new Error(`Malformed git rev-list count: ${output}`);
  return {left: Number(match[1]), right: Number(match[2])};
}

function resolveCommit(repo, ref) {
  return runGit(repo, ["rev-parse", "--verify", `${ref}^{commit}`]).trim();
}

function isAncestor(repo, ancestor, descendant) {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, descendant],
    {cwd: repo, encoding: "utf8"},
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw gitError(result, ["merge-base", "--is-ancestor", ancestor, descendant]);
}

function runGit(repo, args) {
  const result = spawnSync("git", args, {cwd: repo, encoding: "utf8"});
  if (result.status !== 0) throw gitError(result, args);
  return result.stdout;
}

function gitError(result, args) {
  const detail = (result.stderr || result.stdout || "git command failed").trim();
  return new Error(`git ${args.join(" ")} failed: ${detail}`);
}

function readPullRequests(filePath) {
  const document = JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
  if (!Array.isArray(document)) {
    throw new Error("--pull-requests must point to a JSON array.");
  }
  return document;
}

function publicPullRequest(pullRequest) {
  if (!pullRequest) return null;
  return {
    number: pullRequest.number ?? null,
    state: pullRequest.state ?? null,
    url: pullRequest.url ?? null,
  };
}

function parseNonNegativeNumber(value, option) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${option} must be a non-negative number.`);
  }
  return number;
}

function compareBranches(left, right) {
  const order = {abandoned: 0, recent: 1, active: 2, integrated: 3};
  return order[left.category] - order[right.category] || compareText(left.name, right.name);
}

function compareText(left, right) {
  return left.localeCompare(right, "en");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function printHumanReport(report) {
  const summary = report.summary;
  console.log(
    `Branches: ${summary.total}; active=${summary.active}; recent=${summary.recent}; ` +
      `integrated=${summary.integrated}; abandoned=${summary.abandoned}; ` +
      `safe-to-prune=${summary.safeToPrune}`,
  );
  for (const branch of report.branches.filter((entry) => entry.category !== "integrated")) {
    console.log(
      `${branch.category}\t${branch.name}\t${branch.ageDays}d\t` +
        `${branch.aheadOfBase} ahead\t${branch.proof}`,
    );
  }
  for (const entry of report.pruned ?? []) {
    console.log(
      `${entry.deleted ? "pruned" : "prune-failed"}\t${entry.name}\t${entry.proof}` +
        (entry.detail ? `\t${entry.detail}` : ""),
    );
  }
}

function printHelp() {
  console.log(`Usage: node tool/git/branch_hygiene.mjs [options]

Audits remote branches without mutating refs unless --prune is given. A branch
is safe to prune only when its tip is an ancestor of the base, its exact tree
exists in base history, an exact-tip pull request was merged into the base, or
every path changed by the branch has the same final Git identity in the base.
Heads and bases of open pull requests and GitHub merge-queue refs are never
safe to prune.

Options:
  --base <ref>                Base ref (default: origin/main)
  --remote <name>             Remote namespace (default: origin)
  --local                     Audit local branches instead of remote refs
  --repo <path>               Repository root
  --pull-requests <json>      gh pr list JSON used for PR state
  --stale-days <days>         Review window before abandonment (default: 7)
  --prune-after-days <days>   Minimum age for safe-to-prune output (default: 1)
  --fail-on-abandoned         Exit 1 when abandoned branches exist
  --prune                     Delete safe-to-prune remote branches, each only
                              while the remote still points at the audited tip
                              (requires --pull-requests; exit 1 if one fails)
  --json, -j                  Print the stable JSON report
  --help, -h                  Show this help`);
}

if (isCliEntrypoint) runCli();
