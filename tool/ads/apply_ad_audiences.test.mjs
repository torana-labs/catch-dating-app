import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  applyAudiences,
  googleUserListOperation,
  loadAdAudiences,
  metaAudienceParams,
  planGoogleAudiences,
  planMetaAudiences,
} from "./apply_ad_audiences.mjs";

const policy = loadAdAudiences();

function withPolicy(change) {
  const copy = structuredClone(policy);
  change(copy);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ad-audiences-")), "p.json");
  fs.writeFileSync(file, JSON.stringify(copy));
  return () => loadAdAudiences(file);
}

test("the committed policy loads and never targets sensitive traits", () => {
  const text = JSON.stringify([...policy.meta.audiences, ...policy.google.audiences]).toLowerCase();
  for (const word of ["gender", "orientation", "dating", "matching", "match"]) {
    assert.equal(text.includes(word), false, word);
  }
});

test("the loader rejects bad names, durations and sources", () => {
  assert.throws(withPolicy((p) => { p.meta.audiences[0].name = "Host visitors"; }), /named "Catch \| \.\.\."/);
  assert.throws(withPolicy((p) => { p.meta.audiences[1].name = p.meta.audiences[0].name; }), /declared twice/);
  assert.throws(withPolicy((p) => { p.meta.audiences[0].retentionDays = 181; }), /1 to 180 days/);
  assert.throws(withPolicy((p) => { p.meta.audiences[2].retentionDays = 91; }), /1 to 90 days/);
  assert.throws(withPolicy((p) => { p.meta.audiences[0].source = "email"; }), /unknown source/);
  assert.throws(withPolicy((p) => { p.meta.audiences[0].event = "Lead"; }), /exactly one of urlContains or event/);
  assert.throws(withPolicy((p) => { p.google.audiences[0].membershipDays = 541; }), /1 to 540 days/);
  assert.throws(withPolicy((p) => { p.google.observeOn.audiences.push("Catch | Nobody"); }), /undeclared audience/);
});

test("Meta audiences become pixel, lead form and engagement rules", () => {
  const byName = new Map(policy.meta.audiences.map((a) => [a.name, metaAudienceParams(policy.meta, a)]));
  const visitors = byName.get("Catch | Host page visitors | 180d");
  assert.equal(visitors.prefill, true);
  assert.deepEqual(visitors.rule.inclusions.rules[0].event_sources, [{id: policy.meta.pixelId, type: "pixel"}]);
  assert.equal(visitors.rule.inclusions.rules[0].retention_seconds, 180 * 86_400);
  assert.deepEqual(visitors.rule.inclusions.rules[0].filter.filters[0],
    {field: "url", operator: "i_contains", value: "/host"});
  const opened = byName.get("Catch | Lead form opened, not sent | 90d");
  assert.deepEqual(opened.rule.inclusions.rules[0].event_sources, [{id: policy.meta.pageId, type: "lead"}]);
  assert.equal(opened.rule.exclusions.rules[0].filter.filters[0].value, "lead_generation_submitted");
  assert.equal("prefill" in opened, false);
  assert.equal(byName.get("Catch | Instagram engagers | 365d").rule.inclusions.rules[0].event_sources[0].type,
    "ig_business");
});

test("Google lists are URL rules with their membership span", () => {
  const operation = googleUserListOperation(policy.google.audiences[0]).userListOperation.create;
  assert.equal(operation.membershipLifeSpan, "540");
  assert.deepEqual(operation.ruleBasedUserList.flexibleRuleUserList.inclusiveOperands[0].rule.ruleItemGroups[0]
    .ruleItems[0], {name: "url__", stringRuleItem: {operator: "CONTAINS", value: "catchdates.com/host"}});
});

test("plans keep existing audiences and create only the missing ones", async () => {
  const existing = policy.meta.audiences[0].name;
  const metaApi = {get: async () => ({data: [{id: "1", name: existing}, {id: "2", name: "Catch | Active hosts"}]})};
  const metaPlan = await planMetaAudiences({meta: policy.meta, api: metaApi});
  assert.deepEqual(metaPlan.filter((row) => row.kind === "keep").map((row) => row.name), [existing]);
  assert.equal(metaPlan.filter((row) => row.kind === "create").length, policy.meta.audiences.length - 1);
  assert.equal(metaPlan.some((row) => row.name === "Catch | Active hosts"), false);

  const queries = [];
  const googleApi = {search: async (query) => {
    queries.push(query);
    if (query.includes("FROM user_list")) {
      return [{userList: {name: policy.google.audiences[0].name, resourceName: "customers/1/userLists/9"}}];
    }
    if (query.includes("FROM campaign WHERE")) {
      return [{campaign: {resourceName: "customers/1/campaigns/5", targetingSetting: {targetRestrictions: [
        {targetingDimension: "AUDIENCE", bidOnly: false}]}}}];
    }
    return [{campaignCriterion: {userList: {userList: "customers/1/userLists/9"}}}];
  }};
  const {changes} = await planGoogleAudiences({google: policy.google, api: googleApi});
  assert.deepEqual(changes.map((row) => `${row.kind}:${row.name}`), [
    `keep:${policy.google.audiences[0].name}`,
    `create:${policy.google.audiences[1].name}`,
    `observe:${policy.google.observeOn.campaign}`,
    `attach:${policy.google.audiences[1].name}`,
  ]);
  assert.match(queries[1], /campaign\.name = 'Catch Host \| Search \| Organisers'/);
});

test("apply creates Meta audiences, then Google lists, then observes and attaches", async () => {
  const posts = [];
  const metaApi = {post: async (route, params) => { posts.push([route, params.name]); return {id: String(posts.length)}; }};
  const mutations = [];
  const googleApi = {mutate: async (operations) => {
    mutations.push(operations);
    return {mutateOperationResponses: operations.map((_, index) =>
      ({userListResult: {resourceName: `customers/1/userLists/${100 + index}`}}))};
  }};
  const metaPlan = [{kind: "create", name: policy.meta.audiences[0].name, audience: policy.meta.audiences[0]}];
  const googlePlan = [
    {kind: "create", name: policy.google.audiences[1].name, audience: policy.google.audiences[1]},
    {kind: "observe", name: "Search", campaign: "customers/1/campaigns/5", restrictions: []},
    {kind: "attach", name: policy.google.audiences[1].name, campaign: "customers/1/campaigns/5", campaignName: "Search"},
  ];
  const done = await applyAudiences({policy, metaPlan, googlePlan, metaApi, googleApi, wait: async () => {}});
  assert.deepEqual(posts, [[`act_${policy.meta.adAccountId}/customaudiences`, policy.meta.audiences[0].name]]);
  assert.equal(mutations.length, 2);
  assert.ok(mutations[0][0].userListOperation.create);
  assert.equal(mutations[1][0].campaignOperation.update.targetingSetting.targetRestrictions[0].bidOnly, true);
  assert.equal(mutations[1][1].campaignCriterionOperation.create.userList.userList, "customers/1/userLists/100");
  assert.equal(done.length, 4);
});

test("a Meta rate-limit answer is retried once", async () => {
  let calls = 0;
  const metaApi = {post: async () => {
    calls += 1;
    if (calls === 1) throw new Error("Meta POST x failed (400): (#613) Calls to this API have exceeded the rate limit");
    return {id: "7"};
  }};
  const metaPlan = [{kind: "create", name: policy.meta.audiences[0].name, audience: policy.meta.audiences[0]}];
  const done = await applyAudiences({policy, metaPlan, googlePlan: [], metaApi, googleApi: {}, wait: async () => {}});
  assert.equal(calls, 2);
  assert.match(done[0], /\(7\)/);
});
