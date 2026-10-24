import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {configuredDomainTarget, parseDomainOperatorArgs, verifyDomainProviderTarget, runDomainOperator} from "./form_domain_operator.mjs";

const base = ["--env", "prod", "--hostname", "forms.client.example"];
const owner = ["--organizer-id", "organizer-1", "--form-id", "form-1", "--requested-by-manager", "manager-1"];
const activate = [...base, "--action", "activate", ...owner, "--generation", "2", "--site-key", "public_site_key_for_website"];

test("operator defaults read-only and production apply requires an explicit guard", () => {
  const status = parseDomainOperatorArgs(base);
  assert.equal(status.action, "status"); assert.equal(status.apply, false);
  const plan = parseDomainOperatorArgs(activate);
  assert.equal(plan.apply, false); assert.equal(plan.generation, 2);
  assert.throws(() => parseDomainOperatorArgs([...activate, "--apply"]), /allow-prod/);
  assert.equal(parseDomainOperatorArgs([...activate, "--apply", "--allow-prod"]).apply, true);
  assert.throws(() => parseDomainOperatorArgs([...base, "--apply", "--allow-prod"]), /Status cannot/);
});

test("operator arguments reject duplicates, missing values and ambiguous generation", () => {
  for (const args of [[], ["--env", "dev"], [...base, "--env", "dev"], [...base, "--site-key"],
    [...base, "--unknown"], [...base, "--action", "delete-everything"],
    [...base, "--action", "reserve"], [...base, "--action", "verify", ...owner],
    [...base, "--action", "reserve", ...owner, "--generation", "1"],
    [...base, "--action", "activate", ...owner, "--generation", "1"]]) {
    assert.throws(() => parseDomainOperatorArgs(args));
  }
  for (const generation of ["0", "-1", "01", "1.5", "1e3", "9007199254740992"]) {
    assert.throws(() => parseDomainOperatorArgs([...base, "--action", "verify", ...owner, "--generation", generation]), /positive safe/);
  }
});

test("configured production target is the marketing site and dev has no invented fallback", () => {
  const target = configuredDomainTarget(parseDomainOperatorArgs(base));
  assert.equal(target.projectId, "catch-dating-app-64e51");
  assert.equal(target.siteId, "catch-dating-app-64e51");
  assert.equal(target.expectedCname, "catch-dating-app-64e51.web.app");
  assert.equal(target.hostname, "forms.client.example");
  assert.throws(() => configuredDomainTarget(parseDomainOperatorArgs(["--env", "dev", "--hostname", "forms.client.example"])), /exactly one marketing/);
  assert.throws(() => configuredDomainTarget(parseDomainOperatorArgs([...base.slice(0, 3), "Forms.client.example"])), /canonical subdomain/);
});

test("live target verification must bind project ID, number, active state and exact site", async () => {
  const target = configuredDomainTarget(parseDomainOperatorArgs(base));
  const project = {name: `projects/${target.projectNumber}`, projectId: target.projectId, state: "ACTIVE"};
  const site = {name: target.parent, defaultUrl: `https://${target.siteId}.web.app`};
  for (const [first, second, expected] of [
    [project, site, true], [{...project, name: "projects/999999"}, site, false],
    [{...project, projectId: "other-project"}, site, false], [{...project, state: "DELETE_REQUESTED"}, site, false],
    [project, {...site, name: "projects/999/sites/other"}, false],
    [project, {...site, defaultUrl: "https://catchdates-host.web.app"}, false],
  ]) {
    const calls = [];
    const run = () => verifyDomainProviderTarget(target, {request: async (config) => {
      calls.push(config); return {status: 200, data: calls.length === 1 ? first : second};
    }});
    if (expected) assert.equal((await run()).siteId, target.siteId);
    else await assert.rejects(run, /does not match/);
    assert.ok(calls.every((call) => call.method === "GET" && call.retry === false && call.maxRedirects === 0));
  }
});


function operatorFixture({action = "activate", apply = false} = {}) {
  const args = {environment: "dev", hostname: "forms.client.example", action, apply,
    organizerId: "org", formId: "form", managerUid: "manager", generation: 1};
  const target = {projectId: "catchdates-dev", projectNumber: "1234567890",
    siteId: "catchdates-forms-dev", hostname: args.hostname,
    parent: "projects/1234567890/sites/catchdates-forms-dev",
    expectedCname: "catchdates-forms-dev.web.app", appId: "1:1234567890:web:abcdef",
    bucket: "catchdates-dev.firebasestorage.app", siteKey: "test_enterprise_public_site_key"};
  const clock = 1_700_000_000_000;
  let record = {hostname: args.hostname, organizerId: "org", formId: "form", publicFormId: "public",
    generation: 1, status: "verified", expectedCname: target.expectedCname,
    ownershipChallenge: "challenge", pendingExpiresAtMillis: clock + 1000};
  const state = {
    auth: {name: `projects/${target.projectNumber}/config`, authorizedDomains: [target.hostname]},
    app: {name: `projects/${target.projectNumber}/apps/${target.appId}/recaptchaEnterpriseConfig`, siteKey: target.siteKey},
    key: {name: `projects/${target.projectNumber}/keys/${target.siteKey}`,
      webSettings: {integrationType: "SCORE", allowedDomains: [target.hostname]}},
    bucket: {name: target.bucket, metageneration: "1", cors: [{origin: [`https://${target.hostname}`], method: ["POST"]}]},
    hosting: {name: `${target.parent}/customDomains/${target.hostname}`, hostState: "HOST_ACTIVE",
      ownershipState: "OWNERSHIP_ACTIVE", cert: {state: "CERT_ACTIVE", expireTime: new Date(clock + 86400000).toISOString()}},
  };
  const calls = []; const writes = [];
  let guard = async () => {};
  let probe = {hostname: target.hostname, checkedAtMillis: clock, txtValues: ["challenge"], cnameTarget: target.expectedCname};
  const registry = {
    assertOrganizerFormDomainBinding: async (_db, expected, uid, statuses) => {
      await guard();
      assert.equal(uid, "manager");
      if (record.generation !== expected.generation || !statuses.includes(record.status)) throw new Error("binding changed");
      return record;
    },
    probeFormDomain: async () => probe,
    activateOrganizerFormDomain: async (_db, input, now) => {
      assert.equal(input.expected.generation, 1);
      assert.equal(input.trustedProjectId, target.projectId);
      assert.equal(input.certificate.projectId, target.projectId);
      assert.equal(input.certificate.siteId, target.siteId);
      assert.equal(input.certificate.observedAtMillis, now());
      writes.push("activate"); record = {...record, status: "active"};
    },
    revokeOrganizerFormDomain: async (_db, _host, _org, _uid, _authority, expected) => {
      assert.equal(expected.generation, 1); writes.push("revoke"); record = {...record, status: "revoked"};
    },
  };
  const policy = {
    normalizeCustomFormHost: (host) => host.endsWith(".catchdates.com") ? null : host,
    parseOrganizerFormDomain: (value) => value,
    hasCurrentDomainOwnership: (current, proof) => proof?.txtValues.includes(current.ownershipChallenge) &&
      proof.cnameTarget === current.expectedCname,
  };
  const db = {collection: () => ({doc: () => ({get: async () => ({exists: true, data: () => structuredClone(record)})})})};
  const request = async (config) => {
    calls.push(config);
    if (config.method !== "GET") throw new Error("unexpected provider write");
    const data = config.url.includes("cloudresourcemanager") ? {name: `projects/${target.projectNumber}`,
      projectId: target.projectId, state: "ACTIVE"} : config.url.endsWith(target.parent) ?
      {name: target.parent, defaultUrl: `https://${target.siteId}.web.app`} :
      config.url.includes("customDomains") ? state.hosting : config.url.includes("identitytoolkit") ? state.auth :
      config.url.includes("firebaseappcheck") ? state.app : config.url.includes("recaptchaenterprise") ? state.key : state.bucket;
    return {status: 200, data: structuredClone(data)};
  };
  return {args, target, state, calls, writes, setRecord: (value) => {record = {...record, ...value};},
    setGuard: (fn) => {guard = fn;}, setProbe: (value) => {probe = value;},
    run: () => runDomainOperator(args, {target, db, registry, policy, request, now: () => clock,
      assertManager: async () => {}})};
}

test("activation plan stays read-only and apply uses fresh provider evidence, not a flag", async () => {
  const h = operatorFixture();
  const planned = await h.run();
  assert.equal(planned.nextAction, "activate-with-apply"); assert.deepEqual(h.writes, []);
  assert.ok(h.calls.every((call) => call.method === "GET"));
  assert.equal("state" in planned.origins, false);
  h.args.apply = true;
  const applied = await h.run();
  assert.deepEqual(h.writes, ["activate"]); assert.equal(applied.registry.status, "active");
  assert.equal(applied.nextAction, "browser-acceptance");
  assert.equal(h.calls.filter((call) => call.url.includes("customDomains")).length, 4);
});

test("activation refuses unready hosting, origin grants, wrong bindings and changed authority", async () => {
  for (const change of ["certificate", "origin", "dns", "generation", "form", "authority", "reserved-host"]) {
    const h = operatorFixture({apply: true});
    if (change === "certificate") h.state.hosting.cert.state = "CERT_VALIDATING";
    if (change === "origin") h.state.auth.authorizedDomains = [];
    if (change === "dns") h.setProbe(null);
    if (change === "generation") h.setRecord({generation: 2});
    if (change === "form") h.setRecord({formId: "other"});
    if (change === "authority") h.setGuard(async () => {throw new Error("manager revoked");});
    if (change === "reserved-host") h.target.hostname = "forms.catchdates.com";
    await assert.rejects(h.run);
    assert.deepEqual(h.writes, [], change);
    assert.ok(h.calls.every((call) => call.method === "GET"));
  }
});

test("revocation precedes origin removal and exact generation is retained", async () => {
  const h = operatorFixture({action: "remove-origins", apply: true});
  await assert.rejects(h.run, /binding changed/);
  assert.deepEqual(h.writes, []);
  h.args.action = "revoke";
  const result = await h.run();
  assert.deepEqual(h.writes, ["revoke"]);
  assert.equal(result.registry.status, "revoked");
  assert.equal(result.nextAction, "remove-origins");
  assert.ok(h.calls.every((call) => call.method === "GET"));
});

test("production protection follows the resolved project even for a dev alias", async () => {
  const h = operatorFixture({apply: true});
  h.target.projectId = "catch-dating-app-64e51";
  await assert.rejects(h.run, /allow-prod/);
  assert.equal(h.calls.length, 0);
  assert.deepEqual(h.writes, []);
});


test("Deploy backend forwards every environment variable, including the domain target, to parameter materialization", () => {
  const source = fs.readFileSync(new URL("../../.github/workflows/_backend-deploy.yml", import.meta.url), "utf8");
  const steps = source.split(/(?=^      - )/mu)
    .filter((step) => step.includes("tool/firebase/prepare_functions_params_for_deploy.mjs"));
  assert.equal(steps.length, 1);
  assert.match(steps[0], /^          ENVIRONMENT_VARIABLES: \$\{\{ toJSON\(vars\) \}\}$/mu);
});
