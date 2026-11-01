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
import type {AdminOrganizerDetails} from "../types/adminTypes";
import {
  sampleEventDetails,
  sampleExternalEventRows,
  sampleOrganizerDetails,
} from "./sampleData";

/**
 * Sample-mode stand-ins for the Organizers and Events records. Rows come from the same
 * records the organizer and event pages open in sample mode, so every row opens, and they filter, count and
 * page like the server so walkthroughs and Storybook show the live directories' totals and chips.
 */

type OrganizerRow = AdminListOrganizerDirectoryCallableResponse["rows"][
  number];
type EventRow = AdminListEventDirectoryCallableResponse["rows"][number];
type Overview = AdminGetOrganizerOverviewCallableResponse;
type Facet = AdminListOrganizerDirectoryCallableResponse["facets"]["cities"][
  number];

const sampleNow = Date.parse("2026-06-25T12:00:00.000Z");
const sampleGeneratedAt = new Date(sampleNow).toISOString();
const sampleUid = "sample-owner";
const riya = {uid: sampleUid, name: "Riya Sharma"};
const karan = {uid: "sample-colleague", name: "Karan Mehta"};
const cityLabels: Record<string, string> = {
  "in-mh-mumbai": "Mumbai", "in-mp-indore": "Indore",
};
const cityBySlug: Record<string, string> = {
  mumbai: "in-mh-mumbai", indore: "in-mp-indore",
};

/** What each listed organizer adds beyond its page record. */
const organizerExtras: Record<string, {
  claimState: OrganizerRow["claimState"];
  claimedByName: string | null;
  salesOwner: OrganizerRow["salesOwner"];
  listedAt: string;
  growth: Overview["growth"];
}> = {
  "afterfly": {claimState: "unclaimed", claimedByName: null, salesOwner: riya,
    listedAt: "2026-06-20T07:50:00.000Z", growth: {channel: "sales_associate",
      nominator: {uid: sampleUid, name: "Riya Sharma", role: "associate"},
      firstPaidBookingAt: null}},
  "bhag": {claimState: "claimPending", claimedByName: null, salesOwner: riya,
    listedAt: "2026-06-12T09:00:00.000Z", growth: {channel: "imported",
      nominator: null, firstPaidBookingAt: null}},
  "bandra-runners": {claimState: "unclaimed", claimedByName: null,
    salesOwner: {uid: "sample-ops", name: "Dev Iyer"},
    listedAt: "2026-06-02T09:00:00.000Z", growth: null},
  "mumbai-padel-social": {claimState: "claimed", claimedByName: "Kunal",
    salesOwner: karan, listedAt: "2026-05-03T09:00:00.000Z", growth: {
      channel: "partner", nominator: {uid: "sample-partner",
        name: "Neha Kulkarni", role: "partner"},
      firstPaidBookingAt: "2026-05-24T10:00:00.000Z"}},
};

function pageState(organizer: AdminOrganizerDetails): OrganizerRow["pageState"] {
  const status = organizer.publicPage.publishStatus;
  if (status === "removed") return "removed";
  if (status === "suppressed") return "suppressed";
  if (status !== "published") return "draft";
  if (organizer.appVisibility === "hidden") return "hiddenInApp";
  return organizer.publicPage.indexStatus === "noindex" ? "hiddenFromSearch" : "live";
}

function kindKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function marketOf(slug: string | null): string | null {
  return slug ? cityBySlug[slug] ?? slug : null;
}

export const sampleEventRows: EventRow[] = [
  ...Object.values(sampleEventDetails).map((event): EventRow => {
    const citySlug = marketOf(event.discovery.citySlug);
    return {
      key: `catch:${event.eventId}`,
      eventId: event.eventId,
      source: "catch",
      platform: null,
      title: event.title,
      organizerId: event.organizerId,
      organizerName: event.organizerName,
      startTime: event.startTime,
      citySlug,
      cityLabel: cityLabels[citySlug ?? ""] ?? citySlug,
      status: event.status === "cancelled" ? "cancelled" :
        event.bookedCount >= event.capacityLimit ? "full" : "live",
      bookedCount: event.bookedCount,
      capacityLimit: event.capacityLimit,
    };
  }),
  ...sampleExternalEventRows.map((event): EventRow => {
    const citySlug = marketOf(event.citySlug);
    return {
      key: `imported:${event.eventId}`,
      eventId: event.eventId,
      source: "imported",
      platform: event.platform,
      title: event.title,
      organizerId: event.canonicalHostId,
      organizerName: sampleOrganizerDetails[event.canonicalHostId]?.name ?? null,
      startTime: event.startTime,
      citySlug,
      cityLabel: cityLabels[citySlug ?? ""] ?? citySlug,
      status: event.status === "cancelled" ? "cancelled" :
        event.publicationStatus === "draft" ? "needsCheck" :
          event.publicationStatus === "public" ? "live" : "removed",
      bookedCount: null,
      capacityLimit: null,
    };
  }),
];

function eventView(row: EventRow): "upcoming" | "past" | "cancelled" {
  if (row.status === "cancelled") return "cancelled";
  return Date.parse(row.startTime ?? "") >= sampleNow ? "upcoming" : "past";
}

function thisWeek(row: EventRow): boolean {
  const start = Date.parse(row.startTime ?? "");
  return start >= sampleNow && start < sampleNow + 7 * 24 * 60 * 60 * 1000;
}

export const sampleOrganizerRows: OrganizerRow[] = Object.values(sampleOrganizerDetails)
  .map((organizer): OrganizerRow => {
    const extras = organizerExtras[organizer.organizerId];
    const citySlug = marketOf(organizer.location);
    return {
      organizerId: organizer.organizerId,
      name: organizer.name,
      kindLabel: organizer.displayCategory,
      citySlug,
      cityLabel: cityLabels[citySlug ?? ""] ?? organizer.cityName,
      area: organizer.area,
      pageState: pageState(organizer),
      claimState: extras?.claimState ?? "unclaimed",
      claimedByName: extras?.claimedByName ?? null,
      salesOwner: extras?.salesOwner ?? null,
      upcomingEventCount: sampleEventRows.filter((event) =>
        event.organizerId === organizer.organizerId &&
        eventView(event) === "upcoming").length,
      listedAt: extras?.listedAt ?? null,
    };
  });

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
      kindKey(row.kindLabel ?? "") === payload.kind,
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
  const count = (view: "live" | "unclaimed" | "hidden") =>
    sampleOrganizerRows.filter((row) => inOrganizerView(row, view)).length;
  return {
    generatedAt: sampleGeneratedAt,
    total: matching.length,
    views: {all: sampleOrganizerRows.length, live: count("live"),
      unclaimed: count("unclaimed"), hidden: count("hidden")},
    facets: {
      cities: countFacets(except("city").flatMap((row) => row.citySlug ?
        [{value: row.citySlug, label: row.cityLabel ?? row.citySlug}] : [])),
      kinds: countFacets(except("kind").flatMap((row) => row.kindLabel ?
        [{value: kindKey(row.kindLabel), label: row.kindLabel}] : [])),
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

export function sampleListEventDirectory(
  payload: AdminListEventDirectoryCallablePayload
): AdminListEventDirectoryCallableResponse {
  const view = payload.view ?? "upcoming";
  const inView = sampleEventRows.filter((row) => eventView(row) === view);
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
    sampleEventRows.filter((row) => eventView(row) === name).length;
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
): Overview {
  const row = sampleOrganizerRows.find((item) =>
    item.organizerId === payload.organizerId);
  const organizer = sampleOrganizerDetails[payload.organizerId];
  if (!row || !organizer) throw new Error("Organizer not found.");
  const extras = organizerExtras[row.organizerId];
  const upcomingEvents = sampleEventRows
    .filter((event) => event.organizerId === row.organizerId &&
      eventView(event) === "upcoming")
    .map(({key, eventId, source, platform, title, startTime, status}) =>
      ({key, eventId, source, platform, title, startTime, status}));
  const nominator = extras?.growth?.nominator ?? null;
  const journey: Overview["journey"] = [
    ...(nominator ? [{kind: "nominated" as const,
      at: "2026-06-18T16:11:00.000Z", actorName: nominator.name,
      detail: organizer.ownerLinks[0]?.url ?? null},
    {kind: "listingBuilt" as const, at: "2026-06-18T16:13:00.000Z",
      actorName: null, detail: String(upcomingEvents.length)},
    {kind: "approved" as const, at: row.listedAt, actorName: "Suvrat",
      detail: null}] : []),
    {kind: "listed", at: row.listedAt, actorName: null, detail: null},
    ...(row.claimState === "claimPending" ? [{kind: "claimRequested" as const,
      at: "2026-06-23T08:00:00.000Z", actorName: "Arjun Bhagat",
      detail: "manager"}] : []),
    ...(row.claimedByName ? [{kind: "claimed" as const,
      at: "2026-05-10T09:00:00.000Z", actorName: row.claimedByName,
      detail: null}] : []),
    ...(extras?.growth?.firstPaidBookingAt ? [{kind: "firstPaidBooking" as const,
      at: extras.growth.firstPaidBookingAt, actorName: null, detail: null}] : []),
  ];
  return {
    generatedAt: sampleGeneratedAt,
    organizer: {
      organizerId: row.organizerId, name: row.name, kindLabel: row.kindLabel,
      citySlug: row.citySlug, cityLabel: row.cityLabel, area: row.area,
      pageState: row.pageState,
      publishStatus: organizer.publicPage.publishStatus,
      indexStatus: organizer.publicPage.indexStatus as Overview["organizer"]["indexStatus"],
      canonicalPath: organizer.publicPage.canonicalPath,
      appVisibility: organizer.appVisibility,
      claimState: row.claimState,
      claimedByName: row.claimedByName,
      listedAt: row.listedAt,
      hasImage: Boolean(organizer.imageUrl || organizer.profileImageUrl),
      origin: organizer.provenance.origin as Overview["organizer"]["origin"],
    },
    salesOwner: row.salesOwner,
    nextAction: row.claimState === "unclaimed" ? "Send the claim link" : null,
    nextTask: row.claimState === "unclaimed" && row.salesOwner ? {
      taskId: `sample-task-${row.organizerId}`,
      title: `Send ${row.name} the claim link`,
      dueAt: "2026-06-29T04:00:00.000Z", ownerName: row.salesOwner.name,
    } : null,
    terms: {source: row.claimState === "claimed" ? "organizer" : "platform",
      rateBasisPoints: row.claimState === "claimed" ? 400 : 500,
      capMinor: 1_000_000},
    payments: row.claimState === "claimed" ?
      {state: "connected", webhookVerified: true} :
      {state: "notConnected", webhookVerified: false},
    pendingClaim: row.claimState === "claimPending" ? {requestId:
      "sample-claim", requesterName: "Arjun Bhagat", requesterRole: "manager",
    createdAt: "2026-06-23T08:00:00.000Z"} : null,
    growth: extras?.growth ?? null,
    journey: [...journey].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? "")),
    nextStep: row.claimState === "claimPending" ? "decideClaim" :
      row.claimState === "unclaimed" ? "claim" : null,
    upcomingEvents,
    upcomingEventCount: upcomingEvents.length,
  };
}
