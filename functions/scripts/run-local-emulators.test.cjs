const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {spawnSync} = require("node:child_process");
const {prepareLocalEmulators, emulatorEnvironment} = require("./run-local-emulators.cjs");

test("local suite copies only built code and supplies isolated config and placeholder secrets", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-emulator-fixture-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const source = path.join(root, "repo");
  const write = (file, value) => {
    const target = path.join(source, file); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, value);
  };
  write("functions/lib/index.js", "exports.example = true;");
  write("functions/node_modules/.fixture", "");
  write("functions/package.json", '{"main":"lib/index.js"}');
  write("functions/.secret.local", "STRIPE_SECRET_KEY=live-value-must-not-be-copied");
  write("functions/.env.prod", "REAL_KEY=must-not-be-copied");
  write("tool/firebase/environment_readiness.json", JSON.stringify({requirements: [
    {kind: "secret-version", name: "STRIPE_SECRET_KEY"}, {kind: "secret-version", name: "ORGANIZER_WHATSAPP_ACCESS_TOKENS"},
  ]}));
  write("firebase.json", JSON.stringify({functions: {source: "functions", predeploy: ["forbidden"]},
    firestore: {rules: "firestore.rules", indexes: "firestore.indexes.json"}, storage: {rules: "storage.rules"},
    extensions: {unrelated: "must-not-be-started"}, hosting: {}, remoteconfig: {}}));
  const directory = path.join(root, "isolated");
  const {configPath, secrets} = prepareLocalEmulators(source, directory);
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.deepEqual(Object.keys(config).sort(), ["emulators", "firestore", "functions", "storage"]);
  assert.deepEqual(config.functions, {source: "functions"});
  assert.equal(config.emulators.firestore.host, "127.0.0.1");
  assert.equal(config.firestore.rules, path.join(source, "firestore.rules"));
  assert.equal(fs.existsSync(path.join(directory, "functions/.env.prod")), false);
  assert.doesNotMatch(fs.readFileSync(path.join(directory, "functions/.secret.local"), "utf8"), /live-value/);
  const env = emulatorEnvironment({GOOGLE_APPLICATION_CREDENTIALS: "/real/credentials.json", STRIPE_SECRET_KEY: "real",
    ALGOLIA_APPLICATION_ID: "REALAPP123", RAZORPAY_PUBLIC_KEY_ID: "rzp_live_real"}, directory, secrets);
  assert.equal(env.GCLOUD_PROJECT, "demo-catch");
  assert.equal(env.GOOGLE_CLOUD_QUOTA_PROJECT, "demo-catch");
  assert.equal(fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS), false);
  assert.equal(env.STRIPE_SECRET_KEY, "local-emulator-placeholder-never-a-live-secret");
  assert.equal(env.ORGANIZER_WHATSAPP_ACCESS_TOKENS, "{}");
  assert.equal(env.ALGOLIA_APPLICATION_ID, "LOCALDEMO0");
  assert.equal(env.RAZORPAY_PUBLIC_KEY_ID, "rzp_test_localplaceholder");
  const params = fs.readFileSync(path.join(directory, "functions/.env.demo-catch"), "utf8");
  assert.match(params, /ALGOLIA_APPLICATION_ID="LOCALDEMO0"/);
  assert.match(params, /RAZORPAY_PUBLIC_KEY_ID="rzp_test_localplaceholder"/);
  assert.doesNotMatch(params, /REALAPP123|rzp_live_real|KEY_SECRET/);
});

test("Flutter local runs preserve native configs and cannot override the isolated project", (t) => {
  const repoRoot = path.resolve(__dirname, "../..");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-local-flutter-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const capture = path.join(directory, "args.json");
  const flutter = path.join(directory, "flutter");
  fs.writeFileSync(flutter, '#!/usr/bin/env node\nrequire("node:fs").writeFileSync(process.env.CATCH_TEST_CAPTURE, JSON.stringify({cwd: process.cwd(), args: process.argv.slice(2)}));\n', {mode: 0o700});
  const files = ["apps/host/android/app/src/hostDev/google-services.json",
    "apps/host/web/firebase-messaging-sw.js"].map((file) => path.join(repoRoot, file));
  const before = files.map((file) => fs.readFileSync(file, "utf8"));
  const run = (args) => spawnSync("bash", [path.join(repoRoot, "tool/flutter_with_env.sh"), "local", "--role", "host", ...args], {
    cwd: repoRoot, encoding: "utf8", env: {...process.env, PATH: directory + path.delimiter + process.env.PATH,
      CATCH_TEST_CAPTURE: capture, FIREBASE_APP_CHECK_DEBUG_TOKEN: "must-not-be-passed"},
  });
  const result = run(["run", "-d", "chrome"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const actual = JSON.parse(fs.readFileSync(capture, "utf8"));
  assert.equal(actual.cwd, path.join(repoRoot, "apps/host"));
  assert.ok(actual.args.includes("--dart-define-from-file=" + path.join(repoRoot, "tool/env/dart_defines/local.json")));
  assert.equal(actual.args.some((arg) => arg.includes("must-not-be-passed")), false);
  assert.deepEqual(files.map((file) => fs.readFileSync(file, "utf8")), before);
  assert.equal(run(["--platform", "ios", "run", "-d", "iPhone"]).status, 64);
  assert.equal(run(["run", "-d", "chrome", "--dart-define=USE_FIREBASE_EMULATORS=false"]).status, 64);
  assert.equal(run(["build", "web", "--dart-define-from-file=/tmp/live.json"]).status, 64);
});
