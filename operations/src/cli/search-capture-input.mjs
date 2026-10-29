#!/usr/bin/env node
// Hand-run batch web search, offline: one saved search-engine capture
// (SerpAPI, CSE or a manual export) for one planned discovery query becomes a
// finalized Supply Intake input snapshot file for `ingest-input`. The script
// reads local files only; it never calls a provider, Firestore or the store.
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {asOperationsError, OperationsError} from "../platform/errors.mjs";
import {supplyInputSummary} from "../workflows/supply-intake/input-snapshot.mjs";
import {
  buildSearchResultBatchFromCapture,
  buildSearchResultCandidateQueue,
  findDiscoveryPlanEntry,
  SEARCH_RESULT_SOURCES,
  searchCandidateInputSnapshot,
} from "../workflows/supply-intake/sources/search/index.mjs";

const COMMAND = "search-capture-input";
const MAX_JSON_BYTES = 8 * 1024 * 1024;

if (isMain()) {
  searchCaptureInput(process.argv.slice(2)).then(({envelope, pretty}) => {
    process.stdout.write(`${JSON.stringify(envelope, null, pretty ? 2 : 0)}\n`);
  }).catch((error) => {
    const normalized = asOperationsError(error);
    process.stderr.write(`${JSON.stringify({
      schemaVersion: 1,
      program: "catch-operations",
      command: COMMAND,
      ok: false,
      error: {code: normalized.code, message: normalized.message,
        details: normalized.details},
    })}\n`);
    process.exitCode = normalized.exitCode;
  });
}

export async function searchCaptureInput(argv) {
  const flags = parseFlags(argv);
  if (flags.help) return {envelope: envelope(helpData()), pretty: flags.pretty};
  for (const name of ["capture", "plan", "runKey", "capturedAt", "output"]) {
    if (!flags[name]) {
      throw new OperationsError("MISSING_ARGUMENT",
        `--${kebab(name)} is required.`, {exitCode: 2});
    }
  }
  const plan = unwrapPlan(await readBoundedJson(flags.plan));
  const planEntry = findDiscoveryPlanEntry(plan.discoveryPlan ?? plan,
    flags.runKey);
  if (!planEntry) {
    throw new OperationsError("PLAN_ENTRY_NOT_FOUND",
      "--run-key does not name a planned discovery query in --plan.",
      {exitCode: 2, details: {runKey: flags.runKey}});
  }
  const market = flags.market ?? planEntry.citySlug;
  if (!market || market !== planEntry.citySlug) {
    throw new OperationsError("INVALID_ARGUMENT",
      "--market must match the planned query's citySlug.", {exitCode: 2});
  }
  const batch = buildSearchResultBatchFromCapture({
    capture: await readBoundedJson(flags.capture, {allowArray: true}),
    capturedAt: flags.capturedAt,
    planEntry,
    source: flags.source ?? "serp_api",
    sourcePlanId: typeof plan.planId === "string" ? plan.planId : null,
  });
  const queue = buildSearchResultCandidateQueue([batch]);
  const snapshot = searchCandidateInputSnapshot(queue, {
    market,
    snapshotId: flags.snapshotId ?? `search-${batch.batchId}`.slice(0, 240),
    observedAt: flags.observedAt ?? `${flags.capturedAt}T00:00:00.000Z`,
  });
  const outputPath = path.resolve(flags.output);
  await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
    flag: "wx", mode: 0o600,
  });
  return {
    pretty: flags.pretty,
    envelope: envelope({
      artifactPath: outputPath,
      snapshotId: snapshot.snapshotId,
      market: snapshot.market,
      observedAt: snapshot.observedAt,
      contentHash: snapshot.contentHash,
      batchId: batch.batchId,
      runKey: planEntry.runKey,
      queue: {...queue.summary, warnings: queue.warnings},
      summary: supplyInputSummary(snapshot),
      nextCommand:
        `node operations/src/cli/main.mjs ingest-input --input ${outputPath}`,
    }),
  };
}

function unwrapPlan(parsed) {
  return parsed.data?.plan ?? parsed.plan ?? parsed;
}

async function readBoundedJson(file, {allowArray = false} = {}) {
  const filePath = path.resolve(file);
  const info = await fs.stat(filePath);
  if (!info.isFile() || info.size > MAX_JSON_BYTES) {
    throw new OperationsError("INVALID_ARGUMENT",
      `${path.basename(filePath)} must be a regular file of at most 8 MiB.`,
      {exitCode: 2});
  }
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    throw new OperationsError("INVALID_ARGUMENT",
      `${path.basename(filePath)} is not valid JSON.`, {exitCode: 2});
  }
  if (!parsed || typeof parsed !== "object" ||
      (Array.isArray(parsed) && !allowArray)) {
    throw new OperationsError("INVALID_ARGUMENT",
      `${path.basename(filePath)} must hold a JSON object.`, {exitCode: 2});
  }
  return parsed;
}

function parseFlags(argv) {
  const valueFlags = new Set(["--capture", "--captured-at", "--market",
    "--observed-at", "--output", "--plan", "--run-key", "--snapshot-id",
    "--source"]);
  const flags = {help: false, pretty: false};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "help" || flag === "--help" || flag === "-h") flags.help = true;
    else if (flag === "--pretty") flags.pretty = true;
    else if (valueFlags.has(flag)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new OperationsError("INVALID_ARGUMENT",
          `${flag} requires a value.`, {exitCode: 2});
      }
      flags[camel(flag)] = value;
      index += 1;
    } else {
      throw new OperationsError("INVALID_ARGUMENT",
        `Unknown argument: ${flag}.`, {exitCode: 2});
    }
  }
  return flags;
}

function helpData() {
  return {
    usage: "node operations/src/cli/search-capture-input.mjs " +
      "--capture <provider.json> --plan <plan.json> --run-key <key> " +
      "--captured-at YYYY-MM-DD --output <snapshot.json> [flags]",
    flags: {
      "--capture": "Saved provider response (SerpAPI organic_results, CSE items, or results).",
      "--plan": "A `plan` envelope or artifact, or a bare discovery plan.",
      "--run-key": "The planned discovery query the capture answers.",
      "--captured-at": "Capture date, YYYY-MM-DD.",
      "--output": "New snapshot file; an existing file is never overwritten.",
      "--source": `One of ${SEARCH_RESULT_SOURCES.join(", ")} (default serp_api).`,
      "--market": "Optional; must equal the planned query's citySlug.",
      "--snapshot-id": "Override the default search-<batchId> id.",
      "--observed-at": "ISO-8601 observation time (default capture date, midnight UTC).",
    },
    contract: "Local files only: no network, no store writes. " +
      "Ingest the snapshot with `ingest-input`.",
  };
}

function envelope(data) {
  return {
    schemaVersion: 1,
    program: "catch-operations",
    command: COMMAND,
    ok: true,
    data,
    warnings: [],
  };
}

function camel(flag) {
  return flag.slice(2).replace(/-([a-z])/g, (_match, letter) =>
    letter.toUpperCase());
}

function kebab(name) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function isMain() {
  return process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
