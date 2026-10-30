import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {probePage, productionProbeContracts} from "./probeProduction.mjs";

const contract = {
  path: "/privacy/",
  title: "Privacy policy | Catch",
  canonicalPath: "/privacy/",
  markers: ["Privacy policy"],
};

test("production probes include the dynamic public Forms runtime", () => {
  assert.deepEqual(
    productionProbeContracts.find((entry) => entry.path.startsWith("/f/")),
    {
      path: "/f/__catch_public_form_route_probe__/",
      title: "Organizer form | Catch",
      canonicalPath: "/f/",
      markers: [],
    }
  );
});

test("production probe accepts the expected route contract", async () => {
  const result = await probePage({
    baseUrl: "https://catchdates.com",
    contract,
    timeoutMs: 100,
    fetchImpl: async () => new Response(
      '<title>Privacy policy | Catch</title><link rel="canonical" href="https://catchdates.com/privacy/" /><h1>Privacy policy</h1>',
      {status: 200}
    ),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});
test("production probe reports status, metadata, and content drift", async () => {
  const result = await probePage({
    baseUrl: "https://catchdates.com",
    contract,
    timeoutMs: 100,
    fetchImpl: async () => new Response("not found", {status: 404}),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.findings, [
    "expected HTTP 200, received 404",
    "missing title: Privacy policy | Catch",
    "missing canonical: https://catchdates.com/privacy/",
    "missing marker: Privacy policy",
  ]);
});


test("production probes check the retired directory's redirect to Explore", async () => {
  const directory = productionProbeContracts.find((entry) => entry.path === "/organizers/");
  assert.deepEqual(directory, {path: "/organizers/", status: 301, location: "/explore/?show=organisers"});
  const redirect = (location, status = 301) => async () => new Response(null, {status, headers: location ? {location} : {}});
  for (const location of ["https://catchdates.com/explore/?show=organisers", "/explore/?show=organisers"]) {
    const result = await probePage({baseUrl: "https://catchdates.com", contract: directory, timeoutMs: 100, fetchImpl: redirect(location)});
    assert.deepEqual(result.findings, []);
  }
  const stale = await probePage({baseUrl: "https://catchdates.com", contract: directory, timeoutMs: 100,
    fetchImpl: async () => new Response("<title>Organisers, clubs and communities | Catch</title>", {status: 200})});
  assert.deepEqual(stale.findings, ["expected HTTP 301, received 200",
    "expected redirect to https://catchdates.com/explore/?show=organisers, received none"]);
  const elsewhere = await probePage({baseUrl: "https://catchdates.com", contract: directory, timeoutMs: 100,
    fetchImpl: redirect("https://unrelated.example/explore/?show=organisers")});
  assert.equal(elsewhere.ok, false);
});

test("production probes follow the canonical organiser and preserved visitor metadata", () => {
  const meta = JSON.parse(fs.readFileSync(new URL("../src/content/meta.json", import.meta.url), "utf8"));
  for (const [path, routeId] of [["/", "home"], ["/explore/", "visitor_discovery"], ["/host/apply/", "host_apply"]]) {
    const probe = productionProbeContracts.find((entry) => entry.path === path);
    const route = meta.routes[routeId];
    assert.ok(probe, `missing production probe for ${path}`);
    assert.equal(probe.title, route.title);
    assert.equal(probe.canonicalPath, route.canonicalPath);
    for (const marker of probe.markers) assert.ok(route.description.includes(marker), `marker must exist in the generated ${path} metadata`);
  }
});
