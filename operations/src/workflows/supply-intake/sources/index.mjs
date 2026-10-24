import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {districtAdapter} from "./district/extractor.mjs";
import {lumaAdapter} from "./luma/extractor.mjs";
import {openGraphAdapter} from "./open-graph/extractor.mjs";
import {schemaOrgEventAdapter} from "./schema-org-event/extractor.mjs";
import {normalizeOrganizerSurfaceUrl} from "./surfaces.mjs";
import {urbanautAdapter} from "./urbanaut/extractor.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
export const SOURCE_PROFILE_IDS = Object.freeze([
  "cntraveller",
  "district",
  "luma",
  "open-graph",
  "schema-org-event",
  "urbanaut",
]);
export const PAGE_EXTRACTION_VERSION = 1;

// Deterministic page adapters, chosen by the platform the URL classifies to.
// To add a platform: an extractor + profile.json here, an entry in
// platforms.json, a classifier in surfaces.mjs, and real-page fixtures.
const PLATFORM_ADAPTERS = Object.freeze(new Map([
  [districtAdapter.platform, districtAdapter],
  [lumaAdapter.platform, lumaAdapter],
  [urbanautAdapter.platform, urbanautAdapter],
]));
const GENERIC_ADAPTERS = Object.freeze([schemaOrgEventAdapter, openGraphAdapter]);

export async function loadSourceProfiles() {
  const profiles = await Promise.all(SOURCE_PROFILE_IDS.map(async (id) =>
    JSON.parse(await fs.readFile(path.join(directory, id, "profile.json"), "utf8"))
  ));
  return profiles.sort((left, right) => left.sourceProfileId.localeCompare(right.sourceProfileId));
}

export function sourceProfileById(profiles, id) {
  return profiles.find((profile) => profile.sourceProfileId === id) ?? null;
}

export function pageAdapterFor(platform) {
  return PLATFORM_ADAPTERS.get(platform) ?? null;
}

/**
 * Extract organizer and event candidates from one page snapshot
 * (page-snapshot.mjs). The platform adapter runs first; generic schema.org
 * markup next. When every adapter abstains, the result is `abstained` with
 * each adapter's reason and the page metadata, which hands the page to the
 * extraction agent instead of guessing.
 */
export function extractWithAdapters({snapshot, timezone = "Asia/Kolkata", observedAt = snapshot?.fetchedAt ?? null}) {
  const pageUrl = snapshot?.finalUrl ?? snapshot?.url ?? null;
  let surface = null;
  try {
    surface = pageUrl ? normalizeOrganizerSurfaceUrl(pageUrl) : null;
  } catch {
    surface = null;
  }
  const base = {
    schemaVersion: PAGE_EXTRACTION_VERSION,
    sourceUrl: surface?.canonicalUrl ?? pageUrl,
    surface: surface ? {
      platform: surface.platform,
      surfaceKind: surface.surfaceKind,
      normalizedKey: surface.normalizedKey,
      canonicalUrl: surface.canonicalUrl,
    } : null,
    contentHash: snapshot?.contentHash ?? null,
    observedAt,
  };
  if (!snapshot || !Array.isArray(snapshot.jsonLd) || !Array.isArray(snapshot.embeddedJson)) {
    return {...base, ...abstention("invalid_snapshot", []), metadata: null};
  }
  const attempts = [];
  // A platform's pages are one template with its own site-wide markup (the
  // platform's brand Organization), so a drifted platform page goes to the
  // agent; only metadata is gathered. Generic markup is read for other sites,
  // such as an organizer's own website, where that Organization is the organizer.
  const platformAdapter = pageAdapterFor(surface?.platform);
  const candidates = platformAdapter ? [platformAdapter, openGraphAdapter] : GENERIC_ADAPTERS;
  let metadata = null;
  for (const adapter of candidates) {
    const platform = adapter.platform ?? surface?.platform ?? null;
    const result = adapter.extract(snapshot, {timezone, platform});
    if (result.metadata) metadata = result.metadata;
    if (result.abstained) {
      attempts.push({adapterId: adapter.adapterId, abstainReason: result.abstainReason,
        templateFingerprint: result.templateFingerprint ?? null});
      continue;
    }
    return {
      ...base,
      abstained: false,
      abstainReason: null,
      adapterId: adapter.adapterId,
      sourceProfileId: adapter.sourceProfileId,
      extractionMethod: adapter.extractionMethod,
      platform,
      pageKind: result.pageKind,
      templateFingerprint: result.templateFingerprint,
      organizers: result.organizers,
      events: result.events,
      attempts,
      metadata,
    };
  }
  const platformDrift = attempts.find((attempt) => attempt.abstainReason === "template_drift");
  return {...base, ...abstention(platformDrift ? "template_drift" : "no_structured_data", attempts), metadata};
}

function abstention(reason, attempts) {
  return {
    abstained: true,
    abstainReason: reason,
    adapterId: null,
    sourceProfileId: null,
    extractionMethod: null,
    platform: null,
    pageKind: null,
    templateFingerprint: null,
    organizers: [],
    events: [],
    attempts,
  };
}
