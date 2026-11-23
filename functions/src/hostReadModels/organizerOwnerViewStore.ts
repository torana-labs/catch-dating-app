import type {
  HostOrganizerOwnerViewDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerInsightsDocument} from
  "../shared/generated/organizerInsightsDocument";
import {organizerOwnerUserId} from "../shared/organizerHosts";
import {adminOwnerLinks} from "../organizers/organizerLinks";
import {findFollowerWhatsappSender} from
  "../organizers/organizerFollowerWhatsappLeg";
import {
  organizerInsightsCollection,
  organizerInsightsId,
  utcDayKey,
} from "../organizerInsights/insightsRollup";
import {ownerViewCapabilities} from "../organizerInsights/ownerAccess";
import {
  followerMessageLimit,
  followerMessageMonth,
  followerMessageQuotaId,
  followerMessageQuotasCollection,
} from "../organizerInsights/followerMessages";
import {reconcileOrganizerView} from "./organizerAccountViews";

export const hostOrganizerOwnerViewsCollection = "hostOrganizerOwnerViews";

/** Days of insights a view keeps: the 30-day window, and a margin so the
 *  window still fills while the nightly roll-up is a few days late. */
export const ownerViewInsightDays = 40;
/** Months of follower message allowance a view keeps. */
export const ownerViewQuotaMonths = 3;

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

function previousMonths(now: Date, count: number): string[] {
  const months: string[] = [];
  const at = new Date(Date.parse(`${followerMessageMonth(now)}-15T00:00:00Z`));
  for (let index = 0; index < count; index += 1) {
    months.push(at.toISOString().slice(0, 7));
    at.setUTCMonth(at.getUTCMonth() - 1);
  }
  return months;
}

/**
 * One organizer's owner view, read only, for the website owner page: the
 * facts getOrganizerOwnerView computed its response from, without the
 * reader or the clock. It keeps the owner's uid and each role's
 * capabilities (the reader's role follows from whether they are the owner,
 * since only managers can read it), the last 40 days of insights (the
 * reader's 30-day window is worked out from its clock), the owner links,
 * about text and photos, the follower message allowance by month (Asia/
 * Kolkata) and whether follower messages can go on WhatsApp. Sender
 * connections, templates, request ids and analytics internals never reach
 * it. Null when the organizer is gone.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} organizerId The organizer.
 * @param {Date} now The evaluation time.
 * @return {Promise<HostOrganizerOwnerViewDocument|null>} The view.
 */
export async function readOrganizerOwnerView(db: Db, tx: Tx,
  organizerId: string, now: Date):
  Promise<HostOrganizerOwnerViewDocument | null> {
  const snap = await tx.get(db.collection("organizers").doc(organizerId));
  if (!snap.exists) return null;
  // Read as the callable read it: the fields the page shows, unvalidated.
  const organizer = snap.data() as OrganizerDocument;
  const dayRefs = Array.from({length: ownerViewInsightDays}, (_, index) =>
    db.collection(organizerInsightsCollection).doc(organizerInsightsId(
      organizerId, utcDayKey(now, ownerViewInsightDays - index))));
  const months = previousMonths(now, ownerViewQuotaMonths);
  const quotaRefs = months.map((month) => db
    .collection(followerMessageQuotasCollection)
    .doc(followerMessageQuotaId(organizerId, month)));
  const snaps = await Promise.all([...dayRefs, ...quotaRefs]
    .map((ref) => tx.get(ref)));
  const insightDays = snaps.slice(0, dayRefs.length).flatMap((day) => {
    const row = day.data() as OrganizerInsightsDocument | undefined;
    if (!row || row.organizerId !== organizerId) return [];
    return [{date: row.date, visits: row.visits, linkClicks: row.linkClicks,
      bookingClicks: row.bookingClicks, newFollowers: row.newFollowers,
      sources: row.sources, links: row.links}];
  });
  const followerMessageMonths = snaps.slice(dayRefs.length)
    .map((quota, index) => {
      const row = quota.data();
      const requestIds = row?.organizerId === organizerId ?
        row.requestIds : null;
      return {month: months[index],
        used: Array.isArray(requestIds) ?
          Math.min(followerMessageLimit, requestIds.length) : 0};
    })
    .filter((row) => row.used > 0);
  const sender = await findFollowerWhatsappSender(db, organizerId,
    (query) => tx.get(query));
  return {
    organizerId,
    ownerUid: organizerOwnerUserId(organizer) ?? null,
    capabilitiesByRole: {
      owner: [...ownerViewCapabilities.owner],
      editor: [...ownerViewCapabilities.editor],
      analyst: [...ownerViewCapabilities.analyst],
    },
    insightDays,
    links: adminOwnerLinks(organizer.ownerLinks),
    about: typeof organizer.description === "string" &&
      organizer.description.trim() ? organizer.description : null,
    photos: (organizer.organizerPhotos ?? []).slice(0, 30).map((photo) => ({
      id: photo.id, url: photo.url, thumbnailUrl: photo.thumbnailUrl ?? null,
    })),
    followerMessageLimit,
    followerMessageMonths,
    whatsappAvailable: sender !== null,
    version: 1,
  };
}

/** Rewrites one organizer's owner view, writing only on change. */
export function reconcileOrganizerOwnerView(db: Db, organizerId: string,
  now: () => Date = () => new Date()): Promise<void> {
  return reconcileOrganizerView(db, hostOrganizerOwnerViewsCollection,
    organizerId, (tx) => readOrganizerOwnerView(db, tx, organizerId, now()));
}
