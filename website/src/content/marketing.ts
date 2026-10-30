import {brand} from "./brand.ts";

export interface ActivityMeta {
  label: string;
  token: string;
  short: string;
}

export const memberLoop = [
  {
    step: "01",
    title: "Choose the event",
    body: "Browse events by format, city, host, timing, and social structure.",
  },
  {
    step: "02",
    title: "Be present",
    body: "Check in, meet people, and let the host guide the live moment.",
  },
  {
    step: "03",
    title: `${brand.name} privately`,
    body: "After the event, express interest without exposing rejection.",
  },
  {
    step: "04",
    title: "Match with context",
    body: "If the interest is mutual, chat opens around the event you shared.",
  },
];

export const trustItems = [
  {
    title: "Attendance-gated",
    body: "Dating surfaces open around real event participation, not cold browsing.",
  },
  {
    title: "Private by default",
    body: "Catches are private unless mutual. Host reports show totals, never who caught whom.",
  },
  {
    title: "Format-aware facilitation",
    body: "Runs, dinners, teams, courts, and mixers can use the modules that fit.",
  },
  {
    title: "Host-owned standards",
    body: "Admission, capacity, waitlist, check-in, and safety controls stay explicit.",
  },
];

export const hostModules = [
  {
    label: "Arrival",
    title: "First Hello",
    body: "A lightweight check-in ritual that helps guests start with a real person, not a blank prompt.",
  },
  {
    label: "Movement",
    title: "Assignments",
    body: "Balanced pairs, tables, pods, teams, and rotations. Hosts see how groups are balanced and can adjust assignments without seeing guests' private catches.",
  },
  {
    label: "Control",
    title: "Host console",
    body: "Check-in, live steps, reveal moments, planned breaks, and safety actions stay in one place.",
  },
  {
    label: "After",
    title: `${brand.name} window`,
    body: "Private interest opens after attendance. Mutual catches become chats with shared context.",
  },
];

export const hostFillRoomModules = [
  {
    id: "paid-checkout",
    label: "Paid checkout",
    title: "Turn demand into a confirmed roster.",
    body: "Checkout, payment state, refunds, and check-in all feed the same attendance record, so hosts are not reconciling tickets in another tool.",
    facts: [
      "Track checkout started, payment pending, paid, failed, and refunded states.",
      "Keep paid guests, approved requests, and invite-link demand in one roster.",
      "Use attendance proof before reviews, catches, matches, or reports count.",
    ],
    activityToken: "var(--catch-activity-dinner-accent)",
  },
  {
    id: "waitlist-offers",
    label: "Waitlist offers",
    title: "Move the waitlist without overselling the room.",
    body: "Timed offers let hosts release open spots, expire stale demand, and keep the public waitlist honest as people accept or decline.",
    facts: [
      "Offer active, accepted, declined, and expired states stay visible.",
      "Hosts can fill cancellations without manual DMs or duplicate payment links.",
      "Waitlist movement appears in the post-event report beside bookings.",
    ],
    activityToken: "var(--catch-activity-social-run-accent)",
  },
  {
    id: "balanced-cohorts",
    label: "Balanced cohorts",
    title: "See who the room is missing before publish.",
    body: "Cohort previews expose aggregate balance, format fit, and guest-mix gaps without revealing private catch targets or sensitive identities.",
    facts: [
      "Preview gender balance, group size, pace, skill, and repeat-attendee gaps.",
      "Use cohorts for tables, teams, pods, courts, or rotations.",
      "Before, during, and after the event, host reports show overall numbers without revealing guests' private choices.",
    ],
    activityToken: "var(--catch-activity-padel-accent)",
  },
];

export const activityMeta: Record<string, ActivityMeta> = {
  socialRun: {
    label: "Social run",
    token: "var(--catch-activity-social-run-accent)",
    short: "SR",
  },
  running: {
    label: "Running",
    token: "var(--catch-activity-running-accent)",
    short: "RN",
  },
  dinner: {
    label: "Dinner",
    token: "var(--catch-activity-dinner-accent)",
    short: "DN",
  },
  singlesMixer: {
    label: "Singles mixer",
    token: "var(--catch-activity-singles-mixer-accent)",
    short: "MX",
  },
  pubQuiz: {
    label: "Pub quiz",
    token: "var(--catch-activity-pub-quiz-accent)",
    short: "QZ",
  },
  racket: {
    label: "Racket sport",
    token: "var(--catch-activity-padel-accent)",
    short: "RK",
  },
  open: {
    label: "Open format",
    token: "var(--catch-activity-open-activity-accent)",
    short: "OP",
  },
};

export const claimUnlocks = [
  "Reply to reviews",
  "Correct facts and contact details",
  "Add official photos",
  "Publish bookable events with check-in",
  "Show verified guest reviews",
  "See page views and search stats",
];
