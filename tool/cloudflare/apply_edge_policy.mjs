#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";

// Plans, and with --apply makes, the catchdates.com Cloudflare zone match
// edge_policy.json: proxied DNS, TLS settings, Bot Fight Mode and AI-crawler
// blocking, one custom firewall rule and one rate-limit rule. The default run
// only reads and prints the plan. Rules whose description lacks the managed
// prefix belong to someone else and are kept exactly as they are. The token
// comes from CLOUDFLARE_API_TOKEN, set by the zone owner; it is never logged.

const API = "https://api.cloudflare.com/client/v4";
const POLICY_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "edge_policy.json");
const RULE_FIELDS = ["description", "expression", "action", "action_parameters", "ratelimit", "enabled"];

export function loadEdgePolicy(file = POLICY_PATH) {
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  if (policy.version !== 1 || typeof policy.zone !== "string" || typeof policy.managedPrefix !== "string") {
    throw new Error("edge_policy.json is not a version 1 policy.");
  }
  for (const [phase, rules] of Object.entries(policy.rulesets ?? {})) {
    for (const rule of rules) {
      if (!rule.description?.startsWith(policy.managedPrefix)) {
        throw new Error(`Every ${phase} rule must start with the managed prefix.`);
      }
    }
  }
  return policy;
}

export function cloudflareApi({token, fetch = globalThis.fetch}) {
  if (!token) throw new Error("Set CLOUDFLARE_API_TOKEN to a zone-scoped token before running.");
  const call = async (method, route, body) => {
    const response = await fetch(`${API}${route}`, {method,
      headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json"},
      ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    const payload = await response.json().catch(() => null);
    if (response.status === 404 && method === "GET") return null;
    if (!response.ok || payload?.success !== true) {
      const errors = (payload?.errors ?? []).map((error) => `${error.code}: ${error.message}`).join("; ");
      throw new Error(`Cloudflare ${method} ${route} failed (${response.status})${errors ? `: ${errors}` : ""}.`);
    }
    return payload.result;
  };
  return {get: (route) => call("GET", route), patch: (route, body) => call("PATCH", route, body),
    put: (route, body) => call("PUT", route, body)};
}

/** Reads the zone and lists what differs from the policy. Never writes. */
export async function planEdgePolicy({policy, api}) {
  const zones = await api.get(`/zones?name=${encodeURIComponent(policy.zone)}`);
  if (!Array.isArray(zones) || zones.length !== 1) throw new Error(`Zone ${policy.zone} was not found for this token.`);
  const zoneId = zones[0].id;
  const changes = [];
  const blockers = [];

  for (const [setting, value] of Object.entries(policy.settings ?? {})) {
    const current = await api.get(`/zones/${zoneId}/settings/${setting}`);
    if (current?.value !== value) changes.push({kind: "setting", target: setting, from: current?.value ?? null, to: value});
  }

  if (policy.botManagement) {
    const current = (await api.get(`/zones/${zoneId}/bot_management`)) ?? {};
    const differing = Object.entries(policy.botManagement).filter(([key, value]) => current[key] !== value);
    if (differing.length > 0) {
      changes.push({kind: "bot_management", target: "bot_management",
        from: Object.fromEntries(differing.map(([key]) => [key, current[key] ?? null])),
        to: Object.fromEntries(differing)});
    }
  }

  for (const [phase, desired] of Object.entries(policy.rulesets ?? {})) {
    const entrypoint = await api.get(`/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`);
    const existing = entrypoint?.rules ?? [];
    const managed = existing.filter((rule) => rule.description?.startsWith(policy.managedPrefix));
    if (!sameRules(managed, desired)) {
      const kept = existing.filter((rule) => !rule.description?.startsWith(policy.managedPrefix));
      changes.push({kind: "ruleset", target: phase, from: managed.map((rule) => rule.description),
        to: desired.map((rule) => rule.description), rules: [...kept.map(keepRule), ...desired]});
    }
  }

  // Proxying goes last in the plan: TLS must already be strict when traffic
  // starts flowing through Cloudflare.
  const records = (await api.get(`/zones/${zoneId}/dns_records?per_page=100`)) ?? [];
  for (const name of policy.dns?.proxied ?? []) {
    const matches = records.filter((record) => record.name === name && ["A", "AAAA", "CNAME"].includes(record.type));
    if (matches.length === 0) blockers.push(`No A, AAAA or CNAME record for ${name}.`);
    for (const record of matches) {
      if (record.proxiable === false) blockers.push(`${record.type} ${name} cannot be proxied.`);
      else if (record.proxied !== true) {
        changes.push({kind: "dns", target: `${record.type} ${name}`, recordId: record.id, from: false, to: true});
      }
    }
  }
  return {zone: policy.zone, zoneId, changes, blockers};
}

/** Makes the planned changes, in plan order. */
export async function applyEdgePlan({plan, api}) {
  if (plan.blockers.length > 0) throw new Error(`Resolve blockers first: ${plan.blockers.join(" ")}`);
  const zone = `/zones/${plan.zoneId}`;
  for (const change of plan.changes) {
    if (change.kind === "setting") await api.patch(`${zone}/settings/${change.target}`, {value: change.to});
    else if (change.kind === "bot_management") await api.put(`${zone}/bot_management`, change.to);
    else if (change.kind === "ruleset") await api.put(`${zone}/rulesets/phases/${change.target}/entrypoint`, {rules: change.rules});
    else if (change.kind === "dns") await api.patch(`${zone}/dns_records/${change.recordId}`, {proxied: true});
  }
  return plan.changes.length;
}

function keepRule(rule) {
  return Object.fromEntries(["id", ...RULE_FIELDS].filter((key) => rule[key] !== undefined).map((key) => [key, rule[key]]));
}

function sameRules(current, desired) {
  const shape = (rules) => JSON.stringify(rules.map((rule) => Object.fromEntries(RULE_FIELDS
    .filter((key) => key !== "enabled" && rule[key] !== undefined).map((key) => [key, rule[key]]))));
  return current.length === desired.length && current.every((rule) => rule.enabled !== false) &&
    shape(current) === shape(desired);
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {allowPositionals: false});
  if (args.help) {
    console.log("Usage: CLOUDFLARE_API_TOKEN=... node tool/cloudflare/apply_edge_policy.mjs [--apply] [--json]");
    return;
  }
  const policy = loadEdgePolicy();
  const api = cloudflareApi({token: process.env.CLOUDFLARE_API_TOKEN});
  const plan = await planEdgePolicy({policy, api});
  const summary = {zone: plan.zone, blockers: plan.blockers,
    changes: plan.changes.map(({kind, target, from, to}) => ({kind, target, from, to}))};
  console.log(args.json ? JSON.stringify(summary, null, 2) : formatPlan(summary));
  if (!args.apply) return;
  const applied = await applyEdgePlan({plan, api});
  console.log(`Applied ${applied} change(s). Run again without --apply to confirm nothing is left.`);
}

function formatPlan({zone, blockers, changes}) {
  const lines = [`Cloudflare edge plan for ${zone}: ${changes.length} change(s).`];
  for (const change of changes) lines.push(`- ${change.kind} ${change.target}: ${JSON.stringify(change.from)} -> ${JSON.stringify(change.to)}`);
  for (const blocker of blockers) lines.push(`! ${blocker}`);
  if (changes.length > 0) lines.push("Nothing was changed. Re-run with --apply to make these changes.");
  return lines.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
