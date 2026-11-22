#!/usr/bin/env node
// Release Readiness fails while an open issue carries a release-block label
// (owner decision, 22 Nov 2026). The Main CI alert's golden policy
// (tool/ci/golden_policy.mjs) opens "Golden or capture failure" with
// release-block:mobile when main's macOS goldens or capture render fail, and
// closes it when they pass again. An unreadable issue list fails too: the gate
// never passes on an answer it did not get.
//
// Usage: node tool/ci/release_block.mjs --check mobile (GH_TOKEN, GITHUB_REPOSITORY set).
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const RELEASE_BLOCK_SCOPES = Object.freeze(["mobile"]);
export const releaseBlockLabel = (scope) => `release-block:${scope}`;

/**
 * Whether a release in `scope` may proceed. Pure.
 *
 * @param {object} input
 * @param {string} input.scope
 * @param {Array<{number:number, title:string, html_url:string, pull_request?:object, labels?:Array<{name:string}|string>}>|null} input.issues
 *   Open issues carrying the scope's label; null when they could not be read.
 * @returns {{ok:boolean, message:string}}
 */
export function decideReleaseBlock({scope, issues}) {
  assert.ok(RELEASE_BLOCK_SCOPES.includes(scope), `Unknown release-block scope: ${scope}`);
  const label = releaseBlockLabel(scope);
  if (!Array.isArray(issues)) {
    return {ok: false, message: `Could not read the open issues labelled ${label}, so this release is not cleared.`};
  }
  const blocking = issues.filter((issue) => !issue.pull_request &&
    (issue.labels ?? []).some((entry) => (typeof entry === "string" ? entry : entry?.name) === label));
  if (!blocking.length) return {ok: true, message: `No open issue is labelled ${label}.`};
  return {ok: false, message: [
    `This ${scope} release is blocked while ${blocking.length === 1 ? "an open issue carries" : "open issues carry"} ${label}:`,
    ...blocking.map((issue) => `- #${issue.number} ${issue.title}: ${issue.html_url}`),
    "Fix forward on main; the issue closes itself on the next main run that passes the failed jobs.",
  ].join("\n")};
}

function main(argv) {
  const index = argv.indexOf("--check");
  const scope = index >= 0 ? argv[index + 1] : undefined;
  assert.ok(scope && argv.length === 2, "Usage: release_block.mjs --check <scope>");
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const result = spawnSync("gh", ["api", "--paginate", "--slurp",
    `repos/${repository}/issues?state=open&labels=${encodeURIComponent(releaseBlockLabel(scope))}&per_page=100`],
  {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  let issues = null;
  if (result.status === 0) {
    try {
      const pages = JSON.parse(result.stdout);
      if (Array.isArray(pages) && pages.every(Array.isArray)) issues = pages.flat();
    } catch {
      issues = null;
    }
  } else {
    console.error(result.stderr.trim());
  }
  const decision = decideReleaseBlock({scope, issues});
  console.log(decision.message);
  if (!decision.ok) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
