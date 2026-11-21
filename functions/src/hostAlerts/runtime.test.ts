import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import path from "node:path";
import test from "node:test";
import {promisify} from "node:util";

const run = promisify(execFile);
const cwd = path.resolve(__dirname, "../..");

test("operator alert Functions: triggers, one instance, no bound secrets",
  async () => {
    const {stdout} = await run(process.execPath, ["-e", `
      const r = require("./lib/hostAlerts/runtime");
      process.stdout.write(JSON.stringify({
        support: r.alertOperatorOnSupportMessage.__endpoint,
        lead: r.alertOperatorOnSalesLead.__endpoint,
        summary: r.summariseOperatorAlertOverflow.__endpoint,
      }));
    `], {cwd, env: {...process.env, GCLOUD_PROJECT: "catchdates-dev"},
      timeout: 10000});
    const {support, lead, summary} = JSON.parse(stdout);
    assert.deepEqual(support.eventTrigger.eventFilterPathPatterns, {document:
      "supportConversations/{conversationId}/messages/{messageId}"});
    assert.deepEqual(lead.eventTrigger.eventFilterPathPatterns,
      {document: "salesInboundIntents/{intentId}"});
    for (const endpoint of [support, lead]) {
      assert.equal(endpoint.eventTrigger.retry, true);
      assert.equal(endpoint.maxInstances, 1);
    }
    assert.equal(summary.scheduleTrigger.schedule, "2 * * * *");
    assert.equal(summary.scheduleTrigger.retryConfig.retryCount, 0);
    // The credential comes from the pinned version the settings name.
    for (const endpoint of [support, lead, summary]) {
      assert.deepEqual(endpoint.secretEnvironmentVariables ?? [], []);
    }
  });
