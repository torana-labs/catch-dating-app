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
// file. A campaign that already exists keeps its ads, budget and bidding; only
// its locations and negative keywords are brought in line with the catalog and
// this file, shown in the plan and changed with --apply. Only names under the
// managed prefix are considered.
// The access token comes from GOOGLE_ADS_ACCESS_TOKEN or from gcloud
// impersonating the ads service account; it is never logged.

const API = "https://googleads.googleapis.com/v24";
const POLICY_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)),
  "google_campaigns.json");
const SERVICE_ACCOUNT =
  "catch-ads-automation@catch-dating-app-64e51.iam.gserviceaccount.com";
const MATCH_TYPES = new Set(["EXACT", "PHRASE", "BROAD"]);
const micros = (inr) => String(Math.round(inr * 1_000_000));

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
      if (!/^\/[a-z0-9/-]*$/.test(group.landingPath ?? "")) {
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
      finalUrls: [new URL(group.landingPath, brand.web.origin).href],
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
      const sync = targetingSyncOperations(policy.customerId, campaign, row.id, criteria);
      if (!sync.operations.length) {
        changes.push({kind: "keep", target: campaign.name, status: row.status});
        continue;
      }
      await api.mutate(sync.operations, true);
      changes.push({kind: "sync", target: campaign.name, status: row.status, operations: sync.operations,
        addLocations: sync.addLocations.map((id) => placeNames.get(id) ?? String(id)),
        removeLocations: sync.removeLocations.map(String), addNegatives: sync.addNegatives});
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
        ].filter(Boolean);
        console.log(`- sync ${change.target} (exists, ${change.status}; validated): ${parts.join("; ")}`);
      } else {
        console.log(`- keep ${change.target} (exists, ${change.status}; matches the catalog)`);
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
