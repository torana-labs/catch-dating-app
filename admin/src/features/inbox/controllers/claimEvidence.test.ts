import {describe, expect, it} from "vitest";
import type {ClaimEvidence} from "../api/inboxRepository";
import {claimApprovalIssue, claimChecks} from "./claimEvidence";

const evidence = (overrides: Partial<ClaimEvidence> = {}): ClaimEvidence => ({
  requestId: "bhag", organizerId: "bhag", requesterUid: "arjun", requesterName: "Arjun Bhagat", requesterRole: "manager",
  contact: "arjun@example.com", proofCount: 1, status: "pending", createdAt: "2026-10-29T13:42:00.000Z", targetPath: "organizerClaimRequests/bhag",
  businessEmail: "arjun@example.com", businessPhone: null, proofUrls: ["https://instagram.com/bhag.club"], message: "I run it.", updatedAt: null,
  requesterProfile: {exists: true, profileComplete: true},
  organizer: {exists: true, name: "Bhag Club", claimState: "claimPending", ownershipState: "programmatic", ownerUserId: null, canonicalPath: "/organizers/bhag/"},
  ...overrides,
} as ClaimEvidence);

describe("claim evidence", () => {
  it("lets a claim through when the profile and the organizer are there", () => {
    expect(claimApprovalIssue(evidence())).toBeNull();
    expect(claimChecks(evidence()).every((check) => check.passed)).toBe(true);
  });

  it("holds approval until the profile is finished and the organizer exists", () => {
    expect(claimApprovalIssue(evidence({requesterProfile: {exists: true, profileComplete: false}}))).toMatch(/finish/u);
    expect(claimApprovalIssue(evidence({requesterProfile: {exists: false, profileComplete: false}}))).toMatch(/no Catch profile/u);
    expect(claimApprovalIssue(evidence({organizer: {...evidence().organizer, exists: false}}))).toMatch(/gone/u);
  });

  it("flags missing proof and a page that already has an owner, without blocking on them", () => {
    const risky = evidence({proofUrls: [], organizer: {...evidence().organizer, ownerUserId: "someone"}});
    expect(claimChecks(risky).filter((check) => !check.passed).map((check) => check.title))
      .toEqual(["No proof links", "This page already has an owner"]);
    expect(claimApprovalIssue(risky)).toBeNull();
  });
});
