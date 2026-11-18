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
  targetingSyncOperations,
} from "./apply_google_campaigns.mjs";
import {adTargetingFromCatalog, readMarketCatalog} from "../lib/market_catalog.mjs";

const policy = loadGoogleCampaigns();

function withPolicy(change, catalog) {
  const copy = structuredClone(policy);
  // The loader fills these in from the city catalog; the file never has them.
  for (const campaign of copy.campaigns) { delete campaign.locations; delete campaign.markets; }
  change(copy);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ads-")), "p.json");
  fs.writeFileSync(file, JSON.stringify(copy));
  return () => loadGoogleCampaigns(file, catalog);
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

test("locations come only from the city catalog", () => {
  const host = adTargetingFromCatalog(readMarketCatalog(), "host");
  assert.deepEqual(policy.campaigns[0].locations, host.googleGeoTargetIds);
  assert.throws(withPolicy((p) => { p.campaigns[0].locations = [1007785]; }), /lists its own locations/);
  assert.throws(withPolicy((p) => { p.campaigns[0].adProgramme = "everyone"; }), /adProgramme must be/);
  const quiet = structuredClone(readMarketCatalog());
  for (const city of quiet.cities) if (city.ads) city.ads.host = "off";
  assert.throws(withPolicy(() => {}, quiet), /no city with host ads on/);
});

test("an existing campaign syncs to the catalog's locations and the file's negatives", () => {
  const campaign = policy.campaigns[0];
  const [keep, ...rest] = campaign.locations;
  const criteria = [
    ...rest.map((id) => ({campaignCriterion: {resourceName: `c/${id}`, negative: false,
      location: {geoTargetConstant: `geoTargetConstants/${id}`}}})),
    {campaignCriterion: {resourceName: "c/old", negative: false,
      location: {geoTargetConstant: "geoTargetConstants/999"}}},
    {campaignCriterion: {resourceName: "c/neg", negative: true, keyword: {text: "Jobs"}}},
  ];
  const sync = targetingSyncOperations(policy.customerId, campaign, "42", criteria);
  assert.deepEqual(sync.addLocations, [keep]);
  assert.deepEqual(sync.removeLocations, [999]);
  assert.ok(!sync.addNegatives.includes("jobs"));
  assert.ok(sync.addNegatives.includes("concert tickets"));
  assert.ok(sync.operations.some((op) => op.campaignCriterionOperation.remove === "c/old"));
  const clean = targetingSyncOperations(policy.customerId, campaign, "42", [
    ...campaign.locations.map((id) => ({campaignCriterion: {negative: false,
      location: {geoTargetConstant: `geoTargetConstants/${id}`}}})),
    ...campaign.negativeKeywords.map((text) => ({campaignCriterion: {negative: true, keyword: {text}}})),
  ]);
  assert.equal(clean.operations.length, 0);
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

test("plan validates creates and syncs, keeps matching campaigns, and apply writes once", async () => {
  const calls = [];
  const campaign = policy.campaigns[0];
  const places = campaign.locations.map((id) =>
    ({geoTargetConstant: {id: String(id), name: `Place ${id}`}}));
  const matching = [
    ...campaign.locations.map((id) => ({campaignCriterion: {negative: false,
      location: {geoTargetConstant: `geoTargetConstants/${id}`}}})),
    ...campaign.negativeKeywords.map((text) => ({campaignCriterion: {negative: true, keyword: {text}}})),
  ];
  let criteria = matching;
  const api = {
    search: async (query) => query.includes("geo_target_constant.name") ? places :
      query.includes("FROM campaign_criterion") ? criteria :
        [{campaign: {id: "42", name: campaign.name, status: "PAUSED"}}],
    mutate: async (ops, validateOnly) => { calls.push(validateOnly); return {}; },
  };
  const kept = await planGoogleCampaigns({policy, api});
  assert.deepEqual(kept.changes.map((c) => c.kind), ["keep"]);
  assert.deepEqual(await applyGoogleCampaigns({plan: kept, api}), {created: 0, synced: 0});
  assert.deepEqual(calls, []);
  criteria = matching.slice(1);
  const drifted = await planGoogleCampaigns({policy, api});
  assert.deepEqual(drifted.changes.map((c) => c.kind), ["sync"]);
  assert.equal(drifted.changes[0].addLocations.length, 1);
  assert.deepEqual(calls, [true]);
  api.search = async (query) => query.includes("geo_target_constant.name") ? places : [];
  const fresh = await planGoogleCampaigns({policy, api});
  assert.deepEqual(fresh.changes.map((c) => c.kind), ["create"]);
  assert.equal(fresh.changes[0].locations.length, campaign.locations.length);
  assert.deepEqual(await applyGoogleCampaigns({plan: fresh, api}), {created: 1, synced: 0});
  assert.deepEqual(calls, [true, true, false]);
});
