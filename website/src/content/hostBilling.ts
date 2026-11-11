import {brand} from "./brand.ts";

/**
 * The host billing portal (/host/billing/): an organizer's owner signs in with
 * a phone code and sees the free trial, the plan, the prices and bills, and
 * pays or switches plan. Paying and choosing a plan happen only here, on the
 * web; the native Host app shows status only (App Store guideline 3.1.3(f)).
 */
export const hostBillingCopy = {
  title: "Billing",
  subtitle: `What ${brand.name} charges your organiser, and your bills.`,
  loading: "Loading your billing…",
  signedOut: {
    title: "Sign in to see your billing",
    message: "Use the phone number of the organiser's owner.",
    action: "Sign in",
  },
  noOrganizers: {
    title: "No organiser to bill",
    message: `Billing appears here once you own an organiser on ${brand.name}.`,
  },
  notOwner: "Only the organiser's owner can see its billing.",
  failed: "Your billing could not load. Try again.",
  retry: "Try again",
  organizer: "Organiser",
  trial: {
    title: "Free trial",
    notStarted: "Your free trial starts with your first event.",
    scheduled: "Your free trial starts {date}, with your first event.",
    active: "{days} left · ends {date}",
    activeOne: "1 day left · ends {date}",
    ended: "Ended on {date}. Each billing cycle is now billed when it ends.",
    none: "No free trial on your terms.",
    unconfigured: "Not available yet.",
  },
  plan: {
    title: "Your plan",
    ticketing: "Ticketing",
    ticketingBody: "{rate} of your ticket sales after refunds, at most {cap} per {cycleDays}-day billing cycle. Razorpay's fees are yours.",
    ticketingBodyUncapped: "{rate} of your ticket sales after refunds, per {cycleDays}-day billing cycle. Razorpay's fees are yours.",
    toolsOnly: "Tools only",
    toolsOnlyBody: "{fee} per {cycleDays}-day billing cycle, and no commission on ticket sales.",
    gstOff: `${brand.name} is not GST registered, so no GST is added.`,
    gstOn: "GST is added on top.",
    current: "Current plan",
    from: "From {date}",
    until: "Until {date}",
    pending: "Waiting for your payment",
    buy: "Switch to tools only",
    buyBody: "You pay {amount} now for your first tools-only cycle, which starts with your next billing cycle. Each later cycle is billed when it ends, and you can cancel before the next one starts.",
    pay: "Pay {amount}",
    cancel: "Cancel tools only",
    cancelPending: "Cancel this purchase",
    working: "Updating your plan…",
    changed: "Your plan changed. We loaded the latest.",
    actionFailed: "Your plan could not be updated. Try again.",
  },
  bills: {
    title: "Bills",
    empty: `No bills yet. After your free trial, ${brand.name} bills you when each billing cycle ends.`,
    due: "Due {date}",
    dueNoDate: "Due",
    overdue: "Overdue since {date}",
    paid: "Paid {date}",
    paidNoDate: "Paid",
    free: "Nothing to pay",
    writtenOff: "Written off",
    sales: "On {sales} in ticket sales after refunds",
    toolsOnly: "Tools-only plan",
    capped: "capped",
    invoice: "Invoice {number}",
    pay: "Pay {amount}",
    gst: "includes {gst} GST",
    refundCredit: "less a {credit} refund credit for refunds after an earlier bill",
    refundCreditCarried: "{credit} refund credit carries to your next bill",
  },
} as const;
