import {brand} from "./brand.ts";

// The walkthrough slot picker (features/walkthroughs) on the walkthrough page
// (/host/walkthrough/) and the booking's manage page: picking an open slot
// from getWalkthroughSlots, the details and code-verified WhatsApp number
// bookWalkthrough takes, the confirmation, and reading, moving or cancelling
// a booking through manageWalkthroughBooking. The band, its field labels and
// its button stay in the page's JSON; the consent line is the playbook lead
// form's. Times are India time; a person confirms on WhatsApp and nothing is
// sent automatically (decision 28), so no line promises a message, an email
// or a reply time.

export const walkthroughBookingCopy = {
  /** The picker card's title. */
  title: "Pick a time",
  loading: "Finding open times…",
  day: "Day",
  time: "Time (India time, IST)",
  /** {minutes}: a slot's length. */
  length: "{minutes} minutes",
  /** A time as the buttons read it, in India time: "4:00 PM". {time} is that. */
  ist: "{time} IST",
  /** Under the times, when the visitor's clock is not on India time. {local} and {zone}: "11:30 AM", "Europe/London". */
  localTime: "That’s {local} your time ({zone}).",
  pickTime: "Pick a time to carry on.",
  continue: "Continue",
  /** The chosen slot above the details: {day}, {time}. */
  chosen: "{day}, {time} IST",
  changeTime: "Change time",
  details: {
    title: "About you",
    /** Defaults when the page's form names no label of its own. */
    name: "Your name",
    organisation: "Organisation",
    whatYouRun: "What you run",
    nameRequired: "Enter your name.",
    organisationRequired: "Enter the name.",
    whatYouRunRequired: "Say what you run.",
    /** {max}: the field's limit in the booking contract. */
    tooLong: "Keep it under {max} characters.",
  },
  phone: {
    lead: "We confirm on WhatsApp, so confirm your number with a code before you book.",
    confirmAndBook: "Confirm my number and book",
    book: "Book this time",
    /** {phone}: the code-verified number. */
    bookingFor: "Booking for {phone}",
  },
  booking: "Booking your time…",
  done: {
    /** {when}: "Wed 18 Nov, 4:00 PM IST". */
    title: "You’re booked for {when}.",
    next: "What happens next",
    /** {phone}: the number booked with. */
    confirm: `Someone from the ${brand.name} team will confirm this time with you on WhatsApp, at {phone}.`,
    changeOnWhatsapp: "To change or cancel it, reply in that WhatsApp chat.",
    manageLead: "To change or cancel it, open your booking. Keep this link: it opens your booking without signing in.",
    manage: "Change or cancel",
  },
  /** Why the slots or the booking did not go through; the request form stands below when booking is off. */
  problems: {
    noSlots: "No times are open to book online right now. Ask for one below and we’ll confirm it on WhatsApp.",
    bookingClosed: "Online booking is closed right now. Ask for a time below and we’ll confirm it on WhatsApp.",
    loadFailed: "We couldn’t load the open times. Try again, or ask for a time below.",
    slotTaken: "Someone just booked that time. Here are the times still open.",
    slotUnavailable: "That time is no longer offered. Here are the times still open.",
    hasUpcoming: "This number already has a walkthrough booked.",
    phone: "Confirm your WhatsApp number with a code first.",
    phoneMismatch: "Use the WhatsApp number you confirmed with a code.",
    invalid: "Something in the booking wasn’t accepted. Check your details and try again.",
    rateLimited: "That’s a lot of tries in a short time. Wait a few minutes, then try again.",
    appCheck: "Your browser blocked the check that keeps booking safe. Turn off content blockers for this site, or try another browser.",
    notConfigured: "Booking isn’t available on this version of the site.",
    offline: `We couldn’t reach ${brand.name}. Check your connection and try again.`,
    failed: "Something went wrong on our side. Try again in a minute.",
  },
  retry: "Try again",
  /** The manage page (/start/walkthrough/manage?booking=…#t=…). */
  manage: {
    title: "Your walkthrough",
    loading: "Opening your booking…",
    status: {booked: "Booked", confirmed: "Confirmed", cancelled: "Cancelled"},
    pending: "Not confirmed yet. Someone from the team will confirm it with you on WhatsApp.",
    confirmedLead: "Confirmed on WhatsApp.",
    cancelledLead: "This booking is cancelled.",
    started: "This walkthrough has started, so it can’t be changed here.",
    move: "Move to another time",
    moveTitle: "Pick a new time",
    moveConfirm: "Move to this time",
    cancel: "Cancel booking",
    cancelTitle: "Cancel this walkthrough?",
    cancelReason: "Anything we should know? (optional)",
    cancelConfirm: "Yes, cancel it",
    keep: "Keep it",
    back: "Back",
    moved: "Moved. Someone from the team will confirm the new time on WhatsApp.",
    cancelled: "Cancelled. You can book a new time whenever you like.",
    bookAgain: "Book a new time",
    signInLead: "Confirm the WhatsApp number you booked with to open this booking.",
    signIn: "Confirm my number",
    problems: {
      missing: "This link is missing its booking. Open the link from your booking again.",
      notFound: "We couldn’t find that booking. Check the link, or book a new time.",
      notYours: "This booking is for another number. Open the link from your booking, or confirm the number you booked with.",
      slotStarted: "This walkthrough has already started.",
      bookingCancelled: "This booking was cancelled. Book a new time.",
      tooManyChanges: "This booking has moved too often. Cancel it and book again.",
    },
  },
} as const;
