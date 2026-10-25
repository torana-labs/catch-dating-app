/* eslint-disable max-len */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {schemaErrorMessages, validateAdminListSupplyIntakePoliciesCallableResponse} from "../shared/generated/schemaValidators";
import {adminListSupplyIntakePoliciesHandler} from "./supplyIntakePolicies";

// The build post-step copies the Operations runtime (and its policy files) into lib.
execFileSync(process.execPath, [path.join(__dirname, "../../scripts/copy-operations-runtime.cjs")]);

const call = (db: FakeFirestore, token: Record<string, unknown> = {admin: true}) =>
  adminListSupplyIntakePoliciesHandler({auth: {uid: "owner-1", token}, data: {}, rawRequest: {headers: {}}} as
    unknown as CallableRequest<unknown>, {firestore: () => db as unknown as FirebaseFirestore.Firestore});

test("lists each Supply Intake capability with its decision and whether its policy file switches it on", async () => {
  const db = new FakeFirestore();
  db.write("organizerPolicyGapReviewDecisions/policy-on-demand-page-fetch-policy", {schemaVersion: 1,
    decisionId: "policy-on-demand-page-fetch-policy", gapId: "on_demand_page_fetch_policy", decision: "accept",
    decisionStatus: "accepted", note: "Fetch the pages a nomination names, within the caps.",
    reviewedAt: {_seconds: 1792483200, _nanoseconds: 0}});
  const response = await call(db);
  assert.equal(validateAdminListSupplyIntakePoliciesCallableResponse(response), true,
    schemaErrorMessages(validateAdminListSupplyIntakePoliciesCallableResponse as never).join("; "));
  assert.deepEqual(response.policies.map((policy) => policy.gapId), ["on_demand_page_fetch_policy",
    "recurring_event_crawl_policy", "agent_research_policy", "llm_extraction_fallback_policy"]);
  const [pages, crawl] = response.policies;
  assert.deepEqual([pages.decision?.decisionStatus, pages.enabled, pages.configCitesDecision, pages.decisionId],
    ["accepted", false, false, "policy-on-demand-page-fetch-policy"], "accepted, but the policy file does not cite it yet");
  assert.equal(pages.decision?.reviewedAt, "2026-10-20T08:00:00.000Z");
  assert.ok(pages.limits.some((limit) => limit.label === "Pages per month"));
  assert.equal(crawl.decision, null);
});

test("only intake reviewers can read the policies", async () => {
  for (const token of [{salesStaff: true}, {}]) {
    await assert.rejects(call(new FakeFirestore(), token), /permission|role|admin/i);
  }
});
