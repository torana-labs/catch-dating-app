#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {setTimeout as sleep} from "node:timers/promises";

import {fromRepo} from "../lib/repo_paths.mjs";
import {probeCallable} from
  "../firebase/check_client_callable_dependencies.mjs";
import {resolveFirebaseProjectId} from
  "../lib/firebase_project.mjs";

export function validateAdminLiveDataSources({
  contract,
  appSource,
  apiSource,
  functionsIndexSource,
  featureFiles,
  retainedOperationalSnapshots = [],
}) {
  const violations = [];
  const routes = Array.isArray(contract?.routes) ? contract.routes : [];
  if (contract?.schemaVersion !== 1) {
    violations.push("contract: schemaVersion must be 1");
  }
  const routeIds = new Set();
  const coveredNavIds = new Set();
  for (const route of routes) {
    if (!route?.routeId || routeIds.has(route.routeId)) {
      violations.push(`contract: duplicate or missing routeId ${route?.routeId}`);
      continue;
    }
    routeIds.add(route.routeId);
    if (!route.navId) violations.push(`${route.routeId}: navId is required`);
    else coveredNavIds.add(route.navId);
    if (!Array.isArray(route.paths) || route.paths.length === 0) {
      violations.push(`${route.routeId}: at least one path is required`);
    }
    if (!Array.isArray(route.liveReads) || route.liveReads.length === 0) {
      violations.push(`${route.routeId}: at least one live read is required`);
    }
    for (const callable of [
      ...(route.liveReads ?? []),
      ...(route.liveMutations ?? []),
    ]) {
      if (!apiSource.includes(`"${callable}"`)) {
        violations.push(`${route.routeId}: ${callable} is absent from adminApi`);
      }
      if (!functionsIndexSource.includes(callable)) {
        violations.push(
          `${route.routeId}: ${callable} is absent from Functions exports`
        );
      }
    }
  }

  for (const navId of navigationIds(appSource)) {
    if (!coveredNavIds.has(navId)) {
      violations.push(`admin navigation: ${navId} has no live data contract`);
    }
  }
  for (const requiredRoute of [
    "event-intake",
    "organizer-intake",
    "intake-operations",
  ]) {
    if (!routeIds.has(requiredRoute)) {
      violations.push(`contract: missing Intake route ${requiredRoute}`);
    }
  }

  for (const file of featureFiles) {
    if (
      /(?:from\s+|import\()["'][^"']*generated\/[^"']+\.json(?:\?url)?["']/u
        .test(file.source)
    ) {
      violations.push(
        `${file.path}: production feature imports generated operational JSON`
      );
    }
  }
  for (const snapshot of retainedOperationalSnapshots) {
    violations.push(
      `${snapshot}: operational snapshots must be stored in Firestore, not retained in the repository`
    );
  }
  return violations;
}

export async function verifyAdminCallableReachability({
  contract,
  projectId,
  region = "asia-south1",
  probe = probeCallable,
}) {
  const callables = Array.from(new Set(
    contract.routes.flatMap((route) => [
      ...(route.liveReads ?? []),
      ...(route.liveMutations ?? []),
    ])
  )).sort();
  const results = await Promise.allSettled(callables.map(async (callable) => ({
    callable,
    result: await probe({projectId, region, callable}),
  })));
  const failures = [];
  const reachable = [];
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (result.status === "fulfilled") {
      reachable.push(result.value);
      continue;
    }
    failures.push({
      callable: callables[index],
      message: result.reason instanceof Error ?
        result.reason.message : String(result.reason),
    });
  }
  return {callables, reachable, failures};
}

function navigationIds(source) {
  const block = source.match(
    /const navigation:[\s\S]*?const navRoles\b/u
  )?.[0] ?? "";
  return new Set(
    Array.from(block.matchAll(
      /\{id:\s*"([^"]+)",\s*label:\s*"[^"]+",\s*icon:/gu
    ))
      .map((match) => match[1])
  );
}

function collectFeatureFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFeatureFiles(absolute));
      continue;
    }
    if (!/\.(?:ts|tsx)$/u.test(entry.name) ||
        /\.(?:test|stories)\.(?:ts|tsx)$/u.test(entry.name)) {
      continue;
    }
    files.push({
      path: path.relative(fromRepo("."), absolute).split(path.sep).join("/"),
      source: fs.readFileSync(absolute, "utf8"),
    });
  }
  return files;
}

function collectOperationalJson(roots) {
  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
      const absolute = path.join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectOperationalJson([absolute]));
      } else if (entry.name.endsWith(".json")) {
        files.push(
          path.relative(fromRepo("."), absolute).split(path.sep).join("/")
        );
      }
    }
  }
  return files;
}

/**
 * A merge that adds a callable starts this check and Deploy backend together,
 * so the callable 404s until that deploy reaches prod. Keep checking while a
 * deploy is running; with none running, a failure is final.
 */
export async function verifyWhileBackendDeploys({
  verify,
  backendDeployRunning,
  wait = () => sleep(60_000),
  log = () => {},
}) {
  let live = await verify();
  while (live.failures.length > 0 && backendDeployRunning()) {
    log(`${live.failures.length} callable(s) not live; Deploy backend is running, checking again in a minute.`);
    await wait();
    live = await verify();
  }
  return live;
}

function backendDeployIsRunning() {
  const result = spawnSync("gh", ["run", "list", "--repo", process.env.GITHUB_REPOSITORY ?? "",
    "--workflow", "backend-deploy.yml", "--branch", "main", "--limit", "20",
    "--json", "status", "--jq", "[.[] | select(.status != \"completed\")] | length"], {encoding: "utf8"});
  return result.status === 0 && Number(result.stdout.trim()) > 0;
}

function parseArgs(argv) {
  const values = {};
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--check", "--summary", "--verify-live", "--wait-for-backend-deploy"].includes(arg)) {
      flags.add(arg);
      continue;
    }
    if (["--environment", "--project"].includes(arg)) {
      values[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return {values, flags};
}

async function main(argv) {
  const {values, flags} = parseArgs(argv);
  const unknown = argv.filter((arg) => ![
    "--check",
    "--summary",
    "--verify-live",
    "--wait-for-backend-deploy",
    "--environment",
    "--project",
    values.environment,
    values.project,
  ].includes(arg));
  if (unknown.length > 0) {
    console.error(`Unknown argument: ${unknown[0]}`);
    process.exit(64);
  }
  const contract = JSON.parse(fs.readFileSync(fromRepo(
    "contracts/admin/admin_live_data_sources.json"
  ), "utf8"));
  const violations = validateAdminLiveDataSources({
    contract,
    appSource: fs.readFileSync(fromRepo("admin/src/app/App.tsx"), "utf8"),
    apiSource: fs.readFileSync(
      fromRepo("admin/src/shared/api/adminApi.ts"),
      "utf8"
    ),
    functionsIndexSource: fs.readFileSync(
      fromRepo("functions/src/index.ts"),
      "utf8"
    ),
    featureFiles: collectFeatureFiles(fromRepo("admin/src/features")),
    retainedOperationalSnapshots: [
      "admin/src/features/intake/organizer/generated/organizerIntakeBridge.json",
      "admin/src/generated/eventIntakeBridge.json",
      "admin/src/generated/externalEventImportExecutionPlan.json",
      "admin/src/generated/externalEventImportPlan.json",
      "admin/src/generated/marketingOpsBridge.json",
      "operations/launch/pilot_supply_shortlist.json",
    ].filter((file) => fs.existsSync(fromRepo(file))).concat(
      collectOperationalJson([fromRepo("operations/launch")]),
    ),
  });
  if (violations.length > 0) {
    console.error("Admin live-data source violations:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  if (flags.has("--verify-live")) {
    const environment = values.environment;
    const projectId = values.project ?? (environment ?
      resolveFirebaseProjectId({
        env: environment,
        firebaseRcPath: fromRepo(".firebaserc"),
      }) :
      null);
    if (!projectId) {
      throw new Error(
        "--verify-live requires --environment <alias> or --project <id>."
      );
    }
    const verify = () => verifyAdminCallableReachability({contract, projectId});
    const live = flags.has("--wait-for-backend-deploy") ?
      await verifyWhileBackendDeploys({
        verify,
        backendDeployRunning: backendDeployIsRunning,
        log: (message) => console.log(message),
      }) :
      await verify();
    if (live.failures.length > 0) {
      console.error(
        `Admin live callable failures in ${projectId}/asia-south1:`
      );
      for (const failure of live.failures) {
        console.error(`- ${failure.callable}: ${failure.message}`);
      }
      process.exit(1);
    }
    if (flags.has("--summary")) {
      console.log(
        `Admin live callable check passed: ${live.reachable.length} reachable in ${projectId}/asia-south1.`
      );
    }
  }
  if (flags.has("--summary")) {
    console.log(
      `Admin live-data source check passed: ${contract.routes.length} routes; operational state is Firestore-only.`
    );
  }
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
