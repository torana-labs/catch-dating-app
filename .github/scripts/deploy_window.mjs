// Holds a pull request or merge group that changes how the Functions backend
// is packaged or deployed until 24 hours before the next full-deploy window.
// The full Functions suite deploys at most once every 7 days (prod's last
// large deploy, recorded on its newest successful deploy:backend GitHub
// deployment as payload.largeDeployAt, else that deployment's creation time),
// so pipeline changes wait and land together just before that point. No
// label, input or variable bypasses this.
// Docs: docs/release_operations.md, "Deploy backend".
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {parseArgs} from "node:util";

export const PIPELINE_FILES = [
  ".github/workflows/_backend-deploy.yml",
  ".github/workflows/backend-deploy.yml",
  "functions/scripts/build-deploy-codebases.cjs",
  "functions/deploy-codebases.json",
  "functions/package.json",
  "functions/package-lock.json",
  "firebase.json",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The changed files that change the deploy pipeline, in list order. */
export function heldFiles(files) {
  const changed = new Set(files);
  return PIPELINE_FILES.filter((file) => changed.has(file));
}

/** A time as people in the team read it, e.g. "13 Nov 2026 18:45 IST". */
export function istLabel(iso) {
  const at = new Date(Date.parse(iso) + 330 * 60 * 1000);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][at.getUTCMonth()];
  const pad = (n) => String(n).padStart(2, "0");
  return `${at.getUTCDate()} ${month} ${at.getUTCFullYear()} ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} IST`;
}

/** When the last large deploy happened, from a deployment as the API returns it. */
export function lastLargeDeploy(deployment) {
  let payload = deployment?.payload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }
  if (typeof payload === "string") return lastLargeDeploy({...deployment, payload});
  const recorded = payload?.largeDeployAt;
  if (typeof recorded === "string" && Number.isFinite(Date.parse(recorded))) return recorded;
  if (typeof deployment?.created_at === "string" && Number.isFinite(Date.parse(deployment.created_at))) {
    return deployment.created_at;
  }
  throw new Error("The newest successful prod deployment has neither largeDeployAt nor a creation time.");
}

/**
 * Whether these changed files may merge now. Files outside the pipeline list
 * always pass; pipeline files pass from 24 hours before the window opens.
 * With no recorded deploy the window is open.
 */
export function decide({files, lastLarge, now, windowDays = 7, leadHours = 24}) {
  const held = heldFiles(files);
  if (lastLarge === null) return {held, pass: true, windowOpensAt: null, mergeFrom: null};
  const windowOpensAt = new Date(Date.parse(lastLarge) + windowDays * DAY_MS).toISOString();
  const mergeFrom = new Date(Date.parse(windowOpensAt) - leadHours * 60 * 60 * 1000).toISOString();
  const nowTime = Date.parse(now);
  if (!Number.isFinite(nowTime)) throw new Error(`now is not a time: ${now}`);
  return {held, pass: held.length === 0 || nowTime >= Date.parse(mergeFrom), windowOpensAt, mergeFrom};
}

export function message(decision) {
  if (decision.held.length === 0) return "No deploy pipeline file changes; nothing to hold.";
  const files = decision.held.map((file) => `  - ${file}`).join("\n");
  if (decision.pass) {
    return `Deploy pipeline files change, inside the merge window${decision.windowOpensAt ?
      ` (the full-deploy window opens ${istLabel(decision.windowOpensAt)})` : ""}:\n${files}`;
  }
  return "The full Functions suite deploys at most once every 7 days, so changes to its deploy pipeline " +
    `wait for that point. These files may merge from ${istLabel(decision.mergeFrom)} ` +
    `(${decision.mergeFrom}), 24 hours before the window opens at ${istLabel(decision.windowOpensAt)}:\n${files}`;
}

const gh = (...args) => execFileSync("gh", ["api", ...args], {encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
const lines = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean);

function changedFiles({event, repo, pr, base, head}) {
  if (event === "pull_request") {
    if (!/^[1-9][0-9]*$/u.test(pr ?? "")) throw new Error("A pull_request check needs --pr <number>.");
    return lines(gh(`repos/${repo}/pulls/${pr}/files?per_page=100`, "--paginate", "-q", ".[].filename"));
  }
  if (!/^[0-9a-f]{40}$/u.test(base ?? "") || !/^[0-9a-f]{40}$/u.test(head ?? "")) {
    throw new Error("A merge_group check needs --base and --head commit SHAs.");
  }
  return lines(gh(`repos/${repo}/compare/${base}...${head}?per_page=100`, "--paginate", "-q", ".files[].filename"));
}

// The newest deploy:backend deployment with a success status, as the deploy
// workflow's own guard finds it. GitHub marks a deployment inactive once a
// later one in the environment finishes, so any success status counts. Every
// API failure stops the check.
function newestSuccessfulDeployment(repo) {
  for (let page = 1; ; page += 1) {
    const ids = lines(gh(`repos/${repo}/deployments?environment=prod&task=deploy:backend&per_page=100&page=${page}`,
      "-q", ".[].id"));
    if (ids.length === 0) return null;
    for (const id of ids) {
      const delivered = gh(`repos/${repo}/deployments/${id}/statuses?per_page=100`, "-q",
        "any(.[]; .state == \"success\")").trim();
      if (delivered === "true") return JSON.parse(gh(`repos/${repo}/deployments/${id}`));
    }
  }
}

function main() {
  const {values} = parseArgs({options: {
    event: {type: "string", default: ""}, pr: {type: "string", default: ""},
    base: {type: "string", default: ""}, head: {type: "string", default: ""},
    repo: {type: "string", default: process.env.GITHUB_REPOSITORY || "{owner}/{repo}"},
    now: {type: "string"},
  }});
  if (values.event !== "pull_request" && values.event !== "merge_group") {
    process.stdout.write(`No hold for a ${values.event || "local"} run.\n`);
    return;
  }
  const files = changedFiles(values);
  if (heldFiles(files).length === 0) {
    process.stdout.write(`${message({held: []})}\n`);
    return;
  }
  const deployment = newestSuccessfulDeployment(values.repo);
  const decision = decide({files, lastLarge: deployment === null ? null : lastLargeDeploy(deployment),
    now: values.now ?? new Date().toISOString()});
  if (decision.pass) {
    process.stdout.write(`${message(decision)}\n`);
    return;
  }
  process.stderr.write(`::error::${message(decision).replaceAll("\n", "%0A")}\n${message(decision)}\n`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
