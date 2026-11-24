import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {main, parseTakedownArgs, preservationBucketName, readCase} from "./organizer_takedown.mjs";
import {dispositionFor, readSchemaInventory} from "./lib/organizer_takedown/inventory.mjs";
import {parseCaseFile} from "./lib/organizer_takedown/plan.mjs";
import {statements} from "./lib/organizer_takedown/bigquery.mjs";
import {
  suppressionHashes,
  suppressionKeysForIntakeRequest,
} from "./lib/organizer_takedown/suppression.mjs";
import {createFakeBucket, createFakeFetch, createFakeFirestore, fakeFieldValues} from "./fixtures/organizer_takedown/fakes.mjs";
import {
  CASE_ID,
  CASE_ORGANIZER,
  COPY_ORGANIZER,
  IDENTIFYING,
  NAME_ONLY_ORGANIZER,
  PEER_ORGANIZER,
  UNRELATED_ORGANIZER,
  appObjects,
  caseFile,
  takedownWorld,
} from "./fixtures/organizer_takedown/world.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SECRET = "test-only-listing-suppression-key-0123456789abcdef";
const START = Date.parse("2026-11-18T08:00:00.000Z");

function world({withCase = true} = {}) {
  const db = createFakeFirestore(takedownWorld());
  const appBucket = createFakeBucket("app", appObjects());
  const store = createFakeBucket("preserve", withCase ? {[`cases/${CASE_ID}/case.json`]: JSON.stringify(caseFile)} : {},
    {retention: true});
  let clock = START;
  const fetch = createFakeFetch();
  const bqCalls = [];
  const deps = {db, appBucket, store, fieldValues: fakeFieldValues, readSecret: async () => SECRET,
    fetchImpl: fetch.fetchImpl, now: () => new Date(clock), runBq: null};
  return {db, appBucket, store, deps, fetch, bqCalls, advance: (ms) => {
    clock += ms;
  }};
}

/** Runs the CLI against the fakes and captures what it prints. */
async function cli(w, mode, extra = []) {
  const lines = [];
  const original = console.log;
  console.log = (...values) => lines.push(values.join(" "));
  try {
    const result = await main(["--env", "dev", "--case-id", CASE_ID, "--mode", mode, ...extra], w.deps);
    return {result, output: lines.join("\n")};
  } finally {
    console.log = original;
    w.advance(60_000);
  }
}

function assertCountsOnly(output) {
  for (const value of IDENTIFYING) assert.ok(!output.includes(value), `output names ${value}`);
}

test("the case file is validated: opaque id, a request type and only known target fields", () => {
  assert.equal(parseCaseFile(JSON.stringify(caseFile), CASE_ID).targets.organizerIds[0], CASE_ORGANIZER);
  for (const [raw, pattern] of [["not json", /JSON/u], [{...caseFile, caseId: "TD-0043"}, /does not match/u],
    [{...caseFile, requestType: "please"}, /requestType/u], [{...caseFile, targets: {}}, /no target/u],
    [{...caseFile, targets: {emails: ["x"]}}, /Unknown/u], [{...caseFile, targets: {organizerIds: ["a/b"]}}, /invalid id/u],
    [{...caseFile, receivedAt: "soon"}, /receivedAt/u]]) {
    assert.throws(() => parseCaseFile(typeof raw === "string" ? raw : JSON.stringify(raw), CASE_ID), pattern);
  }
});

test("arguments take only an environment, a mode and a TD case id", () => {
  assert.throws(() => parseTakedownArgs(["--case-id", CASE_ID, "--mode", "plan"]), /--env/u);
  assert.throws(() => parseTakedownArgs(["--env", "dev", "--case-id", "lantern", "--mode", "plan"]), /TD-0001/u);
  assert.throws(() => parseTakedownArgs(["--env", "dev", "--case-id", CASE_ID, "--mode", "delete"]), /--mode/u);
  assert.throws(() => parseTakedownArgs(["--env", "dev", "--case-id", CASE_ID, "--mode", "plan", "--organizer", "x"]));
  assert.equal(preservationBucketName("catchdates-dev"), "catchdates-dev-takedown-preservation");
});

test("prod writes need --allow-prod; prod reads do not", async () => {
  const w = world();
  for (const mode of ["apply", "suppress", "bigquery"]) {
    await assert.rejects(main(["--env", "prod", "--case-id", CASE_ID, "--mode", mode], w.deps), /--allow-prod/u);
  }
  const original = console.log;
  console.log = () => {};
  try {
    await main(["--env", "prod", "--case-id", CASE_ID, "--mode", "plan"], w.deps);
  } finally {
    console.log = original;
  }
});

test("the inventory scans every organizerId collection and keeps money, safety and legal records", () => {
  const inventory = readSchemaInventory(path.join(root, "contracts/firestore"));
  for (const collection of ["events", "organizerClaimRequests", "salesOpportunities", "eventPublicPage", "reviews",
    "eventBookings", "eventParticipations"]) {
    assert.ok(inventory.byField.includes(collection), collection);
  }
  for (const collection of ["organizerGrowthFacts", "publicPageBuilds", "organizerPublicPage", "publicOrganizers",
    "organizerSalesAccounts", "organizerIntakeReviewDecisions"]) {
    assert.ok(inventory.byId.includes(collection), collection);
  }
  assert.ok(inventory.byField.length > 200);
  assert.deepEqual(["guestPayments", "organizerBills", "supportConversations", "eventSafetyReports", "adminAuditLogs",
    "salesOpportunities", "salesPrivacyRestrictions"].map(dispositionFor),
  ["retain_finance", "retain_finance", "retain_legal_record", "retain_safety_record", "redact", "delete",
    "retain_suppression_record"]);
});

test("a missing case file stops every mode before reading anything else", async () => {
  const w = world({withCase: false});
  await assert.rejects(cli(w, "plan"), /No case file/u);
});

test("a correction is a new numbered case file, since the bucket refuses overwrites", async () => {
  const w = world();
  await w.store.file(`cases/${CASE_ID}/case-01.json`).save(JSON.stringify({...caseFile,
    targets: {...caseFile.targets, organizerIds: [UNRELATED_ORGANIZER]}}));
  await w.store.file(`cases/${CASE_ID}/case-02.json`).save(JSON.stringify(caseFile));
  await w.store.file(`cases/${CASE_ID}/case-notes.txt`).save("ignored");
  assert.deepEqual((await readCase(w.store, CASE_ID)).targets.organizerIds, [CASE_ORGANIZER]);
  await assert.rejects(w.store.file(`cases/${CASE_ID}/case.json`).save("{}"), /retention/u);
});

test("plan counts every store and prints counts only", async () => {
  const w = world();
  const {result, output} = await cli(w, "plan");
  assertCountsOnly(output);
  const summary = result.summary;
  assert.equal(summary.organizers, 2, "the organiser and its copy found by a shared Instagram link");
  assert.equal(summary.supplyIntakeRequests, 2);
  assert.equal(summary.externalEvents, 1);
  assert.equal(summary.possibleNameOnlyOrganizers, 1, "a same-name organiser is reported, never included");
  assert.deepEqual(summary.byCollection.guestPayments, {retain_finance: 1});
  assert.deepEqual(summary.byCollection.supportConversations, {retain_legal_record: 1});
  assert.deepEqual(summary.byCollection.adminAuditLogs, {redact: 1});
  for (const collection of ["organizers", "externalEvents", "externalEventPublicationReceipts", "eventPublicPage",
    "supplyIntakeRequests", "operationRuns", "operationWorkItems", "operationActionReceipts", "operationLeases",
    "organizerIntakeCurationDecisions", "organizerIntakeReviewDecisions", "publicRouteReservations",
    "organizerGrowthFacts", "organizerClaimRequests", "organizerSalesAccounts", "salesOpportunities",
    "salesInboundIntents", "publicPageBuilds", "organizerPublicPage", "publicOrganizers", "adminInboxItems"]) {
    assert.ok(summary.byCollection[collection]?.delete >= 1, collection);
  }
  assert.equal(summary.peerRecommendationRails, 1);
  assert.equal(summary.storageObjects, 2);
  assert.equal(w.db.log.deletes.length + w.db.log.updates.length + w.db.log.sets.length, 0, "plan writes nothing");
  assert.match(output, /Dry run only/u);
});

test("apply refuses until a preserve run covers the whole plan", async () => {
  const w = world();
  await assert.rejects(cli(w, "apply"), /Run preserve before apply/u);
  await cli(w, "preserve");
  w.db.docs.set("salesTasks/task-new", {organizerId: CASE_ORGANIZER});
  await assert.rejects(cli(w, "apply"), /1 record\(s\) in the plan were not preserved/u);
  assert.equal(w.db.log.deletes.length, 0);
});

test("preserve copies documents, subcollections and Storage objects with a SHA-256 manifest, never overwriting", async () => {
  const w = world();
  const {result, output} = await cli(w, "preserve");
  assertCountsOnly(output);
  const keys = [...w.store.objects.keys()].filter((key) => key.includes("/preserve/"));
  const manifestKey = keys.find((key) => key.endsWith("/manifest.json"));
  const manifest = JSON.parse(w.store.objects.get(manifestKey));
  assert.equal(manifest.caseId, CASE_ID);
  assert.ok(manifest.documents.some((document) => document.path === `organizers/${CASE_ORGANIZER}/posts/post-1`));
  assert.ok(manifest.documents.some((document) =>
    document.path === `organizerSalesAccounts/${CASE_ORGANIZER}/customValues/sales.language`));
  assert.ok(manifest.documents.every((document) => /^[0-9a-f]{64}$/u.test(document.sha256)));
  assert.equal(manifest.storage.length, 2);
  for (const file of manifest.files) {
    const bytes = w.store.objects.get(manifestKey.replace("manifest.json", file.name));
    assert.equal(file.sha256, (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex"));
  }
  assert.ok(manifest.organizerIds.includes(COPY_ORGANIZER));
  assert.equal(result.preserved.storageObjects, 2);
  // A second run writes a new timestamped folder; the retention bucket refuses overwrites.
  await cli(w, "preserve");
  assert.equal([...w.store.objects.keys()].filter((key) => key.endsWith("/manifest.json")).length, 2);
  assert.equal(w.db.log.deletes.length, 0, "preserve deletes nothing");
});

test("apply deletes the closure, redacts audit logs, patches peers, keeps unrelated and retained records", async () => {
  const w = world();
  await cli(w, "preserve");
  const {result, output} = await cli(w, "apply");
  assertCountsOnly(output);
  const docs = w.db.docs;
  for (const gone of [`organizers/${CASE_ORGANIZER}`, `organizers/${CASE_ORGANIZER}/posts/post-1`,
    `organizers/${COPY_ORGANIZER}`, "externalEvents/evt-lantern-1", "externalEventPublicationReceipts/rcpt-1",
    "eventPublicPage/evt-lantern-1", "supplyIntakeRequests/nom-lantern-pending", "supplyIntakeRequests/nom-lantern-approved",
    "salesInboundIntents/intent-lantern-1", "operationRuns/run-lantern-1", "operationWorkItems/wi-lantern-1",
    "operationWorkItems/wi-lantern-2", "operationActionReceipts/act-1", "operationLeases/lease-1",
    "organizerIntakeCurationDecisions/listing-1", `organizerIntakeReviewDecisions/${CASE_ORGANIZER}`,
    "publicRouteReservations/organizers--lantern-trail-runners", `organizerGrowthFacts/${CASE_ORGANIZER}`,
    "organizerClaimRequests/claim-1", `organizerSalesAccounts/${CASE_ORGANIZER}`,
    `organizerSalesAccounts/${CASE_ORGANIZER}/customValues/sales.language`, "salesOpportunities/opp-1",
    `publicPageBuilds/${CASE_ORGANIZER}`, `organizerPublicPage/${CASE_ORGANIZER}`, `publicOrganizers/${CASE_ORGANIZER}`,
    "adminInboxItems/item-1"]) {
    assert.ok(!docs.has(gone), `${gone} deleted`);
  }
  for (const kept of [`organizers/${UNRELATED_ORGANIZER}`, `organizers/${NAME_ONLY_ORGANIZER}`, "externalEvents/evt-harbour-1",
    "supplyIntakeRequests/nom-harbour", "salesOpportunities/opp-harbour", "adminAuditLogs/log-harbour",
    "supportConversations/conv-1", "guestPayments/pay-1", `organizerPublicPage/${PEER_ORGANIZER}`]) {
    assert.ok(docs.has(kept), `${kept} kept`);
  }
  assert.deepEqual(docs.get("adminAuditLogs/log-1"), {actorUid: "admin-1", roles: ["admin"],
    action: "adminApproveOrganizerListing", targetPath: `takedownCases/${CASE_ID}`, before: {},
    after: {redactedForCase: CASE_ID}, note: `Redacted for takedown case ${CASE_ID}.`});
  assert.deepEqual(docs.get(`organizerPublicPage/${PEER_ORGANIZER}`).recommendedOrganizers.map((item) => item.organizerId),
    [UNRELATED_ORGANIZER]);
  assert.deepEqual([...w.appBucket.objects.keys()], [`organizers/${UNRELATED_ORGANIZER}/photos/cover.jpg`]);
  assert.deepEqual(result.after, {deletes: 0, redactions: 0, peerRails: 0, storageObjects: 0});
  const applyKey = [...w.store.objects.keys()].find((key) => key.startsWith(`cases/${CASE_ID}/apply/`));
  const manifest = JSON.parse(w.store.objects.get(applyKey));
  assert.deepEqual(manifest.bigquery.organizers, [CASE_ORGANIZER, COPY_ORGANIZER].sort());
  // A rerun (the copy organiser is already gone) finds nothing and changes nothing.
  const deletes = w.db.log.deletes.length;
  const rerun = await cli(w, "apply");
  assert.equal(rerun.result.counts.deleted, 0);
  assert.equal(w.db.log.deletes.length, deletes);
});

test("an unscannable store stops preserve and apply", async () => {
  const w = world();
  w.db.failCollection = "organizerClaimRequests";
  const planned = await cli(w, "plan");
  assert.match(planned.output, /Scan errors: \d+ \(organizerClaimRequests\)/u);
  await assert.rejects(cli(w, "preserve"), /could not be scanned/u);
  await assert.rejects(cli(w, "apply"), /could not be scanned/u);
});

test("suppress writes a schema-valid registry entry of keyed hashes that blocks the case's names and links", async () => {
  const w = world();
  await cli(w, "preserve");
  const {output} = await cli(w, "suppress");
  assertCountsOnly(output);
  const entry = w.db.docs.get(`listingSuppressions/${CASE_ID}`);
  const require = createRequire(path.join(root, "functions/package.json"));
  const Ajv = require("ajv");
  const schema = JSON.parse(fs.readFileSync(path.join(root, "contracts/firestore/listing_suppressions.schema.json"), "utf8"));
  const validate = new Ajv({strict: false}).compile(schema);
  assert.equal(validate(entry), true, JSON.stringify(validate.errors));
  assert.ok(!JSON.stringify(entry).toLowerCase().includes("lantern"), "no identity in clear");
  assert.equal(entry.reason, "removeAndDoNotList");
  const created = new Date(entry.createdAtMillis);
  assert.equal(entry.reviewAtMillis, created.setUTCFullYear(created.getUTCFullYear() + 3), "three-year review");
  const stored = new Set(entry.identityHashes);
  for (const seed of [{name: "Lantern Trail Runners", urls: []}, {name: null, urls: ["https://lantern-trail.example/"]},
    {name: null, urls: ["https://instagram.com/lanterntrailrunners"]}, {name: "Lantern Trail Run Club", urls: []}]) {
    const hashes = suppressionHashes(SECRET, suppressionKeysForIntakeRequest({seed: {...seed, notes: null, categories: []}}));
    assert.ok(hashes.some((hash) => stored.has(hash)), JSON.stringify(seed));
  }
  // A rerun keeps counters and adds nothing.
  w.db.docs.set(`listingSuppressions/${CASE_ID}`, {...entry, blockedIntakeCount: 2});
  const again = await cli(w, "suppress");
  assert.match(again.output, /updated: \d+ hash\(es\) \(0 new\)/u);
  assert.equal(w.db.docs.get(`listingSuppressions/${CASE_ID}`).blockedIntakeCount, 2);
  w.deps.readSecret = async () => "";
  await assert.rejects(cli(w, "suppress"), /LISTING_SUPPRESSION_HMAC_KEY is unavailable/u);
});

test("verify fails until everything is gone and suppressed, then passes with the backup expiry dates", async () => {
  const w = world();
  await cli(w, "preserve");
  await assert.rejects(cli(w, "verify"), /Verification found/u);
  await cli(w, "apply");
  await assert.rejects(cli(w, "verify"), /Verification found/u, "no suppression yet");
  await cli(w, "suppress");
  const {result, output} = await cli(w, "verify", ["--site-origin", "https://www.example.com"]);
  assertCountsOnly(output);
  assert.equal(result.passed, true);
  assert.ok(result.web.checked >= 3);
  assert.equal(result.web.gone404, result.web.checked);
  assert.match(output, /Backups: restorable until 2026-11-25T\d\d:\d\d:\d\d\.\d{3}Z \(point-in-time recovery\) and 2026-12-02T/u);
  // A page still served, or still in the sitemap, fails verification.
  w.deps.fetchImpl = createFakeFetch({statuses: {"/organizers/lantern-trail-runners/": 200}}).fetchImpl;
  await assert.rejects(cli(w, "verify", ["--site-origin", "https://www.example.com"]), /Verification found/u);
  w.deps.fetchImpl = createFakeFetch({sitemap: "<loc>https://www.example.com/organizers/lantern-trail-runners/</loc>"}).fetchImpl;
  await assert.rejects(cli(w, "verify", ["--site-origin", "https://www.example.com"]), /Verification found/u);
  // A city plan still naming the organiser fails it too.
  w.deps.fetchImpl = createFakeFetch().fetchImpl;
  w.db.docs.set("cityPlans/pune", {organizers: [{organizerId: CASE_ORGANIZER}]});
  await assert.rejects(cli(w, "verify"), /Verification found/u);
});

// bq's global flags; everything else (--max_rows, --parameter, --dry_run...) belongs after the command.
const GLOBAL_BQ_FLAG = /^--(quiet|headless|project_id=|location=|format=)/u;

// A stand-in for bq: answers show, count, select, dry-run and delete, and logs each call with its @ids.
function fakeBq(w, {rowsRemain = false, deleteError = null, show = "{}"} = {}) {
  const deleted = new Set();
  w.deps.runBq = async (args) => {
    const parameter = args.find((arg) => arg.startsWith("--parameter="));
    const ids = parameter ? JSON.parse(fs.readFileSync(parameter.slice(12), "utf8"))[0].parameterValue.arrayValues
      .map((value) => value.value) : null;
    const sql = args.at(-1);
    // Like bq, refuse a command flag placed before the command (bq: "Unknown command line flag").
    const command = args.findIndex((arg) => !arg.startsWith("--"));
    const misplaced = args.slice(0, command).find((arg) => !GLOBAL_BQ_FLAG.test(arg));
    if (misplaced) throw Object.assign(new Error(`bq: unknown command line flag ${misplaced}`), {code: 1});
    w.bqCalls.push({args, ids});
    if (args.includes("show")) return show;
    const table = /`([^`]+)`/u.exec(sql)?.[1];
    if (args.includes("--dry_run")) return "Query successfully validated.";
    if (sql.startsWith("DELETE")) {
      if (deleteError) throw Object.assign(new Error("bq failed"), {stdout: deleteError});
      deleted.add(table);
      return "Number of affected rows: 3";
    }
    if (sql.startsWith("SELECT COUNT")) {
      return JSON.stringify([{row_count: deleted.has(table) && !rowsRemain ? "0" : "3"}]);
    }
    if (sql.startsWith("SELECT *")) return JSON.stringify([{document_id: "x"}, {document_id: "y"}, {document_id: "z"}]);
    throw new Error(`unexpected bq call ${args.join(" ")}`);
  };
}

test("bigquery waits out the streaming buffer, preserves then deletes matching rows, and prints counts only", async () => {
  const w = world();
  await assert.rejects(cli(w, "bigquery"), /Run apply first/u);
  await cli(w, "preserve");
  await cli(w, "apply");
  fakeBq(w);
  await assert.rejects(cli(w, "bigquery"), /streaming buffer[^]*Retry after \d{4}-\d\d-\d\dT\d\d:\d\dZ/u);
  w.advance(91 * 60_000);
  const {result, output} = await cli(w, "bigquery");
  assertCountsOnly(output);
  const organizers = result.rows.find((row) => row.table === "catch_analytics.organizers_raw_changelog");
  assert.deepEqual(organizers, {table: "catch_analytics.organizers_raw_changelog", ids: 2, before: 3, after: 0, preserved: 3});
  assert.ok(result.rows.find((row) => row.table === "catch_analytics.reviews_raw_changelog").ids === 0, "untouched");
  for (const table of ["catch_analytics.organizer_growth_events", "catch_analytics.host_analytics_events"]) {
    assert.equal(result.rows.find((row) => row.table === table).after, 0);
  }
  for (const call of w.bqCalls) {
    assert.deepEqual(call.args.slice(0, 4), ["--quiet", "--headless", "--project_id=catchdates-dev", "--location=asia-south1"]);
    assert.ok(!call.args.some((arg) => arg.includes(CASE_ORGANIZER)), "ids reach bq only as the parameter file");
  }
  const kinds = w.bqCalls.filter((call) => call.args.at(-1).includes("organizers_raw_changelog") ||
    call.args.at(-1) === "catch_analytics.organizers_raw_changelog")
    .map((call) => (call.args.includes("show") ? "show" : call.args.includes("--dry_run") ? "dry-run" :
      call.args.at(-1).split(" ").slice(0, 2).join(" ")));
  assert.deepEqual(kinds, ["show", "SELECT COUNT(*)", "SELECT *", "dry-run", "DELETE FROM", "SELECT COUNT(*)"]);
  assert.ok([...w.store.objects.keys()].some((key) => key.startsWith(`cases/${CASE_ID}/bigquery/`)), "rows preserved");
  assert.match(output, /\| catch_analytics\.organizers_raw_changelog \| 2 \| 3 rows \| 3 rows \| 0 rows \|/u);
});

test("bigquery refuses buffered tables and fails when rows remain", async () => {
  const w = world();
  await cli(w, "preserve");
  await cli(w, "apply");
  w.advance(91 * 60_000);
  fakeBq(w, {show: JSON.stringify({streamingBuffer: {oldestEntryTime: String(START + 3 * 60_000)}})});
  await assert.rejects(cli(w, "bigquery"), /streaming buffer still holds rows/u);
  fakeBq(w, {deleteError: "would affect rows in the streaming buffer"});
  await assert.rejects(cli(w, "bigquery"), /Nothing was deleted from it\. Retry later/u);
  fakeBq(w, {rowsRemain: true});
  await assert.rejects(cli(w, "bigquery"), /row\(s\) remain/u);
});

test("the BigQuery SQL is fixed, with ids only as @ids", () => {
  assert.deepEqual(statements("catch_analytics.organizers_raw_changelog", "document_id"), {
    count: "SELECT COUNT(*) AS row_count FROM `catch_analytics.organizers_raw_changelog` WHERE document_id IN UNNEST(@ids)",
    select: "SELECT * FROM `catch_analytics.organizers_raw_changelog` WHERE document_id IN UNNEST(@ids)",
    delete: "DELETE FROM `catch_analytics.organizers_raw_changelog` WHERE document_id IN UNNEST(@ids)",
  });
  assert.throws(() => statements("catch_analytics.x; DROP TABLE y", "document_id"));
  assert.throws(() => statements("catch_analytics.organizers_raw_changelog", "name"));
});
