import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {main, parseWithdrawArgs} from "./listing_cohort_withdraw.mjs";
import {
  AUDIT_ACTION,
  AUDIT_ACTOR,
  CITY_SLUG_PATTERN,
  COHORT_ID_PATTERN,
  ORGANIZER_FIELDS,
  WITHDRAW_PATCH,
  buildManifest,
  classify,
  isClaimed,
  manifestSha256,
} from "./lib/listing_cohort_withdraw/withdraw.mjs";
import {SERVER_TIMESTAMP, createFakeFirestore, fakeServerTimestamp} from "./fixtures/listing_cohort_withdraw/fakes.mjs";
import {
  CLAIMED_OWNER,
  CLAIMED_VERIFIED,
  COHORT_ID,
  DRAFT,
  IDENTIFYING,
  NO_COHORT,
  OTHER_COHORT,
  PUBLIC_BHOPAL_PENDING,
  PUBLIC_INDORE,
  REMOVED,
  SLUG_ID_INDORE,
  SUPPRESSED,
  WITHDRAWABLE,
  cohortWorld,
} from "./fixtures/listing_cohort_withdraw/world.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function world() {
  const db = createFakeFirestore(cohortWorld());
  return {db, deps: {db, serverTimestamp: fakeServerTimestamp}};
}

/** Runs the CLI against the fake and captures everything it prints. */
async function cli(w, argv) {
  const lines = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...values) => lines.push(values.join(" "));
  console.error = (...values) => lines.push(values.join(" "));
  try {
    const result = await main(["--env", "dev", "--cohort-id", COHORT_ID, ...argv], w.deps);
    return {result, output: lines.join("\n")};
  } catch (error) {
    error.output = lines.join("\n");
    throw error;
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

async function plan(w, extra = []) {
  return cli(w, ["--mode", "plan", ...extra]);
}

function assertCountsOnly(output) {
  for (const value of IDENTIFYING) assert.ok(!output.includes(value), `output names ${JSON.stringify(value)}`);
}

function hashFrom(output) {
  const match = /SHA-256 ([0-9a-f]{64})/u.exec(output);
  assert.ok(match, "plan prints the manifest SHA-256");
  return match[1];
}

function auditRows(db) {
  return [...db.docs.entries()].filter(([key, value]) => key.startsWith("adminAuditLogs/") && value.action === AUDIT_ACTION);
}

function snapshotOf(db) {
  return JSON.stringify([...db.docs.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

test("arguments take an environment, a mode, a contract-shaped cohort id and an optional city slug", () => {
  assert.throws(() => parseWithdrawArgs(["--cohort-id", COHORT_ID]), /--env/u);
  assert.equal(parseWithdrawArgs(["--env", "dev", "--cohort-id", COHORT_ID]).mode, "plan", "plan is the default");
  for (const cohortId of ["", "PILOT-1", "pilot indore", "-pilot", "pilot-", "a", "pilot/indore", "Brindle Run Club"]) {
    assert.throws(() => parseWithdrawArgs(["--env", "dev", "--cohort-id", cohortId]), /--cohort-id/u, cohortId);
  }
  assert.throws(() => parseWithdrawArgs(["--env", "dev", "--cohort-id", COHORT_ID, "--mode", "delete"]), /--mode/u);
  assert.throws(() => parseWithdrawArgs(["--env", "dev", "--cohort-id", COHORT_ID, "--city", "Indore"]), /--city/u);
  assert.throws(() => parseWithdrawArgs(["--env", "dev", "--cohort-id", COHORT_ID, "--apply"]), /--mode apply/u);
  assert.throws(() => parseWithdrawArgs(["--env", "dev", "--cohort-id", COHORT_ID, "--mode", "apply"]),
    /--manifest-sha256/u);
  assert.throws(() => parseWithdrawArgs(["--env", "dev", "--cohort-id", COHORT_ID, "--manifest-sha256", "a".repeat(64)]),
    /apply only/u);
  assert.throws(() => parseWithdrawArgs(["--env", "dev", "--cohort-id", COHORT_ID, "--organizer", PUBLIC_INDORE]));
});

test("the cohort and city patterns match the shared contracts", () => {
  const listing = JSON.parse(fs.readFileSync(path.join(root, "contracts/shared/listing_program_common.schema.json"), "utf8"));
  assert.equal(COHORT_ID_PATTERN.source, listing.definitions.cohortId.pattern);
  const profile = JSON.parse(fs.readFileSync(path.join(root, "contracts/shared/profile_common.schema.json"), "utf8"));
  assert.equal(profile.definitions.strictCitySlug.pattern, "^[a-z0-9-]+$");
  assert.equal(profile.definitions.strictCitySlug.maxLength, 80);
  assert.ok(CITY_SLUG_PATTERN.test("indore") && !CITY_SLUG_PATTERN.test("x".repeat(81)));
});

test("the patch matches the single-organiser suspend and the projection reads no name", () => {
  assert.deepEqual(WITHDRAW_PATCH, {"publicPage.publishStatus": "suppressed", "publicPage.indexStatus": "noindex",
    "publicPage.robots": "noindex, follow"});
  for (const field of ORGANIZER_FIELDS) {
    assert.doesNotMatch(field, /name|handle|source|contact|email|phone|(^|\.)slug$|canonicalPath|legacyPaths|seo|instagram/iu, field);
  }
});

test("claimed means an owner took it; a pending claim is not a claim", () => {
  assert.equal(isClaimed({}), false);
  assert.equal(isClaimed({claim: {state: "claimPending"}}), false);
  assert.equal(isClaimed({claim: {state: "unclaimed"}, ownership: {state: "programmatic", ownerUserId: null}}), false);
  for (const organizer of [{ownerUserId: "u"}, {hostUserId: "u"}, {ownership: {ownerUserId: "u"}},
    {ownership: {state: "claimed"}}, {ownership: {state: "transferred"}}, {claim: {state: "claimed"}},
    {claim: {state: "verified"}}]) {
    assert.equal(isClaimed(organizer), true, JSON.stringify(organizer));
  }
  const published = {publicPage: {publishStatus: "published"}};
  assert.equal(classify("a", published, new Set()), "withdraw");
  assert.equal(classify("a", {...published, ownerUserId: "u"}, new Set()), "claimed");
  assert.equal(classify("a", {publicPage: {publishStatus: "suppressed"}}, new Set()), "alreadyOff");
  assert.equal(classify("a", {publicPage: {publishStatus: "suppressed"}}, new Set(["a"])), "alreadyWithdrawn");
  assert.equal(classify("a", {publicPage: {publishStatus: "qa"}}, new Set()), "notPublished");
  assert.equal(classify("a", {}, new Set()), "notPublished");
});

test("the manifest hash binds the cohort, the city filter and the exact ids, in any order", () => {
  const base = buildManifest({cohortId: COHORT_ID, city: null, organizerIds: ["b", "a"]});
  assert.deepEqual(base.organizerIds, ["a", "b"]);
  const hash = manifestSha256(base);
  assert.match(hash, /^[0-9a-f]{64}$/u);
  assert.equal(manifestSha256(buildManifest({cohortId: COHORT_ID, city: null, organizerIds: ["a", "b"]})), hash);
  for (const changed of [{cohortId: "pilot-indore-2", city: null, organizerIds: ["a", "b"]},
    {cohortId: COHORT_ID, city: "indore", organizerIds: ["a", "b"]},
    {cohortId: COHORT_ID, city: null, organizerIds: ["a"]},
    {cohortId: COHORT_ID, city: null, organizerIds: ["a", "b", "c"]}]) {
    assert.notEqual(manifestSha256(buildManifest(changed)), hash, JSON.stringify(changed));
  }
});

test("plan selects public, unclaimed cohort pages, counts the rest, prints counts only and writes nothing", async () => {
  const w = world();
  const before = snapshotOf(w.db);
  const {result, output} = await plan(w);
  const {summary} = result;
  assert.equal(summary.matched, 8, "only the cohort's organisers match");
  assert.equal(summary.withdraw, 3);
  assert.equal(summary.claimPending, 1, "a pending claim is withdrawn and counted");
  assert.equal(summary.claimed, 2);
  assert.equal(summary.alreadyOff, 2);
  assert.equal(summary.alreadyWithdrawn, 0);
  assert.equal(summary.notPublished, 1);
  assert.deepEqual(summary.byCity, {bhopal: {matched: 2, withdraw: 1}, indore: {matched: 6, withdraw: 2}});
  assert.equal(summary.manifestOrganizers, 3);
  assert.equal(summary.sha256, manifestSha256(buildManifest({cohortId: COHORT_ID, city: null, organizerIds: WITHDRAWABLE})));
  assert.equal(snapshotOf(w.db), before, "plan writes nothing");
  assert.equal(w.db.log.transactions, 0);
  assert.match(output, /Matched in cohort: 8\nWould withdraw: 3\n/u);
  assert.match(output, /Skipped, claimed by their owner: 2/u);
  assert.match(output, /Skipped, already suppressed or removed: 2/u);
  assert.match(output, /  indore: matched 6, would withdraw 2/u);
  assert.match(output, /Dry run only\. Nothing was changed\./u);
  assert.equal(hashFrom(output), summary.sha256);
  assertCountsOnly(output);
  // Every read is a field projection, and none names the organiser.
  assert.ok(w.db.log.projections.length > 0);
  for (const fields of w.db.log.projections) {
    assert.ok(Array.isArray(fields), "every read is projected");
    assert.ok(!fields.includes("name") && !fields.includes("instagramHandle") && !fields.includes("publicSources"));
  }
});

test("the city filter narrows the selection and changes the hash", async () => {
  const w = world();
  const all = (await plan(w)).result.summary;
  const {result, output} = await plan(w, ["--city", "indore"]);
  assert.equal(result.summary.matched, 6);
  assert.equal(result.summary.withdraw, 2);
  assert.deepEqual(Object.keys(result.summary.byCity), ["indore"]);
  assert.notEqual(result.summary.sha256, all.sha256);
  assert.match(output, /City filter: indore/u);
  assertCountsOnly(output);
});

test("--manifest-out writes the ids to a local file only, and the output still names nobody", async () => {
  const w = world();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cohort-withdraw-"));
  try {
    const file = path.join(directory, "nested", "manifest.json");
    const {result, output} = await plan(w, ["--manifest-out", file]);
    const written = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.deepEqual(written.organizerIds, WITHDRAWABLE);
    assert.equal(written.sha256, result.summary.sha256);
    assert.equal(manifestSha256(written), written.sha256, "the file re-hashes to the printed hash");
    assertCountsOnly(output);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test("apply refuses a hash that is not the current plan's and writes nothing", async () => {
  const w = world();
  const before = snapshotOf(w.db);
  for (const wrong of ["0".repeat(64), manifestSha256(buildManifest({cohortId: COHORT_ID, city: "indore",
    organizerIds: WITHDRAWABLE}))]) {
    await assert.rejects(cli(w, ["--mode", "apply", "--manifest-sha256", wrong]), (error) => {
      assert.match(error.message, /no longer matches the approved plan/u);
      assert.doesNotMatch(error.output, /SHA-256 [0-9a-f]{64}/u, "a refused apply never prints a hash to copy");
      assertCountsOnly(error.output);
      return true;
    });
  }
  await assert.rejects(cli(w, ["--mode", "apply", "--manifest-sha256", "not-a-hash"]), /64-character/u);
  assert.equal(snapshotOf(w.db), before);
  assert.equal(w.db.log.transactions, 0);
});

test("apply refuses when the cohort changed after the approved plan", async () => {
  const w = world();
  const approved = hashFrom((await plan(w)).output);
  // An owner claims one page between the plan and the apply.
  w.db.docs.get(`organizers/${PUBLIC_INDORE}`).claim.state = "claimed";
  const before = snapshotOf(w.db);
  await assert.rejects(cli(w, ["--mode", "apply", "--manifest-sha256", approved]), /no longer matches/u);
  assert.equal(snapshotOf(w.db), before);
});

test("apply needs --allow-prod in prod", async () => {
  const w = world();
  await assert.rejects(main(["--env", "prod", "--cohort-id", COHORT_ID, "--mode", "apply",
    "--manifest-sha256", "0".repeat(64)], w.deps), /--allow-prod/u);
  assert.equal(w.db.log.transactions, 0);
});

test("apply withdraws exactly the approved pages, audits each one and leaves everything else alone", async () => {
  const w = world();
  const approved = hashFrom((await plan(w)).output);
  const untouched = [CLAIMED_OWNER, CLAIMED_VERIFIED, SUPPRESSED, REMOVED, DRAFT, OTHER_COHORT, NO_COHORT]
    .map((id) => [id, JSON.stringify(w.db.docs.get(`organizers/${id}`))]);
  const {result, output} = await cli(w, ["--mode", "apply", "--manifest-sha256", approved, "--request-id", "actions-run-42"]);
  assert.deepEqual(result.result, {withdrawn: 3, changedSincePlan: 0, transactions: 1});
  assert.equal(result.after.withdraw, 0);
  assert.equal(result.after.alreadyWithdrawn, 3);
  assert.equal(result.after.sha256, approved, "the withdrawn pages keep the approved hash valid");
  for (const id of WITHDRAWABLE) {
    const page = w.db.docs.get(`organizers/${id}`).publicPage;
    assert.equal(page.publishStatus, "suppressed", id);
    assert.equal(page.indexStatus, "noindex", id);
    assert.equal(page.robots, "noindex, follow", id);
    assert.ok(page.slug.length > 0 && page.canonicalPath.length > 0, "the rest of the page is kept");
  }
  for (const [id, before] of untouched) assert.equal(JSON.stringify(w.db.docs.get(`organizers/${id}`)), before, id);
  const rows = auditRows(w.db);
  assert.deepEqual(rows.map(([, row]) => row.targetPath).sort(), WITHDRAWABLE.map((id) => `organizers/${id}`));
  for (const [, row] of rows) {
    assert.equal(row.actorUid, AUDIT_ACTOR);
    assert.deepEqual(row.roles, ["adminOwner"]);
    assert.deepEqual(row.createdAt, SERVER_TIMESTAMP);
    assert.equal(row.requestId, "actions-run-42");
    assert.deepEqual(row.after, {publishStatus: "suppressed", indexStatus: "noindex", robots: "noindex, follow",
      cohortId: COHORT_ID, reason: "cohortWithdrawal", manifestSha256: approved});
    assert.deepEqual(Object.keys(row).sort(),
      ["action", "actorUid", "after", "before", "createdAt", "note", "requestId", "roles", "targetPath"]);
  }
  const indexed = rows.find(([, row]) => row.targetPath === `organizers/${PUBLIC_INDORE}`)[1];
  assert.deepEqual(indexed.before, {publishStatus: "published", indexStatus: "indexed", robots: "index, follow"});
  assert.match(output, /Applied: 3 withdrawn, 0 skipped \(changed since the plan\), 1 transaction\(s\), 3 audit row\(s\)\./u);
  assert.match(output, /Re-checked after apply: would withdraw 0, already withdrawn 3\./u);
  assertCountsOnly(output);
});

test("a re-run of the same approved apply changes nothing, and verify passes", async () => {
  const w = world();
  const approved = hashFrom((await plan(w)).output);
  await cli(w, ["--mode", "apply", "--manifest-sha256", approved]);
  const after = snapshotOf(w.db);
  const again = await cli(w, ["--mode", "apply", "--manifest-sha256", approved]);
  assert.deepEqual(again.result.result, {withdrawn: 0, changedSincePlan: 0, transactions: 0});
  assert.equal(snapshotOf(w.db), after, "nothing written, no second audit row");
  assert.equal(auditRows(w.db).length, 3);
  const replanned = await plan(w);
  assert.equal(replanned.result.summary.withdraw, 0);
  assert.equal(replanned.result.summary.alreadyWithdrawn, 3);
  assert.match(replanned.output, /Nothing to withdraw\./u);
  const verified = await cli(w, ["--mode", "verify"]);
  assert.match(verified.output, /Verify: passed/u);
  assertCountsOnly(verified.output + again.output + replanned.output);
});

test("verify fails while a public, unclaimed cohort page is left", async () => {
  const w = world();
  await assert.rejects(cli(w, ["--mode", "verify"]), (error) => {
    assert.match(error.output, /Verify: FAILED/u);
    assertCountsOnly(error.output);
    return true;
  });
});

test("an interrupted apply resumes with the same hash and finishes the rest", async () => {
  const w = world();
  const approved = hashFrom((await plan(w)).output);
  // A first run that withdrew one page before stopping, as its audit row shows.
  w.db.docs.get(`organizers/${SLUG_ID_INDORE}`).publicPage.publishStatus = "suppressed";
  w.db.docs.set("adminAuditLogs/log-earlier", {actorUid: AUDIT_ACTOR, roles: ["adminOwner"], action: AUDIT_ACTION,
    targetPath: `organizers/${SLUG_ID_INDORE}`, createdAt: "2026-11-19T07:00:00.000Z", after: {cohortId: COHORT_ID}});
  const {result} = await cli(w, ["--mode", "apply", "--manifest-sha256", approved]);
  assert.equal(result.summary.alreadyWithdrawn, 1);
  assert.deepEqual(result.result, {withdrawn: 2, changedSincePlan: 0, transactions: 1});
  assert.equal(auditRows(w.db).length, 3);
});

test("each page is re-checked at write time and skipped if it changed after the plan", async () => {
  const w = world();
  const approved = hashFrom((await plan(w)).output);
  // Between the apply's own plan read and its transaction, one page is claimed
  // and another is taken down by hand.
  w.db.beforeTransaction = () => {
    w.db.docs.get(`organizers/${PUBLIC_INDORE}`).ownerUserId = "uid-owner-2";
    w.db.docs.get(`organizers/${PUBLIC_BHOPAL_PENDING}`).publicPage.publishStatus = "removed";
  };
  const {result, output} = await cli(w, ["--mode", "apply", "--manifest-sha256", approved]);
  assert.deepEqual(result.result, {withdrawn: 1, changedSincePlan: 2, transactions: 1});
  assert.equal(w.db.docs.get(`organizers/${PUBLIC_INDORE}`).publicPage.publishStatus, "published");
  assert.equal(w.db.docs.get(`organizers/${PUBLIC_BHOPAL_PENDING}`).publicPage.publishStatus, "removed");
  assert.equal(w.db.docs.get(`organizers/${SLUG_ID_INDORE}`).publicPage.publishStatus, "suppressed");
  assert.deepEqual(auditRows(w.db).map(([, row]) => row.targetPath), [`organizers/${SLUG_ID_INDORE}`]);
  assert.match(output, /1 withdrawn, 2 skipped \(changed since the plan\)/u);
  assertCountsOnly(output);
});

test("large cohorts are written in transactions of at most 100 organisers", async () => {
  const docs = {};
  for (let index = 0; index < 205; index += 1) {
    const id = `org-brindle-bulk-${String(index).padStart(3, "0")}`;
    docs[`organizers/${id}`] = {name: `Brindle ${index}`, listingProgram: {cohortId: COHORT_ID},
      publicPage: {publishStatus: "published", indexStatus: "indexed", robots: "index, follow", citySlug: "indore"}};
  }
  const db = createFakeFirestore(docs);
  const w = {db, deps: {db, serverTimestamp: fakeServerTimestamp}};
  const {result: planned, output} = await plan(w);
  assert.equal(planned.summary.withdraw, 205, "paging reads past the first page");
  const {result} = await cli(w, ["--mode", "apply", "--manifest-sha256", hashFrom(output)]);
  assert.deepEqual(result.result, {withdrawn: 205, changedSincePlan: 0, transactions: 3});
  assert.equal(auditRows(db).length, 205);
});

test("an unexpected Firestore error reaches the code-only CLI handler unchanged", async () => {
  const w = world();
  const failing = {...w.deps, db: {collection: () => {
    throw Object.assign(new Error(`organizers/${SLUG_ID_INDORE} failed`), {code: "unavailable"});
  }}};
  await assert.rejects(main(["--env", "dev", "--cohort-id", COHORT_ID], failing), (error) => {
    assert.equal(error.code, "unavailable");
    return true;
  });
});
