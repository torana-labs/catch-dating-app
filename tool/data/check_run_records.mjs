#!/usr/bin/env node
// Every tool under tool/data/ that writes to Firestore records its applied
// runs through tool/data/lib/run_record.mjs (FIX-7). A writing tool is one
// whose tool/manifest entry has surface remote-write or remote-destructive.
// LEGACY lists the writing tools that predate the helper; it only shrinks:
// a listed tool that adopts the helper, or no longer exists, must leave it.
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";

export const HELPER = "tool/data/lib/run_record.mjs";
const WRITING_SURFACES = new Set(["remote-write", "remote-destructive"]);

/** Writing tools written before run records; convert them, then drop them. */
export const LEGACY = new Set([
  "tool/data/backfill_algolia_explore_search.mjs",
  "tool/data/backfill_city_interest.mjs",
  "tool/data/backfill_event_admin_search.mjs",
  "tool/data/backfill_event_discovery_fields.mjs",
  "tool/data/backfill_organizer_admin_search.mjs",
  "tool/data/delete_firestore_reviews.mjs",
  "tool/data/hygiene_media_paths.mjs",
  "tool/data/listing_cohort_withdraw.mjs",
  "tool/data/migrate_form_domains_to_custom_domains.mjs",
  "tool/data/organizer_takedown.mjs",
  "tool/data/purge_deck_era_records.mjs",
  "tool/data/recompute_event_aggregate_counts.mjs",
  "tool/data/recompute_organizer_follower_counts.mjs",
  "tool/data/recompute_organizer_host_profiles.mjs",
  "tool/data/recompute_organizer_program_counts.mjs",
  "tool/data/recompute_public_profiles.mjs",
  "tool/data/recompute_review_author_profiles.mjs",
]);

/**
 * Whether a tool's source imports the run-record helper.
 * @param {string} toolFile Repo path of the tool.
 * @param {string} source Its source text.
 * @return {boolean} True when it imports the helper.
 */
export function importsHelper(toolFile, source) {
  const fromDir = path.posix.dirname(toolFile);
  for (const match of source.matchAll(
    /\bfrom\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/gu)) {
    const specifier = match[1] ?? match[2];
    if (!specifier.startsWith(".")) continue;
    if (path.posix.normalize(path.posix.join(fromDir, specifier)) === HELPER) {
      return true;
    }
  }
  return false;
}

/**
 * The problems with run-record adoption.
 * @param {object} input Manifest entries, a source reader and the legacy set.
 * @param {Array<{id: string, path: string, surface?: string}>} input.entries
 * @param {(file: string) => string|null} input.read Source, or null if absent.
 * @param {Set<string>} [input.legacy] Writing tools exempt for now.
 * @return {string[]} Problems; empty when adoption holds.
 */
export function runRecordProblems({entries, read, legacy = LEGACY}) {
  const problems = [];
  const writers = new Set();
  for (const entry of entries) {
    const file = entry.path;
    if (typeof file !== "string" || !file.startsWith("tool/data/") ||
        !WRITING_SURFACES.has(entry.surface) || file.endsWith(".test.mjs")) {
      continue;
    }
    writers.add(file);
    const source = read(file);
    if (source === null) continue;
    const adopted = importsHelper(file, source);
    if (legacy.has(file)) {
      if (adopted) {
        problems.push(`${file} uses ${HELPER}; remove it from LEGACY in ` +
          "tool/data/check_run_records.mjs.");
      }
      continue;
    }
    if (!adopted) {
      problems.push(`${entry.id} (${file}) writes to Firestore but does not ` +
        `record its runs: import withRunRecord from ${HELPER} and wrap the ` +
        "apply phase.");
    }
  }
  for (const file of legacy) {
    if (!writers.has(file)) {
      problems.push(`${file} is in LEGACY but is no longer a writing tool ` +
        "under tool/data/; remove it from the list.");
    }
  }
  return problems;
}

function readEntries() {
  const dir = path.join(repoRoot, "tool/manifest/tools");
  return fs.readdirSync(dir).filter((name) => name.endsWith(".json"))
    .sort().map((name) => JSON.parse(fs.readFileSync(path.join(dir, name),
      "utf8")));
}

function readSource(file) {
  const absolute = path.join(repoRoot, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = runRecordProblems({entries: readEntries(), read: readSource});
  if (problems.length) {
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
  } else {
    console.log("Data tool run records: every writing tool under tool/data/ " +
      `uses ${HELPER} or is listed as legacy (${LEGACY.size} left).`);
  }
}
