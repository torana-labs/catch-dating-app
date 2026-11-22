// Which handwritten functions/src modules write which Firestore collections,
// read from the TypeScript syntax tree without type information.
//
// A write is set/update/create/delete called on a document reference, or on
// a transaction, batch or bulk writer whose first argument is one. A
// reference is followed through .collection(), .collectionGroup() and .doc()
// calls, string constants and object members (local or imported), variables
// declared in an enclosing scope, snapshot .ref, and functions (local or
// imported) that return a reference. A reference passed in as a parameter is
// not followed, so the result is a lower bound: it finds the inline writes
// that bypass an owning context's functions, not every write.
import path from "node:path";
import {createRequire} from "node:module";
import {fromRepo} from "../../lib/repo_paths.mjs";

const writeMethods = new Set(["set", "update", "create", "delete"]);
const maxDepth = 8;

export function loadTypescript() {
  return createRequire(fromRepo("package.json"))("typescript");
}

// Map<collection, Map<file, count>> for the given {path: source} files.
export function collectionWrites({files, ts = loadTypescript()}) {
  const sources = new Map();
  for (const [file, text] of files) {
    sources.set(file, ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
  }
  const modules = new Map();
  const functionMemo = new Map();

  const unwrap = (node) => {
    let current = node;
    while (current && (ts.isAsExpression(current) || ts.isParenthesizedExpression(current) ||
        ts.isNonNullExpression(current) || ts.isTypeAssertionExpression(current) ||
        ts.isSatisfiesExpression(current) || ts.isAwaitExpression(current))) {
      current = current.expression;
    }
    return current;
  };

  function resolveModule(from, specifier) {
    if (!specifier.startsWith(".")) return null;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
      .replace(/\.js$/u, "");
    return [`${base}.ts`, `${base}/index.ts`].find((candidate) => sources.has(candidate)) ?? null;
  }

  // Top-level constants, functions and named imports of one module.
  function moduleTable(file) {
    if (modules.has(file)) return modules.get(file);
    const table = {values: new Map(), functions: new Map(), imports: new Map()};
    modules.set(file, table);
    for (const statement of sources.get(file).statements) {
      if (ts.isImportDeclaration(statement) &&
          statement.importClause?.namedBindings &&
          ts.isNamedImports(statement.importClause.namedBindings)) {
        const from = resolveModule(file, statement.moduleSpecifier.text);
        if (from == null) continue;
        for (const element of statement.importClause.namedBindings.elements) {
          table.imports.set(element.name.text, {file: from, name: (element.propertyName ?? element.name).text});
        }
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer) {
            table.values.set(declaration.name.text, declaration.initializer);
          }
        }
      } else if (ts.isFunctionDeclaration(statement) && statement.name) {
        table.functions.set(statement.name.text, statement);
      }
    }
    return table;
  }

  // The module-level declaration a name refers to, following imports.
  function topLevel(file, name, depth = 0) {
    const table = moduleTable(file);
    if (table.values.has(name)) return {file, node: table.values.get(name)};
    if (table.functions.has(name)) return {file, node: table.functions.get(name)};
    const imported = table.imports.get(name);
    return imported && depth < maxDepth ? topLevel(imported.file, imported.name, depth + 1) : null;
  }

  // A string a collection or document path argument evaluates to; a
  // template or concatenation keeps its literal head and marks the rest.
  function stringValue(file, node, depth = 0) {
    const value = unwrap(node);
    if (!value || depth > maxDepth) return null;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
    if (ts.isTemplateExpression(value)) return `${value.head.text}\u0000`;
    if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const head = stringValue(file, value.left, depth + 1);
      return head == null ? null : `${head}\u0000`;
    }
    if (ts.isIdentifier(value)) {
      const found = topLevel(file, value.text);
      return found ? stringValue(found.file, found.node, depth + 1) : null;
    }
    if (ts.isPropertyAccessExpression(value) && ts.isIdentifier(unwrap(value.expression))) {
      const found = topLevel(file, unwrap(value.expression).text);
      const object = found && unwrap(found.node);
      if (object && ts.isObjectLiteralExpression(object)) {
        const member = object.properties.find((property) => ts.isPropertyAssignment(property) &&
          property.name.getText() === value.name.text);
        if (member) return stringValue(found.file, member.initializer, depth + 1);
      }
    }
    return null;
  }

  // The collection a path names: the last collection segment of a
  // collection path, the parent collection of a document path.
  function collectionOfPath(value, documentPath) {
    const [literal, rest] = value.split("\u0000");
    const segments = literal.split("/").filter(Boolean);
    if (rest !== undefined) {
      // A template: only its literal head is known; collections sit at even
      // positions, so the last even segment of the head names one.
      const even = segments.filter((_, index) => index % 2 === 0);
      return even.at(-1) ?? null;
    }
    if (documentPath) return segments.length >= 2 ? segments.at(-2) : null;
    return segments.at(-1) ?? null;
  }

  function declarationsInScope(file, name, from) {
    const found = [];
    for (let scope = from; scope != null && found.length === 0; scope = scope.parent) {
      ts.forEachChild(scope, function visit(child) {
        if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) &&
            child.name.text === name && child.initializer) {
          found.push(child.initializer);
        }
        if (!ts.isFunctionLike(child)) ts.forEachChild(child, visit);
      });
    }
    if (found.length === 0) {
      const top = topLevel(file, name);
      if (top && !ts.isFunctionDeclaration(top.node)) found.push(top.node);
    }
    return found;
  }

  // Collections an expression may reference as a collection or document.
  function referencedCollections(file, node, scope, depth = 0) {
    const value = unwrap(node);
    if (!value || depth > maxDepth) return [];
    if (ts.isCallExpression(value) && ts.isPropertyAccessExpression(value.expression)) {
      const method = value.expression.name.text;
      if ((method === "collection" || method === "collectionGroup") && value.arguments.length > 0) {
        const name = stringValue(file, value.arguments[0]);
        const collection = name == null ? null : collectionOfPath(name, false);
        return collection ? [collection] : [];
      }
      if (method === "doc") {
        const parent = referencedCollections(file, value.expression.expression, scope, depth + 1);
        if (parent.length > 0) return parent;
        const name = value.arguments.length > 0 ? stringValue(file, value.arguments[0]) : null;
        const collection = name?.includes("/") ? collectionOfPath(name, true) : null;
        return collection ? [collection] : [];
      }
      if (method === "withConverter") {
        return referencedCollections(file, value.expression.expression, scope, depth + 1);
      }
      if (method === "get" && value.arguments.length > 0) {
        return referencedCollections(file, value.arguments[0], scope, depth + 1);
      }
    }
    if (ts.isCallExpression(value) && ts.isIdentifier(unwrap(value.expression))) {
      return functionCollections(file, unwrap(value.expression).text, depth + 1);
    }
    if (ts.isPropertyAccessExpression(value) && value.name.text === "ref") {
      return referencedCollections(file, value.expression, scope, depth + 1);
    }
    if (ts.isIdentifier(value)) {
      return declarationsInScope(file, value.text, scope)
        .flatMap((initializer) => referencedCollections(file, initializer, scope, depth + 1));
    }
    return [];
  }

  // Collections a function's returned references name.
  function functionCollections(file, name, depth) {
    const key = `${file}#${name}`;
    if (functionMemo.has(key)) return functionMemo.get(key);
    functionMemo.set(key, []);
    const found = topLevel(file, name);
    let fn = found?.node && unwrap(found.node);
    if (fn && !(ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
      fn = null;
    }
    const result = [];
    if (fn?.body && !ts.isBlock(fn.body)) {
      result.push(...referencedCollections(found.file, fn.body, fn.body, depth));
    } else if (fn?.body) {
      ts.forEachChild(fn.body, function visit(child) {
        if (ts.isReturnStatement(child) && child.expression) {
          result.push(...referencedCollections(found.file, child.expression, child, depth));
        }
        if (!ts.isFunctionLike(child)) ts.forEachChild(child, visit);
      });
    }
    functionMemo.set(key, result);
    return result;
  }

  const writes = new Map();
  for (const [file, source] of sources) {
    ts.forEachChild(source, function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
          writeMethods.has(node.expression.name.text)) {
        let collections = referencedCollections(file, node.expression.expression, node);
        if (collections.length === 0 && node.arguments.length > 0) {
          collections = referencedCollections(file, node.arguments[0], node);
        }
        for (const collection of new Set(collections)) {
          if (!writes.has(collection)) writes.set(collection, new Map());
          const byFile = writes.get(collection);
          byFile.set(file, (byFile.get(file) ?? 0) + 1);
        }
      }
      ts.forEachChild(node, visit);
    });
  }
  return writes;
}
