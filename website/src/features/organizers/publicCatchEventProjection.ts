import {withoutDatingFraming} from "./publicDatingFraming";
import {publicExperienceActivities} from "./publicExperience";
import {matchesJsonSchema} from "../../shared/contracts/jsonSchema";
import {publicEventDisplaySchemas as displaySchemas} from "../../shared/contracts/generated/publicEventDisplaySchemas";
import type {HostListing} from "./types";

type PublicCatchEvent = NonNullable<HostListing["catchEvents"]>[number];
export interface LivePublicCatchEvent {
  organizerId: string;
  event: PublicCatchEvent;
}
const activityTitles: Record<string, string> = {
  socialRun: "Social run", pickleball: "Pickleball social", padel: "Padel social",
  tennis: "Tennis social", badminton: "Badminton social", pubQuiz: "Pub quiz",
  dinner: "Dinner social", barCrawl: "Bar crawl", singlesMixer: "Singles mixer",
  openActivity: "Hosted event",
};
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const text = (value: unknown): string => typeof value === "string" ? value : "";
function millis(value: unknown): number | null {
  const timestamp = record(value);
  if (typeof timestamp?.toMillis !== "function") return null;
  try {
    const result: unknown = timestamp.toMillis();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch { return null; }
}

/** A bounded display projection. Booking rechecks live terms on the server. */
export function projectLivePublicCatchEvent(id: string, raw: unknown,
  now = Date.now()): LivePublicCatchEvent | null {
  const data = record(raw);
  // Filter before reading rich fields: a private draft need not have them.
  if (!data || data.publicationState !== "published" || data.status !== "active") return null;
  const organizerId = text(data.organizerId || data.clubId);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u.test(id) ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u.test(organizerId) ||
      data.organizerId && data.clubId && data.organizerId !== data.clubId) return null;
  const start = millis(data.startTime);
  const end = millis(data.endTime);
  const venue = record(data.meetingLocation);
  const location = text(venue?.name || data.meetingPoint);
  const format = record(data.eventFormat);
  const activityKind = text(format?.activityKind);
  const currency = text(data.currency);
  if (start === null || (data.endTime != null && (end === null || end <= start)) || !location ||
      !activityKind || !count(data.capacityLimit) || data.capacityLimit < 1 ||
      !count(data.bookedCount) || !count(data.priceInPaise) ||
      data.priceInPaise > 100_000_000 || !/^[A-Z]{3}$/u.test(currency)) return null;
  const timezone = text(data.eventTimezone) || "Asia/Kolkata";
  const policy = record(data.eventPolicy);
  const admission = record(policy?.admission);
  const pricing = record(policy?.pricing);
  const constraints = record(data.constraints);
  const hasValues = (value: unknown) => Object.keys(record(value) ?? {}).length > 0;
  const restricted = (data.crossPathsPairHeldCount ?? 0) !== 0 ||
    (data.crossPathsPairConfirmedCount ?? 0) !== 0 ||
    Object.values(record(data.crossPathsPairHeldCohortCounts) ?? {}).some((value) => value !== 0) ||
    constraints?.maxMen != null || constraints?.maxWomen != null ||
    Boolean(policy && (!admission || !pricing || pricing.basePriceInPaise !== data.priceInPaise ||
      admission.format !== "open" || admission.inviteRequired || admission.membershipRequired ||
      admission.manualApprovalRequired || record(admission.privateAccessPolicy)?.mode !== "none" ||
      record(admission.crossPathsPairInventory)?.enabled || admission.balancedRatioPolicy != null ||
      hasValues(admission.cohortCapacityLimits) || hasValues(pricing.cohortAdjustmentsInPaise) ||
      Array.isArray(pricing.demandPricingRules) && pricing.demandPricingRules.length > 0));
  const mode = !restricted && data.publicRegistrationEnabled === true
    ? data.publicRegistrationMode ?? "free" : "closed";
  if (mode !== "closed" && mode !== "free" && mode !== "paid") return null;
  if (mode === "free" && data.priceInPaise !== 0 ||
      mode === "paid" && (data.priceInPaise < 100 || currency !== "INR")) return null;
  try {
    const dates = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone, dateStyle: "medium", timeStyle: "short",
    });
    return {organizerId, event: {
      id, role: "Hosted event", title: text(data.name).trim() || text(format?.customActivityLabel).trim() ||
        activityTitles[activityKind] || "Hosted event",
      activityKind, timeline: (end ?? start) >= now ? "upcoming" : "past",
      startTime: new Date(start).toISOString(), endTime: end === null ? null : new Date(end).toISOString(),
      timezone, date: end === null ? dates.format(start) : dates.formatRange(start, end),
      location, locationDetails: text(venue?.notes || data.locationDetails),
      summary: text(data.description), capacityLimit: data.capacityLimit,
      photoUrl: publicPhotoUrl(data),
      ...(publicExperienceActivities(data.catchExperienceActivities).length ? {catchExperienceActivities: publicExperienceActivities(data.catchExperienceActivities)} : {}),
      ...(matchesJsonSchema(data.meetingLocation, displaySchemas.meetingLocation)
        ? {meetingLocation: data.meetingLocation as PublicCatchEvent["meetingLocation"]} : {}),
      ...(matchesJsonSchema(data.itinerary, displaySchemas.itinerary)
        ? {itinerary: data.itinerary as PublicCatchEvent["itinerary"]} : {}),
      ...publicGuestDetails(data, format, admission, constraints),
      registrationAccess: restricted ? "restricted" : mode === "closed" ? "app" : "open",
      bookedCount: data.bookedCount,
      checkedInCount: count(data.checkedInCount) ? data.checkedInCount : 0,
      waitlistedCount: count(data.waitlistedCount) ? data.waitlistedCount : 0,
      publicRegistrationEnabled: mode !== "closed", registrationMode: mode,
      amountPaise: data.priceInPaise, currency,
      priceLabel: data.priceInPaise === 0 ? "Free" :
        new Intl.NumberFormat("en-IN", {style: "currency", currency,
          maximumFractionDigits: data.priceInPaise % 100 === 0 ? 0 : 2})
          .format(data.priceInPaise / 100),
    }};
  } catch {
    return null;
  }
}

/** Reject local/pending snapshots before decoding any event contents. */
export function projectPublicCatchEventSnapshot(snapshot: {
  metadata: {fromCache: boolean; hasPendingWrites: boolean};
  size: number;
  docs: readonly {id: string; data(): unknown}[];
}): LivePublicCatchEvent[] | null {
  if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites || snapshot.size > 400) return null;
  return snapshot.docs.flatMap((document) => {
    const projected = projectLivePublicCatchEvent(document.id, document.data());
    // A live listing arranges events for a page, as the server repositories do.
    return projected ? [{...projected, event: withoutDatingFraming(projected.event)}] : [];
  });
}

/** Published artwork uses the ordered gallery, then the legacy cover. Never project storage metadata. */
function publicPhotoUrl(data: Record<string, unknown>): string | null {
  const gallery = Array.isArray(data.eventPhotos) ? data.eventPhotos.map(record) : [];
  const withheldUrls = new Set(gallery.filter((photo) => photo?.moderation &&
    record(photo.moderation)?.status !== "approved").map((photo) => photo?.url));
  const photos = gallery.filter((photo): photo is Record<string, unknown> => Boolean(photo &&
      count(photo.position) && (!photo.moderation || record(photo.moderation)?.status === "approved")))
    .sort((a, b) => Number(a.position) - Number(b.position));
  for (const candidate of [...photos.map((photo) => photo.url), data.photoUrl]) {
    if (withheldUrls.has(candidate) || typeof candidate !== "string" || !matchesJsonSchema(candidate, displaySchemas.photoUrl)) continue;
    try { const url = new URL(candidate); if (url.protocol === "https:" && !url.username && !url.password) return url.href; } catch { /* Omit malformed optional media. */ }
  }
  return null;
}

/** Only the explicitly public guest-note namespace is read from format extensions. */
function publicGuestDetails(data: Record<string, unknown>, format: Record<string, unknown> | null,
  admission: Record<string, unknown> | null, constraints: Record<string, unknown> | null): Partial<PublicCatchEvent> {
  const notes = record(record(format?.activityDetails)?.publicDetails);
  const bounded = (value: unknown) => typeof value === "string" && value.trim().length <= 2000 ? value.trim() : "";
  const min = constraints?.minAge;
  const max = constraints?.maxAge;
  const age = count(min) && count(max) && min <= max && max <= 120
    ? min > 0 && max < 99 ? `Ages ${min}–${max}.` : min > 0 ? `Ages ${min} and over.` : max < 99 ? `Ages ${max} and under.` : "" : "";
  const requirements = [age, bounded(notes?.requirements)].filter(Boolean).join(" ");
  const labels: NonNullable<PublicCatchEvent["admissionLabels"]> = [];
  if (admission?.manualApprovalRequired || admission?.format === "manualApproval") labels.push("approval");
  if (admission?.inviteRequired || admission?.format === "inviteOnly" || record(admission?.privateAccessPolicy)?.mode === "inviteCode") labels.push("invitation");
  if (admission?.membershipRequired || admission?.format === "membersOnly") labels.push("membership");
  if (admission?.balancedRatioPolicy != null || admission?.format === "balancedRatio" || admission?.format === "fixedCohortCaps" || constraints?.maxMen != null || constraints?.maxWomen != null) labels.push("balanced");
  const waitlist = record(admission?.waitlistPolicy)?.mode;
  const cancellation = record(record(data.eventPolicy)?.cancellation)?.policyId;
  return {
    ...(requirements ? {requirements} : {}),
    ...(bounded(notes?.accessibility) ? {accessibility: bounded(notes?.accessibility)} : {}),
    ...(bounded(notes?.included) ? {included: bounded(notes?.included)} : {}),
    ...(labels.length ? {admissionLabels: labels} : {}),
    ...(["disabled", "rankedOffer", "broadcastFirstComeFirstServed", "manualReview"].includes(String(waitlist))
      ? {waitlistAvailable: waitlist !== "disabled"} : {}),
    ...(["notApplicable", "flexible", "standard", "strict"].includes(String(cancellation))
      ? {cancellationPolicy: cancellation as PublicCatchEvent["cancellationPolicy"]} : {}),
  };
}
