import assert from "node:assert/strict";
import test from "node:test";
import {applyEdgePlan, cloudflareApi, loadEdgePolicy, planEdgePolicy} from "./apply_edge_policy.mjs";

const ZONE = "zone-1";
const policy = loadEdgePolicy();

// A fake Cloudflare API holding one zone's state and recording every write.
function fakeCloudflare(state = {}) {
  const zone = {
    settings: {ssl: "full", always_use_https: "off", min_tls_version: "1.0", browser_check: "on", ...state.settings},
    bot: {fight_mode: false, ai_bots_protection: "disabled", enable_js: false, is_robots_txt_managed: true, ...state.bot},
    rulesets: structuredClone(state.rulesets ?? {}),
    dns: structuredClone(state.dns ?? [
      {id: "a1", type: "A", name: "catchdates.com", content: "199.36.158.100", proxied: false, proxiable: true},
      {id: "c1", type: "CNAME", name: "www.catchdates.com", content: "catch-dating-app-64e51.web.app", proxied: false, proxiable: true},
      {id: "t1", type: "TXT", name: "catchdates.com", content: "hosting-site=catch-dating-app-64e51", proxied: false, proxiable: false},
    ]),
  };
  const writes = [];
  const ok = (result) => ({ok: true, status: 200, json: async () => ({success: true, result})});
  const fetch = async (url, {method, headers, body}) => {
    assert.equal(headers.Authorization, "Bearer test-token");
    const route = url.replace("https://api.cloudflare.com/client/v4", "");
    const data = body ? JSON.parse(body) : undefined;
    if (method !== "GET") writes.push({method, route, data});
    if (route === "/zones?name=catchdates.com") return ok([{id: ZONE, name: "catchdates.com"}]);
    let match = route.match(/^\/zones\/zone-1\/settings\/(\w+)$/u);
    if (match) {
      if (method === "PATCH") zone.settings[match[1]] = data.value;
      return ok({id: match[1], value: zone.settings[match[1]]});
    }
    if (route === "/zones/zone-1/bot_management") {
      if (method === "PUT") Object.assign(zone.bot, data);
      return ok(zone.bot);
    }
    match = route.match(/^\/zones\/zone-1\/rulesets\/phases\/(\w+)\/entrypoint$/u);
    if (match) {
      if (method === "PUT") zone.rulesets[match[1]] = {rules: data.rules};
      if (!zone.rulesets[match[1]]) return {ok: false, status: 404, json: async () => ({success: false, errors: []})};
      return ok(zone.rulesets[match[1]]);
    }
    if (route.startsWith("/zones/zone-1/dns_records?")) return ok(zone.dns);
    match = route.match(/^\/zones\/zone-1\/dns_records\/(\w+)$/u);
    if (match) {
      zone.dns.find((record) => record.id === match[1]).proxied = data.proxied;
      return ok({});
    }
    throw new Error(`Unexpected ${method} ${route}`);
  };
  return {zone, writes, api: cloudflareApi({token: "test-token", fetch})};
}

test("planning reads the zone and writes nothing", async () => {
  const cf = fakeCloudflare();
  const plan = await planEdgePolicy({policy, api: cf.api});
  assert.equal(cf.writes.length, 0);
  assert.deepEqual(plan.blockers, []);
  assert.deepEqual(plan.changes.map((change) => `${change.kind} ${change.target}`), [
    "setting ssl", "setting always_use_https", "setting min_tls_version", "bot_management bot_management",
    "ruleset http_request_firewall_custom", "ruleset http_ratelimit", "dns A catchdates.com",
    "dns CNAME www.catchdates.com",
  ]);
});

test("applying makes TLS strict before proxying and then has nothing left to do", async () => {
  const cf = fakeCloudflare();
  await applyEdgePlan({plan: await planEdgePolicy({policy, api: cf.api}), api: cf.api});
  const order = cf.writes.map((write) => write.route);
  assert.ok(order.indexOf("/zones/zone-1/settings/ssl") < order.indexOf("/zones/zone-1/dns_records/a1"));
  assert.deepEqual([cf.zone.settings.ssl, cf.zone.bot.fight_mode, cf.zone.bot.ai_bots_protection],
    ["strict", true, "block"]);
  assert.deepEqual(cf.zone.dns.filter((record) => record.type !== "TXT").map((record) => record.proxied), [true, true]);
  assert.equal(cf.zone.dns.find((record) => record.type === "TXT").proxied, false);
  const replan = await planEdgePolicy({policy, api: cf.api});
  assert.deepEqual(replan.changes, []);
});

test("rules someone else made are kept exactly as they are", async () => {
  const theirs = {id: "r-theirs", description: "Owner's own geo block", expression: "ip.geoip.country eq \"XX\"",
    action: "block", enabled: true, version: "3", last_updated: "2026-10-01"};
  const cf = fakeCloudflare({rulesets: {http_request_firewall_custom: {rules: [theirs]}}});
  await applyEdgePlan({plan: await planEdgePolicy({policy, api: cf.api}), api: cf.api});
  const rules = cf.zone.rulesets.http_request_firewall_custom.rules;
  assert.deepEqual(rules[0], {id: "r-theirs", description: "Owner's own geo block",
    expression: "ip.geoip.country eq \"XX\"", action: "block", enabled: true});
  assert.equal(rules.length, 2);
  assert.ok(rules[1].description.startsWith(policy.managedPrefix));
});

test("a missing record or an unknown zone stops the run", async () => {
  const cf = fakeCloudflare({dns: []});
  const plan = await planEdgePolicy({policy, api: cf.api});
  assert.equal(plan.blockers.length, 2);
  await assert.rejects(applyEdgePlan({plan, api: cf.api}), /Resolve blockers first/u);
  assert.equal(cf.writes.length, 0);
  await assert.rejects(planEdgePolicy({policy: {...policy, zone: "other.com"}, api: cf.api}), /Unexpected GET/u);
});

test("no token, no run; API errors name the call but never the token", async () => {
  assert.throws(() => cloudflareApi({token: ""}), /CLOUDFLARE_API_TOKEN/u);
  const api = cloudflareApi({token: "secret-token", fetch: async () => ({ok: false, status: 403,
    json: async () => ({success: false, errors: [{code: 10000, message: "Authentication error"}]})})});
  await assert.rejects(api.patch("/zones/z/settings/ssl", {value: "strict"}), (error) =>
    /PATCH \/zones\/z\/settings\/ssl failed \(403\): 10000: Authentication error/u.test(error.message) &&
    !error.message.includes("secret-token"));
});

test("every managed rule carries the managed prefix", () => {
  for (const rules of Object.values(policy.rulesets)) {
    for (const rule of rules) assert.ok(rule.description.startsWith(policy.managedPrefix));
  }
  assert.equal(policy.rulesets.http_ratelimit.length, 1, "the free plan allows one rate-limit rule");
});
