#!/usr/bin/env node
// Widgetbook's use cases, read from the @widgetbook.UseCase annotations in
// widgetbook/lib. widgetbook/lib/main.directories.g.dart is build_runner output
// and isn't committed; Node checks read this instead, so they need no Flutter
// toolchain. `--verify-generated` proves the two agree exactly: CI runs it
// right after Widgetbook's build_runner.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../../lib/repo_paths.mjs";

export const generatedDirectoriesPath = "widgetbook/lib/main.directories.g.dart";
const widgetbookLib = "widgetbook/lib";
// Where the Widgetbook-covered types are declared, for generic bounds.
const declarationRoots = ["lib", "packages", "apps", "widgetbook/lib"];

function dartFiles(root, relative) {
  if (!fs.existsSync(path.join(root, relative))) return [];
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
      const child = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "build" || entry.name === "node_modules") continue;
        walk(child);
      } else if (entry.name.endsWith(".dart") && !entry.name.endsWith(".g.dart") &&
          !entry.name.endsWith(".freezed.dart")) {
        files.push(child);
      }
    }
  };
  walk(relative);
  return files.sort();
}

// The value of `key:` in an annotation's argument list: a string literal
// (unescaped as Dart reads it) or a type expression.
function annotationValue(annotation, key) {
  const quoted = annotation.match(new RegExp(String.raw`\b${key}:\s*(['"])((?:\\.|(?!\1).)*)\1`, "su"));
  if (quoted) return quoted[2].replace(/\\(.)/gsu, "$1");
  const type = annotation.match(new RegExp(String.raw`\b${key}:\s*([A-Za-z_$][\w$.]*(?:<[^()]*?>)?)`, "u"));
  return type?.[1] ?? null;
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "<") depth += 1;
    if (char === ">") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Type parameters of every class in the declaration roots: name -> ["T extends X", ...]. */
function classTypeParameters(root) {
  const declarations = new Map();
  for (const base of declarationRoots) {
    for (const file of dartFiles(root, base)) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      for (const match of source.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)\s*<((?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*)>/gu)) {
        if (!declarations.has(match[1])) declarations.set(match[1], splitTopLevel(match[2]));
      }
    }
  }
  return declarations;
}

// The generator prints a raw generic type instantiated to its bounds:
// `CatchFormChoiceField<P, T>` becomes `CatchFormChoiceField<dynamic, dynamic>`
// and `ProfileMultiEnumRow<T extends Labelled>` becomes `<Labelled>`, but
// a single unbounded parameter disappears.
function componentName(type, parameters) {
  if (type == null || type.includes("<")) return type?.replace(/\s*,\s*/gu, ", ") ?? null;
  const params = parameters.get(type);
  if (!params?.length) return type;
  const bounds = params.map(param => param.match(/\bextends\s+(.+)$/su)?.[1]?.trim() ?? "dynamic");
  // The generator drops a lone `<dynamic>` (widgetbook_generator strips it
  // from the display string), so `CatchMenu<T>` stays `CatchMenu`.
  const display = `${type}<${bounds.join(", ")}>`;
  return display.replace(/<dynamic>/gu, "");
}

/** Every annotated use case: {component, name, builder, sourcePath, path}. */
export function readWidgetbookUseCases(root = repoRoot) {
  const parameters = classTypeParameters(root);
  const useCases = [];
  for (const sourcePath of dartFiles(root, widgetbookLib)) {
    const source = fs.readFileSync(path.join(root, sourcePath), "utf8");
    for (const match of source.matchAll(/@widgetbook\.UseCase\(([\s\S]*?)\)\s*Widget\s+([A-Za-z_$][\w$]*)\s*\(/gu)) {
      useCases.push({
        component: componentName(annotationValue(match[1], "type"), parameters),
        name: annotationValue(match[1], "name"),
        builder: match[2],
        sourcePath,
        path: annotationValue(match[1], "path"),
      });
    }
  }
  return useCases;
}

/** The component names Widgetbook shows, as main.directories.g.dart names them. */
export function widgetbookComponentNames(root = repoRoot) {
  return new Set(readWidgetbookUseCases(root).map(useCase => useCase.component));
}

/** component|name|sourcePath|builder for every use case build_runner generated. */
export function generatedUseCaseKeys(source) {
  const aliases = new Map([...source.matchAll(
    /import\s+'package:widgetbook_workspace\/([^']+)'\s+as\s+([A-Za-z0-9_]+);/gu,
  )].map(match => [match[2], `${widgetbookLib}/${match[1]}`]));
  const unescape = value => value.replace(/\\(.)/gsu, "$1");
  const keys = [];
  let component = null;
  for (const match of source.matchAll(
    /WidgetbookComponent\(\s*name:\s*'((?:\\.|[^'])*)'|WidgetbookUseCase\(\s*name:\s*'((?:\\.|[^'])*)',\s*builder:\s*([A-Za-z0-9_]+)\s*\.\s*([A-Za-z0-9_]+)/gu,
  )) {
    if (match[1] !== undefined) component = unescape(match[1]);
    else keys.push(`${component}|${unescape(match[2])}|${aliases.get(match[3]) ?? `?${match[3]}`}|${match[4]}`);
  }
  return keys;
}

/** Differences between the annotations and build_runner's output; empty when they agree. */
export function compareWithGenerated(root, generatedSource) {
  const derived = readWidgetbookUseCases(root).map(useCase =>
    `${useCase.component}|${useCase.name}|${useCase.sourcePath}|${useCase.builder}`);
  const generated = generatedUseCaseKeys(generatedSource);
  const derivedSet = new Set(derived);
  const generatedSet = new Set(generated);
  return [
    ...[...generatedSet].filter(key => !derivedSet.has(key)).map(key => `generated but not derived: ${key}`),
    ...[...derivedSet].filter(key => !generatedSet.has(key)).map(key => `derived but not generated: ${key}`),
    ...(derived.length !== derivedSet.size ? ["the annotations declare a use case twice"] : []),
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command] = process.argv.slice(2);
  if (command === "--verify-generated") {
    const file = path.join(repoRoot, generatedDirectoriesPath);
    if (!fs.existsSync(file)) {
      console.error(`${generatedDirectoriesPath} is missing; run (cd widgetbook && dart run build_runner build) first.`);
      process.exit(1);
    }
    const problems = compareWithGenerated(repoRoot, fs.readFileSync(file, "utf8"));
    if (problems.length > 0) {
      console.error(`Widgetbook annotations and ${generatedDirectoriesPath} disagree:`);
      for (const problem of problems) console.error(`- ${problem}`);
      process.exit(1);
    }
    console.log(`Widgetbook annotations match ${generatedDirectoriesPath} (${readWidgetbookUseCases().length} use cases).`);
  } else if (command === "--json") {
    process.stdout.write(`${JSON.stringify(readWidgetbookUseCases(), null, 2)}\n`);
  } else {
    console.error("Usage: node tool/design/lib/widgetbook_use_cases.mjs --verify-generated|--json");
    process.exit(64);
  }
}
