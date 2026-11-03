#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {indexSignature} from "../firebase/wait_firestore_indexes_ready.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "../..");
const contractPattern =
  /(?:\/\/|\/\*)\s*firestore-index:\s*([A-Za-z0-9_.-]+)\s*\(([^)]+)\)/gu;

export function canonicalIndex(collectionGroup, fields) {
  return `${collectionGroup}|${fields
    .map((field) => `${field.fieldPath}:${field.mode}`)
    .join(",")}`;
}

export function parseIndexContracts(source, relativePath = "source.dart") {
  const contracts = [];
  for (const match of source.matchAll(contractPattern)) {
    const fields = match[2]
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
      .map((field) => {
        const separator = field.lastIndexOf(":");
        if (separator <= 0 || separator === field.length - 1) {
          throw new Error(
            `${relativePath}:${lineNumberForIndex(source, match.index ?? 0)}: ` +
              `invalid firestore-index field '${field}'`
          );
        }
        const fieldPath = field.slice(0, separator).trim();
        const mode = field.slice(separator + 1).trim().toUpperCase();
        if (!new Set(["ASCENDING", "DESCENDING", "CONTAINS"]).has(mode)) {
          throw new Error(
            `${relativePath}:${lineNumberForIndex(source, match.index ?? 0)}: ` +
              `invalid firestore-index mode '${mode}'`
          );
        }
        return {fieldPath, mode};
      });
    contracts.push({
      collectionGroup: match[1],
      fields,
      line: lineNumberForIndex(source, match.index ?? 0),
    });
  }
  return contracts;
}

export function configuredIndexes(indexConfig) {
  return new Set(
    (indexConfig.indexes ?? []).map((index) =>
      canonicalIndex(
        index.collectionGroup,
        (index.fields ?? []).map((field) => ({
          fieldPath: field.fieldPath,
          mode: field.mode ?? field.order ?? field.arrayConfig,
        }))
      )
    )
  );
}

export function validateConfiguredIndexes(indexConfig) {
  const errors = [];
  const seenIndexes = new Map();
  for (const [position, index] of (indexConfig.indexes ?? []).entries()) {
    const signature = indexSignature(index, {desired: true});
    const previous = seenIndexes.get(signature);
    if (previous != null) {
      errors.push(
        "firestore.indexes.json: duplicate composite index " +
          `${index.collectionGroup} at entries ${previous + 1} and ${position + 1}; ` +
          "declare each deployable index only once"
      );
    } else {
      seenIndexes.set(signature, position);
    }
    const fields = index.fields ?? [];
    const userFields = fields.filter(
      (field) => field.fieldPath !== "__name__"
    );
    const hasVectorField = userFields.some(
      (field) => field.vectorConfig != null
    );
    if (userFields.length === 1 && !hasVectorField) {
      errors.push(
        "firestore.indexes.json: unnecessary composite index " +
          canonicalIndex(
            index.collectionGroup,
            fields.map((field) => ({
              fieldPath: field.fieldPath,
              mode: field.mode ?? field.order ?? field.arrayConfig,
            }))
          ) +
          "; Firestore provides this shape through single-field indexes"
      );
    }
  }
  return errors;
}

export function validateContracts({sources, indexConfig}) {
  const configured = configuredIndexes(indexConfig);
  const errors = validateConfiguredIndexes(indexConfig);
  let contractCount = 0;

  for (const source of sources) {
    let contracts;
    try {
      contracts = parseIndexContracts(source.contents, source.path);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    contractCount += contracts.length;

    if (requiresCompositeIndexContract(source.contents) && contracts.length === 0) {
      errors.push(
        `${source.path}: composite Firestore query builder has no ` +
          "firestore-index contract"
      );
    }

    if (source.path.endsWith(".ts")) {
      for (const shape of typeScriptQueryShapes(source.contents)) {
        const covered = contracts.some((contract) =>
          contract.collectionGroup === shape.collectionGroup &&
          contract.fields.length === shape.fields.length &&
          shape.fields.every((field) => contract.fields.some((candidate) =>
            candidate.fieldPath === field.fieldPath &&
            candidate.mode === field.mode)));
        if (!covered) errors.push(`${source.path}: composite query has no ` +
          `firestore-index contract for ${canonicalIndex(shape.collectionGroup,
            shape.fields)}`);
      }
    }

    for (const contract of contracts) {
      const key = canonicalIndex(contract.collectionGroup, contract.fields);
      if (!configured.has(key)) {
        errors.push(
          `${source.path}:${contract.line}: missing firestore.indexes.json entry ${key}`
        );
      }
    }
  }

  return {errors, contractCount, sourceCount: sources.length};
}

export function requiresCompositeIndexContract(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "");
  const functions = functionBodies(withoutComments);
  return functions.some((body) => {
    const whereCount = [...body.matchAll(/\.where\s*\(/gu)].length;
    const orderCount = [...body.matchAll(/\.orderBy\s*\(/gu)].length;
    return orderCount > 0 && whereCount > 0;
  });
}

function functionBodies(source) {
  const bodies = [];
  const signature =
    /(?:^|\n)\s*(?!(?:if|for|while|switch|catch)\b)[A-Za-z_][^;{}=]*\([^;{}]*\)\s*(?:async\s*)?\{/gu;
  for (const match of source.matchAll(signature)) {
    const openIndex = (match.index ?? 0) + match[0].lastIndexOf("{");
    const closeIndex = matchingBrace(source, openIndex);
    if (closeIndex != null) bodies.push(source.slice(openIndex + 1, closeIndex));
  }
  return bodies;
}

function matchingBrace(source, openIndex) {
  let depth = 0;
  let quote = null;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote != null) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return index;
  }
  return null;
}

// Statically resolvable fluent TypeScript queries. Dynamic additions still
// require explicit adjacent contracts and review; this is not a TS compiler.
export function typeScriptQueryShapes(source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "");
  const shapes = [];
  const chains = /\.collection\(\s*["']([^"']+)["']\s*\)((?:\s*\.(?:where|orderBy|limit|startAfter)\([^)]*\))+)/gu;
  for (const match of withoutComments.matchAll(chains)) {
    const fields = new Map();
    for (const field of match[2].matchAll(/\.(where|orderBy)\(\s*["']([^"']+)["']([^)]*)\)/gu)) {
      fields.set(field[2], field[1] === "orderBy" &&
        /,\s*["']desc["']/u.test(field[3]) ? "DESCENDING" : "ASCENDING");
    }
    if (fields.size > 1) shapes.push({collectionGroup: match[1],
      fields: [...fields].map(([fieldPath, mode]) => ({fieldPath, mode}))});
  }
  return shapes;
}

function repositorySources(repoRoot) {
  const dartRoots = ["lib", "packages/platform/lib"].map((root) => path.join(repoRoot, root))
    .filter((root) => fs.existsSync(root));
  const dart = dartRoots.length > 0 ? dartRoots.flatMap((root) => walk(root))
    .filter((file) => file.endsWith(".dart"))
    .filter((file) => file.includes(`${path.sep}data${path.sep}`))
    .filter((file) => path.basename(file).includes("repository"))
    .filter((file) => !file.endsWith(".g.dart")) : [];
  const backend = ["programs", "transport"].flatMap((directory) => {
    const root = path.join(repoRoot, "functions/src", directory);
    return fs.existsSync(root) ? walk(root).filter((file) =>
      file.endsWith(".ts") && !file.endsWith(".test.ts")) : [];
  });
  return [...dart, ...backend].map((file) => ({
    path: path.relative(repoRoot, file),
    contents: fs.readFileSync(file, "utf8"),
  }));
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}

function runCli() {
  const rootFlag = process.argv.indexOf("--root");
  const repoRoot = rootFlag >= 0
    ? path.resolve(process.argv[rootFlag + 1])
    : defaultRepoRoot;
  const indexPath = path.join(repoRoot, "firestore.indexes.json");
  const indexConfig = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const result = validateContracts({
    sources: repositorySources(repoRoot),
    indexConfig,
  });

  if (result.errors.length > 0) {
    console.error("Firestore query index parity check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Firestore query index parity check passed: ${result.contractCount} ` +
      `contracts across ${result.sourceCount} repository sources.`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli();
