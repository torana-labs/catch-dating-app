import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {brand} from "@catch/brand";
import {
  adSetParams,
  applyMetaCampaigns,
  campaignParams,
  creativeParams,
  leadFormParams,
  loadMetaCampaigns,
  metaGraph,
  planMetaCampaigns,
} from "./apply_meta_campaigns.mjs";
import {adTargetingFromCatalog, readMarketCatalog} from "../lib/market_catalog.mjs";

const policy = loadMetaCampaigns();
const campaign = policy.campaigns[0];
const liveForm = policy.leadForms.find((form) => form.name === campaign.leadForm);

function withPolicy(change, catalog) {
  const copy = structuredClone(policy);
  // The loader fills these in from the city catalog; the file never has them.
  for (const declared of copy.campaigns) { delete declared.targeting.cities; delete declared.targeting.markets; }
  change(copy);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "meta-ads-")), "p.json");
  fs.writeFileSync(file, JSON.stringify(copy));
  return () => loadMetaCampaigns(file, catalog);
}

test("the committed policy is valid and every campaign starts paused", () => {
  assert.ok(policy.campaigns.length > 0);
  for (const declared of policy.campaigns) assert.equal(declared.status, "PAUSED");
  for (const declared of policy.campaigns) {
    for (const ad of declared.ads) assert.ok(fs.existsSync(path.resolve(import.meta.dirname, "../..", ad.image)));
  }
});

test("policy guards: paused, prefix, budget, copy limits, mapped questions", () => {
  assert.throws(withPolicy((p) => { p.campaigns[0].status = "ACTIVE"; }), /created PAUSED/);
  assert.throws(withPolicy((p) => { p.campaigns[0].name = "Other"; }), /managed prefix/);
  assert.throws(withPolicy((p) => { p.campaigns[0].dailyBudgetInr = 50000; }), /between 100 and 5000/);
  assert.throws(withPolicy((p) => { p.campaigns[0].ads[0].headline = "x".repeat(41); }), /headline over 40/);
  assert.throws(withPolicy((p) => { p.campaigns[0].leadForm = "Catch Host | Missing"; }), /undeclared lead form/);
  assert.throws(withPolicy((p) => { p.campaigns[0].targeting.cities = ["1035921"]; }), /lists its own cities/);
  assert.throws(withPolicy((p) => { p.campaigns[0].targeting.adProgramme = "all"; }), /adProgramme must be/);
  assert.throws(withPolicy((p) => { p.campaigns[0].ads[0].image = "/tmp/x.png"; }), /store listing board/);
  assert.throws(withPolicy((p) => { p.campaigns[0].landingPath = "https://example.com/"; }), /site landing path/);
  assert.throws(withPolicy((p) => {
    p.leadForms[0].questions.push({type: "CUSTOM", key: "favourite_colour", label: "Colour"});
  }), /not read by the lead intake/);
  assert.throws(withPolicy((p) => {
    p.leadForms[0].questions = p.leadForms[0].questions.filter((q) => q.type !== "PHONE");
  }), /must ask for PHONE/);
});

test("the campaign's form asks for WhatsApp consent before Submit; old forms are history", () => {
  // hostLeadTemplates.ts welcomes a Meta lead only from a form with this line.
  assert.match(liveForm.consentLine, /WhatsApp/);
  const sent = leadFormParams(liveForm);
  assert.deepEqual(sent.custom_disclaimer, {body: {text: liveForm.consentLine}});
  assert.doesNotMatch(sent.thank_you_page.body, /WhatsApp/);
  const history = policy.leadForms.filter((form) => form.retired);
  assert.ok(history.length > 0);
  for (const form of history) assert.equal(leadFormParams(form).custom_disclaimer, undefined);
  assert.throws(withPolicy((p) => { p.campaigns[0].leadForm = history[0].name; }), /retired lead form/);
  assert.throws(withPolicy((p) => {
    p.leadForms.find((form) => form.consentLine).consentLine = "x".repeat(121);
  }), /consent line over 120/);
  assert.throws(withPolicy((p) => { p.leadForms[0].retired = "yes"; }), /retired must be true/);
});

test("cities come only from the city catalog", () => {
  const host = adTargetingFromCatalog(readMarketCatalog(), "host");
  assert.deepEqual(campaign.targeting.cities, host.metaCityKeys);
  const quiet = structuredClone(readMarketCatalog());
  for (const city of quiet.cities) if (city.ads) city.ads.host = "off";
  assert.throws(withPolicy(() => {}, quiet), /no city with host ads on/);
});

test("payloads: paused, lead objective, on-ad leads, Catch links", () => {
  const created = campaignParams(campaign);
  assert.equal(created.status, "PAUSED");
  assert.equal(created.objective, "OUTCOME_LEADS");
  assert.deepEqual(created.special_ad_categories, []);
  const adSet = adSetParams(policy, campaign, "120000000000001");
  assert.equal(adSet.status, "PAUSED");
  assert.equal(adSet.daily_budget, String(campaign.dailyBudgetInr * 100));
  assert.equal(adSet.optimization_goal, "LEAD_GENERATION");
  assert.equal(adSet.destination_type, "ON_AD");
  assert.deepEqual(adSet.promoted_object, {page_id: policy.pageId});
  assert.equal(adSet.targeting.geo_locations.cities.length, campaign.targeting.cities.length);
  const creative = creativeParams(policy, campaign, campaign.ads[0], {imageHash: "abc", leadFormId: "777"});
  const link = creative.object_story_spec.link_data;
  assert.equal(link.call_to_action.value.lead_gen_form_id, "777");
  assert.equal(new URL(link.link).origin, brand.web.origin);
  const form = leadFormParams(liveForm);
  assert.equal(form.is_optimized_for_quality, true);
  assert.equal(new URL(form.privacy_policy.url).origin, brand.web.origin);
  const keys = form.questions.filter((q) => q.type === "CUSTOM").map((q) => q.key);
  assert.deepEqual(keys, ["club_name", "instagram_handle", "event_cadence"]);
  const cadence = form.questions.find((q) => q.key === "event_cadence");
  assert.deepEqual(cadence.options[0], {value: "Every week", key: "every_week"});
  assert.ok(cadence.options.every((option) => /^[a-z0-9_]+$/.test(option.key)));
});

function fakeApi({pages = [], forms = [], campaigns = [], adSets = [], audiences = [], failOn = null} = {}) {
  const calls = [];
  let next = 100;
  return {
    calls,
    get: async (route, params, auth) => {
      calls.push(["GET", route, auth ?? null]);
      if (route === "me/accounts") return {data: pages};
      if (route.endsWith("/leadgen_forms")) return {data: forms};
      if (route.endsWith("/campaigns")) return {data: campaigns};
      if (route.endsWith("/adsets")) return {data: adSets};
      if (route.endsWith("/customaudiences")) return {data: audiences};
      if (route === "search") {
        return {data: {cities: Object.fromEntries(JSON.parse(JSON.stringify(params.cities))
          .map((key) => [key, {name: `City ${key}`}]))}};
      }
      throw new Error(`unexpected GET ${route}`);
    },
    post: async (route, params, auth) => {
      calls.push(["POST", route, params.execution_options ? "validate" : (auth ?? null)]);
      if (failOn && route.endsWith(failOn)) throw new Error(`Meta POST ${route} failed (400): bad`);
      if (params.execution_options) return {success: true};
      if (route.endsWith("/adimages")) return {images: {bytes: {hash: `hash${next++}`}}};
      return {id: String(next++)};
    },
    remove: async (route) => { calls.push(["DELETE", route]); return {success: true}; },
  };
}
const render = async () => Buffer.from("image");

test("without Page access the plan is blocked and apply refuses", async () => {
  const api = fakeApi();
  const plan = await planMetaCampaigns({policy, api, render});
  assert.equal(plan.blockers.length, 1);
  assert.match(plan.blockers[0], /assign the Page/);
  assert.ok(api.calls.some(([method, , mode]) => method === "POST" && mode === "validate"));
  await assert.rejects(applyMetaCampaigns({policy, plan, api, render}), /Cannot apply yet/);
  assert.ok(!api.calls.some(([method, , mode]) => method === "POST" && mode !== "validate"));
});

test("existing forms and campaigns are kept; new ones are created paused", async () => {
  const pages = [{id: policy.pageId, access_token: "page-token"}];
  const kept = await planMetaCampaigns({policy, render, api: fakeApi({pages,
    forms: [{id: "555", name: liveForm.name, status: "ACTIVE"}],
    campaigns: [{id: "1", name: campaign.name, status: "PAUSED"}]})});
  assert.deepEqual(kept.changes.map((c) => c.kind), ["keep", "keep"]);
  // A retired form is never planned again, even once Meta stops listing it.
  assert.deepEqual(kept.changes.map((c) => c.target), [liveForm.name, campaign.name]);
  const archived = await planMetaCampaigns({policy, render, api: fakeApi({pages,
    forms: [{id: "556", name: liveForm.name, status: "ARCHIVED"}]})});
  assert.equal(archived.changes[0].kind, "create");
  const api = fakeApi({pages});
  const plan = await planMetaCampaigns({policy, api, render});
  const created = await applyMetaCampaigns({policy, plan, api, render});
  assert.equal(created.length, 2);
  const form = api.calls.find(([, route]) => route.endsWith("/leadgen_forms") && route.startsWith(policy.pageId));
  assert.equal(form[2], "page-token");
  assert.equal(api.calls.filter(([m, r]) => m === "POST" && r.endsWith("/ads")).length, campaign.ads.length);
});

test("an existing campaign's cities follow the catalog", async () => {
  const pages = [{id: policy.pageId, access_token: "page-token"}];
  const forms = [{id: "555", name: liveForm.name, status: "ACTIVE"}];
  const campaigns = [{id: "1", name: campaign.name, status: "PAUSED"}];
  const adSet = (keys) => [{id: "9", name: `${campaign.name} | All cities`,
    targeting: {age_min: 21, geo_locations: {cities: keys.map((key) => ({key, name: "x"})), location_types: ["home"]}}}];
  const matching = await planMetaCampaigns({policy, render, api: fakeApi({pages, forms, campaigns,
    adSets: adSet(campaign.targeting.cities)})});
  assert.deepEqual(matching.changes.map((c) => c.kind), ["keep", "keep"]);
  const api = fakeApi({pages, forms, campaigns, adSets: adSet([...campaign.targeting.cities.slice(1), "111111"])});
  const drifted = await planMetaCampaigns({policy, render, api});
  const sync = drifted.changes.find((c) => c.kind === "sync");
  assert.equal(sync.addCities.length, 1);
  assert.deepEqual(sync.removeCities, ["111111"]);
  assert.deepEqual(sync.targeting.geo_locations.location_types, ["home"]);
  assert.equal(sync.targeting.age_min, 21);
  assert.ok(api.calls.some(([m, r, mode]) => m === "POST" && r === "9" && mode === "validate"));
  await applyMetaCampaigns({policy, plan: drifted, api, render, wait: async () => {}});
  assert.ok(api.calls.some(([m, r, mode]) => m === "POST" && r === "9" && mode !== "validate"));
});

test("the host list is excluded once it exists, keeping exclusions set by hand", async () => {
  // The retargeting exclusions (tool/ads/ad_audiences.json) follow the same
  // path; this test follows the host list alone.
  assert.deepEqual(campaign.targeting.excludeAudiences.slice(0, 1), ["Catch | Active hosts"]);
  const policy = loadMetaCampaigns();
  policy.campaigns[0].targeting.excludeAudiences = ["Catch | Active hosts"];
  const pages = [{id: policy.pageId, access_token: "page-token"}];
  const forms = [{id: "555", name: liveForm.name, status: "ACTIVE"}];
  const campaigns = [{id: "1", name: campaign.name, status: "PAUSED"}];
  const cities = campaign.targeting.cities.map((key) => ({key}));
  const adSets = (excluded) => [{id: "9", name: `${campaign.name} | All cities`,
    targeting: {age_min: 21, geo_locations: {cities},
      ...(excluded ? {excluded_custom_audiences: excluded} : {})}}];
  const waiting = await planMetaCampaigns({policy, render, api: fakeApi({pages, forms, campaigns,
    adSets: adSets(null)})});
  assert.deepEqual(waiting.changes.map((c) => c.kind), ["keep", "keep"]);
  assert.match(waiting.notes[0], /does not exist yet/);
  const audiences = [{id: "777", name: "Catch | Active hosts"}];
  const api = fakeApi({pages, forms, campaigns, audiences, adSets: adSets([{id: "42", name: "by hand"}])});
  const plan = await planMetaCampaigns({policy, render, api});
  const sync = plan.changes.find((c) => c.kind === "sync");
  assert.deepEqual(sync.excludeAudiences, ["Catch | Active hosts"]);
  assert.deepEqual(sync.targeting.excluded_custom_audiences, [{id: "42"}, {id: "777"}]);
  assert.deepEqual(plan.notes, []);
  const done = await planMetaCampaigns({policy, render, api: fakeApi({pages, forms, campaigns, audiences,
    adSets: adSets([{id: "777"}])})});
  assert.deepEqual(done.changes.map((c) => c.kind), ["keep", "keep"]);
  const created = adSetParams(policy, campaign, "1", ["777"]);
  assert.deepEqual(created.targeting.excluded_custom_audiences, [{id: "777"}]);
});

test("a failure part-way deletes the campaign made in that run", async () => {
  const api = fakeApi({pages: [{id: policy.pageId, access_token: "page-token"}], failOn: "/ads"});
  const plan = await planMetaCampaigns({policy, api, render});
  await assert.rejects(applyMetaCampaigns({policy, plan, api, render}), /partly created campaign was deleted/);
  // The campaign, then the one creative made before the first ad failed.
  assert.equal(api.calls.filter(([m]) => m === "DELETE").length, 2);
});

test("Graph errors name the call, never the token", async () => {
  const graph = metaGraph({token: "secret-token-value", fetch: async () =>
    new Response(JSON.stringify({error: {message: "Invalid parameter", error_user_msg: "Bad budget"}}),
      {status: 400})});
  await assert.rejects(graph.post("act_1/adsets", {name: "x"}), (error) => {
    assert.match(error.message, /act_1\/adsets failed \(400\): Invalid parameter Bad budget/);
    assert.doesNotMatch(error.message, /secret-token-value/);
    return true;
  });
});
