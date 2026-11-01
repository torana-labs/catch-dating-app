#!/usr/bin/env node
// Static source projection only: never import the Functions entry point, load
// credentials, evaluate environment variables, or execute authored helpers.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";

// Policy-only consumers do not install the Functions analyzer dependency family.
// Load its pinned parser only when source inspection is actually requested.
let ts;
const loadTypeScript = () => { ts ??= createFunctionsRequire()("typescript"); };
const helperNames = new Map([
  ["shared/callableOptions.ts", new Set(["appCheckCallableOptionsWithLimits",
    "appCheckCallableOptionsWithSecrets"])],
  ["shared/organizerFormUploadIdentity.ts", new Set([
    "appCheckCallableOptionsForFormUpload", "appCheckCallableOptionsForFormReview"])],
]);
const endpointWrappers = new Map([
  ["eventSuccess/operations/liveWorkTriggers.ts", new Set(["sourceTrigger"])],
  ["admin/inbox/triggers.ts", new Set(["inboxTrigger"])],
  ["admin/sales/callables.ts", new Set(["read", "write"])],
  ["admin/salesIntelligence/callables.ts", new Set(["read", "write"])],
  ["admin/salesPrivacy/callables.ts", new Set(["privacyCallable"])],
  ["partners/callables.ts", new Set(["callable"])],
]);
const factories = new Map([
  ["https", new Set(["onCall", "onRequest"])],
  ["scheduler", new Set(["onSchedule"])],
  ["firestore", new Set(["onDocumentCreated", "onDocumentUpdated",
    "onDocumentDeleted", "onDocumentWritten", "onDocumentCreatedWithAuthContext",
    "onDocumentUpdatedWithAuthContext", "onDocumentDeletedWithAuthContext",
    "onDocumentWrittenWithAuthContext"])],
  ["tasks", new Set(["onTaskDispatched"])],
  ["pubsub", new Set(["onMessagePublished"])],
  ["storage", new Set(["onObjectFinalized", "onObjectDeleted",
    "onObjectArchived", "onObjectMetadataUpdated"])],
]);
const fail = () => { throw new Error("Function binding intent is unresolved."); };
const validName = (value) => typeof value === "string" &&
  /^[A-Za-z][A-Za-z0-9_]{0,127}$/u.test(value);
const publicString = (value, pattern) => typeof value === "string" &&
  !/\s/u.test(value) && pattern.test(value);
const unwrap = (node) => {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) node = node.expression;
  return node;
};

/** Discover explicit authored exports without executing the source module. */
export function discoverFunctionExportNames(indexSource) {
  try {
    loadTypeScript();
    if (typeof indexSource !== "string" || indexSource.length > 2 * 1024 * 1024) fail();
    const ast = ts.createSourceFile("index.ts", indexSource, ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) fail();
    const names = [];
    for (const statement of ast.statements) {
      if (ts.isExportDeclaration(statement)) {
        if (statement.isTypeOnly) continue;
        if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) fail();
        for (const item of statement.exportClause.elements) {
          if (!item.isTypeOnly) names.push(item.name.text);
        }
      } else if (ts.isExportAssignment(statement)) fail();
      else if (statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (statement.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) fail();
        if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue;
        if (ts.isFunctionDeclaration(statement) && statement.name) names.push(statement.name.text);
        else if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name)) fail();
            names.push(declaration.name.text);
          }
        } else fail();
      }
    }
    if (!names.every(validName) || new Set(names).size !== names.length) fail();
    return names.sort();
  } catch { fail(); }
}

/** sourceSha is an assertion: the caller must verify approved source bytes. */
export function collectFunctionBindingIntent({sourceRoot, environment, projectId,
  projectNumber, sourceSha, consumers}) {
  try {
    loadTypeScript();
    if (!publicString(sourceSha, /^[0-9a-f]{40}$/u) ||
        !["dev", "staging", "prod"].includes(environment) ||
        !publicString(projectId, /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/u) ||
        !publicString(projectNumber, /^[1-9][0-9]{0,29}$/u) ||
        !Array.isArray(consumers) || !consumers.length ||
        consumers.length > 2000 || !consumers.every(validName) ||
        new Set(consumers).size !== consumers.length) fail();
    const functionsDir = path.join(sourceRoot, "functions");
    const lockPath = path.join(functionsDir, "package-lock.json");
    for (const filename of [functionsDir, path.join(functionsDir, "src"), lockPath]) {
      if (fs.lstatSync(filename).isSymbolicLink()) fail();
    }
    if (fs.statSync(lockPath).size > 5 * 1024 * 1024) fail();
    // These reset/merge/project-expression semantics were inspected in this pinned SDK.
    // An SDK change needs review, not an assumed default runtime identity.
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (lock.packages?.["node_modules/firebase-functions"]?.version !== "7.4.0") fail();
    const src = fs.realpathSync(path.join(functionsDir, "src"));
    // SDK global options are shared process state. Only the entry point may
    // establish them; another module would make import ordering significant.
    const sourceFiles = [];
    let inspected = 0;
    const inspectGlobals = (directory) => {
      for (const item of fs.readdirSync(directory, {withFileTypes: true})) {
        if (++inspected > 20000 || item.isSymbolicLink()) fail();
        const filename = path.join(directory, item.name);
        if (item.isDirectory()) inspectGlobals(filename);
        else if (item.isFile() && item.name.endsWith(".ts") &&
            !item.name.endsWith(".test.ts") && filename !== path.join(src, "index.ts")) {
          if (fs.statSync(filename).size > 2 * 1024 * 1024) fail();
          sourceFiles.push(filename);
          const source = fs.readFileSync(filename, "utf8");
          if (/\bsetGlobalOptions\b/u.test(source)) fail();
          // Computed property names can hide the setter token. Other source
          // modules cannot import the global-options namespace at all.
          const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
          if (ast.parseDiagnostics.length) fail();
          const globalModules = new Set(["firebase-functions", "firebase-functions/v2",
            "firebase-functions/v2/options"]);
          const visit = (node) => {
            if (ts.isImportDeclaration(node) &&
                (node.moduleSpecifier.text === "firebase-functions/v2/options" ||
                  globalModules.has(node.moduleSpecifier.text) &&
                  node.importClause?.namedBindings &&
                  ts.isNamespaceImport(node.importClause.namedBindings))) fail();
            if (ts.isCallExpression(node) &&
                (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                  ts.isIdentifier(node.expression) && node.expression.text === "require") &&
                node.arguments.some((a) => ts.isStringLiteral(a) && globalModules.has(a.text))) fail();
            ts.forEachChild(node, visit);
          };
          visit(ast);
        }
      }
    };
    inspectGlobals(src);
    const modules = new Map();
    const watched = new Map();
    const active = new Set();
    let steps = 0;
    const enter = (key, fn) => {
      if (++steps > 100000 || active.has(key)) fail();
      active.add(key);
      try { return fn(); } finally { active.delete(key); }
    };
    const load = (filename, scanOnly = false) => {
      const real = fs.realpathSync(filename);
      if (!real.startsWith(src + path.sep) || !real.endsWith(".ts") ||
          real.endsWith(".test.ts") || fs.lstatSync(filename).isSymbolicLink()) fail();
      if (modules.has(real)) return modules.get(real);
      if (fs.statSync(real).size > 2 * 1024 * 1024) fail();
      const ast = ts.createSourceFile(real, fs.readFileSync(real, "utf8"),
        ts.ScriptTarget.Latest, true);
      if (ast.parseDiagnostics.length) fail();
      const mod = {ast, file: real, imports: new Map(), defs: new Map(),
        exports: new Map(), stars: []};
      modules.set(real, mod);
      const add = (map, name, value) => {
        if (map.has(name)) fail();
        map.set(name, value);
      };
      for (const statement of ast.statements) {
        if (ts.isImportDeclaration(statement)) {
          const bindings = statement.importClause?.namedBindings;
          if (statement.importClause?.isTypeOnly) continue;
          if (statement.importClause?.name) add(mod.imports, statement.importClause.name.text,
            {module: statement.moduleSpecifier.text, name: "default"});
          if (bindings && ts.isNamedImports(bindings)) {
            for (const item of bindings.elements) {
              if (!item.isTypeOnly) add(mod.imports, item.name.text,
                {module: statement.moduleSpecifier.text,
                  name: (item.propertyName ?? item.name).text});
            }
          } else if (bindings && ts.isNamespaceImport(bindings)) {
            add(mod.imports, bindings.name.text,
              {module: statement.moduleSpecifier.text, namespace: true});
          }
        } else if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name)) continue;
            add(mod.defs, declaration.name.text, {node: declaration.initializer,
              constant: !!(statement.declarationList.flags & ts.NodeFlags.Const)});
            if (statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
              add(mod.exports, declaration.name.text, {name: declaration.name.text});
            }
          }
        } else if (ts.isFunctionDeclaration(statement) && statement.name) {
          if (scanOnly && !statement.body) continue;
          add(mod.defs, statement.name.text, {node: statement, constant: true});
          if (statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            add(mod.exports, statement.name.text, {name: statement.name.text});
          }
        } else if (ts.isExportAssignment(statement)) {
          if (!scanOnly || !ts.isIdentifier(unwrap(statement.expression))) fail();
          add(mod.exports, "default", {name: unwrap(statement.expression).text});
        } else if (ts.isExportDeclaration(statement)) {
          if (statement.isTypeOnly) continue;
          if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
            if (!scanOnly || statement.exportClause || !statement.moduleSpecifier?.text?.startsWith(".")) fail();
            mod.stars.push(statement.moduleSpecifier.text);
            continue;
          }
          for (const item of statement.exportClause.elements) {
            if (!item.isTypeOnly) add(mod.exports, item.name.text, {
              module: statement.moduleSpecifier?.text,
              name: (item.propertyName ?? item.name).text,
            });
          }
        }
      }
      return mod;
    };
    const imported = (entry, mod) => {
      if (!entry.module.startsWith(".")) return {sdk: entry.module, name: entry.name};
      if (entry.module.includes("\\") || entry.module.includes("\0")) fail();
      const target = load(path.resolve(path.dirname(mod.file), entry.module + ".ts"));
      return exported(entry.name, target);
    };
    const exported = (name, mod) => enter(`export:${mod.file}:${name}`, () => {
      const entry = mod.exports.get(name);
      if (!entry) fail();
      return entry.module ? imported(entry, mod) : symbol(entry.name, mod, new Map());
    });
    const rootedAt = (node, name) => {
      node = unwrap(node);
      while (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
        node = unwrap(node.expression);
      return ts.isIdentifier(node) && node.text === name;
    };
    const captures = (node, name) => {
      node = unwrap(node);
      if (rootedAt(node, name)) return true;
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return false;
      if (ts.isPropertyAssignment(node)) return captures(node.initializer, name);
      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) ||
          ts.isFunctionDeclaration(node) || ts.isCallExpression(node)) return false;
      let found = false;
      ts.forEachChild(node, (child) => { if (captures(child, name)) found = true; });
      return found;
    };
    const symbol = (name, mod, locals) => {
      if (locals.has(name)) return locals.get(name);
      if (mod.imports.has(name)) return imported(mod.imports.get(name), mod);
      const value = mod.defs.get(name);
      if (!value?.node || !value.constant) fail();
      watched.set(`${mod.file}:${name}`, {mod, name});
      // Const does not prevent object mutation. Refuse post-declaration writes.
      const visit = (node) => {
        // An alias would escape the local proof, including aliases passed to an
        // unknown mutator later. Reject the escape rather than assuming const
        // also freezes the referenced object.
        if (ts.isVariableDeclaration(node) && node.initializer &&
            captures(node.initializer, name) && (!ts.isIdentifier(node.name) || !watched.has(`${mod.file}:${node.name.text}`))) fail();
        if (ts.isArrowFunction(node) && !ts.isBlock(node.body) && captures(node.body, name)) fail();
        if ((ts.isForOfStatement(node) || ts.isForInStatement(node) ||
            ts.isYieldExpression(node)) && node.expression && captures(node.expression, name)) fail();
        if (ts.isReturnStatement(node) && node.expression && captures(node.expression, name) &&
          !(ts.isFunctionDeclaration(node.parent?.parent) &&
            helperNames.get(path.relative(src, mod.file).split(path.sep).join("/"))
              ?.has(node.parent.parent.name?.text))) fail();
        if (ts.isBinaryExpression(node) &&
            node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment && captures(node.right, name)) fail();
        if (ts.isBinaryExpression(node) &&
            node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
          if (rootedAt(node.left, name)) fail();
        }
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === "Object" &&
            ["assign", "defineProperty", "defineProperties", "setPrototypeOf"]
              .includes(node.expression.name.text) &&
            node.arguments.some((arg) => rootedAt(arg, name) || captures(arg, name))) fail();
        if (ts.isDeleteExpression(node) || ts.isPostfixUnaryExpression(node) ||
            ts.isPrefixUnaryExpression(node)) {
          if (rootedAt(node.expression ?? node.operand, name)) fail();
        }
        if (ts.isCallExpression(node)) {
          const method = unwrap(node.expression);
          if ((ts.isPropertyAccessExpression(method) || ts.isElementAccessExpression(method)) &&
              rootedAt(method.expression, name) &&
              !(ts.isPropertyAccessExpression(method) && method.name.text === "value")) fail();
        }
        if (ts.isCallExpression(node) && node.arguments.some((arg) =>
          rootedAt(arg, name) || captures(arg, name))) {
          const callee = resolve(node.expression, mod, new Map());
          const sdkFactory = callee.sdk?.startsWith("firebase-functions/v2/") &&
            [...factories.values()].some((names) => names.has(callee.name));
          const helper = callee.node && ts.isFunctionDeclaration(callee.node) &&
            helperNames.get(path.relative(src, callee.mod.file).split(path.sep).join("/"))
              ?.has(callee.node.name.text);
          if (!sdkFactory && !helper) fail();
        }
        ts.forEachChild(node, visit);
      };
      visit(mod.ast);
      return {node: value.node, mod, locals: new Map()};
    };
    const resolve = (node, mod, locals) => {
      node = unwrap(node);
      if (ts.isIdentifier(node)) {
        return enter(`symbol:${mod.file}:${node.text}:${node.pos}`, () => {
          const result = symbol(node.text, mod, locals);
          return result.node && ts.isIdentifier(unwrap(result.node)) ?
            resolve(result.node, result.mod, result.locals) : result;
        });
      }
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        const entry = mod.imports.get(node.expression.text);
        if (entry?.namespace) return imported({...entry, name: node.name.text}, mod);
      }
      return {node, mod, locals};
    };
    const scalar = (node, mod, locals) => {
      const value = resolve(node, mod, locals);
      if (!value.node) fail();
      const n = value.node;
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
      if (n.kind === ts.SyntaxKind.NullKeyword) return null;
      if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
      fail();
    };
    // Only this SDK builtin expression is modeled; no authored expression is
    // evaluated. Lexical symbols and confined uses prevent shadowing or mutation
    // from changing the SDK's PROJECT_ID deployment expression.
    const projectAccount = (node, mod) => {
      if (!ts.isTaggedTemplateExpression(node) || !ts.isIdentifier(node.tag) ||
          !ts.isTemplateExpression(node.template) || node.template.templateSpans.length !== 1 ||
          node.template.head.text !== "catch-whatsapp-reader@" ||
          node.template.templateSpans[0].literal.text !== ".iam.gserviceaccount.com" ||
          !ts.isIdentifier(node.template.templateSpans[0].expression)) fail();
      if (!mod.checker) {
        const host = {getSourceFile: (name) => name === mod.file ? mod.ast : undefined,
          getDefaultLibFileName: () => "", writeFile: () => {},
          getCurrentDirectory: () => path.dirname(mod.file), getDirectories: () => [],
          fileExists: (name) => name === mod.file, readFile: () => undefined,
          getCanonicalFileName: (name) => name, useCaseSensitiveFileNames: () => true,
          getNewLine: () => "\n"};
        mod.checker = ts.createProgram([mod.file], {noLib: true, noResolve: true}, host).getTypeChecker();
      }
      const importedBuiltin = (identifier, expected) => {
        const symbol = mod.checker.getSymbolAtLocation(identifier);
        const declarations = symbol?.declarations ?? [];
        const binding = declarations[0];
        if (declarations.length !== 1 || !binding || !ts.isImportSpecifier(binding) ||
            binding.isTypeOnly || (binding.propertyName ?? binding.name).text !== expected ||
            binding.parent.parent.isTypeOnly ||
            binding.parent.parent.parent.moduleSpecifier.text !== "firebase-functions/params") fail();
        return {symbol, binding};
      };
      const tag = importedBuiltin(node.tag, "expr");
      const project = importedBuiltin(node.template.templateSpans[0].expression, "projectID");
      const exactUse = (candidate) => ts.isTaggedTemplateExpression(candidate) &&
        ts.isIdentifier(candidate.tag) && mod.checker.getSymbolAtLocation(candidate.tag) === tag.symbol &&
        ts.isTemplateExpression(candidate.template) && candidate.template.templateSpans.length === 1 &&
        candidate.template.head.text === "catch-whatsapp-reader@" &&
        candidate.template.templateSpans[0].literal.text === ".iam.gserviceaccount.com" &&
        ts.isIdentifier(candidate.template.templateSpans[0].expression) &&
        mod.checker.getSymbolAtLocation(candidate.template.templateSpans[0].expression) === project.symbol;
      const inspect = (reference) => {
        if (ts.isIdentifier(reference)) {
          const symbol = ts.isShorthandPropertyAssignment(reference.parent) ?
            mod.checker.getShorthandAssignmentValueSymbol(reference.parent) :
            ts.isExportSpecifier(reference.parent) ?
              mod.checker.getExportSpecifierLocalTargetSymbol(reference.parent) :
              mod.checker.getSymbolAtLocation(reference);
          if (symbol === tag.symbol && reference !== tag.binding.name &&
              reference !== tag.binding.propertyName &&
              !(reference.parent.tag === reference && exactUse(reference.parent))) fail();
          if (symbol === project.symbol && reference !== project.binding.name &&
              reference !== project.binding.propertyName &&
              !(ts.isTemplateSpan(reference.parent) &&
                reference.parent.expression === reference && exactUse(reference.parent.parent.parent))) fail();
        }
        ts.forEachChild(reference, inspect);
      };
      inspect(mod.ast);
      return `catch-whatsapp-reader@${projectId}.iam.gserviceaccount.com`;
    };
    const secret = (node, mod, locals) => {
      const value = resolve(node, mod, locals);
      if (!value.node) fail();
      const n = unwrap(value.node);
      if (ts.isCallExpression(n)) {
        const factory = resolve(n.expression, value.mod, value.locals);
        if (factory.sdk !== "firebase-functions/params" ||
            factory.name !== "defineSecret" || n.arguments.length !== 1) fail();
        return secret(n.arguments[0], value.mod, value.locals);
      }
      const name = scalar(n, value.mod, value.locals);
      if (!publicString(name, /^[A-Z][A-Z0-9_]{0,254}$/u)) fail();
      return name;
    };
    const secrets = (node, mod, locals) => {
      const value = resolve(node, mod, locals);
      if (!value.node || !ts.isArrayLiteralExpression(unwrap(value.node))) fail();
      return unwrap(value.node).elements.flatMap((item) =>
        ts.isSpreadElement(item) ? secrets(item.expression, value.mod, value.locals) :
          [secret(item, value.mod, value.locals)]);
    };
    const options = (node, mod, locals = new Map()) => enter(
      `options:${mod.file}:${node.pos}:${[...locals.keys()].join(",")}`, () => {
        const value = resolve(node, mod, locals);
        if (!value.node) fail();
        const n = unwrap(value.node);
        if (ts.isCallExpression(n)) {
          const helper = resolve(n.expression, value.mod, value.locals);
          const def = helper.node;
          if (!def || !ts.isFunctionDeclaration(def) ||
              !helperNames.get(path.relative(src, helper.mod.file).split(path.sep).join("/"))
                ?.has(def.name.text) || def.body?.statements.length !== 1 ||
              !ts.isReturnStatement(def.body.statements[0]) ||
              !def.body.statements[0].expression ||
              n.arguments.length > def.parameters.length) fail();
          const args = new Map();
          def.parameters.forEach((parameter, i) => {
            if (!ts.isIdentifier(parameter.name)) fail();
            if (n.arguments[i]) args.set(parameter.name.text,
              {node: n.arguments[i], mod: value.mod, locals: value.locals});
            else if (parameter.initializer) args.set(parameter.name.text,
              {node: parameter.initializer, mod: helper.mod, locals: args});
            else fail();
          });
          return options(def.body.statements[0].expression, helper.mod, args);
        }
        if (!ts.isObjectLiteralExpression(n)) fail();
        const result = {};
        for (const item of n.properties) {
          if (ts.isSpreadAssignment(item)) {
            Object.assign(result, options(item.expression, value.mod, value.locals));
            continue;
          }
          if (!ts.isPropertyAssignment(item) && !ts.isShorthandPropertyAssignment(item)) fail();
          if (!ts.isIdentifier(item.name) && !ts.isStringLiteral(item.name)) fail();
          const name = item.name.text;
          const expression = ts.isPropertyAssignment(item) ? item.initializer : item.name;
          if (name === "secrets") result.secretNames = secrets(expression, value.mod, value.locals);
          else if (["serviceAccount", "preserveExternalChanges", "omit"].includes(name)) {
            result[name] = name === "serviceAccount" && ts.isTaggedTemplateExpression(unwrap(expression)) ?
              projectAccount(unwrap(expression), value.mod) : scalar(expression, value.mod, value.locals);
            if (name !== "serviceAccount" && result[name] !== null &&
                typeof result[name] !== "boolean") fail();
          } else if (["serviceAccountEmail", "secretEnvironmentVariables", "__proto__"]
            .includes(name)) fail();
        }
        return result;
      });
    const index = load(path.join(src, "index.ts"));
    const checkGlobalSetterUse = (node) => {
      if (ts.isImportDeclaration(node)) {
        if (node.importClause?.namedBindings &&
            ts.isNamespaceImport(node.importClause.namedBindings) &&
            ["firebase-functions", "firebase-functions/v2", "firebase-functions/v2/options"]
              .includes(node.moduleSpecifier.text)) fail();
        return;
      }
      if (ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            ts.isIdentifier(node.expression) && node.expression.text === "require") &&
          node.arguments.some((a) => ts.isStringLiteral(a) &&
            ["firebase-functions", "firebase-functions/v2", "firebase-functions/v2/options"]
              .includes(a.text))) fail();
      if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) &&
          index.imports.get(node.expression.text)?.namespace &&
          ["firebase-functions", "firebase-functions/v2", "firebase-functions/v2/options"]
            .includes(index.imports.get(node.expression.text).module)) fail();
      const binding = ts.isIdentifier(node) ? index.imports.get(node.text) :
        ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) &&
        index.imports.get(node.expression.text)?.namespace ?
          {...index.imports.get(node.expression.text), name: node.name.text} : null;
      if (binding?.name === "setGlobalOptions" &&
          ["firebase-functions", "firebase-functions/v2", "firebase-functions/v2/options"]
            .includes(binding.module) &&
          !(ts.isCallExpression(node.parent) && node.parent.expression === node &&
            ts.isExpressionStatement(node.parent.parent) &&
            node.parent.parent.parent === index.ast)) fail();
      ts.forEachChild(node, checkGlobalSetterUse);
    };
    checkGlobalSetterUse(index.ast);
    let globalOptions = {};
    let globals = 0;
    for (const statement of index.ast.statements) {
      if (!ts.isExpressionStatement(statement) ||
          !ts.isCallExpression(statement.expression)) continue;
      const call = statement.expression;
      const callee = resolve(call.expression, index, new Map());
      if (["firebase-functions", "firebase-functions/v2", "firebase-functions/v2/options"]
        .includes(callee.sdk) && callee.name === "setGlobalOptions") {
        if (++globals > 1 || call.arguments.length !== 1) fail();
        const earlierImports = index.ast.statements.filter((s) => s.pos < statement.pos);
        // A non-exported endpoint may be exported later. Proving initialization
        // order by export position alone would silently apply the wrong globals.
        if (earlierImports.some((s) => ts.isVariableStatement(s) &&
            s.declarationList.declarations.some((d) => d.initializer))) fail();
        if (earlierImports.some((s) => ts.isVariableStatement(s) &&
          s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))) fail();
        if (earlierImports.some((s) =>
          (ts.isExportDeclaration(s) || ts.isImportDeclaration(s)) &&
            s.moduleSpecifier?.text?.startsWith(".") &&
            !s.isTypeOnly && !s.importClause?.isTypeOnly)) fail();
        globalOptions = options(call.arguments[0], index);
      }
    }
    const endpointOptions = (target) => enter(
      `endpoint:${target.mod.file}:${target.node?.pos}`, () => {
      const call = target.node && unwrap(target.node);
      if (!call || !ts.isCallExpression(call)) fail();
      const factory = resolve(call.expression, target.mod, target.locals);
      if (!factory.sdk) {
        const def = factory.node && unwrap(factory.node);
        const wrapperName = ts.isIdentifier(call.expression) ? call.expression.text : null;
        const relative = path.relative(src, factory.mod.file).split(path.sep).join("/");
        if (!def || !endpointWrappers.get(relative)?.has(def.name?.text ?? wrapperName) ||
            (!ts.isFunctionDeclaration(def) && !ts.isArrowFunction(def)) ||
            !def.body || def.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
            def.asteriskToken || call.arguments.length !== def.parameters.length) fail();
        const body = ts.isBlock(def.body) ?
          def.body.statements.length === 1 && ts.isReturnStatement(def.body.statements[0]) ?
            def.body.statements[0].expression : null : def.body;
        if (!body) fail();
        const args = new Map();
        def.parameters.forEach((parameter, i) => {
          if (!ts.isIdentifier(parameter.name) || parameter.dotDotDotToken) fail();
          args.set(parameter.name.text, {node: call.arguments[i],
            mod: target.mod, locals: target.locals});
        });
        return endpointOptions({node: body, mod: factory.mod, locals: args});
      }
      const module = factory.sdk.match(/^firebase-functions\/v2\/([a-z]+)$/u)?.[1];
      if (!module || !factories.get(module)?.has(factory.name) ||
          ![1, 2].includes(call.arguments.length)) fail();
      const handler = unwrap(call.arguments.at(-1));
      if (!ts.isArrowFunction(handler) && !ts.isFunctionExpression(handler) &&
          !ts.isIdentifier(handler) && !ts.isPropertyAccessExpression(handler) &&
          !ts.isCallExpression(handler)) fail();
      let local = {};
      if (call.arguments.length === 2) {
        const resolved = resolve(call.arguments[0], target.mod, target.locals);
        if (!resolved.node) fail();
        const arg = unwrap(resolved.node);
        // Resolve imported const selectors, but never evaluate dynamic selectors.
        if (!ts.isStringLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg) &&
            !ts.isTemplateExpression(arg)) local = options(arg, resolved.mod, resolved.locals);
        else if (module === "https" || module === "tasks") fail();
      } else if (module !== "https" && module !== "storage") fail();
      return local;
    });
    const functions = [...consumers].sort().map((consumer) => {
      const local = endpointOptions(exported(consumer, index));
      const opts = {...globalOptions, ...local};
      if (globalOptions.preserveExternalChanges === true ||
          local.preserveExternalChanges === true || opts.omit === true) fail();
      let serviceAccount = opts.serviceAccount;
      if (serviceAccount === undefined || serviceAccount === null || serviceAccount === "default") {
        serviceAccount = `${projectNumber}-compute@developer.gserviceaccount.com`;
      } else if (publicString(serviceAccount, /^[a-z][a-z0-9-]{4,28}[a-z0-9]@$/u)) {
        // The pinned v2 endpoint manifest preserves shorthand literally. The
        // CLI secret IAM path does not expand it, so this composition cannot
        // establish deployment readiness even if trigger annotations expand it.
        if ((opts.secretNames ?? []).length) fail();
        serviceAccount += `${projectId}.iam.gserviceaccount.com`;
      } else if (!publicString(serviceAccount,
        /^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]+\.iam\.gserviceaccount\.com$/u)) fail();
      if (new Set(opts.secretNames ?? []).size !== (opts.secretNames ?? []).length) fail();
      return {consumer, platform: "gcfv2", serviceAccount,
        secretNames: [...new Set(opts.secretNames ?? [])].sort()};
    });
    // Importer mutations are outside the defining module. Resolve named import
    // provenance to the watched source binding and scan the importing local name
    // with the same mutation/escape rules, without evaluating either module.
    // Mutation can occur in a different imported module, even if that module
    // does not export the selected endpoint. Inspect every authored source file.
    for (const filename of sourceFiles) load(filename, true);
    const importedSource = (mod, specifier) => {
      const target = path.resolve(path.dirname(mod.file), specifier);
      return modules.get(target + ".ts") ?? modules.get(path.join(target, "index.ts"));
    };
    const exportOrigin = (name, mod, seen) => {
      const key = `export:${mod.file}:${name}`;
      if (seen.has(key)) fail();
      seen = new Set([...seen, key]);
      const ex = mod.exports.get(name);
      if (ex) {
        if (!ex.module) return origin(ex.name, mod, seen);
        if (!ex.module.startsWith(".")) return null;
        const target = importedSource(mod, ex.module);
        return target ? exportOrigin(ex.name, target, seen) : null;
      }
      const matches = mod.stars.flatMap((specifier) => {
        const target = importedSource(mod, specifier);
        const value = target ? exportOrigin(name, target, seen) : null;
        return value ? [value] : [];
      });
      if (new Set(matches).size > 1) fail();
      return matches[0] ?? null;
    };
    const origin = (name, mod, seen = new Set()) => {
      const key = `${mod.file}:${name}`;
      if (seen.has(key)) fail();
      seen = new Set([...seen, key]);
      const entry = mod.imports.get(name);
      if (!entry) return key;
      if (!entry.module.startsWith(".") || entry.namespace) return null;
      const importedMod = importedSource(mod, entry.module);
      return importedMod ? exportOrigin(entry.name, importedMod, seen) : null;
    };
    const namespaceHasWatchedExport = (mod, seen = new Set()) => {
      if (!mod || seen.has(mod.file)) return false;
      seen = new Set([...seen, mod.file]);
      if ([...mod.exports.keys()].some((name) => watched.has(exportOrigin(name, mod, new Set()))))
        return true;
      return mod.stars.some((specifier) => namespaceHasWatchedExport(importedSource(mod, specifier), seen));
    };
    for (const mod of modules.values()) {
      for (const [name, entry] of mod.imports) {
        if (!entry.module.startsWith(".")) continue;
        const key = entry.namespace ? null : origin(name, mod);
        if (!watched.has(key) && !(entry.namespace &&
          namespaceHasWatchedExport(importedSource(mod, entry.module)))) continue;
        const scan = (node) => {
          if (ts.isVariableDeclaration(node) && node.initializer &&
              captures(node.initializer, name) && (!ts.isIdentifier(node.name) || !watched.has(`${mod.file}:${node.name.text}`))) fail();
          if (ts.isArrowFunction(node) && !ts.isBlock(node.body) && captures(node.body, name)) fail();
          if ((ts.isForOfStatement(node) || ts.isForInStatement(node) ||
              ts.isYieldExpression(node)) && node.expression && captures(node.expression, name)) fail();
          if (ts.isReturnStatement(node) && node.expression && captures(node.expression, name) &&
          !(ts.isFunctionDeclaration(node.parent?.parent) &&
            helperNames.get(path.relative(src, mod.file).split(path.sep).join("/"))
              ?.has(node.parent.parent.name?.text))) fail();
          if (ts.isBinaryExpression(node) &&
              node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
              node.operatorToken.kind <= ts.SyntaxKind.LastAssignment && captures(node.right, name)) fail();
          if (ts.isBinaryExpression(node) &&
              node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
              node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
            if (rootedAt(node.left, name)) fail();
          }
          if (ts.isCallExpression(node) && node.arguments.some((arg) =>
              rootedAt(arg, name) || captures(arg, name))) {
            const callee = resolve(node.expression, mod, new Map());
            const sdkFactory = callee.sdk?.startsWith("firebase-functions/v2/") &&
              [...factories.values()].some((names) => names.has(callee.name));
            const helper = callee.node && ts.isFunctionDeclaration(callee.node) &&
              helperNames.get(path.relative(src, callee.mod.file).split(path.sep).join("/"))
                ?.has(callee.node.name.text);
            if (!sdkFactory && !helper) fail();
          }
          if (ts.isCallExpression(node)) {
            const method = unwrap(node.expression);
            if ((ts.isPropertyAccessExpression(method) || ts.isElementAccessExpression(method)) &&
                rootedAt(method.expression, name) &&
                !(ts.isPropertyAccessExpression(method) && method.name.text === "value")) fail();
          }
          if (ts.isDeleteExpression(node) || ts.isPostfixUnaryExpression(node) ||
              ts.isPrefixUnaryExpression(node)) {
            if (rootedAt(node.expression ?? node.operand, name)) fail();
          }
          ts.forEachChild(node, scan);
        };
        scan(mod.ast);
      }
    }
    return {schemaVersion: 1, sourceSha, environment, projectId, projectNumber, functions};
  } catch {
    // Never serialize ASTs, option values, process env, parser/FS errors or causes.
    fail();
  }
}

export function runCli(argv) {
  try {
    const names = new Map([["--source-root", "sourceRoot"], ["--env", "environment"],
      ["--project", "projectId"], ["--project-number", "projectNumber"],
      ["--source-sha", "sourceSha"], ["--consumers", "consumers"]]);
    const args = {};
    for (let i = 0; i < argv.length; i += 2) {
      const name = names.get(argv[i]);
      if (!name || name in args || !argv[i + 1]) fail();
      args[name] = name === "consumers" ? argv[i + 1].split(",") : argv[i + 1];
    }
    if (Object.keys(args).length !== names.size) fail();
    return collectFunctionBindingIntent(args);
  } catch { fail(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(runCli(process.argv.slice(2))) + "\n"); }
  catch { process.stderr.write("Function binding intent is unresolved.\n"); process.exitCode = 1; }
}
