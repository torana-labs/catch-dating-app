#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {brand} from "@catch/brand";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {adProgrammes, adTargetingFromCatalog, readMarketCatalog} from "../lib/market_catalog.mjs";

// Plans, and with --apply creates, the Meta lead campaigns in
// meta_campaigns.json: the instant lead form, then campaign, ad set, images,
// creatives and ads. Everything is created PAUSED; switching a campaign on and
// any budget change after launch is the owner's call in Ads Manager. The
// default run reads the account, checks Page access, renders the images and
// asks Meta to validate each new campaign without making anything. Cities come
// from the city catalog (contracts/catalogs/markets.json, each city's `ads`
// block), never from this file. Forms and campaigns that already exist are
// left as they are, except that a campaign's ad set cities are brought in line
// with the catalog, shown in the plan and changed with --apply. Only names
// under the managed prefix are considered. If a create fails part-way, the
// campaign made in that run is deleted again. The token comes from
// META_ADS_ACCESS_TOKEN or Secret Manager (the CatchAds system user) and is
// never logged.

const GRAPH = "https://graph.facebook.com/v26.0";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const POLICY_PATH = path.join(ROOT, "tool/ads/meta_campaigns.json");
const TOKEN_SECRET = ["CATCH_META_ADS_TOKEN", "catch-dating-app-64e51"];
const STANDARD_QUESTIONS = new Set(["FULL_NAME", "PHONE", "EMAIL", "CITY"]);
// functions/src/acquisition/metaLeadgen/protocol.ts reads these custom keys.
const MAPPED_CUSTOM_KEYS = new Set(["club_name", "organisation_name",
  "organization_name", "community_name", "instagram_handle", "community_link",
  "website", "event_cadence", "operating_city"]);
const CALLS_TO_ACTION = new Set(["SIGN_UP", "APPLY_NOW", "LEARN_MORE", "GET_QUOTE"]);
const FEED = {width: 1080, height: 1350};
const metaId = (value) => typeof value === "string" && /^[0-9]{5,20}$/.test(value);
const sitePath = (value) => typeof value === "string" && /^\/[a-z0-9/-]*$/.test(value);

function limit(where, label, text, max) {
  if (typeof text !== "string" || !text.trim()) throw new Error(`${where} needs a ${label}.`);
  if (text.length > max) throw new Error(`${where} ${label} over ${max} characters: ${text}`);
}

export function loadMetaCampaigns(file = POLICY_PATH, catalog = readMarketCatalog()) {
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  if (policy.version !== 1 || !metaId(policy.adAccountId) || !metaId(policy.pageId) ||
      typeof policy.managedPrefix !== "string" ||
      (policy.instagramUserId != null && !metaId(policy.instagramUserId))) {
    throw new Error("meta_campaigns.json is not a version 1 policy.");
  }
  const forms = new Map();
  for (const form of policy.leadForms ?? []) {
    const where = `lead form "${form.name}"`;
    if (!form.name?.startsWith("Catch Host |")) throw new Error(`${where} must be named "Catch Host | ...".`);
    if (forms.has(form.name)) throw new Error(`${where} is declared twice.`);
    forms.set(form.name, form);
    limit(where, "intro title", form.introTitle, 60);
    if (!form.introBullets?.length || form.introBullets.length > 5) {
      throw new Error(`${where} needs 1 to 5 intro bullets.`);
    }
    for (const bullet of form.introBullets) limit(where, "intro bullet", bullet, 80);
    limit(where, "questions headline", form.questionsHeadline, 60);
    const types = new Set(form.questions.map((question) => question.type));
    for (const required of ["FULL_NAME", "PHONE", "EMAIL"]) {
      if (!types.has(required)) throw new Error(`${where} must ask for ${required}.`);
    }
    const keys = new Set();
    for (const question of form.questions) {
      if (STANDARD_QUESTIONS.has(question.type)) continue;
      if (question.type !== "CUSTOM") throw new Error(`${where} has an unknown question type ${question.type}.`);
      if (!MAPPED_CUSTOM_KEYS.has(question.key)) {
        throw new Error(`${where} custom question "${question.key}" is not read by the lead intake.`);
      }
      if (keys.has(question.key)) throw new Error(`${where} repeats question "${question.key}".`);
      keys.add(question.key);
      limit(where, "question label", question.label, 80);
      for (const option of question.options ?? []) limit(where, "answer option", option, 80);
    }
    if (!sitePath(form.privacyPath) || !sitePath(form.thankYouPath)) {
      throw new Error(`${where} needs site paths for the privacy policy and thank-you link.`);
    }
    limit(where, "thank-you title", form.thankYouTitle, 60);
    limit(where, "thank-you body", form.thankYouBody, 160);
    limit(where, "thank-you button", form.thankYouButton, 30);
  }
  for (const campaign of policy.campaigns ?? []) {
    const where = `campaign "${campaign.name}"`;
    if (!campaign.name?.startsWith(policy.managedPrefix)) {
      throw new Error(`${where} must start with the managed prefix.`);
    }
    if (campaign.status !== "PAUSED") {
      throw new Error(`${where} must be created PAUSED; the owner enables it.`);
    }
    if (!(Number.isInteger(campaign.dailyBudgetInr) && campaign.dailyBudgetInr >= 100 &&
        campaign.dailyBudgetInr <= 5000)) {
      throw new Error(`${where} daily budget must be a whole number between 100 and 5000 INR.`);
    }
    if (!forms.has(campaign.leadForm)) throw new Error(`${where} names an undeclared lead form.`);
    if (!sitePath(campaign.landingPath)) throw new Error(`${where} needs a site landing path such as /host/.`);
    const targeting = campaign.targeting ?? {};
    if ("cities" in targeting) {
      throw new Error(`${where} lists its own cities; set targeting.adProgramme and switch cities on in the city catalog.`);
    }
    if (!adProgrammes.includes(targeting.adProgramme)) {
      throw new Error(`${where} targeting.adProgramme must be one of ${adProgrammes.join(", ")}.`);
    }
    const fromCatalog = adTargetingFromCatalog(catalog, targeting.adProgramme);
    if (!fromCatalog.metaCityKeys.length || !fromCatalog.metaCityKeys.every(metaId)) {
      throw new Error(`${where} has no city with ${targeting.adProgramme} ads on in the city catalog.`);
    }
    targeting.cities = fromCatalog.metaCityKeys;
    targeting.markets = fromCatalog.labels;
    if (!(Number.isInteger(targeting.ageMin) && targeting.ageMin >= 18 && targeting.ageMin <= 25)) {
      throw new Error(`${where} ageMin must be between 18 and 25.`);
    }
    targeting.excludeAudiences ??= [];
    if (!Array.isArray(targeting.excludeAudiences) ||
        !targeting.excludeAudiences.every((name) => typeof name === "string" && name.trim())) {
      throw new Error(`${where} targeting.excludeAudiences must list custom audience names.`);
    }
    if (!campaign.ads?.length || campaign.ads.length > 6) throw new Error(`${where} needs 1 to 6 ads.`);
    const names = new Set();
    for (const ad of campaign.ads) {
      const adWhere = `${where} ad "${ad.name}"`;
      if (names.has(ad.name)) throw new Error(`${adWhere} is declared twice.`);
      names.add(ad.name);
      limit(adWhere, "primary text", ad.primaryText, 250);
      limit(adWhere, "headline", ad.headline, 40);
      limit(adWhere, "description", ad.description, 30);
      if (!CALLS_TO_ACTION.has(ad.callToAction)) throw new Error(`${adWhere} has an unsupported call to action.`);
      if (typeof ad.image !== "string" || !ad.image.startsWith("fastlane/metadata/host/") ||
          !ad.image.endsWith(".png")) {
        throw new Error(`${adWhere} image must be a Host store listing board under fastlane/metadata/host/.`);
      }
    }
  }
  return policy;
}

const site = (pathname) => new URL(pathname, brand.web.origin).href;

export function leadFormParams(form) {
  return {
    name: form.name,
    locale: "EN_US",
    is_optimized_for_quality: true,
    block_display_for_non_targeted_viewer: true,
    question_page_custom_headline: form.questionsHeadline,
    context_card: {title: form.introTitle, style: "LIST_STYLE", content: form.introBullets,
      button_text: "Continue"},
    questions: form.questions.map((question) => question.type !== "CUSTOM" ? {type: question.type} : {
      type: "CUSTOM", key: question.key, label: question.label,
      // Meta answers an unkeyed option with an unexplained 500.
      ...(question.options ? {options: question.options.map((value) => ({value,
        key: value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}))} : {}),
    }),
    privacy_policy: {url: site(form.privacyPath), link_text: `${brand.name} privacy policy`},
    thank_you_page: {title: form.thankYouTitle, body: form.thankYouBody,
      button_type: "VIEW_WEBSITE", button_text: form.thankYouButton,
      website_url: site(form.thankYouPath)},
  };
}

export function campaignParams(campaign) {
  return {name: campaign.name, objective: "OUTCOME_LEADS", status: "PAUSED",
    buying_type: "AUCTION", special_ad_categories: [],
    is_adset_budget_sharing_enabled: false};
}

export function adSetParams(policy, campaign, campaignId, excludedIds = []) {
  const {targeting} = campaign;
  return {
    name: `${campaign.name} | All cities`,
    campaign_id: campaignId,
    status: "PAUSED",
    daily_budget: String(campaign.dailyBudgetInr * 100),
    billing_event: "IMPRESSIONS",
    optimization_goal: "LEAD_GENERATION",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    destination_type: "ON_AD",
    promoted_object: {page_id: policy.pageId},
    targeting: {
      geo_locations: {cities: targeting.cities.map((key) => ({key}))},
      age_min: targeting.ageMin,
      age_max: 65,
      targeting_automation: {advantage_audience: targeting.advantageAudience ? 1 : 0},
      ...(excludedIds.length ? {excluded_custom_audiences: excludedIds.map((id) => ({id}))} : {}),
    },
  };
}

export function creativeParams(policy, campaign, ad, {imageHash, leadFormId}) {
  return {
    name: `${campaign.name} | ${ad.name}`,
    object_story_spec: {
      page_id: policy.pageId,
      ...(policy.instagramUserId ? {instagram_user_id: policy.instagramUserId} : {}),
      link_data: {
        image_hash: imageHash,
        link: site(campaign.landingPath),
        message: ad.primaryText,
        name: ad.headline,
        description: ad.description,
        call_to_action: {type: ad.callToAction, value: {lead_gen_form_id: leadFormId}},
      },
    },
  };
}

export function adParams(campaign, ad, adSetId, creativeId) {
  return {name: `${campaign.name} | ${ad.name}`, adset_id: adSetId,
    creative: {creative_id: creativeId}, status: "PAUSED"};
}

/** Crops a store board to a 4:5 feed image from the top (headline and phone). */
export async function renderFeedImage(relativePath) {
  const {default: sharp} = await import("sharp");
  return sharp(path.join(ROOT, relativePath)).resize({width: FEED.width})
    .extract({left: 0, top: 0, ...FEED}).jpeg({quality: 90}).toBuffer();
}

export function metaGraph({token, fetch = globalThis.fetch}) {
  if (!token) throw new Error("No Meta access token.");
  const call = async (method, route, params = {}, auth = token) => {
    const body = new URLSearchParams(Object.entries(params).map(([key, value]) =>
      [key, typeof value === "string" ? value : JSON.stringify(value)]));
    const url = method === "GET" && Object.keys(params).length ?
      `${GRAPH}/${route}?${body}` : `${GRAPH}/${route}`;
    const response = await fetch(url, {method,
      headers: {"Authorization": `Bearer ${auth}`,
        ...(method === "POST" ? {"Content-Type": "application/x-www-form-urlencoded"} : {})},
      ...(method === "POST" ? {body: body.toString()} : {})});
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.error) {
      const error = payload?.error ?? {};
      const detail = [error.message, error.error_user_title, error.error_user_msg]
        .filter(Boolean).join(" ");
      throw new Error(`Meta ${method} ${route.split("?")[0]} failed (${response.status}): ${detail || "no detail"}`);
    }
    return payload;
  };
  return {
    get: (route, params, auth) => call("GET", route, params, auth),
    post: (route, params, auth) => call("POST", route, params, auth),
    remove: (route) => call("DELETE", route),
  };
}

async function pageToken(api, pageId) {
  const pages = await api.get("me/accounts", {fields: "id,access_token", limit: "100"});
  return (pages.data ?? []).find((page) => page.id === pageId)?.access_token ?? null;
}

/** Reads the account, checks Page access and validates every create. Never writes. */
export async function planMetaCampaigns({policy, api, render = renderFeedImage}) {
  const act = `act_${policy.adAccountId}`;
  const existing = await api.get(`${act}/campaigns`, {fields: "id,name,status", limit: "200"});
  const campaigns = new Map((existing.data ?? []).map((row) => [row.name, row]));
  const keys = [...new Set(policy.campaigns.flatMap((campaign) => campaign.targeting.cities))];
  const places = await api.get("search", {type: "adgeolocationmeta", cities: keys});
  const cityNames = new Map(Object.entries(places.data?.cities ?? {})
    .map(([key, city]) => [key, city.name]));
  const blockers = [];
  const pageAccess = await pageToken(api, policy.pageId);
  let formIds = new Map();
  if (!pageAccess) {
    blockers.push("The CatchAds system user cannot manage the Page. In Business settings, assign the Page " +
      "(and its Instagram account) to CatchAds with ads and leads access, then regenerate its token with " +
      "pages_manage_ads, pages_read_engagement, pages_show_list, leads_retrieval and pages_manage_metadata.");
  } else {
    const forms = await api.get(`${policy.pageId}/leadgen_forms`, {fields: "id,name,status",
      limit: "200"}, pageAccess);
    // An archived form can't take leads, so it never counts as existing.
    formIds = new Map((forms.data ?? []).filter((form) => form.status === "ACTIVE")
      .map((form) => [form.name, form.id]));
  }
  // Exclusions are named audiences Catch maintains (the daily host list). One
  // that does not exist yet is skipped with a note, never a blocker: it is
  // created by its own job and added on the next run after that.
  const audiences = await api.get(`${act}/customaudiences`, {fields: "id,name", limit: "200"});
  const audienceIds = new Map((audiences.data ?? []).map((row) => [row.name, String(row.id)]));
  const notes = [];
  const excludedFor = (campaign) => {
    const ids = [];
    for (const name of campaign.targeting.excludeAudiences ?? []) {
      if (audienceIds.has(name)) ids.push(audienceIds.get(name));
      else notes.push(`${campaign.name}: audience "${name}" does not exist yet, so it is not excluded.`);
    }
    return ids;
  };
  const changes = [];
  for (const form of policy.leadForms) {
    changes.push(formIds.has(form.name) ?
      {kind: "keep", target: form.name, what: "lead form", id: formIds.get(form.name)} :
      {kind: "create", target: form.name, what: "lead form", params: leadFormParams(form)});
  }
  for (const campaign of policy.campaigns) {
    const missing = campaign.targeting.cities.filter((key) => !cityNames.has(key));
    if (missing.length) throw new Error(`Unknown Meta city keys: ${missing.join(", ")}.`);
    const excludedIds = excludedFor(campaign);
    if (campaigns.has(campaign.name)) {
      const row = campaigns.get(campaign.name);
      const adSets = await api.get(`${row.id}/adsets`, {fields: "id,name,targeting", limit: "50"});
      const adSet = (adSets.data ?? []).find((set) => set.name === `${campaign.name} | All cities`);
      const have = new Set((adSet?.targeting?.geo_locations?.cities ?? []).map((city) => String(city.key)));
      const want = new Set(campaign.targeting.cities);
      const add = [...want].filter((key) => !have.has(key));
      const remove = [...have].filter((key) => !want.has(key));
      const haveExcluded = new Set((adSet?.targeting?.excluded_custom_audiences ?? []).map((row) => String(row.id)));
      const excludeAdd = excludedIds.filter((id) => !haveExcluded.has(id));
      if (!adSet || (!add.length && !remove.length && !excludeAdd.length)) {
        changes.push({kind: "keep", target: campaign.name, what: "campaign", id: row.id, status: row.status});
        continue;
      }
      // Keep the ad set's own targeting (age, automation, exclusions added in
      // Ads Manager); replace its cities and add the declared exclusions.
      const excluded = [...haveExcluded, ...excludeAdd].map((id) => ({id}));
      const targeting = {...adSet.targeting,
        geo_locations: {...adSet.targeting.geo_locations, cities: campaign.targeting.cities.map((key) => ({key}))},
        ...(excluded.length ? {excluded_custom_audiences: excluded} : {})};
      await api.post(adSet.id, {targeting, execution_options: ["validate_only"]});
      changes.push({kind: "sync", target: campaign.name, what: "campaign", id: row.id, status: row.status,
        adSetId: adSet.id, targeting, addCities: add.map((key) => cityNames.get(key) ?? key), removeCities: remove,
        excludeAudiences: excludeAdd.length ? campaign.targeting.excludeAudiences
          .filter((name) => excludeAdd.includes(audienceIds.get(name))) : []});
      continue;
    }
    for (const ad of campaign.ads) {
      const image = await render(ad.image);
      if (!image?.length) throw new Error(`Could not render ${ad.image}.`);
    }
    await api.post(`${act}/campaigns`, {...campaignParams(campaign),
      execution_options: ["validate_only"]});
    changes.push({kind: "create", target: campaign.name, what: "campaign", campaign, excludedIds,
      cities: campaign.targeting.cities.map((key) => cityNames.get(key))});
  }
  return {adAccountId: policy.adAccountId, pageId: policy.pageId, blockers, notes, changes};
}

async function createCampaign({policy, api, campaign, leadFormId, excludedIds = [], render}) {
  const act = `act_${policy.adAccountId}`;
  const {id: campaignId} = await api.post(`${act}/campaigns`, campaignParams(campaign));
  const creatives = [];
  try {
    const {id: adSetId} = await api.post(`${act}/adsets`, adSetParams(policy, campaign, campaignId, excludedIds));
    for (const ad of campaign.ads) {
      const bytes = (await render(ad.image)).toString("base64");
      const uploaded = await api.post(`${act}/adimages`, {bytes});
      const imageHash = Object.values(uploaded.images ?? {})[0]?.hash;
      if (!imageHash) throw new Error(`Meta returned no image hash for ${ad.image}.`);
      const {id: creativeId} = await api.post(`${act}/adcreatives`,
        creativeParams(policy, campaign, ad, {imageHash, leadFormId}));
      creatives.push(creativeId);
      await api.post(`${act}/ads`, adParams(campaign, ad, adSetId, creativeId));
    }
    return campaignId;
  } catch (error) {
    // Leave nothing half-built: deleting the campaign removes its ad set and
    // ads; creatives live on the account, so they go one by one.
    await api.remove(campaignId).catch(() => {});
    for (const creativeId of creatives) await api.remove(creativeId).catch(() => {});
    throw new Error(`${error.message} (the partly created campaign was deleted)`);
  }
}

export async function applyMetaCampaigns({policy, plan, api, render = renderFeedImage}) {
  if (plan.blockers.length) throw new Error(`Cannot apply yet: ${plan.blockers.join(" ")}`);
  const auth = await pageToken(api, policy.pageId);
  const formIds = new Map(plan.changes.filter((change) => change.what === "lead form" && change.id)
    .map((change) => [change.target, change.id]));
  const created = [];
  for (const change of plan.changes) {
    if (change.kind !== "create" || change.what !== "lead form") continue;
    const {id} = await api.post(`${policy.pageId}/leadgen_forms`, change.params, auth);
    formIds.set(change.target, id);
    created.push(`lead form ${change.target}`);
  }
  for (const change of plan.changes) {
    if (change.kind !== "create" || change.what !== "campaign") continue;
    const leadFormId = formIds.get(change.campaign.leadForm);
    await createCampaign({policy, api, campaign: change.campaign, leadFormId,
      excludedIds: change.excludedIds, render});
    created.push(`campaign ${change.target}`);
  }
  for (const change of plan.changes) {
    if (change.kind !== "sync") continue;
    await api.post(change.adSetId, {targeting: change.targeting});
    created.push(`targeting synced on ${change.target}`);
  }
  return created;
}

function accessToken() {
  if (process.env.META_ADS_ACCESS_TOKEN) return process.env.META_ADS_ACCESS_TOKEN;
  return execFileSync("gcloud", ["secrets", "versions", "access", "latest",
    `--secret=${TOKEN_SECRET[0]}`, `--project=${TOKEN_SECRET[1]}`],
  {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {allowPositionals: false});
  if (args.help) {
    console.log("Usage: node tool/ads/apply_meta_campaigns.mjs [--apply] [--json]");
    return;
  }
  const policy = loadMetaCampaigns();
  const api = metaGraph({token: accessToken()});
  const plan = await planMetaCampaigns({policy, api});
  const summary = plan.changes.map(({kind, target, what, id, status, cities, campaign, addCities, removeCities,
    excludeAudiences}) =>
    ({kind, what, target, ...(id ? {id} : {}), ...(status ? {status} : {}),
      ...(cities ? {cities, ads: campaign.ads.length, dailyBudgetInr: campaign.dailyBudgetInr} : {}),
      ...(addCities ? {addCities, removeCities, excludeAudiences} : {})}));
  if (args.json) console.log(JSON.stringify({blockers: plan.blockers, notes: plan.notes, changes: summary}, null, 2));
  else {
    console.log(`Meta plan for act_${plan.adAccountId} (Page ${plan.pageId}):`);
    for (const change of summary) {
      if (change.kind === "keep") {
        console.log(`- keep ${change.what} ${change.target} (exists${change.status ? `, ${change.status}` : ""}; matches)`);
      } else if (change.kind === "sync") {
        const parts = [change.addCities.length ? `add ${change.addCities.join(", ")}` : "",
          change.removeCities.length ? `remove city keys ${change.removeCities.join(", ")}` : "",
          change.excludeAudiences.length ? `exclude ${change.excludeAudiences.join(", ")}` : ""].filter(Boolean);
        console.log(`- sync campaign ${change.target} (exists, ${change.status}; validated): ${parts.join("; ")}`);
      } else if (change.what === "campaign") {
        console.log(`- create campaign ${change.target} (PAUSED, ₹${change.dailyBudgetInr}/day, ` +
          `${change.ads} ads, validated) in ${change.cities.join(", ")}`);
      } else {
        console.log(`- create ${change.what} ${change.target}`);
      }
    }
    for (const note of plan.notes) console.log(`Note: ${note}`);
    for (const blocker of plan.blockers) console.log(`Blocked: ${blocker}`);
  }
  if (!args.apply) {
    if (summary.some((change) => change.kind !== "keep")) {
      console.log("Nothing was changed. Re-run with --apply to make these changes; new campaigns start paused.");
    }
    return;
  }
  const created = await applyMetaCampaigns({policy, plan, api});
  console.log(`Done: ${created.length ? created.join("; ") : "nothing"}. ` +
    "New campaigns are paused. Review them in Ads Manager.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
