#!/usr/bin/env node
// Removes finished local worktrees: clean, idle checkouts whose HEAD already
// reached origin/main or is the exact head of a merged pull request. It is the
// backstop for sessions that end before their PR leaves the merge queue.
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {executeTaskCommand} from "./worktree_guard.mjs";

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_MIN_IDLE_HOURS = 6;
const MAIN_REF = "refs/remotes/origin/main";

export function sweepHelp() {
  return `Usage: node tool/git/sweep_merged_worktrees.mjs [--apply] [--min-idle-hours <n>] [--no-fetch] [--json]

Lists every linked worktree of this repository and removes (with --apply) the
ones that are finished:
  - HEAD is an ancestor of origin/main, or is the exact head of a merged PR;
  - no modified or untracked files (ignored files such as node_modules go with it);
  - not locked, not the primary checkout, no process has its cwd inside it;
  - no open PR for its branch;
  - idle for at least --min-idle-hours (default ${DEFAULT_MIN_IDLE_HOURS}).
Removal is a non-forced git worktree remove. A worktree guard claim for the
path is released first with finish --abandon. Branches, refs and stashes stay.
Without --apply it only reports.`;
}

// Pure decision for one worktree. Returns {action: "remove"|"keep", reason}.
export function classifyWorktree({
  primary = false,
  locked = false,
  missing = false,
  dirty = false,
  inUse = false,
  openPullRequest = false,
  ancestorOfMain = false,
  mergedPullRequest = null,
  idleHours = 0,
  minIdleHours = DEFAULT_MIN_IDLE_HOURS,
}) {
  if (primary) return {action: "keep", reason: "primary-checkout"};
  if (missing) return {action: "prune", reason: "directory-missing"};
  if (locked) return {action: "keep", reason: "locked"};
  if (dirty) return {action: "keep", reason: "uncommitted-changes"};
  if (inUse) return {action: "keep", reason: "process-running-inside"};
  if (openPullRequest) return {action: "keep", reason: "open-pull-request"};
  const merged = mergedPullRequest != null
    ? `merged-pr-${mergedPullRequest}`
    : ancestorOfMain ? "in-origin-main" : null;
  if (!merged) return {action: "keep", reason: "unmerged-commits"};
  if (idleHours < minIdleHours) return {action: "keep", reason: `recent-activity:${merged}`};
  return {action: "remove", reason: merged};
}

export function parseWorktreeList(porcelain) {
  const entries = [];
  let current = null;
  for (const line of `${porcelain}\n`.split("\n")) {
    if (line === "") {
      if (current) entries.push(current);
      current = null;
      continue;
    }
    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ");
    if (key === "worktree") current = {path: value, locked: false, prunable: false};
    else if (!current) continue;
    else if (key === "HEAD") current.head = value;
    else if (key === "branch") current.branch = value.replace(/^refs\/heads\//u, "");
    else if (key === "detached") current.branch = null;
    else if (key === "locked") current.locked = true;
    else if (key === "prunable") current.prunable = true;
  }
  return entries;
}

function git(args, cwd) {
  const out = spawnSync("git", args, {cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  return {ok: out.status === 0, stdout: (out.stdout ?? "").trim(), stderr: (out.stderr ?? "").trim()};
}

export function githubFromCli({cwd}) {
  const list = (state) => {
    const out = spawnSync("gh", ["pr", "list", "--state", state, "--limit", state === "open" ? "300" : "1000",
      "--json", "number,headRefName,headRefOid"], {cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
    if (out.status !== 0) return null;
    try { return JSON.parse(out.stdout); } catch { return null; }
  };
  const merged = list("merged");
  const open = list("open");
  return {
    available: merged != null && open != null,
    mergedByHead: new Map((merged ?? []).map((pr) => [pr.headRefOid, pr.number])),
    openBranches: new Set((open ?? []).map((pr) => pr.headRefName)),
  };
}

export function cwdsFromLsof() {
  const out = spawnSync("lsof", ["-a", "-d", "cwd", "-Fn"], {encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  if (out.error || out.stdout == null) return null;
  return out.stdout.split("\n").filter((l) => l.startsWith("n")).map((l) => l.slice(1));
}

function idleHoursFor(worktreePath, now) {
  const gitDir = git(["rev-parse", "--absolute-git-dir"], worktreePath);
  const candidates = gitDir.ok
    ? ["index", "HEAD", path.join("logs", "HEAD")].map((f) => path.join(gitDir.stdout, f))
    : [worktreePath];
  let latest = 0;
  for (const file of candidates) {
    try { latest = Math.max(latest, fs.statSync(file).mtimeMs); } catch { /* absent */ }
  }
  return latest === 0 ? Infinity : (now().getTime() - latest) / HOUR_MS;
}

function claimFileFor(commonDir, worktreePath) {
  const dir = path.join(commonDir, "catch-worktree-claims");
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith(".json")); } catch { return null; }
  for (const name of names) {
    try {
      const claim = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      if (path.resolve(claim.worktreePath ?? "") === path.resolve(worktreePath)) return claim;
    } catch { /* unreadable claim: leave it */ }
  }
  return null;
}

export function sweepWorktrees({
  cwd = process.cwd(),
  apply = false,
  fetch = true,
  minIdleHours = DEFAULT_MIN_IDLE_HOURS,
  now = () => new Date(),
  github = githubFromCli,
  processCwds = cwdsFromLsof,
} = {}) {
  const top = git(["rev-parse", "--show-toplevel"], cwd);
  if (!top.ok) throw new Error(`Not a Git repository: ${cwd}`);
  const commonDir = path.resolve(top.stdout, git(["rev-parse", "--git-common-dir"], top.stdout).stdout);
  if (fetch) git(["fetch", "--quiet", "origin", "main"], top.stdout);
  const mainSha = git(["rev-parse", "--verify", MAIN_REF], top.stdout);
  const gh = github({cwd: top.stdout});
  const cwds = processCwds();
  const entries = parseWorktreeList(git(["worktree", "list", "--porcelain"], top.stdout).stdout);
  const results = [];
  entries.forEach((entry, index) => {
    const missing = entry.prunable || !fs.existsSync(entry.path);
    const facts = {primary: index === 0, locked: entry.locked, missing, minIdleHours};
    if (!facts.primary && !missing) {
      facts.dirty = git(["status", "--porcelain"], entry.path).stdout !== "";
      const prefix = `${path.resolve(entry.path)}${path.sep}`;
      facts.inUse = cwds == null
        ? false
        : cwds.some((c) => c === path.resolve(entry.path) || c.startsWith(prefix));
      facts.openPullRequest = entry.branch != null && gh.openBranches.has(entry.branch);
      facts.ancestorOfMain = mainSha.ok && entry.head != null &&
        git(["merge-base", "--is-ancestor", entry.head, mainSha.stdout], top.stdout).ok;
      facts.mergedPullRequest = gh.mergedByHead.get(entry.head) ?? null;
      facts.idleHours = idleHoursFor(entry.path, now);
    }
    const decision = classifyWorktree(facts);
    const row = {path: entry.path, branch: entry.branch, head: entry.head, ...decision};
    if (apply && decision.action === "remove") {
      const claim = claimFileFor(commonDir, entry.path);
      if (claim) {
        try {
          executeTaskCommand({
            args: ["finish", "--worktree", entry.path, "--abandon",
              "--reason", `sweep: ${decision.reason}; head ${entry.head}`, "--by", "sweep_merged_worktrees"],
            cwd: top.stdout,
          });
        } catch (error) {
          row.outcome = "claim-release-failed";
          row.error = String(error?.message ?? error);
          results.push(row);
          return;
        }
      }
      const removed = git(["worktree", "remove", entry.path], top.stdout);
      row.outcome = removed.ok ? "removed" : "remove-failed";
      if (!removed.ok) row.error = removed.stderr;
    }
    results.push(row);
  });
  if (apply && results.some((r) => r.action === "prune")) git(["worktree", "prune"], top.stdout);
  return {
    apply,
    githubAvailable: gh.available,
    processCheck: cwds != null,
    mainSha: mainSha.ok ? mainSha.stdout : null,
    results,
  };
}

function parseArgs(argv) {
  const options = {apply: false, fetch: true, json: false, minIdleHours: DEFAULT_MIN_IDLE_HOURS};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--no-fetch") options.fetch = false;
    else if (arg === "--json") options.json = true;
    else if (arg === "--min-idle-hours") {
      options.minIdleHours = Number(argv[++i]);
      if (!Number.isFinite(options.minIdleHours) || options.minIdleHours < 0) {
        throw new Error("--min-idle-hours needs a non-negative number");
      }
    } else if (["help", "--help", "-h"].includes(arg)) options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function runCli() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); } catch (error) {
    console.error(`${error.message}\n\n${sweepHelp()}`);
    process.exit(2);
  }
  if (options.help) { console.log(sweepHelp()); return; }
  const report = sweepWorktrees(options);
  if (options.json) { console.log(JSON.stringify(report, null, 2)); return; }
  if (!report.githubAvailable) console.log("note: gh unavailable; only worktrees already in origin/main qualify");
  if (!report.processCheck) console.log("note: lsof unavailable; running processes were not checked");
  for (const r of report.results) {
    if (r.reason === "primary-checkout") continue;
    const outcome = r.outcome ?? (r.action === "remove" ? "would-remove" : r.action);
    console.log(`${outcome.padEnd(14)} ${r.reason.padEnd(28)} ${r.path}`);
  }
  const failed = report.results.filter((r) => r.outcome?.endsWith("failed"));
  for (const r of failed) console.error(`${r.path}: ${r.error}`);
  if (failed.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
