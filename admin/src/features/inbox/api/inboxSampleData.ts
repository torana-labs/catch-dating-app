import type {InboxItem, JourneyStep} from "./inboxRepository";

/** The canvas boards' inbox, so sample mode shows every type. */
export const sampleNow = Date.parse("2026-10-31T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(sampleNow - hours * 3_600_000).toISOString();

function sampleItem(item: Partial<InboxItem> & Pick<InboxItem, "itemId" | "type" | "title" | "cameFrom" | "state">,
  hours: number): InboxItem {
  return {sourceKind: "supplyIntakeRequest", sourceId: item.itemId, sourcePath: `supplyIntakeRequests/${item.itemId}`,
    subtitle: null, nominatorUid: null, city: "mumbai", status: "waiting", waitingSince: hoursAgo(hours),
    doneAt: null, assigneeUid: null, snoozedUntil: null, recommendation: null, ...item};
}

export const sampleInboxItems: InboxItem[] = [
  sampleItem({itemId: "supply-afterfly", type: "listing", title: "Afterfly", subtitle: "https://luma.com/afterfly",
    cameFrom: "Sales associate on WhatsApp", nominatorUid: "sample-riya",
    state: {code: "gaps", label: "1 check left", tone: "warning"}}, 74),
  sampleItem({itemId: "claim-bhag", type: "claim", sourceKind: "organizerClaimRequest", sourceId: "bhag",
    sourcePath: "organizerClaimRequests/bhag", title: "Bhag Club", subtitle: "Claim by Arjun Bhagat, manager",
    cameFrom: "Host app", state: {code: "recommended", label: "Recommended: approve", tone: "success"},
    recommendation: {decision: "approve", byUid: "sample-dev", at: hoursAgo(20), note: "Phone verified; the proof link is their Instagram."}}, 50),
  sampleItem({itemId: "event-rooftop", type: "event", sourceKind: "externalEvent", sourceId: "rooftop",
    sourcePath: "externalEvents/rooftop", title: "Rooftop Singles Mixer", subtitle: "From Insider · 14 Nov, 8:00 pm",
    cameFrom: "Insider", state: {code: "needs_review", label: "Needs an official source", tone: "warning"}}, 48),
  sampleItem({itemId: "supply-small-world", type: "listing", title: "Small World", subtitle: "https://smallworld.in",
    cameFrom: "Website form", state: {code: "ready", label: "Ready to decide", tone: "success"}}, 26),
  sampleItem({itemId: "enquiry-harbor", type: "enquiry", sourceKind: "salesInboundIntent", sourceId: "harbor",
    sourcePath: "salesInboundIntents/harbor", title: "Harbor Social Club", subtitle: "Wants to run events on Catch",
    cameFrom: "Host website", state: {code: "new", label: "New", tone: "neutral"}}, 24),
  sampleItem({itemId: "supply-pune-run", type: "listing", title: "Pune Run Club", subtitle: "https://instagram.com/punerunclub",
    cameFrom: "Partner on WhatsApp", city: "pune", state: {code: "outside_launch_cities", label: "Outside launch cities", tone: "warning"}}, 6),
  sampleItem({itemId: "supply-sunday-table", type: "stuck", title: "Sunday Table",
    subtitle: "Instagram asked to sign in, so Catch could not read the page.", cameFrom: "Sales associate on WhatsApp",
    nominatorUid: "sample-riya", state: {code: "needs_person", label: "Needs a person", tone: "danger"}}, 4),
];

export const sampleInboxJourneys: Record<string, JourneyStep[]> = {
  "supply-afterfly": [
    {stepId: "submitted", occurredAt: hoursAgo(74), title: "Sales associate sent a link on WhatsApp", detail: "https://luma.com/afterfly", actorUid: "sample-riya", tone: "ink"},
    {stepId: "page-1", occurredAt: hoursAgo(74), title: "Read luma.com", detail: "https://luma.com/afterfly", actorUid: null, tone: "ink"},
    {stepId: "page-2", occurredAt: hoursAgo(74), title: "Read instagram.com", detail: "https://instagram.com/afterfly.run", actorUid: null, tone: "ink"},
    {stepId: "listing-built", occurredAt: hoursAgo(74), title: "Built a listing", detail: "3 upcoming events · 1 to check", actorUid: null, tone: "ink"},
  ],
  "claim-bhag": [
    {stepId: "asked", occurredAt: hoursAgo(50), title: "Asked to claim Bhag Club", detail: "Arjun Bhagat, manager · 1 proof link", actorUid: "sample-arjun", tone: "ink"},
    {stepId: "recommended", occurredAt: hoursAgo(20), title: "Recommended approval", detail: "Phone verified; the proof link is their Instagram.", actorUid: "sample-dev", tone: "ink"},
  ],
  "enquiry-harbor": [
    {stepId: "received", occurredAt: hoursAgo(24), title: "Enquiry from the host website", detail: "Kavya Rao", actorUid: null, tone: "ink"},
  ],
  "supply-sunday-table": [
    {stepId: "submitted", occurredAt: hoursAgo(4), title: "Sales associate sent a link on WhatsApp", detail: "https://instagram.com/sundaytable", actorUid: "sample-riya", tone: "ink"},
    {stepId: "failed-1", occurredAt: hoursAgo(4), title: "Could not finish", detail: "Instagram asked to sign in, so Catch could not read the page.", actorUid: null, tone: "danger"},
  ],
};

