import type {OwnerViewBackends} from "../../features/organizers/owner/ownerViewBackends";
import type {OwnerCapability, OwnerRole, OwnerViewData} from "../../features/organizers/owner/ownerViewTypes";
import {claimedOrganizerPage} from "./organizerPages";

/** The owner view's stories read their numbers as of the organiser page fixtures' day. */
const endDay = Date.parse("2026-10-29T00:00:00Z");
const day = (back: number) => new Date(endDay - back * 86_400_000).toISOString().slice(0, 10);
const visitsByDay = [18, 22, 15, 31, 64, 120, 41, 25, 19, 27, 22, 48, 133, 52, 30, 21, 26, 18, 57, 141, 66, 28, 24,
  33, 29, 61, 155, 70, 35, 27];

const capabilitiesByRole: Record<OwnerRole, OwnerCapability[]> = {
  owner: ["insights", "links", "about", "photos", "reviews", "messageFollowers", "settings", "openInHost"],
  editor: ["insights", "links", "photos", "reviews", "messageFollowers", "openInHost"],
  analyst: ["insights", "openInHost"],
};

// Local images, so captures never wait on the network.
const images = ["/assets/events/social-run-music-hero-960.jpg", "/assets/marketing/home-dinner.jpg",
  "/assets/marketing/catch-hero-event-1680.jpg"];
const photo = (id: string, seed: number) => ({id, url: images[seed % images.length], thumbnailUrl: null});

/** The owner view of the claimed fixture page for a role, with or without rolled-up numbers. */
export function ownerViewFixture(role: OwnerRole,
  options: {waiting?: boolean; messagesUsed?: number; whatsapp?: boolean} = {}): OwnerViewData {
  const days = visitsByDay.map((visits, index) => {
    const back = 29 - index;
    if (options.waiting) return {date: day(back), visits: 0, linkClicks: 0, bookingClicks: 0, newFollowers: 0};
    return {date: day(back), visits, linkClicks: Math.round(visits * 0.4), bookingClicks: Math.round(visits * 0.12),
      newFollowers: Math.round(visits * 0.06)};
  });
  const totals = days.reduce((sum, row) => ({visits: sum.visits + row.visits, linkClicks: sum.linkClicks + row.linkClicks,
    bookingClicks: sum.bookingClicks + row.bookingClicks, newFollowers: sum.newFollowers + row.newFollowers}),
  {visits: 0, linkClicks: 0, bookingClicks: 0, newFollowers: 0});
  return {
    organizerId: claimedOrganizerPage.organizerId,
    role,
    capabilities: capabilitiesByRole[role],
    insights: {
      windowDays: 30,
      startDate: day(29),
      endDate: day(0),
      updatedThrough: options.waiting ? null : day(0),
      totals,
      days,
      sources: options.waiting ? [] : [
        {source: "instagram", clicks: Math.round(totals.linkClicks * 0.58)},
        {source: "whatsapp", clicks: Math.round(totals.linkClicks * 0.21)},
        {source: "qr", clicks: Math.round(totals.linkClicks * 0.12)},
        {source: "direct", clicks: Math.round(totals.linkClicks * 0.09)},
      ],
      links: options.waiting ? [] : [{linkId: "night", clicks: 212}, {linkId: "whatsapp", clicks: 141},
        {linkId: "strava", clicks: 38}, {linkId: "shop", clicks: 17}],
    },
    links: claimedOrganizerPage.links.map((link) => ({...link, icon: link.icon ?? null})),
    about: "Sunday social runs from the Lantern Lane jetty: 5K at three paces, then coffee. Wednesday nights it's a 4K and a playlist.",
    photos: [photo("cover", 1), photo("start", 2), photo("coffee", 3), photo("night", 4), photo("finish", 5)],
    followerMessages: {month: "2026-10", limit: 2, used: options.messagesUsed ?? 1,
      whatsappAvailable: options.whatsapp ?? true},
  };
}

/** Storybook backends: reads answer from the fixture, writes succeed without a server. */
export function ownerViewStoryBackends(view: OwnerViewData): OwnerViewBackends {
  const tracking = {organizerId: view.organizerId, revision: 3, metaPixelId: "481516234200", googleMeasurementId: "G-LANTERN42",
    canEdit: true};
  return {
    watchUser: () => () => undefined,
    getView: async () => view,
    manage: async (command) => ({action: command.action, idempotentReplay: false, links: null, photoIds: null,
      followerMessages: command.action === "sendFollowerMessage" ? {...view.followerMessages,
        used: Math.min(2, view.followerMessages.used + 1), delivery: {appRecipientCount: 214,
          whatsapp: command.channels?.includes("whatsapp") ? {status: "collecting", queuedCount: 61, skippedCount: 153,
            sentCount: 0, deliveredCount: 0, failedCount: 0} : null}} : null}),
    saveAbout: async () => undefined,
    listReviews: async () => claimedOrganizerPage.latestReviews.map((review, index) => ({
      id: review.id ?? `review-${index}`, reviewerName: review.reviewerName, rating: review.rating, comment: review.comment,
      createdAt: review.createdAt, verificationStatus: review.verificationStatus,
      ownerResponse: index === 0 ? {message: "See you Sunday, Riya!", hostName: "Kabir"} : null,
    })),
    replyToReview: async () => undefined,
    getTracking: async () => tracking,
    saveTracking: async (input) => ({...tracking, ...input, revision: tracking.revision + 1}),
  };
}
