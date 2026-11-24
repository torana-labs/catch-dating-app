#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function toolCategoryCoverage({manifest, workflowText}) {
  const activeCategories = new Set((manifest.tools ?? [])
    .filter((tool) => tool.status === "active")
    .map((tool) => tool.category));
  const declaredCategories = new Set();
  for (const match of workflowText.matchAll(/^\s*categories:\s+(.+)$/gm)) {
    for (const category of match[1].trim().split(/\s+/).filter(Boolean)) {
      declaredCategories.add(category);
    }
  }
  const unknown = [...declaredCategories]
    .filter((category) => !activeCategories.has(category))
    .sort();
  const missing = [...activeCategories]
    .filter((category) => !declaredCategories.has(category))
    .sort();
  return {
    ok: unknown.length === 0 && missing.length === 0,
    activeCategories: [...activeCategories].sort(),
    declaredCategories: [...declaredCategories].sort(),
    unknown,
    missing,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = loadToolsManifest({root: repoRoot});
  const workflowText = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/tools-ci.yml"),
    "utf8",
  );
  const result = toolCategoryCoverage({manifest, workflowText});
  if (!result.ok) {
    console.error("Tool category CI coverage failed:");
    if (result.unknown.length > 0) {
      console.error(`- Unknown workflow categories: ${result.unknown.join(", ")}`);
    }
    if (result.missing.length > 0) {
      console.error(`- Active categories missing from Tools CI: ${result.missing.join(", ")}`);
    }
    process.exit(1);
  }
  console.log(
    `Tool category CI coverage passed (${result.activeCategories.length} categories).`,
  );
}
