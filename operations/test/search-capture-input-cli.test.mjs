import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {mkdtemp, readFile, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {searchCaptureInput} from "../src/cli/search-capture-input.mjs";
import {main} from "../src/cli/main.mjs";
import {assertSupplyInputSnapshot} from
  "../src/workflows/supply-intake/input-snapshot.mjs";

const run = promisify(execFile);
const operationsRoot = fileURLToPath(new URL("../", import.meta.url));
const scriptPath = path.join(operationsRoot, "src/cli/search-capture-input.mjs");
const SERPAPI_FIXTURE = path.join(operationsRoot,
  "src/workflows/supply-intake/fixtures/search/afterfly.serpapi.raw.json");

const planEntry = {
  candidateId: "afterfly-run-club-indore",
  candidateName: "AFTER FLY",
  categoryId: "social_run_club",
  city: "Indore",
  citySlug: "indore",
  planKind: "candidate_verification",
  renderedQuery: "\"AFTER FLY\" Luma",
  resultFingerprint: "c383931a89d36db6",
  runKey: "web_search|\"after fly\" luma|indore|social_run_club|afterfly-run-club-indore",
  source: "web_search",
};

async function planEnvelopeFile(directory) {
  const file = path.join(directory, "plan.json");
  await writeFile(file, JSON.stringify({
    schemaVersion: 1,
    program: "catch-operations",
    command: "plan",
    ok: true,
    data: {plan: {
      planId: "supply-indore-2026-06-17-abc",
      market: "indore",
      discoveryPlan: {planned: [planEntry], skippedFresh: []},
    }},
  }));
  return file;
}

function flags({plan, output, extra = []}) {
  return [
    "--capture", SERPAPI_FIXTURE,
    "--plan", plan,
    "--run-key", planEntry.runKey,
    "--captured-at", "2026-06-17",
    "--output", output,
    ...extra,
  ];
}

test("a saved SerpAPI capture becomes an ingestable search snapshot", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "catch-search-input-"));
  const output = path.join(directory, "snapshot.json");
  const {envelope} = await searchCaptureInput(flags({
    plan: await planEnvelopeFile(directory),
    output,
  }));

  assert.equal(envelope.program, "catch-operations");
  assert.equal(envelope.command, "search-capture-input");
  assert.equal(envelope.ok, true);
  assert.equal(envelope.data.artifactPath, output);
  assert.equal(envelope.data.market, "indore");
  assert.equal(envelope.data.observedAt, "2026-06-17T00:00:00.000Z");
  assert.equal(envelope.data.batchId,
    "2026-06-17-afterfly-run-club-indore-c383931a89d36db6");
  assert.equal(envelope.data.snapshotId,
    "search-2026-06-17-afterfly-run-club-indore-c383931a89d36db6");
  assert.equal(envelope.data.queue.candidates, 3);
  assert.deepEqual(envelope.data.queue.warnings, []);

  const snapshot = assertSupplyInputSnapshot(
    JSON.parse(await readFile(output, "utf8")), {market: "indore"});
  assert.equal(snapshot.contentHash, envelope.data.contentHash);
  assert.equal(snapshot.provenance.source, "operations_batch_web_search");
  assert.deepEqual(snapshot.organizerSearchCandidates.map((candidate) =>
    candidate.normalizedKey), [
    "luma:event:pxgmph3b",
    "instagram:afterfly.in",
    "sortMyScene:profile:afterfly",
  ]);
  assert.ok(snapshot.organizerSearchCandidates.every((candidate) =>
    candidate.query === planEntry.renderedQuery));

  const writes = [];
  const ingested = await main(["ingest-input", "--input", output], {
    store: {putSupplyInputSnapshot: async (value) => writes.push(value)},
    workflowRegistry: [{workflowId: "supply-intake", commands: ["ingest-input"]}],
  });
  assert.equal(ingested.envelope.data.contentHash, snapshot.contentHash);
  assert.equal(writes.length, 1);
});

test("the snapshot command refuses unplanned queries and never overwrites", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "catch-search-input-"));
  const plan = await planEnvelopeFile(directory);
  const output = path.join(directory, "snapshot.json");
  await assert.rejects(searchCaptureInput([
    ...flags({plan, output}).filter((value) => value !== planEntry.runKey &&
      value !== "--run-key"),
    "--run-key", "web_search|unplanned",
  ]), {code: "PLAN_ENTRY_NOT_FOUND"});
  await assert.rejects(searchCaptureInput(flags({plan, output,
    extra: ["--market", "mumbai"]})), {code: "INVALID_ARGUMENT"});
  await assert.rejects(searchCaptureInput(flags({plan, output,
    extra: ["--source", "live_google"]})), {code: "INVALID_SEARCH_CAPTURE"});
  await assert.rejects(searchCaptureInput(["--capture", SERPAPI_FIXTURE]),
    {code: "MISSING_ARGUMENT"});

  await writeFile(output, "{}\n");
  await assert.rejects(searchCaptureInput(flags({plan, output})),
    {code: "EEXIST"});
  assert.equal(await readFile(output, "utf8"), "{}\n");
});

test("the snapshot script emits CLI envelopes on stdout and stderr", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "catch-search-input-"));
  const help = await run(process.execPath, [scriptPath, "help"]);
  assert.equal(JSON.parse(help.stdout).data.contract.includes("no network"), true);

  const output = path.join(directory, "snapshot.json");
  const ok = await run(process.execPath, [scriptPath, ...flags({
    plan: await planEnvelopeFile(directory), output})]);
  assert.equal(JSON.parse(ok.stdout).data.artifactPath, output);

  await assert.rejects(run(process.execPath, [scriptPath, "--bogus"]),
    (error) => {
      assert.equal(error.code, 2);
      const envelope = JSON.parse(error.stderr);
      assert.equal(envelope.ok, false);
      assert.equal(envelope.command, "search-capture-input");
      assert.equal(envelope.error.code, "INVALID_ARGUMENT");
      return true;
    });
});
