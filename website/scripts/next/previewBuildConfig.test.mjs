import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {PRODUCTION_ELIGIBILITY_ARGS, buildStageEnvironment, declaredBuildArgs, sourceBuildArgs} from "./previewBuildConfig.mjs";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const read = relative => fs.readFileSync(path.join(repositoryRoot, relative), "utf8");
const workflow = read(".github/workflows/website-next-preview.yml");
const buildStep = workflow.slice(workflow.indexOf("- name: Build with public configuration and no cloud credentials"),
  workflow.indexOf("- name: Exercise the actual container without runtime credentials"));

/** The values the preview's build step supplies, as fixtures of the right shape. */
function workflowBuildEnvironment() {
  const env = buildStep.slice(buildStep.indexOf("env:"), buildStep.indexOf("run: |"));
  const keys = [...env.matchAll(/^\s+(VITE_[A-Z0-9_]*):/gmu)].map(match => match[1]);
  assert.ok(keys.length > 0, "The build step supplies the public build configuration");
  const fixture = {VITE_FIREBASE_PROJECT_ID: "catch-dating-app-64e51", VITE_GTM_ID: "GTM-FIXTURE"};
  return {PATH: process.env.PATH, ...Object.fromEntries(keys.map(key => [key, fixture[key] ?? `public-fixture-${key}`]))};
}

/**
 * A release source from before the ads pilot's retirement (#2046), as the
 * train released on 18 Nov 2026 (8285b13e3): its Dockerfile declares
 * VITE_GTM_ID and its own eligibility check requires it.
 */
function preRetirementSource() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-pre-retirement-source-"));
  fs.mkdirSync(path.join(root, "website"));
  fs.mkdirSync(path.join(root, "tool/env"), {recursive: true});
  const dockerfile = read("website/Dockerfile");
  assert.ok(dockerfile.includes("ARG VITE_FIREBASE_MEASUREMENT_ID\n"));
  fs.writeFileSync(path.join(root, "website/Dockerfile"),
    dockerfile.replace("ARG VITE_FIREBASE_MEASUREMENT_ID\n", "ARG VITE_FIREBASE_MEASUREMENT_ID\nARG VITE_GTM_ID\n"));
  const check = read("tool/env/check_web_hosting_env.mjs");
  const marketing = 'const required = target === "marketing" ? [\n  ...commonFirebaseVars,\n';
  assert.ok(check.includes(marketing), "The fixture adds the retired requirement to the current check");
  fs.writeFileSync(path.join(root, "tool/env/check_web_hosting_env.mjs"),
    check.replace(marketing, `${marketing}  "VITE_GTM_ID",\n`));
  return root;
}

test("the build arguments are exactly those the source's Dockerfile declares", () => {
  assert.deepEqual(declaredBuildArgs("FROM node AS build\nARG ONE\n  ARG TWO=default\nRUN echo ARG THREE\nARG ONE\n"), ["ONE", "TWO"]);
  const current = declaredBuildArgs(read("website/Dockerfile"));
  assert.ok(current.includes("VITE_WEBSITE_APPCHECK_SITE_KEY") && current.includes("VITE_FIREBASE_PROJECT_ID"));
  assert.ok(!current.includes("VITE_GTM_ID"), "The current source no longer takes the retired tag manager id");
  // Undeclared or empty values never reach docker build.
  assert.deepEqual(buildStageEnvironment(["A", "B", "C"], {A: "1", B: "", D: "4"}), {A: "1"});
});

test("the preview builds the current source as production-eligible", () => {
  const args = sourceBuildArgs(repositoryRoot, workflowBuildEnvironment());
  assert.ok(args.includes("VITE_WEBSITE_APPCHECK_SITE_KEY"));
  assert.ok(!args.includes("VITE_GTM_ID"), "A source that does not declare the retired id never receives it");
});

// The 18 Nov 2026 outage: main's preview stopped supplying VITE_GTM_ID while
// the train still released a source that required it, so the image built,
// logged nothing and answered 503 on /host/. Delete this test together with
// the workflow's VITE_GTM_ID once live contains 22633273a.
test("the preview still builds a releasable source from before the ads retirement as production-eligible", () => {
  const source = preRetirementSource();
  try {
    assert.ok(sourceBuildArgs(source, workflowBuildEnvironment()).includes("VITE_GTM_ID"));
  } finally {
    fs.rmSync(source, {recursive: true, force: true});
  }
});

test("a configuration the source's own check rejects stops the preview before docker build", () => {
  const source = preRetirementSource();
  try {
    const {VITE_GTM_ID: _retired, ...withoutRetired} = workflowBuildEnvironment();
    assert.throws(() => sourceBuildArgs(source, withoutRetired),
      error => /production-eligibility check rejects/u.test(error.message) && /503/u.test(error.message) &&
        /VITE_GTM_ID is required/u.test(error.message));
    assert.throws(() => sourceBuildArgs(repositoryRoot, {...workflowBuildEnvironment(), VITE_FIREBASE_API_KEY: ""}),
      /VITE_FIREBASE_API_KEY is required/u);
    // The check sees only what docker build passes, never the runner's other variables.
    assert.doesNotThrow(() => sourceBuildArgs(repositoryRoot, {...workflowBuildEnvironment(),
      CATCH_FIREBASE_PROJECT_ID: "catchdates-dev"}));
  } finally {
    fs.rmSync(source, {recursive: true, force: true});
  }
});

test("the preview passes the source's declared arguments only after its own eligibility check", () => {
  const run = buildStep.slice(buildStep.indexOf("run: |"));
  const derive = run.indexOf('build_args="$(node website/scripts/next/previewBuildConfig.mjs "$RELEASE_SOURCE")"');
  assert.ok(derive > 0, "The build arguments come from the release source");
  assert.ok(derive < run.indexOf("docker build"));
  assert.match(run, /for key in \$build_args; do\n\s+args\+=\(--build-arg "\$key"\)/u);
  assert.doesNotMatch(run, /for key in VITE_/u, "No hard-coded list can drift from the source's Dockerfile");
  // The gate runs the very check the source's next.config.mjs runs at build time.
  const config = read("website/next.config.mjs");
  assert.ok(config.includes('"../tool/env/check_web_hosting_env.mjs"'));
  assert.ok(config.includes(PRODUCTION_ELIGIBILITY_ARGS.map(arg => JSON.stringify(arg)).join(", ")));
});
