const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourceRoot = path.resolve(__dirname, "../src");
const ts = require("typescript");

// Bind identifiers locally so an identically named function or shadowed import
// cannot stand in for the shared policy. No dependency loading or emit is needed.
function callableViolations(source, filePath, wrappers = new Set(), moduleSources = new Map()) {
  const sourceFile = ts.createSourceFile(filePath, source,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const host = {
    getSourceFile: (name) => name === filePath ? sourceFile : undefined,
    getDefaultLibFileName: () => "", writeFile: () => {},
    getCurrentDirectory: () => path.dirname(filePath),
    getDirectories: () => [], fileExists: (name) => name === filePath,
    readFile: (name) => name === filePath ? source : undefined,
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true, getNewLine: () => "\n",
  };
  const program = ts.createProgram([filePath], {noLib: true, noResolve: true}, host);
  const checker = program.getTypeChecker();
  const policyPath = path.join(sourceRoot, "shared", "callableOptions");
  const declarations = (node) =>
    checker.getSymbolAtLocation(node)?.declarations || [];
  function importedName(node, moduleMatches) {
    const reference = ts.isPropertyAccessExpression(node) ? node.expression : node;
    if (!ts.isIdentifier(reference)) return undefined;
    const bindings = declarations(reference);
    const [declaration] = bindings;
    if (bindings.length !== 1 || !declaration) return undefined;
    const named = ts.isImportSpecifier(declaration) && ts.isIdentifier(node);
    const namespace = ts.isNamespaceImport(declaration) && ts.isPropertyAccessExpression(node);
    if (!named && !namespace) return undefined;
    const module = named ? declaration.parent.parent.parent.moduleSpecifier :
      declaration.parent.parent.moduleSpecifier;
    if (!ts.isStringLiteral(module) || !moduleMatches(module.text)) return undefined;
    return namespace ? node.name.text : (declaration.propertyName || declaration.name).text;
  }
  const sharedName = (node) => importedName(node, (module) =>
    module.startsWith(".") &&
    path.resolve(path.dirname(filePath), module).replace(/\.ts$/, "") === policyPath);
  function unwrap(node) {
    while (node && (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) || ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node))) node = node.expression;
    return node;
  }
  function isOnCall(node) {
    node = unwrap(node);
    if (ts.isIdentifier(node)) return node.text === "onCall" ||
      importedName(node, (module) => module === "firebase-functions/v2/https") === "onCall";
    return (ts.isPropertyAccessExpression(node) && node.name.text === "onCall") ||
      (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) &&
        node.argumentExpression.text === "onCall");
  }
  // A const binding alone does not freeze its object. Reject mutation, aliases,
  // and escapes within this source file; cross-module mutation of exported
  // legacy limits remains outside this lexical scan. Accepted references copy
  // primitive limits or feed a
  // policy helper whose result is directly checked as onCall options.
  function confinedLimits(identifier, declaration) {
    const symbol = checker.getSymbolAtLocation(identifier);
    let confined = true;
    function inspect(node) {
      if (ts.isIdentifier(node) && checker.getSymbolAtLocation(node) === symbol &&
        node !== declaration.name) {
        let reference = node;
        while (ts.isParenthesizedExpression(reference.parent) ||
          ts.isAsExpression(reference.parent) || ts.isSatisfiesExpression(reference.parent)) {
          reference = reference.parent;
        }
        const parent = reference.parent;
        let options = parent;
        if (ts.isCallExpression(parent) && ts.isSpreadAssignment(parent.parent) &&
          ts.isObjectLiteralExpression(parent.parent.parent)) options = parent.parent.parent;
        while (options.parent && (ts.isParenthesizedExpression(options.parent) ||
          ts.isAsExpression(options.parent) || ts.isSatisfiesExpression(options.parent))) {
          options = options.parent;
        }
        const helperCall = ts.isCallExpression(parent) && parent.arguments.includes(reference) &&
          ts.isCallExpression(options.parent) && isOnCall(options.parent.expression) &&
          options.parent.arguments[0] === options;
        if (!ts.isSpreadAssignment(parent) && !helperCall) confined = false;
      }
      ts.forEachChild(node, inspect);
    }
    inspect(sourceFile);
    return confined;
  }
  function safeLimits(node, keys, seen = new Set()) {
    node = unwrap(node);
    if (!node || seen.has(node)) return false;
    seen.add(node);
    if (ts.isIdentifier(node)) {
      const [declaration] = declarations(node);
      return !!declaration && ts.isVariableDeclaration(declaration) &&
        (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
        confinedLimits(node, declaration) &&
        safeLimits(declaration.initializer, keys, seen);
    }
    if (!ts.isObjectLiteralExpression(node)) return false;
    return node.properties.every((property) => {
      if (ts.isSpreadAssignment(property)) {
        return safeLimits(property.expression, keys, new Set(seen));
      }
      if (!ts.isPropertyAssignment(property) ||
        !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ||
        !keys.includes(property.name.text)) return false;
      const value = unwrap(property.initializer);
      return ts.isStringLiteral(value) || ts.isNumericLiteral(value);
    });
  }
  function sharedOptions(node) {
    node = unwrap(node);
    if (!node) return false;
    if (sharedName(node) === "appCheckCallableOptions") return true;
    if (!ts.isCallExpression(node) || node.arguments.some(ts.isSpreadElement)) return false;
    const name = sharedName(unwrap(node.expression));
    if (name === "appCheckCallableOptionsWithLimits") {
      return node.arguments.length === 1 && safeLimits(node.arguments[0],
        ["concurrency", "maxInstances", "memory", "timeoutSeconds"]);
    }
    if (name === "appCheckCallableOptionsWithSecrets") {
      return node.arguments.length >= 1 && node.arguments.length <= 2 &&
        (node.arguments.length === 1 || safeLimits(node.arguments[1],
          ["concurrency", "maxInstances", "timeoutSeconds", "cpu"]));
    }
    // Legacy form helpers are proved from their imported implementation, rather
    // than trusting a function-name prefix. Only a single-return wrapper around
    // the same narrow policy composition is accepted.
    const bindings = declarations(node.expression);
    const [binding] = bindings;
    if (bindings.length !== 1 || !binding || !ts.isImportSpecifier(binding) ||
      node.arguments.length !== 1 || !safeLimits(node.arguments[0],
        ["concurrency", "maxInstances", "memory", "timeoutSeconds"])) return false;
    const module = binding.parent.parent.parent.moduleSpecifier;
    if (!ts.isStringLiteral(module) || !module.text.startsWith(".")) return false;
    const importedPath = path.resolve(path.dirname(filePath), module.text) + ".ts";
    if (!importedPath.startsWith(sourceRoot + path.sep) ||
      wrappers.has(importedPath) || (!moduleSources.has(importedPath) && !fs.existsSync(importedPath))) return false;
    const wrapperSource = ts.createSourceFile(importedPath,
      moduleSources.get(importedPath) ?? fs.readFileSync(importedPath, "utf8"), ts.ScriptTarget.Latest, true);
    const exportName = (binding.propertyName || binding.name).text;
    const functions = wrapperSource.statements.filter((statement) =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === exportName);
    if (functions.length !== 1) return false;
    const wrapper = functions[0];
    if (wrapper.asteriskToken || wrapper.modifiers?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
      !wrapper.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ||
      wrapper.parameters.length !== 1 || !ts.isIdentifier(wrapper.parameters[0].name) ||
      wrapper.body?.statements.length !== 1 ||
      !ts.isReturnStatement(wrapper.body.statements[0]) ||
      !wrapper.body.statements[0].expression) return false;
    const imports = wrapperSource.statements.filter(ts.isImportDeclaration)
      .map((statement) => statement.getText(wrapperSource)).join("\n");
    const proof = `${imports}\nconst ${wrapper.parameters[0].name.text} = {};\n` +
      `onCall(${wrapper.body.statements[0].expression.getText(wrapperSource)}, handler);`;
    return callableViolations(proof, importedPath,
      new Set([...wrappers, importedPath]), moduleSources).length === 0;
  }
  function approvedAccount(node) {
    if (ts.isStringLiteral(node)) return node.text.length > 0;
    const exactExpression = (candidate) => ts.isTaggedTemplateExpression(candidate) &&
      ts.isIdentifier(candidate.tag) &&
      importedName(candidate.tag, (module) => module === "firebase-functions/params") === "expr" &&
      ts.isTemplateExpression(candidate.template) && candidate.template.templateSpans.length === 1 &&
      candidate.template.head.text === "catch-whatsapp-reader@" &&
      candidate.template.templateSpans[0].literal.text === ".iam.gserviceaccount.com" &&
      ts.isIdentifier(candidate.template.templateSpans[0].expression) &&
      importedName(candidate.template.templateSpans[0].expression,
        (module) => module === "firebase-functions/params") === "projectID";
    if (!exactExpression(node)) return false;
    for (const identifier of [node.tag, node.template.templateSpans[0].expression]) {
      const binding = declarations(identifier)[0];
      if (!ts.isImportSpecifier(binding) || binding.isTypeOnly || binding.parent.parent.isTypeOnly) return false;
    }
    const tag = checker.getSymbolAtLocation(node.tag);
    const project = checker.getSymbolAtLocation(node.template.templateSpans[0].expression);
    let confined = true;
    function inspect(reference) {
      if (ts.isIdentifier(reference)) {
        const symbol = ts.isShorthandPropertyAssignment(reference.parent) ?
          checker.getShorthandAssignmentValueSymbol(reference.parent) :
          ts.isExportSpecifier(reference.parent) ?
            checker.getExportSpecifierLocalTargetSymbol(reference.parent) :
            checker.getSymbolAtLocation(reference);
        const declaration = declarations(reference)[0];
        const bindingName = declaration && ts.isImportSpecifier(declaration) &&
          (reference === declaration.name || reference === declaration.propertyName);
        if (symbol === tag && !bindingName &&
            !(reference.parent.tag === reference && exactExpression(reference.parent))) confined = false;
        if (symbol === project && !bindingName &&
            !(ts.isTemplateSpan(reference.parent) && reference.parent.expression === reference &&
              exactExpression(reference.parent.parent.parent))) confined = false;
      }
      ts.forEachChild(reference, inspect);
    }
    inspect(sourceFile);
    return confined;
  }
  function approvedOptions(node) {
    node = unwrap(node);
    if (sharedOptions(node)) return true;
    if (!node || !ts.isObjectLiteralExpression(node) || node.properties.length !== 2) return false;
    const [spread, account] = node.properties;
    return ts.isSpreadAssignment(spread) && sharedOptions(spread.expression) &&
      ts.isPropertyAssignment(account) &&
      (ts.isIdentifier(account.name) || ts.isStringLiteral(account.name)) &&
      account.name.text === "serviceAccount" &&
      approvedAccount(account.initializer);
  }
  // STR-10 (#2532): platform/callables/callable.ts builds callables with the
  // shared options. Its one parameterised form, callableWithLimits(limits,
  // spec), passes its first parameter to appCheckCallableOptionsWithLimits;
  // that is accepted there only because every call site below must pass
  // literal limits, checked like a direct appCheckCallableOptionsWithLimits.
  const wrapperModule = path.join(sourceRoot, "platform", "callables", "callable");
  const callableWrapperName = (node) => importedName(node, (module) =>
    module.startsWith(".") &&
    path.resolve(path.dirname(filePath), module).replace(/\.ts$/, "") === wrapperModule);
  function wrapperForwardsLimits(call) {
    if (filePath.replace(/\.ts$/, "") !== wrapperModule) return false;
    const options = unwrap(call.arguments[0]);
    if (!options || !ts.isCallExpression(options) ||
      sharedName(unwrap(options.expression)) !== "appCheckCallableOptionsWithLimits" ||
      options.arguments.length !== 1 || !ts.isIdentifier(options.arguments[0])) return false;
    let fn = call.parent;
    while (fn && !ts.isFunctionDeclaration(fn)) fn = fn.parent;
    return !!fn && fn.name?.text === "callableWithLimits" &&
      fn.parameters.length === 2 && ts.isIdentifier(fn.parameters[0].name) &&
      fn.parameters[0].name.text === options.arguments[0].text;
  }
  const violations = [];
  function visit(node) {
    if (ts.isCallExpression(node) &&
      callableWrapperName(unwrap(node.expression)) === "callableWithLimits" &&
      !safeLimits(node.arguments[0],
        ["concurrency", "maxInstances", "memory", "timeoutSeconds"])) {
      const {line} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      violations.push(`${path.relative(sourceRoot, filePath)}:${line + 1}: callableWithLimits(${node.arguments[0]?.getText(sourceFile) || "missing limits"})`);
    }
    if (ts.isCallExpression(node) &&
      isOnCall(node.expression) &&
      !wrapperForwardsLimits(node) &&
      !approvedOptions(node.arguments[0])) {
      const {line} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      violations.push(`${path.relative(sourceRoot, filePath)}:${line + 1}: ${node.arguments[0]?.getText(sourceFile) || "missing options"}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return violations;
}

function tsFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(entryPath);
    return entry.name.endsWith(".ts") ? [entryPath] : [];
  });
}

test("callable functions use shared App Check enforcement options", () => {
  const missing = [];

  for (const filePath of tsFiles(sourceRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    missing.push(...callableViolations(source, filePath));
  }

  assert.deepEqual(missing, []);
});

const fixturePath = path.join(sourceRoot, "fixtures", "callable.ts");
const fixtureImports = `
import {onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions, appCheckCallableOptionsWithLimits,
  appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
`;
function fixtureViolations(body, imports = fixtureImports) {
  return callableViolations(imports + body, fixturePath);
}

test("scanner accepts canonical options and narrow service-account composition", () => {
  const valid = [
    "onCall(appCheckCallableOptions, handler);",
    "export const limits = {timeoutSeconds: 60, memory: '512MiB' as const, maxInstances: 20, concurrency: 20}; onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "onCall ( appCheckCallableOptions, handler);",
    "onCall(appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}), handler);",
    "const limits = {concurrency: 6, memory: '512MiB' as const}; onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "const base = {timeoutSeconds: 30}; onCall(appCheckCallableOptionsWithLimits({...base, memory: '512MiB'}), handler);",
    "onCall(appCheckCallableOptionsWithSecrets([secret]), handler);",
    "onCall(appCheckCallableOptionsWithSecrets([secret], {timeoutSeconds: 30}), handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret], {cpu: 'gcf_gen1', concurrency: 1}), serviceAccount: 'catch-whatsapp-reader@example.iam.gserviceaccount.com' }, handler);",
    "onCall({ ...appCheckCallableOptionsWithLimits({memory: '512MiB'}), 'serviceAccount': 'reader@example.iam.gserviceaccount.com' }, handler);",
    "const limits = {timeoutSeconds: 30} as const; onCall(appCheckCallableOptionsWithSecrets([secret], limits), handler);",
    "// onCall({enforceAppCheck: false}, handler)\nconst text = 'onCall(unsafe, handler)';",
  ];
  for (const source of valid) assert.deepEqual(fixtureViolations(source), [], source);
  assert.deepEqual(fixtureViolations("https.onCall(policy.appCheckCallableOptions, handler);", `
    import * as https from "firebase-functions/v2/https";
    import * as policy from "../shared/callableOptions";
  `), []);
  assert.deepEqual(fixtureViolations("call(shared, handler);", `
    import {onCall as call} from "firebase-functions/v2/https";
    import {appCheckCallableOptions as shared} from "../shared/callableOptions";
  `), []);
});

test("scanner rejects policy overrides, arbitrary spreads and malformed helper calls", () => {
  const invalid = [
    "onCall({enforceAppCheck: false}, handler);",
    "onCall(appCheckCallableOptionsUnsafe, handler);",
    "onCall(appCheckCallableOptionsWithSecretsUnsafe([secret]), handler);",
    "onCall({ ...other, serviceAccount: 'reader' }, handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret]), enforceAppCheck: false }, handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret]), invoker: 'private' }, handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret]), ...other, serviceAccount: 'reader' }, handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret]), serviceAccount: account }, handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret]), serviceAccount: '' }, handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret]), ['serviceAccount']: 'reader' }, handler);",
    "onCall({ ...appCheckCallableOptionsWithSecrets([secret]), serviceAccount: 'reader', invoker: 'private' }, handler);",
    "onCall(appCheckCallableOptionsWithLimits({enforceAppCheck: false} as any), handler);",
    "onCall(appCheckCallableOptionsWithSecrets([secret], {invoker: 'private'} as any), handler);",
    "onCall(appCheckCallableOptionsWithSecrets([secret], {...other}), handler);",
    "onCall(appCheckCallableOptionsWithLimits({['enforceAppCheck']: false}), handler);",
    "onCall(appCheckCallableOptionsWithLimits({timeoutSeconds}), handler);",
    "onCall(appCheckCallableOptionsWithLimits(dynamicLimits), handler);",
    "let limits = {concurrency: 1}; onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "const limits = {invoker: 'private'}; onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "const limits = {concurrency: 1, ...other}; onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "const base = {enforceAppCheck: false}; onCall(appCheckCallableOptionsWithLimits({...base}), handler);",
    "onCall(appCheckCallableOptionsWithLimits(), handler);",
    "onCall(appCheckCallableOptionsWithSecrets(), handler);",
    "onCall(appCheckCallableOptionsWithSecrets([secret], {}, other), handler);",
    "onCall(appCheckCallableOptionsWithSecrets(...args), handler);",
    "function f(appCheckCallableOptions) { onCall(appCheckCallableOptions, handler); }",
    "function f(appCheckCallableOptionsWithSecrets) { onCall(appCheckCallableOptionsWithSecrets([secret]), handler); }",
    "onCall(handler);",
    "onCall();",
    "onCall(appCheckCallableOptions.enforceAppCheck, handler);",
    "onCall(appCheckCallableOptionsWithLimits.fake({}), handler);",
    "(onCall)({enforceAppCheck: false}, handler);",
    "onCall!({enforceAppCheck: false}, handler);",
    "(onCall as any)({enforceAppCheck: false}, handler);",
    "const limits = {concurrency: 1}; (limits as any).enforceAppCheck = false; onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "const limits = {concurrency: 1}; const alias = limits; alias.invoker = 'private'; onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "const limits = {concurrency: 1}; Object.assign(limits, {enforceAppCheck: false}); onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "const limits = {concurrency: 1}; mutate(limits); onCall(appCheckCallableOptionsWithLimits(limits), handler);",
    "https.onCall({enforceAppCheck: false}, handler);",
    "https['onCall']({enforceAppCheck: false}, handler);",
    "https?.onCall({enforceAppCheck: false}, handler);",
  ];
  for (const source of invalid) assert.equal(fixtureViolations(source).length, 1, source);
  for (const imports of [
    `import {appCheckCallableOptions} from "../other/callableOptions";`,
    `const appCheckCallableOptions = {enforceAppCheck: false};`,
    `function appCheckCallableOptionsWithSecrets() { return {enforceAppCheck: false}; }`,
  ]) {
    const options = imports.includes("WithSecrets") ?
      "appCheckCallableOptionsWithSecrets([secret])" : "appCheckCallableOptions";
    assert.equal(fixtureViolations(`onCall(${options}, handler);`, imports).length, 1, imports);
  }
});

test("callableWithLimits call sites pass literal limits; only the wrapper may forward them", () => {
  const wrapperImports = `
import {callableWithLimits} from "../platform/callables/callable";
`;
  assert.deepEqual(fixtureViolations(
    "export const a = callableWithLimits({timeoutSeconds: 60, maxInstances: 5}, spec);",
    wrapperImports), []);
  for (const body of [
    "export const a = callableWithLimits({enforceAppCheck: false} as any, spec);",
    "export const a = callableWithLimits({...other}, spec);",
    "export const a = callableWithLimits(limitsFromElsewhere, spec);",
    "export const a = callableWithLimits(undefined as any, spec);",
  ]) {
    assert.equal(fixtureViolations(body, wrapperImports).length, 1, body);
  }
  // Forwarding a parameter is refused anywhere but the wrapper module.
  const forward = "export function callableWithLimits(limits: any, spec: any) " +
    "{ return onCall(appCheckCallableOptionsWithLimits(limits), handler); }";
  assert.equal(fixtureViolations(forward).length, 1);
  const wrapperPath = path.join(sourceRoot, "platform", "callables", "callable.ts");
  const wrapperFixture = `import {onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions, appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
`;
  assert.deepEqual(callableViolations(wrapperFixture + forward, wrapperPath), []);
  // Even there, only the limits parameter of callableWithLimits.
  assert.equal(callableViolations(wrapperFixture +
    "export function callableWithLimits(limits: any, spec: any) " +
    "{ return onCall(appCheckCallableOptionsWithLimits(spec), handler); }",
  wrapperPath).length, 1);
  assert.equal(callableViolations(wrapperFixture +
    "export function other(limits: any, spec: any) " +
    "{ return onCall(appCheckCallableOptionsWithLimits(limits), handler); }",
  wrapperPath).length, 1);
});

test("scanner proves imported legacy wrapper implementations", () => {
  const modulePath = path.join(sourceRoot, "shared", "fixturePolicy.ts");
  const imports = `import {policy} from "../shared/fixturePolicy";`;
  const preamble = `import {appCheckCallableOptionsWithLimits} from "./callableOptions";`;
  const valid = `${preamble} export function policy(limits) {
    return {...appCheckCallableOptionsWithLimits(limits), serviceAccount: 'reader@'};
  }`;
  const check = (implementation, options = "{concurrency: 1}") => callableViolations(
    `${imports} onCall(policy(${options}), handler);`, fixturePath, new Set(),
    new Map([[modulePath, implementation]]));
  assert.deepEqual(check(valid), []);
  assert.equal(check(valid, "{enforceAppCheck: false}").length, 1);
  assert.equal(check(`${preamble} export async function policy(limits) {return appCheckCallableOptionsWithLimits(limits);}`).length, 1);
  assert.equal(check(`${preamble} export function* policy(limits) {return appCheckCallableOptionsWithLimits(limits);}`).length, 1);
  for (const body of [
    "return {enforceAppCheck: false};",
    "return {...appCheckCallableOptionsWithLimits(limits), invoker: 'private'};",
    "return {...appCheckCallableOptionsWithLimits(limits), ...other, serviceAccount: 'reader@'};",
    "limits.enforceAppCheck = false; return {...appCheckCallableOptionsWithLimits(limits), serviceAccount: 'reader@'};",
  ]) assert.equal(check(`${preamble} export function policy(limits) {${body}}`).length, 1, body);
});

test("shared callable options declare App Check and public invoker intent", () => {
  const source = fs.readFileSync(
    path.join(sourceRoot, "shared", "callableOptions.ts"),
    "utf8",
  );

  const {enforceAppCheckForRuntime, appCheckCallableOptions} = require("../lib/shared/callableOptions.js");
  assert.equal(appCheckCallableOptions.enforceAppCheck, true);
  assert.equal(appCheckCallableOptions.invoker, "public");
  assert.equal(enforceAppCheckForRuntime({}), true);
  const local = {FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-catch",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199"};
  assert.equal(enforceAppCheckForRuntime(local), false);
  for (const key of Object.keys(local)) {
    const missing = {...local}; delete missing[key];
    assert.equal(enforceAppCheckForRuntime(missing), true, key);
  }
  assert.equal(enforceAppCheckForRuntime({...local, GCLOUD_PROJECT: "catchdates-dev"}), true);
  assert.equal(enforceAppCheckForRuntime({...local, GCLOUD_PROJECT: "catch-dating-app-64e51"}), true);
  assert.equal(enforceAppCheckForRuntime({...local, FIRESTORE_EMULATOR_HOST: "cloud.example:8080"}), true);
  assert.match(source, /invoker:\s*"public"/);
});


test("scanner accepts only the confined SDK project identity expression", () => {
  const imports = fixtureImports + '\nimport {expr, projectID} from "firebase-functions/params";';
  const exact = 'expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`';
  const callable = (expression = exact) =>
    `onCall({...appCheckCallableOptionsWithSecrets([secret]), serviceAccount: ${expression}}, handler);`;
  assert.deepEqual(fixtureViolations(callable(), imports), []);
  const aliasedImports = fixtureImports +
    '\nimport {expr as sdkExpr, projectID as sdkProject} from "firebase-functions/params";';
  const aliasedCall = callable().replace('expr`', 'sdkExpr`').replace('${projectID}', '${sdkProject}');
  assert.deepEqual(fixtureViolations(aliasedCall, aliasedImports), []);
  for (const escape of ['const alias = {sdkProject}; alias.sdkProject.name = "FOREIGN";',
    'const alias = {sdkExpr};', 'export {sdkProject};', 'export {sdkExpr};',
    'export {sdkProject as escapedProject};', 'export {sdkExpr as escapedTag};']) {
    assert.equal(fixtureViolations(escape + aliasedCall, aliasedImports).length, 1, escape);
  }
  for (const expression of [
    'expr`catch-whatsapp-reader@${process.env.PROJECT}.iam.gserviceaccount.com`',
    'expr`catch-whatsapp-reader@${projectID.value()}.iam.gserviceaccount.com`',
    'expr`catch-whatsapp-reader@${projectID}${projectID}.iam.gserviceaccount.com`',
    'expr`other-reader@${projectID}.iam.gserviceaccount.com`',
    'expr`catch-whatsapp-reader@${projectID}.example.com`',
    '`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`',
  ]) assert.equal(fixtureViolations(callable(expression), imports).length, 1, expression);
  for (const preamble of [
    'projectID.name = "FOREIGN";', 'projectID.value = () => "foreign";',
    'expr = () => "fake";', 'Object.assign(projectID, {name:"FOREIGN"});',
    'unknown(projectID);', 'const alias = projectID;',
    'const alias = {projectID}; alias.projectID.name = "FOREIGN";',
    'const alias = {expr}; alias.expr = () => "fake";',
    'export {projectID};', 'export {expr};',
    'export {projectID as escapedProject};', 'export {expr as escapedTag};',
  ]) assert.equal(fixtureViolations(preamble + callable(), imports).length, 1, preamble);
  for (const parameter of ['expr', 'projectID']) {
    assert.equal(fixtureViolations(`function f(${parameter}) {${callable()}}`, imports).length, 1);
  }
  for (const fake of [
    '\nimport {expr, projectID} from "../fake";',
    '\nimport type {expr, projectID} from "firebase-functions/params";',
    '\nimport {expr, type projectID} from "firebase-functions/params";',
  ]) assert.equal(fixtureViolations(callable(), fixtureImports + fake).length, 1, fake);
  assert.equal(fixtureViolations(callable().replace('}, handler)', ', enforceAppCheck: false}, handler)'), imports).length, 1);
});

test("pinned SDK wire manifest preserves PROJECT_ID while shorthand stays incomplete", () => {
  const {onCall} = require("firebase-functions/v2/https");
  const {expr, projectID} = require("firebase-functions/params");
  const sdkPackage = path.resolve(path.dirname(require.resolve("firebase-functions/v2/https")),
    "../../../package.json");
  assert.equal(require(sdkPackage).version, "7.4.0");
  const {stackToWire} = require(path.join(path.dirname(sdkPackage), "lib/runtime/manifest.js"));
  const wire = (serviceAccount) => {
    const callable = onCall({serviceAccount, enforceAppCheck: true}, () => {});
    return JSON.parse(JSON.stringify(stackToWire({specVersion: "v1alpha1",
      endpoints: {reader: callable.__endpoint}, params: []}))).endpoints.reader;
  };
  const reader = wire(expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`);
  assert.equal(reader.serviceAccountEmail,
    'catch-whatsapp-reader@{{ params.PROJECT_ID }}.iam.gserviceaccount.com');
  assert.equal(wire("catch-whatsapp-reader@").serviceAccountEmail, "catch-whatsapp-reader@");
});
