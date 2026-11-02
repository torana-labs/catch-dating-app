import type {ClaimEvidence} from "../api/inboxRepository";

export interface ClaimCheck {
  title: string;
  detail?: string;
  passed: boolean;
}

/** Why the owner cannot approve this claim yet, or null. The backend refuses the same cases. */
export function claimApprovalIssue(evidence: ClaimEvidence): string | null {
  if (!evidence.organizer.exists) return "The organizer's record is gone, so this cannot be approved.";
  if (!evidence.requesterProfile.exists) return "They have no Catch profile yet.";
  if (!evidence.requesterProfile.profileComplete) return "They must finish their Catch profile first.";
  return null;
}

/** What a reviewer weighs before recommending or approving. */
export function claimChecks(evidence: ClaimEvidence): ClaimCheck[] {
  const {organizer, requesterProfile, proofUrls} = evidence;
  return [
    requesterProfile.exists && requesterProfile.profileComplete ?
      {title: "Their Catch profile is complete", passed: true} :
      {title: requesterProfile.exists ? "Their Catch profile is incomplete" : "They have no Catch profile",
        detail: "Approval waits until they finish it.", passed: false},
    proofUrls.length ? {title: `${proofUrls.length} proof ${proofUrls.length === 1 ? "link" : "links"}`,
      detail: "Open each one: it should show they run this organizer.", passed: true} :
      {title: "No proof links", detail: "Ask them for a link before approving.", passed: false},
    !organizer.exists ? {title: "The organizer's record is gone", passed: false} :
      organizer.ownerUserId ? {title: "This page already has an owner", detail: "Approving would move it to them.", passed: false} :
        {title: "No one else runs this page", passed: true},
  ];
}
