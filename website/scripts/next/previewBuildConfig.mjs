import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

// The preview runs main's workflow but builds the release source, which may
// be older than main (the release train previews the newest validated commit).
// The build configuration is therefore a contract between two versions: main
// supplies the values, the source's Dockerfile declares which it takes, and
// the source's own next.config.mjs decides at build time whether the image is
// production-eligible by running its own check_web_hosting_env.mjs. An image
// that fails that check builds cleanly, logs nothing and answers 503 on every
// public page once CATCH_WEBSITE_STAGE=production (18 Nov 2026: main stopped
// supplying VITE_GTM_ID while the train still released a source requiring it).
// This script makes the preview pass exactly the arguments the source
// declares and refuse, before docker build, any configuration the source's
// own check rejects.

/** The arguments next.config.mjs passes to check_web_hosting_env.mjs. */
export const PRODUCTION_ELIGIBILITY_ARGS = Object.freeze(["marketing", "--expected-project-id", "catch-dating-app-64e51"]);

/** The build arguments a Dockerfile declares, in order, without duplicates. */
export function declaredBuildArgs(dockerfile) {
  const names = [];
  for (const line of dockerfile.split("\n")) {
    const match = /^\s*ARG\s+([A-Za-z_][A-Za-z0-9_]*)(?:=.*)?\s*$/u.exec(line);
    if (match && !names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/**
 * The environment `docker build` gives the source's build stage: only the
 * declared arguments the workflow has a value for. The eligibility check runs
 * with exactly this, so it sees what next.config.mjs will see in the image.
 */
export function buildStageEnvironment(declared, env) {
  return Object.fromEntries(declared.filter(name => typeof env[name] === "string" && env[name] !== "")
    .map(name => [name, env[name]]));
}

/**
 * The `--build-arg` names for the release source, after its own production
 * eligibility check accepts the configuration they carry. Throws, naming the
 * source's reasons, when the image would not be production-eligible.
 */
export function sourceBuildArgs(sourceRoot, env = process.env, {execPath = process.execPath} = {}) {
  const dockerfile = fs.readFileSync(path.join(sourceRoot, "website/Dockerfile"), "utf8");
  const stage = buildStageEnvironment(declaredBuildArgs(dockerfile), env);
  const check = path.join(sourceRoot, "tool/env/check_web_hosting_env.mjs");
  const result = spawnSync(execPath, [check, ...PRODUCTION_ELIGIBILITY_ARGS],
    {env: {PATH: env.PATH ?? "", ...stage}, encoding: "utf8"});
  assert.equal(result.status, 0, [
    "The release source's own production-eligibility check rejects this build configuration.",
    "Its image would answer 503 on every public page in production. Supply what the source declares:",
    (result.stderr || result.stdout || result.error?.message || "").trim(),
  ].join("\n"));
  return Object.keys(stage);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sourceRoot = process.argv[2];
  assert.ok(sourceRoot, "Usage: previewBuildConfig.mjs <release-source-checkout>");
  console.log(sourceBuildArgs(path.resolve(sourceRoot)).join("\n"));
}
