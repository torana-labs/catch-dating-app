import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {brand} from "@catch/brand";
import {
  applyGoogleCampaigns,
  assetSyncOperations,
  createCampaignOperations,
  headlineSyncOperations,
  loadGoogleCampaigns,
  planGoogleCampaigns,
  siteUrl,
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

test("every ad has the full 15 headlines", () => {
  for (const campaign of policy.campaigns) {
    for (const group of campaign.adGroups) {
      assert.equal(campaign.sharedHeadlines.length + group.headlines.length, 15, group.name);
    }
  }
});

test("sitelink and callout guards: lengths, site paths, no repeats", () => {
  const sitelink = (p) => p.campaigns[0].sitelinks[0];
  assert.throws(withPolicy((p) => { sitelink(p).linkText = "x".repeat(26); }), /sitelink text must be 1 to 25/);
  assert.throws(withPolicy((p) => { sitelink(p).description2 = "x".repeat(36); }), /two description lines/);
  assert.throws(withPolicy((p) => { delete sitelink(p).description1; }), /two description lines/);
  assert.throws(withPolicy((p) => { sitelink(p).path = "https://example.com/"; }), /needs a site path/);
  assert.throws(withPolicy((p) => {
    p.campaigns[0].sitelinks.push({...sitelink(p), linkText: sitelink(p).linkText.toUpperCase()});
  }), /repeats a sitelink/);
  assert.throws(withPolicy((p) => { p.campaigns[0].callouts[0] = "x".repeat(26); }), /callout must be 1 to 25/);
  assert.throws(withPolicy((p) => { p.campaigns[0].callouts.push(p.campaigns[0].callouts[0]); }),
    /repeats a callout/);
  const campaign = policy.campaigns[0];
  assert.ok(campaign.sitelinks.length >= 4 && campaign.callouts.length >= 4);
});

test("headline sync sets each live ad to the file's headlines and names missing ad groups", () => {
  const campaign = policy.campaigns[0];
  const [first, second] = campaign.adGroups;
  const ad = (group, headlines, id) => ({adGroup: {name: group}, adGroupAd: {ad: {
    resourceName: `customers/${policy.customerId}/ads/${id}`,
    responsiveSearchAd: {headlines: headlines.map((text) => ({text}))}}}});
  const full = (group) => [...campaign.sharedHeadlines, ...group.headlines];
  const sync = headlineSyncOperations(campaign, [
    ad(first.name, [...full(first).slice(0, 10), "Old headline"], 1),
    ad(second.name, [...full(second)].reverse(), 2),
  ]);
  assert.equal(sync.operations.length, 1);
  const update = sync.operations[0].adOperation;
  assert.equal(update.update.resourceName, `customers/${policy.customerId}/ads/1`);
  assert.equal(update.updateMask, "responsiveSearchAd.headlines");
  assert.deepEqual(update.update.responsiveSearchAd.headlines.map((h) => h.text), full(first));
  assert.deepEqual(sync.updates[0].remove, ["Old headline"]);
  assert.equal(sync.updates[0].add.length, 5);
  assert.deepEqual(sync.missingAdGroups, campaign.adGroups.slice(2).map((group) => group.name));
});

test("asset sync creates and links only the sitelinks and callouts the campaign lacks", () => {
  const campaign = policy.campaigns[0];
  const [linked] = campaign.sitelinks;
  const assets = [
    {campaignAsset: {fieldType: "SITELINK"}, asset: {sitelinkAsset: {linkText: linked.linkText.toUpperCase()}}},
    {campaignAsset: {fieldType: "CALLOUT"}, asset: {calloutAsset: {calloutText: campaign.callouts[0]}}},
    // A callout's text on a sitelink does not count as that callout.
    {campaignAsset: {fieldType: "SITELINK"}, asset: {sitelinkAsset: {linkText: campaign.callouts[1]}}},
  ];
  const sync = assetSyncOperations(policy.customerId, campaign, "42", assets);
  assert.deepEqual(sync.addSitelinks, campaign.sitelinks.slice(1).map((s) => s.linkText));
  assert.deepEqual(sync.addCallouts, campaign.callouts.slice(1));
  const creates = sync.operations.filter((op) => op.assetOperation).map((op) => op.assetOperation.create);
  const links = sync.operations.filter((op) => op.campaignAssetOperation).map((op) => op.campaignAssetOperation.create);
  assert.equal(creates.length, sync.addSitelinks.length + sync.addCallouts.length);
  assert.equal(new Set(creates.map((c) => c.resourceName)).size, creates.length);
  for (const [i, create] of creates.entries()) {
    assert.match(create.resourceName, /^customers\/1016806229\/assets\/-\d+$/);
    assert.equal(links[i].asset, create.resourceName);
    assert.equal(links[i].campaign, `customers/${policy.customerId}/campaigns/42`);
    assert.equal(links[i].fieldType, create.sitelinkAsset ? "SITELINK" : "CALLOUT");
  }
  const sitelink = creates.find((c) => c.sitelinkAsset);
  assert.equal(new URL(sitelink.finalUrls[0]).origin, brand.web.origin);
  assert.equal(sitelink.finalUrls[0], siteUrl(campaign.sitelinks[1].path));
  const done = assetSyncOperations(policy.customerId, campaign, "42", [
    ...campaign.sitelinks.map((s) => ({campaignAsset: {fieldType: "SITELINK"}, asset: {sitelinkAsset: {linkText: s.linkText}}})),
    ...campaign.callouts.map((text) => ({campaignAsset: {fieldType: "CALLOUT"}, asset: {calloutAsset: {calloutText: text}}})),
  ]);
  assert.equal(done.operations.length, 0);
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
  const links = ops.filter((op) => op.campaignAssetOperation).map((op) => op.campaignAssetOperation.create);
  assert.equal(links.filter((link) => link.fieldType === "SITELINK").length, campaign.sitelinks.length);
  assert.equal(links.filter((link) => link.fieldType === "CALLOUT").length, campaign.callouts.length);
  for (const link of links) assert.equal(link.campaign, created.resourceName);
  const assetIndex = ops.findIndex((op) => op.assetOperation);
  assert.ok(assetIndex > ops.indexOf(ops.find((op) => op.campaignOperation)));
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
  const ads = campaign.adGroups.map((group, i) => ({adGroup: {name: group.name}, adGroupAd: {ad: {
    resourceName: `customers/${policy.customerId}/ads/${i}`,
    responsiveSearchAd: {headlines: [...campaign.sharedHeadlines, ...group.headlines].map((text) => ({text}))}}}}));
  const assets = [
    ...campaign.sitelinks.map((s) => ({campaignAsset: {fieldType: "SITELINK"}, asset: {sitelinkAsset: {linkText: s.linkText}}})),
    ...campaign.callouts.map((text) => ({campaignAsset: {fieldType: "CALLOUT"}, asset: {calloutAsset: {calloutText: text}}})),
  ];
  let linkedAssets = assets;
  const api = {
    search: async (query) => query.includes("geo_target_constant.name") ? places :
      query.includes("FROM campaign_criterion") ? criteria :
        query.includes("FROM ad_group_ad") ? ads :
          query.includes("FROM campaign_asset") ? linkedAssets :
            [{campaign: {id: "42", name: campaign.name, status: "PAUSED"}}],
    mutate: async (ops, validateOnly) => { calls.push(validateOnly); return {}; },
  };
  const kept = await planGoogleCampaigns({policy, api});
  assert.deepEqual(kept.changes.map((c) => c.kind), ["keep"]);
  assert.deepEqual(await applyGoogleCampaigns({plan: kept, api}), {created: 0, synced: 0});
  assert.deepEqual(calls, []);
  criteria = matching.slice(1);
  linkedAssets = assets.slice(1);
  const drifted = await planGoogleCampaigns({policy, api});
  assert.deepEqual(drifted.changes.map((c) => c.kind), ["sync"]);
  assert.equal(drifted.changes[0].addLocations.length, 1);
  assert.deepEqual(drifted.changes[0].addSitelinks, [campaign.sitelinks[0].linkText]);
  assert.deepEqual(drifted.changes[0].addCallouts, []);
  assert.deepEqual(drifted.changes[0].headlineUpdates, []);
  assert.deepEqual(calls, [true]);
  api.search = async (query) => query.includes("geo_target_constant.name") ? places : [];
  const fresh = await planGoogleCampaigns({policy, api});
  assert.deepEqual(fresh.changes.map((c) => c.kind), ["create"]);
  assert.equal(fresh.changes[0].locations.length, campaign.locations.length);
  assert.deepEqual(await applyGoogleCampaigns({plan: fresh, api}), {created: 1, synced: 0});
  assert.deepEqual(calls, [true, true, false]);
});
