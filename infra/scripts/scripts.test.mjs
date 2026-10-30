// Offline tests for the infra glue scripts and the owner bootstrap. Shell
// shims stand in for curl, keytool, apksigner, gcloud and gh, so nothing here
// reaches Google or GitHub. Run with: node --test infra/scripts/
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const infra = path.resolve(here, "..");

function sandbox(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-infra-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, "bin"));
  return root;
}

function shim(root, name, body) {
  const file = path.join(root, "bin", name);
  fs.writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`, {mode: 0o755});
}

function run(script, args, {root, env = {}, input} = {}) {
  return spawnSync("bash", [path.join(infra, script), ...args], {
    cwd: root, encoding: "utf8", input, timeout: 20000,
    env: {...process.env, PATH: `${path.join(root, "bin")}:${process.env.PATH}`, ...env},
  });
}

const sha1 = (c) => c.repeat(40).slice(0, 40);
const sha256 = (c) => c.repeat(64).slice(0, 64);

// --- plan_guard.sh ---------------------------------------------------------

function planWith(changes) {
  return {resource_changes: changes};
}
const androidUpdate = {
  address: 'google_firebase_android_app.app["prod-host"]', mode: "managed",
  type: "google_firebase_android_app",
  change: {actions: ["update"], importing: {id: "x"},
    before: {display_name: "Catch Host Prod Android", sha1_hashes: [sha1("a")], sha256_hashes: [sha256("b")]},
    after: {display_name: "Catch Host Prod Android", sha1_hashes: [sha1("a"), sha1("c")], sha256_hashes: [sha256("b"), sha256("d")]}},
};

function guard(t, plan) {
  const root = sandbox(t);
  fs.writeFileSync(path.join(root, "plan.json"), JSON.stringify(plan));
  return run("scripts/plan_guard.sh", ["plan.json"], {root});
}

test("plan guard passes an imported app that only gains fingerprints", (t) => {
  const result = guard(t, planWith([androidUpdate, {
    address: 'google_firebase_app_check_play_integrity_config.app["prod-host"]', mode: "managed",
    type: "google_firebase_app_check_play_integrity_config",
    change: {actions: ["no-op"], importing: {id: "y"}, before: {}, after: {}},
  }]));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\+ SHA-1 `c{40}`/u);
  assert.match(result.stdout, /\+ SHA-256 `d{64}`/u);
  assert.match(result.stdout, /\| import \|/u);
  assert.match(result.stdout, /Plan guard: passed/u);
});

test("plan guard reports a clean plan", (t) => {
  const result = guard(t, {});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No changes/u);
});

for (const [label, change] of [
  ["replace", {...androidUpdate, change: {...androidUpdate.change, actions: ["delete", "create"]}}],
  ["delete", {...androidUpdate, change: {...androidUpdate.change, actions: ["delete"]}}],
  ["create", {...androidUpdate, change: {...androidUpdate.change, actions: ["create"], importing: undefined}}],
  ["an unlisted type", {...androidUpdate, type: "google_firebase_app_check_service_config",
    address: 'google_firebase_app_check_service_config.firestore'}],
]) {
  test(`plan guard refuses ${label}`, (t) => {
    const result = guard(t, planWith([change]));
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, /Plan guard: \*\*refused\*\*/u);
  });
}

// --- firebase_android_inventory.sh -----------------------------------------

function firebaseFixtures(root, files) {
  const dir = path.join(root, "fx");
  fs.mkdirSync(dir);
  for (const [url, body] of Object.entries(files)) {
    const key = url.replace(/^https:\/\/firebase\.googleapis\.com\/v1beta1\//u, "").replace(/[/:?=]/gu, "_");
    fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(body));
  }
  shim(root, "curl", 'url="${@: -1}"\nkey="$(printf \'%s\' "$url" | sed \'s#https://firebase.googleapis.com/v1beta1/##; s#[/:?=]#_#g\')"\ncat "$FIXTURES/$key.json"');
  return dir;
}

const base = "https://firebase.googleapis.com/v1beta1/projects/catch-dating-app-64e51/androidApps";
const consumer = "1:574779808785:android:81edbfa0d4aba7c48ea5b0";
const host = "1:574779808785:android:0093178ee6681c828ea5b0";

function inventory(t, {apps, play}) {
  const root = sandbox(t);
  const files = {[`${base}?pageSize=100`]: {apps: apps.map(({appId, state}) => ({appId, state}))}};
  for (const app of apps) files[`${base}/${app.appId}`] = app;
  const fixtures = firebaseFixtures(root, files);
  fs.writeFileSync(path.join(root, "play.jsonl"), play.map((entry) => JSON.stringify(entry)).join("\n"));
  return run("scripts/firebase_android_inventory.sh", ["--play", "play.jsonl", "prod=catch-dating-app-64e51"],
    {root, env: {FIXTURES: fixtures, FIREBASE_ACCESS_TOKEN: "test"}});
}

test("inventory keeps live order, appends only new Play fingerprints and skips removed apps", (t) => {
  const result = inventory(t, {
    apps: [
      {appId: host, packageName: "com.catchdates.host", displayName: "Catch Host Prod Android",
        sha1Hashes: [sha1("b"), sha1("a")], sha256Hashes: [sha256("b")]},
      {appId: consumer, packageName: "com.catchdates.app", displayName: "Catch Prod Android",
        sha1Hashes: [sha1("a")], sha256Hashes: [sha256("a")], state: "ACTIVE"},
      {appId: "1:574779808785:android:old", packageName: "com.example.catch", displayName: "Old", state: "DELETED"},
    ],
    play: [
      {package: "com.catchdates.app", sha1: sha1("c"), sha256: sha256("c")},
      // Already registered, in another case: must not be added twice.
      {package: "com.catchdates.host", sha1: sha1("A"), sha256: sha256("d")},
    ],
  });
  assert.equal(result.status, 0, result.stderr);
  const out = result.stdout;
  assert.ok(out.indexOf('"prod-consumer"') < out.indexOf('"prod-host"'), "stable key order");
  assert.ok(!out.includes("com.example.catch"), "deleted apps are not managed");
  const hostBlock = out.slice(out.indexOf('"prod-host"'));
  assert.ok(hostBlock.indexOf(sha1("b")) < hostBlock.indexOf(sha1("a")), "live order kept");
  assert.ok(!hostBlock.includes(sha1("A")), "case-insensitive duplicate not appended");
  assert.ok(hostBlock.indexOf(sha256("b")) < hostBlock.indexOf(sha256("d")), "Play SHA-256 appended last");
  const consumerBlock = out.slice(out.indexOf('"prod-consumer"'), out.indexOf('"prod-host"'));
  assert.ok(consumerBlock.includes(sha1("c")) && consumerBlock.includes(sha256("c")));
  assert.match(out, /allow_fingerprint_removal = false/u);
});

test("inventory refuses two active apps for one environment and role", (t) => {
  const result = inventory(t, {
    apps: [
      {appId: consumer, packageName: "com.catchdates.app", displayName: "A", sha1Hashes: [], sha256Hashes: []},
      {appId: "1:574779808785:android:dupe", packageName: "com.catchdates.app.beta", displayName: "B",
        sha1Hashes: [], sha256Hashes: []},
    ],
    play: [],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /same <environment>-<role> key/u);
});

// --- play_signing_fingerprints.sh ------------------------------------------

function play(t, {reported, keytool, apksigner}) {
  const root = sandbox(t);
  fs.writeFileSync(path.join(root, "generated.json"), JSON.stringify({generatedApks: [
    {certificateSha256Hash: reported, generatedUniversalApk: {downloadId: "dl/1"}},
  ]}));
  // Writes the list response for the list URL and a dummy APK for downloads.
  shim(root, "curl", [
    'out=""; url="${@: -1}"',
    'while [[ $# -gt 0 ]]; do if [[ "$1" == --output ]]; then out="$2"; shift; fi; shift; done',
    'case "$url" in *":download?alt=media") echo apk > "$out";; *) cp "$PWD/generated.json" "$out";; esac',
  ].join("\n"));
  shim(root, "keytool", keytool);
  shim(root, "apksigner", apksigner ?? "exit 1");
  return run("scripts/play_signing_fingerprints.sh", ["com.catchdates.app", "100001"],
    {root, env: {PLAY_ACCESS_TOKEN: "test"}});
}

const colons = (hex) => hex.toUpperCase().match(/../gu).join(":");
const v1Cert = `echo "Signer #1:"; echo "	 SHA1: ${colons(sha1("ab"))}"; echo "	 SHA256: ${colons(sha256("cd"))}"`;

test("play fingerprints come from keytool and match Play's reported hash", (t) => {
  const result = play(t, {reported: sha256("cd").toUpperCase(), keytool: v1Cert});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {package: "com.catchdates.app", versionCode: "100001",
    sha1: sha1("ab"), sha256: sha256("cd"), reader: "keytool"});
});

test("play fingerprints accept a base64 certificateSha256Hash", (t) => {
  const reported = Buffer.from(sha256("cd"), "hex").toString("base64");
  const result = play(t, {reported, keytool: v1Cert});
  assert.equal(result.status, 0, result.stderr);
});

test("play fingerprints fall back to apksigner for v2/v3-only APKs", (t) => {
  const result = play(t, {reported: sha256("ef"), keytool: 'echo "Not a signed jar file"',
    apksigner: `echo "Signer #1 certificate SHA-256 digest: ${sha256("ef")}"; echo "Signer #1 certificate SHA-1 digest: ${sha1("12")}"`});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).reader, "apksigner");
});

test("play fingerprints fail when the APK certificate does not match Play", (t) => {
  const result = play(t, {reported: sha256("99"), keytool: v1Cert});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not match Play's certificateSha256Hash/u);
});

// --- bootstrap.sh ------------------------------------------------------------

function bootstrap(t, {gh = true, protectedEnvironment = true} = {}) {
  const root = sandbox(t);
  const log = path.join(root, "calls.log");
  shim(root, "gcloud", [
    `echo "gcloud $*" >> "${log}"`,
    'case "$*" in',
    '  "config get-value account") echo owner@example.com;;',
    '  *" describe "*) exit 1;;',
    "esac",
  ].join("\n"));
  if (gh) {
    shim(root, "gh", [
      `echo "gh $*" >> "${log}"`,
      '[[ "$*" == *"--input -"* ]] && cat > /dev/null',
      'case "$*" in',
      '  "auth status") exit 0;;',
      '  "api user --jq .login") echo owner;;',
      '  "api users/owner --jq .id") echo 42;;',
      '  "api repos/torana-labs/catch-dating-app/environments/platform-plan") exit 1;;',
      '  *"deployment-branch-policies --jq [.branch_policies"*) echo branch:main;;',
      '  *"environments/prod-platform --jq"*) echo "$PROTECTED";;',
      "esac",
    ].join("\n"));
  } else {
    // Hide any real gh on the machine running the tests.
    shim(root, "gh", "exit 127");
  }
  const result = run("bootstrap/bootstrap.sh", [], {root,
    env: {PROTECTED: String(protectedEnvironment)}});
  return {result, calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : ""};
}

const applyTrust = /add-iam-policy-binding github-actions-platform-apply@\S+ .*workloadIdentityUser.*1170579691:prod-platform/u;

test("bootstrap trusts the apply identity only after prod-platform is verified", (t) => {
  const {result, calls} = bootstrap(t);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(calls, applyTrust);
  assert.match(calls, /add-iam-policy-binding github-actions-platform-plan@\S+ .*1170579691:platform-plan/u);
  assert.ok(calls.indexOf("environments/prod-platform --jq") < calls.search(applyTrust),
    "verification precedes the apply binding");
  assert.match(calls, /buckets create gs:\/\/catch-dating-app-64e51-terraform-state .*--uniform-bucket-level-access --public-access-prevention/u);
  assert.match(calls, /buckets update gs:\/\/catch-dating-app-64e51-terraform-state --versioning/u);
  assert.match(calls, /storage.objectViewer/u);
  assert.match(calls, /storage.objectUser/u);
  for (const project of ["catch-dating-app-64e51", "catchdates-staging", "catchdates-dev"]) {
    assert.match(calls, new RegExp(`roles create catchPlatformApplier --project=${project}`, "u"));
  }
  assert.match(calls, /providers create-oidc github-platform .*assertion.environment == 'prod-platform' && assertion.ref == 'refs\/heads\/main'/u);
});

test("bootstrap grants no create, delete or enforcement permission and makes no keys", (t) => {
  const {calls} = bootstrap(t);
  assert.doesNotMatch(calls, /firebase\.clients\.(create|delete)|firebaseappcheck\.services\.update/u);
  assert.doesNotMatch(calls, /keys create|remove-iam-policy-binding| delete /u);
  assert.doesNotMatch(calls, /roles\/(editor|owner|firebase\.(admin|viewer))/u);
});

test("bootstrap refuses to trust an unprotected prod-platform", (t) => {
  const {result, calls} = bootstrap(t, {protectedEnvironment: false});
  assert.equal(result.status, 1);
  assert.doesNotMatch(calls, applyTrust);
});

test("bootstrap without gh prints the GitHub steps and does not trust prod-platform", (t) => {
  const {result, calls} = bootstrap(t, {gh: false});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /gh variable set GCP_SERVICE_ACCOUNT_EMAIL --repo torana-labs\/catch-dating-app --env prod-platform/u);
  assert.doesNotMatch(calls, applyTrust);
});
