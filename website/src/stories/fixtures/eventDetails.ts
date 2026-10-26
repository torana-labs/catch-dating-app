import {
  buildPublicEventDetailRecords,
  type EventDetailRecord,
} from "../../features/events/eventDetailModel";
import type {HostListing, HostListingReview} from "../../features/organizers/types";
import {demoEventId, demoHost, guestsAt, momentMillis, type DemoGuest} from "./demoWorld";
import {eventDetailAt} from "./demoWorldListing";
import {hostListings} from "./hostListings";

const afterflyListing = withClaimCapability({
  ...requireListing("afterfly"),
  externalEvents: [{
    accessibility: "Step-free venue access is listed; contact the source for route conditions.",
    activityKind: "socialRun",
    availability: "read_only_external",
    date: "Sat, 8 Aug 2026, 6:30 PM-9:00 PM",
    dedupeKey: "afterfly-takeoff-run-rave-2026-08-08",
    endTime: "2026-08-08T15:30:00.000Z",
    externalLinkCount: 1,
    id: "external-afterfly-takeoff-run-rave",
    location: "Indore, Madhya Pradesh",
    locationDetails: "The final start point is confirmed on the official event page.",
    priceLabel: "Free RSVP",
    requirements: "Bring running shoes and water; confirm the pace group on the source page.",
    sourceHref: "https://luma.com/afterfly-takeoff-run-rave",
    sourceLabel: "Luma",
    startTime: "2026-08-08T13:00:00.000Z",
    summary:
      "A sunset social run followed by music. This is source-attributed external supply, so Catch does not handle registration.",
    timezone: "Asia/Kolkata",
    title: "Afterfly Takeoff Run + Rave",
  }],
});

const records = buildPublicEventDetailRecords(
  [afterflyListing],
  Date.parse("2026-07-24T00:00:00.000Z")
);

// The Mumbai demo world's trivia night as a visitor sees it before anyone
// books. The world has no run of show yet, so itineraries here are
// story-only, timed to the world event.
export const catchEventDetailFixture: EventDetailRecord = withReadableReviews({
  ...eventDetailAt(demoEventId, "planning"),
  itinerary: [
    {id: "arrive", kind: "gather", offsetMinutes: 0, title: "Settle in", description: `Meet ${demoHost.firstName}, your host, and find a team.`},
    {id: "rounds", kind: "activity", offsetMinutes: 20, title: "Trivia rounds"},
    {id: "finish", kind: "finish", offsetMinutes: 120, title: "Final scores"},
  ],
});
export const externalEventDetailFixture = requireEvent(
  "external-afterfly-takeoff-run-rave",
  records
);

function withReadableReviews(event: EventDetailRecord): EventDetailRecord {
  return {
    ...event,
    listing: {
      ...event.listing,
      capabilities: {
        ...event.listing.capabilities,
        publicReviews: {
          targetState: "enabled",
          readState: "enabled",
          writeState: "disabled",
          reason: "Story fixture exposes read-only event review records.",
        },
      },
    },
  };
}

function withClaimCapability(listing: HostListing): HostListing {
  return {
    ...listing,
    capabilities: {
      ...listing.capabilities,
      claimRequest: {
        state: "enabled",
        reason: "Story fixture exposes the supported claim handoff.",
      },
    },
  };
}

function requireListing(id: string): HostListing {
  const listing = hostListings.find((candidate) => candidate.id === id);
  if (!listing) throw new Error(`Missing organizer story fixture: ${id}`);
  return listing;
}

function requireEvent(
  id: string,
  candidates: readonly EventDetailRecord[]
): EventDetailRecord {
  const event = candidates.find((candidate) => candidate.eventId === id);
  if (!event) throw new Error(`Missing event story fixture: ${id}`);
  return event;
}

/** "Ananya K." */
export function reviewerName(guest: DemoGuest): string {
  return `${guest.firstName} ${guest.lastName[0]}.`;
}

// Explicit component-review fixtures, never imported by the public catalogue.
// The upcoming state has no event reviews; the same event after it ends exercises reviews.
const storyOnlyDetails: Partial<EventDetailRecord> = {
  requirements: `18+ · Come on your own or with friends: ${demoHost.firstName} sorts everyone into teams on arrival. No trivia expertise needed.`,
  accessibility: "Illustrative venue information: step-free entrance, lift access and an accessible toilet. Seating is provided throughout. Contact the organiser before booking if you need a quieter table or other support.",
  summary: "An evening for people who enjoy a good question and meeting someone new. Arrive on your own or bring a friend: your host will welcome you, put you in a team and run the quiz. There is no dating requirement, networking pitch or pressure to take part.",
  catchExperienceActivities: ["introductions", "sharedActivities", "rotations"],
  itinerary: [
    {id: "arrive", kind: "gather", offsetMinutes: 0, durationMinutes: 20, title: "Arrive & find a team", description: `${demoHost.firstName} welcomes you. Come alone and you will be seated with a team.`},
    {id: "first-half", kind: "activity", offsetMinutes: 20, durationMinutes: 40, title: "First half: four rounds", description: "General knowledge, Mumbai, music and a picture round, answered together."},
    {id: "new-teams", kind: "transition", offsetMinutes: 60, durationMinutes: 10, title: "New teams for the second half", description: "An optional shuffle introduces you to more people. Your host can adapt the plan."},
    {id: "second-half", kind: "activity", offsetMinutes: 70, durationMinutes: 50, title: "Second half & the final round", description: "Keep playing with your new team, or join a conversation at the bar."},
    {id: "close", kind: "finish", offsetMinutes: 120, title: "Final scores, then goodnight", description: "An optional feedback prompt helps the host improve the next night."},
  ],
};
export const completeEventDetailFixture: EventDetailRecord = {
  ...catchEventDetailFixture,
  ...storyOnlyDetails,
  eventReviews: [],
};

const [firstReviewer, secondReviewer] = guestsAt(demoEventId, "followUp").filter((guest) => guest.checkedIn);
const followUp = momentMillis("followUp");
const hoursBeforeFollowUp = (hours: number) => new Date(followUp - hours * 3_600_000).toISOString();
const pastEventReviews: HostListingReview[] = [
  {id: "preview-review-1", eventId: demoEventId, reviewerName: reviewerName(firstReviewer), rating: 5,
    comment: `Illustrative review: coming alone felt easy. ${demoHost.firstName} put me straight into a team and the shuffle meant I met more people.`,
    createdAt: hoursBeforeFollowUp(12), verificationStatus: "verified", source: "catchEvent", isAnonymous: false,
    ownerResponse: {hostName: demoHost.displayName, hostAvatarUrl: null, message: "Illustrative host reply: thank you for joining us. We are glad the teams worked out.", updatedAt: hoursBeforeFollowUp(1)}},
  {id: "preview-review-2", eventId: demoEventId, reviewerName: reviewerName(secondReviewer), rating: 4,
    comment: "Illustrative review: good questions and a friendly group. I would have liked a little more time before the shuffle.",
    createdAt: hoursBeforeFollowUp(10), verificationStatus: "verified", source: "catchEvent", isAnonymous: false, ownerResponse: null},
];
const pastEvent = withReadableReviews(eventDetailAt(demoEventId, "followUp"));
export const completePastEventDetailFixture: EventDetailRecord = {
  ...pastEvent,
  ...storyOnlyDetails,
  listing: {...pastEvent.listing, reviews: pastEventReviews},
  eventReviews: pastEventReviews,
};
