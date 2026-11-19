import type {
  TakedownDeclineReason,
  TakedownInfoTemplate,
  TakedownOutcome,
  TakedownRequest,
  TakedownStatus,
  TakedownType,
} from "../api/takedownRepository";

export const takedownTypeLabels: Record<TakedownType, string> = {
  claim: "Claim this page",
  correctFact: "Correct a fact",
  removeAndDoNotList: "Remove and don't list again",
  trademark: "Trademark or branding",
  copyright: "Copyright",
  privacy: "Privacy or personal data",
  impersonation: "Impersonation",
  legalOrder: "Court or government order",
};

export const takedownStatusLabels: Record<TakedownStatus, string> = {
  received: "Received", acknowledged: "Acknowledged", verifying: "Waiting on their proof", actioned: "Actioned",
  declined: "Declined", appealed: "Appealed", closed: "Closed",
};

export const takedownOutcomeLabels: Record<TakedownOutcome, string> = {
  claimGranted: "Claim granted",
  factCorrected: "Fact corrected",
  factFlagged: "Fact flagged as unverified",
  removedAndSuppressed: "Removed and kept off listings",
  removed: "Removed",
  relabelled: "Relabelled as not affiliated",
  materialRemoved: "Material taken down",
  personalDataRemoved: "Personal details removed",
  personalDataRedacted: "Personal details hidden",
  pageSuspended: "Page suspended",
  orderComplied: "Order complied with",
};

export const takedownDeclineLabels: Record<TakedownDeclineReason, string> = {
  couldNotVerify: "We could not verify it",
  noAuthority: "They are not authorised to ask",
  insufficientBasis: "The listing is factual and lawful",
  notOurListing: "Not a page on Catch",
  duplicate: "A duplicate request",
  abusive: "Abusive or repeated",
  noResponse: "No reply to our request for more",
};

/** The fixed messages staff send, word for word, when they need more. Nothing is sent for them. */
export const takedownInfoTemplates: Record<TakedownInfoTemplate, {label: string; message: string}> = {
  postInstagramCode: {label: "Post a code from the official Instagram",
    message: "To confirm the Instagram account is yours, please send this code by DM from it, or post it in a story: {code}."},
  replyFromDomainEmail: {label: "Reply from the official domain",
    message: "To confirm you speak for the organisation, please reply to this email from an address at its official domain."},
  sendLetterhead: {label: "Send a letter on letterhead",
    message: "Please reply with a signed letter on the organisation's letterhead asking for this change."},
  registrationCertificate: {label: "Send the registration certificate",
    message: "Please send the trade mark registration certificate, or a link to the register entry, for the mark you named."},
  evidenceOfUse: {label: "Send evidence of use",
    message: "Please send a public link that shows the name in use before the listing appeared."},
  identityMatch: {label: "Match identity to the page",
    message: "Please reply from the email, or message from the handle, that appears on the page."},
  orderCopy: {label: "Send a copy of the order",
    message: "Please send a copy of the order, or confirm where we can verify it with the issuer."},
  clarifyTarget: {label: "Say which page",
    message: "Please send the link to the exact page on Catch this request is about."},
};

const hour = 3_600_000;

/** A deadline as staff read it, with a tone once it is close or past. */
export function deadlineLabel(due: string | null, now: number = Date.now()): {text: string; tone?: "warning" | "danger"} | null {
  if (!due) return null;
  const left = Date.parse(due) - now;
  const when = new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    timeZone: "Asia/Kolkata"}).format(new Date(due));
  if (left < 0) return {text: `Overdue · ${when}`, tone: "danger"};
  if (left < 6 * hour) return {text: `Due soon · ${when}`, tone: "warning"};
  return {text: when};
}

/** Which deadline applies now, given where the request is. */
export function activeDeadline(request: TakedownRequest): {label: string; due: string | null} {
  switch (request.status) {
  case "received": return {label: "Acknowledge by", due: request.ackDueAt};
  case "acknowledged":
  case "verifying": return request.actionDueAt ? {label: "Act by", due: request.actionDueAt} : {label: "Resolve by", due: request.resolveDueAt};
  case "appealed": return {label: "Decide the appeal by", due: request.appeal?.dueAt ?? null};
  default: return {label: "Resolved", due: null};
  }
}

/** The type-specific verification fields, as label and value pairs. */
export function verificationFacts(request: TakedownRequest): Array<{label: string; value: string}> {
  const labels: Record<string, string> = {
    proofMethod: "Proof", officialHandle: "Official Instagram", officialDomain: "Official domain", field: "Fact",
    correction: "Should say", evidenceUrl: "Evidence", basis: "Mark", registrationNumber: "Registration", registrationClass: "Class",
    jurisdiction: "Register", firstUseYear: "First used", preferredRemedy: "Asked for", workKind: "Work", originalWorkUrl: "Original",
    ownershipBasis: "Ownership", relationship: "Whose details", dataKinds: "Details", identityMatch: "Identity check",
    issuingBody: "Issued by", orderReference: "Reference", orderDate: "Order date", orderUrl: "Order link",
  };
  return Object.entries(request.verification as Record<string, unknown>).map(([key, value]) => ({
    label: labels[key] ?? key,
    value: Array.isArray(value) ? value.join(", ") : String(value),
  }));
}

/** What a step changes, said once it is done. */
export const takedownStepNotices = {
  acknowledge: "Acknowledged. Reply to them by email if you have not.",
  requestInfo: "Recorded. Send them the message by email.",
  action: "Actioned. Send them the written confirmation.",
  decline: "Declined. Tell them why by email, and that they may appeal once.",
  recordAppeal: "Appeal recorded. Someone else decides it.",
  decideAppeal: "Appeal decided.",
  close: "Closed.",
  suspendOrganizer: "Page suspended. Run the takedown tool, then action the request with its case id.",
} as const;
