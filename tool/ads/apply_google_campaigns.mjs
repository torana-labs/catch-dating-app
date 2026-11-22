#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {brand} from "@catch/brand";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {adProgrammes, adTargetingFromCatalog, readMarketCatalog} from "../lib/market_catalog.mjs";

// Plans, and with --apply creates, the Google Ads campaigns in
// google_campaigns.json. Every campaign is created PAUSED: switching one on,
// and any budget change after launch, is the owner's call in the console.
// The default run reads the account and asks Google to validate the create
// request without making anything. Locations come from the city catalog
// (contracts/catalogs/markets.json, each city's `ads` block), never from this
// file. A campaign that already exists keeps its budget and bidding; its
// locations and negative keywords are brought in line with the catalog and
// this file, each responsive search ad's headlines are set to this file's, and
// any sitelink or callout this file lists that the campaign lacks (matched by
// its text) is created and linked. All of it is shown in the plan and changed
// with --apply. Only names under the managed prefix are considered.
// The access token comes from GOOGLE_ADS_ACCESS_TOKEN or from gcloud
// impersonating the ads service account; it is never logged.

const API = "https://googleads.googleapis.com/v24";
const POLICY_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)),
  "google_campaigns.json");
const SERVICE_ACCOUNT =
  "catch-ads-automation@catch-dating-app-64e51.iam.gserviceaccount.com";
const MATCH_TYPES = new Set(["EXACT", "PHRASE", "BROAD"]);
const SITE_PATH = /^\/[a-z0-9/-]*$/;
const micros = (inr) => String(Math.round(inr * 1_000_000));
/** A marketing-site URL: the brand package's web origin plus a site path. */
export const siteUrl = (sitePath) => new URL(sitePath, brand.web.origin).href;
const textKey = (text) => text.trim().toLowerCase();

export function loadGoogleCampaigns(file = POLICY_PATH, catalog = readMarketCatalog()) {
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  if (policy.version !== 1 || !/^\d{10}$/.test(policy.customerId ?? "") ||
      typeof policy.managedPrefix !== "string") {
    throw new Error("google_campaigns.json is not a version 1 policy.");
  }
  for (const campaign of policy.campaigns ?? []) {
    const where = `campaign "${campaign.name}"`;
    if (!campaign.name?.startsWith(policy.managedPrefix)) {
      throw new Error(`${where} must start with the managed prefix.`);
    }
    if (campaign.status !== "PAUSED") {
      throw new Error(`${where} must be created PAUSED; the owner enables it.`);
    }
    if (!(campaign.dailyBudgetInr > 0 && campaign.dailyBudgetInr <= 5000)) {
      throw new Error(`${where} daily budget must be between 1 and 5000 INR.`);
    }
    if ("locations" in campaign) {
      throw new Error(`${where} lists its own locations; set adProgramme and switch cities on in the city catalog.`);
    }
    if (!adProgrammes.includes(campaign.adProgramme)) {
      throw new Error(`${where} adProgramme must be one of ${adProgrammes.join(", ")}.`);
    }
    const targeting = adTargetingFromCatalog(catalog, campaign.adProgramme);
    if (!targeting.googleGeoTargetIds.length) {
      throw new Error(`${where} has no city with ${campaign.adProgramme} ads on in the city catalog.`);
    }
    campaign.locations = targeting.googleGeoTargetIds;
    campaign.markets = targeting.labels;
    if (!campaign.languages?.length || !campaign.languages.every((id) => Number.isSafeInteger(id) && id > 0)) {
      throw new Error(`${where} languages must be a non-empty list of Google IDs.`);
    }
    if (campaign.bidding?.strategy !== "MAXIMIZE_CLICKS" &&
        campaign.bidding?.strategy !== "MAXIMIZE_CONVERSIONS") {
      throw new Error(`${where} bidding must be MAXIMIZE_CLICKS or MAXIMIZE_CONVERSIONS.`);
    }
    for (const description of campaign.descriptions ?? []) {
      if (description.length > 90) throw new Error(`${where} description over 90 characters: ${description}`);
    }
    if ((campaign.descriptions ?? []).length < 2 || campaign.descriptions.length > 4) {
      throw new Error(`${where} needs 2 to 4 descriptions.`);
    }
    const sitelinks = campaign.sitelinks ?? [];
    if (sitelinks.length > 20) throw new Error(`${where} has more than 20 sitelinks.`);
    for (const sitelink of sitelinks) {
      if (!sitelink.linkText || sitelink.linkText.length > 25) {
        throw new Error(`${where} sitelink text must be 1 to 25 characters: ${sitelink.linkText}`);
      }
      for (const line of [sitelink.description1, sitelink.description2]) {
        if (!line || line.length > 35) {
          throw new Error(`${where} sitelink "${sitelink.linkText}" needs two description lines of 1 to 35 characters.`);
        }
      }
      if (!SITE_PATH.test(sitelink.path ?? "")) {
        throw new Error(`${where} sitelink "${sitelink.linkText}" needs a site path such as /pricing/.`);
      }
    }
    if (new Set(sitelinks.map((sitelink) => textKey(sitelink.linkText))).size !== sitelinks.length) {
      throw new Error(`${where} repeats a sitelink.`);
    }
    const callouts = campaign.callouts ?? [];
    if (callouts.length > 20) throw new Error(`${where} has more than 20 callouts.`);
    for (const callout of callouts) {
      if (!callout || callout.length > 25) throw new Error(`${where} callout must be 1 to 25 characters: ${callout}`);
    }
    if (new Set(callouts.map(textKey)).size !== callouts.length) throw new Error(`${where} repeats a callout.`);
    for (const group of campaign.adGroups ?? []) {
      const headlines = [...campaign.sharedHeadlines, ...group.headlines];
      if (headlines.length < 3 || headlines.length > 15) {
        throw new Error(`${where} ad group "${group.name}" needs 3 to 15 headlines.`);
      }
      if (new Set(headlines).size !== headlines.length) {
        throw new Error(`${where} ad group "${group.name}" repeats a headline.`);
      }
      for (const headline of headlines) {
        if (headline.length > 30) throw new Error(`${where} headline over 30 characters: ${headline}`);
      }
      if (!SITE_PATH.test(group.landingPath ?? "")) {
        throw new Error(`${where} ad group "${group.name}" needs a site landing path such as /host/.`);
      }
      if (!group.keywords?.length) throw new Error(`${where} ad group "${group.name}" has no keywords.`);
      for (const keyword of group.keywords) {
        if (!MATCH_TYPES.has(keyword.match)) throw new Error(`${where} keyword "${keyword.text}" has no valid match type.`);
      }
    }
  }
  return policy;
}

/**
 * Creates each sitelink and callout as an asset and links it to the campaign.
 * `temp` names a new resource with a temporary negative ID.
 */
function campaignAssetOperations(campaignResource, temp, {sitelinks = [], callouts = []}) {
  const ops = [];
  const link = (create, fieldType) => {
    const asset = temp("assets");
    ops.push({assetOperation: {create: {resourceName: asset, ...create}}},
      {campaignAssetOperation: {create: {campaign: campaignResource, asset, fieldType}}});
  };
  for (const sitelink of sitelinks) {
    link({finalUrls: [siteUrl(sitelink.path)], sitelinkAsset: {linkText: sitelink.linkText,
      description1: sitelink.description1, description2: sitelink.description2}}, "SITELINK");
  }
  for (const calloutText of callouts) link({calloutAsset: {calloutText}}, "CALLOUT");
  return ops;
}

/**
 * One atomic mutate request that creates a whole campaign. Temporary
 * negative IDs let later operations refer to resources made earlier in the
 * same request.
 */
export function createCampaignOperations(customerId, campaign) {
  const base = `customers/${customerId}`;
  let next = -1;
  const temp = (kind) => `${base}/${kind}/${next--}`;
  const budget = temp("campaignBudgets");
  const campaignName = temp("campaigns");
  const ops = [
    {campaignBudgetOperation: {create: {resourceName: budget,
      name: `${campaign.name} budget`, amountMicros: micros(campaign.dailyBudgetInr),
      deliveryMethod: "STANDARD", explicitlyShared: false}}},
    {campaignOperation: {create: {
      resourceName: campaignName, name: campaign.name, status: "PAUSED",
      advertisingChannelType: "SEARCH", campaignBudget: budget,
      networkSettings: {targetGoogleSearch: true, targetSearchNetwork: false,
        targetContentNetwork: false, targetPartnerSearchNetwork: false},
      geoTargetTypeSetting: {positiveGeoTargetType: "PRESENCE"},
      containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      ...(campaign.finalUrlSuffix ? {finalUrlSuffix: campaign.finalUrlSuffix} : {}),
      ...(campaign.bidding.strategy === "MAXIMIZE_CLICKS" ?
        {targetSpend: {cpcBidCeilingMicros: micros(campaign.bidding.maxCpcInr)}} :
        {maximizeConversions: {}}),
    }}},
    ...campaign.locations.map((id) => ({campaignCriterionOperation: {create: {
      campaign: campaignName, location: {geoTargetConstant: `geoTargetConstants/${id}`}}}})),
    ...campaign.languages.map((id) => ({campaignCriterionOperation: {create: {
      campaign: campaignName, language: {languageConstant: `languageConstants/${id}`}}}})),
    ...(campaign.negativeKeywords ?? []).map((text) => ({campaignCriterionOperation: {create: {
      campaign: campaignName, negative: true, keyword: {text, matchType: "BROAD"}}}})),
    ...campaignAssetOperations(campaignName, temp, campaign),
  ];
  for (const group of campaign.adGroups) {
    const adGroup = temp("adGroups");
    ops.push({adGroupOperation: {create: {resourceName: adGroup, campaign: campaignName,
      name: group.name, status: "ENABLED", type: "SEARCH_STANDARD",
      cpcBidMicros: micros(group.maxCpcInr)}}});
    for (const keyword of group.keywords) {
      ops.push({adGroupCriterionOperation: {create: {adGroup, status: "ENABLED",
        keyword: {text: keyword.text, matchType: keyword.match}}}});
    }
    ops.push({adGroupAdOperation: {create: {adGroup, status: "ENABLED", ad: {
      finalUrls: [siteUrl(group.landingPath)],
      responsiveSearchAd: {
        headlines: [...campaign.sharedHeadlines, ...group.headlines].map((text) => ({text})),
        descriptions: campaign.descriptions.map((text) => ({text})),
      }}}}});
  }
  return ops;
}

export function googleAdsApi({customerId, token, fetch = globalThis.fetch}) {
  if (!token) throw new Error("No Google Ads access token.");
  const call = async (route, body) => {
    const response = await fetch(`${API}/customers/${customerId}/${route}`, {method: "POST",
      headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json"},
      body: JSON.stringify(body)});
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const details = (payload?.error?.details ?? []).flatMap((detail) => detail.errors ?? [])
        .map((error) => `${JSON.stringify(error.errorCode)} ${error.message}`).join("; ");
      throw new Error(`Google Ads ${route} failed (${response.status}): ${details || payload?.error?.message}`);
    }
    return payload;
  };
  return {
    search: async (query) => (await call("googleAds:search", {query})).results ?? [],
    mutate: (mutateOperations, validateOnly) =>
      call("googleAds:mutate", {mutateOperations, validateOnly}),
  };
}

/**
 * The criteria an existing campaign needs added or removed so its locations
 * match the catalog and its negative keywords match this file.
 */
export function targetingSyncOperations(customerId, campaign, campaignId, criteria) {
  const resource = `customers/${customerId}/campaigns/${campaignId}`;
  const want = new Set(campaign.locations.map(Number));
  const have = new Map();
  const negatives = new Set();
  for (const {campaignCriterion: criterion} of criteria) {
    const geo = criterion.location?.geoTargetConstant;
    if (geo && !criterion.negative) have.set(Number(geo.split("/").pop()), criterion.resourceName);
    if (criterion.keyword?.text && criterion.negative) negatives.add(criterion.keyword.text.toLowerCase());
  }
  const addLocations = [...want].filter((id) => !have.has(id));
  const removeLocations = [...have.keys()].filter((id) => !want.has(id));
  const addNegatives = (campaign.negativeKeywords ?? []).filter((text) => !negatives.has(text.toLowerCase()));
  const operations = [
    ...addLocations.map((id) => ({campaignCriterionOperation: {create: {
      campaign: resource, location: {geoTargetConstant: `geoTargetConstants/${id}`}}}})),
    ...removeLocations.map((id) => ({campaignCriterionOperation: {remove: have.get(id)}})),
    ...addNegatives.map((text) => ({campaignCriterionOperation: {create: {
      campaign: resource, negative: true, keyword: {text, matchType: "BROAD"}}}})),
  ];
  return {operations, addLocations, removeLocations, addNegatives};
}

/**
 * Sets each live responsive search ad's headlines to this file's shared and
 * ad group headlines when they differ. Ad groups are matched by name; a
 * configured ad group the campaign lacks is reported, not created.
 */
export function headlineSyncOperations(campaign, ads) {
  const operations = [];
  const updates = [];
  const live = new Set(ads.map((row) => row.adGroup.name));
  for (const group of campaign.adGroups) {
    const want = [...campaign.sharedHeadlines, ...group.headlines];
    for (const row of ads.filter((ad) => ad.adGroup.name === group.name)) {
      const ad = row.adGroupAd.ad;
      const have = (ad.responsiveSearchAd?.headlines ?? []).map((headline) => headline.text);
      const add = want.filter((text) => !have.includes(text));
      const remove = have.filter((text) => !want.includes(text));
      if (!add.length && !remove.length) continue;
      operations.push({adOperation: {update: {resourceName: ad.resourceName,
        responsiveSearchAd: {headlines: want.map((text) => ({text}))}},
      updateMask: "responsiveSearchAd.headlines"}});
      updates.push({adGroup: group.name, add, remove, headlines: want.length});
    }
  }
  const missingAdGroups = campaign.adGroups.map((group) => group.name).filter((name) => !live.has(name));
  return {operations, updates, missingAdGroups};
}

/**
 * Creates and links the sitelinks and callouts the campaign lacks, matched by
 * link text or callout text, so a re-run adds nothing. It never edits or
 * unlinks an asset already on the campaign.
 */
export function assetSyncOperations(customerId, campaign, campaignId, campaignAssets) {
  const resource = `customers/${customerId}/campaigns/${campaignId}`;
  const haveSitelinks = new Set();
  const haveCallouts = new Set();
  for (const row of campaignAssets) {
    const sitelink = row.asset?.sitelinkAsset?.linkText;
    const callout = row.asset?.calloutAsset?.calloutText;
    if (row.campaignAsset?.fieldType === "SITELINK" && sitelink) haveSitelinks.add(textKey(sitelink));
    if (row.campaignAsset?.fieldType === "CALLOUT" && callout) haveCallouts.add(textKey(callout));
  }
  const sitelinks = (campaign.sitelinks ?? []).filter((sitelink) => !haveSitelinks.has(textKey(sitelink.linkText)));
  const callouts = (campaign.callouts ?? []).filter((text) => !haveCallouts.has(textKey(text)));
  let next = -1;
  const temp = (kind) => `customers/${customerId}/${kind}/${next--}`;
  const operations = campaignAssetOperations(resource, temp, {sitelinks, callouts});
  return {operations, addSitelinks: sitelinks.map((sitelink) => sitelink.linkText), addCallouts: callouts};
}

/** Reads existing campaigns and validates every create and sync. Never writes. */
export async function planGoogleCampaigns({policy, api}) {
  const rows = await api.search("SELECT campaign.id, campaign.name, campaign.status FROM campaign " +
    "WHERE campaign.status != 'REMOVED'");
  const existing = new Map(rows.map((row) => [row.campaign.name, row.campaign]));
  const ids = [...new Set(policy.campaigns.flatMap((campaign) => campaign.locations))];
  const places = await api.search("SELECT geo_target_constant.id, geo_target_constant.name " +
    `FROM geo_target_constant WHERE geo_target_constant.id IN (${ids.join(",")})`);
  const placeNames = new Map(places.map((row) =>
    [Number(row.geoTargetConstant.id), row.geoTargetConstant.name]));
  const changes = [];
  for (const campaign of policy.campaigns) {
    const missing = campaign.locations.filter((id) => !placeNames.has(id));
    if (missing.length) throw new Error(`Unknown Google location IDs: ${missing.join(", ")}.`);
    if (existing.has(campaign.name)) {
      const row = existing.get(campaign.name);
      const criteria = await api.search("SELECT campaign_criterion.resource_name, " +
        "campaign_criterion.negative, campaign_criterion.location.geo_target_constant, " +
        `campaign_criterion.keyword.text FROM campaign_criterion WHERE campaign.id = ${row.id}`);
      const ads = await api.search("SELECT campaign.id, ad_group.name, ad_group_ad.ad.resource_name, " +
        "ad_group_ad.ad.responsive_search_ad.headlines FROM ad_group_ad " +
        `WHERE campaign.id = ${row.id} AND ad_group_ad.status != 'REMOVED' ` +
        "AND ad_group.status != 'REMOVED' AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'");
      const campaignAssets = await api.search("SELECT campaign.id, campaign_asset.field_type, " +
        "asset.sitelink_asset.link_text, asset.callout_asset.callout_text FROM campaign_asset " +
        `WHERE campaign.id = ${row.id} AND campaign_asset.status != 'REMOVED' ` +
        "AND campaign_asset.field_type IN ('SITELINK', 'CALLOUT')");
      const sync = targetingSyncOperations(policy.customerId, campaign, row.id, criteria);
      const headlines = headlineSyncOperations(campaign, ads);
      const assets = assetSyncOperations(policy.customerId, campaign, row.id, campaignAssets);
      const operations = [...sync.operations, ...headlines.operations, ...assets.operations];
      const missingAdGroups = headlines.missingAdGroups;
      if (!operations.length) {
        changes.push({kind: "keep", target: campaign.name, status: row.status, missingAdGroups});
        continue;
      }
      await api.mutate(operations, true);
      changes.push({kind: "sync", target: campaign.name, status: row.status, operations,
        addLocations: sync.addLocations.map((id) => placeNames.get(id) ?? String(id)),
        removeLocations: sync.removeLocations.map(String), addNegatives: sync.addNegatives,
        headlineUpdates: headlines.updates, addSitelinks: assets.addSitelinks,
        addCallouts: assets.addCallouts, missingAdGroups});
      continue;
    }
    const operations = createCampaignOperations(policy.customerId, campaign);
    await api.mutate(operations, true);
    changes.push({kind: "create", target: campaign.name, operations,
      locations: campaign.locations.map((id) => placeNames.get(id)), markets: campaign.markets});
  }
  return {customerId: policy.customerId, changes};
}

/** Creates new campaigns and syncs existing ones; returns how many of each. */
export async function applyGoogleCampaigns({plan, api}) {
  const done = {created: 0, synced: 0};
  for (const change of plan.changes) {
    if (change.kind !== "create" && change.kind !== "sync") continue;
    await api.mutate(change.operations, false);
    done[change.kind === "create" ? "created" : "synced"] += 1;
  }
  return done;
}

function accessToken() {
  if (process.env.GOOGLE_ADS_ACCESS_TOKEN) return process.env.GOOGLE_ADS_ACCESS_TOKEN;
  return execFileSync("gcloud", ["auth", "print-access-token",
    `--impersonate-service-account=${SERVICE_ACCOUNT}`,
    "--scopes=https://www.googleapis.com/auth/adwords"],
  {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {allowPositionals: false});
  if (args.help) {
    console.log("Usage: node tool/ads/apply_google_campaigns.mjs [--apply] [--json]");
    return;
  }
  const policy = loadGoogleCampaigns();
  const api = googleAdsApi({customerId: policy.customerId, token: accessToken()});
  const plan = await planGoogleCampaigns({policy, api});
  const summary = plan.changes.map(({operations, ...change}) =>
    ({...change, ...(operations ? {operations: operations.length} : {})}));
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`Google Ads plan for ${plan.customerId}:`);
    for (const change of summary) {
      if (change.kind === "create") {
        console.log(`- create ${change.target} (PAUSED, ${change.operations} operations, validated) in ${change.locations.join(", ")}`);
      } else if (change.kind === "sync") {
        const parts = [
          change.addLocations.length ? `add ${change.addLocations.join(", ")}` : "",
          change.removeLocations.length ? `remove locations ${change.removeLocations.join(", ")}` : "",
          change.addNegatives.length ? `add negatives ${change.addNegatives.join(", ")}` : "",
          ...change.headlineUpdates.map((update) => `ad group ${update.adGroup}: ${update.headlines} headlines` +
            (update.add.length ? `, add ${update.add.join(" / ")}` : "") +
            (update.remove.length ? `, remove ${update.remove.join(" / ")}` : "")),
          change.addSitelinks.length ? `add sitelinks ${change.addSitelinks.join(" / ")}` : "",
          change.addCallouts.length ? `add callouts ${change.addCallouts.join(" / ")}` : "",
        ].filter(Boolean);
        console.log(`- sync ${change.target} (exists, ${change.status}; validated): ${parts.join("; ")}`);
      } else {
        console.log(`- keep ${change.target} (exists, ${change.status}; matches the catalog and this file)`);
      }
      if (change.missingAdGroups?.length) {
        console.log(`  ad groups in the file but not in the campaign (not created): ${change.missingAdGroups.join(", ")}`);
      }
    }
  }
  if (!args.apply) {
    if (summary.some((change) => change.kind !== "keep")) {
      console.log("Nothing was changed. Re-run with --apply to make these changes; new campaigns start paused.");
    }
    return;
  }
  const done = await applyGoogleCampaigns({plan, api});
  console.log(`Created ${done.created} campaign(s), all paused, and synced ${done.synced}. Review them in Google Ads.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
