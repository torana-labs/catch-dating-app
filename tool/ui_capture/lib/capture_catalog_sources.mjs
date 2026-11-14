import fs from "node:fs";
import path from "node:path";
import {repoRoot} from "../../lib/repo_paths.mjs";

// The screen capture catalog is an index plus one file per marketing capture.
// Tools that read catalog entries read all of these files; none of them
// treats the index alone as the catalog.
export const captureCatalogIndex = "test/ui_captures/catalog/screen_capture_catalog.dart";
export const captureCatalogEntriesDir = "test/ui_captures/catalog/entries";

/** The marketing capture file that must declare the catalog entry `id`. */
export function captureEntryPath(id) {
  return `${captureCatalogEntriesDir}/${id}.dart`;
}

/** Repo-relative catalog files that declare entries: the index, its parts and every entry file. */
export function captureCatalogSourcePaths(root = repoRoot) {
  const index = fs.readFileSync(path.join(root, captureCatalogIndex), "utf8");
  const parts = [...index.matchAll(/^part\s+'([^']+)';/gmu)]
    .map(match => path.posix.join(path.posix.dirname(captureCatalogIndex), match[1]));
  const entriesDir = path.join(root, captureCatalogEntriesDir);
  const entries = fs.existsSync(entriesDir)
    ? fs.readdirSync(entriesDir).filter(name => name.endsWith(".dart")).sort()
      .map(name => `${captureCatalogEntriesDir}/${name}`)
    : [];
  return [captureCatalogIndex, ...parts, ...entries];
}

/** `{path, source}` for every catalog file, in captureCatalogSourcePaths order. */
export function readCaptureCatalogFiles(root = repoRoot) {
  return captureCatalogSourcePaths(root).map(file => ({
    path: file,
    source: fs.readFileSync(path.join(root, file), "utf8"),
  }));
}

/** Every catalog file's source, joined, for parsers that only need entry blocks. */
export function readCaptureCatalogSource(root = repoRoot) {
  return readCaptureCatalogFiles(root).map(file => file.source).join("\n");
}

/**
 * The one entry file that declares a marketing fixture key. Marketing entries
 * live alone in captureEntryPath(id), so a capture's render inputs start from
 * that file instead of the whole catalog.
 */
export function marketingEntryFile(fixtureKey, root = repoRoot) {
  const entriesDir = path.join(root, captureCatalogEntriesDir);
  const matches = (fs.existsSync(entriesDir) ? fs.readdirSync(entriesDir) : [])
    .filter(name => name.endsWith(".dart")).sort()
    .map(name => `${captureCatalogEntriesDir}/${name}`)
    .filter(file => marketingKeysIn(fs.readFileSync(path.join(root, file), "utf8")).includes(fixtureKey));
  if (matches.length !== 1) {
    throw new Error(`Marketing fixture ${fixtureKey} must be declared by exactly one file in ${captureCatalogEntriesDir}/ (found ${matches.length}).`);
  }
  return matches[0];
}

function marketingKeysIn(source) {
  return [...source.matchAll(/\bmarketingFixtureKeys:\s*const\s*<String>\s*\[([\s\S]*?)\]/gu)]
    .flatMap(match => [...match[1].matchAll(/'([^']+)'/gu)].map(key => key[1]));
}
