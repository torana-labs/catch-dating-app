import assert from "node:assert/strict";
import test from "node:test";

import * as contractValidators from
  "../contracts/generated/schema_contract_validators.mjs";
import {deriveClientCallables} from "./check_client_callable_dependencies.mjs";
import {
  assertSyntheticFixture,
  buildSyntheticProbePlan,
  formatProbeReport,
  parseArgs,
  probeCallableStep,
  probeFirestoreStep,
  runSyntheticProbe,
} from "./synthetic_backend_probe.mjs";

const now = new Date("2026-10-22T12:00:00.000Z");
const fixture = {uid: "synthetic-host", organizerId: "synthetic-organizer"};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json"},
  });
}

test("arguments fail closed for production and missing fixtures", () => {
  assert.deepEqual(
    parseArgs(["--env", "dev"], {
      CATCH_SYNTHETIC_PROBE_UID: "synthetic-host",
      CATCH_SYNTHETIC_PROBE_ORGANIZER_ID: "synthetic-organizer",
    }),
    {
      allowProd: false,
      allowProdCallables: false,
      apply: false,
      environment: "dev",
      help: false,
      json: false,
      organizerId: "synthetic-organizer",
      uid: "synthetic-host",
    },
  );
  const usage = (argv) => assert.throws(
    () => parseArgs(argv, {}),
    (error) => error.exitCode === 64,
  );
  usage(["--uid", "u", "--organizer-id", "o"]);
  usage(["--env", "dev"]);
  usage(["--env", "prod", "--uid", "u", "--organizer-id", "o", "--apply"]);
  usage([
    "--env", "dev", "--uid", "u", "--organizer-id", "o",
    "--allow-prod-callables",
  ]);
  usage(["--env", "dev", "--uid", "u", "--organizer-id", "o", "--write"]);
  assert.equal(
    parseArgs([
      "--env", "prod", "--uid", "u", "--organizer-id", "o",
      "--apply", "--allow-prod",
    ], {}).allowProd,
    true,
  );
});

test("production runs only rules-checked reads unless callables are allowed", () => {
  const prod = buildSyntheticProbePlan({...fixture, environment: "prod", now});
  assert.deepEqual(prod.callables, []);
  assert.deepEqual(prod.firestore.map((step) => step.id), [
    "own-user-profile",
    "selected-organizer",
    "owned-organizers",
    "hosted-organizers",
    "active-organizer-events",
  ]);
  for (const environment of ["dev"]) {
    assert.equal(
      buildSyntheticProbePlan({...fixture, environment, now}).callables.length,
      1,
    );
  }
  assert.equal(
    buildSyntheticProbePlan({
      ...fixture,
      environment: "prod",
      now,
      allowProdCallables: true,
    }).callables.length,
    1,
  );
});

test("the events read mirrors the Host active-events query and its index", () => {
  const events = buildSyntheticProbePlan({...fixture, environment: "prod", now})
    .firestore.find((step) => step.id === "active-organizer-events");
  assert.deepEqual(
    events.query.where.compositeFilter.filters.map(
      (filter) => [filter.fieldFilter.field.fieldPath, filter.fieldFilter.op],
    ),
    [
      ["publicationState", "EQUAL"],
      ["organizerId", "EQUAL"],
      ["status", "EQUAL"],
      ["endTime", "GREATER_THAN"],
    ],
  );
  assert.equal(
    events.query.where.compositeFilter.filters[3].fieldFilter.value
      .timestampValue,
    now.toISOString(),
  );
  assert.deepEqual(
    events.query.orderBy.map((order) => order.field.fieldPath),
    ["endTime", "__name__"],
  );
});

test("callable steps send contract-valid payloads to app-referenced callables", () => {
  const {callables} = buildSyntheticProbePlan({...fixture, environment: "dev", now});
  const appCallables = new Set(deriveClientCallables({surfaces: ["app"]}).callables);
  for (const step of callables) {
    const payloadValidator =
      contractValidators[`validate${step.name[0].toUpperCase()}` +
        `${step.name.slice(1)}CallablePayload`];
    assert.equal(typeof payloadValidator, "function", step.name);
    assert.ok(payloadValidator(step.payload), step.name);
    assert.equal(
      typeof contractValidators[step.responseValidator],
      "function",
      step.responseValidator,
    );
    assert.ok(appCallables.has(step.name), `${step.name} is app-referenced`);
  }
});

test("only synthetic identities that manage a synthetic organizer may sign in", () => {
  const organizer = {synthetic: true, ownerUserId: "synthetic-host"};
  assertSyntheticFixture({...fixture, user: {synthetic: true}, organizer});
  assertSyntheticFixture({
    ...fixture,
    user: {synthetic: true},
    organizer: {synthetic: true, hostUserIds: ["synthetic-host"]},
  });
  for (const [user, org, pattern] of [
    [undefined, organizer, /not a synthetic identity/u],
    [{synthetic: false}, organizer, /not a synthetic identity/u],
    [{synthetic: true}, {...organizer, synthetic: false}, /not a synthetic organizer/u],
    [{synthetic: true}, {synthetic: true, ownerUserId: "real"}, /does not manage/u],
  ]) {
    assert.throws(
      () => assertSyntheticFixture({...fixture, user, organizer: org}),
      pattern,
    );
  }
});

test("Firestore steps surface rules denials and missing indexes", async () => {
  const plan = buildSyntheticProbePlan({...fixture, environment: "prod", now});
  const requests = [];
  const get = await probeFirestoreStep({
    projectId: "demo",
    step: plan.firestore[0],
    idToken: "id-token",
    appCheckToken: "app-check",
    fetchImpl: async (url, options) => {
      requests.push({url, options});
      return jsonResponse({name: "users/synthetic-host"});
    },
  });
  assert.equal(get.ok, true);
  assert.match(requests[0].url, /documents\/users\/synthetic-host$/u);
  assert.equal(requests[0].options.headers.authorization, "Bearer id-token");
  assert.equal(requests[0].options.headers["x-firebase-appcheck"], "app-check");

  const denied = await probeFirestoreStep({
    projectId: "demo",
    step: plan.firestore[1],
    idToken: "id-token",
    fetchImpl: async () => jsonResponse(
      {error: {status: "PERMISSION_DENIED", message: "Missing permissions."}},
      403,
    ),
  });
  assert.deepEqual(denied, {
    id: "selected-organizer",
    ok: false,
    detail: "PERMISSION_DENIED: Missing permissions.",
  });

  const missingIndex = await probeFirestoreStep({
    projectId: "demo",
    step: plan.firestore[4],
    idToken: "id-token",
    fetchImpl: async () => jsonResponse([
      {error: {status: "FAILED_PRECONDITION", message: "The query requires an index."}},
    ]),
  });
  assert.equal(missingIndex.ok, false);
  assert.match(missingIndex.detail, /FAILED_PRECONDITION/u);

  const query = await probeFirestoreStep({
    projectId: "demo",
    step: plan.firestore[2],
    idToken: "id-token",
    fetchImpl: async (url, options) => {
      assert.match(url, /documents:runQuery$/u);
      assert.ok(JSON.parse(options.body).structuredQuery.where);
      return jsonResponse([{document: {}}, {readTime: "now"}]);
    },
  });
  assert.deepEqual(query, {
    id: "owned-organizers",
    ok: true,
    detail: "1 document(s) readable",
  });
});

test("callable steps fail when undeployed, denied, or outside main's contract", async () => {
  const [step] = buildSyntheticProbePlan({...fixture, environment: "dev", now})
    .callables;
  const validators = {
    [step.responseValidator]: Object.assign(
      (value) => Array.isArray(value.items),
      {errors: [{instancePath: "/items", message: "must be array"}]},
    ),
  };
  const call = (response) => probeCallableStep({
    projectId: "demo",
    step,
    idToken: "id-token",
    appCheckToken: "app-check",
    validators,
    fetchImpl: async (url, options) => {
      assert.equal(
        url,
        "https://asia-south1-demo.cloudfunctions.net/listOrganizerGuestBlocks",
      );
      assert.equal(options.redirect, "manual");
      assert.deepEqual(JSON.parse(options.body), {data: step.payload});
      return response;
    },
  });

  const notDeployed = await call(new Response("<html>404</html>", {status: 404}));
  assert.equal(notDeployed.ok, false);
  assert.match(notDeployed.detail, /not deployed/u);

  const denied = await call(jsonResponse(
    {error: {status: "PERMISSION_DENIED", message: "Organizer managers only."}},
    403,
  ));
  assert.match(denied.detail, /PERMISSION_DENIED: Organizer managers only/u);

  const drifted = await call(jsonResponse({result: {items: "none"}}));
  assert.equal(drifted.ok, false);
  assert.match(drifted.detail, /outside main's contract: \/items must be array/u);

  const served = await call(jsonResponse({result: {items: []}}));
  assert.deepEqual(served, {
    id: "organizer-guest-blocks",
    ok: true,
    detail: "listOrganizerGuestBlocks answered within contract",
  });
});

test("every step runs and the report names each failure", async () => {
  const plan = buildSyntheticProbePlan({...fixture, environment: "prod", now});
  const report = await runSyntheticProbe({
    plan,
    projectId: "demo",
    idToken: "id-token",
    fetchImpl: async (url) => url.endsWith("/users/synthetic-host") ?
      jsonResponse({error: {status: "PERMISSION_DENIED", message: "denied"}}, 403) :
      jsonResponse(url.endsWith(":runQuery") ? [] : {name: "doc"}),
  });
  assert.equal(report.ok, false);
  assert.equal(report.results.length, plan.firestore.length);
  assert.equal(
    formatProbeReport({environment: "prod", projectId: "demo", report}),
    [
      "FAIL synthetic backend probe for prod: demo",
      "  FAIL own-user-profile: PERMISSION_DENIED: denied",
      "  ok   selected-organizer: 1 document(s) readable",
      "  ok   owned-organizers: 0 document(s) readable",
      "  ok   hosted-organizers: 0 document(s) readable",
      "  ok   active-organizer-events: 0 document(s) readable",
    ].join("\n"),
  );
});
