import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  ExternalEventDocument,
  EventDocument,
  OrganizerDocument,
  OrganizerSalesAccountDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminListOrganizerDirectoryCallablePayload} from
  "../shared/generated/adminListOrganizerDirectoryCallablePayload";
import type {AdminListOrganizerDirectoryCallableResponse} from
  "../shared/generated/adminListOrganizerDirectoryCallableResponse";
import {
  validateAdminListOrganizerDirectoryCallablePayload,
} from "../shared/generated/validators/adminListOrganizerDirectoryInput";
import {validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  authStaffNames,
  cityOf,
  clampPageLimit,
  countFacets,
  kindKey,
  matchesQueryText,
  normalizeNullableString,
  normalizeQueryText,
  organizerClaimedByName,
  organizerClaimState,
  organizerKindLabel,
  organizerPageState,
  pageOf,
  recordsReaderRoles,
  timestampIso,
  timestampMillis,
  type StaffNames,
} from "./recordsDirectory";

/** The most organizers, sales accounts or upcoming events one read covers. */
export const organizerDirectoryScanLimit = 5000;

type DirectoryRow = AdminListOrganizerDirectoryCallableResponse["rows"][
  number];
type View = NonNullable<AdminListOrganizerDirectoryCallablePayload["view"]>;

interface OrganizerDirectoryDeps {
  firestore: () => FirebaseFirestore.Firestore;
  staffNames: StaffNames;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerDirectoryDeps = {
  firestore: () => admin.firestore(),
  staffNames: authStaffNames,
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

interface Candidate {
  row: DirectoryRow;
  kindKey: string | null;
  ownerUid: string | null;
  listedMillis: number;
}

/**
 * Lists the Admin Organizers directory with real totals: every organizer
 * is read (up to the scan limit) so views, chip counts and paging agree.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerDirectoryDeps} deps Injectable dependencies.
 * @return {Promise<AdminListOrganizerDirectoryCallableResponse>} One page.
 */
export async function adminListOrganizerDirectoryHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerDirectoryDeps = defaultDeps
): Promise<AdminListOrganizerDirectoryCallableResponse> {
  const adminContext = requireAdminRole(request, recordsReaderRoles);
  const data =
    validateCallableWithAjv<AdminListOrganizerDirectoryCallablePayload>(
      request,
      validateAdminListOrganizerDirectoryCallablePayload,
      normalizePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid,
    "adminListOrganizerDirectory", {maxRequests: 60, windowMs: 60 * 1000});
  const now = deps.now?.() ?? new Date();

  const [organizers, owners, upcoming] = await Promise.all([
    db.collection("organizers")
      .select("name", "organizerType", "publicCategoryLabel",
        "displayCategory", "locationMarketId", "cityName", "area",
        "appVisibility", "claim", "publicPage.publishStatus",
        "publicPage.indexStatus", "hostName", "createdAt", "status")
      .limit(organizerDirectoryScanLimit + 1)
      .get(),
    db.collection("organizerSalesAccounts")
      .select("assignedOwnerUid")
      .limit(organizerDirectoryScanLimit)
      .get(),
    upcomingEventCounts(db, now),
  ]);
  const complete = organizers.docs.length <= organizerDirectoryScanLimit;
  const organizerDocs = organizers.docs.slice(0, organizerDirectoryScanLimit);
  const ownerByOrganizer = new Map<string, string>();
  for (const doc of owners.docs) {
    const owner = (doc.data() as Partial<OrganizerSalesAccountDocument>)
      .assignedOwnerUid;
    if (owner) ownerByOrganizer.set(doc.id, owner);
  }

  const candidates: Candidate[] = organizerDocs.flatMap((doc) => {
    const organizer = doc.data() as Partial<OrganizerDocument>;
    if (organizer.status === "archived") return [];
    const kindLabel = organizerKindLabel(organizer);
    const city = cityOf(organizer.locationMarketId ?? organizer.cityName);
    const ownerUid = ownerByOrganizer.get(doc.id) ?? null;
    return [{
      row: {
        organizerId: doc.id,
        name: organizer.name?.trim() || doc.id,
        kindLabel,
        citySlug: city.slug,
        cityLabel: city.label,
        area: organizer.area?.trim() || null,
        pageState: organizerPageState(organizer),
        claimState: organizerClaimState(organizer),
        claimedByName: organizerClaimedByName(organizer),
        salesOwner: ownerUid ? {uid: ownerUid, name: null} : null,
        upcomingEventCount: upcoming.get(doc.id) ?? 0,
        listedAt: timestampIso(organizer.createdAt),
      },
      kindKey: kindLabel ? kindKey(kindLabel) : null,
      ownerUid,
      listedMillis: timestampMillis(organizer.createdAt) ?? 0,
    }];
  });

  const view = data.view ?? "all";
  const queryText = normalizeQueryText(data.query);
  const filters = {
    city: (c: Candidate) => !data.citySlug || c.row.citySlug === data.citySlug,
    kind: (c: Candidate) => !data.kind || c.kindKey === data.kind,
    claim: (c: Candidate) => !data.claimState ||
      claimFilterState(c.row.claimState) === data.claimState,
    mine: (c: Candidate) => !data.mine || c.ownerUid === adminContext.uid,
    query: (c: Candidate) => matchesQueryText(queryText, [c.row.organizerId,
      c.row.name, c.row.kindLabel, c.row.cityLabel, c.row.area]),
    view: (c: Candidate) => inView(c.row, view),
  };
  type FilterName = keyof typeof filters;
  const passingExcept = (skip: FilterName | null) => candidates.filter((c) =>
    (Object.keys(filters) as FilterName[])
      .every((name) => name === skip || filters[name](c)));

  const matching = passingExcept(null)
    .sort((a, b) => b.listedMillis - a.listedMillis ||
      a.row.name.localeCompare(b.row.name));
  const page = pageOf(matching, data.cursor, clampPageLimit(data.limit));
  const pageOwners = page.rows.flatMap((c) => c.ownerUid ? [c.ownerUid] : []);
  const names = pageOwners.length ? await deps.staffNames(pageOwners) :
    new Map<string, string>();

  return {
    generatedAt: now.toISOString(),
    total: matching.length,
    views: {
      all: candidates.filter((c) => inView(c.row, "all")).length,
      live: candidates.filter((c) => inView(c.row, "live")).length,
      unclaimed: candidates.filter((c) => inView(c.row, "unclaimed")).length,
      hidden: candidates.filter((c) => inView(c.row, "hidden")).length,
    },
    facets: {
      cities: countFacets(passingExcept("city").flatMap((c) =>
        c.row.citySlug ?
          [{value: c.row.citySlug, label: c.row.cityLabel ?? c.row.citySlug}] :
          [])),
      kinds: countFacets(passingExcept("kind").flatMap((c) =>
        c.kindKey && c.row.kindLabel ?
          [{value: c.kindKey, label: c.row.kindLabel}] :
          [])),
      claimStates: countFacets(passingExcept("claim").map((c) => {
        const state = claimFilterState(c.row.claimState);
        return {value: state, label: state};
      }), 3),
      mine: passingExcept("mine")
        .filter((c) => c.ownerUid === adminContext.uid).length,
    },
    scan: {complete, scanned: organizerDocs.length},
    rows: page.rows.map((c) => ({
      ...c.row,
      salesOwner: c.ownerUid ?
        {uid: c.ownerUid, name: names.get(c.ownerUid) ?? null} :
        null,
    })),
    nextCursor: page.nextCursor,
  };
}

/** Claimed and verified read as one "claimed" filter; suppressed as none. */
function claimFilterState(
  state: DirectoryRow["claimState"]
): "unclaimed" | "claimPending" | "claimed" {
  if (state === "claimPending") return "claimPending";
  if (state === "claimed" || state === "verified") return "claimed";
  return "unclaimed";
}

function inView(row: DirectoryRow, view: View): boolean {
  switch (view) {
  case "live": return row.pageState === "live";
  case "unclaimed": return claimFilterState(row.claimState) === "unclaimed";
  case "hidden": return row.pageState === "hiddenInApp";
  default: return true;
  }
}

/**
 * Upcoming events per organizer, Catch and imported, cancelled and
 * taken-down events left out.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {Date} now Clock.
 * @return {Promise<Map<string, number>>} Counts by organizer id.
 */
export async function upcomingEventCounts(
  db: FirebaseFirestore.Firestore,
  now: Date
): Promise<Map<string, number>> {
  const at = Timestamp.fromDate(now);
  const [catchEvents, importedEvents] = await Promise.all([
    db.collection("events").where("startTime", ">=", at)
      .orderBy("startTime", "asc")
      .select("organizerId", "status")
      .limit(organizerDirectoryScanLimit).get(),
    db.collection("externalEvents").where("startTime", ">=", at)
      .orderBy("startTime", "asc")
      .select("canonicalHostId", "status", "publicationStatus")
      .limit(organizerDirectoryScanLimit).get(),
  ]);
  const counts = new Map<string, number>();
  const add = (organizerId: string | undefined) => {
    if (!organizerId) return;
    counts.set(organizerId, (counts.get(organizerId) ?? 0) + 1);
  };
  for (const doc of catchEvents.docs) {
    const event = doc.data() as Partial<EventDocument>;
    if (event.status !== "cancelled") add(event.organizerId);
  }
  for (const doc of importedEvents.docs) {
    const event = doc.data() as Partial<ExternalEventDocument>;
    if (event.status !== "cancelled" &&
        event.publicationStatus !== "removed" &&
        event.publicationStatus !== "archived") add(event.canonicalHostId);
  }
  return counts;
}

function normalizePayload(value: unknown): unknown {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    query: normalizeNullableString(data.query),
    citySlug: normalizeNullableString(data.citySlug),
    kind: normalizeNullableString(data.kind),
    claimState: normalizeNullableString(data.claimState),
    cursor: normalizeNullableString(data.cursor),
  };
}

export const adminListOrganizerDirectory = onCall(
  appCheckCallableOptions,
  (request) => adminListOrganizerDirectoryHandler(request)
);
