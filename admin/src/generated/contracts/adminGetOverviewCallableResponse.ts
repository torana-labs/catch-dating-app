/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminGetOverviewCallableResponse {
  generatedAt: string;
  timezone: "UTC";
  metrics: {
    id: string;
    label: string;
    value: number;
    unit?: string;
  }[];
  queues: {
    safetyReports: {
      id: string;
      title: string;
      detail: string;
      status: string;
      createdAt: string | null;
      targetPath: string;
    }[];
    moderationFlags: {
      id: string;
      title: string;
      detail: string;
      status: string;
      createdAt: string | null;
      targetPath: string;
    }[];
    eventSafetyReports: {
      id: string;
      title: string;
      detail: string;
      status: string;
      createdAt: string | null;
      targetPath: string;
    }[];
    accessApplications: {
      id: string;
      title: string;
      detail: string;
      status: string;
      createdAt: string | null;
      targetPath: string;
    }[];
    organizerClaimRequests: {
      id: string;
      title: string;
      detail: string;
      status: string;
      createdAt: string | null;
      targetPath: string;
    }[];
    organizerIndexReviews: {
      id: string;
      title: string;
      detail: string;
      status: string;
      createdAt: string | null;
      targetPath: string;
    }[];
    paymentIssues: {
      id: string;
      title: string;
      detail: string;
      status: string;
      createdAt: string | null;
      targetPath: string;
    }[];
  };
  dataQuality: {
    id: string;
    label: string;
    state: "ok" | "warning" | "blocked";
    detail: string;
    owner: string;
    runbook: string;
    nextAction: string;
  }[];
}
