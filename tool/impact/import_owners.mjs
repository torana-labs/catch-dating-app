#!/usr/bin/env node
import {cruiseToolImports, importOwnersByPath} from "../lib/tool_import_graph.mjs";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";

// Prints, for every repository path an active tool reaches through static
// imports, the ids of those tools. `node tool/run.mjs affected-tools
// --import-owners <file>` reads this so the runner itself stays dependency-free.
const manifest = loadToolsManifest();
const cruise = await cruiseToolImports();
if (!cruise) {
  console.error("The import graph needs `npm ci --prefix tool/impact`.");
  process.exit(1);
}
const owners = importOwnersByPath({manifest, cruise});
const entries = [...owners].sort(([left], [right]) => left.localeCompare(right))
  .map(([file, ids]) => [file, [...ids].sort()]);
process.stdout.write(`${JSON.stringify({tool: "dependency-cruiser", version: cruise.version,
  owners: Object.fromEntries(entries)})}\n`);
