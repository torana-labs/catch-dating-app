import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {
  GetOrganizerOwnerViewCallablePayload,
} from "../shared/generated/getOrganizerOwnerViewCallablePayload";
import type {
  OrganizerOwnerViewCallableResponse,
} from "../shared/generated/organizerOwnerViewCallableResponse";
import type {
  OrganizerInsightsDocument,
} from "../shared/generated/organizerInsightsDocument";
import {
  validateGetOrganizerOwnerViewCallablePayload,
} from "../shared/generated/validators/getOrganizerOwnerViewInput";
import {
  validateOrganizerOwnerViewCallableResponse,
} from "../shared/generated/validators/organizerOwnerViewOutput";
import {adminOwnerLinks} from "../organizers/organizerLinks";
import {
  organizerInsightsCollection,
  organizerInsightsId,
  utcDayKey,
} from "./insightsRollup";
import {ownerViewCapabilities, ownerViewRole} from "./ownerAccess";
import {
  followerMessageLimit,
  followerMessageMonth,
  followerMessageQuotaId,
  followerMessageQuotasCollection,
} from "./followerMessages";

export const insightsWindowDays = 30;

export interface OwnerViewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OwnerViewDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

type Insights = OrganizerOwnerViewCallableResponse["insights"];

/**
 * The last 30 complete UTC days from organizerInsights documents. A day
 * with no document reads as zero; updatedThrough names the latest day the
 * roll-up wrote, or null before its first run for this organiser.
 * @param {Date} now Read time.
 * @param {Array<OrganizerInsightsDocument | null>} documents One per day,
 * oldest first, null where none exists.
 * @return {Insights} The insights window.
 */
export function insightsWindow(
  now: Date,
  documents: readonly (OrganizerInsightsDocument | null)[]
): Insights {
  const dates = Array.from({length: insightsWindowDays}, (_, index) =>
    utcDayKey(now, insightsWindowDays - index));
  const totals = {visits: 0, linkClicks: 0, bookingClicks: 0,
    newFollowers: 0};
  const sources = new Map<string, number>();
  const links = new Map<string, number>();
  let updatedThrough: string | null = null;
  const days = dates.map((date, index) => {
    const document = documents[index];
    if (!document || document.date !== date) {
      return {date, visits: 0, linkClicks: 0, bookingClicks: 0,
        newFollowers: 0};
    }
    updatedThrough = date;
    totals.visits += document.visits;
    totals.linkClicks += document.linkClicks;
    totals.bookingClicks += document.bookingClicks;
    totals.newFollowers += document.newFollowers;
    for (const row of document.sources) {
      sources.set(row.source, (sources.get(row.source) ?? 0) + row.clicks);
    }
    for (const row of document.links) {
      links.set(row.linkId, (links.get(row.linkId) ?? 0) + row.clicks);
    }
    return {date, visits: document.visits, linkClicks: document.linkClicks,
      bookingClicks: document.bookingClicks,
      newFollowers: document.newFollowers};
  });
  const ranked = (map: Map<string, number>) => [...map]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    windowDays: insightsWindowDays,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    updatedThrough,
    totals,
    days,
    sources: ranked(sources).map(([source, clicks]) => ({
      source: source as Insights["sources"][number]["source"], clicks})),
    links: ranked(links).slice(0, 40)
      .map(([linkId, clicks]) => ({linkId, clicks})),
  };
}

export async function getOrganizerOwnerViewHandler(
  request: CallableRequest<unknown>,
  deps: OwnerViewDeps = defaultDeps
): Promise<OrganizerOwnerViewCallableResponse> {
  const uid = requireAuth(request);
  const {organizerId} = validateCallableWithAjv<
    GetOrganizerOwnerViewCallablePayload
  >(request, validateGetOrganizerOwnerViewCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "getOrganizerOwnerView", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const organizerSnap = await db.collection("organizers").doc(organizerId)
    .get();
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(organizerSnap,
    "OrganizerDocument");
  const role = ownerViewRole(organizer, uid);
  if (!role) {
    throw new HttpsError("permission-denied",
      "Only this organiser's team can manage the page.");
  }
  const now = deps.now();
  const month = followerMessageMonth(now);
  const dayRefs = Array.from({length: insightsWindowDays}, (_, index) =>
    db.collection(organizerInsightsCollection).doc(organizerInsightsId(
      organizerId, utcDayKey(now, insightsWindowDays - index))));
  const [quotaSnap, ...daySnaps] = await db.getAll(
    db.collection(followerMessageQuotasCollection)
      .doc(followerMessageQuotaId(organizerId, month)),
    ...dayRefs);
  const documents = daySnaps.map((snap) => {
    const data = snap.exists ? snap.data() as OrganizerInsightsDocument : null;
    return data?.organizerId === organizerId ? data : null;
  });
  const used = quotaSnap.exists && quotaSnap.get("organizerId") ===
    organizerId && Array.isArray(quotaSnap.get("requestIds")) ?
    Math.min(followerMessageLimit, quotaSnap.get("requestIds").length) : 0;
  const response: OrganizerOwnerViewCallableResponse = {
    organizerId,
    role,
    capabilities: [...ownerViewCapabilities[role]],
    insights: insightsWindow(now, documents),
    links: adminOwnerLinks(organizer.ownerLinks),
    about: typeof organizer.description === "string" &&
      organizer.description.trim() ? organizer.description : null,
    photos: (organizer.organizerPhotos ?? []).slice(0, 30).map((photo) => ({
      id: photo.id, url: photo.url, thumbnailUrl: photo.thumbnailUrl ?? null,
    })),
    followerMessages: {month, limit: followerMessageLimit, used},
  };
  if (!validateOrganizerOwnerViewCallableResponse(response)) {
    throw new HttpsError("internal", "The owner view needs review.");
  }
  return response;
}

export const getOrganizerOwnerView = onCall(
  appCheckCallableOptions,
  (request) => getOrganizerOwnerViewHandler(request)
);
