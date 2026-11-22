import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";

// The actual CLI runs in a child with local SDK replacements. No installed
// Firebase SDK or projection module can be used by these entrypoint controls.
export function verifyRecomputeCli(t, cli, data, {reads = 2} = {}) {
  const run = fakeSdkCli(t, cli, data);
  const aliases = JSON.parse(fs.readFileSync(new URL("../../../.firebaserc", import.meta.url), "utf8")).projects;
  for (const {args, env, project} of [
    {args: [], env: {GCLOUD_PROJECT: "gcloud", GOOGLE_CLOUD_PROJECT: "google"}, project: "gcloud"},
    {args: [], env: {GOOGLE_CLOUD_PROJECT: "google"}, project: "google"},
    {args: [], env: {}, project: "catchdates-dev"},
    ...Object.entries(aliases).map(([alias, project]) => ({
      args: ["--env", alias], env: {GCLOUD_PROJECT: "ignored"}, project,
    })),
    {args: ["--env", "missing-alias", "--project", "explicit"], env: {GCLOUD_PROJECT: "ignored"}, project: "explicit"},
    {args: ["--project", "first", "--project", "last"], env: {}, project: "last"},
    // Preserve literal project values instead of interpreting them as flags.
    ...["-h", "-x", "-", "a=b", "  ", "项目"].map((project) => ({
      args: ["--project", project], env: {}, project,
    })),
  ]) {
    const result = run([...args, "--json"], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.report.projectId, project);
    assert.equal(result.report.reads.length, reads);
    assert.equal(result.report.writes.length, 0);
    assert.match(result.stdout, /"repairsNeeded": 1/u);
    assert.match(result.stdout, /Dry run only/u);
  }
  for (const args of [["--unknown"], ["--allow-prod"], ["--confirm-prod"], ["--env=dev"],
    ["--project=value"], ["--emulator-host=localhost:8080"], ["--"], ["-hh"], ["positional"],
    ["--apply=true"], ["--json=false"], ["--help", "--unknown"],
    ...["--project", "--env", "--emulator-host"].flatMap((flag) => [
      [flag], [flag, ""], [flag, "--apply"],
    ]), ["--env", "missing-alias"]]) {
    const result = run(args);
    assert.notEqual(result.status, 0, JSON.stringify(args));
    assert.deepEqual(result.report, {}, JSON.stringify(args));
  }

  for (const args of [["--help"], ["-h"]]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/u);
    assert.deepEqual(result.report, {});
  }
  const imported = run([], {}, true);
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, "");
  assert.deepEqual(imported.report, {});
  for (const {args, host} of [
    {args: ["--emulator-host", "first:9000", "--emulator"], host: "127.0.0.1:8080"},
    {args: ["--emulator", "--emulator-host", "last:9000"], host: "last:9000"},
    {args: [], host: "inherited:8080"},
  ]) {
    const result = run([...args, "--apply"], {FIRESTORE_EMULATOR_HOST: "inherited:8080"});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.report.emulatorHost, host);
    assert.equal(result.report.reads.length, reads);
    assert.equal(result.report.writes.length, 1);
    assert.equal(result.report.commits, 1);
    assert.match(result.stdout, /Applied/u);
  }
}

function fakeSdkCli(t, cli, data) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-recompute-cli-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const reportPath = path.join(root, "report.json");
  const adminPath = path.join(root, "admin.cjs");
  const projectionPath = path.join(root, "projection.cjs");
  const preload = path.join(root, "preload.mjs");
  fs.writeFileSync(adminPath, `
    const fs = require('node:fs');
    const data = ${JSON.stringify(data)};
    const report = {reads: [], writes: [], commits: 0};
    const save = () => fs.writeFileSync(process.env.CATCH_TEST_REPORT, JSON.stringify(report));
    exports.initializeApp = ({projectId}) => {
      report.projectId = projectId;
      report.emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
      save();
    };
    exports.firestore = () => ({
      collection: (name) => ({get: async () => {
        if (!(name in data)) throw new Error('Unexpected collection: ' + name);
        report.reads.push(name); save();
        const docs = Object.entries(data[name]).map(([id, value]) => ({id,
          ref: {path: name + '/' + id}, data: () => value}));
        return {docs, size: docs.length};
      }}),
      doc: (path) => ({path}),
      batch: () => ({
        update: (ref, patch) => report.writes.push({path: ref.path, patch}),
        commit: async () => {report.commits++; save();},
      }),
    });
  `);
  fs.writeFileSync(projectionPath, "exports.publicDisplayName = (user) => user.displayName;\n");
  fs.writeFileSync(preload, `
    import {registerHooks} from 'node:module';
    registerHooks({resolve(specifier, context, nextResolve) {
      if (specifier === 'firebase-admin') return {shortCircuit: true, url: ${JSON.stringify(pathToFileURL(adminPath).href)}};
      if (specifier === './lib/shared/profileProjection.js') return {shortCircuit: true, url: ${JSON.stringify(pathToFileURL(projectionPath).href)}};
      return nextResolve(specifier, context);
    }});
  `);
  return (args, environment = {}, importOnly = false) => {
    fs.rmSync(reportPath, {force: true});
    const env = {...process.env, GCLOUD_PROJECT: "", GOOGLE_CLOUD_PROJECT: "",
      FIRESTORE_EMULATOR_HOST: "", ...environment, CATCH_TEST_REPORT: reportPath};
    delete env.NODE_TEST_CONTEXT;
    const target = importOnly
      ? ["--input-type=module", "--eval", `await import(${JSON.stringify(cli.href)});`]
      : [fileURLToPath(cli), ...args];
    const result = spawnSync(process.execPath, ["--import", preload, ...target], {encoding: "utf8", env});
    return {...result, report: fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : {}};
  };
}
