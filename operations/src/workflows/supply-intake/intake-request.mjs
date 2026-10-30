import Ajv from "ajv";
import addFormats from "ajv-formats";
import requestSchema from "../../../../contracts/operations/supply_intake_request.schema.json" with {type: "json"};
import {hashValue} from "../../platform/canonical-json.mjs";
import {OperationsError, invariant} from "../../platform/errors.mjs";
import {finalizeSupplyInputSnapshot, SUPPLY_INPUT_SNAPSHOT_VERSION} from "./input-snapshot.mjs";
import {createOrganizerMatcher} from "./organizer-matching/matcher.mjs";
import {extractWithAdapters, pageAdapterFor} from "./sources/index.mjs";
import {normalizeOrganizerSurfaceUrl, surfaceForOrganizerPage} from "./sources/surfaces.mjs";

// One intake request becomes one organizer listing draft plus that
// organizer's upcoming events. Gathering reads the seed pages through an
// injected page source, runs the deterministic adapters, follows the
// organizer's own pages on adapter platforms, and records what it could not
// read so research (a person, or the bounded agent) can fill the gaps.

export const MAX_INTAKE_PAGES = 12;
export const MAX_LISTING_EVENTS = 60;
export const MAX_LISTING_LINKS = 20;
const LISTING_SURFACE_KINDS = new Set(["organizerProfile", "eventCalendar", "socialProfile", "website"]);

const validateRequest = (() => {
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  return ajv.compile(requestSchema);
})();

export function assertSupplyIntakeRequest(value) {
  if (!validateRequest(value)) {
    throw new OperationsError("INVALID_INTAKE_REQUEST", "Supply intake request does not satisfy its contract.", {
      details: {errors: (validateRequest.errors ?? []).slice(0, 20).map((error) =>
        ({path: error.instancePath, message: error.message}))},
    });
  }
  return structuredClone(value);
}

/**
 * Reads the request's pages. Budget refusals stop gathering and are recorded
 * as a gap; every other failure is a per-page outcome.
 */
export async function gatherIntakeEvidence({request, pageSource, now, maxPages = MAX_INTAKE_PAGES,
  timezone = "Asia/Kolkata", linkSearch = null}) {
  const intake = assertSupplyIntakeRequest(request);
  invariant(pageSource && typeof pageSource.capture === "function", "ACQUISITION_PORT_MISSING",
    "Intake gathering requires an injected page source.");
  invariant(Number.isSafeInteger(maxPages) && maxPages > 0 && maxPages <= MAX_INTAKE_PAGES,
    "INVALID_INTAKE_REQUEST", `Intake gathering reads at most ${MAX_INTAKE_PAGES} pages.`);
  invariant(linkSearch === null || typeof linkSearch.search === "function", "ACQUISITION_PORT_MISSING",
    "A link search port must offer search().");
  const observedAt = new Date(now).toISOString();
  const queue = intake.seed.urls.map((url) => ({url, via: "seed"}));
  const seen = new Set();
  const gathered = {requestId: intake.requestId, observedAt, pages: [], organizers: [], events: [],
    invalidUrls: [], stoppedReason: null, search: null};
  const read = async (next, accept = () => true) => {
    let surface;
    try {
      surface = normalizeOrganizerSurfaceUrl(next.url);
    } catch {
      gathered.invalidUrls.push(next.url);
      return;
    }
    const key = surface.normalizedKey ?? surface.canonicalUrl;
    if (seen.has(key)) return;
    seen.add(key);
    let captured;
    try {
      captured = await pageSource.capture({runKey: `${intake.requestId}|page-${gathered.pages.length + 1}`,
        url: surface.canonicalUrl});
    } catch (error) {
      if (error?.code === "BUDGET_EXCEEDED") {
        gathered.stoppedReason = "fetch_budget_exhausted";
        return;
      }
      throw error;
    }
    const page = {url: surface.canonicalUrl, via: next.via, platform: surface.platform,
      surfaceKind: surface.surfaceKind, normalizedKey: surface.normalizedKey, receipt: captured.receipt,
      adapterId: null, pageKind: null, abstainReason: null};
    gathered.pages.push(page);
    if (!captured.snapshot) {
      page.abstainReason = captured.receipt.outcome;
      return;
    }
    if (!accept(captured.snapshot)) {
      page.abstainReason = "search_result_unconfirmed";
      return;
    }
    const extraction = extractWithAdapters({snapshot: captured.snapshot, timezone, observedAt});
    Object.assign(page, {adapterId: extraction.adapterId ?? null, pageKind: extraction.pageKind ?? null,
      abstainReason: extraction.abstained ? extraction.abstainReason : null});
    if (page.pageKind === "organizer_page") {
      const corrected = surfaceForOrganizerPage(surface);
      Object.assign(page, {surfaceKind: corrected.surfaceKind, normalizedKey: corrected.normalizedKey});
    }
    for (const organizer of extraction.organizers ?? []) {
      gathered.organizers.push({...organizer, pageUrl: page.url, adapterId: extraction.adapterId,
        pageKind: extraction.pageKind});
    }
    for (const event of extraction.events ?? []) {
      gathered.events.push({...event, pageUrl: page.url, adapterId: extraction.adapterId});
    }
    for (const url of followUrls(extraction, next.via)) queue.push({url, via: page.url});
  };
  while (queue.length > 0 && gathered.pages.length < maxPages && !gathered.stoppedReason) {
    await read(queue.shift());
  }
  if (queue.length > 0 && !gathered.stoppedReason) gathered.stoppedReason = "page_limit_reached";
  if (linkSearch && !gathered.stoppedReason) await searchForOwnPages({intake, gathered, linkSearch, read, maxPages});
  return gathered;
}

const LINK_IN_BIO_HOSTS = new Set(["linktr.ee", "beacons.ai"]);
const MAX_SEARCH_PAGES = 3;

/**
 * When no page a nomination named could be read (an Instagram profile, a
 * Linktree or Beacons page), search once for the handle and read the
 * organizer's own calendar pages the results point to. A page found this way
 * counts only if it names the nominated handle itself, so a namesake is never
 * merged in; the listing then waits for a person, never publishing on its own.
 */
async function searchForOwnPages({intake, gathered, linkSearch, read, maxPages}) {
  const readable = gathered.pages.some((page) => page.via === "seed" && !page.abstainReason);
  const handles = seedHandles(intake.seed.urls);
  if (readable || handles.length === 0) return;
  const query = handles.map((handle) => `"${handle}"`).join(" OR ");
  let results;
  try {
    results = await linkSearch.search({runKey: `${intake.requestId}|search-1`, query});
  } catch (error) {
    if (error?.code !== "BUDGET_EXCEEDED") throw error;
    gathered.search = {query, outcome: "budget_exhausted", resultCount: 0, candidateUrls: []};
    return;
  }
  if (results === null) return;
  const candidateUrls = [...new Set((results ?? []).map((result) => result?.url).filter((url) =>
    typeof url === "string" && ownCalendarPage(url)))].slice(0, MAX_SEARCH_PAGES);
  gathered.search = {query, outcome: "searched", resultCount: (results ?? []).length, candidateUrls};
  const names = handles.map((handle) => handle.toLowerCase());
  const confirms = (snapshot) => {
    const haystack = JSON.stringify([snapshot.jsonLd, snapshot.embeddedJson, snapshot.text]).toLowerCase();
    return names.some((handle) => new RegExp(`(^|[^a-z0-9._])@?${escapeRegExp(handle)}([^a-z0-9_]|\\.(?![a-z0-9])|$)`, "u")
      .test(haystack));
  };
  for (const url of candidateUrls) {
    if (gathered.pages.length >= maxPages || gathered.stoppedReason) break;
    await read({url, via: "search"}, confirms);
  }
}

/** The Instagram, Linktree and Beacons handles a nomination names. */
function seedHandles(urls) {
  const handles = new Set();
  for (const url of urls) {
    try {
      const surface = normalizeOrganizerSurfaceUrl(url);
      if (surface.platform === "instagram" && surface.normalizedKey?.startsWith("instagram:")) {
        handles.add(surface.normalizedKey.slice("instagram:".length));
        continue;
      }
      const parsed = new URL(surface.canonicalUrl);
      const host = parsed.hostname.replace(/^www\./u, "");
      const first = parsed.pathname.split("/").filter(Boolean)[0];
      if (LINK_IN_BIO_HOSTS.has(host) && first) handles.add(decodeURIComponent(first));
    } catch {
      // An unusable seed is already recorded as invalid.
    }
  }
  return [...handles].filter((handle) => /^[A-Za-z0-9._]{3,30}$/u.test(handle)).sort();
}

function ownCalendarPage(url) {
  try {
    const surface = surfaceForOrganizerPage(normalizeOrganizerSurfaceUrl(url));
    return pageAdapterFor(surface.platform) !== null &&
      ["organizerProfile", "eventCalendar"].includes(surface.surfaceKind);
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

// Follow only the organizer's own pages that an adapter can read, one hop
// from a seed, so a nomination of one event page still yields the calendar.
// A page's related links (an Instagram account's captions) may also be event
// pages; each fetched page says what it is.
function followUrls(extraction, via) {
  if (via !== "seed") return [];
  const urls = [
    ...(extraction.events ?? []).map((event) => event.organizerUrl),
    ...(extraction.organizers ?? []).flatMap((organizer) => [organizer.url, ...(organizer.sameAs ?? [])]),
  ];
  const readable = (url, kinds, asOrganizer) => {
    try {
      const normalized = normalizeOrganizerSurfaceUrl(url);
      const surface = asOrganizer ? surfaceForOrganizerPage(normalized) : normalized;
      return surface.platform !== "instagram" && pageAdapterFor(surface.platform) !== null &&
        kinds.includes(surface.surfaceKind);
    } catch {
      return false;
    }
  };
  return [...new Set([
    ...urls.filter(Boolean).filter((url) => readable(url, ["organizerProfile", "eventCalendar"], true)),
    ...(extraction.relatedUrls ?? []).filter((url) =>
      readable(url, ["organizerProfile", "eventCalendar", "eventListing"], false)),
  ])];
}

/**
 * Merge gathered evidence into one reviewable listing with per-field sources.
 * Research findings (quoted facts from pages the agent read) rank below
 * adapter-read facts and above the nominator's typed name. When the caller
 * injects the organizers Catch already lists, the listing carries an advisory
 * duplicate check for the reviewer; it never blocks or merges anything.
 */
export function buildIntakeListing({request, gathered, now, findings = [], research = null,
  existingOrganizers = null}) {
  const intake = assertSupplyIntakeRequest(request);
  invariant(gathered?.requestId === intake.requestId, "INVALID_INTAKE_EVIDENCE",
    "Gathered evidence belongs to another intake request.");
  const observedAt = new Date(now).toISOString();
  const fieldEvidence = [];
  const choose = (field, candidates) => {
    const chosen = candidates.find((candidate) => typeof candidate.value === "string" && candidate.value.trim());
    if (!chosen) return null;
    fieldEvidence.push({field, sourceUrl: chosen.sourceUrl, method: chosen.method, adapterId: chosen.adapterId ?? null});
    return chosen.value.trim();
  };
  // Organizer pages describe the organizer; an event page's organizer block
  // only names it. A nominator's typed name is the fallback, never the source.
  const ranked = [...gathered.organizers].sort((left, right) =>
    rank(left) - rank(right) || left.pageUrl.localeCompare(right.pageUrl));
  const fromOrganizers = (field) => ranked.map((organizer) => ({value: organizer[field],
    sourceUrl: organizer.pageUrl, method: "adapter", adapterId: organizer.adapterId}));
  const fromEvents = (field) => gathered.events.map((event) => ({value: event[field],
    sourceUrl: event.pageUrl, method: "adapter", adapterId: event.adapterId}));
  const fromFindings = (field) => findings.filter((finding) => finding.field === field).map((finding) =>
    ({value: finding.value, sourceUrl: finding.sourceUrl, method: "agent", adapterId: null}));
  const seedName = {value: intake.seed.name, sourceUrl: null, method: "nominator", adapterId: null};
  const name = choose("name", [...fromOrganizers("name"), ...fromEvents("organizerName"),
    ...fromFindings("name"), seedName]);
  const description = choose("description", [...fromOrganizers("description"), ...fromFindings("description")]);
  const imageUrl = choose("imageUrl", [...fromOrganizers("imageUrl"), ...fromFindings("imageUrl")]);
  const locality = choose("locality", [...fromOrganizers("locality"), ...fromEvents("locality"),
    ...fromFindings("locality")]);

  const links = listingLinks(gathered, findings.filter((finding) => finding.field === "link"));
  const events = listingEvents(gathered.events, observedAt);
  const pastEventCount = dedupeEvents(gathered.events).length - events.length;
  const gaps = [];
  if (!name) gaps.push("organizer_name_missing");
  if (!description) gaps.push("description_missing");
  if (!imageUrl) gaps.push("image_missing");
  if (links.length === 0) gaps.push("organizer_page_missing");
  if (events.length === 0) gaps.push("no_upcoming_events");
  if (intake.seed.urls.length === 0) gaps.push("no_seed_urls");
  if (gathered.pages.some((page) => page.via === "seed" && page.abstainReason)) gaps.push("seed_page_unreadable");
  if (gathered.invalidUrls.length > 0) gaps.push("seed_url_invalid");
  if (gathered.stoppedReason) gaps.push(gathered.stoppedReason);
  // A page found by searching the handle is a person's call, never automatic.
  if (gathered.pages.some((page) => page.via === "search" && !page.abstainReason)) gaps.push("found_by_search");
  if (name && intake.seed.name && normalizeName(name) !== normalizeName(intake.seed.name)) {
    gaps.push("name_differs_from_nomination");
  }
  if (research && research.identityConfident === false) gaps.push("identity_unconfirmed");
  const identityKeys = [...new Set(links.map((link) => link.normalizedKey).filter(Boolean))].sort();
  const duplicateCheck = existingOrganizers === null ? null : duplicateCheckFor({
    listingId: `intake-${intake.requestId}`, market: intake.market, seed: intake.seed,
    organizer: {name, links, identityKeys},
  }, existingOrganizers);
  if (duplicateCheck?.flagged) gaps.push(duplicateCheck.gap);
  const listing = {
    schemaVersion: 1,
    listingId: `intake-${intake.requestId}`,
    requestId: intake.requestId,
    kind: intake.kind,
    market: intake.market,
    submittedBy: intake.submittedBy,
    submittedAt: intake.submittedAt,
    seed: intake.seed,
    organizer: {
      name,
      description,
      imageUrl,
      locality,
      categories: intake.seed.categories,
      links,
      identityKeys,
    },
    ...(duplicateCheck === null ? {} : {duplicateCheck: duplicateCheck.summary}),
    fieldEvidence,
    events,
    pastEventCount,
    pages: gathered.pages.map((page) => ({
      url: page.url,
      via: page.via,
      platform: page.platform,
      outcome: page.receipt.outcome,
      adapterId: page.adapterId,
      pageKind: page.pageKind,
      abstainReason: page.abstainReason,
      snapshotHash: page.receipt.snapshotHash,
      capturedAt: page.receipt.capturedAt,
    })),
    gaps: [...new Set(gaps)].sort(),
    researchNeeded: research === null && gaps.some((gap) => RESEARCH_GAPS.has(gap)),
    research: research === null ? null : {
      stopReason: research.stopReason,
      note: research.note ?? null,
      identityConfident: research.identityConfident ?? null,
      findings: findings.length,
      costMicros: research.costMicros,
    },
    observedAt,
  };
  return {...listing, contentHash: hashValue(listing)};
}

// The reviewer's view of likely duplicates: who, how strongly, and why.
function duplicateCheckFor(subject, existingOrganizers) {
  const result = createOrganizerMatcher({organizers: existingOrganizers}).matchListing(subject);
  return {
    flagged: result.flag !== null,
    gap: result.flag?.gap ?? null,
    summary: {
      policyId: result.policyId,
      authority: result.authority,
      verdict: result.verdict,
      reasons: result.reasons,
      organizersCompared: result.organizersCompared,
      inventoryHash: result.inventoryHash,
      candidates: result.candidates.map((candidate) => ({
        organizerId: candidate.organizerId,
        name: candidate.name,
        score: candidate.score,
        band: candidate.band,
        signals: candidate.signals.map((signal) => signal.code),
        conflicts: candidate.conflicts.map((conflict) => conflict.code),
        rationale: candidate.rationale,
      })),
    },
  };
}

const RESEARCH_GAPS = new Set(["organizer_name_missing", "description_missing", "organizer_page_missing",
  "no_upcoming_events", "no_seed_urls", "seed_page_unreadable", "seed_url_invalid"]);

function rank(organizer) {
  if (organizer.pageKind === "organizer_page") return 0;
  if (organizer.adapterId === "schema-org-event") return 1;
  return 2;
}

function listingLinks(gathered, linkFindings = []) {
  const links = new Map();
  // URLs that name the organizer (its own page, an event's organizer link)
  // resolve ambiguous slugs as organizer surfaces; event pages are not links.
  const add = (url, evidenceUrl, {organizerRole}) => {
    let surface;
    try {
      surface = normalizeOrganizerSurfaceUrl(url);
    } catch {
      return;
    }
    if (organizerRole) surface = surfaceForOrganizerPage(surface);
    if (!LISTING_SURFACE_KINDS.has(surface.surfaceKind)) return;
    const key = surface.normalizedKey ?? surface.canonicalUrl;
    if (!links.has(key)) {
      links.set(key, {platform: surface.platform, surfaceKind: surface.surfaceKind,
        url: surface.canonicalUrl, normalizedKey: surface.normalizedKey, evidenceUrl});
    }
  };
  for (const page of gathered.pages) {
    if (page.receipt.outcome !== "fetched" || page.pageKind === "event_page" ||
        page.abstainReason === "search_result_unconfirmed") continue;
    add(page.url, page.url, {organizerRole: page.pageKind === "organizer_page"});
  }
  for (const organizer of gathered.organizers) {
    if (organizer.url) add(organizer.url, organizer.pageUrl, {organizerRole: true});
    for (const url of organizer.sameAs ?? []) add(url, organizer.pageUrl, {organizerRole: true});
  }
  for (const event of gathered.events) {
    if (event.organizerUrl) add(event.organizerUrl, event.pageUrl, {organizerRole: true});
  }
  for (const finding of linkFindings) add(finding.value, finding.sourceUrl, {organizerRole: true});
  return [...links.values()].sort((left, right) => left.url.localeCompare(right.url)).slice(0, MAX_LISTING_LINKS);
}

function dedupeEvents(events) {
  const byKey = new Map();
  for (const event of events) {
    if (!event.sourceEntityId || !event.platform) continue;
    const key = `${event.platform}:${event.sourceEntityId}`;
    if (!byKey.has(key)) byKey.set(key, event);
  }
  return [...byKey.values()];
}

function listingEvents(events, observedAt) {
  const upcoming = dedupeEvents(events).filter((event) => {
    const start = Date.parse(event.startAt ?? "");
    const end = Date.parse(event.endAt ?? event.startAt ?? "");
    return Number.isFinite(start) && Number.isFinite(end) && end >= Date.parse(observedAt);
  });
  // The same occurrence listed on two platforms is one event.
  const occurrences = new Map();
  for (const event of upcoming) {
    const key = `${normalizeName(event.title ?? "")}@${new Date(Date.parse(event.startAt)).toISOString()}`;
    const existing = occurrences.get(key);
    if (existing) {
      existing.alsoListedAt = [...new Set([...existing.alsoListedAt, event.sourceUrl ?? event.pageUrl])].sort();
      continue;
    }
    occurrences.set(key, {
      eventKey: `${event.platform}:${event.sourceEntityId}`,
      platform: event.platform,
      sourceEntityId: event.sourceEntityId,
      title: event.title,
      description: event.description ?? null,
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      timezone: event.timezone ?? null,
      venue: event.venue ?? null,
      address: event.address ?? null,
      locality: event.locality ?? null,
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      sourceUrl: event.sourceUrl ?? event.pageUrl,
      imageUrl: event.imageUrl ?? null,
      price: event.price ?? null,
      status: event.status ?? null,
      attendanceMode: event.attendanceMode ?? null,
      organizerName: event.organizerName ?? null,
      organizerUrl: event.organizerUrl ?? null,
      adapterId: event.adapterId,
      evidenceUrl: event.pageUrl,
      evidenceFields: event.evidenceFields ?? [],
      alsoListedAt: [],
    });
  }
  return [...occurrences.values()]
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt) ||
      left.eventKey.localeCompare(right.eventKey))
    .slice(0, MAX_LISTING_EVENTS);
}

function normalizeName(value) {
  return String(value).normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** The frozen workflow input for one request: its listing, nothing else. */
export function intakeInputSnapshot({listing}) {
  invariant(listing?.schemaVersion === 1 && typeof listing.listingId === "string", "INVALID_INTAKE_EVIDENCE",
    "An intake snapshot requires a built listing.");
  return finalizeSupplyInputSnapshot({
    schemaVersion: SUPPLY_INPUT_SNAPSHOT_VERSION,
    snapshotId: listing.listingId.slice(0, 240),
    market: listing.market,
    observedAt: listing.observedAt,
    provenance: {source: "supply_intake_request", sourceRunIds: [listing.requestId]},
    organizerReviewPolicy: null,
    sourceResults: [],
    eventCandidates: [],
    organizerPublicationPackets: [],
    organizerSearchCandidates: [],
    externalEventCandidates: [],
    organizerLeads: [],
    crawlSurfaces: [],
    intakeListings: [listing],
  });
}
