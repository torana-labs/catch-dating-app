import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import "./marketing_capture_package.test.mjs";
import {fileURLToPath} from "node:url";
import {matchesGlobPath as matchesGlob} from "../lib/path_glob.mjs";
import {authorizePromotion, evaluatePromotionAuthorization, evaluatePromotionFreshness} from "./web_hosting_freshness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function workflow(name) {
  return fs.readFileSync(path.join(repoRoot, ".github", "workflows", name), "utf8");
}

function caller(surface) {
  return workflow(`${surface}-website.yml`);
}

function finalFreshnessGateScript() {
  const promote = workflow("_web-hosting-promote.yml");
  const marker = promote.indexOf(
    "      - name: Refuse to overtake a newer main push immediately before mutation",
  );
  const runStart = promote.indexOf("        run: |\n", marker);
  // Stop at the next workflow step, including steps introduced with an id.
  // A later named deployment step may have other guarded steps before it.
  const runEnd = promote.indexOf("\n      - ", runStart);
  assert.ok(marker >= 0 && runStart > marker && runEnd > runStart);
  return promote.slice(runStart + "        run: |\n".length, runEnd)
    .split("\n")
    .map((line) => line.startsWith("          ") ? line.slice(10) : line)
    .join("\n");
}

function runFinalFreshnessGate(mode, {ancestor = true} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "web-hosting-freshness-"));
  const bin = path.join(directory, "bin");
  fs.mkdirSync(path.join(directory, "web-hosting-control"));
  fs.copyFileSync(path.join(repoRoot, "tool/ci/web_hosting_freshness.mjs"), path.join(directory, "web-hosting-control/web_hosting_freshness.mjs"));
  fs.mkdirSync(bin);
  const trace = path.join(directory, "calls.log");
  const output = path.join(directory, "github-output");
  fs.writeFileSync(output, "");
  const sha = "a".repeat(40);
  const mainSha = "b".repeat(40);
  const git = `#!/bin/sh
case "$1" in
  fetch) printf 'fetch\\n' >> "$GATE_TRACE"; exit 0 ;;
  rev-parse) printf '%s\\n' "$GATE_MAIN_SHA"; exit 0 ;;
  merge-base) [ "$GATE_ANCESTOR" = "true" ]; exit $? ;;
  *) printf 'unexpected git command\\n' >&2; exit 97 ;;
esac
`;
  const gh = `#!/bin/sh
printf '%s\\n' "$*" >> "$GATE_TRACE"
no_cache=false
for arg in "$@"; do
  if [ "$arg" = "Cache-Control: no-cache" ]; then no_cache=true; fi
done
case "$*" in
  *"actions/runs/$SOURCE_CI_RUN_ID")
    printf '%s\\n' '{"id":101,"run_attempt":2,"head_sha":"${sha}","event":"push","head_branch":"main"}'
    ;;
  *"actions/workflows/$SOURCE_CI_WORKFLOW_ID/runs?"*)
    if [ "$GATE_MODE" = "clean" ] || { [ "$GATE_MODE" = "stale-then-fresh" ] && [ "$no_cache" = "true" ]; }; then
      printf '%s\\n' '{"workflow_runs":[{"id":101,"run_number":73,"head_sha":"${sha}","head_branch":"main","event":"push"}]}'
    elif [ "$GATE_MODE" = "same-number-mismatch" ]; then
      printf '%s\\n' '{"workflow_runs":[{"id":102,"run_number":73,"head_sha":"${mainSha}","head_branch":"main","event":"push"}]}'
    else
      printf '%s\\n' '{"workflow_runs":[{"id":102,"run_number":74,"head_sha":"${mainSha}","head_branch":"main","event":"push"}]}'
    fi
    ;;
  *) printf 'unexpected GitHub endpoint\\n' >&2; exit 96 ;;
esac
`;

  fs.writeFileSync(path.join(bin, "git"), git, {mode: 0o755});
  fs.writeFileSync(path.join(bin, "gh"), gh, {mode: 0o755});
  try {
    const result = spawnSync("/bin/bash", ["-euo", "pipefail", "-c", finalFreshnessGateScript()], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        RUNNER_TEMP: directory,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        GATE_TRACE: trace,
        GATE_MODE: mode,
        GATE_MAIN_SHA: mainSha,
        GATE_ANCESTOR: String(ancestor),
        GITHUB_OUTPUT: output,
        GITHUB_REPOSITORY: "suvratgarg/catch-dating-app",
        IS_RECOVERY: "false",
        SOURCE_CI_RUN_ATTEMPT: "2",
        SOURCE_CI_RUN_ID: "101",
        SOURCE_CI_RUN_NUMBER: "73",
        SOURCE_CI_WORKFLOW_ID: "287908946",
        SOURCE_SHA: sha,
      },
    });
    const calls = fs.readFileSync(trace, "utf8").trim().split("\n").filter(Boolean);
    return {result, calls, output: fs.readFileSync(output, "utf8")};
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

function promotionIsFresh(candidate, state) {
  const latestMatches = candidate.runId === state.latest.runId &&
    candidate.runNumber === state.latest.runNumber &&
    candidate.sha === state.latest.sha;
  if (!latestMatches) return false;
  if (candidate.recovery) {
    return candidate.event === "workflow_dispatch" && candidate.terminalFailure &&
      candidate.sha === state.currentMainSha;
  }
  return candidate.event === "push" && state.mainAncestors.has(candidate.sha);
}

function recoveryAttemptIsCurrent(candidateAttempt, currentRun, retainedArtifacts) {
  const hasExactArtifact = retainedArtifacts.some(
    (artifact) => artifact.attempt === candidateAttempt,
  );
  return hasExactArtifact && currentRun.runAttempt === candidateAttempt;
}

test("admin and marketing callers share one exact build and promotion path", () => {
  for (const surface of ["admin", "marketing"]) {
    const source = caller(surface);
    assert.match(source, /uses: \.\/\.github\/workflows\/_web-hosting-build\.yml/u);
    assert.match(source, /uses: \.\/\.github\/workflows\/_web-hosting-promote\.yml/u);
    assert.match(source, new RegExp(`surface: ${surface}`));
    assert.match(source, /artifact_digest: \$\{\{ needs\.package\.outputs\.artifact_digest \}\}/u);
    assert.match(source, /artifact_id: \$\{\{ needs\.package\.outputs\.artifact_id \}\}/u);
    assert.match(source, /source_ci_run_attempt: \$\{\{ needs\.package\.outputs\.source_ci_run_attempt \}\}/u);
    assert.match(source, /source_ci_run_id: \$\{\{ needs\.package\.outputs\.source_ci_run_id \}\}/u);
    assert.match(source, /source_sha: \$\{\{ needs\.package\.outputs\.source_sha \}\}/u);
    assert.doesNotMatch(source.slice(source.indexOf("jobs:")),
      /firebase_with_env\.sh|vite build|web:(?:admin|marketing):build/u);
    for (const input of [
      "recovery_artifact_digest",
      "recovery_artifact_id",
      "recovery_reason",
      "recovery_source_run_attempt",
      "recovery_source_run_id",
      "recovery_source_sha",
    ]) assert.match(source, new RegExp(`${input}:`));
    for (const pathInput of [
      ".github/workflows/_web-hosting-build.yml",
      ".github/workflows/_web-hosting-promote.yml",
      "tool/ci/delivery_core.mjs",
      "tool/ci/package_web_hosting.mjs",
      "tool/firebase_with_env.sh",
    ]) assert.ok(source.includes(`- "${pathInput}"`), `${surface} is missing ${pathInput}`);
  }
  const admin = caller("admin");
  for (const adminDependency of [
    "contracts/admin/admin_live_data_sources.json",
    "tool/firebase/check_client_callable_dependencies.mjs",
    "tool/firebase/firebase_project_resolver.mjs",
    "tool/web/check_admin_live_data_sources.mjs",
  ]) assert.ok(admin.includes(`- "${adminDependency}"`), `admin is missing ${adminDependency}`);
});

test("standalone Host web uses the same immutable build and promotion authority", () => {
  const source = caller("host");
  assert.match(source, /name: Host Website/u);
  assert.match(source, /uses: \.\/\.github\/workflows\/_web-hosting-build\.yml/u);
  assert.match(source, /uses: \.\/\.github\/workflows\/_web-hosting-promote\.yml/u);
  assert.match(source, /surface: host/u);
  assert.match(source, /flutter analyze --no-fatal-infos apps\/host lib\/hosts lib\/events/u);
  assert.match(source, /flutter test --concurrency=1 test\/hosts/u);
  assert.match(source,
    /artifact_digest: \$\{\{ needs\.package\.outputs\.artifact_digest \}\}/u);
  assert.match(source,
    /source_sha: \$\{\{ needs\.package\.outputs\.source_sha \}\}/u);
  assert.doesNotMatch(source.slice(source.indexOf("  package:")),
    /flutter build|flutter_with_env\.sh/u);

  const build = workflow("_web-hosting-build.yml");
  assert.match(build,
    /Build the exact production Host web bytes once[\s\S]*flutter_with_env\.sh prod --role host build web --release/u);
  const promote = workflow("_web-hosting-promote.yml");
  assert.match(fs.readFileSync(path.join(repoRoot, "tool/ci/web_hosting_freshness.mjs"), "utf8"), /expectedName =/u);
  assert.match(promote, /https:\/\/catchdates-host\.web\.app\//u);
});

test("caller triggers cover the exact build dependency closure", () => {
  const admin = caller("admin");
  assert.ok(admin.includes('- "packages/web-config/**"'));

  const marketing = caller("marketing");
  for (const dependency of [
    "functions/package.json",
    "functions/package-lock.json",
    "tool/contracts/generated/schema_contract_validators.mjs",
    "tool/contracts/generated/schema_contract_registry.mjs",
    "tool/demo/demo_seed/scenarios/**",
    "packages/web-config/**",
    "website/**",
  ]) {
    assert.ok(marketing.includes(`- "${dependency}"`),
      `marketing is missing materialization dependency ${dependency}`);
  }

  const host = caller("host");
  for (const dependency of [
    "firebase/prod/host/**",
    "packages/phosphor_flutter/**",
    "tool/app_targets.json",
    "tool/demo/demo_seed/personas/us_nyc_sales_profile_projection.planned.json",
    "tool/demo/demo_seed/scenarios/host-demo.json",
    "tool/platform/resolve_app_target.mjs",
    "tool/use_firebase_environment.sh",
    "tool/validate_firebase_environment.sh",
  ]) {
    assert.ok(host.includes(`- "${dependency}"`),
      `host is missing runtime build dependency ${dependency}`);
  }
  assert.doesNotMatch(host, /- "tool\/platform\/\*\*"/u,
    "Host validation helpers must not trigger a production Hosting deploy");
  assert.ok(!host.includes("tool/app_target_external_gates.json"),
    "external store status must not trigger a production Hosting deploy");
});

test("production Hosting push filters never grant test files deploy authority", () => {
  for (const surface of ["admin", "host", "marketing"]) {
    const source = caller(surface);
    const pushFilter = source.slice(0, source.indexOf("  workflow_dispatch:"));
    assert.doesNotMatch(pushFilter, /^\s+- ".*\.test\.mjs"$/mu,
      `${surface} test changes belong to CI and must not deploy production Hosting`);
  }
});

test("three pushes and manual interference cannot replace a pending promotion", () => {
  for (const surface of ["admin", "marketing"]) {
    const source = caller(surface);
    const header = source.slice(0, source.indexOf("permissions:"));
    assert.doesNotMatch(header, /^concurrency:/mu,
      `${surface} caller must admit every validation and build run`);
  }
  const promote = workflow("_web-hosting-promote.yml");
  assert.match(promote,
    /concurrency:\n\s+group: web-hosting-\$\{\{ inputs\.surface \}\}\n\s+cancel-in-progress: false\n\s+queue: max/u);

  const pushes = [
    {runId: "101", runNumber: 41, sha: "a".repeat(40), event: "push"},
    {runId: "102", runNumber: 42, sha: "b".repeat(40), event: "push"},
    {runId: "103", runNumber: 43, sha: "c".repeat(40), event: "push"},
  ];
  const manualValidation = {kind: "validation", event: "workflow_dispatch"};
  const staleManualRecovery = {
    ...pushes[0],
    event: "workflow_dispatch",
    recovery: true,
    terminalFailure: true,
  };
  const admitted = [pushes[0], manualValidation, pushes[1], staleManualRecovery, pushes[2]];
  assert.equal(admitted.length, 5, "caller-wide concurrency must not discard any run");
  const state = {
    latest: pushes[2],
    currentMainSha: pushes[2].sha,
    mainAncestors: new Set(pushes.map((entry) => entry.sha)),
  };
  assert.deepEqual(pushes.map((candidate) => promotionIsFresh(candidate, state)),
    [false, false, true]);
  assert.equal(promotionIsFresh(staleManualRecovery, state), false);
  assert.equal("runId" in manualValidation, false,
    "validation-only dispatch does not enter the promotion queue");
});

test("main builds the deployable Vite output once while validation-only dispatch remains a no-op", () => {
  const validation = workflow("react-surface-validation.yml");
  assert.match(validation, /npx playwright install chromium/u);
  assert.doesNotMatch(validation, /playwright install --with-deps/u);
  assert.match(validation, /skip_deployable_build:[\s\S]*type: boolean[\s\S]*default: false/u);
  assert.match(validation,
    /inputs\.surface == 'marketing' && !inputs\.skip_deployable_build/u);
  assert.match(validation,
    /inputs\.surface == 'admin' && !inputs\.skip_deployable_build/u);
  assert.match(validation,
    /inputs\.surface == 'marketing' && inputs\.skip_deployable_build[\s\S]*npm run web:marketing:typecheck/u);
  assert.match(validation,
    /inputs\.surface == 'admin' && inputs\.skip_deployable_build[\s\S]*npm run web:admin:typecheck/u);

  for (const surface of ["admin", "marketing"]) {
    const source = caller(surface);
    assert.match(source,
      /skip_deployable_build: \$\{\{ github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' \}\}/u);
    if (surface === "admin") assert.match(source,
      /if: \$\{\{ github\.event_name != 'workflow_dispatch' \|\| inputs\.recovery_artifact_id == '' \}\}/u);
    assert.match(source,
      /if: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.recovery_artifact_id != '' \}\}/u);
    const packageJob = source.slice(source.indexOf("  package:"), source.indexOf("  promote:"));
    assert.match(packageJob, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/u);
    assert.doesNotMatch(packageJob, /workflow_dispatch/u);
  }
});

test("the producing job binds workflow generation, builds production bytes, and uploads one immutable package", () => {
  const build = workflow("_web-hosting-build.yml");
  for (const predicate of [
    '(.path | split("@")[0]) == $path',
    '.event == "push"',
    '.head_branch == "main"',
    '.head_repository.full_name == $repository',
    ".workflow_id",
    ".run_number",
    'test "$GITHUB_EVENT_NAME" = "push"',
    'test "$GITHUB_REF" = "refs/heads/main"',
  ]) assert.ok(build.includes(predicate), `missing build binding ${predicate}`);
  assert.match(build,
    /web-hosting-v1-\$\{SURFACE\}-\$\{workflow_id\}-\$\{GITHUB_RUN_NUMBER\}-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_SHA\}-\$\{GITHUB_RUN_ATTEMPT\}/u);
  assert.match(build, /environment: prod-hosting/u);

  const materialize = build.indexOf("Materialize the production organizer projection");
  const buildJob = build.indexOf("  build:");
  const marketingEnv = build.indexOf("Validate production marketing environment before build");
  const listingDownload = build.indexOf("Download and verify only the exact marketing listing inputs");
  const marketingBuild = build.indexOf("Build the exact production marketing bytes once");
  assert.ok(materialize >= 0 && materialize < buildJob && buildJob < marketingEnv &&
    marketingEnv < listingDownload && listingDownload < marketingBuild);
  assert.match(build,
    /build:\n\s+name:[\s\S]*needs: marketing_snapshot[\s\S]*!cancelled\(\)[\s\S]*needs\.marketing_snapshot\.result == 'success'/u);
  const adminEnv = build.indexOf("Validate production admin environment before build");
  const adminLive = build.indexOf("Verify production Admin callable dependencies before build");
  const adminBuild = build.indexOf("Build the exact production admin bytes once");
  assert.ok(adminEnv >= 0 && adminEnv < adminLive && adminLive < adminBuild);
  assert.equal((build.match(/vite build/gu) ?? []).length, 2);
  assert.doesNotMatch(build, /web:(?:admin|marketing):build|firebase_with_env\.sh|firebase deploy/u);

  const prepare = build.indexOf("package_web_hosting.mjs prepare");
  const manifest = build.indexOf("delivery_core.mjs manifest");
  const coreVerify = build.indexOf("delivery_core.mjs verify");
  const adapterVerify = build.indexOf("package_web_hosting.mjs verify");
  const upload = build.lastIndexOf("actions/upload-artifact@v7");
  assert.ok(prepare >= 0 && prepare < manifest && manifest < coreVerify &&
    coreVerify < adapterVerify && adapterVerify < upload);
  assert.match(build, /tar --sort=name --mtime='UTC 1970-01-01'/u);
  assert.match(build, /--owner=0 --group=0 --numeric-owner/u);
  assert.match(build, /--stages "hosting-\$\{SURFACE\}"/u);
  assert.match(build,
    /delivery_core\.mjs manifest[\s\S]*--out build\/web-delivery\/upload\/web-hosting-provenance\.json[\s\S]*delivery_core\.mjs verify/u);
  assert.doesNotMatch(build,
    /delivery_core\.mjs manifest[\s\S]*--output build\/web-delivery\/upload\/web-hosting-provenance\.json/u);
  assert.match(build, /test "\$\(find build\/web-delivery\/upload -type f \| wc -l \| tr -d ' '\)" = "2"/u);
  assert.match(build,
    /artifact_digest: \$\{\{ format\('sha256:\{0\}', steps\.upload\.outputs\.artifact-digest\) \}\}/u);
  assert.match(build, /artifact_id: \$\{\{ steps\.upload\.outputs\.artifact-id \}\}/u);
  assert.match(build, /retention-days: 90/u);
});

test("build credentials are isolated to a read-only marketing snapshot job", () => {
  const build = workflow("_web-hosting-build.yml");
  const snapshot = build.slice(build.indexOf("  marketing_snapshot:"), build.indexOf("  build:"));
  const packageBuild = build.slice(build.indexOf("  build:"));

  assert.match(snapshot, /if: \$\{\{ inputs\.surface == 'marketing' \}\}/u);
  assert.match(snapshot, /actions: read[\s\S]*id-token: write/u);
  assert.match(snapshot, /id-token: write/u);
  assert.match(snapshot, /Bind the snapshot to the canonical marketing main push/u);
  assert.match(snapshot, /\.github\/workflows\/marketing-website\.yml/u);
  assert.match(snapshot, /test "\$GITHUB_EVENT_NAME" = "push"/u);
  assert.match(snapshot, /test "\$GITHUB_REF" = "refs\/heads\/main"/u);
  assert.match(snapshot, /GCP_WEB_HOSTING_READONLY_WORKLOAD_IDENTITY_PROVIDER/u);
  assert.match(snapshot, /GCP_WEB_HOSTING_READONLY_SERVICE_ACCOUNT_EMAIL/u);
  assert.match(snapshot, /npm --prefix functions ci --omit=dev --ignore-scripts/u);
  assert.match(snapshot, /materialize:organizer-listings:deploy/u);
  const materialize = snapshot.indexOf("Materialize the production organizer projection");
  const removeCredentials = snapshot.indexOf(
    "Remove read-only credentials before artifact handling",
  );
  const upload = snapshot.indexOf("Upload only the exact marketing listing inputs");
  assert.ok(materialize >= 0 && materialize < removeCredentials &&
    removeCredentials < upload);
  assert.match(snapshot, /rm -f -- "\$credential_file"[\s\S]*test ! -e "\$credential_file"/u);
  assert.match(snapshot,
    /Upload only the exact marketing listing inputs[\s\S]*ACTIONS_ID_TOKEN_REQUEST_TOKEN: ""[\s\S]*GOOGLE_GHA_CREDS_PATH: ""/u);
  assert.match(snapshot,
    /find build\/marketing-listing-inputs -type f[\s\S]*= "2"/u);

  assert.match(packageBuild, /permissions:\n\s+actions: read\n\s+contents: read/u);
  assert.doesNotMatch(packageBuild,
    /id-token: write|google-github-actions\/auth|materialize:organizer-listings:deploy|npm --prefix functions ci/u);
  assert.match(packageBuild, /actions\/artifacts\/\$SNAPSHOT_ARTIFACT_ID\/zip/u);
  assert.match(packageBuild,
    /expected_name="marketing-listing-inputs-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}"/u);
  assert.match(packageBuild,
    /\.name == \$name[\s\S]*\.digest == \$digest[\s\S]*\.workflow_run\.head_sha == \$source_sha/u);
  assert.match(packageBuild,
    /sha256:\$\(sha256sum build\/marketing-listing-inputs\.zip/u);
  assert.match(packageBuild, /npm --workspace catch-marketing run check:organizer-listings/u);
});

test("promotion downloads only the immutable artifact id and verifies bytes before credentials", () => {
  const promote = workflow("_web-hosting-promote.yml");
  assert.match(promote, /web_hosting_freshness.mjs" authorize/u);
  assert.match(promote, /actions\/artifacts\/\$ARTIFACT_ID\/zip/u);
  assert.match(promote,
    /sha256:\$\(sha256sum build\/web-delivery\/source\.zip \| awk '\{print \$1\}'\)/u);

  assert.ok(promote.includes("unzip -Z1 build/web-delivery/source.zip"));
  assert.ok(promote.includes("awk '/(^\\/|(^|\\/)\\.\\.($|\\/))/ { exit 64 }'"));
  assert.ok(promote.includes('tar -tzf "$archive"'));
  assert.match(promote,
    /tar -tvzf[\s\S]*substr\(\$0, 1, 1\) != "-"[\s\S]*substr\(\$0, 1, 1\) != "d"/u);
  assert.match(promote, /--no-same-owner --no-same-permissions/u);

  const firstCoreVerify = promote.indexOf("delivery_core.mjs verify");
  const firstAdapterVerify = promote.indexOf("package_web_hosting.mjs verify");
  const install = promote.indexOf("Install the pinned Firebase CLI before deployment credentials");
  const reverify = promote.indexOf("Re-extract and reverify immutable bytes before deployment credentials");
  const auth = promote.indexOf("Authenticate to Google Cloud only for final freshness and mutation");
  const freshness = promote.indexOf("Refuse to overtake a newer main push immediately before mutation");
  const deploy = promote.indexOf("Deploy only the verified production Hosting target without rebuilding");
  assert.ok(firstCoreVerify >= 0 && firstCoreVerify < firstAdapterVerify &&
    firstAdapterVerify < install && install < reverify && reverify < auth &&
    auth < freshness && freshness < deploy);
  assert.equal((promote.match(/sha256:\$\(sha256sum build\/web-delivery\/source\.zip/gu) ?? []).length, 2);
  assert.match(promote,
    /rm -rf build\/web-delivery\/source build\/web-delivery\/package/u);
  assert.equal((promote.match(/delivery_core\.mjs verify/gu) ?? []).length, 2);
  assert.equal((promote.match(/package_web_hosting\.mjs verify/gu) ?? []).length, 2);
  assert.match(promote,
    /working-directory: build\/web-delivery\/package[\s\S]*"\$GITHUB_WORKSPACE\/tool\/firebase_with_env\.sh" prod deploy[\s\S]*--config firebase\.json/u);
  assert.match(promote, /--only "hosting:\$\{SURFACE\}"/u);
  assert.doesNotMatch(promote,
    /npm ci|npm --prefix functions ci|vite build|web:(?:admin|marketing):build|materialize:organizer/u);
});

test("recovery is exact, reasoned, terminal-only, and separate from validation dispatch", () => {
  const promote = workflow("_web-hosting-promote.yml");
  assert.match(promote, /test "\$GITHUB_EVENT_NAME" = "workflow_dispatch"/u);
  assert.match(promote, /test "\$GITHUB_REF" = "refs\/heads\/main"/u);
  assert.match(promote, /GITHUB_RUN_ATTEMPT > 1[\s\S]*fresh manual dispatch/u);
  assert.match(promote, /RECOVERY_REASON\/\/\[\[:space:\]\]\//u);
  assert.match(promote, /test "\$SOURCE_CI_RUN_ID" != "\$GITHUB_RUN_ID"/u);
  const helper = fs.readFileSync(path.join(repoRoot, "tool/ci/web_hosting_freshness.mjs"), "utf8");
  assert.match(helper, /attempt.status === "completed"/u);
  for (const terminal of ["failure", "cancelled", "timed_out", "stale", "action_required", "startup_failure"]) {
    assert.ok(helper.includes(`"${terminal}"`));
  }
  assert.doesNotMatch(helper, /terminal = .*"(?:success|neutral|skipped)"/u);

  for (const surface of ["admin", "marketing"]) {
    const source = caller(surface);
    const recovery = source.slice(source.indexOf("  recover:"));
    assert.match(recovery, /recovery: true/u);
    assert.match(recovery, /artifact_digest: \$\{\{ inputs\.recovery_artifact_digest \}\}/u);
    assert.match(recovery, /artifact_id: \$\{\{ inputs\.recovery_artifact_id \}\}/u);
    assert.match(recovery, /recovery_reason: \$\{\{ inputs\.recovery_reason \}\}/u);
    assert.match(recovery, /source_ci_run_attempt: \$\{\{ inputs\.recovery_source_run_attempt \}\}/u);
    assert.match(recovery, /source_ci_run_id: \$\{\{ inputs\.recovery_source_run_id \}\}/u);
    assert.match(recovery, /source_sha: \$\{\{ inputs\.recovery_source_sha \}\}/u);
  }
});

test("stale recovery and an older partial-rerun artifact fail before mutation", () => {
  const promote = workflow("_web-hosting-promote.yml");
  const helper = fs.readFileSync(path.join(repoRoot, "tool/ci/web_hosting_freshness.mjs"), "utf8");
  assert.match(helper, /actions\/workflows\/\$\{expected.surface\}-website.yml/u);
  assert.match(helper, /canonicalWorkflowIdentity/u);
  assert.match(helper, /freshestPackagedAttempt/u);
  assert.match(helper, /uniqueSelectedArtifact/u);
  assert.match(helper, /actions\/runs\/\$\{expected.runId\}\/artifacts\?per_page=100/u);
  assert.match(helper, /producerAttempt: sourceRun\.runAttempt === expectedAttempt/u);
  assert.equal(
    (promote.match(/test "\$\(git rev-parse refs\/remotes\/origin\/main\)" = "\$SOURCE_SHA"/gu) ?? []).length,
    1,
    "recovery source must equal current main after checkout; final read is evaluated by helper",
  );
  assert.equal(
    (promote.match(/git merge-base --is-ancestor "\$SOURCE_SHA" refs\/remotes\/origin\/main/gu) ?? []).length,
    2,
    "ancestry must be checked before mutation and rechecked at the final freshness gate",
  );
  assert.match(promote,
    /if \[\[ "\$IS_RECOVERY" == "true" \]\]; then[\s\S]*git rev-parse refs\/remotes\/origin\/main/u);
  const lastFreshness = promote.lastIndexOf(
    "Final source/freshness predicates (single no-cache read)",
  );
  const deploy = promote.indexOf(
    "Deploy only the verified production Hosting target without rebuilding",
  );
  assert.ok(lastFreshness >= 0 && lastFreshness < deploy);

  assert.equal(recoveryAttemptIsCurrent(1, {runAttempt: 2}, [{attempt: 1}]), false,
    "a retained attempt-1 artifact cannot authorize recovery after attempt 2 exists");
  assert.equal(recoveryAttemptIsCurrent(2, {runAttempt: 2}, [{attempt: 1}]), false,
    "a latest rerun with no package must fail closed and require an all-jobs rerun");
});

function validFreshnessEvidence(overrides = {}) {
  const sourceSha = "a".repeat(40);
  const sourceRun = {
    id: 101,
    runAttempt: 2,
    headSha: sourceSha,
    event: "push",
    branch: "main",
  };
  const latestRun = {
    id: 101,
    runNumber: 73,
    sha: sourceSha,
    branch: "main",
    event: "push",
  };
  return {
    expected: {
      sourceSha,
      runId: "101",
      runAttempt: 2,
      workflowId: "287908946",
      runNumber: 73,
      recovery: false,
    },
    actual: {
      mainSha: "b".repeat(40),
      sourceIsAncestor: true,
      sourceRun,
      latestRuns: [latestRun],
    },
    ...overrides,
  };
}

test("final promotion freshness evaluator accepts only the complete source and latest-run identity", () => {
  const valid = evaluatePromotionFreshness(validFreshnessEvidence());
  assert.equal(valid.passed, true);
  assert.deepEqual(valid.failedChecks, []);
  assert.equal(valid.actual.sourceRun.id, "101");
  assert.deepEqual(valid.actual.latestRuns, [{
    id: "101",
    runNumber: 73,
    sha: "a".repeat(40),
    branch: "main",
    event: "push",
  }]);

  const cases = [
    ["source ancestry failure", (e) => { e.actual.sourceIsAncestor = false; }, "sourceIsAncestorOfMain"],
    ["producer run identity mismatch", (e) => { e.actual.sourceRun.id = 102; }, "producerRunIdentity"],
    ["producer attempt mismatch", (e) => { e.actual.sourceRun.runAttempt = 1; }, "producerAttempt"],
    ["producer SHA mismatch", (e) => { e.actual.sourceRun.headSha = "c".repeat(40); }, "producerSourceSha"],
    ["producer branch mismatch", (e) => { e.actual.sourceRun.branch = "release"; }, "producerBranch"],
    ["producer event mismatch", (e) => { e.actual.sourceRun.event = "workflow_dispatch"; }, "producerEvent"],
    ["latest run id mismatch", (e) => { e.actual.latestRuns[0].id = 102; }, "latestRunIdentity"],
    ["latest run number mismatch", (e) => { e.actual.latestRuns[0].runNumber = 72; }, "latestRunNumber"],
    ["latest SHA mismatch", (e) => { e.actual.latestRuns[0].sha = "c".repeat(40); }, "latestRunSourceSha"],
    ["latest branch mismatch", (e) => { e.actual.latestRuns[0].branch = "release"; }, "latestRunBranch"],
    ["latest event mismatch", (e) => { e.actual.latestRuns[0].event = "workflow_dispatch"; }, "latestRunEvent"],
    ["empty latest query", (e) => { e.actual.latestRuns = []; }, "latestRunCountIsOne"],
    ["ambiguous latest query", (e) => { e.actual.latestRuns.push({...e.actual.latestRuns[0]}); }, "latestRunCountIsOne"],
    ["recovery must match current main", (e) => {
      e.expected.recovery = true;
      e.actual.mainSha = "d".repeat(40);
    }, "recoverySourceEqualsCurrentMain"],
  ];

  for (const [label, mutate, failedCheck] of cases) {
    const evidence = validFreshnessEvidence();
    mutate(evidence);
    const result = evaluatePromotionFreshness(evidence);
    assert.equal(result.passed, false, label);
    assert.ok(result.failedChecks.includes(failedCheck), label);
  }
});

test("final freshness mismatch gets at most one no-cache read and remains fail-closed", () => {
  const promote = workflow("_web-hosting-promote.yml");
  const gate = promote.slice(
    promote.indexOf("Refuse to overtake a newer main push immediately before mutation"),
    promote.indexOf("Deploy only the verified production Hosting target without rebuilding"),
  );
  assert.match(gate, /read_freshness_evidence cached/u);
  assert.match(gate, /read_freshness_evidence no-cache/u);
  assert.equal((gate.match(/read_freshness_evidence no-cache/gu) ?? []).length, 1);
  assert.match(gate, /Cache-Control: no-cache/u);
  assert.match(gate,
    /if ! jq -e '\.passed == true'[\s\S]*read_freshness_evidence no-cache[\s\S]*if ! jq -e '\.passed == true'[\s\S]*exit 1/u);
  assert.match(gate, /git merge-base --is-ancestor "\$SOURCE_SHA" refs\/remotes\/origin\/main/u);
  assert.match(gate, /sourceIsAncestor: \$source_is_ancestor/u);
  assert.match(gate, /latestRuns: \$latest_runs/u);
  assert.match(gate, /Final source\/freshness predicates \(single no-cache read\)/u);
});

test("final freshness shell retries one stale API read once, then still refuses persistent mismatch", () => {
  const clean = runFinalFreshnessGate("clean");
  assert.equal(clean.result.status, 0, clean.result.stderr);
  assert.equal(clean.output, "");
  assert.equal(clean.calls.filter((call) => call.startsWith("api ")).length, 2);
  assert.equal(clean.calls.filter((call) => call.includes("Cache-Control: no-cache")).length, 0);

  const staleThenFresh = runFinalFreshnessGate("stale-then-fresh");
  assert.equal(staleThenFresh.result.status, 0, staleThenFresh.result.stderr);
  assert.equal(staleThenFresh.calls.filter((call) => call.startsWith("api ")).length, 4);
  assert.equal(staleThenFresh.calls.filter((call) => call.includes("Cache-Control: no-cache")).length, 2);
  assert.match(staleThenFresh.result.stdout, /Initial source\/freshness read did not satisfy/u);
  assert.match(staleThenFresh.result.stdout, /single no-cache read/u);

  assert.equal(staleThenFresh.output, "");

  // Only a newer push stands down (next test); anything else stays a refusal.
  for (const [label, gate] of [
    ["same run number, different run", runFinalFreshnessGate("same-number-mismatch")],
    ["newer push but source left main", runFinalFreshnessGate("persistent-mismatch", {ancestor: false})],
  ]) {
    assert.equal(gate.result.status, 1, label);
    assert.equal(gate.calls.filter((call) => call.startsWith("api ")).length, 4, label);
    assert.equal(gate.calls.filter((call) => call.includes("Cache-Control: no-cache")).length, 2, label);
    assert.equal(gate.output, "", label);
    assert.match(gate.result.stdout, /remains unsatisfied after one no-cache read; refusing deployment/u, label);
  }
});

test("final freshness shell stands down without deploying when a newer push of the surface started", () => {
  const newerPush = runFinalFreshnessGate("persistent-mismatch");
  assert.equal(newerPush.result.status, 0, newerPush.result.stderr);
  assert.equal(newerPush.calls.filter((call) => call.startsWith("api ")).length, 4);
  assert.equal(newerPush.calls.filter((call) => call.includes("Cache-Control: no-cache")).length, 2);
  assert.equal(newerPush.output, "superseded=true\n");
  assert.match(newerPush.result.stdout, /this run deploys nothing/u);
});

test("only a newer push of the same surface supersedes a promotion, and recovery never is", () => {
  const newer = (evidence) => {
    evidence.actual.latestRuns[0] = {id: 102, runNumber: 74, sha: "c".repeat(40), branch: "main", event: "push"};
    return evidence;
  };
  const superseded = evaluatePromotionFreshness(newer(validFreshnessEvidence()));
  assert.equal(superseded.passed, false);
  assert.equal(superseded.superseded, true);
  assert.deepEqual(superseded.supersededBy, {runNumber: 74});
  assert.equal(evaluatePromotionFreshness(validFreshnessEvidence()).superseded, false);

  for (const [label, mutate] of [
    ["older latest run", (e) => { e.actual.latestRuns[0].runNumber = 72; }],
    ["same run number", (e) => { e.actual.latestRuns[0].runNumber = 73; }],
    ["source left main", (e) => { e.actual.sourceIsAncestor = false; }],
    ["producer attempt changed", (e) => { e.actual.sourceRun.runAttempt = 1; }],
    ["latest is not a main push", (e) => { e.actual.latestRuns[0].event = "workflow_dispatch"; }],
    ["ambiguous latest query", (e) => { e.actual.latestRuns.push({...e.actual.latestRuns[0]}); }],
    ["recovery", (e) => { e.expected.recovery = true; e.actual.mainSha = "c".repeat(40); }],
  ]) {
    const evidence = newer(validFreshnessEvidence());
    mutate(evidence);
    const result = evaluatePromotionFreshness(evidence);
    assert.equal(result.passed, false, label);
    assert.equal(result.superseded, false, label);
    assert.equal(result.supersededBy, null, label);
  }

  const initialNewer = (e) => {
    Object.assign(e.snapshot.latest.workflow_runs[0], {id: 102, run_number: 74, head_sha: "c".repeat(40)});
    return e;
  };
  const authorization = initialNewer(initialEvidence());
  const result = evaluatePromotionAuthorization(authorization.expected, authorization.snapshot);
  assert.equal(result.passed, false);
  assert.equal(result.binding, null);
  assert.deepEqual([result.superseded, result.supersededBy], [true, {runNumber: 74}]);
  for (const [label, mutate] of [
    ["same run number", (e) => { e.snapshot.latest.workflow_runs[0].run_number = 73; }],
    ["artifact digest changed", (e) => { e.snapshot.artifact.digest = `sha256:${"d".repeat(64)}`; }],
    ["recovery", (e) => { e.expected.recovery = true; }],
  ]) {
    const e = initialNewer(initialEvidence());
    mutate(e);
    assert.equal(evaluatePromotionAuthorization(e.expected, e.snapshot).superseded, false, label);
  }

  // Authorization stands down only after the no-cache reread agrees.
  const {expected, snapshot} = initialNewer(initialEvidence());
  const api = (endpoint) => structuredClone(endpoint.includes("/attempts/") ? snapshot.attempt :
    endpoint.endsWith("/runs/101") ? snapshot.current :
    endpoint.includes("marketing-website.yml") ? snapshot.canonical :
    endpoint.includes("/workflows/55/runs?") ? snapshot.latest :
    endpoint.includes("/artifacts/901") ? snapshot.artifact :
    endpoint.includes("/runs/101/artifacts?") ? snapshot.pages : snapshot.repository);
  const logs = [];
  assert.deepEqual(authorizePromotion(expected, api, (entry) => logs.push(entry)),
    {superseded: true, latestRunNumber: 74});
  assert.equal(logs.length, 2);
});

test("a superseded promotion skips every later step but still removes credentials it obtained", () => {
  const promote = workflow("_web-hosting-promote.yml");
  const steps = promote.slice(promote.indexOf("      - id: authorize")).split(/\n      - /u).slice(1);
  assert.ok(steps.length > 10);
  const authorizeSkip = "steps.authorize.outputs.superseded != 'true'";
  const freshnessSkip = "steps.freshness.outputs.superseded != 'true'";
  const lateGate = steps.findIndex((step) => step.startsWith("name: Refuse to overtake a newer main push"));
  assert.ok(lateGate > 0);
  assert.match(steps[lateGate], /\n        id: freshness\n/u);
  for (const [index, step] of steps.entries()) {
    const name = step.split("\n")[0];
    const condition = step.match(/\n        if: (\$\{\{[^\n]*\}\})/u)?.[1] ?? "";
    assert.ok(condition.includes(authorizeSkip), `${name} must skip after superseded authorization`);
    const removesCredentials = name.includes("Remove deploy credentials");
    assert.equal(condition.includes(freshnessSkip), index > lateGate && !removesCredentials,
      `${name} late-gate condition`);
  }
  const authorize = promote.slice(promote.indexOf("      - id: authorize"), promote.indexOf("Checkout the exact producing source"));
  assert.match(authorize, /if jq -e '\.superseded == true'[\s\S]*superseded=true[\s\S]*exit 0[\s\S]*workflow_id=/u);
});

test("the packaged Firebase target cannot run lifecycle hooks with deploy credentials", () => {
  const adapter = fs.readFileSync(
    path.join(repoRoot, "tool", "ci", "package_web_hosting.mjs"),
    "utf8",
  );
  assert.match(adapter, /delete target\.predeploy/u);
  assert.match(adapter, /delete target\.postdeploy/u);
  assert.match(adapter, /must not contain predeploy hooks/u);
  assert.match(adapter, /must not contain postdeploy hooks/u);

  const promote = workflow("_web-hosting-promote.yml");
  const finalVerify = promote.indexOf(
    "Re-extract and reverify immutable bytes before deployment credentials",
  );
  const auth = promote.indexOf(
    "Authenticate to Google Cloud only for final freshness and mutation",
  );
  const deploy = promote.indexOf(
    "--config firebase.json",
  );
  assert.ok(finalVerify >= 0 && finalVerify < auth && auth < deploy);
});

test("marketing production postconditions run only after exact promotion", () => {
  const promote = workflow("_web-hosting-promote.yml");
  const deploy = promote.indexOf("Deploy only the verified production Hosting target without rebuilding");
  const removeCredentials = promote.indexOf("Remove deploy credentials before postconditions");
  const unknown404 = promote.indexOf("Verify marketing production unknown paths return HTTP 404");
  const routeProbe = promote.indexOf("Verify launch-critical marketing production routes");
  assert.ok(deploy >= 0 && deploy < removeCredentials &&
    removeCredentials < unknown404 && unknown404 < routeProbe);
  assert.match(promote,
    /verifyHosting404\.mjs https:\/\/catchdates\.com/u);
  assert.match(promote,
    /probeProduction\.mjs --base-url https:\/\/catchdates\.com --json/u);
  assert.match(promote,
    /if: \$\{\{ inputs\.surface == 'marketing' && steps\.legacy-runtime\.outputs\.retired != 'true' && /u);
});

function initialEvidence() {
  const sha = "a".repeat(40);
  const expected = {surface: "marketing", repository: "owner/repo", runId: "101",
    runAttempt: 2, sourceSha: sha, recovery: false, artifactId: 901,
    artifactDigest: `sha256:${"b".repeat(64)}`};
  const run = {id: 101, run_attempt: 2, head_sha: sha, name: "Marketing Website",
    path: ".github/workflows/marketing-website.yml@main", event: "push", head_branch: "main",
    head_repository: {full_name: "owner/repo"}, workflow_id: 55, run_number: 73,
    status: "completed", conclusion: "failure"};
  const artifact = {id: 901, expired: false,
    name: `web-hosting-v1-marketing-55-73-101-${sha}-2`, digest: expected.artifactDigest,
    workflow_run: {id: 101, repository_id: 12, head_repository_id: 12,
      head_branch: "main", head_sha: sha}};
  return {expected, snapshot: {attempt: {...run}, current: {...run},
    canonical: {id: 55, path: run.path}, latest: {workflow_runs: [run]},
    artifact, repository: {id: 12}, pages: [{artifacts: [artifact]}]}};
}

test("initial authorization requires every original metadata predicate and fails closed for absent fields", () => {
  const valid = initialEvidence();
  assert.equal(evaluatePromotionAuthorization(valid.expected, valid.snapshot).passed, true);
  for (const field of Object.keys(valid.expected)) {
    const e = structuredClone(valid); delete e.expected[field];
    assert.equal(evaluatePromotionAuthorization(e.expected, e.snapshot).passed, false, `missing expected ${field}`);
  }
  // Each actual scalar in the original conjunction is independently required.
  const paths = [
    ...["attempt", "current"].flatMap(key => ["id", "run_attempt", "head_sha", "name", "path", "event", "head_branch", "head_repository.full_name"].map(field => `${key}.${field}`)),
    "attempt.workflow_id", "attempt.run_number", "canonical.id", "canonical.path",
    "latest.workflow_runs.0.id", "latest.workflow_runs.0.run_number", "latest.workflow_runs.0.head_sha",
    "latest.workflow_runs.0.head_branch", "latest.workflow_runs.0.event", "repository.id",
    ...["id", "expired", "name", "digest", "workflow_run.id", "workflow_run.repository_id", "workflow_run.head_repository_id", "workflow_run.head_branch", "workflow_run.head_sha"].map(field => `artifact.${field}`),
  ];
  for (const field of paths) for (const missing of [false, true]) {
    const evidence = structuredClone(valid);
    const parts = field.split(".");
    const key = parts.pop();
    const target = parts.reduce((object, part) => object[part], evidence.snapshot);
    if (missing) delete target[key]; else target[key] = "invalid-response-secret";
    assert.equal(evaluatePromotionAuthorization(evidence.expected, evidence.snapshot).passed, false, `${field} ${missing}`);
  }
  for (const field of ["status", "conclusion"]) {
    const e = initialEvidence(); e.expected.recovery = true;
    delete e.snapshot.attempt[field];
    assert.equal(evaluatePromotionAuthorization(e.expected, e.snapshot).passed, false);
  }
  for (const mutate of [e => {e.snapshot.pages = [];},
    e => {e.snapshot.pages[0].artifacts.push({...e.snapshot.artifact});},
    e => {e.snapshot.pages[0].artifacts.push({...e.snapshot.artifact, name: e.snapshot.artifact.name.slice(0, -1) + "3"});},
    e => {e.snapshot.pages[0].artifacts.push({...e.snapshot.artifact, name: e.snapshot.artifact.name.slice(0, -1) + "invalid"});}]) {
    const e = initialEvidence(); mutate(e);
    assert.equal(evaluatePromotionAuthorization(e.expected, e.snapshot).passed, false);
  }
});

test("initial authorization rereads the entire snapshot exactly once without mixing metadata", () => {
  for (const mode of ["valid", "stale-then-valid", "persistent", "invalid", "unavailable"]) {
    const {expected, snapshot} = initialEvidence();
    const calls = []; const logs = [];
    const api = (endpoint, options) => {
      calls.push({endpoint, ...options});
      if (mode === "unavailable") throw Error("TOKEN SECRET response body");
      let value = endpoint.includes("/attempts/") ? snapshot.attempt :
        endpoint.endsWith("/runs/101") ? snapshot.current :
        endpoint.includes("marketing-website.yml") ? snapshot.canonical :
        endpoint.includes("/workflows/55/runs?") ? snapshot.latest :
        endpoint.includes("/artifacts/901") ? snapshot.artifact :
        endpoint.includes("/runs/101/artifacts?") ? snapshot.pages : snapshot.repository;
      value = structuredClone(value);
      if (endpoint.includes("/workflows/55/runs?") && mode !== "valid" && !(mode === "stale-then-valid" && options.noCache)) {
        value.workflow_runs[0].id = 102;
      }
      if (mode === "invalid" && endpoint.endsWith("/artifacts/901")) value.digest = "TOKEN SECRET response body";
      return value;
    };
    if (["valid", "stale-then-valid"].includes(mode)) assert.equal(authorizePromotion(expected, api, x => logs.push(x)).workflowId, 55);
    else assert.throws(() => authorizePromotion(expected, api, x => logs.push(x)), /refusing deployment/u);
    const retries = mode === "valid" ? 0 : 1;
    assert.equal(logs.length, 1 + retries);
    assert.equal(calls.filter(x => x.noCache).length, mode === "unavailable" ? 1 : retries * 7);
    if (mode !== "unavailable") {
      assert.equal(calls.length, 7 * (1 + retries));
      assert.deepEqual(calls.slice(0, 7).map(x => x.endpoint), calls.slice(7).map(x => x.endpoint).length ? calls.slice(7).map(x => x.endpoint) : calls.slice(0, 7).map(x => x.endpoint));
      for (const call of calls.filter(x => x.endpoint.includes("/artifacts"))) assert.equal(call.artifact, true);
      assert.equal(calls.filter(x => x.paginate).length, 1 + retries);
    }
    assert.doesNotMatch(JSON.stringify(logs), /TOKEN|SECRET|response body/u);
  }
});

test("initial helper is immutable control-plane code; candidate checkout and cloud auth follow authorization", () => {
  const promote = workflow("_web-hosting-promote.yml");
  const control = promote.indexOf("Checkout immutable workflow control plane");
  const authorization = promote.indexOf("- id: authorize");
  const source = promote.indexOf("Checkout the exact producing source");
  const cloud = promote.indexOf("google-github-actions/auth@v3");
  assert.ok(control >= 0 && control < authorization && authorization < source && source < cloud);
  assert.match(promote, /ref: \$\{\{ github.workflow_sha \}\}/u);
  assert.match(promote, /sparse-checkout: tool\/ci\/web_hosting_freshness.mjs/u);
  assert.match(promote, /persist-credentials: false/u);
  assert.equal((promote.match(/node "\$RUNNER_TEMP\/web-hosting-control\/web_hosting_freshness.mjs"/gu) ?? []).length, 3);
  assert.match(promote, /test "\$\(git -C .hosting-control rev-parse HEAD\)" = "\$CONTROL_SHA"/u);
  const initial = promote.slice(authorization, source);
  assert.match(initial, /test "\$SOURCE_SHA" = "\$GITHUB_SHA"/u);
  assert.match(initial, /test "\$SOURCE_CI_RUN_ATTEMPT" = "\$GITHUB_RUN_ATTEMPT"/u);
  assert.doesNotMatch(initial, /inputs.source_sha \}\}[\s\S]*actions\/checkout|google-github-actions|npm|zip|tar /u);
});

test("initial authorization CLI preserves API headers, coherent retry and body-free logging", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "web-hosting-initial-cli-"));
  try {
    const {expected, snapshot} = initialEvidence();
    const fixture = path.join(directory, "snapshot.json");
    const trace = path.join(directory, "trace.jsonl");
    fs.writeFileSync(fixture, JSON.stringify(snapshot));
    fs.writeFileSync(path.join(directory, "gh"), `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.GATE_TRACE, JSON.stringify(args) + "\\n");
const s = JSON.parse(fs.readFileSync(process.env.GATE_FIXTURE, "utf8"));
const endpoint = args.at(-1);
let value = endpoint.includes("/attempts/") ? s.attempt :
  endpoint.endsWith("/runs/101") ? s.current :
  endpoint.includes("marketing-website.yml") ? s.canonical :
  endpoint.includes("/workflows/55/runs?") ? s.latest :
  endpoint.includes("/artifacts/901") ? s.artifact :
  endpoint.includes("/runs/101/artifacts?") ? s.pages : s.repository;
if (endpoint.includes("/workflows/55/runs?") && !args.includes("Cache-Control: no-cache")) value.workflow_runs[0].id = 102;
process.stderr.write("SECRET-TOKEN arbitrary response body\\n");
console.log(JSON.stringify(value));
`, {mode: 0o755});
    const result = spawnSync(process.execPath, ["tool/ci/web_hosting_freshness.mjs", "authorize"], {
      cwd: repoRoot, encoding: "utf8", env: {...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH}`,
        GATE_FIXTURE: fixture, GATE_TRACE: trace, SURFACE: expected.surface,
        GITHUB_REPOSITORY: expected.repository, SOURCE_CI_RUN_ID: expected.runId,
        SOURCE_CI_RUN_ATTEMPT: "2", SOURCE_SHA: expected.sourceSha, IS_RECOVERY: "false",
        ARTIFACT_ID: "901", ARTIFACT_DIGEST: expected.artifactDigest},
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).workflowId, 55);
    assert.doesNotMatch(result.stderr + result.stdout, /SECRET-TOKEN|arbitrary response body/u);
    const calls = fs.readFileSync(trace, "utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.equal(calls.length, 14);
    assert.equal(calls.filter(call => call.includes("Cache-Control: no-cache")).length, 7);
    for (const call of calls.filter(call => call.at(-1).includes("/artifacts"))) {
      assert.ok(call.includes("X-GitHub-Api-Version: 2026-03-10"));
    }
    assert.equal(calls.filter(call => call.includes("--paginate") && call.includes("--slurp")).length, 2);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});


test("malformed initial metadata cannot leak API objects or strings through expected diagnostics", () => {
  for (const poisoned of [{secret: "sentinel-response-body"}, ["sentinel-response-body"], "sentinel-response-body"]) {
    for (const mutate of [e => {e.snapshot.attempt.workflow_id = poisoned; e.snapshot.canonical.id = poisoned;},
      e => {e.snapshot.attempt.run_number = poisoned; e.snapshot.latest.workflow_runs[0].run_number = poisoned;},
      e => {e.snapshot.artifact.name = poisoned;},
      e => {e.snapshot.repository.id = poisoned; e.snapshot.artifact.workflow_run.repository_id = poisoned;},
      e => {e.snapshot.attempt.head_sha = poisoned;}]) {
      const e = initialEvidence(); mutate(e);
      const result = evaluatePromotionAuthorization(e.expected, e.snapshot);
      assert.equal(result.passed, false);
      assert.equal(result.binding, null);
      assert.doesNotMatch(JSON.stringify(result), /sentinel-response-body|secret/u);
    }
  }
});

test("automatic promotion labels recovery-only diagnostics not applicable while recovery remains terminal-only", () => {
  const e = initialEvidence();
  e.snapshot.attempt.status = "in_progress";
  e.snapshot.attempt.conclusion = null;
  const automatic = evaluatePromotionAuthorization(e.expected, e.snapshot);
  assert.equal(automatic.passed, true);
  for (const key of ["recoveryTerminalStatus", "recoveryTerminalConclusion"]) {
    assert.equal(automatic.checks[key], true);
    assert.deepEqual(automatic.observations[key], {expected: "not-applicable", observed: "not-applicable"});
  }
  e.expected.recovery = true;
  const recovery = evaluatePromotionAuthorization(e.expected, e.snapshot);
  assert.equal(recovery.passed, false);
  assert.equal(recovery.checks.recoveryTerminalStatus, false);
  assert.equal(recovery.checks.recoveryTerminalConclusion, false);
  assert.deepEqual(recovery.observations.recoveryTerminalStatus, {expected: "completed", observed: "in_progress"});
});

function marketingJobCondition(name, {event = "push", cancelled = false,
  lookup = "success", validated = "true", validation = "skipped", recovery = "",
  captureBinding = "", captures = "success", packaged = "success", ref = "refs/heads/main", ancestorsSucceeded = true,
  source = caller("marketing")} = {}) {
  const job = source.split(`\n  ${name}:\n`)[1]?.split(/\n  [a-z-]+:\n/u)[0];
  assert.ok(job, `Missing ${name} job`);
  const expression = job.match(/\n    if: (?:>-\n)?([\s\S]*?)\n    uses:/u)?.[1].trim();
  assert.ok(expression?.startsWith("${{"), "Expected explicit cancellation-aware condition");
  const body = expression.slice(3, -2).replaceAll("needs.ci-validation", 'needs["ci-validation"]');
  // Actions injects success() unless an explicit status function is present.
  // A deliberately skipped validation ancestor makes that default false even
  // when the immediate packaging dependency succeeded.
  if (!/\b(?:always|cancelled|failure|success)\s*\(/u.test(body) && !ancestorsSucceeded) return false;
  return Function("github", "needs", "inputs", "cancelled", `return (${body});`)(
    {event_name: event, ref},
    {"ci-validation": {result: lookup, outputs: {validated, capture_binding: captureBinding}}, validate: {result: validation},
      captures: {result: captures}, package: {result: packaged}},
    {recovery_artifact_id: recovery}, () => cancelled);
}

test("Marketing packaging requires exact-source validation reuse or a successful standalone fallback", () => {
  assert.equal(marketingJobCondition("package"), true);
  assert.equal(marketingJobCondition("package", {validated: "false", validation: "success"}), true);
  for (const lookup of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(marketingJobCondition("package", {lookup}), false);
    assert.equal(marketingJobCondition("validate", {lookup, validated: "false"}), false);
  }
  for (const validated of ["", "false", "malformed"]) {
    assert.equal(marketingJobCondition("package", {validated}), false);
  }
  for (const validation of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(marketingJobCondition("package", {validated: "false", validation}), false);
  }
  assert.equal(marketingJobCondition("package", {cancelled: true}), false);
  assert.equal(marketingJobCondition("validate", {validated: "false", cancelled: true}), false);
  assert.equal(marketingJobCondition("validate"), false, "successful CI must omit duplicate validation");
  assert.equal(marketingJobCondition("validate", {validated: "false"}), true);
  assert.equal(marketingJobCondition("validate", {event: "workflow_dispatch", lookup: "skipped"}), true);
  assert.equal(marketingJobCondition("validate", {event: "workflow_dispatch", lookup: "skipped", recovery: "123"}), false);
  assert.equal(marketingJobCondition("package", {event: "workflow_dispatch"}), false);
});

test("Marketing reuse callers retain equivalent source, toolchain, baseline and capture obligations", () => {
  const ci = workflow("ci.yml");
  const job = ci.split("\n  marketing:\n")[1].split("\n  capture-freshness:")[0];
  assert.match(job, /uses: \.\/\.github\/workflows\/react-surface-validation\.yml/u);
  assert.match(job, /surface: marketing\n/u);
  assert.match(job, /capture_binding: \$\{\{ needs.capture-freshness.outputs.capture_binding \}\}/u);
  assert.doesNotMatch(job, /update_visual_baselines:|skip_deployable_build:|ref:|environment:/u);
  const reusable = workflow("react-surface-validation.yml");
  for (const input of ["update_visual_baselines", "skip_deployable_build"]) {
    const contract = reusable.split(`      ${input}:\n`)[1].split(/\n      [a-z_]+:/u)[0];
    assert.match(contract, /default: false/u);
  }
  const lookup = caller("marketing").split("\n  ci-validation:\n")[1].split("\n  validate:")[0];
  assert.match(lookup, /actions: read/u);
  assert.doesNotMatch(lookup, /id-token:|secrets: inherit|ref:|environment:/u);
  assert.match(lookup, /node tool\/ci\/wait_main_marketing_validation\.mjs > marketing-validation\.json/u);
  assert.match(lookup, /retention-days: 7/u);
  assert.match(caller("marketing"), /needs: \[ci-validation, captures, validate\]/u);
});

test("Marketing promotion survives intentionally skipped duplicate validation and fails closed on unsuccessful packaging", () => {
  const reused = {ancestorsSucceeded: false, validation: "skipped"};
  assert.equal(marketingJobCondition("promote", reused), true,
    "successful exact-source packaging must reach promotion after validation reuse");
  assert.equal(marketingJobCondition("promote", {validation: "success"}), true);
  for (const packaged of ["failure", "cancelled", "skipped", "", null]) {
    assert.equal(marketingJobCondition("promote", {...reused, packaged}), false);
  }
  assert.equal(marketingJobCondition("promote", {...reused, cancelled: true}), false);
  assert.equal(marketingJobCondition("promote", {...reused, event: "workflow_dispatch"}), false);
  assert.equal(marketingJobCondition("promote", {...reused, ref: "refs/heads/feature"}), false);
  const old = caller("marketing").replace(
    /(!cancelled\(\) && )(github.event_name == 'push' && github.ref == 'refs\/heads\/main' && needs.package.result == 'success')/u,
    "$2");
  assert.notEqual(old, caller("marketing"), "known-bad control must remove the explicit status guard");
  assert.equal(marketingJobCondition("promote", {...reused, source: old}), false,
    "the old implicit success guard is a known-bad skipped-ancestor control");
});

test("standalone Marketing requires captures and recovery never renders", () => {
  for (const captures of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(marketingJobCondition("validate", {validated: "false", captures}), false);
  }
  assert.equal(marketingJobCondition("captures", {validated: "true"}), false);
  assert.equal(marketingJobCondition("captures", {validated: "false"}), true);
  assert.equal(marketingJobCondition("captures", {event: "workflow_dispatch", lookup: "skipped"}), true);
  assert.equal(marketingJobCondition("captures", {event: "workflow_dispatch", lookup: "skipped", recovery: "123"}), false);
});

test("standalone React reuses an existing native-only CI bundle without another producer", () => {
  const reuse = {validated: "false", captures: "skipped", captureBinding: "immutable bundle"};
  assert.equal(marketingJobCondition("captures", reuse), false);
  assert.equal(marketingJobCondition("validate", reuse), true);
  assert.equal(marketingJobCondition("validate", {...reuse, captures: "failure"}), false);
});

test("native capture inputs retain the Marketing main publication trigger", () => {
  const trigger = caller("marketing").split("  push:\n")[1].split("  workflow_dispatch:\n")[0];
  const patterns = [...trigger.matchAll(/^      - "([^"\n]+)"$/gmu)].map(match => match[1]);
  for (const file of ["lib/hosts/programs/screen.dart", "apps/host/lib/main.dart", "test/ui_captures/fixture.dart",
    "packages/catch_ui/lib/button.dart", "packages/catch_ui/assets/fonts/Archivo-Regular.ttf",
    "pubspec.lock", "packages/catch_ui/pubspec.yaml", "tool/lib/repo_paths.mjs", "tool/ui_capture/run_captures.mjs"]) {
    assert.ok(patterns.some(pattern => matchesGlob(file, pattern)), `${file} must publish refreshed website media`);
  }
  const recovery = caller("marketing").split("  recover:\n")[1];
  assert.doesNotMatch(recovery, /capture_binding|marketing-captures|react-surface-validation/u);
});
