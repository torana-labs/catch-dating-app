#!/usr/bin/env node
// STR-10 (issue #2532): every callable states who may call it through
// callable() in functions/src/platform/callables/callable.ts, whose policy
// argument is required. This check lists each exported Function built with a
// raw onCall(...) and compares the list with
// tool/audit/callable_policy_baseline.json, the callables not converted yet.
// An unlisted raw onCall fails (a new callable must use callable()), and so
// does a listed name that is converted or gone, so the list only shrinks.
// A per-name list, not per-file counts: a converted callable cannot be
// swapped for a new raw one in the same file unnoticed.
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";

export const BASELINE = "tool/audit/callable_policy_baseline.json";
const SOURCE = "functions/src";
const WRAPPER = "functions/src/platform/callables/callable.ts";

function sourceFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "generated" && entry.name !== "testing") walk(full);
      } else if (/\.ts$/u.test(entry.name) && !/\.test\.ts$/u.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(path.join(root, SOURCE));
  return out.sort();
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, (m) => m.replace(/[^\n]/gu, " "))
    .replace(/(^|[^:"'`])\/\/[^\n]*/gu, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

/**
 * Raw onCall sites in one file: the exported name each builds, or the
 * enclosing function for a local wrapper (reported as file#function).
 * @param {string} relativePath Repo path.
 * @param {string} source File text.
 * @return {Array<{name: string, line: number}>} Raw callables.
 */
export function rawCallables(relativePath, source) {
  if (relativePath === WRAPPER) return [];
  const code = stripComments(source);
  const found = [];
  for (const match of code.matchAll(/\bonCall\s*\(/gu)) {
    const before = code.slice(0, match.index);
    const line = before.split("\n").length;
    const lastLine = before.slice(before.lastIndexOf("\n") + 1);
    const exported = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*$/u
      .exec(lastLine) ?? /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*$/u
      .exec(before.trimEnd().split("\n").slice(-2).join(" "));
    if (exported) {
      found.push({name: exported[1], line});
      continue;
    }
    // A local wrapper (function x(...) { return onCall(...) }): one entry
    // for the wrapper; its exports are listed by the wrapper's name.
    const declared = [...before.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*[<(]/gu)].at(-1);
    const arrow = [...before.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]*)?=>/gu)].at(-1);
    const fn = (arrow?.index ?? -1) > (declared?.index ?? -1) ? arrow : declared;
    found.push({name: `${relativePath}#${fn?.[1] ?? `line${line}`}`, line});
    // Each export the local wrapper builds is a raw callable too, so a new
    // one through an old wrapper is caught by name.
    if (!fn) continue;
    const uses = new RegExp(`export\\s+const\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${fn[1]}\\s*\\(`, "gu");
    for (const use of code.matchAll(uses)) {
      found.push({name: use[1], line: code.slice(0, use.index).split("\n").length});
    }
  }
  return found;
}

/**
 * Compares the raw callables with the baseline.
 * @param {object} input Raw callables by name and the baseline names.
 * @return {string[]} Problems; empty when the list holds.
 */
export function callablePolicyProblems({raw, baseline}) {
  const listed = new Set(baseline);
  const problems = [];
  const seen = new Set();
  for (const item of raw) {
    seen.add(item.name);
    if (!listed.has(item.name)) {
      problems.push(`${item.path}:${item.line} builds ${item.name} with a raw ` +
        "onCall; use callable() from functions/src/platform/callables/" +
        "callable.ts with a policy (STR-10, #2532).");
    }
  }
  for (const name of baseline) {
    if (!seen.has(name)) {
      problems.push(`${name} is in ${BASELINE} but no longer builds a raw ` +
        "onCall; remove it from the list.");
    }
  }
  const duplicates = baseline.filter((name, i) => baseline.indexOf(name) !== i);
  for (const name of new Set(duplicates)) {
    problems.push(`${name} is listed twice in ${BASELINE}.`);
  }
  return problems;
}

export function scanRawCallables(root = repoRoot) {
  return sourceFiles(root).flatMap((file) => {
    const relativePath = path.relative(root, file).split(path.sep).join("/");
    return rawCallables(relativePath, fs.readFileSync(file, "utf8"))
      .map((item) => ({...item, path: relativePath}));
  });
}

function readBaseline(root) {
  return JSON.parse(fs.readFileSync(path.join(root, BASELINE), "utf8")).raw;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raw = scanRawCallables();
  if (process.argv.includes("--write")) {
    // Only removes: names that no longer build a raw onCall leave the list.
    const current = new Set(raw.map((item) => item.name));
    const baseline = fs.existsSync(path.join(repoRoot, BASELINE)) ?
      readBaseline(repoRoot) : [...current];
    const next = [...new Set(baseline)].filter((name) => current.has(name)).sort();
    fs.writeFileSync(path.join(repoRoot, BASELINE), JSON.stringify({
      owner: "backend_operation_catalog",
      targetPhase: "docs/backend_operation_catalog.md#" +
        "phase-every-callable-uses-callable",
      description: "Callables still built with a raw onCall, not callable() " +
        "with a policy (STR-10, issue #2532). Only shrinks: convert one, then " +
        "remove its name. node tool/audit/check_callable_policy.mjs checks it.",
      raw: next,
    }, null, 2) + "\n");
    console.log(`Wrote ${next.length} names to ${BASELINE}.`);
  } else {
    const problems = callablePolicyProblems({raw, baseline: readBaseline(repoRoot)});
    if (problems.length) {
      for (const problem of problems) console.error(`- ${problem}`);
      process.exitCode = 1;
    } else {
      console.log(`Callable policy: ${raw.length} raw onCall callables left, ` +
        `all listed in ${BASELINE}; every other callable uses callable().`);
    }
  }
}
