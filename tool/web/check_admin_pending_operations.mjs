#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import {fromRepo} from "../lib/repo_paths.mjs";

const expectedControllerFiles = new Set([
  "admin/src/features/safety/controllers/useAccessReviewController.ts",
  "admin/src/features/settings/controllers/useTeamController.ts",
  "admin/src/features/events/controllers/useEventPublishingController.ts",
  "admin/src/features/marketing/controllers/useMarketingOpsController.ts",
  "admin/src/features/organizers/controllers/useOrganizerPublishingController.ts",
  "admin/src/features/safety/controllers/useSafetyTriageController.ts",
  "admin/src/features/users/controllers/useUserAnalyticsController.ts",
]);

const args = parseArgs(process.argv.slice(2));
if (args.selfTest) {
  runSelfTest();
  process.exit(0);
}

const violations = [];
const guardedControllers = expectedControllerFiles;
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
    `Admin pending-operation integrity passed: ${guardedControllers.size} controller(s), and one exclusive lease.`,
  );
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
  if (controllerPath.endsWith("useUserAnalyticsController.ts") &&
      !source.includes("sampleAutoLoadStarted")) {
    onViolation("does not bound the sample analytics auto-load");
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
