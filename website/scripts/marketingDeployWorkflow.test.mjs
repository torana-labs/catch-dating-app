import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {planAffected} from "../../tool/harness/lib/component_graph.mjs";
import {fileURLToPath} from "node:url";

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptsRoot, "..");
const repoRoot = path.resolve(websiteRoot, "..");
const workflow = fs.readFileSync(
  path.join(repoRoot, ".github", "workflows", "marketing-website.yml"),
  "utf8"
);
const surfaceValidationWorkflow = fs.readFileSync(
  path.join(repoRoot, ".github", "workflows", "react-surface-validation.yml"),
  "utf8"
);
const exactBuildWorkflow = fs.readFileSync(
  path.join(repoRoot, ".github", "workflows", "_web-hosting-build.yml"),
  "utf8"
);
const exactPromoteWorkflow = fs.readFileSync(
  path.join(repoRoot, ".github", "workflows", "_web-hosting-promote.yml"),
  "utf8"
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(websiteRoot, "package.json"), "utf8")
);
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
);

for (const {name, skipBuild, script} of [
  {name: "Build marketing website", skipBuild: false, script: "build"},
  {
    name: "Validate marketing build prerequisites without emitting a bundle",
    skipBuild: true,
    script: "typecheck",
  },
]) {
  test(`marketing ${script} retains the sole organizer and route prerequisite gate`, () => {
    const step = surfaceValidationWorkflow.split(/\n      - /u)
      .find((candidate) => candidate.startsWith(`name: ${name}\n`));
    assert.ok(step, `${name} must run in the shared validation workflow`);
    assert.ok(step.includes(
      `if: \${{ inputs.surface == 'marketing' && ${skipBuild ? "" : "!"}inputs.skip_deployable_build }}`
    ));
    assert.match(step, new RegExp(`^        run: npm run web:marketing:${script}$`, "mu"));
    assert.doesNotMatch(step, /continue-on-error/u);
    assert.equal(
      rootPackageJson.scripts[`web:marketing:${script}`],
      `npm --workspace catch-marketing run ${script}`
    );
    // npm's typecheck lifecycle owns these gates for both validation modes
    // and standalone builds. Keep failure propagation before Vite/postbuild.
    assert.ok(packageJson.scripts.build.startsWith("npm run typecheck && "));
    const prerequisites = packageJson.scripts.pretypecheck.split(" && ");
    for (const check of ["check:organizer-listings", "check:routes"]) {
      assert.equal(prerequisites.filter((command) => command === `npm run ${check}`).length, 1);
      assert.ok(packageJson.scripts[check], `${check} must remain a standalone command`);
      assert.ok(!surfaceValidationWorkflow.includes(`run: npm --workspace catch-marketing run ${check}\n`),
        `${check} must not run again outside pretypecheck`);
    }
    assert.ok(prerequisites.every((command) => /^npm run [\w:-]+$/u.test(command)),
      "pretypecheck must stop at a failed prerequisite");
  });
}

test("production snapshot materializes organizer projections before its one uncredentialed exact build", () => {
  assert.equal(
    packageJson.scripts["materialize:organizer-listings:deploy"],
    "node scripts/generateOrganizerListings.mjs " +
      "--firestore-project catch-dating-app-64e51 && " +
      "node scripts/generateOrganizerListings.mjs " +
      "--firestore-project catch-dating-app-64e51 --include-demo " +
      "--output src/generated/hostListings.demo.json && " +
      "npm run check:organizer-listings"
  );

  const materializeStep = exactBuildWorkflow.indexOf(
    "- name: Materialize the production organizer projection"
  );
  const buildStep = exactBuildWorkflow.indexOf(
    "- name: Build the exact production marketing bytes once"
  );

  assert.ok(materializeStep >= 0, "Firestore materialization step must exist");
  assert.ok(
    buildStep > materializeStep,
    "the exact Vite build must run after Firestore projections are materialized"
  );

  const materializeContract = exactBuildWorkflow.slice(materializeStep, buildStep);
  assert.match(
    materializeContract,
    /run: npm --workspace catch-marketing run materialize:organizer-listings:deploy/u
  );
  assert.doesNotMatch(materializeContract, /organizer-claim-target-readiness/u);
  assert.match(exactBuildWorkflow,
    /GCP_WEB_HOSTING_READONLY_WORKLOAD_IDENTITY_PROVIDER/u);
  assert.match(exactBuildWorkflow,
    /GCP_WEB_HOSTING_READONLY_SERVICE_ACCOUNT_EMAIL/u);
  const packageBuild = exactBuildWorkflow.slice(
    exactBuildWorkflow.indexOf("  build:")
  );
  assert.match(packageBuild,
    /actions\/artifacts\/\$SNAPSHOT_ARTIFACT_ID\/zip/u);
  assert.doesNotMatch(packageBuild,
    /google-github-actions\/auth|id-token: write|materialize:organizer-listings:deploy/u);
  assert.doesNotMatch(
    surfaceValidationWorkflow,
    /check_promotion_bridge\.mjs/u,
    "marketing validation must not invoke the retired repo-backed promotion bridge"
  );
  assert.match(workflow, /uses: \.\/\.github\/workflows\/_web-hosting-build\.yml/u);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/_web-hosting-promote\.yml/u);
  assert.match(exactBuildWorkflow, /package_web_hosting\.mjs prepare/u);
  assert.match(exactPromoteWorkflow,
    /working-directory: build\/web-delivery\/package[\s\S]*--config firebase\.json/u);
  assert.doesNotMatch(exactPromoteWorkflow,
    /materialize:organizer-listings:deploy|vite build|web:marketing:build/u);
});


test("native capture inputs publish exact-source media through the canonical producer and verifier", () => {
  const ci = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
  const capture = fs.readFileSync(path.join(repoRoot, ".github/workflows/marketing-captures.yml"), "utf8");
  const graph = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/harness/component_graph.json"), "utf8"));
  for (const input of ["lib/**", "test/**", "pubspec.yaml", "pubspec.lock",
    "packages/*/pubspec.yaml", "packages/*/lib/**", "packages/*/assets/**", "tool/ui_capture/**"]) {
    assert.ok(workflow.includes(`      - "${input}"`), `Capture input must refresh published media: ${input}`);
    const changedPath = input.replace("packages/*", "packages/catch_ui").replace("**", "example.dart");
    const plan = planAffected({changedPaths: [changedPath], graph, mode: "main"});
    assert.ok(plan.complete, `Uncovered capture input: ${changedPath}`);
    // App changes select no capture job in CI, so this workflow's own producer
    // must run for them. Capture tooling and website lanes still exercise it in CI.
    assert.equal(plan.operations.ciTargets.includes("capture_freshness"),
      input === "tool/ui_capture/**" || plan.operations.ciTargets.includes("marketing"), changedPath);
  }
  const standalone = workflow.slice(workflow.indexOf("\n  captures:\n"), workflow.indexOf("\n  validate:\n"));
  assert.match(standalone, /uses: \.\/\.github\/workflows\/marketing-captures\.yml/u);
  assert.match(standalone, /needs\.ci-validation\.outputs\.validated == 'false' &&\s+needs\.ci-validation\.outputs\.capture_binding == ''/u);
  const packaging = workflow.slice(workflow.indexOf("\n  package:\n"), workflow.indexOf("\n  promote:\n"));
  assert.match(packaging, /needs\.ci-validation\.outputs\.validated == 'false' && needs\.validate\.result == 'success'/u);
  assert.match(packaging, /capture_binding: \$\{\{ needs\.ci-validation\.outputs\.capture_binding \|\| needs\.captures\.outputs\.capture_binding \}\}/u);
  const producer = ci.slice(ci.indexOf("\n  capture-freshness:"), ci.indexOf("\n  operations:"));
  assert.match(producer, /uses: \.\/\.github\/workflows\/marketing-captures\.yml/u);
  assert.match(producer, /automatic_source_sha: \$\{\{ needs\.plan\.outputs\.source_sha \}\}/u);
  assert.match(capture, /run: node tool\/marketing\/export_hosted_captures\.mjs/u);
  assert.doesNotMatch(capture, /continue-on-error|--update-goldens/u);
  assert.doesNotMatch(surfaceValidationWorkflow, /capture_freshness_in_ci/u);
  const importStep = surfaceValidationWorkflow.split(/\n      - /u)
    .find(step => step.startsWith("name: Import verified exact-source marketing captures\n"));
  assert.match(importStep, /CAPTURE_BINDING: \$\{\{ inputs\.capture_binding \}\}/u);
  assert.match(importStep, /run: node tool\/marketing\/import_hosted_captures\.mjs --import/u);
  const verifyStep = surfaceValidationWorkflow.split(/\n      - /u)
    .find(step => step.startsWith("name: Verify built marketing capture bytes\n"));
  assert.match(verifyStep, /run: node tool\/marketing\/import_hosted_captures\.mjs --check-dist/u);
  assert.ok(surfaceValidationWorkflow.indexOf(importStep) < surfaceValidationWorkflow.indexOf("      - run: npm ci"));
  assert.ok(surfaceValidationWorkflow.indexOf(verifyStep) > surfaceValidationWorkflow.indexOf("      - name: Build marketing website"));
});


test("selected marketing deploy-contract runs probe regressions and propagates failure", () => {
  assert.equal(packageJson.scripts.pretypecheck.split(" && ")
    .filter(command => command === "npm run check:deploy-contract").length, 1);
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "catch-probe-runner-"));
  const env = {...process.env};
  // A child CLI must start its own test runner, not inherit Node's child-test
  // context and accidentally execute test files outside the selected runner.
  delete env.NODE_TEST_CONTEXT;
  const run = () => spawnSync("npm", ["--prefix", fixture, "run", "check:deploy-contract"], {
    env, encoding: "utf8", timeout: 30_000,
  });
  try {
    fs.mkdirSync(path.join(fixture, "scripts"));
    fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({
      private: true,
      type: "module",
      scripts: {"check:deploy-contract": packageJson.scripts["check:deploy-contract"]},
    }));
    fs.writeFileSync(path.join(fixture, "scripts/marketingDeployWorkflow.test.mjs"),
      'import test from "node:test"; test("workflow sentinel", () => {});\n');
    const probePath = path.join(fixture, "scripts/probeProduction.test.mjs");
    fs.writeFileSync(probePath,
      'import test from "node:test"; test("probe failure sentinel", () => { throw new Error("CAT66 probe failure reached"); });\n');
    const failing = run();
    assert.equal(failing.error, undefined);
    assert.equal(failing.status, 1, failing.stdout + failing.stderr);
    assert.match(failing.stdout + failing.stderr, /CAT66 probe failure reached/u);
    fs.writeFileSync(probePath,
      'import test from "node:test"; test("probe passing sentinel", () => {});\n');
    const passing = run();
    assert.equal(passing.error, undefined);
    assert.equal(passing.status, 0, passing.stdout + passing.stderr);
    assert.match(passing.stdout, /probe passing sentinel/u);
  } finally {
    fs.rmSync(fixture, {recursive: true, force: true});
  }
});
