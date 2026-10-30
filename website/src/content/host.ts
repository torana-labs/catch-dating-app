import {brand} from "./brand.ts";

export const hostPageCopy = {
  nav: {
    workflow: "How it works",
    liveTools: "Live tools",
    worksNow: "What works now",
    comingSoon: "Coming soon",
    organizers: "Organizers",
    apply: "Apply for beta",
  },
  hero: {
    title: "Keep your booking platform. Run a better event.",
    body:
      `Import your guest list, share one QR code, and give every checked-in guest the live ${brand.name} experience—no app download required.`,
    primaryAction: "Apply for a supported pilot",
    secondaryAction: "See how it works",
    compatibility:
      "Bring a CSV from Luma, Eventbrite, Partiful, POSH, Airbnb, BookMyShow—or anywhere else.",
  },
  workflow: {
    title: "From your guest list to a coordinated live event.",
    body:
      `Keep selling tickets or taking RSVPs where you already do. ${brand.name} begins with the guest list you export.`,
    railLabel: "Setup steps",
    mockLabel: "Companion event",
    nextLabel: "Next",
    readyLabel: "Ready to share",
  },
  live: {
    label: "Live tools",
    title: `Useful before the ${brand.name} network exists.`,
    body:
      "Every guest opens the event in a mobile browser after phone verification. The host controls attendance, approvals, and the live flow from the organizer app.",
  },
  comparison: {
    label: "What works now",
    title: `Use ${brand.name} for the part ticketing tools leave unfinished.`,
    bookingColumn: "Your booking platform",
    catchColumn: `${brand.name} alongside it`,
    callout:
      "A QR scanner alone is not the product. One imported guest list unlocks arrival, live facilitation, and post-event learning together.",
    limits:
      "Today: CSV-based setup for up to 250 guests at a time. Very large guest lists and provider-direct sync come later.",
    tableLabel: `How a booking platform and ${brand.name} divide the work`,
  },
  captures: {
    label: "What the host sees",
    title: "One event record from the door to the recap.",
    body:
      "The organizer app keeps the imported guest list, check-in state, live controls, approval requests, and event recap connected.",
    setup: "Guest list setup",
    live: "Live host controls",
    report: "Event recap",
  },
  comingSoon: {
    label: `Coming later with the ${brand.name} platform`,
    title: "What’s next—and not required to start.",
    body:
      "Useful now does not depend on these. They deepen the system when you choose to adopt them.",
  },
  apply: {
    title: "Apply for a supported pilot.",
    body:
      "We are approving a small group of hosts whose next event can teach us something. Apply with a real event; selected hosts get hands-on onboarding and free beta access.",
  },
  footer:
    "Standalone live-event tools for hosts who already have a way to sell tickets or collect RSVPs.",
} as const;

export const hostApplicationCopy = {
  steps: {
    profile: {label: "Host identity", body: "Who you are and what you run."},
    event: {label: "Next event", body: "The real event we can learn from."},
    setup: {label: "Current setup", body: "Booking tool and guest-list size."},
    success: {label: "Live tools", body: `Where ${brand.name} could help most.`},
    review: {label: "Review", body: "Confirm the pilot application."},
  },
  eventPricing: {
    label: "Will guests pay to attend?",
    placeholder: "Choose an option",
    options: [
      {value: "paid", label: "Paid tickets"},
      {value: "free", label: "Free entry"},
      {value: "mixed", label: "Both paid and free tickets"},
      {value: "undecided", label: "Not decided yet"},
    ],
  },
  setup: {
    bookingPlatformLabel: "Current booking or RSVP platform",
    guestListFormatLabel: "How can you export the guest list?",
    guestCountLabel: "Expected guest count",
    bookingPlatforms: [
      "Luma",
      "Eventbrite",
      "Partiful",
      "POSH",
      "Airbnb Experiences",
      "BookMyShow / District",
      "SortMyScene",
      "Google Form / spreadsheet",
      "Another platform",
    ],
    guestListFormats: ["CSV", "XLSX", "Not sure yet"],
  },
  liveToolOptions: [
    "Guest list and attendance",
    "QR and manual check-in",
    "First Hello",
    "Compatibility prompts",
    "Help me say hi",
    "Guided assignments",
    "Guest feedback",
    "Event recap",
  ],
  checklist: {
    profile: "Host identity",
    event: "Real upcoming event",
    setup: "Current booking setup",
    live: "Live-tool goal",
  },
  errors: {
    setup: "Add the booking platform, export format, and expected guest count.",
  },
  review: {
    setupTitle: "Current setup",
    platformLabel: "Platform",
    formatLabel: "Export",
    guestsLabel: "Guests",
    noteTitle: "What happens after you apply",
    noteBody:
      `We aim to respond within one business day. ${brand.name} reviews the event, guest-list setup, and selected live tools before confirming a supported pilot. Selected hosts get a guided import check and a run-through before doors open.`,
  },
} as const;
