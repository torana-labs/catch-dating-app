import type {AdminGetOrganizerOverviewCallablePayload} from
  "../../generated/contracts/adminGetOrganizerOverviewCallablePayload";
import type {AdminGetOrganizerOverviewCallableResponse} from
  "../../generated/contracts/adminGetOrganizerOverviewCallableResponse";
import type {AdminListEventDirectoryCallablePayload} from
  "../../generated/contracts/adminListEventDirectoryCallablePayload";
import type {AdminListEventDirectoryCallableResponse} from
  "../../generated/contracts/adminListEventDirectoryCallableResponse";
import type {AdminListOrganizerDirectoryCallablePayload} from
  "../../generated/contracts/adminListOrganizerDirectoryCallablePayload";
import type {AdminListOrganizerDirectoryCallableResponse} from
  "../../generated/contracts/adminListOrganizerDirectoryCallableResponse";

/**
 * Sample-mode stand-ins for the Organizers and Events records. They filter,
 * count and page like the server so sample walkthroughs and Storybook show
 * the same totals and chips the live directories do.
 */

type OrganizerRow = AdminListOrganizerDirectoryCallableResponse["rows"][
  number];
type EventRow = AdminListEventDirectoryCallableResponse["rows"][number];
type Facet = AdminListOrganizerDirectoryCallableResponse["facets"]["cities"][
  number];

const sampleNow = Date.parse("2026-11-01T12:00:00.000Z");
const sampleGeneratedAt = new Date(sampleNow).toISOString();
const sampleUid = "sample-owner";
const mumbai = {citySlug: "in-mh-mumbai", cityLabel: "Mumbai"};
const indore = {citySlug: "in-mp-indore", cityLabel: "Indore"};
const riya = {uid: sampleUid, name: "Riya Sharma"};
const karan = {uid: "sample-colleague", name: "Karan Mehta"};

const organizerKinds: Record<string, string> = {
  "afterfly": "social-nights", "bhag": "runs", "bandra": "runs",
  "lantern": "trivia", "padel": "courts", "afterfly-in": "runs",
};

const listedOrganizers: OrganizerRow[] = [
  {organizerId: "afterfly", name: "Afterfly", kindLabel: "Social nights",
    ...mumbai, area: "Bandra", pageState: "hiddenFromSearch",
    claimState: "unclaimed", claimedByName: null, salesOwner: riya,
    upcomingEventCount: 0, listedAt: "2026-10-31T07:50:00.000Z"},
  {organizerId: "bhag", name: "Bhag Club", kindLabel: "Runs", ...mumbai,
    area: "Juhu", pageState: "live", claimState: "claimPending",
    claimedByName: null, salesOwner: riya, upcomingEventCount: 0,
    listedAt: "2026-10-12T09:00:00.000Z"},
  {organizerId: "bandra", name: "Bandra Runners", kindLabel: "Runs",
    ...mumbai, area: "Bandra", pageState: "hiddenInApp",
    claimState: "unclaimed", claimedByName: null,
    salesOwner: {uid: "sample-ops", name: "Dev Iyer"},
    upcomingEventCount: 0, listedAt: "2026-10-02T09:00:00.000Z"},
  {organizerId: "lantern", name: "Lantern Lane Social", kindLabel: "Trivia",
    ...mumbai, area: "Bandra West", pageState: "live", claimState: "claimed",
    claimedByName: "Meher", salesOwner: riya, upcomingEventCount: 0,
    listedAt: "2026-08-14T09:00:00.000Z"},
  {organizerId: "padel", name: "Mumbai Padel Social", kindLabel: "Courts",
    ...mumbai, area: "Lower Parel", pageState: "live", claimState: "claimed",
    claimedByName: "Kunal", salesOwner: karan, upcomingEventCount: 0,
    listedAt: "2026-09-03T09:00:00.000Z"},
  {organizerId: "afterfly-in", name: "AFTER FLY", kindLabel: "Runs",
    ...indore, area: "Vijay Nagar", pageState: "live",
    claimState: "unclaimed", claimedByName: null, salesOwner: null,
    upcomingEventCount: 0, listedAt: "2026-06-20T09:00:00.000Z"},
];

export const catchAndImportedEvents: EventRow[] = [
  eventRow("takeoff", "imported", "Takeoff: Run + Rave", "afterfly",
    "Afterfly", "2026-11-02T12:30:00.000Z", "live", null, null, "luma"),
  eventRow("pace", "catch", "Pace pods: 5K", "afterfly-in", "AFTER FLY",
    "2026-11-03T01:00:00.000Z", "cancelled", 0, 20, null, indore),
  eventRow("trivia", "catch", "Tuesday Trivia Night", "lantern",
    "Lantern Lane Social", "2026-11-05T14:00:00.000Z", "live", 26, 32),
  eventRow("supper", "catch", "Long Table Supper", "lantern",
    "Lantern Lane Social", "2026-11-06T14:30:00.000Z", "full", 14, 14),
  eventRow("padel-mixer", "catch", "Padel mixer", "padel",
    "Mumbai Padel Social", "2026-11-07T13:30:00.000Z", "full", 16, 16),
  eventRow("rooftop-social", "imported", "Rooftop Social", "afterfly",
    "Afterfly", "2026-11-09T14:30:00.000Z", "live", null, null, "luma"),
  eventRow("rooftop", "imported", "Rooftop Singles Mixer", null, null,
    "2026-11-14T14:30:00.000Z", "needsCheck", null, null, "district"),
  eventRow("neon", "imported", "Neon Night Run", "afterfly", "Afterfly",
    "2026-11-15T15:30:00.000Z", "needsCheck", null, null, "luma"),
  eventRow("first-trivia", "catch", "First Trivia Night", "lantern",
    "Lantern Lane Social", "2026-08-27T14:00:00.000Z", "live", 18, 24),
  eventRow("monsoon", "imported", "Monsoon Run", "afterfly", "Afterfly",
    "2026-10-19T01:00:00.000Z", "live", null, null, "luma"),
];

/** Upcoming counts come from the events above, as the server counts them. */
export const sampleOrganizerRows: OrganizerRow[] = listedOrganizers.map(
  (row) => ({...row, upcomingEventCount: catchAndImportedEvents.filter((event) =>
    event.organizerId === row.organizerId &&
    eventView(event) === "upcoming").length}));

function eventRow(
  eventId: string,
  source: EventRow["source"],
  title: string,
  organizerId: string | null,
  organizerName: string | null,
  startTime: string,
  status: EventRow["status"],
  bookedCount: number | null,
  capacityLimit: number | null,
  platform: EventRow["platform"] = null,
  city = mumbai
): EventRow {
  return {key: `${source}:${eventId}`, eventId, source, platform, title,
    organizerId, organizerName, startTime, ...city, status, bookedCount,
    capacityLimit};
}

function countFacets(entries: Array<{value: string; label: string}>): Facet[] {
  const counts = new Map<string, Facet>();
  for (const {value, label} of entries) {
    const facet = counts.get(value) ?? {value, label, count: 0};
    facet.count += 1;
    counts.set(value, facet);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function matchesText(query: string | null | undefined,
  values: Array<string | null>): boolean {
  const text = (query ?? "").trim().toLowerCase();
  if (!text) return true;
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return text.split(/\s+/u).every((token) => haystack.includes(token));
}

function pageOf<T>(rows: T[], cursor: string | null | undefined,
  limit = 50): {rows: T[]; nextCursor: string | null} {
  const offset = cursor ? Number(cursor.slice(2)) : 0;
  const page = rows.slice(offset, offset + limit);
  const next = offset + page.length;
  return {rows: page, nextCursor: next < rows.length ? `o:${next}` : null};
}

function claimFilter(state: OrganizerRow["claimState"]) {
  if (state === "claimPending") return "claimPending";
  return state === "claimed" || state === "verified" ? "claimed" : "unclaimed";
}

function inOrganizerView(row: OrganizerRow,
  view: AdminListOrganizerDirectoryCallablePayload["view"]): boolean {
  if (view === "live") return row.pageState === "live";
  if (view === "unclaimed") return claimFilter(row.claimState) === "unclaimed";
  if (view === "hidden") return row.pageState === "hiddenInApp";
  return true;
}

export function sampleListOrganizerDirectory(
  payload: AdminListOrganizerDirectoryCallablePayload
): AdminListOrganizerDirectoryCallableResponse {
  const filters = {
    city: (row: OrganizerRow) => !payload.citySlug ||
      row.citySlug === payload.citySlug,
    kind: (row: OrganizerRow) => !payload.kind ||
      organizerKinds[row.organizerId] === payload.kind,
    claim: (row: OrganizerRow) => !payload.claimState ||
      claimFilter(row.claimState) === payload.claimState,
    mine: (row: OrganizerRow) => !payload.mine ||
      row.salesOwner?.uid === sampleUid,
    query: (row: OrganizerRow) => matchesText(payload.query,
      [row.name, row.kindLabel, row.cityLabel, row.area]),
    view: (row: OrganizerRow) => inOrganizerView(row, payload.view ?? "all"),
  };
  type Name = keyof typeof filters;
  const except = (skip: Name | null) => sampleOrganizerRows.filter((row) =>
    (Object.keys(filters) as Name[]).every((name) =>
      name === skip || filters[name](row)));
  const matching = except(null).sort((a, b) =>
    (b.listedAt ?? "").localeCompare(a.listedAt ?? ""));
  const page = pageOf(matching, payload.cursor, payload.limit);
  return {
    generatedAt: sampleGeneratedAt,
    total: matching.length,
    views: {
      all: sampleOrganizerRows.length,
      live: sampleOrganizerRows.filter((r) => inOrganizerView(r, "live")).length,
      unclaimed: sampleOrganizerRows
        .filter((r) => inOrganizerView(r, "unclaimed")).length,
      hidden: sampleOrganizerRows
        .filter((r) => inOrganizerView(r, "hidden")).length,
    },
    facets: {
      cities: countFacets(except("city").flatMap((row) => row.citySlug ?
        [{value: row.citySlug, label: row.cityLabel ?? row.citySlug}] : [])),
      kinds: countFacets(except("kind").flatMap((row) => row.kindLabel ?
        [{value: organizerKinds[row.organizerId], label: row.kindLabel}] :
        [])),
      claimStates: countFacets(except("claim").map((row) => ({
        value: claimFilter(row.claimState), label: claimFilter(row.claimState),
      }))),
      mine: except("mine").filter((row) => row.salesOwner?.uid === sampleUid)
        .length,
    },
    scan: {complete: true, scanned: sampleOrganizerRows.length},
    rows: page.rows,
    nextCursor: page.nextCursor,
  };
}

function eventView(row: EventRow): "upcoming" | "past" | "cancelled" {
  if (row.status === "cancelled") return "cancelled";
  return Date.parse(row.startTime ?? "") >= sampleNow ? "upcoming" : "past";
}

function thisWeek(row: EventRow): boolean {
  const start = Date.parse(row.startTime ?? "");
  return start >= sampleNow && start < sampleNow + 7 * 24 * 60 * 60 * 1000;
}

export function sampleListEventDirectory(
  payload: AdminListEventDirectoryCallablePayload
): AdminListEventDirectoryCallableResponse {
  const view = payload.view ?? "upcoming";
  const inView = catchAndImportedEvents.filter((row) => eventView(row) === view);
  const filters = {
    city: (row: EventRow) => !payload.citySlug ||
      row.citySlug === payload.citySlug,
    source: (row: EventRow) => !payload.source || row.source === payload.source,
    needsCheck: (row: EventRow) => !payload.needsCheck ||
      row.status === "needsCheck",
    thisWeek: (row: EventRow) => !payload.thisWeek || thisWeek(row),
    organizer: (row: EventRow) => !payload.organizerId ||
      row.organizerId === payload.organizerId,
    query: (row: EventRow) => matchesText(payload.query,
      [row.title, row.organizerName, row.cityLabel, row.platform]),
  };
  type Name = keyof typeof filters;
  const except = (skip: Name | null) => inView.filter((row) =>
    (Object.keys(filters) as Name[]).every((name) =>
      name === skip || filters[name](row)));
  const direction = view === "upcoming" ? 1 : -1;
  const matching = except(null).sort((a, b) =>
    direction * (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const page = pageOf(matching, payload.cursor, payload.limit);
  const count = (name: "upcoming" | "past" | "cancelled") =>
    catchAndImportedEvents.filter((row) => eventView(row) === name).length;
  return {
    generatedAt: sampleGeneratedAt,
    total: matching.length,
    views: {upcoming: count("upcoming"), past: count("past"),
      cancelled: count("cancelled")},
    facets: {
      catch: except("source").filter((row) => row.source === "catch").length,
      imported: except("source").filter((row) => row.source === "imported")
        .length,
      needsCheck: except("needsCheck")
        .filter((row) => row.status === "needsCheck").length,
      thisWeek: except("thisWeek").filter(thisWeek).length,
      cities: countFacets(except("city").flatMap((row) => row.citySlug ?
        [{value: row.citySlug, label: row.cityLabel ?? row.citySlug}] : [])),
    },
    scan: {complete: true, scanned: inView.length},
    rows: page.rows,
    nextCursor: page.nextCursor,
  };
}

export function sampleGetOrganizerOverview(
  payload: AdminGetOrganizerOverviewCallablePayload
): AdminGetOrganizerOverviewCallableResponse {
  const row = sampleOrganizerRows.find((item) =>
    item.organizerId === payload.organizerId);
  if (!row) throw new Error("Organizer not found.");
  const upcomingEvents = catchAndImportedEvents
    .filter((event) => event.organizerId === row.organizerId &&
      eventView(event) === "upcoming")
    .map(({key, eventId, source, platform, title, startTime, status}) =>
      ({key, eventId, source, platform, title, startTime, status}));
  const afterfly = row.organizerId === "afterfly";
  return {
    generatedAt: sampleGeneratedAt,
    organizer: {
      organizerId: row.organizerId, name: row.name, kindLabel: row.kindLabel,
      citySlug: row.citySlug, cityLabel: row.cityLabel, area: row.area,
      pageState: row.pageState,
      publishStatus: "published",
      indexStatus: row.pageState === "hiddenFromSearch" ? "noindex" :
        "indexed",
      canonicalPath: `/mumbai/${row.organizerId}`,
      appVisibility: row.pageState === "hiddenInApp" ? "hidden" :
        "discoverable",
      claimState: row.claimState,
      claimedByName: row.claimedByName,
      listedAt: row.listedAt,
      hasImage: !afterfly,
      origin: afterfly ? "scraper" : "userCreated",
    },
    salesOwner: row.salesOwner,
    nextAction: afterfly ? "Send the claim link" : null,
    nextTask: afterfly ? {taskId: "sample-task", title:
      "Send Afterfly the claim link", dueAt: "2026-11-04T04:00:00.000Z",
    ownerName: "Riya Sharma"} : null,
    terms: {source: row.organizerId === "lantern" ? "organizer" : "platform",
      rateBasisPoints: row.organizerId === "lantern" ? 400 : 500,
      capMinor: 1_000_000},
    payments: row.claimState === "claimed" ?
      {state: "connected", webhookVerified: true} :
      {state: "notConnected", webhookVerified: false},
    pendingClaim: row.claimState === "claimPending" ? {requestId:
      "sample-claim", requesterName: "Arjun Bhagat", requesterRole: "manager",
    createdAt: "2026-10-30T08:00:00.000Z"} : null,
    growth: afterfly ? {channel: "sales_associate", nominator: {uid: sampleUid,
      name: "Riya Sharma", role: "associate"}, firstPaidBookingAt: null} :
      row.organizerId === "lantern" ? {channel: "partner", nominator: {
        uid: "sample-partner", name: "Neha Kulkarni", role: "partner"},
      firstPaidBookingAt: "2026-08-25T10:00:00.000Z"} : null,
    journey: afterfly ? [
      {kind: "nominated", at: "2026-10-28T16:11:00.000Z",
        actorName: "Riya Sharma", detail: "https://luma.com/afterfly"},
      {kind: "listingBuilt", at: "2026-10-28T16:13:00.000Z", actorName: null,
        detail: "3"},
      {kind: "approved", at: "2026-10-31T07:50:00.000Z", actorName: "Suvrat",
        detail: null},
      {kind: "listed", at: "2026-10-31T07:50:00.000Z", actorName: null,
        detail: null},
    ] : [
      {kind: "listed", at: row.listedAt, actorName: null, detail: null},
      ...(row.claimedByName ? [{kind: "claimed" as const, at: row.listedAt,
        actorName: row.claimedByName, detail: null}] : []),
    ],
    nextStep: row.claimState === "claimPending" ? "decideClaim" :
      row.claimState === "unclaimed" ? "claim" : null,
    upcomingEvents,
    upcomingEventCount: upcomingEvents.length,
  };
}
