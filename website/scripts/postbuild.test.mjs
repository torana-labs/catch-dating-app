import {retiredMarketingDestination} from "../src/app/retiredMarketingRoutes.ts";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const scriptPath = fileURLToPath(new URL("./postbuild.mjs", import.meta.url));
const canonicalMetaPath = fileURLToPath(
  new URL("../src/content/meta.json", import.meta.url)
);

test("postbuild writes route metadata, robots, and an indexable-only sitemap", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-postbuild-"));
  const distRoot = path.join(tmpRoot, "dist");
  const hostListingsPath = path.join(tmpRoot, "hostListings.json");
  fs.mkdirSync(distRoot, {recursive: true});
  fs.writeFileSync(path.join(distRoot, "index.html"), baseHtml());
  for (const slug of ["overview", "platform", "workflows", "planners", "mixers", "clubs", "stack", "directory", "claim", "preview"]) {
    fs.mkdirSync(path.join(distRoot, "host", slug), {recursive: true});
    fs.writeFileSync(path.join(distRoot, "host", slug, "index.html"), "Retired page");
  }
  fs.mkdirSync(path.join(distRoot, "events", "stale-private-event"), {recursive: true});
  fs.writeFileSync(path.join(distRoot, "events", "stale-private-event", "index.html"), "Private event");
  fs.writeFileSync(
    hostListingsPath,
    `${JSON.stringify(hostListings(), null, 2)}\n`
  );

  execFileSync(process.execPath, [
    scriptPath,
    "--dist-root",
    distRoot,
    "--host-listings",
    hostListingsPath,
    "--base-url",
    "https://example.test",
  ], {stdio: "pipe"});

  for (const slug of ["overview", "platform", "workflows", "planners", "mixers", "clubs", "stack", "directory", "claim", "preview"]) {
    assert.equal(fs.existsSync(path.join(distRoot, "host", slug)), false, `retired ${slug} must not survive a rebuild`);
  }
  const listingHtml = fs.readFileSync(
    path.join(distRoot, "organizers", "afterfly", "index.html"),
    "utf8"
  );
  assert.match(listingHtml, /<title>AFTER FLY \| Indore events &amp; reviews \| Catch<\/title>/);
  assert.match(
    listingHtml,
    /<link rel="canonical" href="https:\/\/example\.test\/organizers\/afterfly\/" \/>/
  );
  assert.match(listingHtml, /<meta name="robots" content="index, follow" \/>/);
  assert.match(listingHtml, /data-static-organizer-profile="true"/);
  assert.match(listingHtml, /<h1>AFTER FLY<\/h1>/);
  assert.match(listingHtml, /<h2>Public sources<\/h2>/);
  assert.match(listingHtml, /type="application\/ld\+json"/);
  assert.match(listingHtml, /"@type":"Organization"/);
  assert.match(listingHtml, /"@type":"BreadcrumbList"/);

  assert.equal(fs.existsSync(path.join(distRoot, "events", "afterfly-catch-event", "index.html")), false);
  assert.equal(fs.existsSync(path.join(distRoot, "events", "stale-private-event")), false);
  const eventShell = fs.readFileSync(path.join(distRoot, "events", "index.html"), "utf8");
  assert.doesNotMatch(eventShell, /Afterfly Catch social run|application\/ld\+json/);
  assert.match(eventShell, /noindex, follow/);

  const externalEventHtml = fs.readFileSync(
    path.join(distRoot, "events", "afterfly-external-event", "index.html"),
    "utf8"
  );
  assert.match(externalEventHtml, /Afterfly external social run/);
  assert.match(externalEventHtml, /https:\/\/luma\.com\/afterfly-external/);
  assert.match(externalEventHtml, /"sameAs":"https:\/\/luma\.com\/afterfly-external"/);

  const legacyHtml = fs.readFileSync(
    path.join(distRoot, "organizers", "indore", "afterfly-run-club", "index.html"),
    "utf8"
  );
  assert.match(legacyHtml, /<meta name="robots" content="noindex, follow" \/>/);
  assert.match(
    legacyHtml,
    /<link rel="canonical" href="https:\/\/example\.test\/organizers\/afterfly\/" \/>/
  );

  const claimHtml = fs.readFileSync(
    path.join(distRoot, "claim", "index.html"),
    "utf8"
  );
  assert.match(claimHtml, /<title>Claim your organizer page \| Catch<\/title>/);
  assert.match(
    claimHtml,
    /<link rel="canonical" href="https:\/\/example\.test\/claim\/" \/>/
  );
  assert.match(claimHtml, /<meta name="robots" content="noindex, follow" \/>/);
  const runtimeHtml = fs.readFileSync(
    path.join(distRoot, "join", "index.html"),
    "utf8"
  );
  assert.match(runtimeHtml, /<title>Event mode \| Catch<\/title>/);
  assert.match(runtimeHtml, /<meta name="robots" content="noindex, follow" \/>/);

  for (const [route, title] of [
    ["privacy", "Privacy policy"],
    ["terms", "Terms of use"],
    ["help", "Help and safety"],
    ["delete-account", "Delete your account"],
    ["refunds", "Refund and cancellation policy"],
    ["contact", "Contact us"],
  ]) {
    const legalHtml = fs.readFileSync(path.join(distRoot, route, "index.html"), "utf8");
    assert.match(legalHtml, new RegExp(`<h1>${title}<\\/h1>`));
    assert.match(legalHtml, new RegExp(`data-static-legal-page="/${route}/"`));
    assert.match(
      legalHtml,
      new RegExp(`canonical" href="https:\\/\\/example\\.test\\/${route}\\/"`)
    );
  }

  const notFoundHtml = fs.readFileSync(
    path.join(distRoot, "404.html"),
    "utf8"
  );
  assert.match(notFoundHtml, /<title>Page not found \| Catch<\/title>/);
  assert.match(
    notFoundHtml,
    /<link rel="canonical" href="https:\/\/example\.test\/404\/" \/>/
  );
  assert.match(notFoundHtml, /<meta name="robots" content="noindex, follow" \/>/);

  const canonicalMeta = JSON.parse(fs.readFileSync(canonicalMetaPath, "utf8"));
  for (const [routeKey, relativeOutput] of [
    ["home", "index.html"],
    ["host", path.join("host", "index.html")],
    ["host_apply", path.join("host", "apply", "index.html")],
    ["visitor_discovery", path.join("explore", "index.html")],
    ["event_offer", path.join("offer", "index.html")],
    ["event_booking", path.join("booking", "index.html")],
    ["event_assistance", path.join("event-update", "index.html")],
    ["organizers", path.join("organizers", "index.html")],
    ["claim", path.join("claim", "index.html")],
    ["privacy", path.join("privacy", "index.html")],
    ["terms", path.join("terms", "index.html")],
    ["help", path.join("help", "index.html")],
    ["account_deletion", path.join("delete-account", "index.html")],
    ["refunds", path.join("refunds", "index.html")],
    ["contact", path.join("contact", "index.html")],
    ["not_found", "404.html"],
  ]) {
    assertStaticRouteMeta(
      fs.readFileSync(path.join(distRoot, relativeOutput), "utf8"),
      canonicalMeta.routes[routeKey],
      "https://example.test"
    );
  }

  const sitemap = fs.readFileSync(path.join(distRoot, "sitemap.xml"), "utf8");
  assert.match(sitemap, /<loc>https:\/\/example\.test\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/host\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/privacy\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/terms\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/help\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/organizers\/afterfly\/<\/loc>/);
  assert.doesNotMatch(sitemap, /afterfly-catch-event/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/events\/afterfly-external-event\/<\/loc>/);
  assert.match(
    sitemap,
    /<loc>https:\/\/example\.test\/organizers\/afterfly\/<\/loc><lastmod>2026-06-18<\/lastmod>/
  );
  assert.doesNotMatch(sitemap, /event-update/u);
  assert.doesNotMatch(sitemap, /claim\/<\/loc>/);
  assert.doesNotMatch(sitemap, /404\/<\/loc>/);
  assert.doesNotMatch(sitemap, /organizers\/$/);
  assert.doesNotMatch(sitemap, /afterfly-run-club/);
  assert.doesNotMatch(sitemap, /noindex-sample/);
  assert.doesNotMatch(sitemap, /published-suppressed/);
  assert.equal(
    fs.existsSync(
      path.join(distRoot, "organizers", "published-suppressed", "index.html")
    ),
    false
  );

  const robots = fs.readFileSync(path.join(distRoot, "robots.txt"), "utf8");
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Sitemap: https:\/\/example\.test\/sitemap\.xml/);
});

test("postbuild reads static and listing metadata from the validated content source", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-postbuild-content-"));
  const distRoot = path.join(tmpRoot, "dist");
  const hostListingsPath = path.join(tmpRoot, "hostListings.json");
  const metaContentPath = path.join(tmpRoot, "meta.json");
  const metaContent = JSON.parse(fs.readFileSync(canonicalMetaPath, "utf8"));
  metaContent.routes.claim.title = "Custom claim metadata";
  metaContent.listing.titleTemplate = "{name} in {city} | Custom profile";
  metaContent.listing.staticLabels.sourcesHeading = "Verified links";

  fs.mkdirSync(distRoot, {recursive: true});
  fs.writeFileSync(path.join(distRoot, "index.html"), baseHtml());
  fs.writeFileSync(hostListingsPath, `${JSON.stringify(hostListings(), null, 2)}\n`);
  fs.writeFileSync(metaContentPath, `${JSON.stringify(metaContent, null, 2)}\n`);

  execFileSync(process.execPath, [
    scriptPath,
    "--dist-root",
    distRoot,
    "--host-listings",
    hostListingsPath,
    "--meta-content",
    metaContentPath,
    "--base-url",
    "https://example.test",
  ], {stdio: "pipe"});

  const claimHtml = fs.readFileSync(path.join(distRoot, "claim", "index.html"), "utf8");
  const listingHtml = fs.readFileSync(
    path.join(distRoot, "organizers", "afterfly", "index.html"),
    "utf8"
  );
  assert.match(claimHtml, /<title>Custom claim metadata<\/title>/u);
  assert.match(listingHtml, /<title>AFTER FLY in Indore \| Custom profile<\/title>/u);
  assert.match(listingHtml, /<h2>Verified links<\/h2>/u);
});

function baseHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Catch | The event before the match</title>
    <meta name="description" content="Default description." />
    <meta property="og:title" content="Default title" />
    <meta property="og:description" content="Default OG description" />
    <meta property="og:url" content="https://catchdates.com/" />
    <meta name="twitter:title" content="Default title" />
    <meta name="twitter:description" content="Default Twitter description" />
    <link rel="canonical" href="https://catchdates.com/" />
  </head>
  <body><div id="root"></div></body>
</html>
`;
}

function assertStaticRouteMeta(html, meta, baseUrl) {
  const canonical = `${baseUrl}${meta.canonicalPath}`;
  const expectedTags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.twitterDescription)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  ];
  if (meta.robots) {
    expectedTags.push(`<meta name="robots" content="${escapeHtml(meta.robots)}" />`);
  }
  for (const tag of expectedTags) {
    assert.ok(html.includes(tag), `expected built HTML to include ${tag}`);
  }
  if (!meta.robots) {
    assert.doesNotMatch(html, /<meta name="robots"/u);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hostListings() {
  return [
    {
      city: "Indore",
      description: "Admin-approved organizer profile.",
      formats: ["Social runs"],
      facts: [{label: "Market", value: "Indore"}],
      indexing: "index, follow",
      lastVerifiedAt: "2026-06-18",
      legacyPaths: ["/organizers/indore/afterfly-run-club/"],
      name: "AFTER FLY",
      path: "/organizers/afterfly/",
      sourceSummary: "Admin-reviewed public source summary.",
      sources: [{
        detail: "Reviewed public source.",
        href: "https://example.test/afterfly",
        label: "Official website",
      }],
      catchEvents: [{
        id: "afterfly-catch-event",
        role: "hostEventSetup",
        title: "Afterfly Catch social run",
        activityKind: "socialRun",
        timeline: "upcoming",
        startTime: "2026-08-01T01:30:00.000Z",
        endTime: "2026-08-01T03:30:00.000Z",
        date: "Aug 1, 2026, 7:00 AM-9:00 AM",
        location: "Indore",
        summary: "A Catch-managed social run.",
        capacityLimit: 40,
        bookedCount: 20,
        checkedInCount: 0,
        waitlistedCount: 0,
        priceLabel: "Free",
      }],
      externalEvents: [{
        id: "afterfly-external-event",
        title: "Afterfly external social run",
        activityKind: "socialRun",
        availability: "read_only_external",
        startTime: "2026-08-02T01:30:00.000Z",
        endTime: "2026-08-02T03:30:00.000Z",
        date: "Aug 2, 2026, 7:00 AM-9:00 AM",
        location: "Indore",
        summary: "A source-attributed external social run.",
        priceLabel: "Free RSVP",
        sourceLabel: "Luma",
        sourceHref: "https://luma.com/afterfly-external",
        externalLinkCount: 1,
        dedupeKey: "afterfly-external-event",
      }],
      reviews: [{
        id: "afterfly-event-review",
        eventId: "afterfly-catch-event",
        reviewerName: "Verified attendee",
        rating: 5,
        comment: "Clear pace groups and a welcoming finish.",
        createdAt: "2026-07-20",
        verificationStatus: "verified",
        source: "catchEvent",
        isAnonymous: false,
        ownerResponse: null,
      }],
    },
    {
      city: "Delhi",
      description: "Noindex organizer profile.",
      formats: [],
      facts: [],
      indexing: "noindex, follow",
      legacyPaths: [],
      name: "Noindex Sample",
      path: "/organizers/noindex-sample/",
      sourceSummary: "Noindex source summary.",
      sources: [],
    },
    {
      authority: {
        claimState: "suppressed",
        publishStatus: "published",
      },
      city: "Delhi",
      description: "A stale published record that must remain private.",
      formats: [],
      facts: [],
      indexing: "index, follow",
      legacyPaths: [],
      name: "Published Suppressed",
      path: "/organizers/published-suppressed/",
      sourceSummary: "Suppressed listing.",
      sources: [],
    },
  ];
}


test("retired marketing URLs have redirects only, with no page owners or metadata", () => {
  const read = (relative) => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), "utf8"));
  const contract = read("../../design/website/routes.json");
  const hosting = read("../../firebase.json").hosting.find((entry) => entry.target === "marketing");
  const meta = read("../src/content/meta.json");
  for (const redirect of contract.redirects) {
    const pathname = redirect.source.replace("/**", "/legacy-child/");
    const expected = new URL(redirect.destination, "https://example.test");
    assert.equal(retiredMarketingDestination({pathname, search: "?listing=real-id&utm_source=partner", hash: "#obsolete"}),
      `${expected.pathname}?listing=real-id&utm_source=partner${expected.hash}`);
    assert.ok(hosting.redirects.some((entry) => entry.source === redirect.source && entry.destination === redirect.destination && entry.type === 301));
    assert.ok(!hosting.rewrites.some((entry) => entry.source === redirect.source));
    assert.ok(!contract.routes.some((route) => route.path === `${pathname.replace(/\/$/, "")}/`));
  }
  for (const slug of ["overview", "platform", "workflows", "planners", "mixers", "clubs", "stack", "directory", "claim"]) {
    assert.equal(meta.routes[`host_${slug}`], undefined);
  }
  for (const source of ["features/host/concepts/HostConceptPage.tsx", "features/host/HostContentReview.tsx",
    "content/hostConceptContent.ts", "content/hostConceptNavigation.ts", "content/prototypeStackContent.ts",
    "content/prototypeInteractionContent.ts", "content/hostOrganization.ts", "features/host/HostApplicationFlow.tsx",
    "features/host/applicationModel.ts", "features/host/useHostApplicationController.ts"]) {
    assert.equal(fs.existsSync(new URL(`../src/${source}`, import.meta.url)), false, `${source} must remain retired`);
  }
});
