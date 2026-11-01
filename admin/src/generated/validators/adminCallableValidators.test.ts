import {describe, expect, it} from "vitest";
import {
  AdminCallableValidationError,
  type AdminCallableValidators,
  adminCallableValidationCoverage,
  loadAdminCallableValidators,
} from "./adminCallableValidators";
import {missingAdminCallableValidators} from "./adminCallableValidation";
import {sampleOverview} from "../../shared/api/sampleData";

// Each area's validators load lazily; the tests load every area up front.
const loaded = new Map<string, AdminCallableValidators>(await Promise.all(
  adminCallableValidationCoverage.callables.map(async (callable) =>
    [callable, await loadAdminCallableValidators(callable)] as const)));
const validatorsFor = (callable: string) =>
  loaded.get(callable) ?? missingAdminCallableValidators;
const validateAdminCallableRequest = (callable: string, value: unknown) =>
  validatorsFor(callable).validateAdminCallableRequest(callable, value);
const validateAdminCallableResponse = (callable: string, value: unknown) =>
  validatorsFor(callable).validateAdminCallableResponse(callable, value);

describe("generated admin callable validators", () => {
  it("covers every discovered Admin callable with a strict request", () => {
    expect(adminCallableValidationCoverage.callables).toEqual(
      adminCallableValidationCoverage.strictRequests);
    expect(adminCallableValidationCoverage.strictRequests).toContain(
      "adminGetHostAnalytics"
    );
    expect(adminCallableValidationCoverage.strictRequests).toEqual(
      expect.arrayContaining([
        "adminGetOverview",
        "adminDecideAccessApplication",
        "adminSetAdminUserRoles",
        "adminAssignSafetyTriageItem",
        "adminDecideSafetyTriageItem",
        "adminCreateMarketingContentDraft",
        "adminRecordMarketingReviewDecision",
        "adminCreateOrganizerDraftFromCandidate",
        "adminGetOrganizerClaimRequestDetails",
        "adminListCrossPathsShowcaseCandidates",
        "adminListOrganizerClaimRequests",
        "adminSetOrganizerIndexStatus",
        "adminSetCrossPathsShowcaseEligibility",
        "adminReviewEventMessagingBudget",
        "adminDecideEventMessagingBudget",
        "adminApplyEventMessagingBudget",
        "adminGrantOrganizerEntitlement",
        "adminRevokeOrganizerEntitlementGrant",
      ])
    );
    expect(adminCallableValidationCoverage.strictResponses).toEqual(
      expect.arrayContaining([
        "adminLinkOrganizerIntakeToSales", "adminAttestSalesHostSettlement",
        "adminGetSalesIntelligenceCatalog", "adminGenerateSalesOutreachDraft",
        "adminCopySalesOutreachDraft",
      ])
    );
    expect(adminCallableValidationCoverage.strictResponses).toEqual(
      expect.arrayContaining([
        "adminGetOverview",
        "adminDecideAccessApplication",
        "adminSetAdminUserRoles",
        "adminAssignSafetyTriageItem",
        "adminDecideSafetyTriageItem",
        "adminCreateMarketingContentDraft",
        "adminRecordMarketingReviewDecision",
        "adminCreateOrganizerDraftFromCandidate",
        "adminListCrossPathsShowcaseCandidates",
        "adminSetCrossPathsShowcaseEligibility",
        "adminReviewEventMessagingBudget",
        "adminDecideEventMessagingBudget",
        "adminApplyEventMessagingBudget",
      ])
    );
  });

  it.each([
    ["analytics", "adminGetHostAnalytics", {
      rangePreset: "30d",
      granularity: "week",
    }],
    ["organizer claim", "adminDecideOrganizerClaim", {
      requestId: "claim-1",
      decision: "approve",
    }],
    ["event publishing", "adminGetEventDetails", {eventId: "event-1"}],
  ])("accepts a known-good %s request", (_family, callable, payload) => {
    expect(() => validateAdminCallableRequest(callable, payload)).not.toThrow();
  });

  it.each([
    ["analytics", "adminGetHostAnalytics", {unexpected: true}],
    ["organizer claim", "adminDecideOrganizerClaim", {decision: "approve"}],
    ["event publishing", "adminGetEventDetails", {}],
  ])("rejects a known-bad %s request", (_family, callable, payload) => {
    expect(() => validateAdminCallableRequest(callable, payload)).toThrow(
      AdminCallableValidationError
    );
  });

  it.each([
    ["overview", "adminGetOverview", {}],
    ["access decision", "adminDecideAccessApplication", {
      applicationUid: "applicant-1",
      decision: "approve",
      note: "Approved for the first cohort.",
      cohortId: "mumbai-pilot",
    }],
    ["role mutation", "adminSetAdminUserRoles", {
      targetUid: "support-ops",
      roles: ["support"],
      note: "Support coverage approved.",
    }],
    ["safety assignment", "adminAssignSafetyTriageItem", {
      targetPath: "reports/report-1",
      assigneeUid: "reviewer-1",
      note: "Assigned for review.",
    }],
    ["safety decision", "adminDecideSafetyTriageItem", {
      targetPath: "eventAssistanceCases/case:restricted-1",
      decision: "review",
      note: "The safety handoff was resolved.",
    }],
    ["marketing draft", "adminCreateMarketingContentDraft", {
      draftType: "event_highlights",
      cityId: "mumbai",
      weekStart: "2026-07-20",
    }],
    ["marketing decision", "adminRecordMarketingReviewDecision", {
      targetType: "content_draft",
      targetId: "draft-1",
      decision: "export_ready",
      note: "Copy and rights review complete.",
      checklist: {
        copyReviewed: true,
        rightsReviewed: true,
        noCatchHostingImplied: true,
      },
    }],
    ["entitlement grant", "adminGrantOrganizerEntitlement", {
      organizerId: "example-organizer",
      operationId: "example-grant-operation-0001",
      sku: "wedding_pro",
      unit: "program",
      quantityTotal: 1,
      source: "manualInvoice",
      receiptRef: "invoice-2026-0042",
      note: "Manual invoice INV-2026-0042 reconciled.",
    }],
    ["entitlement revoke", "adminRevokeOrganizerEntitlementGrant", {
      organizerId: "example-organizer",
      operationId: "example-revoke-operation-0001",
      grantId: "grant_example-grant-operation-0001",
      reason: "Invoice INV-2026-0042 was reversed before activation.",
    }],
  ])("accepts a strict high-risk %s request", (_family, callable, payload) => {
    expect(() => validateAdminCallableRequest(callable, payload)).not.toThrow();
  });

  it.each([
    ["overview extra field", "adminGetOverview", {scope: "all"}],
    ["access without note", "adminDecideAccessApplication", {
      applicationUid: "applicant-1",
      decision: "approve",
    }],
    ["duplicate roles", "adminSetAdminUserRoles", {
      targetUid: "support-ops",
      roles: ["support", "support"],
      note: "Duplicate input must not cross the boundary.",
    }],
    ["invalid safety path", "adminAssignSafetyTriageItem", {
      targetPath: "users/user-1",
      assigneeUid: null,
      note: "Invalid queue.",
    }],
    ["unknown marketing draft", "adminCreateMarketingContentDraft", {
      draftType: "publish_now",
    }],
    ["entitlement grant without operation id", "adminGrantOrganizerEntitlement", {
      organizerId: "example-organizer",
      sku: "wedding_pro",
      unit: "program",
      quantityTotal: 1,
      source: "manualInvoice",
    }],
  ])("rejects a strict high-risk %s request", (_family, callable, payload) => {
    expect(() => validateAdminCallableRequest(callable, payload)).toThrow(
      AdminCallableValidationError
    );
  });

  it("accepts strict high-risk response fixtures", () => {
    const fixtures: Array<[string, unknown]> = [
      ["adminGetOverview", sampleOverview],
      ["adminDecideAccessApplication", {
        applicationUid: "applicant-1",
        decision: "approve",
        status: "approvedForProfile",
      }],
      ["adminSetAdminUserRoles", {
        user: {
          targetUid: "support-ops",
          email: "support@catch.local",
          displayName: "Support Ops",
          disabled: false,
          roles: ["support"],
          assignmentPath: "adminRoleAssignments/support-ops",
        },
        beforeRoles: [],
        afterRoles: ["support"],
      }],
      ["adminAssignSafetyTriageItem", {
        targetPath: "reports/report-1",
        assignment: {
          ownerTeam: "Safety",
          assigneeUid: "reviewer-1",
          queue: "reports",
          severity: "high",
        },
      }],
      ["adminDecideSafetyTriageItem", {
        targetPath: "eventAssistanceCases/case:restricted-1",
        decision: "review",
        status: "resolved",
      }],
      ["adminCreateMarketingContentDraft", {
        draft: {id: "draft-1"},
        bridge: {schemaVersion: 1},
        dashboardPath: "marketingOpsDashboards/current",
      }],
      ["adminRecordMarketingReviewDecision", {
        decisionId: "marketing-content-draft-draft-1",
        targetType: "content_draft",
        targetId: "draft-1",
        decision: "export_ready",
        decisionStatus: "export_ready",
        decisionPath:
          "marketingReviewDecisions/marketing-content-draft-draft-1",
      }],
    ];
    for (const [callable, response] of fixtures) {
      expect(() =>
        validateAdminCallableResponse(callable, response)
      ).not.toThrow();
    }
  });

  it("rejects a malformed strict mutation response", () => {
    expect(() => validateAdminCallableResponse(
      "adminDecideAccessApplication",
      {
        applicationUid: "applicant-1",
        decision: "approve",
        status: "published",
      }
    )).toThrow(AdminCallableValidationError);
  });
});
