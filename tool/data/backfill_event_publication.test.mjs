import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {applyEventPublication, classifyEventPublication, parsePublicationArgs,
  planEventPublication} from "./backfill_event_publication.mjs";

const fixture = JSON.parse(readFileSync(new URL(
  "../../contracts/fixtures/valid/event_doc.json", import.meta.url), "utf8"));
const event = (patch = {}) => ({...structuredClone(fixture), ...patch});
const historicalLocationEvent = (patch = {}) => {
  const source = event(patch);
  delete source.meetingLocation;
  return source;
};

function database(values) {
  const rows = new Map(values.map(([id, data]) => [id, {data, version: 1}]));
  const writes = [];
  const limits = [];
  const snapshot = (id) => ({id, exists: rows.has(id),
    updateTime: {seconds: rows.get(id)?.version ?? 0, nanoseconds: 0},
    data: () => structuredClone(rows.get(id)?.data)});
  function query(after = "", limit = Infinity) {
    return {orderBy: (field) => {assert.equal(field, "__name__"); return query(after, limit);},
      limit: (count) => {limits.push(count); return query(after, count);},
      startAfter: (doc) => query(doc.id, limit),
      get: async () => ({docs: [...rows.keys()].sort().filter((id) => id > after)
        .slice(0, limit).map(snapshot)}),
      doc: (id) => ({id})};
  }
  return {rows, writes, limits,
    collection: (name) => {assert.equal(name, "events"); return query();},
    runTransaction: async (run) => {
      const staged = [];
      await run({get: async (ref) => snapshot(ref.id),
        update: (ref, patch) => staged.push([ref.id, patch])});
      for (const [id, patch] of staged) {
        const row = rows.get(id);
        row.data = {...row.data, ...patch};
        row.version++;
        writes.push([id, patch]);
      }
    },
  };
}

test("legacy migration validates the complete canonical document", () => {
  assert.equal(classifyEventPublication(event()).action, "publish");
  assert.equal(classifyEventPublication(event({organizerId: "club-1"})).action, "publish");
  for (const patch of [{organizerId: null}, {pace: "bogus"},
    {startTime: null}, {capacityLimit: undefined}, {unknownField: true}]) {
    assert.equal(classifyEventPublication(event(patch)).action, "blocked");
  }
});

test("only the exact historical missing-location signature is publishable", () => {
  const missing = classifyEventPublication(historicalLocationEvent());
  assert.equal(missing.action, "publish");
  assert.equal(missing.reason, "legacy_public_event_location_drift");
  assert.ok(missing.validationIssues.includes("/meetingLocation:required"));

  const nullLocation = classifyEventPublication(historicalLocationEvent({
    startingPointLat: null, startingPointLng: null, discoveryGeoCell: null,
  }));
  assert.equal(nullLocation.action, "publish");
  assert.equal(nullLocation.reason, "legacy_public_event_location_drift");
  for (const patch of [
    {startingPointLat: "north"}, {startingPointLat: 999},
    {startingPointLng: "east"}, {discoveryGeoCell: 42},
    {unknownField: true}, {capacityLimit: undefined},
    {setupRevision: 1},
    {publicRegistrationEnabled: false},
  ]) {
    assert.equal(classifyEventPublication(historicalLocationEvent(patch)).action,
      "blocked", JSON.stringify(patch));
  }
});

test("historical location apply writes only publication and rejects stale source", async () => {
  const source = historicalLocationEvent({startingPointLat: null,
    startingPointLng: null, discoveryGeoCell: null});
  const db = database([["legacy", source]]);
  const plan = await planEventPublication(db, {projectId: "demo"});
  assert.equal(plan.records[0].reason, "legacy_public_event_location_drift");
  db.rows.get("legacy").version++;
  await assert.rejects(applyEventPublication(db, plan,
    {projectId: "demo", expectedDigest: plan.digest}), /changed/);
  assert.deepEqual(db.writes, []);

  const fresh = await planEventPublication(db, {projectId: "demo"});
  await applyEventPublication(db, fresh, {projectId: "demo",
    expectedDigest: fresh.digest});
  assert.deepEqual(db.writes, [["legacy", {publicationState: "published"}]]);
  assert.deepEqual(db.rows.get("legacy").data,
    {...source, publicationState: "published"});
});

test("private and published records are untouched; malformed setup never becomes public", () => {
  for (const publicationState of ["private", "published"]) {
    assert.equal(classifyEventPublication({publicationState}).action, "skip");
  }
  for (const patch of [{publicationState: null}, {publicationState: "draft"},
    {setupRevision: null}, {setupRevision: 1}, {setupDefaults: {}},
    {eventLocalDate: "2026-09-24"}, {publicRegistrationEnabled: false}]) {
    assert.equal(classifyEventPublication(event(patch)).action, "blocked");
  }
});

test("dry run pages every document, records exact versions and never writes", async () => {
  const db = database(Array.from({length: 205}, (_, index) =>
    [String(index).padStart(3, "0"), event()]));
  const plan = await planEventPublication(db, {projectId: "demo-publication"});
  assert.equal(plan.scanned, 205);
  assert.equal(plan.publish, 205);
  assert.equal(plan.blocked, 0);
  assert.match(plan.digest, /^[a-f0-9]{64}$/);
  assert.ok(db.limits.length >= 3);
  assert.ok(db.limits.every((limit) => limit <= 100));
  assert.deepEqual(db.writes, []);
  assert.equal((await planEventPublication(db, {projectId: "other"})).digest === plan.digest, false);
});

test("scan overflow cannot produce a complete plan or any writes", async () => {
  const db = database([["a", event()], ["b", event()]]);
  await assert.rejects(planEventPublication(db, {projectId: "demo", maxEvents: 1}), /bound exceeded/);
  assert.deepEqual(db.writes, []);
});

test("apply changes only publication; cancelled lifecycle and booking data survive", async () => {
  const cancelled = event({status: "cancelled", cancellationReason: "weather",
    cancelledAt: {_seconds: 1778889600, _nanoseconds: 0}});
  const db = database([["cancelled", cancelled], ["private", {publicationState: "private"}]]);
  const plan = await planEventPublication(db, {projectId: "demo"});
  assert.deepEqual(await applyEventPublication(db, plan,
    {projectId: "demo", expectedDigest: plan.digest}), {applied: 1});
  assert.deepEqual(db.writes, [["cancelled", {publicationState: "published"}]]);
  assert.deepEqual(db.rows.get("cancelled").data, {...cancelled, publicationState: "published"});
  assert.equal((await planEventPublication(db, {projectId: "demo"})).publish, 0);
});

test("any blocked row prevents all planned writes", async () => {
  const db = database([["a", event()], ["z", event({setupRevision: 1})]]);
  const plan = await planEventPublication(db, {projectId: "demo"});
  await assert.rejects(applyEventPublication(db, plan,
    {projectId: "demo", expectedDigest: plan.digest}), /Blocked documents/);
  assert.deepEqual(db.writes, []);
});

test("wrong target, missing digest, modified plan and stale review cannot apply", async () => {
  const db = database([["a", event()]]);
  const plan = await planEventPublication(db, {projectId: "demo"});
  for (const options of [{projectId: "foreign", expectedDigest: plan.digest},
    {projectId: "demo"}, {projectId: "demo", expectedDigest: "0".repeat(64)}]) {
    await assert.rejects(applyEventPublication(db, plan, options), /digest/);
  }
  const changed = structuredClone(plan);
  changed.records[0].sourceVersion = "7:0";
  await assert.rejects(applyEventPublication(db, changed,
    {projectId: "demo", expectedDigest: plan.digest}), /digest/);
  assert.deepEqual(db.writes, []);
});

test("a concurrent private transition is rejected inside the write transaction", async () => {
  const db = database([["a", event()]]);
  const plan = await planEventPublication(db, {projectId: "demo"});
  db.rows.get("a").data.publicationState = "private";
  db.rows.get("a").version++;
  await assert.rejects(applyEventPublication(db, plan,
    {projectId: "demo", expectedDigest: plan.digest}), /changed/);
  assert.deepEqual(db.writes, []);
  assert.equal(db.rows.get("a").data.publicationState, "private");
});

test("deletion and unrelated concurrent edits stop stale apply", async () => {
  for (const remove of [false, true]) {
    const db = database([["a", event()]]);
    const plan = await planEventPublication(db, {projectId: "demo"});
    if (remove) db.rows.delete("a");
    else db.rows.get("a").version++;
    await assert.rejects(applyEventPublication(db, plan,
      {projectId: "demo", expectedDigest: plan.digest}), /changed/);
    assert.deepEqual(db.writes, []);
  }
});

test("partial progress is visible and resumes only through a fresh reviewed plan", async () => {
  const db = database([["a", event()], ["b", event()]]);
  const old = await planEventPublication(db, {projectId: "demo"});
  db.rows.get("b").version++;
  await assert.rejects(applyEventPublication(db, old,
    {projectId: "demo", expectedDigest: old.digest}), /changed/);
  assert.equal(db.writes.length, 1);
  const current = await planEventPublication(db, {projectId: "demo"});
  assert.equal(current.publish, 1);
  assert.notEqual(current.digest, old.digest);
  await applyEventPublication(db, current, {projectId: "demo", expectedDigest: current.digest});
  assert.equal(db.writes.length, 2);
});

test("CLI is explicit-target and dry-run by default, rejects incomplete apply", () => {
  assert.equal(parsePublicationArgs(["--project", "demo"]).apply, false);
  for (const args of [[], ["--env", "prod"], ["--project", "demo", "--apply"],
    ["--project", "demo", "--max-events", "0"],
    ["--project", "demo", "--max-events", "50001"],
    ["--project", "demo", "--max-events", "2.5"]]) {
    assert.throws(() => parsePublicationArgs(args));
  }
});


test("blocked legacy diagnostics expose invalid paths without source values", () => {
  const result = classifyEventPublication(event({startTime: null,
    meetingPoint: "private source text"}));
  assert.equal(result.action, "blocked");
  assert.ok(result.validationIssues.some((issue) => issue.startsWith("/startTime:")));
  assert.ok(!JSON.stringify(result).includes("private source text"));
});


test("missing-field diagnostics name the schema field without values", () => {
  const source = event({meetingPoint: "private source text"});
  delete source.capacityLimit;
  const result = classifyEventPublication(source);
  assert.equal(result.action, "blocked");
  assert.ok(result.validationIssues.includes("/capacityLimit:required"));
  assert.ok(!JSON.stringify(result).includes("private source text"));
});
