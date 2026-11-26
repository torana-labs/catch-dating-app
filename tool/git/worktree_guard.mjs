import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const TASK_ID = /^[a-z0-9][a-z0-9._-]{2,79}$/u;
const SHA_40 = /^[0-9a-f]{40}$/u;
// Disposable single-task branches; shared, main and backup branches are retained.
const disposableTaskBranch = /^(?:codex|claude)\/(?!backup\/)[^/].*$/u;
const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_TASK_BASE_REF = "refs/remotes/origin/main";

export class TaskUsageError extends Error {}

export function taskHelp() {
  return `Usage: node tool/git/worktree_guard.mjs <command> [options]

Commands:
  start   --task-id <id> --base-sha <40-char-sha> --paths <paths>
          [--branch <branch>] [--worktree <path>]
  doctor  [--worktree <path>]
  scope   --paths <additional-paths> [--worktree <path>]
  finish  [--worktree <path>] --retain --reason <blocker-and-next-action>
          | --abandon --reason <why> [--by <identity>]
  retire  --task-id <id> --worktree <path> --head-sha <40-char-sha>
          --accepted-sha <40-char-sha> [--by <owner> --clearance <evidence>]
          [--apply]
  stale   [--stale-days <days>]

The guard stores one disposable scope claim under Git's common directory for
each active worktree. Ordinary handoff retains its claim until retire succeeds.
finish requires an explicit retention reason; it does not complete retirement. Explicit
abandonment removes a clean worktree's claim and keeps a local record of who
abandoned it and why. The guard never installs dependencies, runs checks,
pushes branches or deletes refs/stale state. Retire reports first; --apply uses
only non-forced git worktree remove after Git checks and explicit owner
clearance. It is not deletion authority. Start is for new
tasks and requires --base-sha to match the locally fetched origin/main exactly.`;
}

export function executeTaskCommand({
  args,
  cwd,
  now = () => new Date(),
  runner = runGit,
} = {}) {
  const command = args?.[0] ?? "help";
  if (["help", "--help", "-h"].includes(command)) {
    return {status: 0, result: {operation: "help", help: taskHelp()}};
  }
  const options = parseTaskOptions(args.slice(1));
  if (command !== "retire" && ["headSha", "acceptedSha", "clearance", "apply"]
    .some((key) => options[key] != null)) {
    throw new TaskUsageError("Retirement options require the retire command.");
  }
  if (command !== "finish" && options.retain) {
    throw new TaskUsageError("--retain requires the finish command.");
  }
  const repository = resolveRepository({cwd, runner});
  if (command === "start") {
    return startTask({
      repository,
      options,
      now,
      runner,
    });
  }
  if (command === "doctor") {
    return doctorTask({
      repository,
      options,
      runner,
    });
  }
  if (command === "scope") {
    return extendTaskScope({
      repository,
      options,
      runner,
    });
  }
  if (command === "finish") {
    return finishTask({
      repository,
      options,
      now,
      runner,
    });
  }
  if (command === "retire") {
    return retireTask({repository, options, runner});
  }
  if (command === "stale") {
    return staleTasks({
      repository,
      options,
      now,
      runner,
    });
  }
  throw new TaskUsageError(`Unknown task command: ${command}`);
}

export function startTask({repository, options, now = () => new Date(), runner = runGit}) {
  const taskId = requireOption(options, "taskId", "--task-id");
  if (!TASK_ID.test(taskId)) {
    throw new TaskUsageError(
      "--task-id must be 3-80 lowercase letters, digits, dots, underscores, or hyphens.",
    );
  }
  const baseSha = requireOption(options, "baseSha", "--base-sha").toLowerCase();
  if (!SHA_40.test(baseSha)) {
    throw new TaskUsageError("--base-sha must be an exact 40-character commit SHA.");
  }
  const resolvedBase = gitText(repository.primaryRoot, [
    "rev-parse",
    "--verify",
    `${baseSha}^{commit}`,
  ], runner).trim().toLowerCase();
  if (resolvedBase !== baseSha) {
    throw new TaskUsageError(`--base-sha did not resolve exactly: ${baseSha}`);
  }
  const mainResult = runner({
    cwd: repository.primaryRoot,
    args: ["rev-parse", "--verify", `${NEW_TASK_BASE_REF}^{commit}`],
  });
  if (mainResult.status !== 0) {
    throw new TaskUsageError(
      "origin/main is unavailable. Fetch origin main before starting a new task.",
    );
  }
  const mainSha = mainResult.stdout.trim().toLowerCase();
  if (baseSha !== mainSha) {
    throw new TaskUsageError(
      `New task base ${baseSha} must match origin/main ${mainSha}. Fetch origin main and use its exact SHA; continue existing branch work in its existing worktree.`,
    );
  }
  // Exact creation base is insufficient when the launcher still contains old
  // operating rules/closeout code. Do not let a stale primary checkout create
  // more tasks using a lifecycle that has already been replaced on main.
  const launcher = runner({cwd: repository.currentRoot, args: ["diff", "--quiet",
    NEW_TASK_BASE_REF, "--", "AGENTS.md", "CLAUDE.md", "docs/agent_operating_model.md",
    "tool/git/worktree_guard.mjs", "tool/git/bootstrap_worktree.sh"]});
  if (launcher.status !== 0) {
    throw new TaskUsageError("Task launcher instructions/tooling differ from fetched origin/main. Preserve local work, fast-forward the primary main checkout when safe, and run start there; then reread AGENTS.md in the new worktree.");
  }
  const claimedPaths = normalizeClaimedPaths(options.paths);
  if (claimedPaths.length === 0) {
    throw new TaskUsageError("--paths must contain at least one repository path.");
  }
  const branch = options.branch ?? `codex/${taskId}`;
  const branchCheck = runner({
    cwd: repository.primaryRoot,
    args: ["check-ref-format", "--branch", branch],
  });
  if (branchCheck.status !== 0) {
    throw new TaskUsageError(`Invalid task branch: ${branch}`);
  }
  const worktreePath = path.resolve(
    options.worktree ?? path.join(repository.canonicalWorktreeRoot, taskId),
  );
  assertSafeWorktreeTarget({repository, worktreePath});
  if (fs.existsSync(worktreePath)) {
    throw new TaskUsageError(`Task worktree path already exists: ${worktreePath}`);
  }

  return withClaimsLock(repository, () => {
    const activeClaims = readClaims(repository);
    const overlap = activeClaims.find((claim) =>
      scopeSetsOverlap(claimedPaths, claim.claimedPaths));
    if (overlap != null) {
      throw new TaskUsageError(
        `Task scope overlaps ${overlap.taskId} at ${overlap.worktreePath}.`,
      );
    }

    const createdAt = now().toISOString();
    const claim = {
      taskId,
      baseSha,
      branch,
      worktreePath,
      claimedPaths,
      createdAt,
    };
    const claimPath = writeNewClaim(repository, claim);
    const added = runner({
      cwd: repository.primaryRoot,
      args: ["worktree", "add", "-b", branch, worktreePath, baseSha],
    });
    if (added.status !== 0) {
      const afterFailure = registeredWorktrees(repository, runner);
      if (
        !fs.existsSync(worktreePath) &&
        !afterFailure.some((record) => samePath(record.path, worktreePath))
      ) {
        fs.unlinkSync(claimPath);
      }
      throw new TaskUsageError(
        (added.stderr || added.stdout || "git worktree add failed").trim(),
      );
    }
    const actualHead = gitText(worktreePath, ["rev-parse", "HEAD"], runner).trim();
    if (actualHead !== baseSha) {
      throw new Error(`Created worktree is not at requested base ${baseSha}.`);
    }
    return {
      status: 0,
      result: {
        operation: "start",
        taskId,
        branch,
        baseSha,
        worktreePath,
        claimedPaths,
        claimPath,
      },
    };
  });
}

export function doctorTask({repository, options, runner = runGit}) {
  const worktreePath = path.resolve(options.worktree ?? repository.currentRoot);
  const claim = claimForWorktree(repository, worktreePath);
  const inspection = inspectClaim({repository, claim, runner});
  return {
    status: inspection.blockers.length === 0 ? 0 : 1,
    result: {operation: "doctor", ...inspection},
  };
}

export function extendTaskScope({repository, options, runner = runGit}) {
  if (Object.keys(options).some((key) => !["paths", "worktree"].includes(key))) {
    throw new TaskUsageError("scope accepts only --paths, --worktree, and --json.");
  }
  const additionalPaths = normalizeClaimedPaths(options.paths);
  if (additionalPaths.length === 0) {
    throw new TaskUsageError("--paths must contain at least one additional repository path.");
  }
  const worktreePath = path.resolve(options.worktree ?? repository.currentRoot);
  return withClaimsLock(repository, () => {
    const claim = claimForWorktree(repository, worktreePath);
    const inspection = inspectClaim({repository, claim, runner});
    const claimedPaths = normalizeClaimedPaths([...claim.claimedPaths, ...additionalPaths]);
    // Changed paths outside the claim (committed or dirty) are adopted only
    // when this request names them and no other live claim overlaps them, so
    // a session that edited before scoping can repair its claim with scope
    // alone. Every other inspection blocker still refuses.
    const blockingPaths = inspection.outOfScopePaths.filter((changedPath) =>
      !claimedPaths.some((claimedPath) => pathIsWithinScope(changedPath, claimedPath)));
    const blockers = inspection.blockers.filter((blocker) =>
      blocker !== "out_of_scope_changes" || blockingPaths.length > 0);
    if (blockers.length > 0) {
      return {status: 1, result: scopeResult({
        outcome: "refused",
        blockers,
        blockingPaths,
        inspection,
        note: blockingPaths.length > 0
          ? "Changed paths outside the claim are not covered by --paths. Name them in --paths to adopt them, or remove those changes."
          : "Resolve the blockers above; scope did not change the claim.",
      })};
    }
    for (const other of readClaims(repository)) {
      if (other.claimPath === claim.claimPath) continue;
      const overlapping = claimedPaths.filter((entry) =>
        scopeSetsOverlap([entry], other.claimedPaths));
      if (overlapping.length > 0) {
        throw new TaskUsageError(
          `Task scope overlaps ${other.taskId} at ${other.worktreePath}: ${overlapping.join(", ")}. scope did not change the claim.`,
        );
      }
    }
    const addedPaths = claimedPaths.filter((entry) => !claim.claimedPaths.includes(entry));
    if (addedPaths.length > 0) {
      const {claimPath, ...storedClaim} = claim;
      const temporaryPath = `${claimPath}.scope-${process.pid}.tmp`;
      const descriptor = fs.openSync(temporaryPath, "wx", 0o600);
      try {
        try {
          fs.writeFileSync(descriptor,
            `${JSON.stringify({...storedClaim, claimedPaths}, null, 2)}\n`, "utf8");
        } finally {
          fs.closeSync(descriptor);
        }
        fs.renameSync(temporaryPath, claimPath);
      } finally {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      }
    }
    const adoptedPaths = inspection.outOfScopePaths;
    const updated = adoptedPaths.length > 0
      ? inspectClaim({repository, claim: {...claim, claimedPaths}, runner})
      : {...inspection, claimedPaths};
    return {
      status: 0,
      result: scopeResult({
        outcome: addedPaths.length > 0 ? "extended" : "unchanged",
        blockers: updated.blockers,
        blockingPaths: [],
        inspection: updated,
        addedPaths,
        adoptedPaths,
      }),
    };
  });
}

// scope reports its own outcome first; the claim's inspection follows under
// claimStatus so a refusal never reads as "status": "claimed".
function scopeResult({outcome, blockers, blockingPaths, inspection, addedPaths = [],
  adoptedPaths = [], note}) {
  const claimDetails = {...inspection};
  delete claimDetails.status;
  delete claimDetails.blockers;
  return {
    operation: "scope",
    result: outcome,
    extended: addedPaths.length > 0,
    addedPaths,
    adoptedPaths,
    blockers,
    blockingPaths,
    ...(note == null ? {} : {note}),
    claimStatus: inspection.status,
    ...claimDetails,
  };
}

export function finishTask({
  repository,
  options,
  now = () => new Date(),
  runner = runGit,
}) {
  const worktreePath = path.resolve(options.worktree ?? repository.currentRoot);
  if (options.retain && options.abandon) throw new TaskUsageError("Choose --retain or --abandon, not both.");
  if (options.retain) requireRecordedValue(options.reason, "--reason", 500);
  return withClaimsLock(repository, () => {
    const claim = claimForWorktree(repository, worktreePath);
    const inspection = inspectClaim({repository, claim, runner});
    if (options.abandon === true) {
      return abandonClaim({repository, claim, inspection, options, now, runner});
    }
    if ((!options.retain && options.reason != null) || options.by != null) {
      throw new TaskUsageError("--reason requires --retain or --abandon; --by requires --abandon.");
    }
    const blockers = [...inspection.blockers];
    if (inspection.dirtyPaths.length > 0) blockers.push("uncommitted_changes");
    if (inspection.outOfScopePaths.length > 0) blockers.push("out_of_scope_changes");

    let upstream = null;
    let unpushedCommits = null;
    if (inspection.headSha != null && inspection.headSha !== claim.baseSha) {
      const upstreamResult = runner({
        cwd: claim.worktreePath,
        args: ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      });
      if (upstreamResult.status !== 0) {
        blockers.push("branch_has_no_upstream");
      } else {
        upstream = upstreamResult.stdout.trim();
        const count = runner({
          cwd: claim.worktreePath,
          args: ["rev-list", "--count", `${upstream}..HEAD`],
        });
        if (count.status !== 0 || !/^\d+$/u.test(count.stdout.trim())) {
          blockers.push("unpushed_commit_check_failed");
        } else {
          unpushedCommits = Number(count.stdout.trim());
          if (unpushedCommits > 0) blockers.push("unpushed_commits");
        }
      }
    }

    const uniqueBlockers = [...new Set(blockers)].sort();
    if (uniqueBlockers.length > 0) {
      return {
        status: 1,
        result: {
          operation: "finish",
          ...inspection,
          upstream,
          unpushedCommits,
          blockers: uniqueBlockers,
          finished: false,
        },
      };
    }
    if (!options.retain) {
      return {status: 1, result: {operation: "finish", ...inspection, upstream, unpushedCommits,
        finished: false, claimRetained: true, retired: false,
        blockers: ["closeout_disposition_required"],
        note: "Use retire after acceptance, or finish --retain --reason <blocker and next action>. Claim-only closeout would orphan the checkout."}};
    }
    const retainedAt = now().toISOString();
    return {
      status: 0,
      result: {
        operation: "finish",
        ...inspection,
        upstream,
        unpushedCommits,
        blockers: [],
        finished: false,
        readyForHandoff: true,
        claimRetained: true,
        retired: false,
        retainedAt,
        retainedReason: options.reason.trim(),
        note: "Handoff only. Worktree and original claim retained for accepted retirement; report the retention reason and next action.",
      },
    };
  });
}

// Retirement retains the existing claim until ordinary Git confirms removal.
// External acceptance/ownership cannot be inferred from Git: the task owner
// supplies current evidence after the manual review in the completion runbook.
/**
 * The live remote ref that holds the task's exact head: its own branch, or the
 * pull request head ref GitHub keeps after a merge queue deletes that branch.
 * Both are compared by exact SHA; a stale tracking ref proves nothing.
 */
function remoteRecoveryRef({repository, runner, branch, headSha}) {
  const own = runner({cwd: repository.primaryRoot,
    args: ["ls-remote", "--exit-code", "origin", `refs/heads/${branch}`]});
  if (own.status === 0 && own.stdout.trim() === `${headSha}\trefs/heads/${branch}`) return `refs/heads/${branch}`;
  const pulls = runner({cwd: repository.primaryRoot,
    args: ["ls-remote", "origin", "refs/pull/*/head"]});
  if (pulls.status !== 0) return null;
  for (const line of pulls.stdout.split("\n")) {
    const [sha, ref] = line.trim().split("\t");
    if (sha === headSha && /^refs\/pull\/[1-9][0-9]*\/head$/u.test(ref ?? "")) return ref;
  }
  return null;
}

export function retireTask({repository, options, runner = runGit}) {
  const allowed = ["paths", "taskId", "worktree", "headSha", "acceptedSha",
    "by", "clearance", "apply"];
  if (Object.keys(options).some((key) => !allowed.includes(key)) || options.paths.length > 0) {
    throw new TaskUsageError("retire accepts only the options listed in its help.");
  }
  const taskId = requireOption(options, "taskId", "--task-id");
  const worktreePath = path.resolve(requireOption(options, "worktree", "--worktree"));
  const headSha = requireOption(options, "headSha", "--head-sha");
  const acceptedSha = requireOption(options, "acceptedSha", "--accepted-sha");
  if (!TASK_ID.test(taskId) || !SHA_40.test(headSha) || !SHA_40.test(acceptedSha)) {
    throw new TaskUsageError("retire requires a valid task id and exact 40-character commit SHAs.");
  }
  if (!samePath(path.dirname(worktreePath), repository.canonicalWorktreeRoot)) {
    throw new TaskUsageError("retire requires a direct repository-owned task worktree.");
  }
  for (const entry of [path.dirname(repository.canonicalWorktreeRoot),
    repository.canonicalWorktreeRoot, worktreePath]) {
    let stat;
    try { stat = fs.lstatSync(entry); } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (stat != null && (stat.isSymbolicLink() || fs.realpathSync(entry) !== path.resolve(entry))) {
      throw new TaskUsageError(`Refusing nonphysical retirement path: ${entry}`);
    }
  }
  return withClaimsLock(repository, () => {
    const blockers = new Map();
    const block = (reason, nextAction) => blockers.set(reason, nextAction);
    const claims = readClaims(repository);
    const matches = claims.filter((claim) => samePath(claim.worktreePath, worktreePath));
    const records = registeredWorktrees(repository, runner);
    const record = records.find((entry) => samePath(entry.path, worktreePath));
    const present = fs.existsSync(worktreePath);
    const baseResult = {operation: "retire", taskId, worktreePath, headSha, acceptedSha,
      applied: options.apply === true, retired: false, accountableOwner: options.by ?? taskId,
      clearance: options.clearance ?? null, refsDeleted: false};
    const result = (extra = {}) => ({
      status: blockers.size === 0 ? 0 : 1,
      result: {...baseResult, ...extra, blockers: [...blockers.keys()].sort(),
        retention: [...blockers].map(([reason, nextAction]) => ({
          path: worktreePath, accountableOwner: baseResult.accountableOwner, reason, nextAction,
        }))},
    });
    // Absence is idempotent, not evidence that this command retired or shipped a task.
    if (matches.length === 0 && record == null && !present) {
      return result({disposition: "already_absent", note: "No removal performed; task acceptance is not established by absence."});
    }
    if (matches.length !== 1) {
      block("task_claim_unavailable", "Resolve the exact task's existing claim with its owner; do not recreate or release another owner's claim.");
      return result({disposition: "retained"});
    }
    const claim = matches[0];
    if (present && typeof process.getuid === "function" && fs.lstatSync(worktreePath).uid !== process.getuid()) {
      block("other_user_worktree", "Have the owning OS user handle this worktree; do not remove another user's checkout.");
    }
    if (claim.taskId !== taskId) block("task_identity_mismatch", `Use the owning task ${claim.taskId}; preserve its claim.`);
    if (!disposableTaskBranch.test(claim.branch)) {
      block("protected_branch", "Retain shared/main/recovery branches; use the task's disposable branch only.");
    }
    if (samePath(repository.currentRoot, worktreePath)) {
      block("retirement_from_target", "Run closeout from a different registered checkout after stopping this task's consumers.");
    }
    if (record?.locked) block("worktree_locked", "Have the owner resolve the Git worktree lock; do not force removal.");
    const overlappingClaims = claims.filter((other) => other.claimPath !== claim.claimPath &&
      scopeSetsOverlap(claim.claimedPaths, other.claimedPaths));
    if (overlappingClaims.length > 0) {
      block("other_active_claims", `Coordinate with ${overlappingClaims.map((other) => other.taskId).join(", ")} before closeout.`);
    }
    const inspection = inspectClaim({repository, claim, runner});
    for (const reason of inspection.blockers) block(reason, "Resolve doctor with the task owner while preserving this worktree and claim.");
    if (inspection.headSha !== headSha) block("head_changed", "Reinspect the current exact head and its accepted/recovery evidence; do not reuse this closure request.");
    const branchHead = runner({cwd: repository.primaryRoot,
      args: ["rev-parse", "--verify", `refs/heads/${claim.branch}^{commit}`]});
    if (branchHead.status !== 0 || branchHead.stdout.trim() !== headSha) {
      block("recovery_branch_changed", "Preserve and verify the exact local task branch before removing its worktree.");
    }
    const main = runner({cwd: repository.primaryRoot,
      args: ["rev-parse", "--verify", `${NEW_TASK_BASE_REF}^{commit}`]});
    const liveMain = runner({cwd: repository.primaryRoot,
      args: ["ls-remote", "--exit-code", "origin", "refs/heads/main"]});
    const mainSha = main.stdout.trim();
    if (main.status !== 0 || !SHA_40.test(mainSha) || liveMain.status !== 0 ||
      liveMain.stdout.trim() !== `${mainSha}\trefs/heads/main`) {
      block("main_not_current", "Fetch origin/main and repeat exact accepted-source verification; remote failure is not merge evidence.");
    }
    let equivalence = null;
    let mainDeltaCommits = null;
    let uniqueCommits = null;
    let recoveryRef = null;
    if (!blockers.has("main_not_current") && inspection.headSha === headSha) {
      const accepted = runner({cwd: repository.primaryRoot,
        args: ["merge-base", "--is-ancestor", acceptedSha, mainSha]});
      const incorporated = runner({cwd: repository.primaryRoot,
        args: ["merge-base", "--is-ancestor", headSha, acceptedSha]});
      if (accepted.status !== 0) {
        block("accepted_commit_not_on_main", "Verify the integrating commit on fetched origin/main before retirement.");
      } else if (incorporated.status === 0) {
        equivalence = "ancestor";
      } else {
        // Include additions, deletions, modes and both sides of renames; never
        // infer squash incorporation from a PR status, patch id, or subject.
        const changed = runner({cwd: repository.primaryRoot,
          args: ["diff", "--no-renames", "--name-only", "-z", inspection.scopeBaseSha, headSha]});
        const taskPaths = parseNulPaths(changed.stdout);
        if (changed.status !== 0 || taskPaths.length === 0) {
          block("squash_delta_unproven", "Retain the branch and review the complete task delta; an empty final diff does not prove its unique history was accepted.");
        } else {
          const equivalent = runner({cwd: repository.primaryRoot,
            args: ["diff", "--quiet", "--no-renames", headSha, acceptedSha, "--",
              ...taskPaths.map((entry) => `:(literal)${entry}`)]});
          if (equivalent.status === 0) {
            equivalence = "exact_task_paths";
          } else {
            const replay = replayOnAcceptedParent({repository, runner, headSha, acceptedSha, taskPaths});
            if (replay != null) {
              equivalence = "task_paths_plus_main";
              mainDeltaCommits = replay.mainDeltaCommits;
            } else {
              block("accepted_source_not_equivalent", "Have integration review every differing task path; preserve unique work and do not force retirement.");
            }
          }
        }
      }
      const unique = runner({cwd: repository.primaryRoot,
        args: ["rev-list", "--count", `${mainSha}..${headSha}`]});
      if (unique.status !== 0 || !/^\d+$/u.test(unique.stdout.trim())) {
        block("unique_commit_check_failed", "Verify every unique task commit and its recovery ref before retrying.");
      } else {
        uniqueCommits = Number(unique.stdout.trim());
        if (uniqueCommits > 0) {
          recoveryRef = remoteRecoveryRef({repository, runner, branch: claim.branch, headSha});
          if (recoveryRef == null) {
            block("unique_history_not_remotely_preserved", "Push and verify the exact task branch as recovery; a stale tracking ref or squash commit does not preserve its unique commits.");
          }
        }
      }
    }
    const stashes = runner({cwd: repository.primaryRoot, args: ["stash", "list", "--format=%H"]});
    if (stashes.status !== 0) block("stash_inspection_failed", "Inspect and preserve task recovery in the common Git store before retirement.");
    // Scan after remote queries, including ignored files that worktree remove
    // would otherwise silently discard. No broad clean or cache exemptions.
    let ignoredPaths = [];
    if (record != null && present) {
      const dirtyPaths = dirtyPathsAt(worktreePath, runner);
      if (dirtyPaths.length > 0) block("uncommitted_changes", `Preserve and resolve staged, unstaged and untracked files: ${dirtyPaths.join(", ")}.`);
      const ignored = runner({cwd: worktreePath,
        args: ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"]});
      ignoredPaths = parseNulPaths(ignored.stdout);
      if (ignored.status !== 0) block("ignored_file_scan_failed", "Verify all local files and recovery before removal.");
      else if (ignoredPaths.length > 0) block("ignored_files_require_preservation", "Review the listed ignored paths: preserve secrets, release artifacts and recovery; remove only verified regenerable dependencies/build caches after stopping their consumers, then rerun retire in this closeout. Do not release the claim or call the task retired.");
      const currentHead = runner({cwd: worktreePath, args: ["rev-parse", "HEAD"]});
      if (currentHead.status !== 0 || currentHead.stdout.trim() !== headSha) block("head_changed", "Reinspect the changed exact head before retrying closeout.");
      const currentBranch = runner({cwd: worktreePath, args: ["symbolic-ref", "--quiet", "--short", "HEAD"]});
      if (currentBranch.status !== 0 || currentBranch.stdout.trim() !== claim.branch) {
        block("branch_mismatch", "Reinspect changed task branch ownership before retrying closeout.");
      }
    }
    const hasClearance = [options.by, options.clearance].every((value) =>
      typeof value === "string" && value.trim() !== "" && value.length <= 1000 &&
      !/[\u0000-\u001f\u007f]/u.test(value));
    if (!hasClearance) {
      block("manual_clearance_required", "The task owner must provide --by and --clearance evidence for CI/release acceptance, current owners/cross-clone claims, other users/runtime consumers, recovery, and deletion authority. Preserve previously denied targets.");
    }
    const evidence = {branch: claim.branch, equivalence, mainDeltaCommits, uniqueCommits, ignoredPaths,
      retainedLocalRef: `refs/heads/${claim.branch}`, retainedRemoteRef: uniqueCommits > 0 ? recoveryRef : "refs/heads/main",
      retainedStashes: parseNulPaths(stashes.stdout.replaceAll("\n", "\0"))};
    if (blockers.size > 0) return result({...evidence, disposition: "retained"});
    if (options.apply !== true) return result({...evidence, disposition: "eligible", note: "Report only. --apply requires normal owner/queue deletion admission."});
    const removed = runner({cwd: repository.primaryRoot, args: ["worktree", "remove", worktreePath]});
    if (removed.status !== 0) {
      block("git_remove_refused", "Keep the claim and worktree; resolve this exact Git refusal with its owner. Do not force or retry a denied deletion through another route.");
      return result({...evidence, disposition: "retained", gitError: (removed.stderr || removed.stdout).trim()});
    }
    if (fs.existsSync(worktreePath) || registeredWorktrees(repository, runner).some((entry) => samePath(entry.path, worktreePath))) {
      block("removal_unverified", "Inspect exact path/registration and claim after this attempt; preserve recovery refs and do not repeat deletion blindly.");
      return result({...evidence, disposition: "unverified"});
    }
    fs.unlinkSync(claim.claimPath);
    return result({...evidence, disposition: "retired", retired: true,
      note: "Worktree and own claim removed. All branches/recovery/stashes retained; review eligible branch -d separately, never force squash-history deletion."});
  });
}

function abandonClaim({repository, claim, inspection, options, now, runner}) {
  const reason = requireRecordedValue(options.reason, "--reason", 500);
  const abandonedBy = options.by == null
    ? resolveGitIdentity({repository, claim, runner})
    : requireRecordedValue(options.by, "--by", 200);

  if (inspection.dirtyPaths.length > 0) {
    return {
      status: 1,
      result: {
        operation: "finish",
        ...inspection,
        blockers: ["uncommitted_changes"],
        finished: false,
        abandoned: false,
      },
    };
  }

  const abandonedAt = now().toISOString();
  const record = {
    schemaVersion: 1,
    taskId: claim.taskId,
    baseSha: claim.baseSha,
    headSha: inspection.headSha,
    branch: claim.branch,
    worktreePath: claim.worktreePath,
    claimedPaths: claim.claimedPaths,
    createdAt: claim.createdAt,
    abandonedAt,
    abandonedBy,
    reason,
    committedPaths: inspection.committedPaths,
    outOfScopePaths: inspection.outOfScopePaths,
    ignoredInspectionBlockers: inspection.blockers,
  };
  const abandonRecordPath = writeAbandonRecord(repository, record);
  fs.unlinkSync(claim.claimPath);
  return {
    status: 0,
    result: {
      operation: "finish",
      ...inspection,
      blockers: [],
      finished: true,
      abandoned: true,
      abandonedAt,
      abandonedBy,
      reason,
      abandonRecordPath,
      retired: false,
      note: "Clean claim abandoned, not retired. Preserve the retained path and recovery in the handoff; legacy cleanup requires owner review.",
    },
  };
}

export function staleTasks({repository, options, now = () => new Date(), runner = runGit}) {
  const staleDays = options.staleDays == null ? 7 : Number(options.staleDays);
  if (!Number.isInteger(staleDays) || staleDays < 0) {
    throw new TaskUsageError("--stale-days must be a non-negative integer.");
  }
  const threshold = now().getTime() - staleDays * DAY_MS;
  const records = registeredWorktrees(repository, runner);
  const claims = readClaims(repository);
  const candidates = [];
  for (const claim of claims) {
    const reasons = [];
    const live = claimIsLive(claim, records);
    if (!live) reasons.push("worktree_missing_or_unregistered");
    if (Date.parse(claim.createdAt) <= threshold) reasons.push("claim_older_than_threshold");
    if (reasons.length > 0) {
      candidates.push({
        taskId: claim.taskId,
        status: "claimed",
        worktreePath: claim.worktreePath,
        branch: claim.branch,
        createdAt: claim.createdAt,
        reasons: [...new Set(reasons)].sort(),
      });
    }
  }
  const claimedPaths = new Set(claims.map((claim) => path.resolve(claim.worktreePath)));
  for (const record of records) {
    const worktreePath = path.resolve(record.path);
    if (
      isInside(repository.canonicalWorktreeRoot, worktreePath) &&
      worktreePath !== repository.canonicalWorktreeRoot &&
      !claimedPaths.has(worktreePath)
    ) {
      candidates.push({
        taskId: null,
        status: "unclaimed",
        worktreePath,
        branch: record.branch,
        createdAt: null,
        reasons: ["registered_worktree_has_no_claim"],
      });
    }
  }
  candidates.sort((left, right) => left.worktreePath.localeCompare(right.worktreePath));
  return {
    status: 0,
    result: {
      operation: "stale",
      staleDays,
      candidates,
      deletionAuthorized: false,
      note: "Report only. Review and clean up with explicit Git commands.",
    },
  };
}

export function inspectClaim({repository, claim, runner = runGit}) {
  const blockers = [];
  const records = registeredWorktrees(repository, runner);
  const record = records.find((entry) => samePath(entry.path, claim.worktreePath));
  if (record == null) blockers.push("worktree_not_registered");
  if (!fs.existsSync(claim.worktreePath)) blockers.push("worktree_missing");
  let dirtyPaths = [];
  let committedPaths = [];
  let changedPaths = [];
  let outOfScopePaths = [];
  let scopeBaseSha = claim.baseSha;
  let headSha = null;
  let branch = null;
  if (record != null && fs.existsSync(claim.worktreePath)) {
    dirtyPaths = dirtyPathsAt(claim.worktreePath, runner);
    const head = runner({cwd: claim.worktreePath, args: ["rev-parse", "HEAD"]});
    if (head.status === 0) headSha = head.stdout.trim();
    else blockers.push("worktree_head_unavailable");
    if (headSha != null) {
      const ancestor = runner({
        cwd: claim.worktreePath,
        args: ["merge-base", "--is-ancestor", claim.baseSha, "HEAD"],
      });
      if (ancestor.status !== 0) blockers.push("base_not_ancestor_of_head");
      // A normal main merge can introduce paths owned by other tasks. Compare
      // unique work against the latest shared ancestor, while retaining the
      // original exact-base ancestry guard. Missing/rewritten main falls back
      // to the original scope window rather than hiding task changes.
      const shared = runner({cwd: claim.worktreePath,
        args: ["merge-base", "HEAD", "refs/remotes/origin/main"]});
      if (shared.status === 0 && SHA_40.test(shared.stdout.trim())) {
        const sharedSha = shared.stdout.trim();
        const containsBase = runner({cwd: claim.worktreePath,
          args: ["merge-base", "--is-ancestor", claim.baseSha, sharedSha]});
        if (containsBase.status === 0) scopeBaseSha = sharedSha;
      }
      const committed = runner({
        cwd: claim.worktreePath,
        args: ["diff", "--name-only", "-z", `${scopeBaseSha}..HEAD`],
      });
      if (committed.status === 0) {
        committedPaths = parseNulPaths(committed.stdout);
      } else {
        blockers.push("committed_change_scan_failed");
      }
    }
    changedPaths = [...new Set([...dirtyPaths, ...committedPaths])].sort();
    outOfScopePaths = changedPaths.filter((changedPath) =>
      !claim.claimedPaths.some((claimedPath) => pathIsWithinScope(changedPath, claimedPath)));
    const branchResult = runner({
      cwd: claim.worktreePath,
      args: ["symbolic-ref", "--quiet", "--short", "HEAD"],
    });
    if (branchResult.status === 0) branch = branchResult.stdout.trim();
    else blockers.push("worktree_detached");
    if (branch != null && branch !== claim.branch) blockers.push("branch_mismatch");
  }
  if (outOfScopePaths.length > 0) blockers.push("out_of_scope_changes");
  return {
    taskId: claim.taskId,
    status: "claimed",
    worktreePath: claim.worktreePath,
    branch,
    expectedBranch: claim.branch,
    baseSha: claim.baseSha,
    scopeBaseSha,
    headSha,
    claimedPaths: claim.claimedPaths,
    dirtyPaths,
    committedPaths,
    changedPaths,
    outOfScopePaths,
    dirty: dirtyPaths.length > 0,
    blockers: [...new Set(blockers)].sort(),
  };
}

export function normalizeClaimedPaths(values) {
  const normalized = [];
  for (const raw of values ?? []) {
    for (const part of String(raw).split(",")) {
      const value = part.trim().replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/+$/u, "");
      if (value === "") continue;
      if (
        value.startsWith("/") ||
        /^[A-Za-z]:/u.test(value) ||
        /[\u0000-\u001f*?\[\]]/u.test(value) ||
        value.split("/").some((segment) => ["", ".", "..", ".git"].includes(segment))
      ) {
        throw new TaskUsageError(`Claimed path must be explicit and repository-relative: ${part}`);
      }
      normalized.push(value);
    }
  }
  return [...new Set(normalized)].sort();
}

export function scopeSetsOverlap(left, right) {
  return left.some((leftPath) => right.some((rightPath) =>
    pathIsWithinScope(leftPath, rightPath) || pathIsWithinScope(rightPath, leftPath)));
}

export function parseWorktreePorcelain(source) {
  const records = [];
  let current = null;
  for (const line of String(source).split(/\r?\n/u)) {
    if (line === "") {
      if (current != null) records.push(current);
      current = null;
      continue;
    }
    if (line.startsWith("worktree ")) {
      if (current != null) records.push(current);
      current = {path: line.slice("worktree ".length), branch: null, detached: false};
      continue;
    }
    if (current == null) throw new TaskUsageError(`Malformed worktree record: ${line}`);
    if (line.startsWith("branch ")) {
      const branch = line.slice("branch ".length);
      current.branch = branch.startsWith("refs/heads/")
        ? branch.slice("refs/heads/".length)
        : branch;
    }
    else if (line === "detached") current.detached = true;
    else if (line === "locked" || line.startsWith("locked ")) current.locked = true;
    else if (line === "prunable" || line.startsWith("prunable ")) current.prunable = true;
  }
  if (current != null) records.push(current);
  return records;
}

function resolveRepository({cwd, runner}) {
  if (typeof cwd !== "string" || cwd === "") throw new TaskUsageError("Task cwd is required.");
  const currentRoot = gitText(cwd, ["rev-parse", "--show-toplevel"], runner).trim();
  const commonRaw = gitText(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"], runner).trim();
  const commonGitDir = path.resolve(commonRaw);
  if (!fs.existsSync(commonGitDir) || !fs.lstatSync(commonGitDir).isDirectory()) {
    throw new TaskUsageError(`Git common directory is unavailable: ${commonGitDir}`);
  }
  const primaryRoot = path.dirname(commonGitDir);
  const canonicalWorktreeRoot = path.join(primaryRoot, ".claude", "worktrees");
  const claimsRoot = path.join(commonGitDir, "catch-worktree-claims");
  return {currentRoot, primaryRoot, commonGitDir, canonicalWorktreeRoot, claimsRoot};
}

function parseTaskOptions(args) {
  const options = {paths: []};
  const values = new Map([
    ["--task-id", "taskId"],
    ["--base-sha", "baseSha"],
    ["--paths", "paths"],
    ["--branch", "branch"],
    ["--worktree", "worktree"],
    ["--stale-days", "staleDays"],
    ["--reason", "reason"],
    ["--by", "by"],
    ["--head-sha", "headSha"],
    ["--accepted-sha", "acceptedSha"],
    ["--clearance", "clearance"],
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") continue;
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg === "--abandon" || arg === "--retain") {
      options[arg.slice(2)] = true;
      continue;
    }
    const key = values.get(arg);
    if (key == null) throw new TaskUsageError(`Unknown task option: ${arg}`);
    const value = args[index + 1];
    if (value == null || value.startsWith("--")) {
      throw new TaskUsageError(`${arg} requires a value.`);
    }
    index += 1;
    if (key === "paths") options.paths.push(value);
    else options[key] = value;
  }
  return options;
}

function requireRecordedValue(value, flag, maxLength) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TaskUsageError(`${flag} is required for explicit retention or abandonment.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new TaskUsageError(
      `${flag} must be at most ${maxLength} characters without control characters.`,
    );
  }
  return normalized;
}

function resolveGitIdentity({repository, claim, runner}) {
  const cwd = fs.existsSync(claim.worktreePath)
    ? claim.worktreePath
    : repository.primaryRoot;
  for (const key of ["user.email", "user.name"]) {
    const result = runner({cwd, args: ["config", "--get", key]});
    if (result.status === 0 && result.stdout.trim() !== "") {
      return requireRecordedValue(result.stdout, `git config ${key}`, 200);
    }
  }
  throw new TaskUsageError(
    "--by is required when Git user.email and user.name are unavailable.",
  );
}

function requireOption(options, key, flag) {
  const value = options[key];
  if (typeof value !== "string" || value === "") {
    throw new TaskUsageError(`${flag} is required.`);
  }
  return value;
}

function assertSafeWorktreeTarget({repository, worktreePath}) {
  fs.mkdirSync(path.dirname(repository.canonicalWorktreeRoot), {recursive: true, mode: 0o700});
  for (const candidate of [path.dirname(repository.canonicalWorktreeRoot), repository.canonicalWorktreeRoot]) {
    if (fs.existsSync(candidate) && fs.lstatSync(candidate).isSymbolicLink()) {
      throw new TaskUsageError(`Refusing symlinked task root: ${candidate}`);
    }
  }
  fs.mkdirSync(repository.canonicalWorktreeRoot, {recursive: true, mode: 0o700});
  if (
    !samePath(path.dirname(worktreePath), repository.canonicalWorktreeRoot) ||
    path.basename(worktreePath) === "" ||
    fs.realpathSync(repository.canonicalWorktreeRoot) !==
      path.resolve(repository.canonicalWorktreeRoot)
  ) {
    throw new TaskUsageError(
      `Task worktrees must be direct physical children of ${repository.canonicalWorktreeRoot}.`,
    );
  }
}

function withClaimsLock(repository, callback) {
  ensureClaimsRoot(repository);
  const lockPath = path.join(repository.claimsRoot, ".start-finish.lock");
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new TaskUsageError(
        `Another task transition is active. If it crashed, inspect and remove ${lockPath}.`,
      );
    }
    throw error;
  }
  try {
    return callback();
  } finally {
    fs.closeSync(descriptor);
    fs.unlinkSync(lockPath);
  }
}

function ensureClaimsRoot(repository) {
  if (fs.existsSync(repository.claimsRoot) && fs.lstatSync(repository.claimsRoot).isSymbolicLink()) {
    throw new TaskUsageError(`Refusing symlinked claims directory: ${repository.claimsRoot}`);
  }
  fs.mkdirSync(repository.claimsRoot, {recursive: true, mode: 0o700});
}

function writeNewClaim(repository, claim) {
  ensureClaimsRoot(repository);
  const digest = createHash("sha256")
    .update(`${claim.taskId}\0${claim.worktreePath}`)
    .digest("hex")
    .slice(0, 24);
  const claimPath = path.join(repository.claimsRoot, `${digest}.json`);
  const descriptor = fs.openSync(claimPath, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(claim, null, 2)}\n`, "utf8");
  } finally {
    fs.closeSync(descriptor);
  }
  return claimPath;
}

function writeAbandonRecord(repository, record) {
  ensureClaimsRoot(repository);
  const recordsRoot = path.join(repository.claimsRoot, "abandoned");
  if (fs.existsSync(recordsRoot) && fs.lstatSync(recordsRoot).isSymbolicLink()) {
    throw new TaskUsageError(`Refusing symlinked abandonment directory: ${recordsRoot}`);
  }
  fs.mkdirSync(recordsRoot, {recursive: true, mode: 0o700});
  const digest = createHash("sha256")
    .update(`${record.taskId}\0${record.worktreePath}\0${record.abandonedAt}\0${record.reason}`)
    .digest("hex")
    .slice(0, 24);
  const recordPath = path.join(recordsRoot, `${digest}.json`);
  const descriptor = fs.openSync(recordPath, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  } finally {
    fs.closeSync(descriptor);
  }
  return recordPath;
}

function readClaims(repository) {
  if (!fs.existsSync(repository.claimsRoot)) return [];
  if (fs.lstatSync(repository.claimsRoot).isSymbolicLink()) {
    throw new TaskUsageError(`Refusing symlinked claims directory: ${repository.claimsRoot}`);
  }
  return fs.readdirSync(repository.claimsRoot)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const claimPath = path.join(repository.claimsRoot, name);
      const stat = fs.lstatSync(claimPath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new TaskUsageError(`Unsafe task claim: ${claimPath}`);
      }
      let claim;
      try {
        claim = JSON.parse(fs.readFileSync(claimPath, "utf8"));
      } catch {
        throw new TaskUsageError(`Invalid task claim JSON: ${claimPath}`);
      }
      validateClaim(claim, claimPath, repository);
      return {...claim, claimPath};
    });
}

function validateClaim(claim, claimPath, repository) {
  const expectedKeys = [
    "baseSha",
    "branch",
    "claimedPaths",
    "createdAt",
    "taskId",
    "worktreePath",
  ];
  if (
    claim == null ||
    Array.isArray(claim) ||
    Object.keys(claim).sort().join("\0") !== expectedKeys.join("\0") ||
    !TASK_ID.test(claim.taskId ?? "") ||
    !SHA_40.test(claim.baseSha ?? "") ||
    typeof claim.branch !== "string" || claim.branch === "" ||
    typeof claim.worktreePath !== "string" ||
    !samePath(path.dirname(claim.worktreePath), repository.canonicalWorktreeRoot) ||
    !Array.isArray(claim.claimedPaths) ||
    normalizeClaimedPaths(claim.claimedPaths).join("\0") !== claim.claimedPaths.join("\0") ||
    Number.isNaN(Date.parse(claim.createdAt))
  ) {
    throw new TaskUsageError(`Malformed task claim: ${claimPath}`);
  }
}

function claimForWorktree(repository, worktreePath) {
  const matches = readClaims(repository).filter((claim) => samePath(claim.worktreePath, worktreePath));
  if (matches.length === 0) {
    throw new TaskUsageError(`No task claim exists for worktree: ${worktreePath}`);
  }
  if (matches.length > 1) {
    throw new TaskUsageError(`Multiple task claims exist for ${worktreePath}.`);
  }
  return matches[0];
}

function registeredWorktrees(repository, runner) {
  return parseWorktreePorcelain(
    gitText(repository.primaryRoot, ["worktree", "list", "--porcelain"], runner),
  );
}

function claimIsLive(claim, records) {
  return fs.existsSync(claim.worktreePath) &&
    records.some((record) => samePath(record.path, claim.worktreePath));
}

function dirtyPathsAt(worktreePath, runner) {
  const commands = [
    ["diff", "--name-only", "-z"],
    ["diff", "--cached", "--name-only", "-z"],
    ["ls-files", "--others", "--exclude-standard", "-z"],
  ];
  const changed = new Set();
  for (const args of commands) {
    for (const value of parseNulPaths(gitText(worktreePath, args, runner))) changed.add(value);
  }
  return [...changed].sort();
}

/**
 * A squash that landed after other work reached main carries that work too.
 * Replay the task head onto the accepted commit's first parent (main just
 * before the squash) with a clean three-way merge. When that replay matches
 * the accepted commit on every task path, each line that differs from the task
 * head came from commits on the parent's side: ancestors of the accepted
 * commit that are not in the task branch. Any conflict, a missing parent, or
 * any task path that differs from the replay returns null, and the caller
 * keeps the worktree. Returns the parent-side commits that touched task paths.
 */
function replayOnAcceptedParent({repository, runner, headSha, acceptedSha, taskPaths}) {
  const cwd = repository.primaryRoot;
  const parent = runner({cwd, args: ["rev-parse", "--verify", `${acceptedSha}^1^{commit}`]});
  const parentSha = parent.stdout.trim();
  if (parent.status !== 0 || !SHA_40.test(parentSha)) return null;
  const merged = runner({cwd, args: ["merge-tree", "--write-tree", "--no-messages", parentSha, headSha]});
  const tree = merged.stdout.split("\n")[0].trim();
  if (merged.status !== 0 || !SHA_40.test(tree)) return null;
  const literal = taskPaths.map((entry) => `:(literal)${entry}`);
  const same = runner({cwd, args: ["diff", "--quiet", "--no-renames", tree, acceptedSha, "--", ...literal]});
  if (same.status !== 0) return null;
  const base = runner({cwd, args: ["merge-base", headSha, parentSha]});
  const baseSha = base.stdout.trim();
  if (base.status !== 0 || !SHA_40.test(baseSha)) return null;
  const commits = runner({cwd, args: ["rev-list", "--no-merges", `${baseSha}..${parentSha}`, "--", ...literal]});
  if (commits.status !== 0) return null;
  const mainDeltaCommits = commits.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  // No main-side change to a task path means the replay is the task head, so
  // a difference from it cannot be explained by main.
  return mainDeltaCommits.length > 0 ? {mainDeltaCommits} : null;
}

function parseNulPaths(source) {
  return String(source)
    .split("\0")
    .filter(Boolean)
    .map((value) => value.replaceAll("\\", "/"))
    .sort();
}

function pathIsWithinScope(candidate, scope) {
  return candidate === scope || candidate.startsWith(`${scope}/`);
}

function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function gitText(cwd, args, runner) {
  const result = runner({cwd, args});
  if (result.status !== 0) {
    throw new TaskUsageError(
      (result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim(),
    );
  }
  return result.stdout;
}

function runGit({cwd, args}) {
  const result = spawnSync("git", args, {cwd, encoding: "utf8", shell: false});
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function printResult(execution) {
  if (execution.result.operation === "help") {
    console.log(execution.result.help);
    return;
  }
  console.log(JSON.stringify(execution.result, null, 2));
}

function main() {
  try {
    const execution = executeTaskCommand({args: process.argv.slice(2), cwd: process.cwd()});
    printResult(execution);
    process.exitCode = execution.status;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof TaskUsageError) console.error(taskHelp());
    process.exitCode = 2;
  }
}

if (
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
