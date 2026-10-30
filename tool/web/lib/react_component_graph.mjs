import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Symbol-level graph of the exported React components in the web surfaces,
// resolved by the TypeScript checker through barrels, re-exports and dynamic
// imports. A surface's consumer roots are production code that renders its
// components without exporting any of its own: the Next App Router routes in
// website/app serve the public site from website/src components.
export const reactComponentSurfaces = Object.freeze([
  {id: "website", root: "website/src", tsconfig: "website/tsconfig.json", consumerRoots: ["website/app"]},
  {id: "admin", root: "admin/src", tsconfig: "admin/tsconfig.json"},
  {id: "web-ui", root: "packages/web-ui/src", tsconfig: "packages/web-ui/tsconfig.json"},
]);

const sourceExtensions = new Set([".ts", ".tsx"]);

/** Tests and stories consume components without making them production code. */
export function isNonProductionSource(relativePath) {
  return /\.(?:test|spec|stories)\.tsx?$/u.test(relativePath) ||
    relativePath.split("/").some((segment) => ["__tests__", "test", "stories"].includes(segment));
}

export function isComponentName(name) {
  return /^[A-Z][A-Za-z0-9]*$/u.test(name) && !/^[A-Z0-9_]+$/u.test(name);
}

/**
 * Returns `components`, every exported PascalCase function, class or const
 * in a production source file that renders JSX (or is a memo, forwardRef or
 * lazy component), and `references`: each use of a top-level declaration of
 * a scanned file from another top-level declaration (`file::name`) or from
 * module scope (`file`). Private helpers stay in the graph so that
 * consumers can be followed through them.
 */
export function buildReactComponentGraph({repoRoot, surfaces = reactComponentSurfaces} = {}) {
  // Source files are compared by real path, so the root must be one too.
  const root = realPath(path.resolve(repoRoot));
  const components = new Map();
  const references = new Map();
  const scannedFiles = new Set();
  for (const surface of surfaces) {
    const consumerRoots = (surface.consumerRoots ?? []).map((entry) => path.join(root, entry));
    const program = createProgram(root, surface, consumerRoots);
    const checker = program.getTypeChecker();
    const surfaceRoot = path.join(root, surface.root);
    const sourceFiles = program.getSourceFiles().filter((file) =>
      sourceExtensions.has(path.extname(file.fileName)) && !file.isDeclarationFile);
    const files = sourceFiles.filter((file) => isWithin(realPath(file.fileName), surfaceRoot));
    const consumerFiles = sourceFiles.filter((file) =>
      consumerRoots.some((consumerRoot) => isWithin(realPath(file.fileName), consumerRoot)));
    assertWorkspaceImportsWithinRoot(root, [...files, ...consumerFiles], checker);
    for (const file of files) {
      const relative = repoRelative(root, file.fileName);
      scannedFiles.add(relative);
      if (isNonProductionSource(relative)) continue;
      for (const component of declaredComponents(file, checker, relative, surface.id)) {
        components.set(component.id, component);
      }
    }
    for (const file of [...files, ...consumerFiles]) collectReferences(file, checker, root, references);
  }
  const resolved = [...references.values()]
    .filter((reference) => scannedFiles.has(reference.to.split("::")[0]))
    .sort((left, right) => compare(left.from, right.from) || compare(left.to, right.to));
  return {
    components: [...components.values()].sort((left, right) => compare(left.id, right.id)),
    references: resolved,
  };
}

function createProgram(root, surface, consumerRoots) {
  const configPath = path.join(root, surface.tsconfig);
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(diagnosticText(config.error));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  if (parsed.errors.length > 0) throw new Error(parsed.errors.map(diagnosticText).join("\n"));
  const consumerFiles = consumerRoots.flatMap((consumerRoot) =>
    ts.sys.readDirectory(consumerRoot, [...sourceExtensions]));
  return ts.createProgram({
    rootNames: [...parsed.fileNames, ...consumerFiles],
    options: {...parsed.options, noEmit: true},
  });
}

/**
 * A checkout without node_modules of its own, such as a task worktree under
 * .claude/worktrees, resolves @catch/* through an enclosing checkout's
 * install, whose workspace links point at that checkout's packages. Their
 * components would fall outside the scanned roots and lose every consumer,
 * so the graph refuses to describe this checkout from another one's source.
 */
function assertWorkspaceImportsWithinRoot(root, files, checker) {
  const outside = new Map();
  for (const file of files) {
    for (const specifier of moduleSpecifiers(file)) {
      if (!specifier.text.startsWith("@catch/")) continue;
      const module = checker.getSymbolAtLocation(specifier)?.declarations?.find(ts.isSourceFile);
      const resolved = module ? realPath(module.fileName) : null;
      if (resolved && !isWithin(resolved, root)) outside.set(specifier.text, resolved);
    }
  }
  if (outside.size === 0) return;
  const resolutions = [...outside].sort(([left], [right]) => compare(left, right))
    .map(([name, resolved]) => `${name} resolved to ${resolved}, outside ${root}.`);
  throw new Error([
    ...resolutions,
    "This checkout is using another checkout's node_modules. Install its own with " +
      "`bash tool/git/bootstrap_worktree.sh --target root` (npm ci) and rerun.",
  ].join("\n"));
}

// Static import/export specifiers and import("...") arguments.
function moduleSpecifiers(file) {
  const specifiers = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      specifiers.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return specifiers;
}

function declaredComponents(file, checker, relative, surface) {
  const moduleSymbol = checker.getSymbolAtLocation(file);
  if (!moduleSymbol) return [];
  const output = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = resolveAlias(checker, exported);
    const declaration = symbol.declarations?.find((entry) => entry.getSourceFile() === file);
    if (!declaration) continue;
    const name = exported.getName() === "default"
      ? declaration.name?.getText(file) ?? "default"
      : exported.getName();
    if (!isComponentName(name) || !isComponentDeclaration(declaration, symbol, checker)) continue;
    output.push({
      id: `${relative}::${name}`,
      declarationId: `${relative}::${declarationName(declaration, symbol)}`,
      surface,
      file: relative,
      name,
      defaultExport: exported.getName() === "default",
      line: file.getLineAndCharacterOfPosition(declaration.getStart(file)).line + 1,
    });
  }
  return output;
}

function isComponentDeclaration(declaration, symbol, checker) {
  if (ts.isClassDeclaration(declaration)) {
    return declaration.members.some((member) => member.name?.getText() === "render");
  }
  if (ts.isFunctionDeclaration(declaration)) return rendersJsx(declaration.body);
  if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
  const initializer = declaration.initializer;
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    return rendersJsx(initializer.body);
  }
  // memo(), forwardRef() and lazy() return exotic components.
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  return /\b(?:Memo|ForwardRef|Lazy)ExoticComponent\b/u.test(checker.typeToString(type));
}

function rendersJsx(node) {
  if (!node) return false;
  let found = false;
  const visit = (child) => {
    if (found) return;
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function collectReferences(file, checker, root, references) {
  const relative = repoRelative(root, file.fileName);
  const add = (owner, target) => {
    const from = owner ? `${relative}::${owner}` : relative;
    if (from !== target) references.set(`${from}->${target}`, {from, to: target, file: relative});
  };
  const visit = (node, owner) => {
    const nextOwner = ownerOf(node, file) ?? owner;
    if (ts.isIdentifier(node) && !isDeclarationName(node) &&
        !ts.isImportSpecifier(node.parent) && !ts.isExportSpecifier(node.parent)) {
      const symbol = checker.getSymbolAtLocation(node);
      const target = symbol ? resolveAlias(checker, symbol) : null;
      const declaration = target?.declarations?.find(isTopLevelDeclaration);
      if (declaration) add(nextOwner, `${repoRelative(root, declaration.getSourceFile().fileName)}::${declarationName(declaration, target)}`);
    }
    // import("./Route") consumes the module's default export.
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [specifier] = node.arguments;
      const moduleSymbol = specifier ? checker.getSymbolAtLocation(specifier) : null;
      const defaultExport = moduleSymbol
        ? checker.getExportsOfModule(moduleSymbol).find((entry) => entry.getName() === "default")
        : null;
      const target = defaultExport ? resolveAlias(checker, defaultExport) : null;
      const declaration = target?.declarations?.[0];
      if (declaration) add(nextOwner, `${repoRelative(root, declaration.getSourceFile().fileName)}::${declarationName(declaration, target)}`);
    }
    ts.forEachChild(node, (child) => visit(child, nextOwner));
  };
  visit(file, null);
}

function isTopLevelDeclaration(declaration) {
  // Module symbols are declared by the source file itself, which has no parent.
  if (!declaration.parent) return false;
  if (ts.isSourceFile(declaration.parent)) return true;
  return ts.isVariableDeclaration(declaration) &&
    ts.isVariableStatement(declaration.parent?.parent) &&
    ts.isSourceFile(declaration.parent.parent.parent);
}

function declarationName(declaration, symbol) {
  return symbol.getName() === "default" && declaration.name ? declaration.name.getText() : symbol.getName();
}

// The top-level declaration that encloses a node, if any.
function ownerOf(node, file) {
  if (node.parent !== file) return null;
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
    return node.name.text;
  }
  if (ts.isVariableStatement(node)) {
    const names = node.declarationList.declarations
      .filter((declaration) => ts.isIdentifier(declaration.name))
      .map((declaration) => declaration.name.text);
    return names.length === 1 ? names[0] : null;
  }
  return null;
}

function isDeclarationName(node) {
  const parent = node.parent;
  return (ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent) ||
    ts.isVariableDeclaration(parent) || ts.isInterfaceDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent)) && parent.name === node;
}

function resolveAlias(checker, symbol) {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function realPath(file) {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
}

function isWithin(file, directory) {
  const relative = path.relative(directory, file);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function repoRelative(root, file) {
  return path.relative(root, realPath(file)).split(path.sep).join("/");
}

function diagnosticText(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
