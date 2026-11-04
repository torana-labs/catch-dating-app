#!/usr/bin/env node
// Is the Firebase/GCP platform behind an environment serving at all?
//
// When a project's billing account is closed, Cloud Run stops serving every
// 2nd-gen Function (each callable answers Google's HTML "500 Server Error", not
// a callable JSON error) and every deploy fails with "requires billing to be
// enabled". That is not a defect in the commit being deployed, so a deploy or
// release run should defer, loudly, and leave no record that the commit was
// deployed: the next run after billing returns deploys the whole delta.
//
// This tool classifies two cheap, credential-free or metadata-only signals and
// never fails the job itself: it writes `available=true|false` and `reason` to
// $GITHUB_OUTPUT, a warning annotation and a step-summary line when the
// platform is down, and optionally a marker file that later steps and the
// release train read. Uncertain signals (network errors, odd statuses) count
// as available: the real deploy then fails on its own evidence.
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";

export const DEFAULT_REGION = "asia-south1";

/** Text Google's APIs and the gcloud CLI print when a project cannot be billed. */
export const BILLING_PATTERN =
  /requires billing to be enabled|billing (?:account )?(?:is |has been |was )?(?:disabled|closed|not enabled)|BILLING_DISABLED/iu;

/**
 * A callable that is serving answers JSON whatever the status (401 for an
 * unauthenticated probe, 400 for a bad payload). Google's front end answers a
 * non-JSON 5xx when the service behind the URL is not serving.
 */
export function classifyCallableResponse({status, contentType = "", body = ""}) {
  if (String(contentType).toLowerCase().includes("application/json")) {
    return {available: true, reason: `callable answered HTTP ${status} as JSON`};
  }
  if (BILLING_PATTERN.test(body)) {
    return {available: false, reason: "billing", detail: `HTTP ${status} says billing is disabled`};
  }
  if (status >= 500) {
    return {available: false, reason: "platform-5xx", detail: `HTTP ${status} without a callable JSON body`};
  }
  return {available: null, reason: `HTTP ${status} without a callable JSON body`};
}

/** A metadata-only gcloud listing: a billing refusal is the one signal read from it. */
export function classifyGcloudResult({status, stderr = "", stdout = ""}) {
  if (status === 0) return {available: true, reason: "gcloud listed the project's services"};
  const text = `${stderr}\n${stdout}`;
  const line = text.split("\n").find((candidate) => BILLING_PATTERN.test(candidate));
  if (line) return {available: false, reason: "billing", detail: line.trim().slice(0, 300)};
  return {available: null, reason: `gcloud exited ${status} without a billing message`};
}

/** The platform is unavailable when any signal says so; uncertainty is availability. */
export function decide(classifications) {
  const down = classifications.find((classification) => classification.available === false);
  if (down) return {available: false, reason: down.reason, detail: down.detail ?? null};
  return {available: true, reason: classifications.map((classification) => classification.reason).join("; ")};
}

export async function probeCallable({projectId, region = DEFAULT_REGION, callable, fetchImpl = fetch, timeoutMs = 15_000}) {
  const url = `https://${region}-${projectId}.cloudfunctions.net/${callable}`;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      redirect: "manual",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({data: {}}),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    return classifyCallableResponse({
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body,
    });
  } catch (error) {
    return {available: null, reason: `probe of ${callable} failed: ${error?.message ?? String(error)}`};
  }
}

export function probeGcloud({projectId, region = DEFAULT_REGION, run = spawnSync}) {
  const result = run("gcloud", ["run", "services", "list", "--project", projectId, "--region", region,
    "--limit", "1", "--format", "json", "--quiet"], {encoding: "utf8"});
  if (result.error) return {available: null, reason: `gcloud could not run: ${result.error.message}`};
  return classifyGcloudResult({status: result.status, stderr: result.stderr ?? "", stdout: result.stdout ?? ""});
}

export async function checkPlatformAvailability({projectId, region = DEFAULT_REGION, callable, gcloudProbe = false,
  fetchImpl = fetch, run = spawnSync}) {
  const classifications = [await probeCallable({projectId, region, callable, fetchImpl})];
  if (gcloudProbe) classifications.push(probeGcloud({projectId, region, run}));
  return decide(classifications);
}

/** Writes the outputs, the warning and the marker; returns the lines it printed. */
export function report({decision, projectId, outputPath, summaryPath, markerPath, log = console.log, now = () => new Date()}) {
  const lines = [];
  if (outputPath) {
    fs.appendFileSync(outputPath, `available=${decision.available}\nreason=${decision.reason}\n`);
  }
  if (decision.available) {
    lines.push(`Platform is serving ${projectId}: ${decision.reason}.`);
  } else {
    const detail = decision.detail ? ` (${decision.detail})` : "";
    const message = `Deferred: the platform behind ${projectId} is not serving (${decision.reason})${detail}. ` +
      "Nothing is deployed or recorded by this run; the next run after the project serves again deploys the whole delta.";
    lines.push(`::warning title=Deploy deferred: ${projectId} is not serving::${message}`);
    if (summaryPath) fs.appendFileSync(summaryPath, `## Deploy deferred: ${projectId} is not serving\n\n${message}\n`);
    if (markerPath) {
      fs.mkdirSync(path.dirname(markerPath), {recursive: true});
      fs.writeFileSync(markerPath, `${JSON.stringify({
        deferred: true, projectId, reason: decision.reason, detail: decision.detail, checkedAt: now().toISOString(),
      }, null, 2)}\n`);
    }
  }
  for (const line of lines) log(line);
  return lines;
}

export function parseArgs(argv) {
  const values = {region: DEFAULT_REGION, gcloudProbe: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      index += 1;
      return value;
    };
    if (arg === "--env") values.env = next();
    else if (arg === "--project") values.project = next();
    else if (arg === "--region") values.region = next();
    else if (arg === "--callable") values.callable = next();
    else if (arg === "--deferred-marker") values.markerPath = next();
    else if (arg === "--gcloud-probe") values.gcloudProbe = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!values.callable) throw new Error("--callable <exportName> is required");
  if (!values.env && !values.project) throw new Error("--env <alias> or --project <id> is required");
  return values;
}

async function main(argv) {
  let values;
  try {
    values = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error("Usage: node tool/firebase/check_platform_availability.mjs (--env <alias> | --project <id>) " +
      "--callable <exportName> [--region <region>] [--gcloud-probe] [--deferred-marker <path>]");
    process.exit(64);
  }
  const projectId = values.project ?? resolveFirebaseProjectId({env: values.env, firebaseRcPath: fromRepo(".firebaserc")});
  const decision = await checkPlatformAvailability({
    projectId, region: values.region, callable: values.callable, gcloudProbe: values.gcloudProbe,
  });
  report({
    decision, projectId,
    outputPath: process.env.GITHUB_OUTPUT,
    summaryPath: process.env.GITHUB_STEP_SUMMARY,
    markerPath: values.markerPath,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
