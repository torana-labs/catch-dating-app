#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {fromRepo} from "../lib/repo_paths.mjs";

const expectedTables = [
  "mart_user_analytics_daily",
  "user_profile_exposure_events",
];

const expectedFunctions = [
  "getUserAnalytics",
  "adminGetUserAnalytics",
];

const defaultScheduleDisplayName = "Catch user analytics daily mart refresh";

const args = parseArgs(process.argv.slice(2));
const projectId = args.projectId ?? resolveProjectId(args.env);
const status = {
  projectId,
  dataset: "catch_user_analytics",
  location: args.location,
  scheduleDisplayName: args.scheduleDisplayName,
  checks: {},
  missing: [],
  warnings: [],
};

checkBigQueryDatasetAndTables();
checkScheduledQuery();
checkFunctions();

const ok = status.missing.length === 0;
if (args.json) {
  console.log(JSON.stringify({...status, ok}, null, 2));
} else {
  printHumanStatus(ok);
}

process.exit(ok ? 0 : 1);

function checkBigQueryDatasetAndTables() {
  const result = run("bq", [
    `--project_id=${projectId}`,
    "--format=json",
    "ls",
    status.dataset,
  ]);

  if (result.exitCode !== 0) {
    status.checks.bigQuery = {
      ok: false,
      datasetExists: false,
      tables: [],
      error: conciseError(result),
    };
    missing("bigquery.dataset", `Missing BigQuery dataset ${status.dataset}.`);
    return;
  }

  const parsed = parseJson(result.stdout, []);
  const tableIds = parsed
    .map((entry) => entry?.tableReference?.tableId)
    .filter((value) => typeof value === "string")
    .sort();
  const missingTables = expectedTables.filter((table) =>
    !tableIds.includes(table)
  );
  status.checks.bigQuery = {
    ok: missingTables.length === 0,
    datasetExists: true,
    tables: tableIds,
    missingTables,
  };
  for (const table of missingTables) {
    missing("bigquery.table", `Missing BigQuery table ${status.dataset}.${table}.`);
  }
  if (missingTables.length === 0) {
    checkMartRows();
  }
}

function checkMartRows() {
  const result = run("bq", [
    `--project_id=${projectId}`,
    "--location",
    args.location,
    "--format=json",
    "query",
    "--use_legacy_sql=false",
    martStatusSql(),
  ]);

  if (result.exitCode !== 0) {
    status.checks.martRows = {
      ok: false,
      error: conciseError(result),
    };
    missing("bigquery.mart_query", "Unable to query user analytics mart rows.");
    return;
  }

  const parsed = parseJson(result.stdout, []);
  const row = parsed[0] ?? {};
  const rowCount = numberValue(row.row_count);
  const maxRefreshedAt = typeof row.max_refreshed_at === "string" ?
    row.max_refreshed_at :
    null;
  status.checks.martRows = {
    ok: rowCount > 0,
    rowCount,
    maxRefreshedAt,
  };

  if (rowCount <= 0) {
    missing(
      "bigquery.mart_rows",
      "User analytics mart exists but has no rows yet.",
    );
  }
}

function martStatusSql() {
  return `
SELECT
  COUNT(1) AS row_count,
  CAST(MAX(refreshed_at) AS STRING) AS max_refreshed_at
FROM \`${projectId}.${status.dataset}.mart_user_analytics_daily\``;
}

function checkScheduledQuery() {
  const result = run("bq", [
    `--project_id=${projectId}`,
    "--format=json",
    "ls",
    "--transfer_config",
    `--transfer_location=${args.location}`,
  ]);

  if (result.exitCode !== 0) {
    status.checks.schedule = {
      ok: false,
      matches: [],
      error: conciseError(result),
    };
    missing("bigquery.schedule", "Unable to inspect BigQuery scheduled queries.");
    return;
  }

  const configs = parseJson(result.stdout, []);
  const matches = configs.filter((config) =>
    config?.displayName === args.scheduleDisplayName &&
    config?.dataSourceId === "scheduled_query"
  );
  const failedMatches = matches.filter((config) => config?.state === "FAILED");
  status.checks.schedule = {
    ok: matches.length === 1 && failedMatches.length === 0,
    matches: matches.map((config) => ({
      name: config.name ?? config.transferConfigName ?? null,
      displayName: config.displayName,
      state: config.state ?? null,
    })),
  };

  if (matches.length === 0) {
    missing(
      "bigquery.schedule",
      `Missing scheduled query ${args.scheduleDisplayName}.`,
    );
  } else if (matches.length > 1) {
    missing(
      "bigquery.schedule_duplicate",
      `Found ${matches.length} scheduled queries named ${args.scheduleDisplayName}.`,
    );
  } else if (failedMatches.length > 0) {
    missing(
      "bigquery.schedule_failed",
      `Scheduled query ${args.scheduleDisplayName} is in FAILED state.`,
    );
  }
}

function checkFunctions() {
  const result = run("firebase", [
    "functions:list",
    "--project",
    projectId,
    "--json",
  ]);

  if (result.exitCode !== 0) {
    status.checks.functions = {
      ok: false,
      active: [],
      error: conciseError(result),
    };
    missing("firebase.functions", "Unable to inspect Firebase functions.");
    return;
  }

  const payload = parseJson(result.stdout, {});
  const functions = Array.isArray(payload.result) ? payload.result : [];
  const names = functions.map((entry) => {
    const id = entry?.id ?? entry?.name ?? "";
    return String(id).split("/").at(-1) ?? "";
  });
  const active = expectedFunctions.filter((name) => names.includes(name));
  const missingFunctions = expectedFunctions.filter((name) =>
    !active.includes(name)
  );
  status.checks.functions = {
    ok: missingFunctions.length === 0,
    active,
    missing: missingFunctions,
  };
  for (const name of missingFunctions) {
    missing("firebase.function", `Missing deployed function ${name}.`);
  }
}

function parseArgs(argv) {
  const parsed = {
    env: "prod",
    location: "asia-south1",
    scheduleDisplayName: defaultScheduleDisplayName,
    json: false,
    projectId: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--env") parsed.env = argv[++i] ?? parsed.env;
    else if (arg === "--project-id") parsed.projectId = argv[++i] ?? null;
    else if (arg === "--location") parsed.location = argv[++i] ?? parsed.location;
    else if (arg === "--schedule-display-name") {
      parsed.scheduleDisplayName = argv[++i] ?? parsed.scheduleDisplayName;
    } else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") usage();
    else usage(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function resolveProjectId(env) {
  const rc = JSON.parse(fs.readFileSync(fromRepo(".firebaserc"), "utf8"));
  const projectId = rc.projects?.[env];
  if (!projectId) usage(`Unable to resolve Firebase project alias ${env}.`);
  return projectId;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: fromRepo("."),
    encoding: "utf8",
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseJson(value, fallback) {
  try {
    const trimmed = value.trim();
    return trimmed ? JSON.parse(trimmed) : fallback;
  } catch {
    return fallback;
  }
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function conciseError(result) {
  return (result.stderr || result.stdout).split(/\r?\n/).slice(0, 6).join("\n");
}

function missing(id, message) {
  status.missing.push({id, message});
}

function printHumanStatus(ok) {
  console.log(`User analytics live status for ${projectId}`);
  console.log(`OK: ${ok ? "yes" : "no"}`);
  for (const [name, check] of Object.entries(status.checks)) {
    console.log(`- ${name}: ${check.ok ? "ok" : "missing"}`);
  }
  for (const item of status.missing) {
    console.log(`  missing: ${item.message}`);
  }
}

function usage(message = null) {
  if (message) console.error(message);
  console.error(`
Usage:
  node tool/analytics/user_analytics_live_status.mjs [options]

Options:
  --env <dev|prod>            Firebase project alias. Default: prod.
  --project-id <id>                   Explicit Firebase/GCP project id.
  --location <location>               BigQuery location. Default: asia-south1.
  --schedule-display-name <name>      Scheduled query display name.
  --json                              Print machine-readable JSON.
`);
  process.exit(message ? 64 : 0);
}
