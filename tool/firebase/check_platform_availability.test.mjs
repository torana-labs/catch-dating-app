import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BILLING_PATTERN,
  checkPlatformAvailability,
  classifyCallableResponse,
  classifyGcloudResult,
  decide,
  parseArgs,
  report,
} from "./check_platform_availability.mjs";

const html500 = "<html><head><title>500 Server Error</title></head><body><h1>Error: Server Error</h1>" +
  "<h2>The server encountered an error and could not complete your request.</h2></body></html>";
const billingStderr = 'ERROR: (gcloud.run.services.list) {"code": 403, "message": "This API method requires billing ' +
  "to be enabled. Please enable billing on project #catch-dating-app-64e51 by visiting " +
  'https://console.developers.google.com/billing/enable?project=catch-dating-app-64e51 then retry.", ' +
  '"status": "PERMISSION_DENIED"}';

const response = ({status, contentType, body}) => ({
  status,
  headers: {get: (name) => (name.toLowerCase() === "content-type" ? contentType : null)},
  text: async () => body,
});

test("a callable that answers JSON is serving, whatever the status", () => {
  for (const status of [200, 400, 401, 403, 500]) {
    const classification = classifyCallableResponse({
      status, contentType: "application/json; charset=utf-8", body: '{"error":{"status":"UNAUTHENTICATED"}}',
    });
    assert.equal(classification.available, true, `HTTP ${status}`);
  }
});

test("Google's HTML 500 page means the platform is not serving", () => {
  const classification = classifyCallableResponse({status: 500, contentType: "text/html; charset=utf-8", body: html500});
  assert.deepEqual(classification, {
    available: false, reason: "platform-5xx", detail: "HTTP 500 without a callable JSON body",
  });
});

test("a billing refusal in a non-JSON body is read as billing, and other non-JSON answers are uncertain", () => {
  assert.equal(classifyCallableResponse({status: 403, contentType: "text/plain",
    body: "This API method requires billing to be enabled."}).reason, "billing");
  assert.equal(classifyCallableResponse({status: 404, contentType: "text/html", body: "Not Found"}).available, null);
  assert.equal(classifyCallableResponse({status: 302, contentType: "", body: ""}).available, null);
});

test("gcloud's billing refusal is the one signal read from its output", () => {
  assert.equal(classifyGcloudResult({status: 0, stdout: "[]"}).available, true);
  const billing = classifyGcloudResult({status: 1, stderr: billingStderr});
  assert.equal(billing.available, false);
  assert.equal(billing.reason, "billing");
  assert.match(billing.detail, /requires billing to be enabled/u);
  assert.equal(classifyGcloudResult({status: 1, stderr: "ERROR: (gcloud.run.services.list) PERMISSION_DENIED: caller lacks run.services.list"}).available, null);
  for (const text of ["Billing account is closed", "billing has been disabled for this project", "BILLING_DISABLED"]) {
    assert.ok(BILLING_PATTERN.test(text), text);
  }
});

test("any unavailable signal defers; uncertainty and availability do not", () => {
  assert.equal(decide([{available: true, reason: "a"}, {available: null, reason: "b"}]).available, true);
  const down = decide([{available: true, reason: "a"}, {available: false, reason: "billing", detail: "closed"}]);
  assert.deepEqual(down, {available: false, reason: "billing", detail: "closed"});
  assert.equal(decide([]).available, true);
});

test("the check probes the callable and, when asked, gcloud, with injected transports", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({url, method: init.method});
    return response({status: 500, contentType: "text/html", body: html500});
  };
  const run = (command, args) => {
    calls.push({command, args});
    return {status: 1, stderr: billingStderr, stdout: ""};
  };
  const decision = await checkPlatformAvailability({
    projectId: "catch-dating-app-64e51", callable: "adminListEventDirectory", gcloudProbe: true, fetchImpl, run,
  });
  assert.equal(decision.available, false);
  assert.equal(decision.reason, "platform-5xx", "the first unavailable signal names the reason");
  assert.equal(calls[0].url, "https://asia-south1-catch-dating-app-64e51.cloudfunctions.net/adminListEventDirectory");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[1].args.slice(0, 5), ["run", "services", "list", "--project", "catch-dating-app-64e51"]);

  const serving = await checkPlatformAvailability({
    projectId: "catchdates-dev", callable: "adminListEventDirectory",
    fetchImpl: async () => response({status: 401, contentType: "application/json", body: '{"error":{"status":"UNAUTHENTICATED"}}'}),
  });
  assert.equal(serving.available, true);

  const offline = await checkPlatformAvailability({
    projectId: "catchdates-dev", callable: "adminListEventDirectory",
    fetchImpl: async () => { throw new Error("getaddrinfo ENOTFOUND"); },
  });
  assert.equal(offline.available, true, "a network failure of the probe itself never defers a deploy");
});

test("the report writes the outputs, the warning, the summary and the marker when deferred, and only the outputs otherwise", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-platform-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const outputPath = path.join(directory, "output");
  const summaryPath = path.join(directory, "summary.md");
  const markerPath = path.join(directory, "build", "next-preview", "deferred.json");
  const logged = [];
  report({
    decision: {available: false, reason: "billing", detail: "requires billing to be enabled"},
    projectId: "catch-dating-app-64e51", outputPath, summaryPath, markerPath,
    log: (line) => logged.push(line), now: () => new Date("2026-11-04T00:00:00Z"),
  });
  assert.equal(fs.readFileSync(outputPath, "utf8"), "available=false\nreason=billing\n");
  assert.match(fs.readFileSync(summaryPath, "utf8"), /^## Deploy deferred: catch-dating-app-64e51 is not serving/u);
  assert.match(logged[0], /^::warning title=Deploy deferred: catch-dating-app-64e51 is not serving::Deferred: .*billing/u);
  assert.deepEqual(JSON.parse(fs.readFileSync(markerPath, "utf8")), {
    deferred: true, projectId: "catch-dating-app-64e51", reason: "billing",
    detail: "requires billing to be enabled", checkedAt: "2026-11-04T00:00:00.000Z",
  });

  fs.rmSync(outputPath);
  const servingLines = report({decision: {available: true, reason: "callable answered HTTP 401 as JSON"},
    projectId: "catchdates-dev", outputPath, log: () => {}});
  assert.equal(fs.readFileSync(outputPath, "utf8"), "available=true\nreason=callable answered HTTP 401 as JSON\n");
  assert.equal(servingLines.length, 1);
  assert.doesNotMatch(servingLines[0], /::warning/u);
});

test("the command line names a callable and an environment or project", () => {
  assert.deepEqual(parseArgs(["--env", "prod", "--callable", "adminListEventDirectory", "--gcloud-probe"]),
    {env: "prod", callable: "adminListEventDirectory", region: "asia-south1", gcloudProbe: true});
  assert.equal(parseArgs(["--project", "x", "--callable", "y", "--deferred-marker", "build/m.json"]).markerPath, "build/m.json");
  assert.throws(() => parseArgs(["--env", "prod"]), /--callable/u);
  assert.throws(() => parseArgs(["--callable", "y"]), /--env <alias> or --project <id>/u);
  assert.throws(() => parseArgs(["--callable", "y", "--project", "x", "--bogus"]), /Unknown option/u);
});
