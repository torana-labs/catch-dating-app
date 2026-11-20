import {brand} from "./brand.ts";

// The try-it tools' own words (features/tryIt): the steps around a product
// page's tool form, from the phone step to the result. A page's band, its
// form label and its button stay in the page's JSON; these are the words the
// canvas cards and the command flow add. No dating wording.

const host = brand.stores.hostAppName;

/** What every tool shares: the phone step, the review, the waits and the failures. */
export const tryItCopy = {
  /** The card's small label, above its title (the canvas card's "Try it"). */
  kicker: "Try it",
  /** Under the form, on every step: nothing is published by a try. */
  private: "Private until you claim it. Takes about a minute.",
  /** On the result: what claiming means. */
  nothingLive: `Nothing goes live until you claim it in ${host} and publish it.`,
  linkRequired: "Paste a link first.",
  linkInvalid: "That doesn’t look like a public web link. Paste the full address from your browser bar.",
  account: {
    title: "Who is it for?",
    lead: "Your brand name and city start your private profile. Then confirm your phone number with a code, so it’s yours.",
    signedInLead: "Your brand name and city start your private profile.",
    brand: "Your brand or club name",
    brandHint: "Driftwood Bay Runners",
    brandRequired: "Enter your brand or club name.",
    city: "City",
    cityHint: "Choose a city",
    cityRequired: "Choose your city.",
    /** {phone} is the verified number. */
    signedInAs: "Confirmed as {phone}",
    continueWithPhone: "Continue with my phone",
    continue: "Continue",
  },
  workspace: {
    confirm: "Set up my profile",
  },
  working: {
    title: "Reading your link…",
    busy: "Working on it",
  },
  review: {
    /** Under every summary the visitor is asked to confirm. */
    note: "This is a preview. Nothing has changed yet.",
    back: "Use another link",
  },
  choose: {
    title: "Which event?",
    /** {count} events found. */
    lead: "We found {count} upcoming events on this page. Choose the one to bring over.",
    noTitle: "Untitled event",
  },
  listed: {
    claim: "Claim it",
    claimLead: "Claim it with your phone number and it’s yours to edit.",
    managed: "Someone already manages this page. If it’s yours, contact support.",
    help: "Contact support",
    possible: "Is one of these yours?",
  },
  claimInHost: {
    title: `Claim it in ${host}`,
    /** {phone} is the verified number. */
    lead: `Download ${host} and sign in with {phone}. It’s waiting there, private until you publish it.`,
  },
  problem: {
    retry: "Try again",
    startOver: "Start again",
  },
  /** The words for each problem the command client names (shared/api/tryItCommands.ts). */
  problems: {
    sign_in: "Confirm your phone number with a code to carry on.",
    rate_limited: "That’s a lot of tries in a short time. Wait a few minutes, then try again.",
    invalid: "That doesn’t look like a public web link. Paste the full address from your browser bar.",
    changed: "Something changed since the preview. Here it is again.",
    key_reused: "That request changed. Try again.",
    not_ready: "We’re still reading your link. Try again in a moment.",
    no_workspace: "Set up your profile first.",
    existing_listing: `This page is already on ${brand.name}.`,
    market_not_open: `${brand.name} isn’t open for organisers in that city yet. Choose another city.`,
    multiple_organizers: `You run more than one organiser on ${brand.name}. Choose one in ${host} and carry on there.`,
    link_unreadable: "We couldn’t read that page. Check it’s public, or try another link.",
    choose_event: "Choose an event from this page first.",
    not_allowed: "That event isn’t in your profile. Bring it over here first.",
    app_check: "Your browser blocked the check that keeps this tool safe. Turn off content blockers for this site, or try another browser.",
    not_configured: "This tool isn’t available on this version of the site.",
    offline: `We couldn’t reach ${brand.name}. Check your connection and try again.`,
    failed: "Something went wrong on our side. Try again in a minute.",
    slow: "Some pages take longer to read. Try again in a minute and we’ll pick up where we left off.",
  },
  /** Each tool's card: the canvas card's title, its field's example and its line under the button. */
  tools: {
    organizer: {
      title: "Build your page from a link",
      placeholder: "instagram.com/driftwoodbayrunners",
      chip: `Already on ${brand.name}? You’ll go straight to claiming it.`,
      confirm: "Add it to my page",
      found: {
        title: "What we read",
        name: "Name",
        about: "About",
        instagram: "Instagram",
        tags: "Tags",
        links: "Links",
        /** {count} upcoming events. */
        events: "{count} upcoming events, waiting to publish with your page",
        verify: "Before you publish, you’ll prove you run this Instagram or Luma page.",
      },
    },
    event: {
      title: "Build your event from a link",
      placeholder: "tickets.example/sunday-supper",
      confirm: "Make my draft event",
      draft: {
        title: "Your draft event",
        status: "Private draft",
        /** {date} and {time} as the page gave them. */
        when: "{date} at {time}",
        lead: `Add tickets, questions and who can book in ${host}. No one can see or book it until you publish it.`,
      },
    },
    kit: {
      title: "Make your tracked links",
      placeholder: "tickets.example/sunday-social",
      channels: "Where you promote it",
      channelsPlaceholder: "Instagram, run club WhatsApp, Kabir, Brindle Café",
      channelsHint: "Up to 8, separated by commas.",
      channelsRequired: "Say where you promote it: up to 8 places or people, separated by commas.",
      channelsTooMany: "Up to 8 places or people. Remove some, or combine them.",
      channelsDuplicate: "Give each place or person a different name.",
      promoter: "A person",
      makeLinks: "Make my links",
      /** {name} is the draft event's name. */
      useDraft: "Use my draft “{name}”",
      linksFor: "Links for “{name}”",
      confirm: "Make my links",
      done: {
        title: "Your tracked links",
        channel: "Place",
        promoter: "Person",
        /** The QR code's accessible name: {label} is the link's name. */
        qr: "QR code for {label}",
      },
    },
  },
} as const;

