#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import {fromRepo} from "../lib/repo_paths.mjs";

const debtId = "ADMIN-MUTATION-SNAPSHOT-001";
const expectedControllerFiles = new Set([
  "admin/src/features/safety/controllers/useAccessReviewController.ts",
  "admin/src/features/admin-roles/controllers/useAdminRoleManagementController.ts",
  "admin/src/features/events/controllers/useEventPublishingController.ts",
  "admin/src/features/intake/events/controllers/useEventIntakeController.ts",
  "admin/src/features/intake/organizer/controllers/useOrganizerIntakeController.ts",
  "admin/src/features/marketing/controllers/useMarketingOpsController.ts",
  "admin/src/features/organizers/controllers/useOrganizerClaimReviewController.ts",
  "admin/src/features/organizers/controllers/useOrganizerPublishingController.ts",
  "admin/src/features/safety/controllers/useSafetyTriageController.ts",
]);

const args = parseArgs(process.argv.slice(2));
if (args.selfTest) {
  runSelfTest();
  process.exit(0);
}

const violations = [];
const guardedControllers = new Set();
const featureRoot = fromRepo("design/features");

for (const entry of fs.readdirSync(featureRoot, {withFileTypes: true})) {
  if (!entry.isFile() || !/^admin_.+\.feature\.json$/u.test(entry.name)) {
    continue;
  }
  const relativePath = `design/features/${entry.name}`;
  const source = fs.readFileSync(path.join(featureRoot, entry.name), "utf8");
  if (source.includes(debtId)) {
    violations.push(`${relativePath}: retired ${debtId} remains referenced`);
  }
  const contract = JSON.parse(source);
  inspectContract({
    contract,
    onController: (controllerPath) => guardedControllers.add(controllerPath),
    onViolation: (message) => violations.push(`${relativePath}: ${message}`),
  });
}

for (const expectedPath of expectedControllerFiles) {
  if (!guardedControllers.has(expectedPath)) {
    violations.push(
      `${expectedPath}: controller is not derived from a frozen pending action case`,
    );
  }
}
for (const controllerPath of guardedControllers) {
  const absolutePath = fromRepo(controllerPath);
  if (!fs.existsSync(absolutePath)) {
    violations.push(`${controllerPath}: pending action owner does not exist`);
    continue;
  }
  inspectControllerSource({
    controllerPath,
    source: fs.readFileSync(absolutePath, "utf8"),
    onViolation: (message) => violations.push(`${controllerPath}: ${message}`),
  });
}

inspectCentralSources({
  appSource: read("admin/src/app/App.tsx"),
  pendingSource: read("admin/src/shared/pendingOperation.tsx"),
  actionSource: read("admin/src/shared/ui/AdminPrimitives/actions.tsx"),
  shellSource: read("admin/src/shared/ui/AdminPrimitives/shell.tsx"),
  testSource: read("admin/src/shared/pendingOperation.test.tsx"),
  onViolation: (message) => violations.push(message),
});

if (violations.length > 0) {
  console.error("Admin pending-operation integrity violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

if (args.summary) {
  console.log(
    `Admin pending-operation integrity passed: ${guardedControllers.size} controller(s), one exclusive lease, and frozen pending action matrices.`,
  );
}

function inspectContract({contract, onController, onViolation}) {
  for (const surface of contract.surfaces ?? []) {
    const actions = new Map(
      (surface.actions ?? []).map((action) => [action.id, action]),
    );
    const owners = new Map(
      (surface.bindings?.actionOwners ?? []).map((owner) => [owner.id, owner]),
    );
    for (const scenario of surface.scenarios ?? []) {
      for (const actionCase of scenario.actionCases ?? []) {
        if (!isFrozenPendingCase(actionCase)) continue;
        if ((actionCase.enabledActions ?? []).length > 0) {
          onViolation(
            `${surface.id}/${scenario.id}/${actionCase.id} keeps enabled actions while the Admin lease is pending`,
          );
        }
        const disabledActions = actionCase.disabledActions ?? [];
        if (disabledActions.length === 0) {
          onViolation(
            `${surface.id}/${scenario.id}/${actionCase.id} has no disabled actions`,
          );
        }
        for (const actionId of disabledActions) {
          const action = actions.get(actionId);
          const owner = action ? owners.get(action.owner) : null;
          if (!owner?.file?.includes("/controllers/")) continue;
          const absolutePath = fromRepo(owner.file);
          if (!fs.existsSync(absolutePath)) continue;
          const source = fs.readFileSync(absolutePath, "utf8");
          if (source.includes(".mutateAsync(")) {
            onController(owner.file);
          }
        }
      }
    }
  }
}

function isFrozenPendingCase(actionCase) {
  return actionCase.id.includes("pending_frozen_workspace") ||
    actionCase.id === "loading_frozen_query";
}

function inspectControllerSource({controllerPath, source, onViolation}) {
  if (!source.includes("useAdminPendingOperationGuard")) {
    onViolation("does not consume useAdminPendingOperationGuard");
  }
  const beginCount = occurrences(source, "beginOperation()");
  const endCount = occurrences(source, "endOperation(operation)");
  if (beginCount === 0) onViolation("does not acquire an operation lease");
  if (endCount !== beginCount) {
    onViolation(
      `acquires ${beginCount} lease(s) but releases ${endCount} lease(s)`,
    );
  }
  if (beginCount > 0 && occurrences(source, "finally {") < beginCount) {
    onViolation("does not release every operation lease from a finally block");
  }
  if (source.includes(".mutateAsync(") &&
      occurrences(source, ".mutateAsync(") > beginCount) {
    onViolation("has more mutation dispatch sites than operation lease sites");
  }
}

function inspectCentralSources({
  appSource,
  pendingSource,
  actionSource,
  shellSource,
  testSource,
  onViolation,
}) {
  if (!hasMountedPendingProvider(appSource)) {
    onViolation("admin/src/app/App.tsx: provider is not mounted around the rendered Admin shell");
  }
  const required = [
    [pendingSource, "if (activeOperation.current) return null", "admin/src/shared/pendingOperation.tsx: lease is not exclusive"],
    [pendingSource, "beforeunload", "admin/src/shared/pendingOperation.tsx: browser unload is not guarded"],
    [actionSource, "useAdminOperationPending", "admin actions do not consume global pending state"],
    [shellSource, "disabled={operationPending}", "AdminWorkspace does not freeze its fieldset"],
    [shellSource, "blockPendingAnchorClick", "AdminWorkspace does not block route links"],
    [testSource, "rejects overlapping operations", "shared pending-operation proof is missing overlap coverage"],
    [testSource, "reviewed snapshot", "shared pending-operation proof is missing snapshot coverage"],
  ];
  for (const [source, token, message] of required) {
    if (!source.includes(token)) onViolation(message);
  }
}

function hasMountedPendingProvider(source) {
  const file = ts.createSourceFile(
    "App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  if (file.parseDiagnostics.length > 0) return false;
  const renderedShells = [];
  function visit(node) {
    const tag = ts.isJsxElement(node) ? node.openingElement.tagName :
      ts.isJsxSelfClosingElement(node) ? node.tagName : null;
    if (tag && ts.isIdentifier(tag) && tag.text === "AdminShellFrame") {
      let guarded = false;
      for (let child = node, parent = node.parent; parent;
        child = parent, parent = parent.parent) {
        if (ts.isReturnStatement(parent) ||
            (ts.isArrowFunction(parent) && parent.body === child)) {
          renderedShells.push(guarded);
          break;
        }
        // JSX in a prop, an unused variable, or a callback does not prove that
        // the provider wraps the returned shell and its navigation/workspace.
        if (ts.isFunctionLike(parent) || ts.isJsxAttribute(parent) ||
            ts.isJsxSpreadAttribute(parent)) break;
        if (ts.isJsxElement(parent) &&
            ts.isIdentifier(parent.openingElement.tagName) &&
            parent.openingElement.tagName.text === "AdminPendingOperationProvider") {
          guarded = true;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return renderedShells.length > 0 && renderedShells.every(Boolean);
}

function occurrences(source, token) {
  return source.split(token).length - 1;
}

function read(relativePath) {
  return fs.readFileSync(fromRepo(relativePath), "utf8");
}

function parseArgs(argv) {
  const parsed = {selfTest: false, summary: false};
  for (const arg of argv) {
    if (arg === "--check") continue;
    if (arg === "--summary") {
      parsed.summary = true;
      continue;
    }
    if (arg === "--self-test") {
      parsed.selfTest = true;
      continue;
    }
    console.error(`Unknown argument: ${arg}`);
    process.exit(64);
  }
  return parsed;
}

function runSelfTest() {
  const shell = "<AdminShellFrame><AdminWorkspace /></AdminShellFrame>";
  const provider = (children = shell) =>
    `<AdminPendingOperationProvider>${children}</AdminPendingOperationProvider>`;
  const component = (jsx) => `function AdminRouteApp() { return (${jsx}); }`;
  const mountedFixtures = [
    component(provider()),
    component(`<AdminPendingOperationProvider key={sessionKey}>${shell}</AdminPendingOperationProvider>`),
    component(`<Outer><AdminPendingOperationProvider\n key={sessionKey}\n {...props}\n label={epoch > 0 ? ">" : "<"}\n><><Inner>${shell}</Inner></></AdminPendingOperationProvider></Outer>`),
    `const AdminRouteApp = () => (${provider()});`,
  ];
  const unmountedFixtures = [
    component(shell),
    `// ${provider()}\n${component(shell)}`,
    `const example = ${JSON.stringify(provider())}; ${component(shell)}`,
    `const unused = (${provider()}); ${component(shell)}`,
    component(`<WrongProvider>${shell}</WrongProvider>`),
    component(`<AdminPendingOperationProviderExtra>${shell}</AdminPendingOperationProviderExtra>`),
    component(`<><AdminPendingOperationProvider />${shell}</>`),
    component(`<>{provider("")}${shell}</>`),
    component(`<AdminPendingOperationProvider content={${shell}} />`),
    component(`<AdminPendingOperationProvider>{() => ${shell}}</AdminPendingOperationProvider>`),
    component(`<AdminPendingOperationProvider>${shell}</WrongProvider>`),
    `function AdminRouteApp() { if (unguarded) return (${shell}); return (${provider()}); }`,
  ];
  const centralSources = {
    pendingSource: "if (activeOperation.current) return null; beforeunload",
    actionSource: "useAdminOperationPending",
    shellSource: "disabled={operationPending} blockPendingAnchorClick",
    testSource: "rejects overlapping operations; reviewed snapshot",
  };
  for (const source of [...mountedFixtures, ...unmountedFixtures]) {
    const violations = [];
    inspectCentralSources({
      ...centralSources,
      appSource: source,
      onViolation: (message) => violations.push(message),
    });
    assert.equal(violations.length, mountedFixtures.includes(source) ? 0 : 1, source);
  }

  const contractViolations = [];
  inspectContract({
    contract: {
      surfaces: [{
        id: "fixture",
        actions: [{id: "save", owner: "controller"}],
        bindings: {
          actionOwners: [{
            id: "controller",
            file: "admin/src/features/system/controllers/useSystemController.ts",
          }],
        },
        scenarios: [{
          id: "fixture",
          actionCases: [{
            id: "save_pending_frozen_workspace",
            enabledActions: ["save"],
            disabledActions: [],
          }],
        }],
      }],
    },
    onController: () => undefined,
    onViolation: (message) => contractViolations.push(message),
  });
  assert.equal(contractViolations.length, 2);

  const controllerViolations = [];
  inspectControllerSource({
    controllerPath: "admin/src/features/example/controllers/useExample.ts",
    source: "await mutation.mutateAsync(payload);",
    onViolation: (message) => controllerViolations.push(message),
  });
  assert.ok(controllerViolations.length >= 3);

  const guardedViolations = [];
  inspectControllerSource({
    controllerPath: "admin/src/features/example/controllers/useExample.ts",
    source: `
      useAdminPendingOperationGuard();
      const operation = beginOperation();
      try {
        await mutation.mutateAsync(payload);
      } finally {
        endOperation(operation);
      }
    `,
    onViolation: (message) => guardedViolations.push(message),
  });
  assert.deepEqual(guardedViolations, []);
  console.log("Admin pending-operation integrity self-test passed.");
}
