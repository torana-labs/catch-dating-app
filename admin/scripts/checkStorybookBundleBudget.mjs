#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
if (args.has("--self-test")) {
  runSelfTest();
  process.exit(0);
}

const budget = JSON.parse(fs.readFileSync(path.join(adminRoot, "storybook-bundle-budget.json"), "utf8"));
const assetsRoot = path.join(adminRoot, "storybook-static", "assets");
if (!fs.existsSync(assetsRoot)) {
  console.error("Admin Storybook bundle budget failed: build admin Storybook first.");
  process.exit(1);
}
const chunks = fs.readdirSync(assetsRoot)
  .filter((name) => /^(?:admin-feature-|AdminRoutes\w*\.stories-).+\.js$/u.test(name))
  .map((name) => ({name, bytes: fs.statSync(path.join(assetsRoot, name)).size}));
const findings = validateChunks(chunks, budget);
if (findings.length > 0) {
  console.error(`Admin Storybook bundle budget failed (${findings.length} finding(s)):`);
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
const routeChunk = chunks.filter(isRouteStory).sort((a, b) => b.bytes - a.bytes)[0];
const largest = chunks.slice().sort((a, b) => b.bytes - a.bytes)[0];
console.log(
  `Admin Storybook bundle budget passed: largest route story ${formatBytes(routeChunk.bytes)} / ` +
  `${formatBytes(budget.maxAdminRoutesStoryBytes)}; largest app chunk ` +
  `${largest.name} ${formatBytes(largest.bytes)} / ${formatBytes(budget.maxAppChunkBytes)}.`
);

function isRouteStory(chunk) {
  return /^AdminRoutes\w*\.stories-/u.test(chunk.name);
}

function validateChunks(chunks, budget) {
  const findings = [];
  const routeChunks = chunks.filter(isRouteStory);
  if (routeChunks.length === 0) findings.push("found no AdminRoutes story chunk");
  for (const chunk of chunks) {
    if (chunk.bytes > budget.maxAppChunkBytes) {
      findings.push(`${chunk.name} is ${chunk.bytes} bytes; app limit is ${budget.maxAppChunkBytes}`);
    }
  }
  for (const chunk of routeChunks) {
    if (chunk.bytes > budget.maxAdminRoutesStoryBytes) {
      findings.push(
        `${chunk.name} is ${chunk.bytes} bytes; route-story limit is ${budget.maxAdminRoutesStoryBytes}`
      );
    }
  }
  return findings;
}

function runSelfTest() {
  const budget = {maxAppChunkBytes: 510000, maxAdminRoutesStoryBytes: 50000};
  const findings = validateChunks([
    {name: "AdminRoutesMoney.stories-test.js", bytes: 51001},
    {name: "admin-feature-intake-test.js", bytes: 510001},
  ], budget);
  if (findings.length !== 2) {
    throw new Error(`self-test expected two budget findings, received ${findings.length}`);
  }
  console.log("Admin Storybook bundle budget self-test passed.");
}

function formatBytes(bytes) {
  return `${(bytes / 1000).toFixed(1)} KB`;
}
