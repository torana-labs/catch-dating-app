import type {ClaimEvidence, InboxItem, JourneyStep, ListingEventReview} from "./inboxRepository";

/** The canvas boards' inbox, so sample mode shows every type. */
export const sampleNow = Date.parse("2026-10-31T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(sampleNow - hours * 3_600_000).toISOString();

function sampleItem(item: Partial<InboxItem> & Pick<InboxItem, "itemId" | "type" | "title" | "cameFrom" | "state">,
  hours: number): InboxItem {
  return {sourceKind: "supplyIntakeRequest", sourceId: item.itemId, sourcePath: `supplyIntakeRequests/${item.itemId}`,
    subtitle: null, nominatorUid: null, city: "mumbai", status: "waiting", waitingSince: hoursAgo(hours),
    doneAt: null, assigneeUid: null, snoozedUntil: null, recommendation: null, listingEvent: null, ...item};
}

export const sampleInboxItems: InboxItem[] = [
  sampleItem({itemId: "supply-moonmoth", type: "listing", title: "Moonmoth", subtitle: "https://luma.com/moonmoth",
    cameFrom: "Sales associate on WhatsApp", nominatorUid: "sample-riya",
    state: {code: "gaps", label: "1 check left", tone: "warning"}}, 74),
  sampleItem({itemId: "claim-brindle", type: "claim", sourceKind: "organizerClaimRequest", sourceId: "brindle",
    sourcePath: "organizerClaimRequests/brindle", title: "Brindle Club", subtitle: "Claim by Arjun Bhatia, manager",
    cameFrom: "Host app", state: {code: "recommended", label: "Recommended: approve", tone: "success"},
    recommendation: {decision: "approve", byUid: "sample-dev", at: hoursAgo(20), note: "Phone verified; the proof link is their Instagram."}}, 50),
  sampleItem({itemId: "event-rooftop", type: "event", sourceKind: "externalEvent", sourceId: "rooftop",
    sourcePath: "externalEvents/rooftop", title: "Rooftop Singles Mixer", subtitle: "Moonmoth · 14 Nov, 8:00 pm",
    cameFrom: "Luma", state: {code: "needs_review", label: "2 checks left", tone: "warning"},
    listingEvent: {intakeRequestId: "nom-sample-moonmoth", eventWorkItemId: "work-rooftop"}}, 48),
  sampleItem({itemId: "supply-tiny-orbit", type: "listing", title: "Tiny Orbit", subtitle: "https://tinyorbit.example",
    cameFrom: "Website form", state: {code: "ready", label: "Ready to decide", tone: "success"}}, 26),
  sampleItem({itemId: "enquiry-harbor", type: "enquiry", sourceKind: "salesInboundIntent", sourceId: "harbor",
    sourcePath: "salesInboundIntents/harbor", title: "Quayside Supper Club", subtitle: "Wants to run events on Catch",
    cameFrom: "Host website", state: {code: "new", label: "New", tone: "neutral"}}, 24),
  sampleItem({itemId: "enquiry-lead-loft", type: "lead", sourceKind: "salesInboundIntent", sourceId: "lead-loft",
    sourcePath: "salesInboundIntents/lead-loft", title: "List a space: The Loft",
    subtitle: "WhatsApp +91 98123 45678 · 60 standing, 30 seated · Tuesdays and Wednesdays",
    cameFrom: "Website /venues/", state: {code: "reply_on_whatsapp", label: "Reply on WhatsApp", tone: "warning"}}, 1),
  sampleItem({itemId: "supply-pune-run", type: "listing", title: "Hillfort Run Club", subtitle: "https://instagram.com/hillfortrunclub",
    cameFrom: "Partner on WhatsApp", city: "pune", state: {code: "outside_launch_cities", label: "Outside launch cities", tone: "warning"}}, 6),
  sampleItem({itemId: "supply-saffron-table", type: "stuck", title: "Saffron Table",
    subtitle: "Instagram asked to sign in, so Catch could not read the page.", cameFrom: "Sales associate on WhatsApp",
    nominatorUid: "sample-riya", state: {code: "needs_person", label: "Needs a person", tone: "danger"}}, 4),
];

export const sampleInboxJourneys: Record<string, JourneyStep[]> = {
  "supply-moonmoth": [
    {stepId: "submitted", occurredAt: hoursAgo(74), title: "Sales associate sent a link on WhatsApp", detail: "https://luma.com/moonmoth", actorUid: "sample-riya", tone: "ink"},
    {stepId: "page-1", occurredAt: hoursAgo(74), title: "Read luma.com", detail: "https://luma.com/moonmoth", actorUid: null, tone: "ink"},
    {stepId: "page-2", occurredAt: hoursAgo(74), title: "Read instagram.com", detail: "https://instagram.com/moonmoth.run", actorUid: null, tone: "ink"},
    {stepId: "listing-built", occurredAt: hoursAgo(74), title: "Built a listing", detail: "3 upcoming events · 1 to check", actorUid: null, tone: "ink"},
  ],
  "claim-brindle": [
    {stepId: "asked", occurredAt: hoursAgo(50), title: "Asked to claim Brindle Club", detail: "Arjun Bhatia, manager · 1 proof link", actorUid: "sample-arjun", tone: "ink"},
    {stepId: "recommended", occurredAt: hoursAgo(20), title: "Recommended approval", detail: "Phone verified; the proof link is their Instagram.", actorUid: "sample-dev", tone: "ink"},
  ],
  "enquiry-harbor": [
    {stepId: "received", occurredAt: hoursAgo(24), title: "Enquiry from the host website", detail: "Kavya Rao", actorUid: null, tone: "ink"},
  ],
  "enquiry-lead-loft": [
    {stepId: "received", occurredAt: hoursAgo(1), title: "List a space from the website", detail: "/venues/", actorUid: null, tone: "ink"},
  ],
  "supply-saffron-table": [
    {stepId: "submitted", occurredAt: hoursAgo(4), title: "Sales associate sent a link on WhatsApp", detail: "https://instagram.com/saffrontable", actorUid: "sample-riya", tone: "ink"},
    {stepId: "failed-1", occurredAt: hoursAgo(4), title: "Could not finish", detail: "Instagram asked to sign in, so Catch could not read the page.", actorUid: null, tone: "danger"},
  ],
};

/** The event sample mode opens in the publish sheet. */
export const sampleEventReviews: Record<string, ListingEventReview> = {
  "work-rooftop": {
    policy: {mode: "auto_publish_approved_organizers", policyVersion: "supply-event-publication-v1"},
    organizer: {organizerId: "sample-moonmoth", name: "Moonmoth", canonicalPath: "/organizers/moonmoth/", appVisibility: "hidden", pagePublished: true},
    event: {eventWorkItemId: "work-rooftop", eventId: "rooftop", title: "Rooftop Singles Mixer", startAt: "2026-11-14T14:30:00.000Z",
      endAt: "2026-11-14T17:30:00.000Z", venue: "AER, Worli", address: null, platform: "luma", sourceUrl: "https://lu.ma/rooftop",
      priceLabel: "₹499", state: "needs_resolution", publishedBy: null, blockers: ["missing_exact_coordinates"],
      resolvableBlockers: ["missing_exact_coordinates"], automatedFindings: [{check: "dating_framing", field: "title", match: "Singles"}]},
  },
};

/** The claim sample mode opens, with its evidence. */
export const sampleClaimEvidence: Record<string, ClaimEvidence> = {
  brindle: {requestId: "brindle", targetPath: "organizerClaimRequests/brindle", organizerId: "brindle", requesterUid: "sample-arjun",
    requesterName: "Arjun Bhatia", requesterRole: "manager", contact: "arjun@example.com", proofCount: 1, status: "pending",
    createdAt: hoursAgo(50), updatedAt: hoursAgo(50), businessEmail: "arjun@example.com", businessPhone: "+91 98200 00000",
    proofUrls: ["https://www.instagram.com/brindleclub/"],
    message: "I run Brindle Club with two friends. Instagram is @brindleclub; I can post a code there if you need.",
    requesterProfile: {exists: true, profileComplete: true},
    organizer: {exists: true, name: "Brindle Club", claimState: "claimPending", ownershipState: "programmatic", ownerUserId: null,
      canonicalPath: "/organizers/brindle/"}},
};
