#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";
import {
  listFirebaseFunctionExports,
  listFirebaseFunctionTargets,
} from "./list_firebase_function_targets.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");

/**
 * Client source roots whose Function references a deployed backend must
 * serve. `app` is the shared Flutter source of the Consumer and Host apps.
 */
export const clientCallableSurfaces = Object.freeze({
  app: Object.freeze({root: "lib", extensions: Object.freeze([".dart"])}),
  website: Object.freeze({
    root: "website/src",
    extensions: Object.freeze([".ts", ".tsx"]),
  }),
  admin: Object.freeze({
    root: "admin/src",
    extensions: Object.freeze([".ts", ".tsx"]),
  }),
});

// Generated contract registries and l10n name every callable whether or not
// a client calls it, so only authored source counts as a reference.
const skippedSourceDirectories = new Set([
  "generated",
  "node_modules",
  "__tests__",
]);
const skippedSourceFile =
  /(?:\.g|\.freezed)\.dart$|\.(?:test|spec|stories)\.tsx?$/u;
const identifierLiteral = /(["'`])([a-z][A-Za-z0-9]{2,127})\1/gu;
const literalCallableInvocation =
  /httpsCallable(?:<[^()]*>)?\(\s*(?:[\w.]+\s*,\s*)?(["'`])([^"'`$\s]+)\1/gu;

/**
 * Lists one source file's identifier-shaped string literals and the literal
 * names passed straight to `httpsCallable`. Repositories often pass a name
 * through a variable, so a callable reference is any literal naming a
 * Function export; the direct call sites additionally prove no client calls
 * a name the backend does not export.
 */
export function scanClientCallableSource(contents) {
  return {
    literals: new Set(
      [...contents.matchAll(identifierLiteral)].map((match) => match[2]),
    ),
    invocations: [...contents.matchAll(literalCallableInvocation)].map(
      (match) => match[2],
    ),
  };
}

/**
 * Derives the Functions each client surface references from source files
 * (`{surface, path, contents}`) and the repository's Function exports.
 */
export function collectClientCallableReferences({files, exportNames}) {
  const exported = new Set(exportNames);
  const references = new Map();
  const undeclaredInvocations = [];
  for (const file of files) {
    const {literals, invocations} = scanClientCallableSource(file.contents);
    for (const literal of literals) {
      if (!exported.has(literal)) continue;
      const reference = references.get(literal) ??
        {surfaces: new Set(), paths: new Set()};
      reference.surfaces.add(file.surface);
      reference.paths.add(file.path);
      references.set(literal, reference);
    }
    for (const callable of invocations) {
      if (!exported.has(callable)) {
        undeclaredInvocations.push({
          surface: file.surface,
          path: file.path,
          callable,
        });
      }
    }
  }
  return {references, undeclaredInvocations};
}

/**
 * A client may only reference Functions the bounded deploy path creates: an
 * undeclared call site or a dormant export would be NOT_FOUND in every
 * environment.
 */
export function validateClientCallableReferences({
  references,
  undeclaredInvocations,
  deployableNames,
}) {
  const deployable = new Set(deployableNames);
  const dormantReferences = [...references.keys()]
    .filter((name) => !deployable.has(name))
    .sort();
  return {
    ok: undeclaredInvocations.length === 0 && dormantReferences.length === 0,
    callables: [...references.keys()]
      .filter((name) => deployable.has(name))
      .sort(),
    dormantReferences,
    undeclaredInvocations,
  };
}

export function readClientCallableSources(
  root,
  surfaces = Object.keys(clientCallableSurfaces),
) {
  const files = [];
  for (const surface of surfaces) {
    const definition = clientCallableSurfaces[surface];
    if (!definition) {
      throw new Error(
        `Unknown client surface ${surface}; expected one of ` +
          `${Object.keys(clientCallableSurfaces).join(", ")}.`,
      );
    }
    const walk = (directory) => {
      for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!skippedSourceDirectories.has(entry.name)) walk(entryPath);
        } else if (
          entry.isFile() &&
          definition.extensions.some((ext) => entry.name.endsWith(ext)) &&
          !skippedSourceFile.test(entry.name)
        ) {
          files.push({
            surface,
            path: path.relative(root, entryPath),
            contents: fs.readFileSync(entryPath, "utf8"),
          });
        }
      }
    };
    walk(path.join(root, definition.root));
  }
  return files;
}

/** Client-referenced, deployable Function names for [surfaces]. */
export function deriveClientCallables({
  root = repoRoot,
  surfaces = Object.keys(clientCallableSurfaces),
} = {}) {
  const strip = (target) => target.replace(/^functions:/u, "");
  const {references, undeclaredInvocations} = collectClientCallableReferences({
    files: readClientCallableSources(root, surfaces),
    exportNames: listFirebaseFunctionExports(root).map(strip),
  });
  return {
    references,
    ...validateClientCallableReferences({
      references,
      undeclaredInvocations,
      deployableNames: listFirebaseFunctionTargets(root).map(strip),
    }),
  };
}

export function validateClientCallableDependencies({
  manifest,
  appRole,
  environment,
  functionTargets,
}) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.dependencies)) {
    throw new Error("Client callable dependency manifest must use version 1.");
  }
  const matching = manifest.dependencies.filter(
    (entry) => entry.appRole === appRole && entry.environment === environment,
  );
  for (const entry of matching) {
    for (const field of ["id", "callable", "region"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        throw new Error(`Dependency entry is missing ${field}.`);
      }
    }
    if (!functionTargets.includes(`functions:${entry.callable}`)) {
      throw new Error(
        `${entry.callable} is not exported from functions/src/index.ts.`,
      );
    }
  }
  return matching;
}

export async function probeCallable({
  projectId,
  region,
  callable,
  fetchImpl = fetch,
}) {
  const url = `https://${region}-${projectId}.cloudfunctions.net/${callable}`;
  const response = await fetchImpl(url, {
    method: "POST",
    redirect: "manual",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({data: {}}),
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`${callable} returned an unexpected redirect.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `${callable} did not return a Firebase callable JSON response ` +
        `(HTTP ${response.status}).`,
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${callable} returned malformed JSON.`);
  }
  const status = payload?.error?.status;
  if (status !== "UNAUTHENTICATED" && status !== "FAILED_PRECONDITION") {
    throw new Error(
      `${callable} live probe failed (HTTP ${response.status}, ` +
        `status ${status ?? "missing"}).`,
    );
  }
  return {url, httpStatus: response.status, callableStatus: status};
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function sourceFunctionTargets() {
  const source = fs.readFileSync(
    path.join(repoRoot, "functions/src/index.ts"),
    "utf8",
  );
  const names = [];
  for (const match of source.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*["']/g)) {
    for (const rawPart of match[1].split(",")) {
      const part = rawPart.trim();
      if (!part) continue;
      const alias = part.match(/\s+as\s+([A-Za-z_$][\w$]*)$/)?.[1];
      const name = alias ?? part.match(/^([A-Za-z_$][\w$]*)/)?.[1];
      if (name) names.push(`functions:${name}`);
    }
  }
  return names;
}

function parseArgs(argv) {
  const values = {};
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--verify-live", "--from-source", "--json"].includes(arg)) {
      flags.add(arg);
    } else if (arg.startsWith("--")) {
      values[arg.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return {values, flags};
}

export function formatClientCallableReport(report, surfaces) {
  const lines = [
    `${report.ok ? "PASS" : "FAIL"} client callable references ` +
      `(${surfaces.join(", ")}): ${report.callables.length} deployable ` +
      "Function(s) referenced from source",
  ];
  for (const name of report.dormantReferences) {
    lines.push(`  Dormant (never deployed) but referenced: ${name}`);
  }
  for (const site of report.undeclaredInvocations) {
    lines.push(
      `  ${site.path} calls ${site.callable}, which functions/src/index.ts ` +
        "does not export",
    );
  }
  return lines.join("\n");
}

function runFromSource({values, flags}) {
  const surfaces = values.surface ?
    values.surface.split(",") :
    Object.keys(clientCallableSurfaces);
  const report = deriveClientCallables({surfaces});
  if (flags.has("--json")) {
    process.stdout.write(`${JSON.stringify({
      ok: report.ok,
      surfaces,
      callables: report.callables.map((name) => ({
        name,
        surfaces: [...report.references.get(name).surfaces].sort(),
      })),
      dormantReferences: report.dormantReferences,
      undeclaredInvocations: report.undeclaredInvocations,
    }, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatClientCallableReport(report, surfaces)}\n`);
  }
  if (!report.ok) process.exitCode = 1;
}

async function main() {
  const {values, flags} = parseArgs(process.argv.slice(2));
  if (flags.has("--from-source")) {
    runFromSource({values, flags});
    return;
  }
  const appRole = values.role;
  const environment = values.environment;
  if (!appRole || !environment) {
    throw new Error(
      "Usage: check_client_callable_dependencies.mjs " +
        "--role <consumer|host> --environment <dev|staging|prod> " +
        "[--verify-live] [--project <id>]\n" +
        "       check_client_callable_dependencies.mjs --from-source " +
        "[--surface app,website,admin] [--json]",
    );
  }
  const dependencies = validateClientCallableDependencies({
    manifest: readJson("tool/firebase/client_callable_dependencies.json"),
    appRole,
    environment,
    functionTargets: sourceFunctionTargets(),
  });
  if (!flags.has("--verify-live") || dependencies.length === 0) {
    for (const entry of dependencies) {
      process.stdout.write(`${entry.id}: required (static check)\n`);
    }
    return;
  }
  const projectId = values.project ?? resolveFirebaseProjectId({
    env: environment,
    firebaseRcPath: path.join(repoRoot, ".firebaserc"),
  });
  for (const entry of dependencies) {
    const result = await probeCallable({
      projectId,
      region: entry.region,
      callable: entry.callable,
    });
    process.stdout.write(
      `${entry.id}: live (${result.httpStatus} ${result.callableStatus})\n`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
