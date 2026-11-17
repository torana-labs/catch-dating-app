import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {brand} from "@catch/brand";
import {
  applyGoogleCampaigns,
  createCampaignOperations,
  loadGoogleCampaigns,
  planGoogleCampaigns,
} from "./apply_google_campaigns.mjs";

const policy = loadGoogleCampaigns();

function withPolicy(change) {
  const copy = structuredClone(policy);
  change(copy);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ads-")), "p.json");
  fs.writeFileSync(file, JSON.stringify(copy));
  return () => loadGoogleCampaigns(file);
}

test("the committed policy is valid and every campaign starts paused", () => {
  assert.ok(policy.campaigns.length > 0);
  for (const campaign of policy.campaigns) assert.equal(campaign.status, "PAUSED");
});

test("policy guards: paused only, prefix, copy limits, landing domain", () => {
  assert.throws(withPolicy((p) => { p.campaigns[0].status = "ENABLED"; }), /created PAUSED/);
  assert.throws(withPolicy((p) => { p.campaigns[0].name = "Other campaign"; }), /managed prefix/);
  assert.throws(withPolicy((p) => { p.campaigns[0].sharedHeadlines[0] = "x".repeat(31); }),
    /headline over 30/);
  assert.throws(withPolicy((p) => { p.campaigns[0].descriptions[0] = "x".repeat(91); }),
    /description over 90/);
  assert.throws(withPolicy((p) => { p.campaigns[0].adGroups[0].landingPath = "https://example.com/"; }),
    /needs a site landing path/);
  assert.throws(withPolicy((p) => { p.campaigns[0].dailyBudgetInr = 50000; }),
    /between 1 and 5000/);
  assert.throws(withPolicy((p) => {
    p.campaigns[0].adGroups[0].headlines = [p.campaigns[0].sharedHeadlines[0]];
  }), /repeats a headline/);
});

test("one atomic request creates a paused campaign and its children", () => {
  const campaign = policy.campaigns[0];
  const ops = createCampaignOperations(policy.customerId, campaign);
  const created = ops.find((op) => op.campaignOperation).campaignOperation.create;
  assert.equal(created.status, "PAUSED");
  assert.equal(created.advertisingChannelType, "SEARCH");
  assert.equal(created.networkSettings.targetContentNetwork, false);
  assert.match(created.resourceName, /^customers\/1016806229\/campaigns\/-\d+$/);
  const budget = ops[0].campaignBudgetOperation.create;
  assert.equal(budget.amountMicros, String(campaign.dailyBudgetInr * 1_000_000));
  assert.equal(created.campaignBudget, budget.resourceName);
  const keywords = ops.filter((op) => op.adGroupCriterionOperation).length;
  assert.equal(keywords, campaign.adGroups.reduce((n, g) => n + g.keywords.length, 0));
  const ads = ops.filter((op) => op.adGroupAdOperation);
  assert.equal(ads.length, campaign.adGroups.length);
  assert.equal(new URL(ads[0].adGroupAdOperation.create.ad.finalUrls[0]).origin, brand.web.origin);
});

test("plan validates creates, keeps existing campaigns, and apply writes once", async () => {
  const calls = [];
  const places = policy.campaigns[0].locations.map((id) =>
    ({geoTargetConstant: {id: String(id), name: `Place ${id}`}}));
  const api = {
    search: async (query) => query.includes("geo_target_constant") ? places :
      [{campaign: {name: "Catch Host | Search | Organisers", status: "PAUSED"}}],
    mutate: async (ops, validateOnly) => { calls.push(validateOnly); return {}; },
  };
  const kept = await planGoogleCampaigns({policy, api});
  assert.deepEqual(kept.changes.map((c) => c.kind), ["keep"]);
  assert.equal(await applyGoogleCampaigns({plan: kept, api}), 0);
  assert.deepEqual(calls, []);
  api.search = async (query) => query.includes("geo_target_constant") ? places : [];
  const fresh = await planGoogleCampaigns({policy, api});
  assert.deepEqual(fresh.changes.map((c) => c.kind), ["create"]);
  assert.equal(fresh.changes[0].locations.length, policy.campaigns[0].locations.length);
  assert.deepEqual(calls, [true]);
  assert.equal(await applyGoogleCampaigns({plan: fresh, api}), 1);
  assert.deepEqual(calls, [true, false]);
});
