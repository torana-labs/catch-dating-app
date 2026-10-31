import {formatInr} from "./organizerMoney";
import type {
  OrganizerDirectoryRow,
  OrganizerJourneyStep,
  OrganizerOverview,
} from "../api/organizerRecordsRepository";

export type RecordTone = "success" | "warning" | "danger" | "info" |
  "neutral";

export interface ToneText {
  text: string;
  tone: RecordTone | null;
}

/** What the public page and app listing look like, in one phrase. */
export function organizerPageLabel(
  state: OrganizerDirectoryRow["pageState"]
): ToneText {
  switch (state) {
  case "live": return {text: "Live", tone: "success"};
  case "hiddenFromSearch":
    return {text: "Published · hidden from search", tone: "warning"};
  case "hiddenInApp": return {text: "Hidden in the app", tone: "warning"};
  case "draft": return {text: "Not published", tone: null};
  case "suppressed": return {text: "Suppressed", tone: "danger"};
  case "removed": return {text: "Removed", tone: null};
  }
}

export function organizerClaimLabel(
  row: Pick<OrganizerDirectoryRow, "claimState" | "claimedByName">
): ToneText {
  switch (row.claimState) {
  case "claimPending": return {text: "Claim waiting", tone: "warning"};
  case "claimed":
  case "verified":
    return {text: row.claimedByName ? `Claimed by ${row.claimedByName}` :
      "Claimed", tone: null};
  case "suppressed": return {text: "Claims turned off", tone: null};
  default: return {text: "Unclaimed", tone: null};
  }
}

/** "Riya" in the table; the full name sits on the organizer page. */
export function salesOwnerShortName(
  owner: OrganizerDirectoryRow["salesOwner"]
): string {
  return owner?.name?.split(/\s+/u)[0] ?? "—";
}

export function upcomingLabel(count: number): string {
  return count === 0 ? "None" : `${count} upcoming`;
}

/** "Mumbai · social nights". */
export function organizerSubtitle(
  row: Pick<OrganizerDirectoryRow, "cityLabel" | "kindLabel">
): string {
  return [row.cityLabel, row.kindLabel?.toLowerCase()]
    .filter(Boolean).join(" · ");
}

export function termsLabel(terms: OrganizerOverview["terms"]): string {
  if (terms.source === "unset" || terms.rateBasisPoints === null) {
    return "Not set up yet";
  }
  const rate = `${terms.rateBasisPoints / 100}%`;
  const cap = terms.capMinor === null ? "" :
    `, capped at ${formatInr(terms.capMinor)} a month`;
  return `${terms.source === "platform" ? "Platform: " : "Own terms: "}` +
    `${rate}${cap}`;
}

export function paymentsLabel(
  payments: OrganizerOverview["payments"]
): ToneText {
  switch (payments.state) {
  case "connected":
    return payments.webhookVerified ?
      {text: "Razorpay connected · webhook working", tone: "success"} :
      {text: "Razorpay connected · webhook not checked", tone: "warning"};
  case "needsAttention":
    return {text: "Razorpay needs attention", tone: "danger"};
  default: return {text: "Razorpay not connected", tone: null};
  }
}

const roleLabels: Record<string, string> = {
  owner: "owner", founder: "founder", manager: "manager",
  marketer: "marketer", venueManager: "venue manager",
};

/** One journey step as a timeline row: a headline and a supporting line. */
export function journeyStepCopy(
  step: OrganizerJourneyStep,
  organizerName: string
): {title: string; subtitle: string | null} {
  const who = step.actorName;
  switch (step.kind) {
  case "nominated": return {
    title: who ? `${who} nominated it` : "Nominated",
    subtitle: step.detail?.replace(/^https?:\/\//u, "") ?? null};
  case "listingBuilt": return {title: "Catch read its pages and built the listing",
    subtitle: step.detail === null ? null :
      step.detail === "1" ? "1 event found" : `${step.detail} events found`};
  case "approved": return {title: who ? `${who} approved it` : "Approved",
    subtitle: null};
  case "listed": return {title: `${organizerName} was listed`, subtitle: null};
  case "claimRequested": return {
    title: who ? `${who} asked to claim it` : "Someone asked to claim it",
    subtitle: step.detail ? roleLabels[step.detail] ?? step.detail : null};
  case "claimApproved": return {title: "The claim was approved",
    subtitle: step.detail};
  case "claimRejected": return {title: "The claim was turned down",
    subtitle: step.detail};
  case "claimed": return {title: who ? `${who} runs the page now` :
    "Claimed", subtitle: null};
  case "firstEvent": return {title: "First event", subtitle: step.detail};
  }
}

/** The ringed "Next" row at the foot of the journey. */
export function nextStepCopy(
  nextStep: OrganizerOverview["nextStep"],
  salesOwnerName: string | null
): {title: string; subtitle: string} | null {
  switch (nextStep) {
  case "claim": return {title: "The organizer claims it",
    subtitle: salesOwnerName ?
      `Send them the claim link, or ${salesOwnerName} will on the follow-up` :
      "Send them the claim link"};
  case "decideClaim": return {title: "Decide the claim",
    subtitle: "It waits in the inbox"};
  case "firstEvent": return {title: "Their first event",
    subtitle: "They can make one in the host app"};
  default: return null;
  }
}
