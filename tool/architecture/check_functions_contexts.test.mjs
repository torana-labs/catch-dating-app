import assert from "node:assert/strict";
import test from "node:test";
import {loadContextMap} from "./check_context_map.mjs";
import {
  checkFunctionsContexts,
  foreignWrites,
  isCheckedSource,
  loadFunctionsContextMap,
  loadWriterContexts,
  placeFunctionsPath,
  relativeImports,
} from "./check_functions_contexts.mjs";
import {collectionWrites} from "./lib/functions_collection_writes.mjs";

const appMap = loadContextMap(JSON.stringify({
  roots: {
    contexts: "lib/contexts/",
    pages: "lib/pages/",
    kernel: "packages/kernel/lib/",
    platform: "packages/platform/lib/",
  },
  contexts: [
    {id: "events", owns: "Events."},
    {id: "payments", owns: "Payments."},
    {id: "bookings", owns: "Bookings."},
  ],
  legacy: [],
}));

function fixtureMap(overrides = {}) {
  return loadFunctionsContextMap(JSON.stringify({
    roots: {
      domain: "functions/src/domain/",
      surfaces: "functions/src/surfaces/",
      platform: "functions/src/platform/",
    },
    entry: ["functions/src/index.ts", "functions/src/*/functions.ts"],
    contexts: ["events", "bookings", {id: "supply", owns: "Listings."}],
    surfaces: [{id: "admin", owns: "Console."}, {id: "host", owns: "Host."}],
    legacy: [
      {path: "functions/src/shared/", layer: "platform"},
      {path: "functions/src/events/", context: "events"},
      {path: "functions/src/events/eventAttendees.ts", context: "bookings"},
      {path: "functions/src/admin/", surface: "admin"},
      {path: "functions/src/admin/listingPolicy.ts", context: "supply"},
      {path: "functions/src/hostReadModels/", surface: "host"},
    ],
    ...overrides,
  }), appMap);
}

function check(files, map = fixtureMap(), {keepStale = false} = {}) {
  const sources = new Map(Object.entries(files));
  const result = checkFunctionsContexts({files: sources, map,
    exists: (file) => sources.has(file)});
  return keepStale ? result : {...result,
    findings: result.findings.filter(({rule}) => rule !== "stalePlacement")};
}

test("places target roots, the longest legacy path, and the entry point", () => {
  const map = fixtureMap();
  assert.deepEqual(placeFunctionsPath("functions/src/index.ts", map), {layer: "entry"});
  // Area entries the entry point stars are entry files too, one folder deep only.
  assert.deepEqual(placeFunctionsPath("functions/src/operations/functions.ts", map), {layer: "entry"});
  assert.notDeepEqual(placeFunctionsPath("functions/src/operations/nested/functions.ts", map), {layer: "entry"});
  assert.deepEqual(placeFunctionsPath("functions/src/platform/adminAuth.ts", map),
    {layer: "platform"});
  assert.deepEqual(placeFunctionsPath("functions/src/domain/supply/approval.ts", map),
    {layer: "domain", context: "supply", target: true});
  assert.deepEqual(placeFunctionsPath("functions/src/surfaces/host/views.ts", map),
    {layer: "surface", surface: "host", target: true});
  assert.deepEqual(placeFunctionsPath("functions/src/events/eventAttendees.ts", map),
    {layer: "domain", context: "bookings"});
  assert.deepEqual(placeFunctionsPath("functions/src/events/eventAttendeesExtra.ts", map),
    {layer: "domain", context: "events"});
  assert.deepEqual(placeFunctionsPath("functions/src/admin/listingPolicy.ts", map),
    {layer: "domain", context: "supply"});
  assert.equal(placeFunctionsPath("functions/src/unknown/thing.ts", map), null);
});

test("checks handwritten sources only", () => {
  assert.equal(isCheckedSource("functions/src/events/a.ts"), true);
  assert.equal(isCheckedSource("functions/src/events/a.test.ts"), false);
  assert.equal(isCheckedSource("functions/src/shared/generated/types.ts"), false);
  assert.equal(isCheckedSource("functions/scripts/a.cjs"), false);
});

test("resolves static, re-export, side-effect, dynamic and index imports", () => {
  const known = new Set(["functions/src/shared/rateLimit.ts",
    "functions/src/operations/index.ts", "functions/src/events/policy.ts",
    "functions/src/events/side.ts", "functions/src/admin/lazy.ts"]);
  const imports = relativeImports("functions/src/events/a.ts", [
    "import {checkRateLimit} from \"../shared/rateLimit\";",
    "export {x} from \"../operations\";",
    "import type {",
    "  Policy,",
    "} from \"./policy\";",
    "import \"./side\";",
    "const lazy = () => import(\"../admin/lazy\");",
    "import admin from \"firebase-admin\";",
    " * import {notCode} from \"../admin/lazy\";",
  ].join("\n"), (file) => known.has(file));
  assert.deepEqual(imports.map(({target}) => target), [
    "functions/src/shared/rateLimit.ts",
    "functions/src/operations/index.ts",
    "functions/src/events/policy.ts",
    "functions/src/events/side.ts",
    "functions/src/admin/lazy.ts",
  ]);
  assert.equal(imports[2].line, 3);
});

test("passes downward imports", () => {
  const result = check({
    "functions/src/index.ts": "export {a} from \"./admin/a\";\n",
    "functions/src/shared/rateLimit.ts": "",
    "functions/src/platform/adminAuth.ts": "import \"../shared/rateLimit\";\n",
    "functions/src/events/policy.ts": "import \"../platform/adminAuth\";\n",
    "functions/src/events/eventAttendees.ts": "import \"./policy\";\n",
    "functions/src/admin/a.ts": "import \"../events/eventAttendees\";\nimport \"./b\";\n",
    "functions/src/admin/b.ts": "import \"../domain/supply/x\";\n",
    "functions/src/domain/supply/x.ts": "import \"../../events/policy\";\n",
    "functions/src/admin/listingPolicy.ts": "import \"../events/eventAttendees\";\n",
  });
  assert.deepEqual(result.findings, []);
  assert.equal(result.placed, 9);
  assert.deepEqual(result.contextOrder, []);
});

test("rejects upward and cross-surface imports", () => {
  const result = check({
    "functions/src/shared/x.ts": "import \"../events/policy\";\n",
    "functions/src/events/policy.ts": "import \"../admin/a\";\n",
    "functions/src/admin/a.ts": "import \"../hostReadModels/view\";\n",
    "functions/src/hostReadModels/view.ts": "import \"../index\";\n",
    "functions/src/index.ts": "",
  });
  assert.deepEqual(result.findings.map(({rule, path}) => `${rule} ${path}`), [
    "platformImportsUp functions/src/shared/x.ts",
    "domainImportsSurface functions/src/events/policy.ts",
    "surfaceImportsSurface functions/src/admin/a.ts",
    "entryImported functions/src/hostReadModels/view.ts",
  ]);
});

test("bounds imports against the context order by the ceiling", () => {
  const files = {
    "functions/src/events/policy.ts": "import \"./eventAttendees\";\n",
    "functions/src/events/eventAttendees.ts": "",
  };
  const strict = check(files);
  assert.equal(strict.contextOrder.length, 1);
  assert.deepEqual(strict.findings.map(({rule}) => rule), ["contextOrder"]);
  const bounded = check(files, fixtureMap({contextOrderViolationCeiling: 1}));
  assert.deepEqual(bounded.findings, []);
  assert.equal(bounded.contextOrder.length, 1);
});

test("reports unplaced modules, unknown target ids and stale placements", () => {
  const result = check({
    "functions/src/stray/a.ts": "",
    "functions/src/domain/nowhere/a.ts": "",
    "functions/src/surfaces/kiosk/a.ts": "",
    "functions/src/events/policy.ts": "",
  }, fixtureMap(), {keepStale: true});
  assert.deepEqual(result.findings.map(({rule, path}) => `${rule} ${path}`).sort(), [
    "stalePlacement tool/architecture/functions_context_map.json",
    "stalePlacement tool/architecture/functions_context_map.json",
    "stalePlacement tool/architecture/functions_context_map.json",
    "stalePlacement tool/architecture/functions_context_map.json",
    "stalePlacement tool/architecture/functions_context_map.json",
    "unknownContext functions/src/domain/nowhere/a.ts",
    "unknownSurface functions/src/surfaces/kiosk/a.ts",
    "unplaced functions/src/stray/a.ts",
  ]);
});

test("keeps the app's context order and vocabulary", () => {
  assert.throws(() => fixtureMap({contexts: ["bookings", "events"]}),
    /out of the order/u);
  assert.throws(() => fixtureMap({contexts: ["events", "payroll"]}),
    /not a context in tool\/architecture\/context_map.json/u);
  assert.throws(() => fixtureMap({contexts: [{id: "events", owns: "Again."}]}),
    /name it as a plain string/u);
  assert.throws(() => fixtureMap({contexts: ["events", {id: "supply"}]}),
    /must say what it owns/u);
  assert.throws(() => fixtureMap({legacy: [{path: "functions/src/x/", layer: "kernel"}]}),
    /may only name the platform layer/u);
  assert.throws(() => fixtureMap({legacy: [{path: "functions/src/x/", context: "events",
    surface: "admin"}]}), /exactly one of/u);
});

test("finds inline writes through refs, constants, helpers and transactions", () => {
  const writes = collectionWrites({files: new Map(Object.entries({
    "functions/src/shared/names.ts": "export const ATTENDEES = \"eventAttendees\";\n",
    "functions/src/events/refs.ts": [
      "export function bookingRef(db: Db, id: string) {",
      "  return db.collection(\"eventBookings\").doc(id);",
      "}",
    ].join("\n"),
    "functions/src/eventSuccess/live.ts": [
      "import {ATTENDEES} from \"../shared/names\";",
      "import {bookingRef} from \"../events/refs\";",
      "const collections = {plans: \"eventSuccessPlans\"} as const;",
      "async function run(db: Db, tx: Tx, id: string) {",
      "  const attendeeRef = db.collection(ATTENDEES).doc(id);",
      "  tx.update(attendeeRef, {status: \"checkedIn\"});",
      "  tx.set(bookingRef(db, id), {status: \"attended\"});",
      "  await db.collection(collections.plans).doc(id).set({});",
      "  await db.doc(`events/${id}`).update({checkedInCount: 1});",
      "  const snap = await tx.get(db.collection(\"blocks\").doc(id));",
      "  tx.delete(snap.ref);",
      "  await db.collection(\"reads\").doc(id).get();",
      "}",
    ].join("\n"),
  }))});
  const names = [...writes.keys()].sort();
  assert.deepEqual(names, ["blocks", "eventAttendees", "eventBookings",
    "eventSuccessPlans", "events"]);
  assert.deepEqual([...writes.get("eventBookings").keys()],
    ["functions/src/eventSuccess/live.ts"]);
});

test("reads one writer context per registry collection", () => {
  const map = fixtureMap();
  const {byName, findings} = loadWriterContexts(JSON.stringify({collections: [
    {id: "eventBookings", path: "eventBookings/{id}", writerContext: "bookings"},
    {id: "deliveryMessages", path: "deliveryMessages/{id}", writerContext: "shared",
      sharedWriterReason: "One outbox every context enqueues to."},
    {id: "chat_messages", path: "matches/{m}/messages/{id}", writerContext: "events"},
    {id: "orphan", path: "orphan/{id}"},
    {id: "loose", path: "loose/{id}", writerContext: "shared"},
  ]}), map);
  assert.deepEqual([...byName.keys()],
    ["eventBookings", "deliveryMessages", "messages", "loose"]);
  assert.deepEqual(findings.map(({reason}) => reason.split(" ")[0]), ["orphan", "loose"]);
});

test("reports writes from outside the owning context, not shared outboxes", () => {
  const map = fixtureMap();
  const writes = new Map([
    ["eventBookings", new Map([["functions/src/events/eventAttendees.ts", 1],
      ["functions/src/events/policy.ts", 2]])],
    ["deliveryMessages", new Map([["functions/src/events/policy.ts", 1]])],
    ["unregistered", new Map([["functions/src/events/policy.ts", 1]])],
  ]);
  const writers = new Map([["eventBookings", new Set(["bookings"])],
    ["deliveryMessages", new Set(["shared"])]]);
  const foreign = foreignWrites({writes, writers, map});
  assert.deepEqual(foreign.map(({path, reason}) => `${path}: ${reason}`), [
    "functions/src/events/policy.ts: domain context events writes eventBookings, which bookings owns",
  ]);
});
