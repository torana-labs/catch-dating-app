import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectClientCallableReferences,
  deriveClientCallables,
  formatClientCallableReport,
  probeCallable,
  readClientCallableSources,
  scanClientCallableSource,
  validateClientCallableDependencies,
  validateClientCallableReferences,
} from "./check_client_callable_dependencies.mjs";

function writeFiles(root, files) {
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, contents);
  }
}

const manifest = {
  version: 1,
  dependencies: [{
    id: "host-event-broadcast",
    appRole: "host",
    environment: "prod",
    callable: "sendEventBroadcast",
    region: "asia-south1",
  }],
};

test("validates an always-on production dependency", () => {
  assert.deepEqual(
    validateClientCallableDependencies({
      manifest,
      appRole: "host",
      environment: "prod",
      functionTargets: ["functions:sendEventBroadcast"],
    }),
    manifest.dependencies,
  );
});

test("fails enabled flags whose callable is not exported", () => {
  assert.throws(
    () => validateClientCallableDependencies({
      manifest,
      appRole: "host",
      environment: "prod",
      functionTargets: [],
    }),
    /not exported/,
  );
});

test("live probe accepts an unauthenticated callable response", async () => {
  const calls = [];
  const result = await probeCallable({
    projectId: "demo-project",
    region: "asia-south1",
    callable: "sendEventBroadcast",
    fetchImpl: async (url, options) => {
      calls.push({url, options});
      return new Response(
        JSON.stringify({error: {status: "UNAUTHENTICATED"}}),
        {status: 401, headers: {"content-type": "application/json"}},
      );
    },
  });
  assert.equal(result.httpStatus, 401);
  assert.equal(result.callableStatus, "UNAUTHENTICATED");
  assert.match(calls[0].url, /sendEventBroadcast$/);
  assert.equal(calls[0].options.redirect, "manual");
});

test("live probe rejects HTML, redirects, and IAM permission errors", async () => {
  await assert.rejects(
    probeCallable({
      projectId: "demo",
      region: "asia-south1",
      callable: "sendEventBroadcast",
      fetchImpl: async () => new Response("not found", {status: 404}),
    }),
    /did not return.*JSON/,
  );
  await assert.rejects(
    probeCallable({
      projectId: "demo",
      region: "asia-south1",
      callable: "sendEventBroadcast",
      fetchImpl: async () => new Response(null, {
        status: 302,
        headers: {location: "https://example.com"},
      }),
    }),
    /redirect/,
  );
  await assert.rejects(
    probeCallable({
      projectId: "demo",
      region: "asia-south1",
      callable: "sendEventBroadcast",
      fetchImpl: async () => new Response(
        JSON.stringify({error: {status: "PERMISSION_DENIED"}}),
        {status: 403, headers: {"content-type": "application/json"}},
      ),
    }),
    /PERMISSION_DENIED/,
  );
});

test("scans literal names and direct invocations across Dart and TypeScript", () => {
  const dart = scanClientCallableSource(`
    final result = await _functions.httpsCallable('listOrganizerPrograms')();
    const name = "manageHostRosterIntake";
    final label = 'Is';
  `);
  assert.deepEqual([...dart.literals].sort(), [
    "listOrganizerPrograms",
    "manageHostRosterIntake",
  ]);
  assert.deepEqual(dart.invocations, ["listOrganizerPrograms"]);

  const ts = scanClientCallableSource(`
    await httpsCallable(functions, "manageWebsiteAccount")(payload);
    await httpsCallable<Request, Response>(runtime.functions, 'getThing')();
    await httpsCallable(functions, name)(payload);
    const dynamic = \`prefix\${suffix}\`;
    const template = \`adminAssignSalesPartner\`;
  `);
  assert.deepEqual(ts.invocations, ["manageWebsiteAccount", "getThing"]);
  assert.ok(ts.literals.has("adminAssignSalesPartner"));
  assert.ok(!ts.literals.has("prefix"));
});

test("counts variable-indirected names and reports undeclared call sites", () => {
  const {references, undeclaredInvocations} = collectClientCallableReferences({
    exportNames: ["listOrganizerContacts", "manageWebsiteAccount", "onUserCreated"],
    files: [
      {
        surface: "app",
        path: "lib/hosts/data/host_contacts_repository.dart",
        contents: "callHostCrm(_functions, name: 'listOrganizerContacts');",
      },
      {
        surface: "website",
        path: "website/src/account.ts",
        contents: [
          'const name = "manageWebsiteAccount";',
          'await httpsCallable(functions, "renamedCallable")({});',
        ].join("\n"),
      },
    ],
  });
  assert.deepEqual([...references.keys()].sort(), [
    "listOrganizerContacts",
    "manageWebsiteAccount",
  ]);
  assert.deepEqual([...references.get("manageWebsiteAccount").surfaces], [
    "website",
  ]);
  assert.deepEqual(undeclaredInvocations, [{
    surface: "website",
    path: "website/src/account.ts",
    callable: "renamedCallable",
  }]);
});

test("references to dormant exports and undeclared call sites fail", () => {
  const references = new Map([
    ["listOrganizerContacts", {surfaces: new Set(["app"]), paths: new Set()}],
    ["expireEventWaitlistOffers", {surfaces: new Set(["app"]), paths: new Set()}],
  ]);
  const passing = validateClientCallableReferences({
    references: new Map([...references].slice(0, 1)),
    undeclaredInvocations: [],
    deployableNames: ["listOrganizerContacts"],
  });
  assert.equal(passing.ok, true);
  assert.deepEqual(passing.callables, ["listOrganizerContacts"]);

  const failing = validateClientCallableReferences({
    references,
    undeclaredInvocations: [{
      surface: "admin",
      path: "admin/src/api.ts",
      callable: "removedCallable",
    }],
    deployableNames: ["listOrganizerContacts"],
  });
  assert.equal(failing.ok, false);
  assert.deepEqual(failing.dormantReferences, ["expireEventWaitlistOffers"]);
  assert.match(
    formatClientCallableReport(failing, ["app", "admin"]),
    /expireEventWaitlistOffers[\s\S]*admin\/src\/api\.ts calls removedCallable/u,
  );
});

test("reads authored client source only", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "client-callables-"));
  writeFiles(root, {
    "lib/hosts/repository.dart": "'listOrganizerContacts'",
    "lib/hosts/repository.g.dart": "'generatedOnly'",
    "lib/platform/schema_contracts/generated/registry.dart": "'everyCallable'",
    "website/src/account.ts": '"manageWebsiteAccount"',
    "website/src/account.test.ts": '"testOnly"',
    "website/src/notes.md": '"notSource"',
    "admin/src/api.tsx": '"adminGetOverview"',
  });
  const files = readClientCallableSources(root);
  assert.deepEqual(files.map((file) => [file.surface, file.path]).sort(), [
    ["admin", "admin/src/api.tsx"],
    ["app", "lib/hosts/repository.dart"],
    ["website", "website/src/account.ts"],
  ]);
  assert.deepEqual(
    readClientCallableSources(root, ["website"]).map((file) => file.path),
    ["website/src/account.ts"],
  );
  assert.throws(() => readClientCallableSources(root, ["mobile"]), /Unknown/u);
});

test("derives deployable client callables from a source checkout", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "client-callables-"));
  writeFiles(root, {
    "functions/src/index.ts": [
      "export {listOrganizerContacts} from './crm';",
      "export {manageWebsiteAccount, onUserCreated} from './account';",
      "export {expireEventWaitlistOffers} from './waitlist';",
    ].join("\n"),
    "lib/hosts/repository.dart": "name: 'listOrganizerContacts'",
    "website/src/account.ts": 'const name = "manageWebsiteAccount";',
    "admin/src/api.ts": "",
  });
  const derived = deriveClientCallables({root});
  assert.equal(derived.ok, true);
  assert.deepEqual(derived.callables, [
    "listOrganizerContacts",
    "manageWebsiteAccount",
  ]);

  writeFiles(root, {
    "lib/events/waitlist.dart": "'expireEventWaitlistOffers'",
  });
  const dormant = deriveClientCallables({root, surfaces: ["app"]});
  assert.equal(dormant.ok, false);
  assert.deepEqual(dormant.dormantReferences, ["expireEventWaitlistOffers"]);
});
