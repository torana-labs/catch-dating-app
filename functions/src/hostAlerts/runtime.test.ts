import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import path from "node:path";
import test from "node:test";
import {promisify} from "node:util";

const run = promisify(execFile);
const cwd = path.resolve(__dirname, "../..");

test("Host alert manifest separates intake and mailer identities", async () => {
  for (const project of ["catchdates-dev", "catch-dating-app-64e51"]) {
    const {stdout} = await run(process.execPath, ["-e", `
      const r = require("./lib/hostAlerts/runtime");
      const intake = r.onHostApplicationAccepted;
      const mailer = r.dispatchHostApplicationAlerts;
      process.stdout.write(JSON.stringify({
        intake: intake.__endpoint.serviceAccountEmail,
        mailer: mailer.__endpoint.serviceAccountEmail,
        intakeEndpoint: intake.__endpoint,
        mailerEndpoint: mailer.__endpoint,
      }));
    `], {cwd, env: {...process.env, GCLOUD_PROJECT: project}, timeout: 10000});
    const result = JSON.parse(stdout);
    assert.equal(result.intake,
      "catch-host-alert-intake@");
    assert.equal(result.mailer,
      "catch-host-alert-mailer@");
    assert.deepEqual(result.intakeEndpoint.secretEnvironmentVariables ?? [],
      []);
    assert.deepEqual(result.mailerEndpoint.secretEnvironmentVariables,
      [{key: "CATCH_HOST_OPERATOR_ALERTS_RESEND_KEY"}]);
    assert.deepEqual(result.intakeEndpoint.eventTrigger.eventFilterPathPatterns,
      {document: "salesInboundIntents/{intentId}"});
    assert.deepEqual(result.intakeEndpoint.region, ["asia-south1"]);
    assert.deepEqual(result.mailerEndpoint.region, ["asia-south1"]);
    assert.equal(result.mailerEndpoint.maxInstances, 1);
    assert.equal(result.mailerEndpoint.timeoutSeconds, 300);
    assert.equal(result.mailerEndpoint.scheduleTrigger.retryConfig.retryCount,
      0);
  }
});

test("disabled or missing-cutoff handlers never initialize provider or DB",
  async () => {
    for (const [enabled, since] of [["false", "2026-10-21T00:00:00Z"],
      ["true", ""], ["true", "not-a-date"]]) {
      await run(process.execPath, ["-e", `
        const r = require("./lib/hostAlerts/runtime");
        // No Admin app or provider credential: crossing either boundary fails.
        Promise.all([
          r.onHostApplicationAccepted.run({params: {intentId: "test"}}),
          r.dispatchHostApplicationAlerts.run({}),
        ]).catch(() => { process.exitCode = 1; });
      `], {cwd, env: {...process.env,
        CATCH_HOST_OPERATOR_ALERTS_ENABLED: enabled,
        CATCH_HOST_OPERATOR_ALERTS_SINCE: since,
        CATCH_HOST_OPERATOR_ALERTS_RESEND_KEY: ""}, timeout: 10000});
    }
  });
