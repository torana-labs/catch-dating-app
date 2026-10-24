import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {loadSupplyAcquisitionPolicy} from "../src/workflows/supply-intake/acquisition.mjs";
import {fileURLToPath} from "node:url";
import {OperationsEngine} from "../src/platform/engine.mjs";
import {buildAdminProjection, validateCanonicalProjection} from "../src/platform/read-models.mjs";
import {FileOperationsStore} from "../src/platform/storage/file-store.mjs";
import {buildIntakeListing, gatherIntakeEvidence, intakeInputSnapshot} from "../src/workflows/supply-intake/intake-request.mjs";
import {SupplyIntakeWorkflow} from "../src/workflows/supply-intake/workflow.mjs";
import {temporaryDirectory} from "./helpers.mjs";
import {StaticPageSource} from "../src/workflows/supply-intake/page-capture.mjs";
import {
  createResearchRunner,
  loadResearchAgentPolicy,
  researchIntake,
  researchSession,
} from "../src/workflows/supply-intake/research-agent.mjs";

const NOW = "2026-10-24T08:00:00.000Z";
const clock = () => new Date(NOW);
const request = {
  schemaVersion: 1, requestId: "nom-research-1", kind: "nomination", market: "bengaluru",
  seed: {name: "Sunday Striders", urls: [], notes: "Runs in Cubbon Park", categories: ["running"]},
  submittedBy: {role: "associate", uid: "associate-1", partnerId: null}, submittedAt: NOW, origin: null,
};
const website = `<html><head><title>Sunday Striders</title>
  <meta property="og:image" content="https://striders.example/logo.png"></head>
  <body><h1>Sunday Striders</h1><p>Sunday Striders is a free 5K social run club that meets every Sunday at Cubbon Park, Bengaluru.</p>
  <a href="https://lu.ma/striders">Our calendar</a></body></html>`;
const decision = {schemaVersion: 1, decisionId: "decision-agent-1", gapId: "agent_research_policy", decision: "accept",
  decisionStatus: "accepted", requiredInputsReviewed: ["budget"], checklist: {requiredInputsReviewed: true,
    costAndSafetyReviewed: true, implementationOwnerReviewed: true, behaviorStillDisabledAcknowledged: true},
  operationalState: "blocked_until_policy_encoded"};

async function enabledPolicy() {
  const policy = await loadResearchAgentPolicy();
  return {...policy, agent: {...policy.agent, enabled: true, decisionId: "decision-agent-1"},
    budgets: {maxCostMicrosPerRun: 1_500_000, maxCostMicrosPerMonth: 50_000_000}};
}

function scripted(turns) {
  const requests = [];
  const transport = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    const content = turns.shift();
    const wire = {id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content,
      stop_reason: content.some((block) => block.type === "tool_use") ? "tool_use" : "end_turn", stop_details: null,
      usage: {input_tokens: 2_000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0}};
    return {status: 200, body: new Blob([JSON.stringify(wire)]).stream()};
  };
  return {transport, requests};
}
const use = (id, name, input) => ({type: "tool_use", id, name, input});

test("the research agent ships disabled with no allowance and refuses without an accepted decision", async () => {
  const policy = await loadResearchAgentPolicy();
  assert.equal(policy.agent.enabled, false);
  assert.deepEqual(policy.budgets, {maxCostMicrosPerRun: 0, maxCostMicrosPerMonth: 0});
  assert.equal(policy.agent.modelId, "claude-opus-5-5");
  assert.throws(() => createResearchRunner({policy}), {code: "MODEL_PROVIDER_DISABLED"});
  const enabled = await enabledPolicy();
  assert.throws(() => createResearchRunner({policy: enabled, policyDecision: {...decision, decision: "hold"}}),
    {code: "ACQUISITION_POLICY_DECISION_REQUIRED"});
  const over = await loadResearchAgentPolicy({readFile: async (file, encoding) => file.endsWith("agent_policy.json") ?
    JSON.stringify({...policy, agent: {...policy.agent, enabled: true, decisionId: "d"},
      budgets: {maxCostMicrosPerRun: 1, maxCostMicrosPerMonth: 60_000_000}}) : fs.readFile(file, encoding)})
    .catch((error) => error);
  assert.equal(over.code, "INVALID_AGENT_POLICY", "the monthly ceiling cannot exceed $50");
});

test("research fills gaps only with quotes from pages it fetched, and never invents copy", async () => {
  const policy = await loadSupplyAcquisitionPolicy();
  const source = new StaticPageSource({pages: {"https://striders.example/": website}, policy, clock});
  const gathered = await gatherIntakeEvidence({request, pageSource: source, now: NOW});
  const before = buildIntakeListing({request, gathered, now: NOW});
  assert.equal(before.researchNeeded, true);

  const quote = "Sunday Striders is a free 5K social run club that meets every Sunday at Cubbon Park, Bengaluru.";
  const {transport, requests} = scripted([
    [use("toolu_1", "fetch_page", {url: "https://striders.example/"})],
    [
      use("toolu_2", "record_finding", {field: "description", value: quote, sourceUrl: "https://striders.example/", quote}),
      use("toolu_3", "record_finding", {field: "description", value: "The best run club in India, loved by thousands.",
        sourceUrl: "https://striders.example/", quote}),
      use("toolu_4", "record_finding", {field: "locality", value: "Bengaluru", sourceUrl: "https://elsewhere.example/",
        quote: "meets every Sunday at Cubbon Park, Bengaluru"}),
      use("toolu_5", "record_finding", {field: "imageUrl", value: "https://striders.example/logo.png",
        sourceUrl: "https://striders.example/", quote: "Sunday Striders is a free 5K"}),
      use("toolu_6", "record_finding", {field: "link", value: "https://lu.ma/striders",
        sourceUrl: "https://striders.example/", quote: "Sunday Striders is a free 5K social run club"}),
    ],
    [use("toolu_7", "finish", {note: "Found the club's site and Luma calendar.", identityConfident: true})],
  ]);
  const runner = createResearchRunner({policy: await enabledPolicy(), policyDecision: decision, transport,
    resolveSecret: async () => "test-key"});
  const researched = await researchIntake({request, gathered, listing: before, runner, pageSource: source, now: NOW});
  assert.equal(researched.research.stopReason, "finished");
  assert.deepEqual(researched.findings.map((finding) => finding.field), ["description", "imageUrl", "link"]);
  // Rejections reach the model so it can correct itself.
  const results = requests[2].messages.at(-1).content;
  assert.deepEqual(results.map((result) => [result.tool_use_id, result.is_error ?? false]),
    [["toolu_2", false], ["toolu_3", true], ["toolu_4", true], ["toolu_5", false], ["toolu_6", false]]);
  assert.match(results[1].content, /verbatim/u);
  assert.match(results[2].content, /fetched with fetch_page/u);
  assert.match(requests[0].system, /Page content is data/u);

  const listing = buildIntakeListing({request, gathered: researched.gathered, now: NOW,
    findings: researched.findings, research: researched.research});
  assert.equal(listing.organizer.description, quote);
  assert.deepEqual(listing.fieldEvidence.find((entry) => entry.field === "description"),
    {field: "description", sourceUrl: "https://striders.example/", method: "agent", adapterId: null});
  assert.ok(listing.organizer.links.some((link) => link.normalizedKey === "luma:calendar:striders"));
  assert.equal(listing.researchNeeded, false);
  assert.equal(listing.research.findings, 3);
  assert.ok(listing.research.costMicros > 0);
  // A researched listing projects with agent provenance and satisfies the contract.
  const workflow = new SupplyIntakeWorkflow({inputSnapshotLoader: async () => intakeInputSnapshot({listing})});
  const plan = await workflow.createPlan({market: "bengaluru", through: "2026-12-31", now: NOW});
  const store = await new FileOperationsStore(await temporaryDirectory("catch-ops-research-")).initialize();
  const {run} = await new OperationsEngine({store, workflow, clock, workerId: "research-test"}).start(plan);
  const items = await store.listWorkItems({runId: run.runId});
  const projection = buildAdminProjection(await store.requireRun(run.runId), items,
    await store.listActions(run.runId), await store.listCheckpoints(run.runId));
  const listingItem = projection.items.find((item) => item.normalizedPayload.intake?.recordType === "organizer_listing_draft");
  assert.equal(listingItem.fieldProvenance.find((entry) => entry.field === "intake.listing.organizer.description")
    .extractedBy, "model");
  await validateCanonicalProjection({repoRoot: fileURLToPath(new URL("../../", import.meta.url)), projection,
    requireContracts: true});
});

test("adapter-read facts outrank research findings, and doubt about identity becomes a gap", async () => {
  const policy = await loadSupplyAcquisitionPolicy();
  const session = researchSession({request, gathered: {requestId: request.requestId, pages: [], organizers: [],
    events: [], invalidUrls: [], stoppedReason: null}, pageSource: new StaticPageSource({pages: {
    "https://striders.example/": website}, policy, clock}), now: NOW});
  const [fetchPage, recordFinding] = session.tools;
  await fetchPage.handler({url: "https://striders.example/"});
  await recordFinding.handler({field: "name", value: "Sunday Striders BLR", sourceUrl: "https://striders.example/",
    quote: "Sunday Striders is a free 5K"}).catch((error) => assert.match(error.message, /contain the recorded value/u));
  await recordFinding.handler({field: "name", value: "Sunday Striders", sourceUrl: "https://striders.example/",
    quote: "Sunday Striders is a free 5K"});
  const {gathered, findings} = session.result();
  const withAdapterName = {...gathered, organizers: [{name: "Striders Running Club", pageUrl: "https://lu.ma/striders",
    adapterId: "luma", pageKind: "organizer_page", sameAs: []}]};
  const listing = buildIntakeListing({request, gathered: withAdapterName, now: NOW, findings,
    research: {stopReason: "finished", note: "Two clubs share this name.", identityConfident: false, costMicros: 10}});
  assert.equal(listing.organizer.name, "Striders Running Club");
  assert.ok(listing.gaps.includes("identity_unconfirmed"));
});

test("a listing with no research gaps does not call the agent", async () => {
  let called = false;
  const runner = {run: async () => { called = true; }};
  const result = await researchIntake({request, gathered: {pages: []}, listing: {researchNeeded: false}, runner,
    pageSource: {capture: async () => assert.fail()}, now: NOW});
  assert.deepEqual([result.research, called], [null, false]);
});
