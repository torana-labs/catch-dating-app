/**
 * The owner view's data, mirroring contracts/callable_responses/
 * organizer_owner_view_response.schema.json and the commands it calls. The
 * website may not import Functions' generated types outside its allowed
 * modules, so these are written out; `isOwnerViewData` checks the response
 * shape at the boundary.
 */

export type OwnerRole = "owner" | "editor" | "analyst";
export type OwnerCapability = "insights" | "links" | "about" | "photos" | "reviews" | "messageFollowers" |
  "settings" | "openInHost";
export type OwnerTrafficSource = "instagram" | "whatsapp" | "facebook" | "google" | "qr" | "email" | "direct" | "other";
export type OwnerLinkIcon = "link" | "website" | "community" | "social" | "tickets" | "calendar" | "shop" | "partner" |
  "video" | "route" | null;

export interface OwnerInsightTotals {
  visits: number;
  linkClicks: number;
  bookingClicks: number;
  newFollowers: number;
}

export interface OwnerLink {
  id: string;
  label: string;
  subtitle: string | null;
  url: string;
  icon: OwnerLinkIcon;
  pinned: boolean;
  /** ISO date-time, or null to keep the link up. */
  showUntil: string | null;
}

/** A follower message's WhatsApp leg so far (route organizerFollowerWhatsapp). */
export interface OwnerWhatsappCounts {
  status: "collecting" | "sending" | "completed";
  queuedCount: number;
  skippedCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
}

export interface OwnerFollowerMessages {
  month: string;
  limit: 2;
  used: number;
  /** The organiser's WhatsApp number and follower template are ready. */
  whatsappAvailable?: boolean;
  /** After a send: where it went so far. */
  delivery?: {appRecipientCount: number; whatsapp: OwnerWhatsappCounts | null};
}

export interface OwnerViewData {
  organizerId: string;
  role: OwnerRole;
  capabilities: OwnerCapability[];
  insights: {
    windowDays: 30;
    startDate: string;
    endDate: string;
    updatedThrough: string | null;
    totals: OwnerInsightTotals;
    days: Array<OwnerInsightTotals & {date: string}>;
    sources: Array<{source: OwnerTrafficSource; clicks: number}>;
    links: Array<{linkId: string; clicks: number}>;
  };
  links: OwnerLink[];
  about: string | null;
  photos: Array<{id: string; url: string; thumbnailUrl: string | null}>;
  followerMessages: OwnerFollowerMessages;
}

export type OwnerPageCommand =
  | {organizerId: string; requestId: string; action: "setLinks"; links: OwnerLink[]}
  | {organizerId: string; requestId: string; action: "setPhotoOrder"; photoIds: string[]}
  | {organizerId: string; requestId: string; action: "sendFollowerMessage"; text: string;
    channels?: Array<"app" | "whatsapp">};

export interface OwnerPageResult {
  action: OwnerPageCommand["action"];
  idempotentReplay: boolean;
  links: OwnerLink[] | null;
  photoIds: string[] | null;
  followerMessages: OwnerFollowerMessages | null;
}

export interface OwnerReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verificationStatus: "verified" | "unverified";
  ownerResponse: null | {message: string; hostName: string};
}

export interface OwnerTrackingSettings {
  organizerId: string;
  revision: number;
  metaPixelId: string | null;
  googleMeasurementId: string | null;
  canEdit: boolean;
  /** Whether saved IDs load on the public page now: only when the server says it is enabled and allowed. */
  live: boolean;
  /** Why saved IDs are not live: Catch's publication policy review (#2063), or nothing saved. */
  notLiveReason: "policyReview" | "nothingSaved" | null;
}

/** The server's tracking response. Live only when both `enabled` and `publicationAllowed` are true. */
interface RawTrackingSettings {
  organizerId: string; revision: number; metaPixelId?: string | null; googleMeasurementId?: string | null;
  canEdit?: boolean; enabled?: boolean; publicationAllowed?: boolean;
}

export function ownerTrackingSettings(raw: RawTrackingSettings): OwnerTrackingSettings {
  const metaPixelId = raw.metaPixelId ?? null;
  const googleMeasurementId = raw.googleMeasurementId ?? null;
  const saved = metaPixelId !== null || googleMeasurementId !== null;
  const live = saved && raw.enabled === true && raw.publicationAllowed === true;
  return {organizerId: raw.organizerId, revision: raw.revision, metaPixelId, googleMeasurementId,
    canEdit: raw.canEdit === true, live, notLiveReason: live ? null : saved ? "policyReview" : "nothingSaved"};
}

const roles: readonly string[] = ["owner", "editor", "analyst"];

/** A light shape check of the owner view response at the network boundary. */
export function isOwnerViewData(value: unknown): value is OwnerViewData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<OwnerViewData>;
  return typeof data.organizerId === "string" && roles.includes(String(data.role)) &&
    Array.isArray(data.capabilities) && Array.isArray(data.links) && Array.isArray(data.photos) &&
    !!data.insights && Array.isArray(data.insights.days) && data.insights.days.length === 30 &&
    !!data.followerMessages && typeof data.followerMessages.used === "number";
}
