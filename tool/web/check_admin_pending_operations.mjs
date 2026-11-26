#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import {fromRepo} from "../lib/repo_paths.mjs";

const adminSourceRoot = "admin/src";
const exemptMarker = "lease-exempt:";
const minimumExemptReason = 12;

const args = parseArgs(process.argv.slice(2));
if (args.selfTest) {
  runSelfTest();
  process.exit(0);
}

const violations = [];
const writerFiles = [];
for (const relativePath of adminSourceFiles(fromRepo(adminSourceRoot))) {
  const source = fs.readFileSync(fromRepo(relativePath), "utf8");
  if (!/\buseMutation\b/u.test(source)) continue;
  const {writes} = inspectWriterSource({
    relativePath,
    source,
    onViolation: (message) => violations.push(`${relativePath}: ${message}`),
  });
  if (writes) writerFiles.push(relativePath);
}
const analyticsController =
  "admin/src/features/users/controllers/useUserAnalyticsController.ts";
if (!read(analyticsController).includes("sampleAutoLoadStarted")) {
  violations.push(`${analyticsController}: does not bound the sample analytics auto-load`);
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
    `Admin pending-operation integrity passed: ${writerFiles.length} writing file(s) hold one exclusive lease.`,
  );
}

// Finds every Admin write and checks that it holds the console-wide operation
// lease. Admin writes go through TanStack `useMutation`; each dispatch of one
// must run inside a function that takes the lease (`beginOperation()`) and
// releases it in a `finally` block, or inside a callback handed straight to
// such a function (the `run(() => mutation.mutateAsync(...))` pattern). A
// mutation that writes nothing says so on its declaration:
//
//   // lease-exempt: builds a CSV from the month's records and writes nothing.
//   const ledger = useMutation({mutationFn: exportLedger});

/**
 * @param {{relativePath: string, source: string, onViolation: (message: string) => void}} input
 * @return {{writes: boolean}} Whether the file declares a lease-bound write.
 */
function inspectWriterSource({relativePath, source, onViolation}) {
  const kind = relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, kind);
  const mutations = new Map();
  const leaseFunctions = new Set();
  const dispatches = [];
  let consumesGuard = false;
  const line = (node) => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;

  function visit(node) {
    if (isCallTo(node, "useAdminPendingOperationGuard")) consumesGuard = true;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
        node.initializer && isCallTo(node.initializer, "useMutation")) {
      mutations.set(node.name.text, {node, exemptReason: exemptReason(node, source)});
    }
    if (isCallTo(node, "beginOperation")) {
      const owner = enclosingFunction(node);
      if (owner) leaseFunctions.add(owner);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        ["mutate", "mutateAsync"].includes(node.expression.name.text)) {
      dispatches.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);

  const runners = new Set();
  for (const fn of leaseFunctions) {
    if (!releasesInFinally(fn)) {
      onViolation(`line ${line(fn)}: takes the operation lease without releasing it in a finally block`);
    }
    const name = boundName(fn);
    if (name) runners.add(name);
  }

  let writes = false;
  for (const [name, mutation] of mutations) {
    if (mutation.exemptReason === null) {
      writes = true;
    } else if (mutation.exemptReason.length < minimumExemptReason) {
      onViolation(`line ${line(mutation.node)}: ${name} is ${exemptMarker} without a reason`);
    }
  }
  for (const call of dispatches) {
    const receiver = rootIdentifier(call.expression.expression);
    const mutation = receiver === null ? undefined : mutations.get(receiver);
    // `.mutate()` on anything that is not a local useMutation result is not an Admin write.
    if (!mutation || mutation.exemptReason !== null) continue;
    if (!heldUnderLease(call, leaseFunctions, runners)) {
      onViolation(`line ${line(call)}: ${receiver} dispatches without holding the operation lease`);
    }
  }
  if (writes && !consumesGuard) onViolation("writes without useAdminPendingOperationGuard");
  return {writes};
}

function isCallTo(node, name) {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
    node.expression.text === name;
}

function exemptReason(declaration, source) {
  const statement = declaration.parent?.parent;
  const starts = [declaration.getFullStart()];
  if (statement && ts.isVariableStatement(statement)) starts.push(statement.getFullStart());
  for (const start of starts) {
    for (const range of ts.getLeadingCommentRanges(source, start) ?? []) {
      const text = source.slice(range.pos, range.end);
      const index = text.indexOf(exemptMarker);
      if (index >= 0) {
        return text.slice(index + exemptMarker.length).replace(/\*\/\s*$/u, "").trim();
      }
    }
  }
  return null;
}

function enclosingFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionLike(current)) return current;
  }
  return null;
}

function releasesInFinally(fn) {
  let found = false;
  function visit(node) {
    if (found || (node !== fn && ts.isFunctionLike(node))) return;
    if (ts.isTryStatement(node) && node.finallyBlock && calls(node.finallyBlock, "endOperation")) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(fn);
  return found;
}

function calls(node, name) {
  let found = false;
  function visit(child) {
    if (found) return;
    if (isCallTo(child, name)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return found;
}

/** The name a lease-taking function is bound to: `const run = ...`, or through `useCallback(...)`. */
function boundName(fn) {
  if (ts.isFunctionDeclaration(fn) && fn.name) return fn.name.text;
  let node = fn.parent;
  if (node && isCallTo(node, "useCallback")) node = node.parent;
  if (node && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  return null;
}

function rootIdentifier(expression) {
  let current = expression;
  while (ts.isPropertyAccessExpression(current) || ts.isNonNullExpression(current) ||
         ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current.text : null;
}

/**
 * A dispatch holds the lease when a function around it takes the lease, or a
 * function around it is passed straight to a local function that takes it.
 */
function heldUnderLease(call, leaseFunctions, runners) {
  for (let current = call.parent; current; current = current.parent) {
    if (!ts.isFunctionLike(current)) continue;
    if (leaseFunctions.has(current)) return true;
    const parent = current.parent;
    if (parent && ts.isCallExpression(parent) && parent.arguments.includes(current) &&
        ts.isIdentifier(parent.expression) && runners.has(parent.expression.text)) {
      return true;
    }
  }
  return false;
}

/** Admin source files a write could live in: not tests, stories or generated output. */
function adminSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["generated", "stories", "__tests__", "test"].includes(entry.name)) continue;
      files.push(...adminSourceFiles(fullPath));
      continue;
    }
    if (!/\.(?:ts|tsx)$/u.test(entry.name)) continue;
    if (/\.(?:test|stories)\.(?:ts|tsx)$/u.test(entry.name)) continue;
    files.push(path.relative(fromRepo(), fullPath).split(path.sep).join("/"));
  }
  return files.sort();
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

  const writer = (source) => {
    const found = [];
    const result = inspectWriterSource({
      relativePath: "admin/src/features/example/controllers/useExample.ts",
      source,
      onViolation: (message) => found.push(message),
    });
    return {...result, violations: found};
  };
  const hook = (body) => `
    import {useMutation} from "@tanstack/react-query";
    export function useExample() {
      const {beginOperation, endOperation} = useAdminPendingOperationGuard();
      const save = useMutation({mutationFn: saveThing});
      ${body}
    }`;
  const leased = [
    // Direct: the function that dispatches takes and releases the lease.
    hook(`const go = async () => {
      const operation = beginOperation();
      if (!operation) return false;
      try { await save.mutateAsync(1); return true; } finally { endOperation(operation); }
    };`),
    // A runner bound through useCallback, handed the dispatch as a callback.
    hook(`const run = useCallback(async (action) => {
      const operation = beginOperation();
      if (!operation) return false;
      try { await action(); } finally { endOperation(operation); }
    }, []);
    return {go: () => run(() => save.mutateAsync(1))};`),
    // A nested dispatch inside an async callback handed to the runner.
    hook(`async function execute(kind, invoke) {
      const token = beginOperation();
      try { await invoke("id"); } finally { endOperation(token); }
    }
    return {go: () => execute("x", async (id) => { await save.mutateAsync(id); })};`),
  ];
  for (const source of leased) {
    const result = writer(source);
    assert.deepEqual(result.violations, [], source);
    assert.equal(result.writes, true, source);
  }
  const unleased = [
    // No lease at all, as the 12 controllers in #1452 were.
    `const save = useMutation({mutationFn: saveThing});
     export const go = () => save.mutateAsync(1);`,
    // The guard is consumed but this dispatch runs outside it.
    hook(`const go = () => save.mutate(1);`),
    // A helper that dispatches, called from the runner, is not itself leased.
    hook(`const run = async (action) => {
      const operation = beginOperation();
      try { await action(); } finally { endOperation(operation); }
    };
    const update = () => save.mutateAsync(1);
    return {go: () => run(() => update())};`),
    // The lease is released outside a finally block, so a throw leaks it.
    hook(`const go = async () => {
      const operation = beginOperation();
      await save.mutateAsync(1);
      endOperation(operation);
    };`),
    // An exemption needs a reason.
    `useAdminPendingOperationGuard();
     // lease-exempt: read
     const save = useMutation({mutationFn: saveThing});`,
  ];
  for (const source of unleased) {
    assert.ok(writer(source).violations.length > 0, source);
  }
  const exempt = writer(`
    // lease-exempt: builds a CSV and writes nothing.
    const ledger = useMutation({mutationFn: exportLedger});
    export const go = () => ledger.mutateAsync();
    export const other = (draft) => draft.mutate();`);
  assert.deepEqual(exempt, {writes: false, violations: []});
  console.log("Admin pending-operation integrity self-test passed.");
}
