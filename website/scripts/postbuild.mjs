import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {checkOrganizerBuildOutputs} from "./checkOrganizerBuildOutputs.mjs";
import {
  formatContentTemplate,
  readWebsiteMeta,
  staticRouteMeta,
} from "../../tool/marketing/website_meta_contract.mjs";
import {applyBrand, brand} from "@catch/brand";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(dirname, "..");
const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const distRoot = path.resolve(args.distRoot ?? path.join(websiteRoot, "dist"));
const hostListingsPath = path.resolve(
  args.hostListings ?? path.join(websiteRoot, "src", "generated", "hostListings.json")
);
const metaContentPath = path.resolve(
  args.metaContent ?? path.join(websiteRoot, "src", "content", "meta.json")
);
const legalContentPath = path.join(websiteRoot, "src", "content", "legal.json");
const baseUrl = String(args.baseUrl ?? brand.web.origin).replace(/\/+$/, "");
const hostListings = JSON.parse(fs.readFileSync(hostListingsPath, "utf8"));
const websiteMeta = readWebsiteMeta(metaContentPath);
const legalContent = applyBrand(JSON.parse(fs.readFileSync(legalContentPath, "utf8")));
const publicListings = hostListings.filter(isPubliclyReadableListing);
const publicEvents = buildPublicEventRecords(publicListings);

const rootHtmlPath = path.join(distRoot, "index.html");
const rootHtml = fs.readFileSync(rootHtmlPath, "utf8");
const sitemapEntries = [];
// Clear prior generated event pages before rebuilding the external-only export.
fs.rmSync(path.join(distRoot, "events"), {recursive: true, force: true});
writeRoute("/events/", {
  ...staticRouteMeta(websiteMeta, "home", baseUrl),
  canonical: `${baseUrl}/events/`,
  robots: "noindex, follow",
});
writeRoute("/", staticRouteMeta(websiteMeta, "home", baseUrl));
writeRoute("/explore/", staticRouteMeta(websiteMeta, "visitor_discovery", baseUrl));

// Remove retired output even when postbuild reuses a previously built directory.
for (const slug of ["overview", "platform", "workflows", "planners", "mixers", "clubs", "stack", "directory", "claim", "preview"]) {
  fs.rmSync(path.join(distRoot, "host", slug), {recursive: true, force: true});
}
writeRoute("/host/apply/", staticRouteMeta(websiteMeta, "host_apply", baseUrl));
writeRoute("/host/", staticRouteMeta(websiteMeta, "host", baseUrl));
writeRoute("/join/", staticRouteMeta(websiteMeta, "event_runtime", baseUrl));
writeRoute("/booking/", staticRouteMeta(websiteMeta, "event_booking", baseUrl));
writeRoute("/demo/", staticRouteMeta(websiteMeta, "sales_demo", baseUrl));
writeRoute("/offer/", staticRouteMeta(websiteMeta, "event_offer", baseUrl));
writeRoute("/event-update/", staticRouteMeta(websiteMeta, "event_assistance", baseUrl));
writeRoute("/rehearse/", staticRouteMeta(websiteMeta, "event_rehearsal", baseUrl));
writeRoute("/invite/", staticRouteMeta(websiteMeta, "event_invite", baseUrl));
writeRoute("/rsvp/", staticRouteMeta(websiteMeta, "household_rsvp", baseUrl));
writeRoute("/f/", staticRouteMeta(websiteMeta, "public_form", baseUrl));
writeRoute("/organizers/", staticRouteMeta(websiteMeta, "organizers", baseUrl));
writeRoute("/claim/", staticRouteMeta(websiteMeta, "claim", baseUrl));
writeRoute("/privacy/", {
  ...staticRouteMeta(websiteMeta, "privacy", baseUrl),
  bodyHtml: buildLegalStaticBody(legalContent.pages.privacy, legalContent.effectiveDate),
});
writeRoute("/terms/", {
  ...staticRouteMeta(websiteMeta, "terms", baseUrl),
  bodyHtml: buildLegalStaticBody(legalContent.pages.terms, legalContent.effectiveDate),
});
writeRoute("/help/", {
  ...staticRouteMeta(websiteMeta, "help", baseUrl),
  bodyHtml: buildLegalStaticBody(legalContent.pages.help, legalContent.effectiveDate),
});
writeRoute("/delete-account/", {
  ...staticRouteMeta(websiteMeta, "account_deletion", baseUrl),
  bodyHtml: buildLegalStaticBody(legalContent.pages.account_deletion, legalContent.effectiveDate),
});
writeRoute("/refunds/", {
  ...staticRouteMeta(websiteMeta, "refunds", baseUrl),
  bodyHtml: buildLegalStaticBody(legalContent.pages.refunds, legalContent.effectiveDate),
});
writeRoute("/contact/", {
  ...staticRouteMeta(websiteMeta, "contact", baseUrl),
  bodyHtml: buildLegalStaticBody(legalContent.pages.contact, legalContent.effectiveDate),
});
writeRoute("/404/", staticRouteMeta(websiteMeta, "not_found", baseUrl));
writeStaticHtml("404.html", staticRouteMeta(websiteMeta, "not_found", baseUrl));

for (const listing of publicListings) {
  const listingMeta = {
    title: formatContentTemplate(websiteMeta.listing.titleTemplate, {
      name: listing.name,
      city: listing.city,
    }),
    description: listing.description,
    canonical: `${baseUrl}${listing.path}`,
    twitterDescription: listing.sourceSummary,
    robots: listing.indexing,
    lastModified: listing.lastVerifiedAt,
    bodyHtml: buildListingStaticBody(listing, websiteMeta.listing.staticLabels),
    structuredData: buildListingStructuredData(
      listing,
      websiteMeta.listing.staticLabels
    ),
  };
  writeRoute(listing.path, listingMeta);
  for (const legacyPath of listing.legacyPaths ?? []) {
    writeRoute(legacyPath, {
      ...listingMeta,
      robots: "noindex, follow",
    });
  }
}

for (const event of publicEvents) {
  writeRoute(event.path, {
    title: formatContentTemplate(websiteMeta.event.titleTemplate, {
      title: event.title,
      city: event.listing.city,
    }),
    description: event.summary || event.listing.description,
    canonical: `${baseUrl}${event.path}`,
    twitterDescription: event.supply === "external"
      ? formatContentTemplate(websiteMeta.event.externalTwitterTemplate, {
        title: event.title,
        source: event.sourceLabel,
      })
      : formatContentTemplate(websiteMeta.event.catchTwitterTemplate, {
        title: event.title,
        organizer: event.listing.name,
      }),
    robots: event.listing.indexing,
    lastModified: event.listing.lastVerifiedAt,
    bodyHtml: buildEventStaticBody(event, websiteMeta.event.staticLabels),
    structuredData: buildEventStructuredData(
      event,
      websiteMeta.event.staticLabels
    ),
  });
}

writeSitemap(sitemapEntries);
writeRobotsTxt();
validateOrganizerBuildOutputs();

function writeRoute(routePath, meta) {
  if (routePath === "/") {
    fs.writeFileSync(rootHtmlPath, applyMeta(rootHtml, meta));
    addSitemapEntry(meta);
    return;
  }

  const routeDir = path.join(distRoot, ...routePath.split("/").filter(Boolean));
  fs.mkdirSync(routeDir, {recursive: true});
  fs.writeFileSync(path.join(routeDir, "index.html"), applyMeta(rootHtml, meta));
  addSitemapEntry(meta);
}

function writeStaticHtml(fileName, meta) {
  fs.writeFileSync(path.join(distRoot, fileName), applyMeta(rootHtml, meta));
}

function applyMeta(html, meta) {
  let output = html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/s,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/s,
      `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/s,
      `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/s,
      `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/s,
      `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/s,
      `<meta name="twitter:description" content="${escapeHtml(
        meta.twitterDescription
      )}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/s,
      `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`
    )
    .replace(/\n\s*<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/s, "")
    .replace(
      /\n\s*(<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>)/s,
      `\n${meta.robots ? `    <meta name="robots" content="${escapeHtml(meta.robots)}" />\n` : ""}    $1`
    );
  if (meta.structuredData) {
    const json = JSON.stringify(meta.structuredData).replaceAll("<", "\\u003c");
    output = output.replace(
      /\n\s*<\/head>/s,
      `\n    <script type="application/ld+json">${json}</script>\n  </head>`
    );
  }
  if (meta.bodyHtml) {
    output = output.replace(
      /<div\s+id="root"\s*><\/div>/s,
      `<div id="root">${meta.bodyHtml}</div>`
    );
  }
  return output;
}

function buildListingStaticBody(listing, labels) {
  const formats = (listing.formats ?? [])
    .map((format) => `<li>${escapeHtml(String(format))}</li>`)
    .join("");
  const facts = (listing.facts ?? [])
    .filter((fact) =>
      canReadPublicReviews(listing) ||
      !/(?:rating|review)/iu.test(`${fact.label ?? ""} ${fact.value ?? ""}`)
    )
    .map((fact) =>
      `<div><dt>${escapeHtml(String(fact.label))}</dt>` +
        `<dd>${escapeHtml(String(fact.value))}</dd></div>`
    )
    .join("");
  const sources = (listing.sources ?? [])
    .filter((source) => safePublicUrl(source.href))
    .map((source) =>
      `<li><a href="${escapeHtml(source.href)}" rel="noopener noreferrer">` +
        `${escapeHtml(String(source.label))}</a>` +
        `${source.detail ? ` — ${escapeHtml(String(source.detail))}` : ""}</li>`
    )
    .join("");

  return [
    '<main data-static-organizer-profile="true">',
    `<header><p>${escapeHtml(labels.profileEyebrow)} · ${escapeHtml(String(listing.city))}</p>`,
    `<h1>${escapeHtml(String(listing.name))}</h1>`,
    `<p>${escapeHtml(String(listing.description))}</p></header>`,
    formats ? `<section><h2>${escapeHtml(labels.formatsHeading)}</h2><ul>${formats}</ul></section>` : "",
    facts ? `<section><h2>${escapeHtml(labels.factsHeading)}</h2><dl>${facts}</dl></section>` : "",
    sources ? `<section><h2>${escapeHtml(labels.sourcesHeading)}</h2><ul>${sources}</ul></section>` : "",
    `<p>${escapeHtml(labels.lastVerifiedPrefix)} ${escapeHtml(String(listing.lastVerifiedAt ?? labels.notRecorded))}.</p>`,
    "</main>",
  ].join("");
}

function buildEventStaticBody(event, labels) {
  const source = event.sourceHref && safePublicUrl(event.sourceHref)
    ? `<a href="${escapeHtml(event.sourceHref)}" rel="noopener noreferrer">` +
      `${escapeHtml(event.sourceLabel)}</a>`
    : escapeHtml(event.sourceLabel);
  const reviews = event.eventReviews
    .map((review) => (
      `<article><p>${escapeHtml(String(review.reviewerName))} · ` +
      `${escapeHtml(String(review.rating))}/5</p>` +
      `<p>${escapeHtml(String(review.comment ?? ""))}</p></article>`
    ))
    .join("");
  return [
    '<main data-static-event-detail="true">',
    `<header><p>${escapeHtml(labels.eventEyebrow)}</p>`,
    `<h1>${escapeHtml(event.title)}</h1>`,
    `<p>${escapeHtml(event.summary)}</p>`,
    `<p>${escapeHtml(labels.hostedByPrefix)} ` +
      `<a href="${escapeHtml(event.listing.path)}">${escapeHtml(event.listing.name)}</a></p></header>`,
    `<section><h2>${escapeHtml(labels.scheduleHeading)}</h2><dl>`,
    `<div><dt>${escapeHtml(labels.locationLabel)}</dt><dd>${escapeHtml(event.location)}</dd></div>`,
    `<div><dt>${escapeHtml(labels.priceLabel)}</dt><dd>${escapeHtml(event.priceLabel)}</dd></div>`,
    `<div><dt>${escapeHtml(labels.sourceLabel)}</dt><dd>${source}</dd></div>`,
    "</dl></section>",
    reviews
      ? `<section><h2>${escapeHtml(labels.reviewsHeading)}</h2>${reviews}</section>`
      : "",
    `<p>${escapeHtml(labels.lastReviewedPrefix)} ` +
      `${escapeHtml(String(event.listing.lastVerifiedAt))}.</p>`,
    "</main>",
  ].join("");
}

function buildLegalStaticBody(page, effectiveDate) {
  const sections = page.sections.map((section) => {
    const paragraphs = section.paragraphs
      .map((paragraph) => `<p>${escapeHtml(String(paragraph))}</p>`)
      .join("");
    const bullets = (section.bullets ?? [])
      .map((bullet) => `<li>${escapeHtml(String(bullet))}</li>`)
      .join("");
    const links = (section.links ?? [])
      .map((link) => `<li><a href="${escapeHtml(String(link.href))}">${escapeHtml(String(link.label))}</a></li>`)
      .join("");
    return `<section><h2>${escapeHtml(String(section.heading))}</h2>` +
      `${paragraphs}${bullets ? `<ul>${bullets}</ul>` : ""}` +
      `${links ? `<ul>${links}</ul>` : ""}</section>`;
  }).join("");
  return [
    `<main data-static-legal-page="${escapeHtml(String(page.path))}">`,
    `<header><p>${escapeHtml(String(page.eyebrow))}</p>`,
    `<h1>${escapeHtml(String(page.title))}</h1>`,
    `<p>${escapeHtml(String(page.summary))}</p>`,
    `<p>Effective ${escapeHtml(String(page.effectiveDate ?? effectiveDate))}</p></header>`,
    sections,
    "</main>",
  ].join("");
}

function buildListingStructuredData(listing, labels) {
  const canonical = `${baseUrl}${listing.path}`;
  const sameAs = (listing.sources ?? [])
    .map((source) => source.href)
    .filter(safePublicUrl);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${canonical}#organization`,
        name: listing.name,
        description: listing.description,
        url: canonical,
        sameAs: [...new Set(sameAs)],
        areaServed: {
          "@type": "Place",
          name: [listing.city, listing.region, listing.country]
            .filter(Boolean)
            .join(", "),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: labels.homeBreadcrumb,
            item: `${baseUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: labels.organizersBreadcrumb,
            item: `${baseUrl}/organizers/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: listing.name,
            item: canonical,
          },
        ],
      },
    ],
  };
}

function buildEventStructuredData(event, labels) {
  const canonical = `${baseUrl}${event.path}`;
  const eventNode = {
    "@type": "Event",
    "@id": `${canonical}#event`,
    name: event.title,
    description: event.summary,
    url: canonical,
    startDate: event.startTime,
    endDate: event.endTime ?? undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: event.isUpcoming
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventCompleted",
    location: {
      "@type": "Place",
      name: event.location,
    },
    organizer: {
      "@type": "Organization",
      name: event.listing.name,
      url: `${baseUrl}${event.listing.path}`,
    },
  };
  if (event.sourceHref && safePublicUrl(event.sourceHref)) {
    eventNode.sameAs = event.sourceHref;
  }
  if (event.eventReviews.length) {
    eventNode.review = event.eventReviews.map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.reviewerName,
      },
      datePublished: review.createdAt,
      reviewBody: review.comment,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
      },
    }));
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      eventNode,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: labels.homeBreadcrumb,
            item: `${baseUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: labels.organizersBreadcrumb,
            item: `${baseUrl}/organizers/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: event.listing.name,
            item: `${baseUrl}${event.listing.path}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: event.title,
            item: canonical,
          },
        ],
      },
    ],
  };
}

function buildPublicEventRecords(listings) {
  const candidates = listings.flatMap((listing) => [
    ...(listing.externalEvents ?? []).map((event) => ({
      endTime: event.endTime,
      eventId: event.id,
      eventReviews: eventReviewsForListing(listing, event.id),
      isUpcoming: eventIsUpcoming(event),
      listing,
      location: event.location,
      path: eventPath(event.id),
      priceLabel: event.priceLabel,
      sourceHref: event.sourceHref,
      sourceLabel: event.sourceLabel,
      startTime: event.startTime,
      summary: event.summary || listing.description,
      supply: "external",
      title: event.title,
    })),
  ]);
  const counts = new Map();
  for (const candidate of candidates) {
    counts.set(candidate.eventId, (counts.get(candidate.eventId) ?? 0) + 1);
  }
  return candidates.filter((candidate) => counts.get(candidate.eventId) === 1);
}

function eventReviewsForListing(listing, eventId) {
  if (!canReadPublicReviews(listing)) return [];
  return (listing.reviews ?? []).filter((review) => review.eventId === eventId);
}

function eventPath(eventId) {
  return `/events/${encodeURIComponent(eventId)}/`;
}

function eventIsUpcoming(event) {
  const timestamp = Date.parse(event.endTime ?? event.startTime);
  return !Number.isFinite(timestamp) || timestamp >= Date.now();
}

function safePublicUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isPubliclyReadableListing(listing) {
  if (!listing?.authority) return true;
  return listing.authority.publishStatus === "published" &&
    listing.authority.claimState !== "suppressed";
}

function canReadPublicReviews(listing) {
  if (!isPubliclyReadableListing(listing)) return false;
  if (!listing?.capabilities) return true;
  return listing.capabilities.publicReviews?.targetState === "enabled" &&
    listing.capabilities.publicReviews?.readState === "enabled";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function addSitemapEntry(meta) {
  if (isNoindex(meta.robots)) return;
  sitemapEntries.push({
    canonical: meta.canonical,
    lastModified: isoDateOrNull(meta.lastModified),
  });
}

function isNoindex(robots) {
  return typeof robots === "string" && /\bnoindex\b/i.test(robots);
}

function writeSitemap(entries) {
  const uniqueEntries = [...new Map(
    entries.map((entry) => [entry.canonical, entry])
  ).values()].sort((a, b) => a.canonical.localeCompare(b.canonical));
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...uniqueEntries.map((entry) =>
      `  <url><loc>${escapeXml(entry.canonical)}</loc>` +
        `${entry.lastModified ? `<lastmod>${entry.lastModified}</lastmod>` : ""}` +
        `</url>`
    ),
    '</urlset>',
    '',
  ].join("\n");
  fs.writeFileSync(path.join(distRoot, "sitemap.xml"), body);
}

function isoDateOrNull(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : null;
}

function writeRobotsTxt() {
  fs.writeFileSync(
    path.join(distRoot, "robots.txt"),
    [
      "User-agent: *",
      "Allow: /",
      `Sitemap: ${baseUrl}/sitemap.xml`,
      "",
    ].join("\n")
  );
}

function validateOrganizerBuildOutputs() {
  const result = checkOrganizerBuildOutputs({
    baseUrl,
    distRoot,
    hostListings,
  });
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  if (result.errors.length > 0) {
    console.error("Organizer website build-output validation failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: null,
    distRoot: null,
    help: false,
    hostListings: null,
    metaContent: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--base-url") parsed.baseUrl = requiredValue(argv, ++index, arg);
    else if (arg === "--dist-root") parsed.distRoot = requiredValue(argv, ++index, arg);
    else if (arg === "--host-listings") parsed.hostListings = requiredValue(argv, ++index, arg);
    else if (arg === "--meta-content") parsed.metaContent = requiredValue(argv, ++index, arg);
    else fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value.`);
  return value;
}

function printHelp() {
  console.log(`Usage: node website/scripts/postbuild.mjs [options]

Options:
  --dist-root <path>      Directory containing Vite build output.
  --host-listings <path>  Generated host listings JSON file.
  --meta-content <path>   Validated website metadata content JSON file.
  --base-url <url>        Public website base URL.
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
