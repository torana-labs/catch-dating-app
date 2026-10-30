import {brand} from "./brand.ts";

/** Deterministic browser/test fixture; never selects a live event or credential. */
export const guestUpdateFixture = {
  status: "ready" as const, serverTime: 1_000_000, eventTitle: "Friday neighbourhood crawl",
  guestRevision: 0, intentId: "fixture-message-1", intentRevision: 1,
  instructionRevision: 1, title: "Where to join",
  text: "We’ve left the starting point. Join us at The Courtyard, 12 Market Road. We’ll be here until 8:40 pm. Look for Maya by the entrance.",
  expiresAt: 1_100_000, response: null,
  choices: [
    {choiceId: "on-my-way", label: "I’m on my way"},
    {choiceId: "not-coming", label: "I can’t make it"},
    {choiceId: "help", label: "I need help finding you"},
  ],
};

export const eventAssistanceCopy = {
  brand: `${brand.name} home`, brandWord: "catch", kicker: "Your event",
  loadingTitle: "Getting your update", loading: "Checking the latest instructions…",
  unavailableTitle: "This update is unavailable",
  unavailableBody: "Open the latest link in your event message. It may have expired or no longer apply to you.",
  networkTitle: "We couldn’t load your update",
  networkBody: "Check your connection and try again.",
  refresh: "Refresh update", refreshing: "Checking…", replyHeading: "Let us know",
  sending: "Saving reply…", saved: "Response recorded", current: "Latest instructions",
  refreshRecorded: "Refresh to check for newer instructions.",
  stale: "These instructions need a refresh before you reply.",
  uncertain: "We couldn’t confirm your reply. Refresh to check, or try the same response again.",
  changed: "The update changed. Review the current instructions before replying.",
  closed: {
    expired: "This update has expired. Open the latest message for current instructions.",
    eventClosed: "These instructions no longer apply to this event.",
    guestUnavailable: "This update is no longer available for your booking.",
    noInstructions: "There are no current instructions for this update.",
    alreadyJoined: "You’re checked in. You don’t need to reply to these joining instructions.",
  },
} as const;
