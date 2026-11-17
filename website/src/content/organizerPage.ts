import {brand} from "./brand.ts";

/**
 * Copy for the organiser page (/organizers/<slug>/), a link-in-bio page. It
 * follows the owner-approved WebOrgV2 board and the playbook's event page;
 * where they speak about one sample club (its runs), the copy stays general.
 */
export const organizerPageCopy = {
  generatedTag: "Built from public pages · not claimed yet",
  verifiedLabel: "Verified organiser",
  stats: {
    followers: (count: number) => (count === 1 ? "follower" : "followers"),
    waiting: "waiting for the next event",
    /** Beside the average, which counts verified reviews only. */
    reviews: (verified: number) => `★ · ${verified} verified ${verified === 1 ? "review" : "reviews"}`,
    hosted: (count: number) => (count === 1 ? "night hosted" : "nights hosted"),
  },
  summarisedFrom: (names: readonly string[]) => `summarised from ${names.length ? names.join(" and ") : "public pages"}`,
  /** Owner-set labels under the name. */
  labels: {womenLed: "Women-led"},
  follow: "Follow",
  following: "Following",
  share: "Share",
  followNote: "Follow with just your phone number. New dates can come on WhatsApp.",
  coverAlt: (name: string) => `A night with ${name}`,
  shareCaption: "Print it on a poster or show it at the start line.",
  copyLink: "Copy link",
  copied: "Copied",
  copyFailed: "Copy the address from the browser bar.",
  qrLabel: (url: string) => `QR code for ${url}`,
  followSheet: {
    phoneTitle: "Hear about the next event first",
    phoneBody: (name: string) => `A WhatsApp message when ${name} opens a new plan. No app or account needed.`,
    phoneLabel: "Mobile number",
    phonePlaceholder: "98765 43210",
    sendCode: "Send code",
    codeTitle: "Enter the 6-digit code",
    codeBody: (phone: string) => `Sent to ${phone}.`,
    confirm: "Follow",
    doneTitle: (name: string) => `You’re following ${name}.`,
    doneBody: (whatsapp: boolean) => (whatsapp ?
      "We’ll message you on WhatsApp when a new plan opens, at most a few times a month." :
      `Their new plans will show in ${brand.name} when you sign in with this number.`),
    /** Must match the reviewed consent copy follower-whatsapp-v1 on the server. */
    whatsappTick: "Send me this organiser’s updates on WhatsApp. Reply STOP to stop.",
    invalidPhone: "Enter a 10-digit mobile number",
    invalidCode: "Enter the 6-digit code",
    failed: "That didn’t work. Try again in a moment.",
  },
  nextUp: (countdown: string) => `Next up · ${countdown}`,
  countdown: (days: number) =>
    days <= 0 ? "today" : days === 1 ? "tomorrow" : days < 14 ? `in ${days} days` : `in ${Math.round(days / 7)} weeks`,
  linksLabel: "Links",
  socialsLabel: "Social profiles",
  pinnedUntil: (date: string) => `Pinned until ${date}`,
  eventsTitle: "Coming up",
  eventsNote: {
    /** Where a claimed page's events are sold: on the brand, on other sites, or both in one list. */
    claimed: (names: readonly string[], onCatch: boolean) => (!names.length ? `On ${brand.name}` :
      onCatch ? `From ${brand.name} and ${names.join(" and ")}, in one list` : `From ${names.join(" and ")}`),
    generated: (names: readonly string[]) => `Found on their public ${names.length ? `${names.join(" and ")} pages` : "pages"}`,
  },
  eventsEmptyTitle: "Nothing on the calendar yet",
  eventsEmptyBody: (name: string) => `${name} hasn’t published the next plan. Follow to hear when they do.`,
  onCatch: `On ${brand.name}`,
  book: "Book",
  details: "Details",
  tickets: "Tickets",
  getTickets: "Get tickets",
  spotsLeft: (count: number) => `${count} ${count === 1 ? "place" : "places"} left`,
  placesLeftShort: (count: number) => `${count} left`,
  full: "Full",
  waitlist: "Waitlist open",
  registerOn: (source: string) => `Register on ${source}`,
  ticketsOn: (source: string) => `Tickets on ${source}`,
  momentsTitle: {claimed: "What it’s like", generated: "What we found"},
  moments: {
    photoTitle: (title: string, month: string) => `${title}, ${month}`,
    went: (count: number) => `${count.toLocaleString("en-IN")} went`,
    eventsOn: (source: string) => `events on ${source}`,
    events: "events so far",
    since: (when: string) => `since ${when}`,
    usualDay: "their usual day",
    starts: (time: string) => `${time} starts`,
    usualPrice: "usual price",
    mostlyFree: "most are free",
    average: "people at an average event",
    averageNote: "counted at the door",
    photosTitle: "Photos go here",
    photosCaption: "once the club claims the page",
  },
  reviewsTitle: "Reviews",
  writeReview: "Write a review",
  starsRow: (stars: number, count: number) => `${stars} ${stars === 1 ? "star" : "stars"}: ${count} ${count === 1 ? "review" : "reviews"}`,
  ratingLabel: (stars: number) => `${stars} out of 5`,
  /** The rating's count: the average covers verified reviews only. */
  verifiedCount: (count: number) => `from ${count} verified ${count === 1 ? "review" : "reviews"}`,
  /** Reviews with none from a booking yet, so no rating. */
  unrated: (count: number) => `${count} ${count === 1 ? "review" : "reviews"}, none from a ${brand.name} booking yet, so no rating.`,
  /** No reviews at all: the rating averages verified reviews only, so there is none yet. */
  noRating: `No rating yet. The rating counts only reviews from people who booked on ${brand.name}.`,
  reviewPolicy: {
    /** The explanation line under the verified and Unverified review labels (playbook event page). */
    claimed: `Booked on ${brand.name} means the reviewer booked through ${brand.name}. Unverified reviews are shown, and labelled.`,
    generated: `Anyone can review this page. Reviews stay unverified until guests book through ${brand.name}.`,
  },
  verifiedReview: `Booked on ${brand.name}`,
  unverifiedReview: "Unverified",
  replied: "replied:",
  anonymous: "A guest",
  cannotReply: (name: string) => `${name} hasn’t claimed this page, so they can’t reply yet.`,
  reviewsEmptyTitle: "No reviews yet",
  reviewsEmptyBody: "Reviews from people who went show up here.",
  reviewForm: {
    starsLabel: "How was it?",
    textLabel: "What should people know?",
    textPlaceholder: "What it was like, who it suits, anything to know before going",
    nameLabel: "Your first name",
    submit: "Post review",
    noStars: "Choose a star rating",
    tooShort: "Write at least 20 characters",
    noName: "Add your first name",
    failed: "Your review didn’t post. Try again in a moment.",
    done: (name: string) => `Thanks, ${name}. Your review is up, marked unverified because you didn’t book this event on ${brand.name}.`,
  },
  aboutTitle: "About",
  formatsLabel: "Formats",
  hostTitle: "Who runs it",
  claim: {
    label: "Is this your club?",
    title: "This page is already working for you.",
    people: (count: number) => `${count.toLocaleString("en-IN")} ${count === 1 ? "person" : "people"}`,
    followers: "asked to hear about your next event",
    reviewers: "left reviews",
    reviewer: "left a review",
    and: ", and ",
    built: (names: readonly string[]) =>
      `We built this page from your public ${names.length ? `${names.join(" and ")} pages` : "pages"}. Claim it free and make it yours.`,
    points: [
      {title: "Your Instagram link.", body: "One page for your bio, with your events, links and reviews."},
      {title: "Every event in one place.", body: `Luma, ${brand.name} or anywhere else, updated for you.`},
      {title: "Your links.", body: "WhatsApp group, shop, partners, pinned or timed."},
      {title: "Who clicks.", body: "Visits, link clicks and bookings, with Meta Pixel and Google Analytics."},
    ],
    action: "Claim this page",
    pending: "A claim for this page is being reviewed.",
  },
  footer: {
    claimed: `Made with ${brand.name}`,
    claimedLink: "Make a page like this",
    generated: (names: readonly string[]) => `Built by ${brand.name} from public ${names.length ? `${names.join(" and ")} pages` : "pages"}.`,
    generatedLink: "Something wrong? Tell us",
  },
} as const;
