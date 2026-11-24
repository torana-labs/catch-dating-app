#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {brand} from "@catch/brand";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {metaGraph} from "./apply_meta_campaigns.mjs";
import {googleAdsApi} from "./apply_google_campaigns.mjs";

// Plans, and with --apply creates, the retargeting audiences in
// ad_audiences.json: Meta custom audiences (website visitors from the Pixel,
// lead form and Page/Instagram engagement) and Google remarketing lists from
// the Google tag. It is create-only: an audience whose name already exists is
// left exactly as it is, and nothing is ever deleted, so the host list the
// Functions maintain ("Catch | Active hosts") is never touched. Google lists
// are attached to the named search campaign for observation only, so they
// never narrow who sees the ads. The default run reads both accounts and
// prints the plan without making anything. Tokens come from the same places
// as the campaign scripts and are never logged.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const POLICY_PATH = path.join(ROOT, "tool/ads/ad_audiences.json");
const DAY = 86_400;
const META_SOURCES = {
  pixel: {maxDays: 180},
  leadForm: {maxDays: 90},
  instagram: {maxDays: 365},
  page: {maxDays: 365},
};
const metaId = (value) => typeof value === "string" && /^[0-9]{5,20}$/.test(value);
const named = (value) => typeof value === "string" && value.startsWith("Catch | ") && value.length <= 100;

export function loadAdAudiences(file = POLICY_PATH) {
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  const {meta, google} = policy;
  if (policy.version !== 1 || !meta || !google) throw new Error("ad_audiences.json is not a version 1 policy.");
  for (const key of ["adAccountId", "pixelId", "pageId", "instagramUserId"]) {
    if (!metaId(meta[key])) throw new Error(`meta.${key} must be a Meta id.`);
  }
  if (!/^[0-9]{10}$/.test(google.customerId ?? "")) throw new Error("google.customerId must be a 10-digit id.");
  const names = new Set();
  const unique = (where, name) => {
    if (!named(name)) throw new Error(`${where} must be named "Catch | ..." (at most 100 characters).`);
    if (names.has(name)) throw new Error(`${where} "${name}" is declared twice.`);
    names.add(name);
  };
  for (const audience of meta.audiences ?? []) {
    const where = `Meta audience "${audience.name}"`;
    unique("Meta audience", audience.name);
    const source = META_SOURCES[audience.source];
    if (!source) throw new Error(`${where} has an unknown source.`);
    if (!Number.isInteger(audience.retentionDays) || audience.retentionDays < 1 ||
        audience.retentionDays > source.maxDays) {
      throw new Error(`${where} keeps people 1 to ${source.maxDays} days.`);
    }
    if (audience.source === "pixel" && Boolean(audience.urlContains) === Boolean(audience.event)) {
      throw new Error(`${where} needs exactly one of urlContains or event.`);
    }
    if (audience.source !== "pixel" && !audience.event) throw new Error(`${where} needs an event.`);
  }
  const googleNames = new Set();
  for (const audience of google.audiences ?? []) {
    const where = `Google audience "${audience.name}"`;
    unique("Google audience", audience.name);
    googleNames.add(audience.name);
    if (!Number.isInteger(audience.membershipDays) || audience.membershipDays < 1 ||
        audience.membershipDays > 540) {
      throw new Error(`${where} keeps people 1 to 540 days.`);
    }
    if (typeof audience.urlPath !== "string" || !/^\/[a-z0-9/-]*$/.test(audience.urlPath)) {
      throw new Error(`${where} needs a urlPath such as "/" or "/host".`);
    }
  }
  const observe = google.observeOn;
  if (observe) {
    if (typeof observe.campaign !== "string" || !observe.campaign.trim()) {
      throw new Error("google.observeOn needs a campaign name.");
    }
    for (const name of observe.audiences ?? []) {
      if (!googleNames.has(name)) throw new Error(`google.observeOn names an undeclared audience: ${name}`);
    }
  }
  return policy;
}

/** The Graph parameters that create one Meta custom audience. */
export function metaAudienceParams(meta, audience) {
  const retention_seconds = audience.retentionDays * DAY;
  const eventFilter = (value) => ({operator: "and", filters: [{field: "event", operator: "eq", value}]});
  const source = {
    pixel: {id: meta.pixelId, type: "pixel"},
    leadForm: {id: meta.pageId, type: "lead"},
    instagram: {id: meta.instagramUserId, type: "ig_business"},
    page: {id: meta.pageId, type: "page"},
  }[audience.source];
  const filter = audience.urlContains ?
    {operator: "and", filters: [{field: "url", operator: "i_contains", value: audience.urlContains}]} :
    eventFilter(audience.event);
  const rule = {inclusions: {operator: "or",
    rules: [{event_sources: [source], retention_seconds, filter}]}};
  if (audience.excludeEvent) {
    rule.exclusions = {operator: "or",
      rules: [{event_sources: [source], retention_seconds, filter: eventFilter(audience.excludeEvent)}]};
  }
  return {name: audience.name, description: audience.description ?? "", rule,
    ...(audience.source === "pixel" ? {prefill: true} : {})};
}

/** The brand domain plus a path: what a Google list's URL rule must contain. */
export function siteUrlFragment(urlPath) {
  return urlPath === "/" ? brand.web.domain : `${brand.web.domain}${urlPath}`;
}

/** The Google Ads mutate operation that creates one remarketing list. */
export function googleUserListOperation(audience) {
  return {userListOperation: {create: {
    name: audience.name,
    description: audience.description ?? "",
    membershipLifeSpan: String(audience.membershipDays),
    ruleBasedUserList: {
      prepopulationStatus: "REQUESTED",
      flexibleRuleUserList: {
        inclusiveRuleOperator: "AND",
        inclusiveOperands: [{rule: {ruleItemGroups: [{ruleItems: [{
          name: "url__",
          stringRuleItem: {operator: "CONTAINS", value: siteUrlFragment(audience.urlPath)},
        }]}]}}],
      },
    },
  }}};
}

const quote = (value) => `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

export async function planMetaAudiences({meta, api}) {
  const existing = await api.get(`act_${meta.adAccountId}/customaudiences`, {fields: "id,name", limit: "500"});
  const ids = new Map((existing.data ?? []).map((row) => [row.name, String(row.id)]));
  return (meta.audiences ?? []).map((audience) => ids.has(audience.name) ?
    {platform: "meta", kind: "keep", name: audience.name, id: ids.get(audience.name)} :
    {platform: "meta", kind: "create", name: audience.name, audience});
}

export async function planGoogleAudiences({google, api}) {
  const lists = await api.search("SELECT user_list.resource_name, user_list.name FROM user_list");
  const listByName = new Map(lists.map((row) => [row.userList.name, row.userList.resourceName]));
  const changes = (google.audiences ?? []).map((audience) => listByName.has(audience.name) ?
    {platform: "google", kind: "keep", name: audience.name, resourceName: listByName.get(audience.name)} :
    {platform: "google", kind: "create", name: audience.name, audience});
  const observe = google.observeOn;
  if (!observe) return {changes, notes: []};
  const campaigns = await api.search("SELECT campaign.resource_name, campaign.targeting_setting.target_restrictions " +
    `FROM campaign WHERE campaign.name = ${quote(observe.campaign)} AND campaign.status != 'REMOVED'`);
  if (!campaigns.length) return {changes, notes: [`Campaign "${observe.campaign}" not found; no lists attached.`]};
  const campaign = campaigns[0].campaign;
  const restrictions = campaign.targetingSetting?.targetRestrictions ?? [];
  const audienceRestriction = restrictions.find((row) => row.targetingDimension === "AUDIENCE");
  if (!audienceRestriction?.bidOnly) {
    changes.push({platform: "google", kind: "observe", name: observe.campaign,
      campaign: campaign.resourceName, restrictions});
  }
  const attached = await api.search("SELECT campaign_criterion.user_list.user_list FROM campaign_criterion " +
    `WHERE campaign.resource_name = ${quote(campaign.resourceName)} AND campaign_criterion.type = 'USER_LIST'`);
  const attachedLists = new Set(attached.map((row) => row.campaignCriterion?.userList?.userList));
  for (const name of observe.audiences ?? []) {
    const resourceName = listByName.get(name);
    if (resourceName && attachedLists.has(resourceName)) continue;
    changes.push({platform: "google", kind: "attach", name, campaign: campaign.resourceName, campaignName: observe.campaign});
  }
  return {changes, notes: []};
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Meta allows few audience writes a minute; one retry after its rate-limit answer. */
async function metaPost(api, route, params, wait) {
  try {
    return await api.post(route, params);
  } catch (error) {
    if (!/\(#(4|17|613|80003)\)|rate limit/i.test(error.message)) throw error;
    await wait(35_000);
    return api.post(route, params);
  }
}

export async function applyAudiences({policy, metaPlan, googlePlan, metaApi, googleApi, wait = sleep}) {
  // Google first: a Meta account that still needs its Custom Audience Terms
  // accepted must not hold up the Google lists.
  const done = [];
  const creates = googlePlan.filter((row) => row.kind === "create");
  const listByName = new Map(googlePlan.filter((row) => row.resourceName).map((row) => [row.name, row.resourceName]));
  if (creates.length) {
    const result = await googleApi.mutate(creates.map((row) => googleUserListOperation(row.audience)), false);
    (result.mutateOperationResponses ?? []).forEach((response, index) => {
      const resourceName = response.userListResult?.resourceName;
      listByName.set(creates[index].name, resourceName);
      done.push(`Google: created ${creates[index].name}`);
    });
  }
  const operations = [];
  for (const change of googlePlan) {
    if (change.kind === "observe") {
      const others = change.restrictions.filter((row) => row.targetingDimension !== "AUDIENCE");
      operations.push({campaignOperation: {
        update: {resourceName: change.campaign, targetingSetting: {targetRestrictions: [...others,
          {targetingDimension: "AUDIENCE", bidOnly: true}]}},
        updateMask: "targeting_setting.target_restrictions"}});
      done.push(`Google: ${change.name} set to observe audiences`);
    }
    if (change.kind === "attach") {
      const userList = listByName.get(change.name);
      if (!userList) throw new Error(`Google list "${change.name}" has no resource name to attach.`);
      operations.push({campaignCriterionOperation: {create: {campaign: change.campaign, userList: {userList}}}});
      done.push(`Google: attached ${change.name} to ${change.campaignName} (observe)`);
    }
  }
  if (operations.length) await googleApi.mutate(operations, false);
  for (const change of metaPlan.filter((row) => row.kind === "create")) {
    const created = await metaPost(metaApi, `act_${policy.meta.adAccountId}/customaudiences`,
      metaAudienceParams(policy.meta, change.audience), wait);
    done.push(`Meta: created ${change.name} (${created.id})`);
  }
  return done;
}

function metaToken() {
  if (process.env.META_ADS_ACCESS_TOKEN) return process.env.META_ADS_ACCESS_TOKEN;
  return execFileSync("gcloud", ["secrets", "versions", "access", "latest",
    "--secret=CATCH_META_ADS_TOKEN", "--project=catch-dating-app-64e51"],
  {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
}

function googleToken() {
  if (process.env.GOOGLE_ADS_ACCESS_TOKEN) return process.env.GOOGLE_ADS_ACCESS_TOKEN;
  return execFileSync("gcloud", ["auth", "print-access-token",
    "--impersonate-service-account=catch-ads-automation@catch-dating-app-64e51.iam.gserviceaccount.com",
    "--scopes=https://www.googleapis.com/auth/adwords"],
  {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {allowPositionals: false});
  if (args.help) {
    console.log("Usage: node tool/ads/apply_ad_audiences.mjs [--apply] [--json]");
    return;
  }
  const policy = loadAdAudiences();
  const metaApi = metaGraph({token: metaToken()});
  const googleApi = googleAdsApi({customerId: policy.google.customerId, token: googleToken()});
  const metaPlan = await planMetaAudiences({meta: policy.meta, api: metaApi});
  const {changes: googlePlan, notes} = await planGoogleAudiences({google: policy.google, api: googleApi});
  const rows = [...metaPlan, ...googlePlan].map(({platform, kind, name, id}) =>
    ({platform, kind, name, ...(id ? {id} : {})}));
  if (args.json) console.log(JSON.stringify({changes: rows, notes}, null, 2));
  else {
    console.log("Audience plan:");
    for (const row of rows) console.log(`- ${row.platform}: ${row.kind} ${row.name}`);
    for (const note of notes) console.log(`Note: ${note}`);
  }
  const pending = rows.filter((row) => row.kind !== "keep");
  if (!args.apply) {
    if (pending.length) console.log("Nothing was changed. Re-run with --apply to create these.");
    return;
  }
  for (const line of await applyAudiences({policy, metaPlan, googlePlan, metaApi, googleApi})) console.log(line);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
