import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(
  path.dirname(modulePath),
  "../.."
);
const allowedSourceExtensions = new Set([".ts", ".tsx"]);
const browserContractSchemaDirectories = [
  "callables",
  "callable_responses",
  "operations",
];

function walkSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(absolutePath));
      continue;
    }
    if (allowedSourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

function relativeToAdminSource(adminSrcRoot, absolutePath) {
  return path.relative(adminSrcRoot, absolutePath).split(path.sep).join("/");
}

function isInside(parent, child) {
  const relativePath = path.relative(parent, child);
  return relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function layerFor(relativePath) {
  const parts = relativePath.split("/");
  if (parts[0] === "app") {
    return {name: "app"};
  }
  if (parts[0] === "features") {
    return {name: "feature", feature: parts[1] ?? ""};
  }
  if (parts[0] === "shared") {
    return {name: "shared"};
  }
  if (parts[0] === "generated") {
    return {name: "generated"};
  }
  return {name: "root"};
}

function importSpecifiers(source) {
  const staticImports =
    /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImports = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  const specifiers = [];
  for (const match of source.matchAll(staticImports)) {
    specifiers.push(match[1]);
  }
  for (const match of source.matchAll(dynamicImports)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function isFeatureApiModule(sourceRelativePath) {
  const parts = sourceRelativePath.split("/");
  return parts[0] === "features" && Boolean(parts[1]) && parts[2] === "api";
}

function isCanonicalBrowserContractSchema(repoRoot, targetAbsolutePath) {
  if (!targetAbsolutePath.endsWith(".schema.json")) return false;

  let realRepoRoot;
  try {
    realRepoRoot = fs.realpathSync(repoRoot);
  } catch {
    return false;
  }

  return browserContractSchemaDirectories.some((directory) => {
    const contractRoot = path.join(repoRoot, "contracts", directory);
    if (path.dirname(targetAbsolutePath) !== contractRoot) return false;

    try {
      const realContractRoot = fs.realpathSync(contractRoot);
      const expectedRealContractRoot = path.join(
        realRepoRoot,
        "contracts",
        directory
      );
      return realContractRoot === expectedRealContractRoot &&
        fs.lstatSync(targetAbsolutePath).isFile() &&
        path.dirname(fs.realpathSync(targetAbsolutePath)) === realContractRoot;
    } catch {
      return false;
    }
  });
}

function allowedExternalImport(repoRoot, sourceRelativePath, targetAbsolutePath) {
  if (sourceRelativePath.startsWith("shared/contracts/")) {
    return isInside(
      path.join(repoRoot, "functions/src/shared/generated"),
      targetAbsolutePath
    );
  }
  return isFeatureApiModule(sourceRelativePath) &&
    isCanonicalBrowserContractSchema(repoRoot, targetAbsolutePath);
}

function violationFor(sourceLayer, targetLayer) {
  if (sourceLayer.name === "shared") {
    if (targetLayer.name === "app" || targetLayer.name === "feature") {
      return "shared modules must not import app or feature modules";
    }
    return null;
  }

  if (sourceLayer.name === "feature") {
    if (targetLayer.name === "app" || targetLayer.name === "root") {
      return "feature modules must not import app-shell or root modules";
    }
    if (
      targetLayer.name === "feature" &&
      targetLayer.feature !== sourceLayer.feature
    ) {
      return `feature '${sourceLayer.feature}' must not import feature '${targetLayer.feature}'`;
    }
    return null;
  }

  if (sourceLayer.name === "app") {
    if (targetLayer.name === "root") {
      return "app-shell modules must not import root entry modules";
    }
    return null;
  }

  return null;
}

/**
 * A web-ui import that reaches past the package's public entry points. A
 * subpath the package declares in its exports (such as @catch/web-ui/phone)
 * is an entry point, as the website's boundary check also allows.
 */
function webUiDeepImport(specifier, exportsMap) {
  if (!specifier.startsWith("@catch/web-ui/")) return false;
  return !Object.hasOwn(exportsMap, `./${specifier.slice("@catch/web-ui/".length)}`);
}

function webUiPackageExports(repoRoot) {
  const manifest = path.join(repoRoot, "packages/web-ui/package.json");
  if (!fs.existsSync(manifest)) return {};
  return JSON.parse(fs.readFileSync(manifest, "utf8")).exports ?? {};
}

export function scanAdminImportBoundaries(repoRoot = defaultRepoRoot) {
  const adminSrcRoot = path.join(repoRoot, "admin/src");
  const violations = [];
  const webUiExports = webUiPackageExports(repoRoot);
  for (const file of walkSourceFiles(adminSrcRoot)) {
    const sourceRelativePath = relativeToAdminSource(adminSrcRoot, file);
    const sourceLayer = layerFor(sourceRelativePath);
    const source = fs.readFileSync(file, "utf8");

    for (const specifier of importSpecifiers(source)) {
      if (webUiDeepImport(specifier, webUiExports)) {
        violations.push({
          source: sourceRelativePath,
          specifier,
          reason: "shared web UI must be imported from @catch/web-ui or a subpath it exports, without deep imports",
        });
        continue;
      }
      if (!specifier.startsWith(".")) {
        continue;
      }

      const targetAbsolutePath = path.resolve(path.dirname(file), specifier);
      if (!isInside(adminSrcRoot, targetAbsolutePath)) {
        if (!allowedExternalImport(repoRoot, sourceRelativePath, targetAbsolutePath)) {
          violations.push({
            source: sourceRelativePath,
            specifier,
            reason: "relative import leaves admin/src without an explicit allowlist",
          });
        }
        continue;
      }

      const targetLayer = layerFor(
        relativeToAdminSource(adminSrcRoot, targetAbsolutePath)
      );
      const reason = violationFor(sourceLayer, targetLayer);
      if (reason !== null) {
        violations.push({source: sourceRelativePath, specifier, reason});
      }
    }
  }
  return violations;
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const violations = scanAdminImportBoundaries();
  if (violations.length > 0) {
    console.error("Admin import boundary violations:");
    for (const violation of violations) {
      console.error(
        `- ${violation.source} imports ${violation.specifier}: ${violation.reason}`
      );
    }
    process.exitCode = 1;
  } else {
    console.log("Admin import boundaries passed.");
  }
}
