import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {checkOrganizerBuildOutputs} from "./checkOrganizerBuildOutputs.mjs";

test("checkOrganizerBuildOutputs validates listing routes, legacy routes, and sitemap", () => {
  const distRoot = createDist({
    sitemapUrls: [
      "https://example.test/",
      "https://example.test/host/",
      "https://example.test/organizers/moonmoth/",
    ],
    withStaticProfiles: true,
  });

  const result = checkOrganizerBuildOutputs({
    baseUrl: "https://example.test",
    distRoot,
    hostListings: hostListings(),
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.summary, {
    indexableListings: 1,
    legacyRoutes: 1,
    listings: 2,
    sitemapUrls: 3,
  });
});

test("checkOrganizerBuildOutputs rejects stale route and sitemap state", () => {
  const distRoot = createDist({
    moonmothRobots: "noindex, follow",
    includeNoindexInSitemap: true,
    includeLegacyInSitemap: true,
    includePublicSourceMap: true,
    omitLegacyRoute: true,
    sitemapUrls: [
      "https://example.test/",
      "https://example.test/host/",
      "https://example.test/organizers/moonmoth/",
    ],
  });

  const result = checkOrganizerBuildOutputs({
    baseUrl: "https://example.test",
    distRoot,
    hostListings: hostListings(),
  });

  assert.match(result.errors.join("\n"), /moonmoth: .* robots noindex, follow/);
  assert.match(result.errors.join("\n"), /legacy path present in sitemap/);
  assert.match(result.errors.join("\n"), /missing legacy route HTML/);
  assert.match(result.errors.join("\n"), /noindex listing present in sitemap/);
  assert.match(result.errors.join("\n"), /public source map emitted/);
  assert.match(result.errors.join("\n"), /references a public source map/);
});

test("checkOrganizerBuildOutputs rejects demo listings in production input", () => {
  const distRoot = createDist({
    sitemapUrls: [
      "https://example.test/",
      "https://example.test/host/",
      "https://example.test/organizers/moonmoth/",
    ],
    withStaticProfiles: true,
  });
  const listings = hostListings();
  listings[0].dataOrigin = "catchDemo";

  const result = checkOrganizerBuildOutputs({
    baseUrl: "https://example.test",
    distRoot,
    hostListings: listings,
  });

  assert.match(
    result.errors.join("\n"),
    /moonmoth: production organizer output must not include catchDemo records/u
  );
});

function createDist({
  moonmothRobots = "index, follow",
  includeLegacyInSitemap = false,
  includeNoindexInSitemap = false,
  includePublicSourceMap = false,
  omitLegacyRoute = false,
  sitemapUrls,
  withStaticProfiles = false,
}) {
  const distRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-org-build-"));
  fs.writeFileSync(
    path.join(distRoot, "robots.txt"),
    [
      "User-agent: *",
      "Allow: /",
      "Sitemap: https://example.test/sitemap.xml",
      "",
    ].join("\n")
  );
  writeSitemap(distRoot, [
    ...sitemapUrls,
    ...(includeLegacyInSitemap ? [
      "https://example.test/organizers/indore/moonmoth-run-club/",
    ] : []),
    ...(includeNoindexInSitemap ? [
      "https://example.test/organizers/noindex-sample/",
    ] : []),
  ]);
  writeRoute({
    canonical: "https://example.test/organizers/moonmoth/",
    distRoot,
    routePath: "/organizers/moonmoth/",
    robots: moonmothRobots,
    staticProfile: withStaticProfiles,
  });
  if (!omitLegacyRoute) {
    writeRoute({
      canonical: "https://example.test/organizers/moonmoth/",
      distRoot,
      routePath: "/organizers/indore/moonmoth-run-club/",
      robots: "noindex, follow",
    });
  }
  writeRoute({
    canonical: "https://example.test/organizers/noindex-sample/",
    distRoot,
    routePath: "/organizers/noindex-sample/",
    robots: "noindex, follow",
    staticProfile: withStaticProfiles,
  });
  if (includePublicSourceMap) {
    const assetsDir = path.join(distRoot, "assets");
    fs.mkdirSync(assetsDir, {recursive: true});
    fs.writeFileSync(
      path.join(assetsDir, "index.js"),
      "console.log('test');\n//# sourceMappingURL=index.js.map\n"
    );
    fs.writeFileSync(path.join(assetsDir, "index.js.map"), "{}\n");
  }
  return distRoot;
}

function writeSitemap(distRoot, urls) {
  fs.writeFileSync(
    path.join(distRoot, "sitemap.xml"),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((url) =>
        `  <url><loc>${url}</loc>` +
          `${url.endsWith("/organizers/moonmoth/") ? "<lastmod>2026-06-18</lastmod>" : ""}` +
          `</url>`
      ),
      "</urlset>",
      "",
    ].join("\n")
  );
}

function writeRoute({canonical, distRoot, robots, routePath, staticProfile = false}) {
  const routeDir = path.join(distRoot, ...routePath.split("/").filter(Boolean));
  fs.mkdirSync(routeDir, {recursive: true});
  fs.writeFileSync(
    path.join(routeDir, "index.html"),
    [
      "<!DOCTYPE html>",
      "<html>",
      "  <head>",
      `    <meta name="robots" content="${robots}" />`,
      `    <link rel="canonical" href="${canonical}" />`,
      ...(staticProfile ? [
        '    <script type="application/ld+json">{"@type":"Organization"}</script>',
        "  </head>",
        '  <body><main data-static-organizer-profile="true"></main></body>',
      ] : [
        "  </head>",
      ]),
      "</html>",
      "",
    ].join("\n")
  );
}

function hostListings() {
  return [
    {
      id: "moonmoth",
      indexing: "index, follow",
      lastVerifiedAt: "2026-06-18",
      legacyPaths: ["/organizers/indore/moonmoth-run-club/"],
      path: "/organizers/moonmoth/",
    },
    {
      id: "noindex-sample",
      indexing: "noindex, follow",
      legacyPaths: [],
      path: "/organizers/noindex-sample/",
    },
  ];
}
