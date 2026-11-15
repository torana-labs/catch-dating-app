// Sorts tool/tools_manifest.json's tools by id, keeping each entry's text as
// written. A sorted list lets parallel pull requests add tools at different
// places instead of all appending at the end; `node tool/run.mjs check
// --manifest-only` rejects an out-of-order manifest (validateToolOrder).
//
//   node tool/lib/sort_tools_manifest.mjs [--check]
import fs from "node:fs";
import {fromRepo} from "./repo_paths.mjs";

/** The manifest text with its tools array in id order; every entry's text is kept. */
export function sortToolsManifestText(text) {
  const open = text.indexOf('\n  "tools": [\n');
  const close = text.lastIndexOf("\n  ]\n}");
  if (open < 0 || close < open) throw new Error("tools_manifest.json: no top-level tools array.");
  const start = open + '\n  "tools": [\n'.length;
  const body = text.slice(start, close);
  const entries = body.split(/\n(?= {4}\{\n)/u).map((entry) => entry.replace(/,$/u, ""));
  const keyed = entries.map((entry) => ({id: JSON.parse(entry).id, entry}));
  keyed.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const sorted = `${text.slice(0, start)}${keyed.map(({entry}) => entry).join(",\n")}${text.slice(close)}`;
  const before = JSON.parse(text);
  const after = JSON.parse(sorted);
  const byId = (tools) => JSON.stringify([...tools].sort((a, b) => (a.id < b.id ? -1 : 1)));
  if (byId(before.tools) !== byId(after.tools) || JSON.stringify({...before, tools: []}) !== JSON.stringify({...after, tools: []})) {
    throw new Error("tools_manifest.json: sorting changed the manifest's content.");
  }
  return sorted;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifestPath = fromRepo("tool/tools_manifest.json");
  const text = fs.readFileSync(manifestPath, "utf8");
  const sorted = sortToolsManifestText(text);
  if (process.argv.includes("--check")) {
    if (sorted !== text) {
      console.error("tool/tools_manifest.json is not sorted by id; run node tool/lib/sort_tools_manifest.mjs.");
      process.exit(1);
    }
  } else if (sorted !== text) {
    fs.writeFileSync(manifestPath, sorted);
  }
}
