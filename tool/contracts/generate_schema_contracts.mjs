#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const requireFromFunctions = createRequire(
  new URL("../../functions/package.json", import.meta.url)
);
const {compile} = requireFromFunctions("json-schema-to-typescript");

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const contractRoot = path.join(repoRoot, "contracts");
const checkOnly = process.argv.includes("--check");

const schemaSpecs = [
  {name: "ManageWebsiteAccountCallablePayload",
    source: "callables/manage_website_account_payload.schema.json",
    typeOutput: "functions/src/shared/generated/manageWebsiteAccountCallablePayload.ts"},
  {name: "ManageWebsiteAccountCallableResponse",
    source: "callable_responses/manage_website_account_response.schema.json",
    typeOutput: "functions/src/shared/generated/manageWebsiteAccountCallableResponse.ts"},
  {name: "HostResponseSummaryDocument", source: "firestore/host_response_summaries.schema.json",
    typeOutput: "functions/src/shared/generated/hostResponseSummaryDocument.ts"},
  {name: "HostGroupDetailDocument", source: "firestore/host_group_details.schema.json",
    typeOutput: "functions/src/shared/generated/hostGroupDetailDocument.ts"},
  {name: "HostGroupSummaryDocument", source: "firestore/host_group_summaries.schema.json",
    typeOutput: "functions/src/shared/generated/hostGroupSummaryDocument.ts"},
  {name: "HostEventSummaryDocument", source: "firestore/host_event_summaries.schema.json",
    typeOutput: "functions/src/shared/generated/hostEventSummaryDocument.ts"},
  {name: "HostFormSummaryDocument", source: "firestore/host_form_summaries.schema.json",
    typeOutput: "functions/src/shared/generated/hostFormSummaryDocument.ts"},
  {name: "HostContactSummaryDocument", source: "firestore/host_contact_summaries.schema.json",
    typeOutput: "functions/src/shared/generated/hostContactSummaryDocument.ts"},
  {name: "HostDirectorySummaryDocument", source: "firestore/host_directory_summaries.schema.json",
    typeOutput: "functions/src/shared/generated/hostDirectorySummaryDocument.ts"},
  {"name": "SalesProviderAttemptDocument", "source": "firestore/sales_provider_attempts.schema.json", "typeOutput": "functions/src/shared/generated/salesProviderAttemptDocument.ts"},
  {"name": "SalesProviderBudgetDocument", "source": "firestore/sales_provider_budgets.schema.json", "typeOutput": "functions/src/shared/generated/salesProviderBudgetDocument.ts"},
  {"name": "CatchWhatsappOperatorSetupOperationDocument", "source": "firestore/catch_whatsapp_operator_setup_operations.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappOperatorSetupOperationDocument.ts"},
  {"name": "CatchWhatsappOperatorSetupAuditDocument", "source": "firestore/catch_whatsapp_operator_setup_audits.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappOperatorSetupAuditDocument.ts"},
  {"name": "ManageHostRosterIntakeCallablePayload", "source": "callables/manage_host_roster_intake_payload.schema.json", "typeOutput": "functions/src/shared/generated/manageHostRosterIntakeCallablePayload.ts"},
  {"name": "HostRosterIntakeSessionDocument", "source": "firestore/host_roster_intake_sessions.schema.json", "typeOutput": "functions/src/shared/generated/hostRosterIntakeSessionDocument.ts"},
  {"name": "HostRosterIntakeReceiptDocument", "source": "firestore/host_roster_intake_receipts.schema.json", "typeOutput": "functions/src/shared/generated/hostRosterIntakeReceiptDocument.ts"},
  {"name": "AdminGetSalesDemoPartnerReviewCallablePayload", "source": "callables/admin_get_sales_demo_partner_review_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesDemoPartnerReviewCallablePayload.ts"},
  {"name": "AdminGetSalesDemoPartnerReviewResponse", "source": "callable_responses/admin_get_sales_demo_partner_review_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesDemoPartnerReviewResponse.ts"},
  {"name": "AdminShareSalesDemoPartnerReviewCallablePayload", "source": "callables/admin_share_sales_demo_partner_review_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminShareSalesDemoPartnerReviewCallablePayload.ts"},
  {"name": "AdminShareSalesDemoPartnerReviewResponse", "source": "callable_responses/admin_share_sales_demo_partner_review_response.schema.json", "typeOutput": "functions/src/shared/generated/adminShareSalesDemoPartnerReviewResponse.ts"},
  {"name": "GetSalesPartnerDemoReviewsCallablePayload", "source": "callables/get_sales_partner_demo_reviews_payload.schema.json", "typeOutput": "functions/src/shared/generated/getSalesPartnerDemoReviewsCallablePayload.ts"},
  {"name": "GetSalesPartnerDemoReviewsResponse", "source": "callable_responses/get_sales_partner_demo_reviews_response.schema.json", "typeOutput": "functions/src/shared/generated/getSalesPartnerDemoReviewsResponse.ts"},
  {"name": "ProposeSalesPartnerDemoWordingCallablePayload", "source": "callables/propose_sales_partner_demo_wording_payload.schema.json", "typeOutput": "functions/src/shared/generated/proposeSalesPartnerDemoWordingCallablePayload.ts"},
  {"name": "ProposeSalesPartnerDemoWordingResponse", "source": "callable_responses/propose_sales_partner_demo_wording_response.schema.json", "typeOutput": "functions/src/shared/generated/proposeSalesPartnerDemoWordingResponse.ts"},

  {"name": "SalesDemoContinuationDocument", "source": "firestore/sales_demo_continuations.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoContinuationDocument.ts"},
  {"name": "CreateSalesDemoContinuationCallablePayload", "source": "callables/create_sales_demo_continuation_payload.schema.json", "typeOutput": "functions/src/shared/generated/createSalesDemoContinuationCallablePayload.ts"},
  {"name": "GetSalesDemoContinuationCallablePayload", "source": "callables/get_sales_demo_continuation_payload.schema.json", "typeOutput": "functions/src/shared/generated/getSalesDemoContinuationCallablePayload.ts"},
  {"name": "PrepareSalesDemoContinuationFormCallablePayload", "source": "callables/prepare_sales_demo_continuation_form_payload.schema.json", "typeOutput": "functions/src/shared/generated/prepareSalesDemoContinuationFormCallablePayload.ts"},

  {"name": "GenerateSalesPartnerOutreachCallablePayload", "source": "callables/generate_sales_partner_outreach_payload.schema.json", "typeOutput": "functions/src/shared/generated/generateSalesPartnerOutreachCallablePayload.ts"},
  {"name": "GetSalesPartnerOutreachJobCallablePayload", "source": "callables/get_sales_partner_outreach_job_payload.schema.json", "typeOutput": "functions/src/shared/generated/getSalesPartnerOutreachJobCallablePayload.ts"},
  {"name": "GetSalesPartnerOutreachDraftCallablePayload", "source": "callables/get_sales_partner_outreach_draft_payload.schema.json", "typeOutput": "functions/src/shared/generated/getSalesPartnerOutreachDraftCallablePayload.ts"},
  {"name": "ReviewSalesPartnerOutreachDraftCallablePayload", "source": "callables/review_sales_partner_outreach_draft_payload.schema.json", "typeOutput": "functions/src/shared/generated/reviewSalesPartnerOutreachDraftCallablePayload.ts"},
  {"name": "CopySalesPartnerOutreachDraftCallablePayload", "source": "callables/copy_sales_partner_outreach_draft_payload.schema.json", "typeOutput": "functions/src/shared/generated/copySalesPartnerOutreachDraftCallablePayload.ts"},
  {"name": "RecordSalesPartnerManualSendCallablePayload", "source": "callables/record_sales_partner_manual_send_payload.schema.json", "typeOutput": "functions/src/shared/generated/recordSalesPartnerManualSendCallablePayload.ts"},
  {"name": "GetSalesPartnerPreparationCallablePayload", "source": "callables/get_sales_partner_preparation_payload.schema.json", "typeOutput": "functions/src/shared/generated/getSalesPartnerPreparationCallablePayload.ts"},
  {"name": "GetSalesPartnerOutreachDraftResponse", "source": "callable_responses/get_sales_partner_outreach_draft_response.schema.json", "typeOutput": "functions/src/shared/generated/getSalesPartnerOutreachDraftResponse.ts"},
  {"name": "ReviewSalesPartnerOutreachDraftResponse", "source": "callable_responses/review_sales_partner_outreach_draft_response.schema.json", "typeOutput": "functions/src/shared/generated/reviewSalesPartnerOutreachDraftResponse.ts"},
  {"name": "RecordSalesPartnerManualSendResponse", "source": "callable_responses/record_sales_partner_manual_send_response.schema.json", "typeOutput": "functions/src/shared/generated/recordSalesPartnerManualSendResponse.ts"},
  {"name": "RegisterSalesPartnerCallablePayload", "source": "callables/register_sales_partner_payload.schema.json", "typeOutput": "functions/src/shared/generated/registerSalesPartnerCallablePayload.ts"},
  {"name": "NominateSalesOrganizerCallablePayload", "source": "callables/nominate_sales_organizer_payload.schema.json", "typeOutput": "functions/src/shared/generated/nominateSalesOrganizerCallablePayload.ts"},
  {"name": "GetSalesPartnerWorkspaceCallablePayload", "source": "callables/get_sales_partner_workspace_payload.schema.json", "typeOutput": "functions/src/shared/generated/getSalesPartnerWorkspaceCallablePayload.ts"},
  {"name": "UpdateSalesPartnerAssignmentCallablePayload", "source": "callables/update_sales_partner_assignment_payload.schema.json", "typeOutput": "functions/src/shared/generated/updateSalesPartnerAssignmentCallablePayload.ts"},
  {"name": "DecideSalesPartnerAssignmentCallablePayload", "source": "callables/decide_sales_partner_assignment_payload.schema.json", "typeOutput": "functions/src/shared/generated/decideSalesPartnerAssignmentCallablePayload.ts"},
  {"name": "AdminAssignSalesPartnerCallablePayload", "source": "callables/admin_assign_sales_partner_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminAssignSalesPartnerCallablePayload.ts"},
  {"name": "AdminRevokeSalesPartnerAccessCallablePayload", "source": "callables/admin_revoke_sales_partner_access_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminRevokeSalesPartnerAccessCallablePayload.ts"},

  {"name": "ManageProgramLodgingCallablePayload", "source": "callables/manage_program_lodging_payload.schema.json", "typeOutput": "functions/src/shared/generated/manageProgramLodgingCallablePayload.ts"},
  {"name": "ManageProgramLodgingCallableResponse", "source": "callable_responses/manage_program_lodging_response.schema.json", "typeOutput": "functions/src/shared/generated/manageProgramLodgingCallableResponse.ts"},
  {"name": "ProgramLodgingConfigDocument", "source": "firestore/program_lodging_configs.schema.json", "typeOutput": "functions/src/shared/generated/programLodgingConfigDocument.ts"},
  {"name": "ProgramLodgingSourceVersionDocument", "source": "firestore/program_lodging_source_versions.schema.json", "typeOutput": "functions/src/shared/generated/programLodgingSourceVersionDocument.ts"},
  {"name": "ProgramLodgingProposalDocument", "source": "firestore/program_lodging_proposals.schema.json", "typeOutput": "functions/src/shared/generated/programLodgingProposalDocument.ts"},
  {"name": "ProgramLodgingWorkflowDocument", "source": "firestore/program_lodging_workflows.schema.json", "typeOutput": "functions/src/shared/generated/programLodgingWorkflowDocument.ts"},
  {"name": "ProgramLodgingReceiptDocument", "source": "firestore/program_lodging_receipts.schema.json", "typeOutput": "functions/src/shared/generated/programLodgingReceiptDocument.ts"},
  {"name": "WorkspaceMembershipAssertionDocument", "source": "firestore/workspace_membership_assertions.schema.json", "typeOutput": "functions/src/shared/generated/workspaceMembershipAssertionDocument.ts"},
  {"name": "WorkspaceMembershipDecisionDocument", "source": "firestore/workspace_membership_decisions.schema.json", "typeOutput": "functions/src/shared/generated/workspaceMembershipDecisionDocument.ts"},
  {name: "SalesPartnerMembershipDocument", source: "firestore/sales_partner_memberships.schema.json", typeOutput: "functions/src/shared/generated/salesPartnerMembershipDocument.ts"},
  {name: "SalesPartnerAssignmentDocument", source: "firestore/sales_partner_assignments.schema.json", typeOutput: "functions/src/shared/generated/salesPartnerAssignmentDocument.ts"},
  {"name": "CatchWhatsappReadinessApprovalDocument", "source": "firestore/catch_whatsapp_readiness_approval.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappReadinessApprovalDocument.ts"},
  {"name": "CatchWhatsappReadinessIngressDocument", "source": "firestore/catch_whatsapp_readiness_ingress.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappReadinessIngressDocument.ts"},
  {"name": "CatchWhatsappReadinessAuditDocument", "source": "firestore/catch_whatsapp_readiness_audit.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappReadinessAuditDocument.ts"},
  {"name": "CatchWhatsappReplyOperationDocument", "source": "firestore/catch_whatsapp_reply_operations.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappReplyOperationDocument.ts"},
  {"name": "CatchWhatsappEndpointStopDocument", "source": "firestore/catch_whatsapp_endpoint_stops.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappEndpointStopDocument.ts"},
  {"name": "CatchWhatsappAppAuthorityDocument", "source": "firestore/catch_whatsapp_app_authorities.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappAppAuthorityDocument.ts"},
  {"name": "CatchWhatsappIngressEvidenceDocument", "source": "firestore/catch_whatsapp_ingress_evidence.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappIngressEvidenceDocument.ts"},
  {"name": "CatchWhatsappReplyReadinessDocument", "source": "firestore/catch_whatsapp_reply_readiness.schema.json", "typeOutput": "functions/src/shared/generated/catchWhatsappReplyReadinessDocument.ts"},
  {"name": "AdminReviewCatchWhatsappInboundCallablePayload", "source": "callables/admin_review_catch_whatsapp_inbound_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewCatchWhatsappInboundCallablePayload.ts"},
  {"name": "AdminReviewCatchWhatsappInboundCallableResponse", "source": "callable_responses/admin_review_catch_whatsapp_inbound_response.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewCatchWhatsappInboundCallableResponse.ts"},
  {"name": "AdminSendCatchWhatsappReplyCallablePayload", "source": "callables/admin_send_catch_whatsapp_reply_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSendCatchWhatsappReplyCallablePayload.ts"},
  {"name": "AdminSendCatchWhatsappReplyCallableResponse", "source": "callable_responses/admin_send_catch_whatsapp_reply_response.schema.json", "typeOutput": "functions/src/shared/generated/adminSendCatchWhatsappReplyCallableResponse.ts"},
  {"name": "GetOrganizerTrackingSettingsCallablePayload", "source": "callables/get_organizer_tracking_settings_payload.schema.json", "typeOutput": "functions/src/shared/generated/getOrganizerTrackingSettingsCallablePayload.ts"},
  {"name": "SetOrganizerTrackingSettingsCallablePayload", "source": "callables/set_organizer_tracking_settings_payload.schema.json", "typeOutput": "functions/src/shared/generated/setOrganizerTrackingSettingsCallablePayload.ts"},
  {"name": "ReadPublicOrganizerTrackingSettingsCallablePayload", "source": "callables/read_public_organizer_tracking_settings_payload.schema.json", "typeOutput": "functions/src/shared/generated/readPublicOrganizerTrackingSettingsCallablePayload.ts"},
  {"name": "OrganizerTrackingSettingsCallableResponse", "source": "callable_responses/organizer_tracking_settings_response.schema.json", "typeOutput": "functions/src/shared/generated/organizerTrackingSettingsCallableResponse.ts"},
  {"name": "PublicOrganizerTrackingSettingsCallableResponse", "source": "callable_responses/public_organizer_tracking_settings_response.schema.json", "typeOutput": "functions/src/shared/generated/publicOrganizerTrackingSettingsCallableResponse.ts"},
  {"name": "OrganizerTrackingSettingsDocument", "source": "firestore/organizer_tracking_settings.schema.json", "typeOutput": "functions/src/shared/generated/organizerTrackingSettingsDocument.ts"},

  {
    name: "OrganizerCommunityMembershipDocument",
    source: "firestore/organizer_community_memberships.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerCommunityMembershipDocument.ts",
  },
  {
    name: "OrganizerCommunityMembershipDecisionDocument",
    source: "firestore/organizer_community_membership_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerCommunityMembershipDecisionDocument.ts",
  },
  {
    name: "DecideOrganizerCommunityMembershipCallablePayload",
    source: "callables/decide_organizer_community_membership_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/decideOrganizerCommunityMembershipCallablePayload.ts",
  },
  {
    name: "DecideOrganizerCommunityMembershipCallableResponse",
    source: "callable_responses/organizer_community_membership_decision_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/decideOrganizerCommunityMembershipCallableResponse.ts",
  },
  {
    name: "WorkspaceFieldAssertionDocument",
    source: "firestore/workspace_field_assertions.schema.json",
    typeOutput:
      "functions/src/shared/generated/workspaceFieldAssertionDocument.ts",
  },
  {
    name: "WorkspaceFieldDecisionDocument",
    source: "firestore/workspace_field_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/workspaceFieldDecisionDocument.ts",
  },
  {
    name: "CatchWhatsappWebhookEventDocument",
    source: "firestore/catch_whatsapp_webhook_events.schema.json",
    typeOutput: "functions/src/shared/generated/catchWhatsappWebhookEventDocument.ts",
  },
  {"name": "SalesImportHistoryRowDocument", "source": "firestore/sales_import_history_rows.schema.json", "typeOutput": "functions/src/shared/generated/salesImportHistoryRowDocument.ts"},
  {"name": "SalesImportHistoryRecordDocument", "source": "firestore/sales_import_history_records.schema.json", "typeOutput": "functions/src/shared/generated/salesImportHistoryRecordDocument.ts"},
  {"name": "SalesPrivacyRestriction", "source": "firestore/sales_privacy_restrictions.schema.json", "typeOutput": "functions/src/shared/generated/salesPrivacyRestriction.ts"},
  {"name": "SalesPrivacyPolicy", "source": "firestore/sales_privacy_policies.schema.json", "typeOutput": "functions/src/shared/generated/salesPrivacyPolicy.ts"},
  {"name": "SalesPrivacyPlan", "source": "firestore/sales_privacy_plans.schema.json", "typeOutput": "functions/src/shared/generated/salesPrivacyPlan.ts"},
  {"name": "SalesPrivacyBatchReceipt", "source": "firestore/sales_privacy_batch_receipts.schema.json", "typeOutput": "functions/src/shared/generated/salesPrivacyBatchReceipt.ts"},
  {"name": "AdminPreviewSalesImportHistoryPayload", "source": "callables/admin_sales_import_history_preview_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminPreviewSalesImportHistoryPayload.ts"},
  {"name": "AdminPreviewSalesImportHistoryResponse", "source": "callable_responses/admin_sales_import_history_preview_response.schema.json", "typeOutput": "functions/src/shared/generated/adminPreviewSalesImportHistoryResponse.ts"},
  {"name": "AdminApplySalesImportHistoryPayload", "source": "callables/admin_sales_import_history_apply_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminApplySalesImportHistoryPayload.ts"},
  {"name": "AdminApplySalesImportHistoryResponse", "source": "callable_responses/admin_sales_import_history_apply_response.schema.json", "typeOutput": "functions/src/shared/generated/adminApplySalesImportHistoryResponse.ts"},
  {"name": "AdminListSalesImportHistoryPayload", "source": "callables/admin_sales_import_history_list_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesImportHistoryPayload.ts"},
  {"name": "AdminListSalesImportHistoryResponse", "source": "callable_responses/admin_sales_import_history_list_response.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesImportHistoryResponse.ts"},
  {"name": "AdminListSalesImportHistoryRowsPayload", "source": "callables/admin_sales_import_history_rows_list_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesImportHistoryRowsPayload.ts"},
  {"name": "AdminListSalesImportHistoryRowsResponse", "source": "callable_responses/admin_sales_import_history_rows_list_response.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesImportHistoryRowsResponse.ts"},
  {"name": "AdminGetSalesFunnelReportPayload", "source": "callables/admin_sales_funnel_report.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesFunnelReportPayload.ts"},
  {"name": "AdminGetSalesFunnelReportResponse", "source": "callable_responses/admin_sales_funnel_report.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesFunnelReportResponse.ts"},
  {"name": "AdminReviewSalesPrivacyPolicyPayload", "source": "callables/admin_review_sales_privacy_policy_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewSalesPrivacyPolicyPayload.ts"},
  {"name": "AdminReviewSalesPrivacyPolicyResponse", "source": "callable_responses/admin_review_sales_privacy_policy_response.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewSalesPrivacyPolicyResponse.ts"},
  {"name": "AdminRestrictSalesOrganizerPayload", "source": "callables/admin_restrict_sales_organizer_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminRestrictSalesOrganizerPayload.ts"},
  {"name": "AdminRestrictSalesOrganizerResponse", "source": "callable_responses/admin_restrict_sales_organizer_response.schema.json", "typeOutput": "functions/src/shared/generated/adminRestrictSalesOrganizerResponse.ts"},
  {"name": "AdminPreviewSalesPrivacyPlanPayload", "source": "callables/admin_preview_sales_privacy_plan_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminPreviewSalesPrivacyPlanPayload.ts"},
  {"name": "AdminPreviewSalesPrivacyPlanResponse", "source": "callable_responses/admin_preview_sales_privacy_plan_response.schema.json", "typeOutput": "functions/src/shared/generated/adminPreviewSalesPrivacyPlanResponse.ts"},
  {"name": "AdminReviewSalesPrivacyPlanPayload", "source": "callables/admin_review_sales_privacy_plan_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewSalesPrivacyPlanPayload.ts"},
  {"name": "AdminReviewSalesPrivacyPlanResponse", "source": "callable_responses/admin_review_sales_privacy_plan_response.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewSalesPrivacyPlanResponse.ts"},
  {"name": "AdminApplySalesPrivacyBatchPayload", "source": "callables/admin_apply_sales_privacy_batch_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminApplySalesPrivacyBatchPayload.ts"},
  {"name": "AdminApplySalesPrivacyBatchResponse", "source": "callable_responses/admin_apply_sales_privacy_batch_response.schema.json", "typeOutput": "functions/src/shared/generated/adminApplySalesPrivacyBatchResponse.ts"},
  {"name": "AdminGetSalesPrivacyCasePayload", "source": "callables/admin_get_sales_privacy_case_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesPrivacyCasePayload.ts"},
  {"name": "AdminGetSalesPrivacyCaseResponse", "source": "callable_responses/admin_get_sales_privacy_case_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesPrivacyCaseResponse.ts"},

  {"name": "SalesIntakeLinkDocument", "source": "firestore/sales_intake_links.schema.json", "typeOutput": "functions/src/shared/generated/salesIntakeLinkDocument.ts"},
  {"name": "AdminLinkOrganizerIntakeToSalesResponse", "source": "callable_responses/admin_link_organizer_intake_to_sales_response.schema.json", "typeOutput": "functions/src/shared/generated/adminLinkOrganizerIntakeToSalesResponse.ts"},
  {"name": "AdminLinkOrganizerIntakeToSalesPayload", "source": "callables/admin_link_organizer_intake_to_sales_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminLinkOrganizerIntakeToSalesPayload.ts"},
  {"name": "AdminBuildSalesOutreachInputResponse", "source": "callable_responses/admin_sales_outreach_input_response.schema.json", "typeOutput": "functions/src/shared/generated/adminBuildSalesOutreachInputResponse.ts"},
  {"name": "AdminSalesIntelligenceClauseMutationResponse", "source": "callable_responses/admin_sales_intelligence_clause_response.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligenceClauseMutationResponse.ts"},
  {"name": "AdminReviewSalesOutreachDraftResponse", "source": "callable_responses/admin_sales_outreach_review_response.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewSalesOutreachDraftResponse.ts"},
  {"name": "AdminGetSalesOutreachDraftResponse", "source": "callable_responses/admin_sales_outreach_draft_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesOutreachDraftResponse.ts"},
  {"name": "AdminGetSalesIntelligenceCatalogRequest", "source": "callables/admin_sales_intelligence_catalog_request.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesIntelligenceCatalogRequest.ts"},
  {"name": "AdminListSalesOutreachDraftsRequest", "source": "callables/admin_sales_outreach_list_request.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesOutreachDraftsRequest.ts"},
  {"name": "AdminSaveSalesFactorAssessmentResponse", "source": "callable_responses/admin_sales_intelligence_assessment_response.schema.json", "typeOutput": "functions/src/shared/generated/adminSaveSalesFactorAssessmentResponse.ts"},
  {"name": "AdminGetSalesOutreachDraftJobRequest", "source": "callables/admin_sales_outreach_job_request.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesOutreachDraftJobRequest.ts"},
  {"name": "AdminReviewSalesIntelligenceClauseRequest", "source": "callables/admin_sales_intelligence_clause_review_request.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewSalesIntelligenceClauseRequest.ts"},
  {"name": "AdminSaveSalesIntelligencePolicyResponse", "source": "callable_responses/admin_sales_intelligence_policy_response.schema.json", "typeOutput": "functions/src/shared/generated/adminSaveSalesIntelligencePolicyResponse.ts"},
  {"name": "AdminCopySalesOutreachDraftResponse", "source": "callable_responses/admin_sales_outreach_copy_response.schema.json", "typeOutput": "functions/src/shared/generated/adminCopySalesOutreachDraftResponse.ts"},
  {"name": "AdminGetSalesOutreachDraftJobResponse", "source": "callable_responses/admin_sales_outreach_job_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesOutreachDraftJobResponse.ts"},
  {"name": "AdminGenerateSalesOutreachDraftResponse", "source": "callable_responses/admin_sales_outreach_generate_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGenerateSalesOutreachDraftResponse.ts"},
  {"name": "AdminGetSalesIntelligenceScoreRequest", "source": "callables/admin_sales_intelligence_score_request.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesIntelligenceScoreRequest.ts"},
  {"name": "AdminReviewSalesOutreachDraftRequest", "source": "callables/admin_sales_outreach_review_request.schema.json", "typeOutput": "functions/src/shared/generated/adminReviewSalesOutreachDraftRequest.ts"},
  {"name": "AdminCopySalesOutreachDraftRequest", "source": "callables/admin_sales_outreach_copy_request.schema.json", "typeOutput": "functions/src/shared/generated/adminCopySalesOutreachDraftRequest.ts"},
  {"name": "AdminAttestSalesHostSettlementPayload", "source": "callables/admin_attest_sales_host_settlement_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminAttestSalesHostSettlementPayload.ts"},
  {"name": "AdminListSalesOutreachDraftsResponse", "source": "callable_responses/admin_sales_outreach_list_response.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesOutreachDraftsResponse.ts"},
  {"name": "AdminGetSalesIntelligenceCatalogResponse", "source": "callable_responses/admin_sales_intelligence_catalog_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesIntelligenceCatalogResponse.ts"},
  {"name": "AdminGetSalesIntelligenceScoreResponse", "source": "callable_responses/admin_sales_intelligence_score_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesIntelligenceScoreResponse.ts"},
  {"name": "AdminGetSalesOutreachDraftRequest", "source": "callables/admin_sales_outreach_draft_request.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesOutreachDraftRequest.ts"},
  {"name": "AdminReviseSalesQuoteResponse", "source": "callable_responses/admin_revise_sales_quote_response.schema.json", "typeOutput": "functions/src/shared/generated/adminReviseSalesQuoteResponse.ts"},
  {"name": "AdminAttestSalesHostSettlementResponse", "source": "callable_responses/admin_attest_sales_host_settlement_response.schema.json", "typeOutput": "functions/src/shared/generated/adminAttestSalesHostSettlementResponse.ts"},
  {"name": "AdminAcceptSalesQuoteResponse", "source": "callable_responses/admin_accept_sales_quote_response.schema.json", "typeOutput": "functions/src/shared/generated/adminAcceptSalesQuoteResponse.ts"},
  {"name": "AdminGetSalesCommercialDetailResponse", "source": "callable_responses/admin_get_sales_commercial_detail_response.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesCommercialDetailResponse.ts"},
  {"name": "AdminListSalesCommercialReportResponse", "source": "callable_responses/admin_list_sales_commercial_report_response.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesCommercialReportResponse.ts"},
  {"name": "AdminApproveSalesQuoteResponse", "source": "callable_responses/admin_approve_sales_quote_response.schema.json", "typeOutput": "functions/src/shared/generated/adminApproveSalesQuoteResponse.ts"},
  {"name": "AdminUpsertSalesPilotPlanResponse", "source": "callable_responses/admin_upsert_sales_pilot_plan_response.schema.json", "typeOutput": "functions/src/shared/generated/adminUpsertSalesPilotPlanResponse.ts"},
  {"name": "SalesHostSettlementIdentitiesDocument", "source": "firestore/sales_host_settlement_identities.schema.json", "typeOutput": "functions/src/shared/generated/salesHostSettlementIdentities.ts"},
  {"name": "SalesHostSettlementAttestationsDocument", "source": "firestore/sales_host_settlement_attestations.schema.json", "typeOutput": "functions/src/shared/generated/salesHostSettlementAttestations.ts"},
  {"name": "SalesHostSettlementEvidenceUsesDocument", "source": "firestore/sales_host_settlement_evidence_uses.schema.json", "typeOutput": "functions/src/shared/generated/salesHostSettlementEvidenceUses.ts"},

  {"name": "OutreachDraftingInput", "source": "operations/outreach_drafting_input.schema.json", "typeOutput": "functions/src/shared/generated/outreachDraftingInput.ts"},
  {"name": "OutreachDraftingSelection", "source": "operations/outreach_drafting_selection.schema.json", "typeOutput": "functions/src/shared/generated/outreachDraftingSelection.ts"},
  {"name": "SupplyIntakeRequest", "source": "operations/supply_intake_request.schema.json", "typeOutput": "functions/src/shared/generated/supplyIntakeRequest.ts"},
  {"name": "SupplyIntakeRequestsDocument", "source": "firestore/supply_intake_requests.schema.json", "typeOutput": "functions/src/shared/generated/supplyIntakeRequestsDocument.ts"},
  {"name": "SupplyIntakeUsageDocument", "source": "firestore/supply_intake_usage.schema.json", "typeOutput": "functions/src/shared/generated/supplyIntakeUsageDocument.ts"},

  {"name": "AdminSalesIntelligenceGenerateCallablePayload", "source": "callables/admin_sales_intelligence_generate_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligenceGenerateCallablePayload.ts"},
  {"name": "SalesOutreachJobsDocument", "source": "firestore/sales_outreach_jobs.schema.json", "typeOutput": "functions/src/shared/generated/salesOutreachJobsDocument.ts"},

  {name: "OutreachDraft", source: "operations/outreach_drafting_draft.schema.json", typeOutput: "functions/src/shared/generated/outreachDraft.ts"},
  {"name": "AdminAcceptSalesQuoteCallablePayload", "source": "callables/admin_accept_sales_quote_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminAcceptSalesQuoteCallablePayload.ts"},
  {"name": "AdminApproveSalesQuoteCallablePayload", "source": "callables/admin_approve_sales_quote_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminApproveSalesQuoteCallablePayload.ts"},
  {"name": "AdminGetSalesCommercialDetailCallablePayload", "source": "callables/admin_get_sales_commercial_detail_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminGetSalesCommercialDetailCallablePayload.ts"},
  {"name": "AdminListSalesCommercialReportCallablePayload", "source": "callables/admin_list_sales_commercial_report_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesCommercialReportCallablePayload.ts"},
  {"name": "AdminReviseSalesQuoteCallablePayload", "source": "callables/admin_revise_sales_quote_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminReviseSalesQuoteCallablePayload.ts"},
  {"name": "AdminUpsertSalesPilotPlanCallablePayload", "source": "callables/admin_upsert_sales_pilot_plan_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminUpsertSalesPilotPlanCallablePayload.ts"},
  {"name": "SalesCommercialDecisionsDocument", "source": "firestore/sales_commercial_decisions.schema.json", "typeOutput": "functions/src/shared/generated/salesCommercialDecisionsDocument.ts"},
  {"name": "SalesOpportunityStageHistoryDocument", "source": "firestore/sales_opportunity_stage_history.schema.json", "typeOutput": "functions/src/shared/generated/salesOpportunityStageHistoryDocument.ts"},
  {"name": "SalesPilotPlansDocument", "source": "firestore/sales_pilot_plans.schema.json", "typeOutput": "functions/src/shared/generated/salesPilotPlansDocument.ts"},
  {"name": "SalesQuoteVersionsDocument", "source": "firestore/sales_quote_versions.schema.json", "typeOutput": "functions/src/shared/generated/salesQuoteVersionsDocument.ts"},
  {"name": "SalesQuotesDocument", "source": "firestore/sales_quotes.schema.json", "typeOutput": "functions/src/shared/generated/salesQuotesDocument.ts"},

  {"name": "AssistantClientsDocument", "source": "firestore/assistant_clients.schema.json", "typeOutput": "functions/src/shared/generated/assistantClientsDocument.ts"},
  {"name": "AssistantDelegationsDocument", "source": "firestore/assistant_delegations.schema.json", "typeOutput": "functions/src/shared/generated/assistantDelegationsDocument.ts"},
  {"name": "AssistantGatewayBudgetsDocument", "source": "firestore/assistant_gateway_budgets.schema.json", "typeOutput": "functions/src/shared/generated/assistantGatewayBudgetsDocument.ts"},
  {"name": "AssistantManagementReceiptsDocument", "source": "firestore/assistant_management_receipts.schema.json", "typeOutput": "functions/src/shared/generated/assistantManagementReceiptsDocument.ts"},
  {name: "AdminListSalesAccountsCallablePayload", source: "callables/admin_sales_hosts_search_payload.schema.json", typeOutput: "functions/src/shared/generated/adminListSalesAccountsCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminListSalesAccountsCallablePayload.ts"]},
  {name: "AdminGetSalesAccountCallablePayload", source: "callables/admin_sales_hosts_get_payload.schema.json", typeOutput: "functions/src/shared/generated/adminGetSalesAccountCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminGetSalesAccountCallablePayload.ts"]},
  {name: "AdminListSalesTasksCallablePayload", source: "callables/admin_sales_tasks_list_payload.schema.json", typeOutput: "functions/src/shared/generated/adminListSalesTasksCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminListSalesTasksCallablePayload.ts"]},
  {name: "AdminListSalesOpportunitiesCallablePayload", source: "callables/admin_sales_opportunities_list_payload.schema.json", typeOutput: "functions/src/shared/generated/adminListSalesOpportunitiesCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminListSalesOpportunitiesCallablePayload.ts"]},
  {name: "AdminListSalesCustomFieldsCallablePayload", source: "callables/admin_sales_fields_list_payload.schema.json", typeOutput: "functions/src/shared/generated/adminListSalesCustomFieldsCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminListSalesCustomFieldsCallablePayload.ts"]},
  {name: "AdminGetSalesReceiptCallablePayload", source: "callables/admin_sales_receipts_get_payload.schema.json", typeOutput: "functions/src/shared/generated/adminGetSalesReceiptCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminGetSalesReceiptCallablePayload.ts"]},
  {name: "AdminListSalesInboundIntentsCallablePayload", source: "callables/admin_sales_intents_list_payload.schema.json", typeOutput: "functions/src/shared/generated/adminListSalesInboundIntentsCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminListSalesInboundIntentsCallablePayload.ts"]},
  {name: "AdminPreviewSalesImportCallablePayload", source: "callables/admin_sales_imports_preview_payload.schema.json", typeOutput: "functions/src/shared/generated/adminPreviewSalesImportCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminPreviewSalesImportCallablePayload.ts"]},
  {name: "AdminListSalesContactsCallablePayload", source: "callables/admin_sales_contacts_list_payload.schema.json", typeOutput: "functions/src/shared/generated/adminListSalesContactsCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminListSalesContactsCallablePayload.ts"]},
  {name: "AdminListSalesEvidenceCallablePayload", source: "callables/admin_sales_evidence_list_payload.schema.json", typeOutput: "functions/src/shared/generated/adminListSalesEvidenceCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminListSalesEvidenceCallablePayload.ts"]},
  {name: "AdminCreateSalesAccountCallablePayload", source: "callables/admin_sales_hosts_create_payload.schema.json", typeOutput: "functions/src/shared/generated/adminCreateSalesAccountCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminCreateSalesAccountCallablePayload.ts"]},
  {name: "AdminUpdateSalesAccountCallablePayload", source: "callables/admin_sales_hosts_update_payload.schema.json", typeOutput: "functions/src/shared/generated/adminUpdateSalesAccountCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminUpdateSalesAccountCallablePayload.ts"]},
  {name: "AdminUpsertSalesTaskCallablePayload", source: "callables/admin_sales_tasks_upsert_payload.schema.json", typeOutput: "functions/src/shared/generated/adminUpsertSalesTaskCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminUpsertSalesTaskCallablePayload.ts"]},
  {name: "AdminUpsertSalesOpportunityCallablePayload", source: "callables/admin_sales_opportunities_upsert_payload.schema.json", typeOutput: "functions/src/shared/generated/adminUpsertSalesOpportunityCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminUpsertSalesOpportunityCallablePayload.ts"]},
  {name: "AdminRecordSalesActivityCallablePayload", source: "callables/admin_sales_activities_log_payload.schema.json", typeOutput: "functions/src/shared/generated/adminRecordSalesActivityCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminRecordSalesActivityCallablePayload.ts"]},
  {name: "AdminCreateSalesCustomFieldCallablePayload", source: "callables/admin_sales_fields_create_payload.schema.json", typeOutput: "functions/src/shared/generated/adminCreateSalesCustomFieldCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminCreateSalesCustomFieldCallablePayload.ts"]},
  {name: "AdminSetSalesCustomFieldValueCallablePayload", source: "callables/admin_sales_fields_set_value_payload.schema.json", typeOutput: "functions/src/shared/generated/adminSetSalesCustomFieldValueCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminSetSalesCustomFieldValueCallablePayload.ts"]},
  {name: "AdminLinkSalesInboundIntentCallablePayload", source: "callables/admin_sales_intents_link_payload.schema.json", typeOutput: "functions/src/shared/generated/adminLinkSalesInboundIntentCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminLinkSalesInboundIntentCallablePayload.ts"]},
  {name: "AdminApplySalesImportCallablePayload", source: "callables/admin_sales_imports_apply_payload.schema.json", typeOutput: "functions/src/shared/generated/adminApplySalesImportCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminApplySalesImportCallablePayload.ts"]},
  {name: "AdminUpsertSalesContactCallablePayload", source: "callables/admin_sales_contacts_upsert_payload.schema.json", typeOutput: "functions/src/shared/generated/adminUpsertSalesContactCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminUpsertSalesContactCallablePayload.ts"]},
  {name: "AdminAddSalesEvidenceCallablePayload", source: "callables/admin_sales_evidence_add_payload.schema.json", typeOutput: "functions/src/shared/generated/adminAddSalesEvidenceCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminAddSalesEvidenceCallablePayload.ts"]},
  {name: "AdminSetSalesAccountSuppressionCallablePayload", source: "callables/admin_sales_accounts_set_suppression_payload.schema.json", typeOutput: "functions/src/shared/generated/adminSetSalesAccountSuppressionCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminSetSalesAccountSuppressionCallablePayload.ts"]},
  {name: "AdminSetSalesContactabilityCallablePayload", source: "callables/admin_sales_contacts_set_contactability_payload.schema.json", typeOutput: "functions/src/shared/generated/adminSetSalesContactabilityCallablePayload.ts", additionalTypeOutputs: ["admin/src/generated/contracts/adminSetSalesContactabilityCallablePayload.ts"]},
  {name: "OrganizerSalesAccountDocument", source: "firestore/organizer_sales_accounts.schema.json", typeOutput: "functions/src/shared/generated/organizerSalesAccountDocument.ts"},
  {name: "SalesContactDocument", source: "firestore/sales_contacts.schema.json", typeOutput: "functions/src/shared/generated/salesContactDocument.ts"},
  {name: "SalesContactRelationshipDocument", source: "firestore/sales_contact_relationships.schema.json", typeOutput: "functions/src/shared/generated/salesContactRelationshipDocument.ts"},
  {name: "SalesEvidenceDocument", source: "firestore/sales_evidence.schema.json", typeOutput: "functions/src/shared/generated/salesEvidenceDocument.ts"},
  {name: "SalesTaskDocument", source: "firestore/sales_tasks.schema.json", typeOutput: "functions/src/shared/generated/salesTaskDocument.ts"},
  {name: "SalesOpportunityDocument", source: "firestore/sales_opportunities.schema.json", typeOutput: "functions/src/shared/generated/salesOpportunityDocument.ts"},
  {name: "SalesActivityDocument", source: "firestore/sales_activities.schema.json", typeOutput: "functions/src/shared/generated/salesActivityDocument.ts"},
  {name: "SalesCustomFieldDocument", source: "firestore/sales_custom_fields.schema.json", typeOutput: "functions/src/shared/generated/salesCustomFieldDocument.ts"},
  {name: "SalesCustomFieldValueDocument", source: "firestore/sales_custom_field_values.schema.json", typeOutput: "functions/src/shared/generated/salesCustomFieldValueDocument.ts"},
  {name: "SalesActionReceiptDocument", source: "firestore/sales_action_receipts.schema.json", typeOutput: "functions/src/shared/generated/salesActionReceiptDocument.ts"},
  {name: "SalesImportJobDocument", source: "firestore/sales_import_jobs.schema.json", typeOutput: "functions/src/shared/generated/salesImportJobDocument.ts"},
  {name: "SalesImportRowDocument", source: "firestore/sales_import_rows.schema.json", typeOutput: "functions/src/shared/generated/salesImportRowDocument.ts"},
  {name: "SalesImportJobRowDocument", source: "firestore/sales_import_job_rows.schema.json", typeOutput: "functions/src/shared/generated/salesImportJobRowDocument.ts"},
  {name: "SalesSettingDocument", source: "firestore/sales_settings.schema.json", typeOutput: "functions/src/shared/generated/salesSettingDocument.ts"},
  {name: "SalesSuppressionDecisionDocument", source: "firestore/sales_suppression_decisions.schema.json", typeOutput: "functions/src/shared/generated/salesSuppressionDecisionDocument.ts"},
  {"name": "AdminSalesEvidenceProposalsListCallablePayload", "source": "callables/admin_sales_evidence_proposals_list_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesEvidenceProposalsListCallablePayload.ts"},
  {"name": "AdminSalesEvidenceProposeCallablePayload", "source": "callables/admin_sales_evidence_propose_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesEvidenceProposeCallablePayload.ts"},
  {"name": "AdminSalesEvidenceReviewProposalCallablePayload", "source": "callables/admin_sales_evidence_review_proposal_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesEvidenceReviewProposalCallablePayload.ts"},
  {"name": "AdminSalesIntelligenceAssessmentCallablePayload", "source": "callables/admin_sales_intelligence_assessment_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligenceAssessmentCallablePayload.ts"},
  {"name": "AdminSalesIntelligenceClauseCallablePayload", "source": "callables/admin_sales_intelligence_clause_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligenceClauseCallablePayload.ts"},
  {"name": "AdminBuildSalesOutreachInputPayload", "source": "callables/admin_sales_intelligence_draft_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligenceDraftCallablePayload.ts"},
  {"name": "AdminSalesIntelligencePolicyCallablePayload", "source": "callables/admin_sales_intelligence_policy_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligencePolicyCallablePayload.ts"},
  {"name": "AdminSalesIntelligenceReviewCallablePayload", "source": "callables/admin_sales_intelligence_review_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligenceReviewCallablePayload.ts"},
  {"name": "AdminSalesIntelligenceScoreCallablePayload", "source": "callables/admin_sales_intelligence_score_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesIntelligenceScoreCallablePayload.ts"},
  {"name": "SalesDemoManagementCallablePayload", "source": "callables/sales_demo_management.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoManagementCallablePayload.ts"},
  {"name": "SalesDemoPreviewCallablePayload", "source": "callables/sales_demo_preview.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoPreviewCallablePayload.ts"},
  {"name": "SalesDemoTrialCallablePayload", "source": "callables/sales_demo_trial.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoTrialCallablePayload.ts"},
  {"name": "SalesDemoBlueprintsDocument", "source": "firestore/sales_demo_blueprints.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoBlueprintsDocument.ts"},
  {"name": "SalesDemoCapabilitiesDocument", "source": "firestore/sales_demo_capabilities.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoCapabilitiesDocument.ts"},
  {"name": "SalesDemoInvitationsDocument", "source": "firestore/sales_demo_invitations.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoInvitationsDocument.ts"},
  {"name": "SalesDemoReceiptsDocument", "source": "firestore/sales_demo_receipts.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoReceiptsDocument.ts"},
  {"name": "AdminListSalesFitQueuePayload", "source": "callables/admin_sales_fit_queue_list_request.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesFitQueuePayload.ts"},
  {"name": "AdminRefreshSalesFitQueueBatchPayload", "source": "callables/admin_sales_fit_queue_refresh_batch_request.schema.json", "typeOutput": "functions/src/shared/generated/adminRefreshSalesFitQueueBatchPayload.ts"},
  {"name": "AdminRefreshSalesFitQueuePayload", "source": "callables/admin_sales_fit_queue_refresh_request.schema.json", "typeOutput": "functions/src/shared/generated/adminRefreshSalesFitQueuePayload.ts"},
  {"name": "AdminListSalesFitQueueResponse", "source": "callable_responses/admin_sales_fit_queue_list_response.schema.json", "typeOutput": "functions/src/shared/generated/adminListSalesFitQueueResponse.ts"},
  {"name": "AdminRefreshSalesFitQueueBatchResponse", "source": "callable_responses/admin_sales_fit_queue_refresh_batch_response.schema.json", "typeOutput": "functions/src/shared/generated/adminRefreshSalesFitQueueBatchResponse.ts"},
  {"name": "AdminRefreshSalesFitQueueResponse", "source": "callable_responses/admin_sales_fit_queue_refresh_response.schema.json", "typeOutput": "functions/src/shared/generated/adminRefreshSalesFitQueueResponse.ts"},
  {"name": "SalesFitQueueEntryDocument", "source": "firestore/sales_fit_queue_entries.schema.json", "typeOutput": "functions/src/shared/generated/salesFitQueueEntryDocument.ts"},
  {"name": "SalesFitQueueMetaDocument", "source": "firestore/sales_fit_queue_meta.schema.json", "typeOutput": "functions/src/shared/generated/salesFitQueueMetaDocument.ts"},
  {"name": "SalesFitQueueReceiptDocument", "source": "firestore/sales_fit_queue_receipts.schema.json", "typeOutput": "functions/src/shared/generated/salesFitQueueReceiptDocument.ts"},
  {"name": "AdminApplySalesImportCompensationResponse", "source": "callable_responses/admin_sales_import_compensation_apply_response.schema.json", "typeOutput": "functions/src/shared/generated/adminApplySalesImportCompensationResponse.ts"},
  {"name": "AdminPreviewSalesImportCompensationResponse", "source": "callable_responses/admin_sales_import_compensation_preview_response.schema.json", "typeOutput": "functions/src/shared/generated/adminPreviewSalesImportCompensationResponse.ts"},
  {"name": "AdminSalesImportCompensationApplyPayload", "source": "callables/admin_sales_import_compensation_apply_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesImportCompensationApplyPayload.ts"},
  {"name": "AdminSalesImportCompensationPreviewPayload", "source": "callables/admin_sales_import_compensation_preview_payload.schema.json", "typeOutput": "functions/src/shared/generated/adminSalesImportCompensationPreviewPayload.ts"},
  {"name": "SalesImportCompensationDocument", "source": "firestore/sales_import_compensations.schema.json", "typeOutput": "functions/src/shared/generated/salesImportCompensationDocument.ts"},
  {name: "SalesDemoSetupDocument", source: "firestore/sales_demo_setups.schema.json", typeOutput: "functions/src/shared/generated/salesDemoSetupDocument.ts"},
  {name: "SalesDemoSetupCallablePayload", source: "callables/sales_demo_setup.schema.json", typeOutput: "functions/src/shared/generated/salesDemoSetupCallablePayload.ts"},
  {name: "SalesDemoSetupCallableResponse", source: "callable_responses/sales_demo_setup_response.schema.json", typeOutput: "functions/src/shared/generated/salesDemoSetupCallableResponse.ts"},
  {"name": "SalesDemoSessionsDocument", "source": "firestore/sales_demo_sessions.schema.json", "typeOutput": "functions/src/shared/generated/salesDemoSessionsDocument.ts"},
  {"name": "SalesEvidenceProposalsDocument", "source": "firestore/sales_evidence_proposals.schema.json", "typeOutput": "functions/src/shared/generated/salesEvidenceProposalsDocument.ts"},
  {"name": "HostAcquisitionConsentDocument", "source": "firestore/host_acquisition_consents.schema.json", "typeOutput": "functions/src/shared/generated/hostAcquisitionConsentDocument.ts"},
  {"name": "HostPilotEventReviewDocument", "source": "firestore/host_pilot_event_reviews.schema.json", "typeOutput": "functions/src/shared/generated/hostPilotEventReviewDocument.ts"},
  {"name": "HostOrganizerActivationDocument", "source": "firestore/host_organizer_activations.schema.json", "typeOutput": "functions/src/shared/generated/hostOrganizerActivationDocument.ts"},
  {"name": "HostOperatorAlertDocument", "source": "firestore/host_operator_alerts.schema.json", "typeOutput": "functions/src/shared/generated/hostOperatorAlertDocument.ts"},
  {"name": "HostAcquisitionDeliveryDocument", "source": "firestore/host_acquisition_deliveries.schema.json", "typeOutput": "functions/src/shared/generated/hostAcquisitionDeliveryDocument.ts"},
  {"name": "SalesInboundIntentsDocument", "source": "firestore/sales_inbound_intents.schema.json", "typeOutput": "functions/src/shared/generated/salesInboundIntentsDocument.ts"},
  {"name": "SalesIntelligenceAssessmentDocument", "source": "firestore/sales_intelligence_assessments.schema.json", "typeOutput": "functions/src/shared/generated/salesIntelligenceAssessmentsDocument.ts"},
  {"name": "SalesIntelligenceClauseDocument", "source": "firestore/sales_intelligence_clauses.schema.json", "typeOutput": "functions/src/shared/generated/salesIntelligenceClausesDocument.ts"},
  {"name": "SalesIntelligencePolicyDocument", "source": "firestore/sales_intelligence_policies.schema.json", "typeOutput": "functions/src/shared/generated/salesIntelligencePoliciesDocument.ts"},
  {"name": "SalesIntelligenceReceiptDocument", "source": "firestore/sales_intelligence_receipts.schema.json", "typeOutput": "functions/src/shared/generated/salesIntelligenceReceiptsDocument.ts"},
  {"name": "SalesIntelligenceScoreSnapshotDocument", "source": "firestore/sales_intelligence_score_snapshots.schema.json", "typeOutput": "functions/src/shared/generated/salesIntelligenceScoreSnapshotsDocument.ts"},
  {"name": "SalesOutreachDraftsDocument", "source": "firestore/sales_outreach_drafts.schema.json", "typeOutput": "functions/src/shared/generated/salesOutreachDraftsDocument.ts"},
  {name: "LegacyPaymentRefundIntent", source: "embedded/legacy_payment_refund.schema.json", typeOutput: "functions/src/shared/generated/legacyPaymentRefundIntent.ts"},
  {name: "SetEventPublicationCallablePayload", source: "callables/set_event_publication_payload.schema.json", typeOutput: "functions/src/shared/generated/setEventPublicationCallablePayload.ts"},
  {name: "EventPublicationCallableResponse", source: "callable_responses/event_publication_response.schema.json", typeOutput: "functions/src/shared/generated/eventPublicationCallableResponse.ts"},
  {"name": "PublicEventPaymentDocument", "source": "firestore/public_event_payments.schema.json", "typeOutput": "functions/src/shared/generated/publicEventPaymentDocument.ts"},
  {"name": "PublicEventAdmissionReceiptDocument", "source": "firestore/public_event_admission_receipts.schema.json", "typeOutput": "functions/src/shared/generated/publicEventAdmissionReceiptDocument.ts"},
  {"name": "EventRegistrationReceiptDocument", "source": "firestore/event_registration_receipts.schema.json", "typeOutput": "functions/src/shared/generated/eventRegistrationReceiptDocument.ts"},
  {"name": "ManagePublicEventCheckoutCallablePayload", "source": "callables/manage_public_event_checkout_payload.schema.json", "typeOutput": "functions/src/shared/generated/managePublicEventCheckoutCallablePayload.ts", "additionalTypeOutputs": ["website/src/shared/contracts/generated/managePublicEventCheckoutCallablePayload.ts"]},
  {"name": "ManagePublicEventCheckoutCallableResponse", "source": "callable_responses/manage_public_event_checkout_response.schema.json", "typeOutput": "functions/src/shared/generated/managePublicEventCheckoutCallableResponse.ts", "additionalTypeOutputs": ["website/src/shared/contracts/generated/managePublicEventCheckoutCallableResponse.ts"]},
  {"name": "ConfigureEventRegistrationCallablePayload", "source": "callables/configure_event_registration_payload.schema.json", "typeOutput": "functions/src/shared/generated/configureEventRegistrationCallablePayload.ts"},
  {"name": "ConfigureEventRegistrationCallableResponse", "source": "callable_responses/configure_event_registration_response.schema.json", "typeOutput": "functions/src/shared/generated/configureEventRegistrationCallableResponse.ts"},
  {name: "OrganizerEventOfferPaymentDocument", source: "firestore/organizer_event_offer_payments.schema.json", typeOutput: "functions/src/shared/generated/organizerEventOfferPaymentDocument.ts"},
  {name: "OrganizerEventOfferRecipientDocument", source: "firestore/organizer_event_offer_recipients.schema.json", typeOutput: "functions/src/shared/generated/organizerEventOfferRecipientDocument.ts"},
  {name: "PaymentRoutingSnapshot", source: "embedded/payment_routing_snapshot.schema.json", typeOutput: "functions/src/shared/generated/paymentRoutingSnapshot.ts"},
  {name: "ManagePaymentRoutingPolicyCallablePayload", source: "callables/manage_payment_routing_policy_payload.schema.json", typeOutput: "functions/src/shared/generated/managePaymentRoutingPolicyCallablePayload.ts"},
  {name: "ManagePaymentRoutingPolicyCallableResponse", source: "callable_responses/manage_payment_routing_policy_response.schema.json", typeOutput: "functions/src/shared/generated/managePaymentRoutingPolicyCallableResponse.ts"},
  {"name": "ManageEventOfferCheckoutCallablePayload", "source": "callables/manage_event_offer_checkout_payload.schema.json", "typeOutput": "functions/src/shared/generated/manageEventOfferCheckoutCallablePayload.ts"},
  {"name": "PrepareEventOfferInvitationCallablePayload", "source": "callables/prepare_event_offer_invitation_payload.schema.json", "typeOutput": "functions/src/shared/generated/prepareEventOfferInvitationCallablePayload.ts"},
  {"name": "PrepareEventOfferInvitationCallableResponse", "source": "callable_responses/prepare_event_offer_invitation_response.schema.json", "typeOutput": "functions/src/shared/generated/prepareEventOfferInvitationCallableResponse.ts"},
  {"name": "ManageEventOfferCheckoutCallableResponse", "source": "callable_responses/manage_event_offer_checkout_response.schema.json", "typeOutput": "functions/src/shared/generated/manageEventOfferCheckoutCallableResponse.ts"},
  {"name": "PreviewOrganizerFormAdmissionCallablePayload", "source": "callables/preview_organizer_form_admission_payload.schema.json", "typeOutput": "functions/src/shared/generated/previewOrganizerFormAdmissionCallablePayload.ts"},
  {"name": "PreviewOrganizerFormAdmissionCallableResponse", "source": "callable_responses/preview_organizer_form_admission_response.schema.json", "typeOutput": "functions/src/shared/generated/previewOrganizerFormAdmissionCallableResponse.ts"},
  {"name": "OrganizerFormAdmissionDocument", "source": "firestore/organizer_form_admissions.schema.json", "typeOutput": "functions/src/shared/generated/organizerFormAdmissionDocument.ts"},
  {"name": "CommitOrganizerFormAdmissionCallablePayload", "source": "callables/commit_organizer_form_admission_payload.schema.json", "typeOutput": "functions/src/shared/generated/commitOrganizerFormAdmissionCallablePayload.ts"},
  {"name": "CommitOrganizerFormAdmissionCallableResponse", "source": "callable_responses/commit_organizer_form_admission_response.schema.json", "typeOutput": "functions/src/shared/generated/commitOrganizerFormAdmissionCallableResponse.ts"},
  {"name": "OrganizerFormAdmissionReceiptDocument", "source": "firestore/organizer_form_admission_receipts.schema.json", "typeOutput": "functions/src/shared/generated/organizerFormAdmissionReceiptDocument.ts"},
  {"name": "ConfigureEventOfferPreferencesCallablePayload", "source": "callables/configure_event_offer_preferences_payload.schema.json", "typeOutput": "functions/src/shared/generated/configureEventOfferPreferencesCallablePayload.ts"},
  {"name": "ConfigureEventOfferPreferencesCallableResponse", "source": "callable_responses/configure_event_offer_preferences_response.schema.json", "typeOutput": "functions/src/shared/generated/configureEventOfferPreferencesCallableResponse.ts"},
  {"name": "PreviewEventOfferPreferencesCallableResponse", "source": "callable_responses/preview_event_offer_preferences_response.schema.json", "typeOutput": "functions/src/shared/generated/previewEventOfferPreferencesCallableResponse.ts"},
  {"name": "EventOfferConfigurationReceiptDocument", "source": "firestore/event_offer_configuration_receipts.schema.json", "typeOutput": "functions/src/shared/generated/eventOfferConfigurationReceiptDocument.ts"},
  {"name": "ListOfferEventTargetsCallablePayload", "source": "callables/list_offer_event_targets_payload.schema.json", "typeOutput": "functions/src/shared/generated/listOfferEventTargetsCallablePayload.ts"},
  {"name": "OfferEventTargetListCallableResponse", "source": "callable_responses/offer_event_target_list_response.schema.json", "typeOutput": "functions/src/shared/generated/offerEventTargetListCallableResponse.ts"},
  {"name": "GetEventOfferConfigurationCallablePayload", "source": "callables/get_event_offer_configuration_payload.schema.json", "typeOutput": "functions/src/shared/generated/getEventOfferConfigurationCallablePayload.ts"},
  {"name": "EventOfferConfigurationCallableResponse", "source": "callable_responses/event_offer_configuration_response.schema.json", "typeOutput": "functions/src/shared/generated/eventOfferConfigurationCallableResponse.ts"},
  {name: "ReconcilePrivateEventSeatsCallablePayload", source: "callables/reconcile_private_event_seats_payload.schema.json", typeOutput: "functions/src/shared/generated/reconcilePrivateEventSeatsCallablePayload.ts"},
  {name: "PrivateSeatReconciliationCallableResponse", source: "callable_responses/private_seat_reconciliation_response.schema.json", typeOutput: "functions/src/shared/generated/privateSeatReconciliationCallableResponse.ts"},
  {"name": "UpdatePrivateEventDetailsCallablePayload", "source": "callables/update_private_event_details_payload.schema.json", "typeOutput": "functions/src/shared/generated/updatePrivateEventDetailsCallablePayload.ts"},
  {"name": "PrepareEventOfferHandoffCallablePayload", "source": "callables/prepare_event_offer_handoff_payload.schema.json", "typeOutput": "functions/src/shared/generated/prepareEventOfferHandoffCallablePayload.ts"},
  {"name": "EventOfferHandoffCallableResponse", "source": "callable_responses/event_offer_handoff_response.schema.json", "typeOutput": "functions/src/shared/generated/eventOfferHandoffCallableResponse.ts"},
  {"name": "ListPrivateEventSetupsCallablePayload", "source": "callables/list_private_event_setups_payload.schema.json", "typeOutput": "functions/src/shared/generated/listPrivateEventSetupsCallablePayload.ts"},
  {"name": "PrivateEventSetupListCallableResponse", "source": "callable_responses/private_event_setup_list_response.schema.json", "typeOutput": "functions/src/shared/generated/privateEventSetupListCallableResponse.ts"},
  {"name": "EventPreferenceIntents", "source": "embedded/event_preference_intents.schema.json", "typeOutput": "functions/src/shared/generated/eventPreferenceIntents.ts"},
  {"name": "ResolvedEventPreferences", "source": "embedded/resolved_event_preferences.schema.json", "typeOutput": "functions/src/shared/generated/resolvedEventPreferences.ts"},
  {"name": "EventPaymentTerms", "source": "embedded/event_payment_terms.schema.json", "typeOutput": "functions/src/shared/generated/eventPaymentTerms.ts"},
  {"name": "EventSetupPreferencesDocument", "source": "firestore/event_setup_preferences.schema.json", "typeOutput": "functions/src/shared/generated/eventSetupPreferencesDocument.ts"},
  {"name": "UpdatePrivateEventPreferencesCallablePayload", "source": "callables/update_private_event_preferences_payload.schema.json", "typeOutput": "functions/src/shared/generated/updatePrivateEventPreferencesCallablePayload.ts"},

  {name: "EventSetupReceiptDocument", source: "firestore/event_setup_receipts.schema.json", typeOutput: "functions/src/shared/generated/eventSetupReceiptDocument.ts"},
{
    "name": "OrganizerEventSetupPreferences",
    "source": "embedded/organizer_event_setup_preferences.schema.json",
    "typeOutput": "functions/src/shared/generated/organizerEventSetupPreferences.ts"
},
{
    "name": "GetOrganizerEventSetupDefaultsCallablePayload",
    "source": "callables/get_organizer_event_setup_defaults_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getOrganizerEventSetupDefaultsCallablePayload.ts"
},
{
    "name": "UpdateOrganizerEventSetupDefaultsCallablePayload",
    "source": "callables/update_organizer_event_setup_defaults_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/updateOrganizerEventSetupDefaultsCallablePayload.ts"
},
{
    "name": "OrganizerEventSetupDefaultsCallableResponse",
    "source": "callable_responses/organizer_event_setup_defaults_response.schema.json",
    "typeOutput": "functions/src/shared/generated/organizerEventSetupDefaultsCallableResponse.ts"
},
{
    "name": "UpdateOrganizerEventSetupDefaultsCallableResponse",
    "source": "callable_responses/update_organizer_event_setup_defaults_response.schema.json",
    "typeOutput": "functions/src/shared/generated/updateOrganizerEventSetupDefaultsCallableResponse.ts"
},
{
    "name": "OrganizerEventSetupDefaultsDocument",
    "source": "firestore/organizer_event_setup_defaults.schema.json",
    "typeOutput": "functions/src/shared/generated/organizerEventSetupDefaultsDocument.ts"
},
{
    "name": "OrganizerEventSetupDefaultReceiptDocument",
    "source": "firestore/organizer_event_setup_default_receipts.schema.json",
    "typeOutput": "functions/src/shared/generated/organizerEventSetupDefaultReceiptDocument.ts"
},
  {
    "name": "EventRehearsalMilestoneDocument",
    "source": "firestore/event_rehearsal_milestones.schema.json",
    "typeOutput": "functions/src/shared/generated/eventRehearsalMilestoneDocument.ts"
  },
  {
    "name": "GetEventRehearsalSummaryCallablePayload",
    "source": "callables/get_event_rehearsal_summary_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventRehearsalSummaryCallablePayload.ts"
  },
  {
    "name": "EventRehearsalSummaryCallableResponse",
    "source": "callable_responses/event_rehearsal_summary_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventRehearsalSummaryCallableResponse.ts"
  },
{
  "name": "GetEventAssistanceParticipantContextCallablePayload",
  "source": "callables/get_event_assistance_participant_context_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/getEventAssistanceParticipantContextCallablePayload.ts"
},
{
  "name": "EventAssistanceParticipantContextCallableResponse",
  "source": "callable_responses/event_assistance_participant_context_response.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceParticipantContextCallableResponse.ts"
},
  {
  "name": "ListEventAssistanceDepartureRostersCallablePayload",
  "source": "callables/list_event_assistance_departure_rosters_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/listEventAssistanceDepartureRostersCallablePayload.ts"
},
  {
  "name": "EventAssistanceDepartureRostersCallableResponse",
  "source": "callable_responses/event_assistance_departure_rosters_response.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceDepartureRostersCallableResponse.ts"
},

{
  "name": "ListEventSmsPreferencesCallablePayload",
  "source": "callables/list_event_sms_preferences_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/listEventSmsPreferencesInput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/listEventSmsPreferencesInput.ts"
  ]
},
{
  "name": "ListEventSmsPreferencesCallableResponse",
  "source": "callable_responses/list_event_sms_preferences_response.schema.json",
  "typeOutput": "functions/src/shared/generated/listEventSmsPreferencesOutput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/listEventSmsPreferencesOutput.ts"
  ]
},
{
  "name": "ListEventWhatsappPreferencesCallablePayload",
  "source": "callables/list_event_whatsapp_preferences_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/listEventWhatsappPreferencesInput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/listEventWhatsappPreferencesInput.ts"
  ]
},
{
  "name": "ListEventWhatsappPreferencesCallableResponse",
  "source": "callable_responses/list_event_whatsapp_preferences_response.schema.json",
  "typeOutput": "functions/src/shared/generated/listEventWhatsappPreferencesOutput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/listEventWhatsappPreferencesOutput.ts"
  ]
},
{
  "name": "ListEventRcsPreferencesCallablePayload",
  "source": "callables/list_event_rcs_preferences_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/listEventRcsPreferencesInput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/listEventRcsPreferencesInput.ts"
  ]
},
{
  "name": "ListEventRcsPreferencesCallableResponse",
  "source": "callable_responses/list_event_rcs_preferences_response.schema.json",
  "typeOutput": "functions/src/shared/generated/listEventRcsPreferencesOutput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/listEventRcsPreferencesOutput.ts"
  ]
},
{
  "name": "EventRcsCallbackReceiptDocument",
  "source": "firestore/event_assistance_rcs_callback_receipts.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsCallbackReceiptDocument.ts"
},
{
  "name": "EventRcsBudgetDocument",
  "source": "firestore/event_assistance_rcs_budgets.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsBudgetDocument.ts"
},
{
  "name": "EventRcsDispatchDocument",
  "source": "firestore/event_assistance_rcs_dispatches.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsDispatchDocument.ts"
},
{
  "name": "EventRcsCapabilityObservation",
  "source": "shared/event_assistance_rcs_capability.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsCapabilityObservation.ts"
},
{
  "name": "EventRcsWithdrawalGrantDocument",
  "source": "firestore/event_assistance_rcs_withdrawal_grants.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsWithdrawalGrantDocument.ts"
},
{
  "name": "GetEventRcsWithdrawalCallablePayload",
  "source": "callables/get_event_rcs_withdrawal_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/getEventRcsWithdrawalInput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/getEventRcsWithdrawalInput.ts"
  ]
},
{
  "name": "WithdrawEventRcsCallablePayload",
  "source": "callables/withdraw_event_rcs_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/withdrawEventRcsInput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/withdrawEventRcsInput.ts"
  ]
},
{
  "name": "EventRcsWithdrawalCallableResponse",
  "source": "callable_responses/event_rcs_withdrawal_response.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsWithdrawalOutput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/eventRcsWithdrawalOutput.ts"
  ]
},
{
  "name": "EventRcsSenderDocument",
  "source": "firestore/event_assistance_rcs_senders.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsSenderDocument.ts"
},
{
  "name": "EventRcsPermissionDocument",
  "source": "firestore/event_assistance_rcs_permissions.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsPermissionDocument.ts"
},
{
  "name": "EventRcsConsentReceiptDocument",
  "source": "firestore/event_assistance_rcs_consent_receipts.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsConsentReceiptDocument.ts"
},
{
  "name": "GetEventRcsPreferenceCallablePayload",
  "source": "callables/get_event_rcs_preference_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/getEventRcsPreferenceInput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/getEventRcsPreferenceInput.ts"
  ]
},
{
  "name": "SetEventRcsPreferenceCallablePayload",
  "source": "callables/set_event_rcs_preference_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/setEventRcsPreferenceInput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/setEventRcsPreferenceInput.ts"
  ]
},
{
  "name": "EventRcsPreferenceCallableResponse",
  "source": "callable_responses/event_rcs_preference_response.schema.json",
  "typeOutput": "functions/src/shared/generated/eventRcsPreferenceOutput.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/eventRcsPreferenceOutput.ts"
  ]
},
  {
    name: "EventRcsSubscriptionDocument",
    source: "firestore/event_assistance_rcs_subscriptions.schema.json",
    typeOutput: "functions/src/shared/generated/eventRcsSubscriptionDocument.ts",
  },
  {
    name: "EventAssistanceRcsCallbackDocument",
    source: "firestore/event_assistance_rcs_callbacks.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceRcsCallbackDocument.ts",
  },
  {
    name: "EventAssistanceRcsCallbackIdentityDocument",
    source: "firestore/event_assistance_rcs_callback_identities.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceRcsCallbackIdentity.ts",
  },
  {name: "ListEventAssistanceDeliveriesCallablePayload", source: "callables/list_event_assistance_deliveries_payload.schema.json", typeOutput: "functions/src/shared/generated/listEventAssistanceDeliveriesCallablePayload.ts"},
  {name: "RepairEventAssistanceDeliveryCallablePayload", source: "callables/repair_event_assistance_delivery_payload.schema.json", typeOutput: "functions/src/shared/generated/repairEventAssistanceDeliveryCallablePayload.ts"},
  {name: "EventAssistanceDeliveriesCallableResponse", source: "callable_responses/event_assistance_deliveries_response.schema.json", typeOutput: "functions/src/shared/generated/eventAssistanceDeliveriesCallableResponse.ts"},
  {name: "EventAssistanceDeliveryCallableResponse", source: "callable_responses/event_assistance_delivery_response.schema.json", typeOutput: "functions/src/shared/generated/eventAssistanceDeliveryCallableResponse.ts"},
  {name: "EventAssistanceDeliveryRepairDocument", source: "firestore/event_assistance_delivery_repairs.schema.json", typeOutput: "functions/src/shared/generated/eventAssistanceDeliveryRepairDocument.ts"},
  {"name": "ListEventAssistanceCasesCallablePayload", "source": "callables/list_event_assistance_cases_payload.schema.json", "typeOutput": "functions/src/shared/generated/listEventAssistanceCasesCallablePayload.ts"},
  {"name": "ResolveEventAssistanceCaseCallablePayload", "source": "callables/resolve_event_assistance_case_payload.schema.json", "typeOutput": "functions/src/shared/generated/resolveEventAssistanceCaseCallablePayload.ts"},
  {"name": "EventAssistanceCasesCallableResponse", "source": "callable_responses/event_assistance_cases_response.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceCasesCallableResponse.ts"},
  {"name": "EventAssistanceCaseCallableResponse", "source": "callable_responses/event_assistance_case_response.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceCaseCallableResponse.ts"},
  {"name": "EventAssistanceCaseReceiptDocument", "source": "firestore/event_assistance_case_receipts.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceCaseReceiptDocument.ts"},

  {"name": "GetEventAssistanceHostGuestsCallablePayload", "source": "callables/get_event_assistance_host_guests_payload.schema.json", "typeOutput": "functions/src/shared/generated/getEventAssistanceHostGuestsCallablePayload.ts"},
  {"name": "EventAssistanceHostGuestsCallableResponse", "source": "callable_responses/event_assistance_host_guests_response.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceHostGuestsCallableResponse.ts"},
  {"name": "SetEventAssistanceCheckpointCloseoutCallablePayload", "source": "callables/set_event_assistance_checkpoint_closeout_payload.schema.json", "typeOutput": "functions/src/shared/generated/setEventAssistanceCheckpointCloseoutCallablePayload.ts"},
  {"name": "ReassignEventAssistanceCheckpointReporterCallablePayload", "source": "callables/reassign_event_assistance_checkpoint_reporter_payload.schema.json", "typeOutput": "functions/src/shared/generated/reassignEventAssistanceCheckpointReporterCallablePayload.ts"},
  {"name": "GetEventAssistanceCheckpointCallablePayload", "source": "callables/get_event_assistance_checkpoint_payload.schema.json", "typeOutput": "functions/src/shared/generated/getEventAssistanceCheckpointCallablePayload.ts"},
  {"name": "RecordEventAssistanceCheckpointCallablePayload", "source": "callables/record_event_assistance_checkpoint_payload.schema.json", "typeOutput": "functions/src/shared/generated/recordEventAssistanceCheckpointCallablePayload.ts"},
  {"name": "EventAssistanceCheckpointCallableResponse", "source": "callable_responses/event_assistance_checkpoint_response.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceCheckpointCallableResponse.ts"},
  {"name": "EventAssistanceCheckpointDocument", "source": "firestore/event_assistance_checkpoints.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceCheckpointDocument.ts"},
  {"name": "EventAssistanceCheckpointReceiptDocument", "source": "firestore/event_assistance_checkpoint_receipts.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceCheckpointReceiptDocument.ts"},
  {"name": "EventAssistanceAccountabilityReceiptDocument", "source": "firestore/event_assistance_accountability_receipts.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceAccountabilityReceiptDocument.ts"},
  {"name": "GetEventAssistanceAccountabilityCallablePayload", "source": "callables/get_event_assistance_accountability_payload.schema.json", "typeOutput": "functions/src/shared/generated/getEventAssistanceAccountabilityCallablePayload.ts"},
  {"name": "ResolveEventAssistanceAccountabilityCallablePayload", "source": "callables/resolve_event_assistance_accountability_payload.schema.json", "typeOutput": "functions/src/shared/generated/resolveEventAssistanceAccountabilityCallablePayload.ts"},
  {"name": "EventAssistanceAccountabilityCallableResponse", "source": "callable_responses/event_assistance_accountability_response.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceAccountabilityCallableResponse.ts"},

  {"name": "EventAssistanceRuntimeConfigDocument", "source": "firestore/event_assistance_runtime_configs.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceRuntimeConfigDocument.ts"},
  {"name": "EventAssistanceRuntimeConfigReceiptDocument", "source": "firestore/event_assistance_runtime_config_receipts.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceRuntimeConfigReceiptDocument.ts"},
  {"name": "GetEventAssistanceRuntimeConfigCallablePayload", "source": "callables/get_event_assistance_runtime_config_payload.schema.json", "typeOutput": "functions/src/shared/generated/getEventAssistanceRuntimeConfigCallablePayload.ts"},
  {"name": "SetEventAssistanceRuntimeConfigCallablePayload", "source": "callables/set_event_assistance_runtime_config_payload.schema.json", "typeOutput": "functions/src/shared/generated/setEventAssistanceRuntimeConfigCallablePayload.ts"},
  {"name": "EventAssistanceRuntimeConfigCallableResponse", "source": "callable_responses/event_assistance_runtime_config_response.schema.json", "typeOutput": "functions/src/shared/generated/eventAssistanceRuntimeConfigCallableResponse.ts"},

  {
    "name": "GetEventAssistanceMembershipCallablePayload",
    "source": "callables/get_event_assistance_membership_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAssistanceMembershipCallablePayload.ts"
  },
  {
    "name": "TransferEventAssistanceGroupCallablePayload",
    "source": "callables/transfer_event_assistance_group_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/transferEventAssistanceGroupCallablePayload.ts"
  },
  {
    "name": "EventAssistanceMembershipCallableResponse",
    "source": "callable_responses/event_assistance_membership_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceMembershipCallableResponse.ts"
  },
  {
    "name": "EventAssistanceMembershipDocument",
    "source": "firestore/event_assistance_memberships.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceMembershipDocument.ts"
  },
  {
    "name": "EventAssistanceMembershipReceiptDocument",
    "source": "firestore/event_assistance_membership_receipts.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceMembershipReceiptDocument.ts"
  },
  {
    "name": "GetEventAssistanceGroupStaffCallablePayload",
    "source": "callables/get_event_assistance_group_staff_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAssistanceGroupStaffCallablePayload.ts"
  },
  {
    "name": "SetEventAssistanceGroupStaffCallablePayload",
    "source": "callables/set_event_assistance_group_staff_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/setEventAssistanceGroupStaffCallablePayload.ts"
  },
  {
    "name": "EventAssistanceGroupStaffCallableResponse",
    "source": "callable_responses/event_assistance_group_staff_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceGroupStaffCallableResponse.ts"
  },
  {
    "name": "EventAssistanceStaffReceiptDocument",
    "source": "firestore/event_assistance_staff_receipts.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceStaffReceiptDocument.ts"
  },

  {
    "name": "GetEventAttendanceReportCallablePayload",
    "source": "callables/get_event_attendance_report_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAttendanceReportCallablePayload.ts"
  },
  {
    "name": "EventAttendanceReportCallableResponse",
    "source": "callable_responses/event_attendance_report_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAttendanceReportCallableResponse.ts"
  },
  {
    "name": "GetEventAttendanceDispositionCallablePayload",
    "source": "callables/get_event_attendance_disposition_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAttendanceDispositionCallablePayload.ts"
  },
  {
    "name": "RecordEventNoShowCallablePayload",
    "source": "callables/record_event_no_show_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/recordEventNoShowCallablePayload.ts"
  },
  {
    "name": "EventAttendanceDispositionCallableResponse",
    "source": "callable_responses/event_attendance_disposition_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAttendanceDispositionCallableResponse.ts"
  },
  {
    "name": "EventAttendanceDispositionDocument",
    "source": "firestore/event_attendance_dispositions.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAttendanceDispositionDocument.ts"
  },
  {
    "name": "EventAttendanceDispositionReceiptDocument",
    "source": "firestore/event_attendance_disposition_receipts.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAttendanceDispositionReceiptDocument.ts"
  },
  {
    "name": "EventAssistanceParticipationReceiptDocument",
    "source": "firestore/event_assistance_participation_receipts.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceParticipationReceiptDocument.ts"
  },
  {
    "name": "GetEventAssistanceParticipationCallablePayload",
    "source": "callables/get_event_assistance_participation_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAssistanceParticipationCallablePayload.ts"
  },
  {
    "name": "SetEventAssistanceParticipationCallablePayload",
    "source": "callables/set_event_assistance_participation_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/setEventAssistanceParticipationCallablePayload.ts"
  },
  {
    "name": "EventAssistanceParticipationCallableResponse",
    "source": "callable_responses/event_assistance_participation_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceParticipationCallableResponse.ts"
  },

  {
      "name": "EventAssistanceSettingDocument",
      "source": "firestore/event_assistance_settings.schema.json",
      "typeOutput": "functions/src/shared/generated/eventAssistanceSettingDocument.ts"
  },
  {
      "name": "EventAssistanceSettingReceiptDocument",
      "source": "firestore/event_assistance_setting_receipts.schema.json",
      "typeOutput": "functions/src/shared/generated/eventAssistanceSettingReceiptDocument.ts"
  },
  {
      "name": "GetEventAssistanceSettingCallablePayload",
      "source": "callables/get_event_assistance_setting_payload.schema.json",
      "typeOutput": "functions/src/shared/generated/getEventAssistanceSettingCallablePayload.ts"
  },
  {
      "name": "SetEventAssistanceSettingCallablePayload",
      "source": "callables/set_event_assistance_setting_payload.schema.json",
      "typeOutput": "functions/src/shared/generated/setEventAssistanceSettingCallablePayload.ts"
  },
  {
      "name": "EventAssistanceSettingCallableResponse",
      "source": "callable_responses/event_assistance_setting_response.schema.json",
      "typeOutput": "functions/src/shared/generated/eventAssistanceSettingCallableResponse.ts"
  },
  {
    "name": "GetEventAssistanceDepartureRosterCallablePayload",
    "source": "callables/get_event_assistance_departure_roster_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAssistanceDepartureRosterCallablePayload.ts"
  },
  {
    "name": "EventAssistanceDepartureRosterCallableResponse",
    "source": "callable_responses/event_assistance_departure_roster_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceDepartureRosterCallableResponse.ts"
  },
  {
    "name": "EventAssistanceDepartureRosterDocument",
    "source": "firestore/event_assistance_departure_rosters.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceDepartureRosterDocument.ts"
  },
  {
    name: "EventAssistanceProgressReceiptDocument",
    source: "firestore/event_assistance_progress_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceProgressReceiptDocument.ts",
  },
  {
    "name": "EventAssistanceGroupProgressDocument",
    "source": "firestore/event_assistance_group_progress.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceGroupProgressDocument.ts"
  },
  {
    "name": "GetEventAssistanceGroupProgressCallablePayload",
    "source": "callables/get_event_assistance_group_progress_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAssistanceGroupProgressCallablePayload.ts"
  },
  {
    "name": "ConfirmEventAssistanceDepartureCallablePayload",
    "source": "callables/confirm_event_assistance_departure_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/confirmEventAssistanceDepartureCallablePayload.ts"
  },
  {
    "name": "ChangeEventAssistanceRouteCallablePayload",
    "source": "callables/change_event_assistance_route_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/changeEventAssistanceRouteCallablePayload.ts"
  },
  {
    "name": "EventAssistanceGroupProgressCallableResponse",
    "source": "callable_responses/event_assistance_group_progress_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceGroupProgressCallableResponse.ts"
  },
  {
    "name": "EventWhatsappWithdrawalGrantDocument",
    "source": "firestore/event_assistance_whatsapp_withdrawal_grants.schema.json",
    "typeOutput": "functions/src/shared/generated/eventWhatsappWithdrawalGrantDocument.ts"
  },
  {
    "name": "GetEventWhatsappWithdrawalCallablePayload",
    "source": "callables/get_event_whatsapp_withdrawal_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventWhatsappWithdrawalCallablePayload.ts",
    "additionalTypeOutputs": [
      "website/src/shared/contracts/generated/getEventWhatsappWithdrawalCallablePayload.ts"
    ]
  },
  {
    "name": "WithdrawEventWhatsappCallablePayload",
    "source": "callables/withdraw_event_whatsapp_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/withdrawEventWhatsappCallablePayload.ts",
    "additionalTypeOutputs": [
      "website/src/shared/contracts/generated/withdrawEventWhatsappCallablePayload.ts"
    ]
  },
  {
    "name": "EventWhatsappWithdrawalCallableResponse",
    "source": "callable_responses/event_whatsapp_withdrawal_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventWhatsappWithdrawalCallableResponse.ts",
    "additionalTypeOutputs": [
      "website/src/shared/contracts/generated/eventWhatsappWithdrawalCallableResponse.ts"
    ]
  },

  {
    name: "EventWhatsappBudgetDocument",
    source: "firestore/event_whatsapp_budgets.schema.json",
    typeOutput: "functions/src/shared/generated/eventWhatsappBudgetDocument.ts",
  },
  {
    name: "EventWhatsappDispatchDocument",
    source: "firestore/event_whatsapp_dispatches.schema.json",
    typeOutput: "functions/src/shared/generated/eventWhatsappDispatchDocument.ts",
  },
  {
    name: "OrganizerWhatsappEndpointStopDocument",
    source: "firestore/organizer_whatsapp_endpoint_stops.schema.json",
    typeOutput: "functions/src/shared/generated/organizerWhatsappEndpointStopDocument.ts",
  },
  {
    name: "EventWhatsappPermissionDocument",
    source: "firestore/event_assistance_whatsapp_permissions.schema.json",
    typeOutput: "functions/src/shared/generated/eventWhatsappPermissionDocument.ts",
  },
  {
    name: "EventWhatsappConsentReceiptDocument",
    source: "firestore/event_assistance_whatsapp_consent_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/eventWhatsappConsentReceiptDocument.ts",
  },
  {
    name: "GetEventWhatsappPreferenceCallablePayload",
    source: "callables/get_event_whatsapp_preference_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getEventWhatsappPreferenceCallablePayload.ts",
    additionalTypeOutputs: ["website/src/shared/contracts/generated/getEventWhatsappPreferenceCallablePayload.ts"],
  },
  {
    name: "SetEventWhatsappPreferenceCallablePayload",
    source: "callables/set_event_whatsapp_preference_payload.schema.json",
    typeOutput: "functions/src/shared/generated/setEventWhatsappPreferenceCallablePayload.ts",
    additionalTypeOutputs: ["website/src/shared/contracts/generated/setEventWhatsappPreferenceCallablePayload.ts"],
  },
  {
    name: "EventWhatsappPreferenceCallableResponse",
    source: "callable_responses/event_whatsapp_preference_response.schema.json",
    typeOutput: "functions/src/shared/generated/eventWhatsappPreferenceCallableResponse.ts",
    additionalTypeOutputs: ["website/src/shared/contracts/generated/eventWhatsappPreferenceCallableResponse.ts"],
  },
  {
    name: "EventWhatsappPolicyDocument",
    source: "firestore/event_assistance_whatsapp_policies.schema.json",
    typeOutput: "functions/src/shared/generated/eventWhatsappPolicyDocument.ts",
  },
  {
    name: "EventWhatsappReplyBindingDocument",
    source: "firestore/event_assistance_whatsapp_reply_bindings.schema.json",
    typeOutput: "functions/src/shared/generated/eventWhatsappReplyBindingDocument.ts",
  },
{
  "name": "EventAssistanceSmsWithdrawalGrantDocument",
  "source": "firestore/event_assistance_sms_withdrawal_grants.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsWithdrawalGrantDocument.ts"
},
{
  "name": "GetEventAssistanceSmsWithdrawalCallablePayload",
  "source": "callables/get_event_assistance_sms_withdrawal_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/getEventAssistanceSmsWithdrawalCallablePayload.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/getEventAssistanceSmsWithdrawalCallablePayload.ts"
  ]
},
{
  "name": "WithdrawEventAssistanceSmsCallablePayload",
  "source": "callables/withdraw_event_assistance_sms_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/withdrawEventAssistanceSmsCallablePayload.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/withdrawEventAssistanceSmsCallablePayload.ts"
  ]
},
{
  "name": "EventAssistanceSmsWithdrawalCallableResponse",
  "source": "callable_responses/event_assistance_sms_withdrawal_response.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsWithdrawalCallableResponse.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/eventAssistanceSmsWithdrawalCallableResponse.ts"
  ]
},
{
  "name": "EventAssistanceSmsConsentReceiptDocument",
  "source": "firestore/event_assistance_sms_consent_receipts.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsConsentReceiptDocument.ts"
},
{
  "name": "GetEventAssistanceSmsPreferenceCallablePayload",
  "source": "callables/get_event_assistance_sms_preference_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/getEventAssistanceSmsPreferenceCallablePayload.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/getEventAssistanceSmsPreferenceCallablePayload.ts"
  ]
},
{
  "name": "SetEventAssistanceSmsPreferenceCallablePayload",
  "source": "callables/set_event_assistance_sms_preference_payload.schema.json",
  "typeOutput": "functions/src/shared/generated/setEventAssistanceSmsPreferenceCallablePayload.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/setEventAssistanceSmsPreferenceCallablePayload.ts"
  ]
},
{
  "name": "EventAssistanceSmsPreferenceCallableResponse",
  "source": "callable_responses/event_assistance_sms_preference_response.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsPreferenceCallableResponse.ts",
  "additionalTypeOutputs": [
    "website/src/shared/contracts/generated/eventAssistanceSmsPreferenceCallableResponse.ts"
  ]
},
{
  "name": "EventAssistanceSmsSenderDocument",
  "source": "firestore/event_assistance_sms_senders.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsSenderDocument.ts"
},
{
  "name": "EventAssistanceSmsPermissionDocument",
  "source": "firestore/event_assistance_sms_permissions.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsPermissionDocument.ts"
},
{
  "name": "EventAssistanceSmsBudgetDocument",
  "source": "firestore/event_assistance_sms_budgets.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsBudgetDocument.ts"
},
{
  "name": "EventAssistanceSmsDispatchDocument",
  "source": "firestore/event_assistance_sms_dispatches.schema.json",
  "typeOutput": "functions/src/shared/generated/eventAssistanceSmsDispatchDocument.ts"
},
  {
    name: "EventAssistanceRcsConfig",
    source: "operations/event_assistance_rcs_config.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceRcsConfig.ts",
  },
  {
    name: "EventAssistanceSmsConfig",
    source: "operations/event_assistance_sms_config.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceSmsConfig.ts",
  },
  {
    name: "EventMessagingSetupReview",
    source: "operations/event_messaging_setup_review.schema.json",
    typeOutput: "functions/src/shared/generated/eventMessagingSetupReview.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/eventMessagingSetupReview.ts",
    ],
  },
  {
    name: "AdminReviewEventMessagingBudgetCallablePayload",
    source:
      "callables/admin_review_event_messaging_budget_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminReviewEventMessagingBudgetCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminReviewEventMessagingBudgetCallablePayload.ts",
    ],
  },
  {
    name: "AdminReviewEventMessagingBudgetCallableResponse",
    source:
      "callable_responses/" +
      "admin_review_event_messaging_budget_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminReviewEventMessagingBudgetCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminReviewEventMessagingBudgetCallableResponse.ts",
    ],
  },
  {
    name: "AdminDecideEventMessagingBudgetCallablePayload",
    source:
      "callables/admin_decide_event_messaging_budget_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminDecideEventMessagingBudgetCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminDecideEventMessagingBudgetCallablePayload.ts",
    ],
  },
  {
    name: "AdminDecideEventMessagingBudgetCallableResponse",
    source:
      "callable_responses/" +
      "admin_decide_event_messaging_budget_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminDecideEventMessagingBudgetCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminDecideEventMessagingBudgetCallableResponse.ts",
    ],
  },
  {
    name: "EventMessagingBudgetDecisionDocument",
    source: "firestore/event_messaging_budget_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventMessagingBudgetDecisionDocument.ts",
  },
  {
    name: "EventMessagingBudgetDecisionReceiptDocument",
    source:
      "firestore/event_messaging_budget_decision_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventMessagingBudgetDecisionReceiptDocument.ts",
  },
  {
    name: "AdminApplyEventMessagingBudgetCallablePayload",
    source:
      "callables/admin_apply_event_messaging_budget_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminApplyEventMessagingBudgetCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminApplyEventMessagingBudgetCallablePayload.ts",
    ],
  },
  {
    name: "AdminApplyEventMessagingBudgetCallableResponse",
    source:
      "callable_responses/" +
      "admin_apply_event_messaging_budget_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminApplyEventMessagingBudgetCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminApplyEventMessagingBudgetCallableResponse.ts",
    ],
  },
  {
    name: "EventMessagingBudgetApplicationReceiptDocument",
    source:
      "firestore/event_messaging_budget_application_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventMessagingBudgetApplicationReceiptDocument.ts",
  },
  {
    "name": "EventAssistanceGuestDocument",
    "source": "firestore/event_assistance_guests.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceGuestDocument.ts"
  },
  {
    "name": "EventAssistanceThreadDocument",
    "source": "firestore/event_assistance_threads.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceThreadDocument.ts"
  },
  {
    "name": "EventAssistanceGuestGrantDocument",
    "source": "firestore/event_assistance_guest_grants.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceGuestGrantDocument.ts"
  },
  {
    "name": "EventAssistanceCaseDocument",
    "source": "firestore/event_assistance_cases.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceCaseDocument.ts"
  },
  {
    "name": "GetEventAssistanceGuestViewCallablePayload",
    "source": "callables/get_event_assistance_guest_view_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/getEventAssistanceGuestViewCallablePayload.ts",
    "additionalTypeOutputs": [
      "website/src/shared/contracts/generated/getEventAssistanceGuestViewCallablePayload.ts"
    ]
  },
  {
    "name": "SubmitEventAssistanceGuestChoiceCallablePayload",
    "source": "callables/submit_event_assistance_guest_choice_payload.schema.json",
    "typeOutput": "functions/src/shared/generated/submitEventAssistanceGuestChoiceCallablePayload.ts",
    "additionalTypeOutputs": [
      "website/src/shared/contracts/generated/submitEventAssistanceGuestChoiceCallablePayload.ts"
    ]
  },
  {
    "name": "EventAssistanceGuestViewCallableResponse",
    "source": "callable_responses/event_assistance_guest_view_response.schema.json",
    "typeOutput": "functions/src/shared/generated/eventAssistanceGuestViewCallableResponse.ts",
    "additionalTypeOutputs": [
      "website/src/shared/contracts/generated/eventAssistanceGuestViewCallableResponse.ts"
    ]
  },
  {
    "name": "SubmitEventAssistanceGuestChoiceCallableResponse",
    "source": "callable_responses/submit_event_assistance_guest_choice_response.schema.json",
    "typeOutput": "functions/src/shared/generated/submitEventAssistanceGuestChoiceCallableResponse.ts",
    "additionalTypeOutputs": [
      "website/src/shared/contracts/generated/submitEventAssistanceGuestChoiceCallableResponse.ts"
    ]
  },
  {
    name: "EventAssistanceMessageDocument",
    source: "firestore/event_assistance_messages.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceMessageDocument.ts",
  },
  {
    name: "EventAssistanceOperationalNoticeQuotaDocument",
    source: "firestore/event_assistance_operational_notice_quotas.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceOperationalNoticeQuotaDocument.ts",
  },
  {
    name: "EventAssistanceOperationalNoticePublicationDocument",
    source: "firestore/event_assistance_operational_notice_publications.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceOperationalNoticePublicationDocument.ts",
  },
  {
    name: "EventAssistanceMessageIntent",
    source: "operations/event_assistance_message_intent.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceMessageIntent.ts",
  },
  {
    name: "EventAssistanceDeliveryAttempt",
    source: "operations/event_assistance_delivery_attempt.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceDeliveryAttempt.ts",
  },
  {
    name: "EventAssistanceGuestResponse",
    source: "operations/event_assistance_guest_response.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceGuestResponse.ts",
  },
  {
    name: "EventAssistancePolicy",
    source: "operations/event_assistance_policy.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistancePolicy.ts"
  },
  {
    name: "EventAssistanceCommand",
    source: "operations/event_assistance_command.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceCommand.ts"
  },
  {
    name: "EventAssistanceSourceWork",
    source: "operations/event_assistance_source_work.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceSourceWork.ts",
  },
  {
    name: "EventAssistanceCheckpointWork",
    source: "operations/event_assistance_checkpoint_work.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceCheckpointWork.ts",
  },
  {
    name: "EventAssistanceDeliveryWork",
    source: "operations/event_assistance_delivery_work.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceDeliveryWork.ts",
  },
  {
    name: "EventAssistanceRosterWork",
    source: "operations/event_assistance_roster_work.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceRosterWork.ts",
  },
  {
    name: "EventAssistanceOperationalNoticeFanout",
    source: "operations/event_assistance_operational_notice_fanout.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceOperationalNoticeFanout.ts",
  },
  {
    name: "EventAssistanceLiveWork",
    source: "operations/event_assistance_live_work.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceLiveWork.ts",
  },
  {
    name: "EventAssistanceLateJoinInput",
    source: "operations/event_assistance_late_join_input.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceLateJoinInput.ts"
  },
  {
    name: "EventAssistanceLateJoinDecision",
    source: "operations/event_assistance_late_join_decision.schema.json",
    typeOutput: "functions/src/shared/generated/eventAssistanceLateJoinDecision.ts"
  },
  {
    name: "MobileFormState",
    source: "forms/mobile_form_state.schema.json",
    typeOutput: "functions/src/shared/generated/mobileFormState.ts",
  },
  {
    name: "OperationRun",
    source: "operations/run.schema.json",
    typeOutput: "functions/src/shared/generated/operationRunContract.ts",
  },
  {
    name: "OperationWorkItem",
    source: "operations/work_item.schema.json",
    typeOutput: "functions/src/shared/generated/operationWorkItemContract.ts",
  },
  {
    name: "ProfilePromptAnswer",
    source: "embedded/profile_prompt_answer.schema.json",
    typeOutput: "functions/src/shared/generated/profilePromptAnswer.ts",
  },
  {
    name: "PhotoPromptAnswer",
    source: "embedded/photo_prompt_answer.schema.json",
    typeOutput: "functions/src/shared/generated/photoPromptAnswer.ts",
  },
  {
    name: "ProfilePhoto",
    source: "embedded/profile_photo.schema.json",
    typeOutput: "functions/src/shared/generated/profilePhoto.ts",
  },
  {
    name: "UploadedPhoto",
    source: "embedded/uploaded_photo.schema.json",
    typeOutput: "functions/src/shared/generated/uploadedPhoto.ts",
  },
  {
    name: "EventOrigin",
    source: "embedded/event_origin.schema.json",
    typeOutput: "functions/src/shared/generated/eventOrigin.ts",
  },
  {
    name: "EventRuntimeAccess",
    source: "embedded/event_runtime_access.schema.json",
    typeOutput: "functions/src/shared/generated/eventRuntimeAccess.ts",
  },
  {
    name: "ActivityPreferences",
    source: "embedded/activity_preferences.schema.json",
    typeOutput: "functions/src/shared/generated/activityPreferences.ts",
  },
  {
    name: "OrganizerSupplyCapabilities",
    source: "embedded/organizer_supply_capabilities.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerSupplyCapabilities.ts",
  },
  {
    name: "ExternalEventBlockerResolution",
    source: "embedded/external_event_blocker_resolution.schema.json",
    typeOutput:
      "functions/src/shared/generated/externalEventBlockerResolution.ts",
  },
  {
    name: "ExternalEventPublicationReceiptDocument",
    source:
      "firestore/external_event_publication_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/externalEventPublicationReceiptDocument.ts",
  },
  {
    name: "ConfigCitiesDocument",
    source: "firestore/config_cities.schema.json",
    typeOutput: "functions/src/shared/generated/configCitiesDocument.ts",
  },
  {
    name: "OnboardingDraftDocument",
    source: "firestore/onboarding_drafts.schema.json",
    typeOutput: "functions/src/shared/generated/onboardingDraftDocument.ts",
  },
  {
    name: "AccessApplicationDocument",
    source: "firestore/access_applications.schema.json",
    typeOutput:
      "functions/src/shared/generated/accessApplicationDocument.ts",
  },
  {
    name: "UserProfileDocument",
    source: "firestore/users.schema.json",
    typeOutput: "functions/src/shared/generated/userProfileDocument.ts",
  },
  {
    name: "PublicProfileDocument",
    source: "firestore/public_profiles.schema.json",
    typeOutput: "functions/src/shared/generated/publicProfileDocument.ts",
  },
  {
    name: "HostProfileDocument",
    source: "firestore/host_profiles.schema.json",
    typeOutput: "functions/src/shared/generated/hostProfileDocument.ts",
  },
  {
    name: "ClubDocument",
    source: "firestore/clubs.schema.json",
    typeOutput: "functions/src/shared/generated/clubDocument.ts",
  },
  {
    name: "OrganizerDocument",
    source: "firestore/organizers.schema.json",
    typeOutput: "functions/src/shared/generated/organizerDocument.ts",
  },
  {
    name: "OrganizerPostDocument",
    source: "firestore/organizer_posts.schema.json",
    typeOutput: "functions/src/shared/generated/organizerPostDocument.ts",
  },
  {
    name: "OrganizerPostDeliveryOperationDocument",
    source: "firestore/organizer_post_delivery_operations.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerPostDeliveryOperationDocument.ts",
  },
  {
    name: "OrganizerPostDeliveryRecipientDocument",
    source: "firestore/organizer_post_delivery_recipients.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerPostDeliveryRecipientDocument.ts",
  },
  {
    name: "OrganizerTeamMembershipDocument",
    source: "firestore/organizer_team_memberships.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerTeamMembershipDocument.ts",
  },
  {
    name: "OrganizerFollowDocument",
    source: "firestore/organizer_follows.schema.json",
    typeOutput: "functions/src/shared/generated/organizerFollowDocument.ts",
  },
  {
    name: "ParticipantOrganizerCardDocument",
    source: "firestore/participant_organizer_cards.schema.json",
    typeOutput: "functions/src/shared/generated/participantOrganizerCardDocument.ts",
  },
  {
    name: "ParticipantProfileClaimReceiptDocument",
    source: "firestore/participant_profile_claim_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/participantProfileClaimReceiptDocument.ts",
  },
  {
    name: "ClaimParticipantFormProfileCallablePayload",
    source: "callables/claim_participant_form_profile_payload.schema.json",
    typeOutput: "functions/src/shared/generated/claimParticipantFormProfileCallablePayload.ts",
  },
  {
    name: "ClaimParticipantFormProfileCallableResponse",
    source: "callable_responses/claim_participant_form_profile_response.schema.json",
    typeOutput: "functions/src/shared/generated/claimParticipantFormProfileCallableResponse.ts",
  },
  {
    name: "EventApprovalPreferenceDocument",
    source: "firestore/event_approval_notification_preferences.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalPreferenceDocument.ts",
  },
  {
    name: "EventApprovalNotificationReceiptDocument",
    source: "firestore/event_approval_notification_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationReceiptDocument.ts",
  },
  {
    name: "EventApprovalNotificationSettingsDocument",
    source: "firestore/event_approval_notification_settings.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationSettingsDocument.ts",
  },
  {
    name: "EventApprovalNotificationBudgetDocument",
    source: "firestore/event_approval_notification_budgets.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationBudgetDocument.ts",
  },
  {
    name: "EventApprovalNotificationMessageDocument",
    source: "firestore/event_approval_notification_messages.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationMessageDocument.ts",
  },
  {
    name: "EventApprovalNotificationDispatchDocument",
    source: "firestore/event_approval_notification_dispatches.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationDispatchDocument.ts",
  },
  {
    name: "EventApprovalNotificationIntent",
    source: "operations/event_approval_notification_intent.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationIntent.ts",
  },
  {
    name: "EventApprovalNotificationWork",
    source: "operations/event_approval_notification_work.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationWork.ts",
  },
  {
    name: "EventApprovalNotificationAttempt",
    source: "operations/event_approval_notification_attempt.schema.json",
    typeOutput: "functions/src/shared/generated/eventApprovalNotificationAttempt.ts",
  },
  {
    name: "ManageEventApprovalNotificationsCallablePayload",
    source: "callables/manage_event_approval_notifications_payload.schema.json",
    typeOutput: "functions/src/shared/generated/manageEventApprovalNotificationsCallablePayload.ts",
    additionalTypeOutputs: ["website/src/shared/contracts/generated/manageEventApprovalNotificationsCallablePayload.ts"],
  },
  {
    name: "ManageEventApprovalNotificationsCallableResponse",
    source: "callable_responses/manage_event_approval_notifications_response.schema.json",
    typeOutput: "functions/src/shared/generated/manageEventApprovalNotificationsCallableResponse.ts",
    additionalTypeOutputs: ["website/src/shared/contracts/generated/manageEventApprovalNotificationsCallableResponse.ts"],
  },
  {
    name: "GetEventViewerStateCallablePayload",
    source: "callables/get_event_viewer_state_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getEventViewerStateCallablePayload.ts",
    additionalTypeOutputs: ["website/src/shared/contracts/generated/getEventViewerStateCallablePayload.ts"],
  },
  {
    name: "GetEventViewerStateCallableResponse",
    source: "callable_responses/get_event_viewer_state_response.schema.json",
    typeOutput: "functions/src/shared/generated/getEventViewerStateCallableResponse.ts",
    additionalTypeOutputs: ["website/src/shared/contracts/generated/getEventViewerStateCallableResponse.ts"],
  },
  {
    name: "ListParticipantActivityCallablePayload",
    source: "callables/list_participant_activity_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listParticipantActivityCallablePayload.ts",
  },
  {
    name: "ListParticipantActivityCallableResponse",
    source: "callable_responses/list_participant_activity_response.schema.json",
    typeOutput: "functions/src/shared/generated/listParticipantActivityCallableResponse.ts",
  },
  {
    name: "GetParticipantActivityCallablePayload",
    source: "callables/get_participant_activity_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getParticipantActivityCallablePayload.ts",
  },
  {
    name: "GetParticipantActivityCallableResponse",
    source: "callable_responses/get_participant_activity_response.schema.json",
    typeOutput: "functions/src/shared/generated/getParticipantActivityCallableResponse.ts",
  },
  {
    name: "ListParticipantFormProfilesCallablePayload",
    source: "callables/list_participant_form_profiles_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listParticipantFormProfilesCallablePayload.ts",
  },
  {
    name: "ListParticipantFormProfilesCallableResponse",
    source: "callable_responses/list_participant_form_profiles_response.schema.json",
    typeOutput: "functions/src/shared/generated/listParticipantFormProfilesCallableResponse.ts",
  },
  {
    name: "GetParticipantFormPhotoCallablePayload",
    source: "callables/get_participant_form_photo_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getParticipantFormPhotoCallablePayload.ts",
  },
  {
    name: "GetParticipantFormPhotoCallableResponse",
    source: "callable_responses/get_participant_form_photo_response.schema.json",
    typeOutput: "functions/src/shared/generated/getParticipantFormPhotoCallableResponse.ts",
  },
  {
    name: "GetParticipantFormProfileCallablePayload",
    source: "callables/get_participant_form_profile_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getParticipantFormProfileCallablePayload.ts",
  },
  {
    name: "GetParticipantFormProfileCallableResponse",
    source: "callable_responses/get_participant_form_profile_response.schema.json",
    typeOutput: "functions/src/shared/generated/getParticipantFormProfileCallableResponse.ts",
  },
  {
    name: "ParticipantFormProfileProposalDocument",
    source: "firestore/participant_form_profile_proposals.schema.json",
    typeOutput: "functions/src/shared/generated/participantFormProfileProposalDocument.ts",
  },
  {
    name: "EventChatProfileShareDocument",
    source: "firestore/event_chat_profile_shares.schema.json",
    typeOutput: "functions/src/shared/generated/eventChatProfileShareDocument.ts",
  },
  {
    name: "ActOnEventChatMessageCallablePayload",
    source: "callables/act_on_event_chat_message_payload.schema.json",
    typeOutput: "functions/src/shared/generated/actOnEventChatMessageCallablePayload.ts",
  },
  {
    name: "ActOnEventChatMessageCallableResponse",
    source: "callable_responses/act_on_event_chat_message_response.schema.json",
    typeOutput: "functions/src/shared/generated/actOnEventChatMessageCallableResponse.ts",
  },
  {
    name: "ListEventChatParticipantsCallablePayload",
    source: "callables/list_event_chat_participants_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listEventChatParticipantsCallablePayload.ts",
  },
  {
    name: "ListEventChatParticipantsCallableResponse",
    source: "callable_responses/list_event_chat_participants_response.schema.json",
    typeOutput: "functions/src/shared/generated/listEventChatParticipantsCallableResponse.ts",
  },
  {
    name: "GetEventChatProfileSharingCallablePayload",
    source: "callables/get_event_chat_profile_sharing_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getEventChatProfileSharingCallablePayload.ts",
  },
  {
    name: "UpdateEventChatProfileSharingCallablePayload",
    source: "callables/update_event_chat_profile_sharing_payload.schema.json",
    typeOutput: "functions/src/shared/generated/updateEventChatProfileSharingCallablePayload.ts",
  },
  {
    name: "GetEventChatProfileCallablePayload",
    source: "callables/get_event_chat_profile_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getEventChatProfileCallablePayload.ts",
  },
  {
    name: "GetEventChatProfileSharingCallableResponse",
    source: "callable_responses/get_event_chat_profile_sharing_response.schema.json",
    typeOutput: "functions/src/shared/generated/getEventChatProfileSharingCallableResponse.ts",
  },
  {
    name: "UpdateEventChatProfileSharingCallableResponse",
    source: "callable_responses/update_event_chat_profile_sharing_response.schema.json",
    typeOutput: "functions/src/shared/generated/updateEventChatProfileSharingCallableResponse.ts",
  },
  {
    name: "GetEventChatProfileCallableResponse",
    source: "callable_responses/get_event_chat_profile_response.schema.json",
    typeOutput: "functions/src/shared/generated/getEventChatProfileCallableResponse.ts",
  },
  {
    name: "EventChatRoomDocument",
    source: "firestore/event_chat_rooms.schema.json",
    typeOutput: "functions/src/shared/generated/eventChatRoomDocument.ts",
  },
  {
    name: "EventChatMembershipDocument",
    source: "firestore/event_chat_memberships.schema.json",
    typeOutput: "functions/src/shared/generated/eventChatMembershipDocument.ts",
  },
  {
    name: "EventChatAccessReceiptDocument",
    source: "firestore/event_chat_access_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/eventChatAccessReceiptDocument.ts",
  },
  {
    name: "EventChatMessageDocument",
    source: "firestore/event_chat_messages.schema.json",
    typeOutput: "functions/src/shared/generated/eventChatMessageDocument.ts",
  },
  {
    name: "EventChatReactionDocument",
    source: "firestore/event_chat_reactions.schema.json",
    typeOutput: "functions/src/shared/generated/eventChatReactionDocument.ts",
  },
  {
    name: "EventChatPresenceDocument",
    source: "firestore/event_chat_presence.schema.json",
    typeOutput: "functions/src/shared/generated/eventChatPresenceDocument.ts",
  },
  {
    name: "SendEventChatMessageCallablePayload",
    source: "callables/send_event_chat_message_payload.schema.json",
    typeOutput: "functions/src/shared/generated/sendEventChatMessageCallablePayload.ts",
  },
  {
    name: "SendEventChatMessageCallableResponse",
    source: "callable_responses/send_event_chat_message_response.schema.json",
    typeOutput: "functions/src/shared/generated/sendEventChatMessageCallableResponse.ts",
  },
  {
    name: "SetEventChatReactionCallablePayload",
    source: "callables/set_event_chat_reaction_payload.schema.json",
    typeOutput: "functions/src/shared/generated/setEventChatReactionCallablePayload.ts",
  },
  {
    name: "SetEventChatReactionCallableResponse",
    source: "callable_responses/set_event_chat_reaction_response.schema.json",
    typeOutput: "functions/src/shared/generated/setEventChatReactionCallableResponse.ts",
  },
  {
    name: "SetEventChatTypingCallablePayload",
    source: "callables/set_event_chat_typing_payload.schema.json",
    typeOutput: "functions/src/shared/generated/setEventChatTypingCallablePayload.ts",
  },
  {
    name: "SetEventChatTypingCallableResponse",
    source: "callable_responses/set_event_chat_typing_response.schema.json",
    typeOutput: "functions/src/shared/generated/setEventChatTypingCallableResponse.ts",
  },
  {
    name: "ListEventChatsCallablePayload",
    source: "callables/list_event_chats_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listEventChatsCallablePayload.ts",
  },
  {
    name: "ListEventChatsCallableResponse",
    source: "callable_responses/list_event_chats_response.schema.json",
    typeOutput: "functions/src/shared/generated/listEventChatsCallableResponse.ts",
  },
  {
    name: "ListEventChatMessagesCallablePayload",
    source: "callables/list_event_chat_messages_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listEventChatMessagesCallablePayload.ts",
  },
  {
    name: "ListEventChatMessagesCallableResponse",
    source: "callable_responses/list_event_chat_messages_response.schema.json",
    typeOutput: "functions/src/shared/generated/listEventChatMessagesCallableResponse.ts",
  },
  {
    name: "GetEventChatAccessCallablePayload",
    source: "callables/get_event_chat_access_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getEventChatAccessCallablePayload.ts",
  },
  {
    name: "UpdateEventChatAccessCallablePayload",
    source: "callables/update_event_chat_access_payload.schema.json",
    typeOutput: "functions/src/shared/generated/updateEventChatAccessCallablePayload.ts",
  },
  {
    name: "GetEventChatAccessCallableResponse",
    source: "callable_responses/get_event_chat_access_response.schema.json",
    typeOutput: "functions/src/shared/generated/getEventChatAccessCallableResponse.ts",
  },
  {
    name: "UpdateEventChatAccessCallableResponse",
    source: "callable_responses/update_event_chat_access_response.schema.json",
    typeOutput: "functions/src/shared/generated/updateEventChatAccessCallableResponse.ts",
  },
  {
    name: "ManageEventChatMemberCallablePayload",
    source: "callables/manage_event_chat_member_payload.schema.json",
    typeOutput: "functions/src/shared/generated/manageEventChatMemberCallablePayload.ts",
  },
  {
    name: "ManageEventChatMemberCallableResponse",
    source: "callable_responses/manage_event_chat_member_response.schema.json",
    typeOutput: "functions/src/shared/generated/manageEventChatMemberCallableResponse.ts",
  },
  {
    name: "SetEventAssignmentFeatureConsentCallablePayload",
    source: "callables/set_event_assignment_feature_consent_payload.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "setEventAssignmentFeatureConsentCallablePayload.ts",
  },
  {
    name: "SetEventAssignmentFeatureConsentCallableResponse",
    source: "callable_responses/set_event_assignment_feature_consent_response.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "setEventAssignmentFeatureConsentCallableResponse.ts",
  },
  {
    name: "ConfigureEventAssignmentFeaturesCallablePayload",
    source: "callables/configure_event_assignment_features_payload.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "configureEventAssignmentFeaturesCallablePayload.ts",
  },
  {
    name: "ConfigureEventAssignmentFeaturesCallableResponse",
    source: "callable_responses/configure_event_assignment_features_response.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "configureEventAssignmentFeaturesCallableResponse.ts",
  },
  {
    name: "PreviewEventAssignmentFeaturesCallablePayload",
    source: "callables/preview_event_assignment_features_payload.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "previewEventAssignmentFeaturesCallablePayload.ts",
  },
  {
    name: "PreviewEventAssignmentFeaturesCallableResponse",
    source: "callable_responses/preview_event_assignment_features_response.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "previewEventAssignmentFeaturesCallableResponse.ts",
  },
  {
    name: "ListEventAssignmentFeatureChoicesCallablePayload",
    source: "callables/list_event_assignment_feature_choices_payload.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "listEventAssignmentFeatureChoicesCallablePayload.ts",
  },
  {
    name: "ListEventAssignmentFeatureChoicesCallableResponse",
    source: "callable_responses/list_event_assignment_feature_choices_response.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "listEventAssignmentFeatureChoicesCallableResponse.ts",
  },
  {
    name: "ListParticipantMessagingPreferencesCallablePayload",
    source: "callables/list_participant_messaging_preferences_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listParticipantMessagingPreferencesCallablePayload.ts",
  },
  {
    name: "ListParticipantMessagingPreferencesCallableResponse",
    source: "callable_responses/list_participant_messaging_preferences_response.schema.json",
    typeOutput: "functions/src/shared/generated/listParticipantMessagingPreferencesCallableResponse.ts",
  },
  {
    name: "WithdrawParticipantMessagingPermissionCallablePayload",
    source: "callables/withdraw_participant_messaging_permission_payload.schema.json",
    typeOutput: "functions/src/shared/generated/withdrawParticipantMessagingPermissionCallablePayload.ts",
  },
  {
    name: "WithdrawParticipantMessagingPermissionCallableResponse",
    source: "callable_responses/withdraw_participant_messaging_permission_response.schema.json",
    typeOutput: "functions/src/shared/generated/withdrawParticipantMessagingPermissionCallableResponse.ts",
  },
  {
    name: "PromoteFormCommunicationIntentCallablePayload",
    source: "callables/promote_form_communication_intent_payload.schema.json",
    typeOutput: "functions/src/shared/generated/promoteFormCommunicationIntentCallablePayload.ts",
  },
  {
    name: "PromoteFormCommunicationIntentCallableResponse",
    source: "callable_responses/promote_form_communication_intent_response.schema.json",
    typeOutput: "functions/src/shared/generated/promoteFormCommunicationIntentCallableResponse.ts",
  },
  {
    name: "FormCommunicationConsentIntentDocument",
    source: "firestore/form_communication_consent_intents.schema.json",
    typeOutput: "functions/src/shared/generated/formCommunicationConsentIntentDocument.ts",
  },
  {
    name: "CatchCommunicationPreferenceDocument",
    source: "firestore/catch_communication_preferences.schema.json",
    typeOutput: "functions/src/shared/generated/catchCommunicationPreferenceDocument.ts",
  },
  {
    name: "CatchCommunicationPermissionReceiptDocument",
    source: "firestore/catch_communication_permission_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/catchCommunicationPermissionReceiptDocument.ts",
  },
  {
    name: "OrganizerCommunicationPreferenceDocument",
    source: "firestore/organizer_communication_preferences.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerCommunicationPreferenceDocument.ts",
  },
  {
    name: "OrganizerCommunicationPermissionReceiptDocument",
    source:
      "firestore/organizer_communication_permission_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerCommunicationPermissionReceiptDocument.ts",
  },
  {
    name: "OrganizerContactDocument",
    source: "firestore/organizer_contacts.schema.json",
    typeOutput: "functions/src/shared/generated/organizerContactDocument.ts",
  },
  {
    name: "OrganizerContactOriginDocument",
    source: "firestore/organizer_contact_origins.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactOriginDocument.ts",
  },
  {
    name: "OrganizerContactNoteDocument",
    source: "firestore/organizer_contact_notes.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactNoteDocument.ts",
  },
  {
    name: "OrganizerContactOutreachDocument",
    source: "firestore/organizer_contact_outreach.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactOutreachDocument.ts",
  },
  {
    name: "OrganizerContactTagVocabularyDocument",
    source: "firestore/organizer_contact_tag_vocabularies.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerContactTagVocabularyDocument.ts",
  },
  {
    name: "OrganizerSavedAudienceDocument",
    source: "firestore/organizer_saved_audiences.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerSavedAudienceDocument.ts",
  },
  {
    name: "OrganizerManualSendTaskDocument",
    source: "firestore/organizer_manual_send_tasks.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerManualSendTaskDocument.ts",
  },
  {
    name: "OrganizerAttentionItemDocument",
    source: "firestore/organizer_attention_items.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerAttentionItemDocument.ts",
  },
  {
    name: "OrganizerEntitlementsDocument",
    source: "firestore/organizer_entitlements.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerEntitlementsDocument.ts",
  },
  {
    name: "OrganizerEntitlementReceiptDocument",
    source: "firestore/organizer_entitlement_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerEntitlementReceiptDocument.ts",
  },
  {
    name: "OrganizerContactIdentityLinkDocument",
    source: "firestore/organizer_contact_identity_links.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactIdentityLinkDocument.ts",
  },
  {
    name: "OrganizerContactIdentityClaimDocument",
    source: "firestore/organizer_contact_identity_claims.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactIdentityClaimDocument.ts",
  },
  {
    name: "OrganizerContactEventEdgeDocument",
    source: "firestore/organizer_contact_event_edges.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactEventEdgeDocument.ts",
  },
  {
    name: "OrganizerContactTraitDocument",
    source: "firestore/organizer_contact_traits.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactTraitDocument.ts",
  },
  {
    name: "OrganizerAudienceSummaryDocument",
    source: "firestore/organizer_audience_summaries.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerAudienceSummaryDocument.ts",
  },
  {
    name: "OrganizerAudienceProjectionReceiptDocument",
    source: "firestore/organizer_audience_projection_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerAudienceProjectionReceiptDocument.ts",
  },
  {
    name: "OrganizerContactMergeReceiptDocument",
    source: "firestore/organizer_contact_merge_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactMergeReceiptDocument.ts",
  },
  {
    name: "OrganizerContactMergeReviewDecisionDocument",
    source:
      "firestore/organizer_contact_merge_review_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerContactMergeReviewDecisionDocument.ts",
  },
  {
    name: "OrganizerSenderConnectionDocument",
    source: "firestore/organizer_sender_connections.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerSenderConnectionDocument.ts",
  },
  {
    name: "OrganizerProviderConnectionDocument",
    source: "firestore/organizer_provider_connections.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerProviderConnectionDocument.ts",
  },
  {
    name: "OrganizerApplicationFormDocument",
    source: "firestore/organizer_application_forms.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerApplicationFormDocument.ts",
  },
  {
    name: "OrganizerApplicationFormVersionDocument",
    source: "firestore/organizer_application_form_versions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerApplicationFormVersionDocument.ts",
  },
  {
    name: "OrganizerFormDocument",
    source: "firestore/organizer_forms.schema.json",
    typeOutput: "functions/src/shared/generated/organizerFormDocument.ts",
  },
  {
    name: "OrganizerFormDomainDocument",
    source: "firestore/organizer_form_domains.schema.json",
    typeOutput: "functions/src/shared/generated/organizerFormDomainDocument.ts",
  },
  {
    name: "OrganizerPaymentConnectionDocument",
    source: "firestore/organizer_payment_connections.schema.json",
    typeOutput: "functions/src/shared/generated/organizerPaymentConnectionDocument.ts",
  },
  {
    name: "OrganizerPaymentOauthStateDocument",
    source: "firestore/organizer_payment_oauth_states.schema.json",
    typeOutput: "functions/src/shared/generated/organizerPaymentOauthStateDocument.ts",
  },
  {
    name: "PaymentRoutingPolicyDocument",
    source: "firestore/payment_routing_policies.schema.json",
    typeOutput: "functions/src/shared/generated/paymentRoutingPolicyDocument.ts",
  },
  {
    name: "OrganizerFormPaymentDocument",
    source: "firestore/organizer_form_payments.schema.json",
    typeOutput: "functions/src/shared/generated/organizerFormPaymentDocument.ts",
  },
  {
    name: "OrganizerFormPaymentWebhookDocument",
    source: "firestore/organizer_form_payment_webhooks.schema.json",
    typeOutput: "functions/src/shared/generated/organizerFormPaymentWebhookDocument.ts",
  },
  {
    name: "OrganizerFormDraftDocument",
    source: "firestore/organizer_form_drafts.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormDraftDocument.ts",
  },
  {
    name: "OrganizerFormVersionDocument",
    source: "firestore/organizer_form_versions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormVersionDocument.ts",
  },
  {
    name: "OrganizerFormResponseDraftDocument",
    source: "firestore/organizer_form_response_drafts.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormResponseDraftDocument.ts",
  },
  {
    name: "OrganizerFormResponseDocument",
    source: "firestore/organizer_form_responses.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormResponseDocument.ts",
  },
  {
    name: "OrganizerFormAssetDocument",
    source: "firestore/organizer_form_assets.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormAssetDocument.ts",
  },
  {
    name: "OrganizerFormAggregateDocument",
    source: "firestore/organizer_form_aggregates.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormAggregateDocument.ts",
  },
  {
    name: "OrganizerFormAggregateEventDocument",
    source: "firestore/organizer_form_aggregate_events.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormAggregateEventDocument.ts",
  },
  {
    name: "OrganizerFormExportDocument",
    source: "firestore/organizer_form_exports.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormExportDocument.ts",
  },
  {
    name: "OrganizerFormAutomationRuleDocument",
    source: "firestore/organizer_form_automation_rules.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormAutomationRuleDocument.ts",
  },
  {
    name: "OrganizerFormAutomationRunDocument",
    source: "firestore/organizer_form_automation_runs.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormAutomationRunDocument.ts",
  },
  {
    name: "OrganizerFormConversionReceiptDocument",
    source: "firestore/organizer_form_conversion_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormConversionReceiptDocument.ts",
  },
  {
    name: "OrganizerFormShareLinkDocument",
    source: "firestore/organizer_form_share_links.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFormShareLinkDocument.ts",
  },
  {
    name: "OrganizerApplicationDocument",
    source: "firestore/organizer_applications.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerApplicationDocument.ts",
  },
  {
    name: "OrganizerApplicationResponseDocument",
    source: "firestore/organizer_application_responses.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerApplicationResponseDocument.ts",
  },
  {
    name: "OrganizerApplicationAssetDocument",
    source: "firestore/organizer_application_assets.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerApplicationAssetDocument.ts",
  },
  {
    name: "OrganizerApplicationSourceMappingDocument",
    source: "firestore/organizer_application_source_mappings.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerApplicationSourceMappingDocument.ts",
  },
  {
    name: "OrganizerApplicationImportReceiptDocument",
    source: "firestore/organizer_application_import_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerApplicationImportReceiptDocument.ts",
  },
  {
    name: "ParticipantIntakeProfileDocument",
    source: "firestore/participant_intake_profiles.schema.json",
    typeOutput:
      "functions/src/shared/generated/participantIntakeProfileDocument.ts",
  },
  {
    name: "ParticipantOrganizerDataGrantDocument",
    source: "firestore/participant_organizer_data_grants.schema.json",
    typeOutput:
      "functions/src/shared/generated/participantOrganizerDataGrantDocument.ts",
  },
  {
    name: "ExternalEventMappingDocument",
    source: "firestore/external_event_mappings.schema.json",
    typeOutput:
      "functions/src/shared/generated/externalEventMappingDocument.ts",
  },
  {
    name: "ProviderSyncRunDocument",
    source: "firestore/provider_sync_runs.schema.json",
    typeOutput:
      "functions/src/shared/generated/providerSyncRunDocument.ts",
  },
  {
    name: "OrganizerMessageTemplateDocument",
    source: "firestore/organizer_message_templates.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerMessageTemplateDocument.ts",
  },
  {
    name: "OrganizerContactChannelStateDocument",
    source: "firestore/organizer_contact_channel_states.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerContactChannelStateDocument.ts",
  },
  {
    name: "OrganizerCampaignDocument",
    source: "firestore/organizer_campaigns.schema.json",
    typeOutput: "functions/src/shared/generated/organizerCampaignDocument.ts",
  },
  {
    name: "OrganizerBroadcastSummaryDocument",
    source: "firestore/organizer_broadcast_summaries.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerBroadcastSummaryDocument.ts",
  },
  {
    name: "OrganizerCampaignRecipientDocument",
    source: "firestore/organizer_campaign_recipients.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerCampaignRecipientDocument.ts",
  },
  {
    name: "OrganizerCampaignWebhookReceiptDocument",
    source: "firestore/organizer_campaign_webhook_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerCampaignWebhookReceiptDocument.ts",
  },
  {
    name: "OrganizerMessagingWebhookEventDocument",
    source: "firestore/organizer_messaging_webhook_events.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerMessagingWebhookEventDocument.ts",
  },
  {
    name: "OrganizerWhatsappThreadDocument",
    source: "firestore/organizer_whatsapp_threads.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerWhatsappThreadDocument.ts",
  },
  {
    name: "OrganizerWhatsappMessageDocument",
    source: "firestore/organizer_whatsapp_messages.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerWhatsappMessageDocument.ts",
  },
  {
    name: "OrganizerWhatsappReplyOperationDocument",
    source: "firestore/organizer_whatsapp_reply_operations.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerWhatsappReplyOperationDocument.ts",
  },
  {
    name: "OrganizerClaimRequestDocument",
    source: "firestore/organizer_claim_requests.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerClaimRequestDocument.ts",
  },
  {
    name: "OrganizerScheduleLockDocument",
    source: "firestore/organizer_schedule_locks.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerScheduleLockDocument.ts",
  },
  {
    name: "ClubPostDocument",
    source: "firestore/club_posts.schema.json",
    typeOutput: "functions/src/shared/generated/clubPostDocument.ts",
  },
  {
    name: "ClubMembershipDocument",
    source: "firestore/club_memberships.schema.json",
    typeOutput: "functions/src/shared/generated/clubMembershipDocument.ts",
  },
  {
    name: "ClubHostClaimDocument",
    source: "firestore/club_host_claims.schema.json",
    typeOutput: "functions/src/shared/generated/clubHostClaimDocument.ts",
  },
  {
    name: "ClubClaimRequestDocument",
    source: "firestore/club_claim_requests.schema.json",
    typeOutput: "functions/src/shared/generated/clubClaimRequestDocument.ts",
  },
  {
    name: "EventDocument",
    source: "firestore/events.schema.json",
    typeOutput: "functions/src/shared/generated/eventDocument.ts",
  },
  {
    name: "EventPlanChangeDocument",
    source: "firestore/event_plan_changes.schema.json",
    typeOutput: "functions/src/shared/generated/eventPlanChangeDocument.ts",
  },
  {
    name: "ExternalEventDocument",
    source: "firestore/external_events.schema.json",
    typeOutput: "functions/src/shared/generated/externalEventDocument.ts",
  },
  {
    name: "EventPrivateAccessDocument",
    source: "firestore/event_private_access.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventPrivateAccessDocument.ts",
  },
  {
    name: "EventInviteLinkDocument",
    source: "firestore/event_invite_links.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventInviteLinkDocument.ts",
  },
  {
    name: "EventInviteLinkSecretDocument",
    source: "firestore/event_invite_link_secrets.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventInviteLinkSecretDocument.ts",
  },
  {
    name: "EventInviteTouchDocument",
    source: "firestore/event_invite_touches.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventInviteTouchDocument.ts",
  },
  {
    name: "EventShareIntentDocument",
    source: "firestore/event_share_intents.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventShareIntentDocument.ts",
  },
  {
    name: "EventInviteAttributionDocument",
    source: "firestore/event_invite_attributions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventInviteAttributionDocument.ts",
  },
  {
    name: "EventParticipationDocument",
    source: "firestore/event_participations.schema.json",
    typeOutput: "functions/src/shared/generated/eventParticipationDocument.ts",
  },
  {
    name: "EventAttendeeDocument",
    source: "firestore/event_attendees.schema.json",
    typeOutput: "functions/src/shared/generated/eventAttendeeDocument.ts",
  },
  {
    name: "EventStaffGrantDocument",
    source: "firestore/event_staff_grants.schema.json",
    typeOutput: "functions/src/shared/generated/eventStaffGrantDocument.ts",
  },
  {
    name: "OrganizerProgramDocument",
    source: "firestore/organizer_programs.schema.json",
    typeOutput: "functions/src/shared/generated/organizerProgramDocument.ts",
  },
  {
    name: "ProgramFunctionDocument",
    source: "firestore/program_functions.schema.json",
    typeOutput: "functions/src/shared/generated/programFunctionDocument.ts",
  },
  {
    name: "ProgramFunctionGuestDocument",
    source: "firestore/program_function_guests.schema.json",
    typeOutput:
      "functions/src/shared/generated/programFunctionGuestDocument.ts",
  },
  {
    name: "ProgramDoorJournalDocument",
    source: "firestore/program_door_journal.schema.json",
    typeOutput:
      "functions/src/shared/generated/programDoorJournalDocument.ts",
  },
  {
    name: "ProgramGuestDocument",
    source: "firestore/program_guests.schema.json",
    typeOutput: "functions/src/shared/generated/programGuestDocument.ts",
  },
  {
    name: "ProgramGuestGroupDocument",
    source: "firestore/program_guest_groups.schema.json",
    typeOutput:
      "functions/src/shared/generated/programGuestGroupDocument.ts",
  },
  {
    name: "ProgramHouseholdDocument",
    source: "firestore/program_households.schema.json",
    typeOutput: "functions/src/shared/generated/programHouseholdDocument.ts",
  },
  {
    name: "ProgramStaffGrantDocument",
    source: "firestore/program_staff_grants.schema.json",
    typeOutput: "functions/src/shared/generated/programStaffGrantDocument.ts",
  },
  {
    name: "ProgramStaffInviteDocument",
    source: "firestore/program_staff_invites.schema.json",
    typeOutput: "functions/src/shared/generated/programStaffInviteDocument.ts",
  },
  {
    name: "ProgramPickupPointDocument",
    source: "firestore/program_pickup_points.schema.json",
    typeOutput: "functions/src/shared/generated/programPickupPointDocument.ts",
  },
  {
    name: "ProgramHotelDocument",
    source: "firestore/program_hotels.schema.json",
    typeOutput: "functions/src/shared/generated/programHotelDocument.ts",
  },
  {
    name: "ProgramStayDocument",
    source: "firestore/program_stays.schema.json",
    typeOutput: "functions/src/shared/generated/programStayDocument.ts",
  },
  {
    name: "ProgramRoomBlockDocument",
    source: "firestore/program_room_blocks.schema.json",
    typeOutput:
      "functions/src/shared/generated/programRoomBlockDocument.ts",
  },
  {
    name: "ProgramTravelLegDocument",
    source: "firestore/program_travel_legs.schema.json",
    typeOutput: "functions/src/shared/generated/programTravelLegDocument.ts",
  },
  {
    name: "ProgramTravelPartyDocument",
    source: "firestore/program_travel_parties.schema.json",
    typeOutput: "functions/src/shared/generated/programTravelPartyDocument.ts",
  },
  {
    name: "ProgramRetentionRunDocument",
    source: "firestore/program_retention_runs.schema.json",
    typeOutput:
      "functions/src/shared/generated/programRetentionRunDocument.ts",
  },
  {
    name: "ProgramDeliveryMessageDocument",
    source: "firestore/program_delivery_messages.schema.json",
    typeOutput:
      "functions/src/shared/generated/programDeliveryMessageDocument.ts",
  },
  {
    name: "ProgramWhatsappDispatchDocument",
    source: "firestore/program_whatsapp_dispatches.schema.json",
    typeOutput:
      "functions/src/shared/generated/programWhatsappDispatchDocument.ts",
  },
  {
    name: "ProgramDeliveryMessageIntent",
    source: "operations/program_delivery_message_intent.schema.json",
    typeOutput:
      "functions/src/shared/generated/programDeliveryMessageIntent.ts",
  },
  {
    name: "ProgramDeliveryAttempt",
    source: "operations/program_delivery_attempt.schema.json",
    typeOutput: "functions/src/shared/generated/programDeliveryAttempt.ts",
  },
  {
    name: "CampaignDeliveryMessageDocument",
    source: "firestore/campaign_delivery_messages.schema.json",
    typeOutput:
      "functions/src/shared/generated/campaignDeliveryMessageDocument.ts",
  },
  {
    name: "CampaignWhatsappDispatchDocument",
    source: "firestore/campaign_whatsapp_dispatches.schema.json",
    typeOutput:
      "functions/src/shared/generated/campaignWhatsappDispatchDocument.ts",
  },
  {
    name: "CampaignDeliveryMessageIntent",
    source: "operations/campaign_delivery_message_intent.schema.json",
    typeOutput:
      "functions/src/shared/generated/campaignDeliveryMessageIntent.ts",
  },
  {
    name: "CampaignDeliveryAttempt",
    source: "operations/campaign_delivery_attempt.schema.json",
    typeOutput: "functions/src/shared/generated/campaignDeliveryAttempt.ts",
  },
  {
    name: "AutomationDeliveryMessageDocument",
    source: "firestore/automation_delivery_messages.schema.json",
    typeOutput:
      "functions/src/shared/generated/automationDeliveryMessageDocument.ts",
  },
  {
    name: "AutomationWhatsappDispatchDocument",
    source: "firestore/automation_whatsapp_dispatches.schema.json",
    typeOutput:
      "functions/src/shared/generated/automationWhatsappDispatchDocument.ts",
  },
  {
    name: "AutomationDeliveryMessageIntent",
    source: "operations/automation_delivery_message_intent.schema.json",
    typeOutput:
      "functions/src/shared/generated/automationDeliveryMessageIntent.ts",
  },
  {
    name: "AutomationDeliveryAttempt",
    source: "operations/automation_delivery_attempt.schema.json",
    typeOutput:
      "functions/src/shared/generated/automationDeliveryAttempt.ts",
  },
  {
    name: "OrganizerMomentDocument",
    source: "firestore/organizer_moments.schema.json",
    typeOutput: "functions/src/shared/generated/organizerMomentDocument.ts",
  },
  {
    name: "OrganizerMomentRunDocument",
    source: "firestore/organizer_moment_runs.schema.json",
    typeOutput: "functions/src/shared/generated/organizerMomentRunDocument.ts",
  },
  {
    name: "OrganizerMomentSendDocument",
    source: "firestore/organizer_moment_sends.schema.json",
    typeOutput: "functions/src/shared/generated/organizerMomentSendDocument.ts",
  },
  {
    name: "OrganizerMomentSweepStateDocument",
    source: "firestore/organizer_moment_sweep_state.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerMomentSweepStateDocument.ts",
  },
  {
    name: "UpsertOrganizerMomentCallablePayload",
    source: "callables/upsert_organizer_moment_payload.schema.json",
    typeOutput: "functions/src/shared/generated/upsertOrganizerMomentCallablePayload.ts",
  },
  {
    name: "OrganizerMomentActionCallablePayload",
    source: "callables/organizer_moment_action_payload.schema.json",
    typeOutput: "functions/src/shared/generated/organizerMomentActionCallablePayload.ts",
  },
  {
    name: "RunOrganizerMomentCallablePayload",
    source: "callables/run_organizer_moment_payload.schema.json",
    typeOutput: "functions/src/shared/generated/runOrganizerMomentCallablePayload.ts",
  },
  {
    name: "ListOrganizerMomentsCallablePayload",
    source: "callables/list_organizer_moments_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listOrganizerMomentsCallablePayload.ts",
  },
  {
    name: "OrganizerMomentCallableResponse",
    source: "callable_responses/organizer_moment_response.schema.json",
    typeOutput: "functions/src/shared/generated/organizerMomentCallableResponse.ts",
  },
  {
    name: "ListOrganizerMomentsCallableResponse",
    source: "callable_responses/list_organizer_moments_response.schema.json",
    typeOutput: "functions/src/shared/generated/listOrganizerMomentsCallableResponse.ts",
  },
  {
    name: "RunOrganizerMomentCallableResponse",
    source: "callable_responses/run_organizer_moment_response.schema.json",
    typeOutput: "functions/src/shared/generated/runOrganizerMomentCallableResponse.ts",
  },
  {
    name: "TransportVendorDocument",
    source: "firestore/transport_vendors.schema.json",
    typeOutput: "functions/src/shared/generated/transportVendorDocument.ts",
  },
  {
    name: "TransportTripDocument",
    source: "firestore/transport_trips.schema.json",
    typeOutput: "functions/src/shared/generated/transportTripDocument.ts",
  },
  {
    name: "TransportActiveAssignmentDocument",
    source: "firestore/transport_active_assignments.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "transportActiveAssignmentDocument.ts",
  },
  {
    name: "TransportVehicleAssignmentDocument",
    source: "firestore/transport_vehicle_assignments.schema.json",
    typeOutput:
      "functions/src/shared/generated/transportVehicleAssignmentDocument.ts",
  },
  {
    name: "TransportOperationReceiptDocument",
    source: "firestore/transport_operation_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "transportOperationReceiptDocument.ts",
  },
  {
    name: "ProgramIdCallablePayload",
    source: "callables/program_id_payload.schema.json",
    typeOutput: "functions/src/shared/generated/programIdCallablePayload.ts",
  },
  {
    name: "ListOrganizerProgramsCallablePayload",
    source: "callables/list_organizer_programs_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerProgramsCallablePayload.ts",
  },
  {
    name: "ListMyHostAssignmentsCallablePayload",
    source: "callables/list_my_host_assignments_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listMyHostAssignmentsCallablePayload.ts",
  },
  {
    name: "CreateOrganizerProgramCallablePayload",
    source: "callables/create_organizer_program_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createOrganizerProgramCallablePayload.ts",
  },
  {
    name: "UpdateOrganizerProgramCallablePayload",
    source: "callables/update_organizer_program_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "updateOrganizerProgramCallablePayload.ts",
  },
  {
    name: "ArchiveProgramCallablePayload",
    source: "callables/archive_program_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/archiveProgramCallablePayload.ts",
  },
  {
    name: "UnarchiveProgramCallablePayload",
    source: "callables/unarchive_program_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/unarchiveProgramCallablePayload.ts",
  },
  {
    name: "GrantProgramStaffCallablePayload",
    source: "callables/grant_program_staff_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/grantProgramStaffCallablePayload.ts",
  },
  {
    name: "RevokeProgramStaffCallablePayload",
    source: "callables/revoke_program_staff_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/revokeProgramStaffCallablePayload.ts",
  },
  {
    name: "InviteProgramStaffCallablePayload",
    source: "callables/invite_program_staff_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/inviteProgramStaffCallablePayload.ts",
  },
  {
    name: "ClaimProgramStaffInviteCallablePayload",
    source: "callables/claim_program_staff_invite_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "claimProgramStaffInviteCallablePayload.ts",
  },
  {
    name: "RevokeProgramStaffInviteCallablePayload",
    source: "callables/revoke_program_staff_invite_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "revokeProgramStaffInviteCallablePayload.ts",
  },
  {
    name: "UpsertProgramGuestCallablePayload",
    source: "callables/upsert_program_guest_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/upsertProgramGuestCallablePayload.ts",
  },
  {
    name: "UpsertProgramGuestGroupCallablePayload",
    source: "callables/upsert_program_guest_group_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramGuestGroupCallablePayload.ts",
  },
  {
    name: "DeleteProgramGuestGroupCallablePayload",
    source: "callables/delete_program_guest_group_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "deleteProgramGuestGroupCallablePayload.ts",
  },
  {
    name: "ApplyProgramFunctionInvitationsCallablePayload",
    source:
      "callables/apply_program_function_invitations_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "applyProgramFunctionInvitationsCallablePayload.ts",
  },
  {
    name: "RecordProgramFunctionRsvpCallablePayload",
    source: "callables/record_program_function_rsvp_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordProgramFunctionRsvpCallablePayload.ts",
  },
  {
    name: "IssueProgramHouseholdRsvpLinkCallablePayload",
    source:
      "callables/issue_program_household_rsvp_link_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "issueProgramHouseholdRsvpLinkCallablePayload.ts",
  },
  {
    name: "GetProgramHouseholdRsvpViewCallablePayload",
    source:
      "callables/get_program_household_rsvp_view_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getProgramHouseholdRsvpViewCallablePayload.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/" +
        "getProgramHouseholdRsvpViewCallablePayload.ts",
    ],
  },
  {
    name: "SubmitProgramHouseholdRsvpCallablePayload",
    source: "callables/submit_program_household_rsvp_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitProgramHouseholdRsvpCallablePayload.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/" +
        "submitProgramHouseholdRsvpCallablePayload.ts",
    ],
  },
  {
    name: "ListProgramStaffCallablePayload",
    source: "callables/list_program_staff_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listProgramStaffCallablePayload.ts",
  },
  {
    name: "ListProgramTripsCallablePayload",
    source: "callables/list_program_trips_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listProgramTripsCallablePayload.ts",
  },
  {
    name: "ListProgramGuestsCallablePayload",
    source: "callables/list_program_guests_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listProgramGuestsCallablePayload.ts",
  },
  {
    name: "UpsertProgramHouseholdCallablePayload",
    source: "callables/upsert_program_household_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramHouseholdCallablePayload.ts",
  },
  {
    name: "RecordProgramDoorJournalCallablePayload",
    source: "callables/record_program_door_journal_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordProgramDoorJournalCallablePayload.ts",
  },
  {
    name: "ProgramFunctionScopeCallablePayload",
    source: "callables/program_function_scope_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programFunctionScopeCallablePayload.ts",
  },
  {
    name: "CreateProgramWalkInCallablePayload",
    source: "callables/create_program_walk_in_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createProgramWalkInCallablePayload.ts",
  },
  {
    name: "UpsertProgramFunctionCallablePayload",
    source: "callables/upsert_program_function_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramFunctionCallablePayload.ts",
  },
  {
    name: "UpsertProgramPickupPointCallablePayload",
    source: "callables/upsert_program_pickup_point_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramPickupPointCallablePayload.ts",
  },
  {
    name: "UpsertProgramHotelCallablePayload",
    source: "callables/upsert_program_hotel_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/upsertProgramHotelCallablePayload.ts",
  },
  {
    name: "UpsertTransportVendorCallablePayload",
    source: "callables/upsert_transport_vendor_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertTransportVendorCallablePayload.ts",
  },
  {
    name: "UpsertProgramTravelLegCallablePayload",
    source: "callables/upsert_program_travel_leg_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramTravelLegCallablePayload.ts",
  },
  {
    name: "UpsertProgramTravelPartyCallablePayload",
    source: "callables/upsert_program_travel_party_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramTravelPartyCallablePayload.ts",
  },
  {
    name: "SetProgramTravelReadinessCallablePayload",
    source: "callables/set_program_travel_readiness_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setProgramTravelReadinessCallablePayload.ts",
  },
  {
    name: "DispatchProgramTripCallablePayload",
    source: "callables/dispatch_program_trip_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "dispatchProgramTripCallablePayload.ts",
  },
  {
    name: "ProgramTripActionCallablePayload",
    source: "callables/program_trip_action_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/programTripActionCallablePayload.ts",
  },
  {
    name: "ImportProgramManifestCallablePayload",
    source: "callables/import_program_manifest_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "importProgramManifestCallablePayload.ts",
  },
  {
    name: "RefreshProgramTravelLegCallablePayload",
    source: "callables/refresh_program_travel_leg_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "refreshProgramTravelLegCallablePayload.ts",
  },
  {
    name: "ProgramStationScopeCallablePayload",
    source: "callables/program_station_scope_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programStationScopeCallablePayload.ts",
  },
  {
    name: "GetProgramHotelInboundCallablePayload",
    source: "callables/get_program_hotel_inbound_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getProgramHotelInboundCallablePayload.ts",
  },
  {
    name: "GetProgramHotelRoomsCallablePayload",
    source: "callables/get_program_hotel_rooms_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getProgramHotelRoomsCallablePayload.ts",
  },
  {
    name: "UpsertProgramStayCallablePayload",
    source: "callables/upsert_program_stay_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramStayCallablePayload.ts",
  },
  {
    name: "UpsertProgramRoomBlockCallablePayload",
    source: "callables/upsert_program_room_block_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertProgramRoomBlockCallablePayload.ts",
  },
  {
    name: "ListTransportVendorsCallablePayload",
    source: "callables/list_transport_vendors_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listTransportVendorsCallablePayload.ts",
  },
  {
    name: "ProgramMutationCallableResponse",
    source: "callable_responses/program_mutation_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/programMutationCallableResponse.ts",
  },
  {
    name: "ProgramFunctionInvitationsCallableResponse",
    source:
      "callable_responses/" +
      "program_function_invitations_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programFunctionInvitationsCallableResponse.ts",
  },
  {
    name: "RecordProgramFunctionRsvpCallableResponse",
    source:
      "callable_responses/" +
      "record_program_function_rsvp_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordProgramFunctionRsvpCallableResponse.ts",
  },
  {
    name: "ProgramHouseholdRsvpLinkCallableResponse",
    source:
      "callable_responses/" +
      "program_household_rsvp_link_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programHouseholdRsvpLinkCallableResponse.ts",
  },
  {
    name: "ProgramHouseholdRsvpViewCallableResponse",
    source:
      "callable_responses/" +
      "program_household_rsvp_view_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programHouseholdRsvpViewCallableResponse.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/" +
        "programHouseholdRsvpViewCallableResponse.ts",
    ],
  },
  {
    name: "SubmitProgramHouseholdRsvpCallableResponse",
    source:
      "callable_responses/" +
      "submit_program_household_rsvp_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitProgramHouseholdRsvpCallableResponse.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/" +
        "submitProgramHouseholdRsvpCallableResponse.ts",
    ],
  },
  {
    name: "OrganizerProgramListCallableResponse",
    source: "callable_responses/organizer_program_list_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerProgramListCallableResponse.ts",
  },
  {
    name: "ProgramAccessCallableResponse",
    source: "callable_responses/program_access_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/programAccessCallableResponse.ts",
  },
  {
    name: "ListMyHostAssignmentsCallableResponse",
    source:
      "callable_responses/" +
      "list_my_host_assignments_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listMyHostAssignmentsCallableResponse.ts",
  },
  {
    name: "OrganizerProgramCallableResponse",
    source: "callable_responses/organizer_program_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerProgramCallableResponse.ts",
  },
  {
    name: "ArchiveProgramCallableResponse",
    source: "callable_responses/archive_program_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/archiveProgramCallableResponse.ts",
  },
  {
    name: "UnarchiveProgramCallableResponse",
    source: "callable_responses/unarchive_program_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/unarchiveProgramCallableResponse.ts",
  },
  {
    name: "ProgramInviteClaimCallableResponse",
    source: "callable_responses/program_invite_claim_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programInviteClaimCallableResponse.ts",
  },
  {
    name: "ProgramStaffListCallableResponse",
    source: "callable_responses/program_staff_list_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programStaffListCallableResponse.ts",
  },
  {
    name: "ProgramGuestListCallableResponse",
    source: "callable_responses/program_guest_list_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programGuestListCallableResponse.ts",
  },
  {
    name: "ProgramGuestGroupListCallableResponse",
    source:
      "callable_responses/program_guest_group_list_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programGuestGroupListCallableResponse.ts",
  },
  {
    name: "ProgramArrivalsRosterCallableResponse",
    source: "callable_responses/program_arrivals_roster_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programArrivalsRosterCallableResponse.ts",
  },
  {
    name: "ProgramTransportPlanCallableResponse",
    source:
      "callable_responses/program_transport_plan_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programTransportPlanCallableResponse.ts",
  },
  {
    name: "ProgramHotelInboundCallableResponse",
    source: "callable_responses/program_hotel_inbound_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programHotelInboundCallableResponse.ts",
  },
  {
    name: "ProgramHotelRoomsCallableResponse",
    source: "callable_responses/program_hotel_rooms_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programHotelRoomsCallableResponse.ts",
  },
  {
    name: "RecordProgramDoorJournalCallableResponse",
    source:
      "callable_responses/record_program_door_journal_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordProgramDoorJournalCallableResponse.ts",
  },
  {
    name: "ProgramFunctionDoorViewCallableResponse",
    source:
      "callable_responses/" +
      "program_function_door_view_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programFunctionDoorViewCallableResponse.ts",
  },
  {
    name: "ProgramAttendanceReportCallableResponse",
    source:
      "callable_responses/program_attendance_report_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programAttendanceReportCallableResponse.ts",
  },
  {
    name: "ProgramStaffAttentionCallableResponse",
    source:
      "callable_responses/" +
      "program_staff_attention_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programStaffAttentionCallableResponse.ts",
  },
  {
    name: "ProgramStakeholderCountsCallableResponse",
    source:
      "callable_responses/program_stakeholder_counts_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programStakeholderCountsCallableResponse.ts",
  },
  {
    name: "ProgramManifestImportCallableResponse",
    source: "callable_responses/program_manifest_import_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "programManifestImportCallableResponse.ts",
  },
  {
    name: "DispatchProgramTripCallableResponse",
    source: "callable_responses/dispatch_program_trip_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "dispatchProgramTripCallableResponse.ts",
  },
  {
    name: "TransportVendorListCallableResponse",
    source: "callable_responses/transport_vendor_list_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "transportVendorListCallableResponse.ts",
  },
  {
    name: "ProgramTripListCallableResponse",
    source: "callable_responses/program_trip_list_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/programTripListCallableResponse.ts",
  },
  {
    name: "EventAttendeeAttendanceReceiptDocument",
    source: "firestore/event_attendee_attendance_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventAttendeeAttendanceReceiptDocument.ts",
  },
  {
    name: "EventAttendeeImportDocument",
    source: "firestore/event_attendee_imports.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventAttendeeImportDocument.ts",
  },
  {
    name: "EventRosterHandoffDocument",
    source: "firestore/event_roster_handoffs.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRosterHandoffDocument.ts",
  },
  {
    name: "EventRuntimeParticipantDocument",
    source: "firestore/event_runtime_participants.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRuntimeParticipantDocument.ts",
  },
  {
    name: "EventRuntimeDataRequestDocument",
    source: "firestore/event_runtime_data_requests.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRuntimeDataRequestDocument.ts",
  },
  {
    name: "EventRuntimeDataRequestReceiptDocument",
    source: "firestore/event_runtime_data_request_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventRuntimeDataRequestReceiptDocument.ts",
  },
  {
    name: "EventVenueSessionDocument",
    source: "firestore/event_venue_sessions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventVenueSessionDocument.ts",
  },
  {
    name: "EventVenueSessionRedemptionDocument",
    source: "firestore/event_venue_session_redemptions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventVenueSessionRedemptionDocument.ts",
  },
  {
    name: "EventSuccessPresenceDocument",
    source: "firestore/event_success_presence.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessPresenceDocument.ts",
  },
  {
    name: "EventLivePositionDocument",
    source: "firestore/event_live_positions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventLivePositionDocument.ts",
  },
  {
    name: "EventSuccessLateArrivalDocument",
    source: "firestore/event_success_late_arrivals.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessLateArrivalDocument.ts",
  },
  {
    name: "EventRehearsalMovementDocument",
    source: "firestore/event_rehearsal_movements.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalMovementDocument.ts",
  },
  {
    name: "EventRehearsalRouteDecisionDocument",
    source: "firestore/event_rehearsal_route_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalRouteDecisionDocument.ts",
  },
  {
    name: "GetEventRehearsalMovementCallablePayload",
    source: "callables/get_event_rehearsal_movement_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getEventRehearsalMovementCallablePayload.ts",
  },
  {
    name: "EventRehearsalMovementCallableResponse",
    source: "callable_responses/event_rehearsal_movement_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalMovementCallableResponse.ts",
  },
  {
    name: "EventRehearsalDocument",
    source: "firestore/event_rehearsals.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalDocument.ts",
  },
  {
    name: "EventRehearsalCaseDocument",
    source: "firestore/event_rehearsal_cases.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalCaseDocument.ts",
  },
  {
    name: "EventRehearsalMessageDocument",
    source: "firestore/event_rehearsal_messages.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalMessageDocument.ts",
  },
  {
    name: "EventRehearsalActorDocument",
    source: "firestore/event_rehearsal_actors.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalActorDocument.ts",
  },
  {
    name: "EventRehearsalActionDocument",
    source: "firestore/event_rehearsal_actions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalActionDocument.ts",
  },
  {
    name: "EventRehearsalGuestViewDocument",
    source: "firestore/event_rehearsal_guest_views.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalGuestViewDocument.ts",
  },
  {
    name: "EventRuntimeClaimRequestDocument",
    source: "firestore/event_runtime_claim_requests.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRuntimeClaimRequestDocument.ts",
  },
  {
    name: "EventCrossPathsConsentDocument",
    source: "firestore/event_cross_paths_consents.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventCrossPathsConsentDocument.ts",
  },
  {
    name: "CrossPathsShowcaseEligibilityDocument",
    source: "firestore/cross_paths_showcase_eligibility.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "crossPathsShowcaseEligibilityDocument.ts",
  },
  {
    name: "CrossPathsSuggestionExposureDocument",
    source: "firestore/cross_paths_suggestion_exposures.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "crossPathsSuggestionExposureDocument.ts",
  },
  {
    name: "CrossPathsInvitationDocument",
    source: "firestore/cross_paths_invitations.schema.json",
    typeOutput:
      "functions/src/shared/generated/crossPathsInvitationDocument.ts",
  },
  {
    name: "CrossPathsPairHoldDocument",
    source: "firestore/cross_paths_pair_holds.schema.json",
    typeOutput:
      "functions/src/shared/generated/crossPathsPairHoldDocument.ts",
  },
  {
    name: "EventBroadcastDocument",
    source: "firestore/event_broadcasts.schema.json",
    typeOutput: "functions/src/shared/generated/eventBroadcastDocument.ts",
  },
  {
    name: "EventWaitlistOfferDocument",
    source: "firestore/event_waitlist_offers.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventWaitlistOfferDocument.ts",
  },
  {
    name: "EventSuccessPlanDocument",
    source: "firestore/event_success_plans.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessPlanDocument.ts",
  },
  {
    name: "EventAssignmentFeatureConsentDocument",
    source: "firestore/event_assignment_feature_consents.schema.json",
    typeOutput: "functions/src/shared/generated/" +
      "eventAssignmentFeatureConsentDocument.ts",
  },
  {
    name: "EventSuccessConversationGraphDocument",
    source: "firestore/event_success_conversation_graphs.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventSuccessConversationGraphDocument.ts",
  },
  {
    name: "OrganizerEventSuccessLayoutDocument",
    source: "firestore/organizer_event_success_layouts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerEventSuccessLayoutDocument.ts",
  },
  {
    name: "OrganizerEventVenueDocument",
    source: "firestore/organizer_event_venues.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerEventVenueDocument.ts",
  },
  {
    name: "EventSuccessAssignmentDraftDocument",
    source: "firestore/event_success_assignment_drafts.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventSuccessAssignmentDraftDocument.ts",
  },
  {
    name: "EventSuccessFeedbackDocument",
    source: "firestore/event_success_feedback.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessFeedbackDocument.ts",
  },
  {
    name: "EventSuccessPreferenceDocument",
    source: "firestore/event_success_preferences.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessPreferenceDocument.ts",
  },
  {
    name: "EventSuccessCompatibilityResponseDocument",
    source: "firestore/event_success_compatibility_responses.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessCompatibilityResponseDocument.ts",
  },
  {
    name: "EventSuccessWingmanRequestDocument",
    source: "firestore/event_success_wingman_requests.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessWingmanRequestDocument.ts",
  },
  {
    name: "EventSuccessArrivalMissionDocument",
    source: "firestore/event_success_arrival_missions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessArrivalMissionDocument.ts",
  },
  {
    name: "EventSuccessAssignmentDocument",
    source: "firestore/event_success_assignments.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessAssignmentDocument.ts",
  },
  {
    name: "EventSuccessUnitOutcomesDocument",
    source: "firestore/event_success_unit_outcomes.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessUnitOutcomesDocument.ts",
  },
  {
    name: "EventSuccessStandingsDocument",
    source: "firestore/event_success_standings.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessStandingsDocument.ts",
  },
  {
    name: "EventSuccessScorecardDocument",
    source: "firestore/event_success_scorecards.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSuccessScorecardDocument.ts",
  },
  {
    name: "EventSafetyReportDocument",
    source: "firestore/event_safety_reports.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventSafetyReportDocument.ts",
  },
  {
    name: "ClubScheduleLockDocument",
    source: "firestore/club_schedule_locks.schema.json",
    typeOutput:
      "functions/src/shared/generated/clubScheduleLockDocument.ts",
  },
  {
    name: "UserEventScheduleLockDocument",
    source: "firestore/user_event_schedule_locks.schema.json",
    typeOutput:
      "functions/src/shared/generated/userEventScheduleLockDocument.ts",
  },
  {
    name: "SavedEventDocument",
    source: "firestore/saved_events.schema.json",
    typeOutput: "functions/src/shared/generated/savedEventDocument.ts",
  },
  {
    name: "HostAnalyticsEvent",
    source: "bigquery/host_analytics_event.schema.json",
    typeOutput: "functions/src/shared/generated/hostAnalyticsEvent.ts",
  },
  {
    name: "UserProfileExposureEvent",
    source: "bigquery/user_profile_exposure_event.schema.json",
    typeOutput: "functions/src/shared/generated/userProfileExposureEvent.ts",
  },
  {
    name: "PaymentDocument",
    source: "firestore/payments.schema.json",
    typeOutput: "functions/src/shared/generated/paymentDocument.ts",
  },
  {
    name: "NativeRefundRecoveryCursorDocument",
    source: "firestore/native_refund_recovery_cursor.schema.json",
    typeOutput:
      "functions/src/shared/generated/nativeRefundRecoveryCursorDocument.ts",
  },
  {
    name: "HostPaymentAccountDocument",
    source: "firestore/host_payment_accounts.schema.json",
    typeOutput: "functions/src/shared/generated/hostPaymentAccountDocument.ts",
  },
  {
    name: "RazorpayPendingOrderDocument",
    source: "firestore/razorpay_pending_orders.schema.json",
    typeOutput:
      "functions/src/shared/generated/razorpayPendingOrderDocument.ts",
  },
  {
    name: "SwipeDocument",
    source: "firestore/swipes.schema.json",
    typeOutput: "functions/src/shared/generated/swipeDocument.ts",
  },
  {
    name: "MatchDocument",
    source: "firestore/matches.schema.json",
    typeOutput: "functions/src/shared/generated/matchDocument.ts",
  },
  {
    name: "ChatMessageDocument",
    source: "firestore/chat_messages.schema.json",
    typeOutput: "functions/src/shared/generated/chatMessageDocument.ts",
  },
  {
    name: "ActivityNotificationDocument",
    source: "firestore/activity_notifications.schema.json",
    typeOutput:
      "functions/src/shared/generated/activityNotificationDocument.ts",
  },
  {
    name: "ReviewDocument",
    source: "firestore/reviews.schema.json",
    typeOutput: "functions/src/shared/generated/reviewDocument.ts",
  },
  {
    name: "BlockDocument",
    source: "firestore/blocks.schema.json",
    typeOutput: "functions/src/shared/generated/blockDocument.ts",
  },
  {
    name: "ReportDocument",
    source: "firestore/reports.schema.json",
    typeOutput: "functions/src/shared/generated/reportDocument.ts",
  },
  {
    name: "ModerationFlagDocument",
    source: "firestore/moderation_flags.schema.json",
    typeOutput: "functions/src/shared/generated/moderationFlagDocument.ts",
  },
  {
    name: "DeletedUserTombstoneDocument",
    source: "firestore/deleted_users.schema.json",
    typeOutput:
      "functions/src/shared/generated/deletedUserTombstoneDocument.ts",
  },
  {
    name: "RateLimitDocument",
    source: "firestore/rate_limits.schema.json",
    typeOutput: "functions/src/shared/generated/rateLimitDocument.ts",
  },
  {
    name: "HostAnalyticsSnapshotDocument",
    source: "firestore/host_analytics_snapshots.schema.json",
    typeOutput:
      "functions/src/shared/generated/hostAnalyticsSnapshotDocument.ts",
  },
  {
    name: "FunctionEventReceiptDocument",
    source: "firestore/function_event_receipts.schema.json",
    typeOutput:
      "functions/src/shared/generated/functionEventReceiptDocument.ts",
  },
  {
    name: "PublicRouteReservationDocument",
    source: "firestore/public_route_reservations.schema.json",
    typeOutput:
      "functions/src/shared/generated/publicRouteReservationDocument.ts",
  },
  {
    name: "SeedEventManifestDocument",
    source: "firestore/seed_events.schema.json",
    typeOutput: "functions/src/shared/generated/seedEventManifestDocument.ts",
  },
  {
    name: "OrganizerIntakeReviewDecisionDocument",
    source: "firestore/organizer_intake_review_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerIntakeReviewDecisionDocument.ts",
  },
  {
    name: "EventIntakeReviewDecisionDocument",
    source: "firestore/event_intake_review_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventIntakeReviewDecisionDocument.ts",
  },
  {
    name: "OrganizerIntakeCurationDecisionDocument",
    source: "firestore/organizer_intake_curation_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerIntakeCurationDecisionDocument.ts",
  },
  {
    name: "OrganizerIntakeFieldCorrectionDocument",
    source: "firestore/organizer_intake_field_corrections.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerIntakeFieldCorrectionDocument.ts",
  },
  {
    name: "OrganizerEventCandidateReviewDecisionDocument",
    source: "firestore/organizer_event_candidate_review_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerEventCandidateReviewDecisionDocument.ts",
  },
  {
    name: "OrganizerEventLocationResolutionDecisionDocument",
    source:
      "firestore/organizer_event_location_resolution_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerEventLocationResolutionDecisionDocument.ts",
  },
  {
    name: "OrganizerPolicyGapReviewDecisionDocument",
    source: "firestore/organizer_policy_gap_review_decisions.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerPolicyGapReviewDecisionDocument.ts",
  },
  {
    name: "UpdateUserProfileCallablePayload",
    source: "patches/update_user_profile.schema.json",
    typeOutput:
      "functions/src/shared/generated/updateUserProfileCallablePayload.ts",
  },
  {
    name: "CreateClubCallablePayload",
    source: "callables/create_club_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createClubCallablePayload.ts",
  },
  {
    name: "CreateOrganizerCallablePayload",
    source: "callables/create_organizer_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerCallablePayload.ts",
  },
  {
    name: "CreateOrganizerCallableResponse",
    source: "callable_responses/create_organizer_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerCallableResponse.ts",
  },
  {
    name: "UpdateOrganizerCallablePayload",
    source: "callables/update_organizer_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/updateOrganizerCallablePayload.ts",
  },
  {
    name: "ArchiveOrganizerCallablePayload",
    source: "callables/archive_organizer_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/archiveOrganizerCallablePayload.ts",
  },
  {
    name: "DeleteOrganizerCallablePayload",
    source: "callables/delete_organizer_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/deleteOrganizerCallablePayload.ts",
  },
  {
    name: "CreateOrganizerPostCallablePayload",
    source: "callables/create_organizer_post_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerPostCallablePayload.ts",
  },
  {
    name: "CreateOrganizerPostCallableResponse",
    source: "callable_responses/create_organizer_post_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerPostCallableResponse.ts",
  },
  {
    name: "RequestOrganizerClaimCallablePayload",
    source: "callables/request_organizer_claim_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/requestOrganizerClaimCallablePayload.ts",
  },
  {
    name: "RequestOrganizerClaimCallableResponse",
    source: "callable_responses/request_organizer_claim_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/requestOrganizerClaimCallableResponse.ts",
  },
  {
    name: "AdminDecideOrganizerClaimCallablePayload",
    source: "callables/admin_decide_organizer_claim_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminDecideOrganizerClaimCallablePayload.ts",
  },
  {
    name: "CreateClubCallableResponse",
    source: "callable_responses/create_club_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createClubCallableResponse.ts",
  },
  {
    name: "CreateClubPostCallablePayload",
    source: "callables/create_club_post_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createClubPostCallablePayload.ts",
  },
  {
    name: "CreateClubPostCallableResponse",
    source: "callable_responses/create_club_post_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createClubPostCallableResponse.ts",
  },
  {
    name: "SendEventBroadcastCallablePayload",
    source: "callables/send_event_broadcast_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/sendEventBroadcastCallablePayload.ts",
  },
  {
    name: "SendEventBroadcastCallableResponse",
    source: "callable_responses/send_event_broadcast_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/sendEventBroadcastCallableResponse.ts",
  },
  {
    name: "UpdateClubCallablePayload",
    source: "callables/update_club_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/updateClubCallablePayload.ts",
  },
  {
    name: "HostAnalyticsQueryCallablePayload",
    source: "callables/host_analytics_query_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/hostAnalyticsQueryCallablePayload.ts",
  },
  {
    name: "HostAnalyticsCallableResponse",
    source: "callable_responses/host_analytics_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/hostAnalyticsCallableResponse.ts",
  },
  {
    name: "UserAnalyticsQueryCallablePayload",
    source: "callables/user_analytics_query_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/userAnalyticsQueryCallablePayload.ts",
  },
  {
    name: "UserAnalyticsCallableResponse",
    source: "callable_responses/user_analytics_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/userAnalyticsCallableResponse.ts",
  },
  {
    name: "AddClubHostCallablePayload",
    source: "callables/add_club_host_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/addClubHostCallablePayload.ts",
  },
  {
    name: "OrganizerFollowCallablePayload",
    source: "callables/organizer_follow_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerFollowCallablePayload.ts",
  },
  {
    name: "SetOrganizerNotificationPreferenceCallablePayload",
    source:
      "callables/set_organizer_notification_preference_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setOrganizerNotificationPreferenceCallablePayload.ts",
  },
  {
    name: "AddOrganizerManagerCallablePayload",
    source: "callables/add_organizer_manager_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/addOrganizerManagerCallablePayload.ts",
  },
  {
    name: "RemoveOrganizerManagerCallablePayload",
    source: "callables/remove_organizer_manager_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/removeOrganizerManagerCallablePayload.ts",
  },
  {
    name: "TransferOrganizerOwnershipCallablePayload",
    source: "callables/transfer_organizer_ownership_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "transferOrganizerOwnershipCallablePayload.ts",
  },
  {
    name: "RemoveClubHostCallablePayload",
    source: "callables/remove_club_host_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/removeClubHostCallablePayload.ts",
  },
  {
    name: "TransferClubOwnershipCallablePayload",
    source: "callables/transfer_club_ownership_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/transferClubOwnershipCallablePayload.ts",
  },
  {
    name: "RequestClubClaimCallablePayload",
    source: "callables/request_club_claim_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/requestClubClaimCallablePayload.ts",
  },
  {
    name: "RequestClubClaimCallableResponse",
    source: "callable_responses/request_club_claim_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/requestClubClaimCallableResponse.ts",
  },
  {
    name: "AdminDecideClubClaimCallablePayload",
    source: "callables/admin_decide_club_claim_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminDecideClubClaimCallablePayload.ts",
  },
  {
    name: "AdminDecideOrganizerIntakeCallablePayload",
    source: "callables/admin_decide_organizer_intake_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminDecideOrganizerIntakeCallablePayload.ts",
  },
  {
    name: "AdminRecordOrganizerCurationCallablePayload",
    source: "callables/admin_record_organizer_curation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminRecordOrganizerCurationCallablePayload.ts",
  },
  {
    name: "AdminRecordEventIntakeReviewDecisionCallablePayload",
    source:
      "callables/admin_record_event_intake_review_decision_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminRecordEventIntakeReviewDecisionCallablePayload.ts",
  },
  {
    name: "AdminListIntakeOperationsCallablePayload",
    source: "callables/admin_list_intake_operations_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminListIntakeOperationsCallablePayload.ts",
  },
  {
    name: "AdminListActionExecutionsCallablePayload",
    source: "callables/admin_list_action_executions_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminListActionExecutionsCallablePayload.ts",
  },
  {
    name: "AdminRecordActionExecutionCallablePayload",
    source: "callables/admin_record_action_execution_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminRecordActionExecutionCallablePayload.ts",
  },
  {
    name: "AdminDecideOrganizerEventCandidateCallablePayload",
    source: "callables/admin_decide_organizer_event_candidate_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminDecideOrganizerEventCandidateCallablePayload.ts",
  },
  {
    name: "AdminNominateOrganizerCallablePayload",
    source: "callables/admin_nominate_organizer_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminNominateOrganizerCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/adminNominateOrganizerCallablePayload.ts",
    ],
  },
  {
    name: "AdminNominateOrganizerCallableResponse",
    source: "callable_responses/admin_nominate_organizer_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminNominateOrganizerCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/adminNominateOrganizerCallableResponse.ts",
    ],
  },
  {
    name: "AdminDecideOrganizerPolicyGapCallablePayload",
    source: "callables/admin_decide_organizer_policy_gap_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminDecideOrganizerPolicyGapCallablePayload.ts",
  },
  {
    name: "AdminResolveOrganizerEventLocationCallablePayload",
    source:
      "callables/admin_resolve_organizer_event_location_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminResolveOrganizerEventLocationCallablePayload.ts",
  },
  {
    name: "AdminSetClubIndexStatusCallablePayload",
    source: "callables/admin_set_club_index_status_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminSetClubIndexStatusCallablePayload.ts",
  },
  {
    name: "AdminListCrossPathsShowcaseCandidatesCallablePayload",
    source:
      "callables/" +
      "admin_list_cross_paths_showcase_candidates_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminListCrossPathsShowcaseCandidatesCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminListCrossPathsShowcaseCandidatesCallablePayload.ts",
    ],
  },
  {
    name: "AdminSetCrossPathsShowcaseEligibilityCallablePayload",
    source:
      "callables/" +
      "admin_set_cross_paths_showcase_eligibility_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminSetCrossPathsShowcaseEligibilityCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminSetCrossPathsShowcaseEligibilityCallablePayload.ts",
    ],
  },
  {
    name: "AdminGetClubDetailsCallablePayload",
    source: "callables/admin_get_club_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminGetClubDetailsCallablePayload.ts",
  },
  {
    name: "AdminListClubDetailsCallablePayload",
    source: "callables/admin_list_club_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminListClubDetailsCallablePayload.ts",
  },
  {
    name: "AdminUpdateClubDetailsCallablePayload",
    source: "callables/admin_update_club_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminUpdateClubDetailsCallablePayload.ts",
  },
  {
    name: "AdminGetOrganizerDetailsCallablePayload",
    source: "callables/admin_get_organizer_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminGetOrganizerDetailsCallablePayload.ts",
  },
  {
    name: "AdminListOrganizerDetailsCallablePayload",
    source: "callables/admin_list_organizer_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminListOrganizerDetailsCallablePayload.ts",
  },
  {
    name: "AdminUpdateOrganizerDetailsCallablePayload",
    source: "callables/admin_update_organizer_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminUpdateOrganizerDetailsCallablePayload.ts",
  },
  {
    name: "AdminGrantOrganizerEntitlementCallablePayload",
    source:
      "callables/admin_grant_organizer_entitlement_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminGrantOrganizerEntitlementCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminGrantOrganizerEntitlementCallablePayload.ts",
    ],
  },
  {
    name: "AdminRevokeOrganizerEntitlementGrantCallablePayload",
    source:
      "callables/" +
      "admin_revoke_organizer_entitlement_grant_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminRevokeOrganizerEntitlementGrantCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminRevokeOrganizerEntitlementGrantCallablePayload.ts",
    ],
  },
  {
    name: "GetOrganizerEntitlementCallablePayload",
    source: "callables/get_organizer_entitlement_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerEntitlementCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "getOrganizerEntitlementCallablePayload.ts",
    ],
  },
  {
    name: "OrganizerEntitlementMutationCallableResponse",
    source:
      "callable_responses/" +
      "organizer_entitlement_mutation_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerEntitlementMutationCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "organizerEntitlementMutationCallableResponse.ts",
    ],
  },
  {
    name: "OrganizerEntitlementCallableResponse",
    source:
      "callable_responses/organizer_entitlement_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerEntitlementCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "organizerEntitlementCallableResponse.ts",
    ],
  },
  {
    name: "AdminGetEventDetailsCallablePayload",
    source: "callables/admin_get_event_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminGetEventDetailsCallablePayload.ts",
  },
  {
    name: "AdminListEventDetailsCallablePayload",
    source: "callables/admin_list_event_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminListEventDetailsCallablePayload.ts",
  },
  {
    name: "AdminListExternalEventDetailsCallablePayload",
    source:
      "callables/admin_list_external_event_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminListExternalEventDetailsCallablePayload.ts",
  },
  {
    name: "AdminUpdateEventDetailsCallablePayload",
    source: "callables/admin_update_event_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminUpdateEventDetailsCallablePayload.ts",
  },
  {
    name: "AdminPublishExternalEventCallablePayload",
    source: "callables/admin_publish_external_event_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminPublishExternalEventCallablePayload.ts",
  },
  {
    name: "AdminTakedownExternalEventCallablePayload",
    source: "callables/admin_takedown_external_event_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminTakedownExternalEventCallablePayload.ts",
  },
  {
    name: "StartClubHostConversationCallablePayload",
    source: "callables/start_club_host_conversation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/startClubHostConversationCallablePayload.ts",
  },
  {
    name: "StartOrganizerConversationCallablePayload",
    source: "callables/start_organizer_conversation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "startOrganizerConversationCallablePayload.ts",
  },
  {
    name: "StartOrganizerContactConversationCallablePayload",
    source:
      "callables/start_organizer_contact_conversation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "startOrganizerContactConversationCallablePayload.ts",
  },
  {
    name: "ArchiveClubCallablePayload",
    source: "callables/archive_club_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/archiveClubCallablePayload.ts",
  },
  {
    name: "DeleteClubCallablePayload",
    source: "callables/delete_club_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/deleteClubCallablePayload.ts",
  },
  {
    name: "ClubMembershipCallablePayload",
    source: "callables/club_membership_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/clubMembershipCallablePayload.ts",
  },
  {
    name: "SetClubNotificationPreferenceCallablePayload",
    source: "callables/set_club_notification_preference_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/setClubNotificationPreferenceCallablePayload.ts",
  },
  {
    name: "EventOfferAuthorityRow",
    source: "embedded/event_offer_authority_row.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferAuthorityRow.ts",
  },
  {
    name: "EventOfferRow",
    source: "embedded/event_offer_row.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferRow.ts",
  },
  {
    name: "EventOfferPaymentSnapshot",
    source: "embedded/event_offer_payment_snapshot.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferPaymentSnapshot.ts",
  },
  {
    name: "EventOfferManualPayment",
    source: "embedded/event_offer_manual_payment.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferManualPayment.ts",
  },
  {
    name: "OrganizerEventOfferDocument",
    source: "firestore/organizer_event_offers.schema.json",
    typeOutput: "functions/src/shared/generated/organizerEventOfferDocument.ts",
  },
  {
    name: "EventOfferAction",
    source: "embedded/event_offer_action.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferAction.ts",
  },
  {
    name: "OrganizerEventOfferActionReceiptDocument",
    source: "firestore/organizer_event_offer_action_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/organizerEventOfferActionReceiptDocument.ts",
  },
  {
    name: "OrganizerEventOfferBatchReceiptDocument",
    source: "firestore/organizer_event_offer_batch_receipts.schema.json",
    typeOutput: "functions/src/shared/generated/organizerEventOfferBatchReceiptDocument.ts",
  },
  {
    name: "OrganizerEventOfferAuditDocument",
    source: "firestore/organizer_event_offer_audits.schema.json",
    typeOutput: "functions/src/shared/generated/organizerEventOfferAuditDocument.ts",
  },
  {
    name: "PreviewEventOffersCallablePayload",
    source: "callables/preview_event_offers_payload.schema.json",
    typeOutput: "functions/src/shared/generated/previewEventOffersCallablePayload.ts",
  },
  {
    name: "CommitEventOffersCallablePayload",
    source: "callables/commit_event_offers_payload.schema.json",
    typeOutput: "functions/src/shared/generated/commitEventOffersCallablePayload.ts",
  },
  {
    name: "MutateEventOfferCallablePayload",
    source: "callables/mutate_event_offer_payload.schema.json",
    typeOutput: "functions/src/shared/generated/mutateEventOfferCallablePayload.ts",
  },
  {
    name: "GetEventOfferCallablePayload",
    source: "callables/get_event_offer_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getEventOfferCallablePayload.ts",
  },
  {
    name: "ListEventOffersCallablePayload",
    source: "callables/list_event_offers_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listEventOffersCallablePayload.ts",
  },
  {
    name: "EventOfferPreviewCallableResponse",
    source: "callable_responses/event_offer_preview_response.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferPreviewCallableResponse.ts",
  },
  {
    name: "EventOfferCommitCallableResponse",
    source: "callable_responses/event_offer_commit_response.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferCommitCallableResponse.ts",
  },
  {
    name: "EventOfferDetailCallableResponse",
    source: "callable_responses/event_offer_detail_response.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferDetailCallableResponse.ts",
  },
  {
    name: "EventOfferMutationCallableResponse",
    source: "callable_responses/event_offer_mutation_response.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferMutationCallableResponse.ts",
  },
  {
    name: "EventOfferListCallableResponse",
    source: "callable_responses/event_offer_list_response.schema.json",
    typeOutput: "functions/src/shared/generated/eventOfferListCallableResponse.ts",
  },
  {
    name: "EventSetupDefaults",
    source: "embedded/event_setup_defaults.schema.json",
    typeOutput: "functions/src/shared/generated/eventSetupDefaults.ts",
  },
  {
    name: "CreatePrivateEventSetupCallablePayload",
    source: "callables/create_private_event_setup_payload.schema.json",
    typeOutput: "functions/src/shared/generated/createPrivateEventSetupCallablePayload.ts",
  },
  {
    name: "UpdatePrivateEventBasicsCallablePayload",
    source: "callables/update_private_event_basics_payload.schema.json",
    typeOutput: "functions/src/shared/generated/updatePrivateEventBasicsCallablePayload.ts",
  },
  {
    name: "GetPrivateEventSetupCallablePayload",
    source: "callables/get_private_event_setup_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getPrivateEventSetupCallablePayload.ts",
  },
  {
    name: "PrivateEventSetupMutationCallableResponse",
    source: "callable_responses/private_event_setup_mutation_response.schema.json",
    typeOutput: "functions/src/shared/generated/privateEventSetupMutationCallableResponse.ts",
  },
  {
    name: "PrivateEventSetupCallableResponse",
    source: "callable_responses/private_event_setup_response.schema.json",
    typeOutput: "functions/src/shared/generated/privateEventSetupCallableResponse.ts",
  },
  {
    name: "QueryOrganizerFormResponsesCallablePayload",
    source: "callables/query_organizer_form_responses_payload.schema.json",
    typeOutput: "functions/src/shared/generated/queryOrganizerFormResponsesCallablePayload.ts",
  },
  {
    name: "QueryOrganizerFormResponsesCallableResponse",
    source: "callable_responses/query_organizer_form_responses_response.schema.json",
    typeOutput: "functions/src/shared/generated/queryOrganizerFormResponsesCallableResponse.ts",
  },
  {
    name: "CreateEventCallablePayload",
    source: "callables/create_event_payload.schema.json",
    typeOutput: "functions/src/shared/generated/createEventCallablePayload.ts",
  },
  {
    name: "UpdateEventCallablePayload",
    source: "callables/update_event_payload.schema.json",
    typeOutput: "functions/src/shared/generated/updateEventCallablePayload.ts",
  },
  {
    name: "CancelEventCallablePayload",
    source: "callables/cancel_event_payload.schema.json",
    typeOutput: "functions/src/shared/generated/cancelEventCallablePayload.ts",
  },
  {
    name: "DeleteEventCallablePayload",
    source: "callables/delete_event_payload.schema.json",
    typeOutput: "functions/src/shared/generated/deleteEventCallablePayload.ts",
  },
  {
    name: "EventIdCallablePayload",
    source: "callables/event_id_payload.schema.json",
    typeOutput: "functions/src/shared/generated/eventIdCallablePayload.ts",
  },
  {
    name: "SetCrossPathsEventConsentCallablePayload",
    source:
      "callables/set_cross_paths_event_consent_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setCrossPathsEventConsentCallablePayload.ts",
  },
  {
    name: "GetCrossPathsSuggestionsCallablePayload",
    source: "callables/get_cross_paths_suggestions_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getCrossPathsSuggestionsCallablePayload.ts",
  },
  {
    name: "SendCrossPathsInvitationCallablePayload",
    source: "callables/send_cross_paths_invitation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "sendCrossPathsInvitationCallablePayload.ts",
  },
  {
    name: "RespondCrossPathsInvitationCallablePayload",
    source: "callables/respond_cross_paths_invitation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "respondCrossPathsInvitationCallablePayload.ts",
  },
  {
    name: "CancelCrossPathsInvitationOrPlanCallablePayload",
    source:
      "callables/cancel_cross_paths_invitation_or_plan_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "cancelCrossPathsInvitationOrPlanCallablePayload.ts",
  },
  {
    name: "CreateEventWaitlistOffersCallablePayload",
    source: "callables/create_event_waitlist_offers_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createEventWaitlistOffersCallablePayload.ts",
  },
  {
    name: "CreateEventInviteLinkCallablePayload",
    source: "callables/create_event_invite_link_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createEventInviteLinkCallablePayload.ts",
  },
  {
    name: "DisableEventInviteLinkCallablePayload",
    source: "callables/disable_event_invite_link_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "disableEventInviteLinkCallablePayload.ts",
  },
  {
    name: "RecordEventInviteLinkOpenCallablePayload",
    source: "callables/record_event_invite_link_open_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordEventInviteLinkOpenCallablePayload.ts",
  },
  {
    name: "ResolveEventInviteLandingCallablePayload",
    source: "callables/resolve_event_invite_landing_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "resolveEventInviteLandingCallablePayload.ts",
  },
  {
    name: "ResolveEventInviteLandingCallableResponse",
    source:
      "callable_responses/resolve_event_invite_landing_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "resolveEventInviteLandingCallableResponse.ts",
  },
  {
    name: "GetEventInviteLinkTokenCallablePayload",
    source: "callables/get_event_invite_link_token_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getEventInviteLinkTokenCallablePayload.ts",
  },
  {
    name: "RecordEventShareIntentCallablePayload",
    source: "callables/record_event_share_intent_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/recordEventShareIntentCallablePayload.ts",
  },
  {
    name: "UpsertOrganizerCampaignCallablePayload",
    source: "callables/upsert_organizer_campaign_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/upsertOrganizerCampaignCallablePayload.ts",
  },
  {
    name: "UpsertOrganizerSavedAudienceCallablePayload",
    source:
      "callables/upsert_organizer_saved_audience_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertOrganizerSavedAudienceCallablePayload.ts",
  },
  {
    name: "ListOrganizerSavedAudiencesCallablePayload",
    source:
      "callables/list_organizer_saved_audiences_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerSavedAudiencesCallablePayload.ts",
  },
  {
    name: "PreviewOrganizerSavedAudienceCallablePayload",
    source:
      "callables/preview_organizer_saved_audience_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "previewOrganizerSavedAudienceCallablePayload.ts",
  },
  {
    name: "ResolveOrganizerAudienceMembersCallablePayload",
    source: "callables/resolve_organizer_audience_members_payload.schema.json",
    typeOutput: "functions/src/shared/generated/resolveOrganizerAudienceMembersCallablePayload.ts",
  },
  {
    name: "ResolveOrganizerAudienceMembersCallableResponse",
    source: "callable_responses/resolve_organizer_audience_members_response.schema.json",
    typeOutput: "functions/src/shared/generated/resolveOrganizerAudienceMembersCallableResponse.ts",
  },
  {
    name: "ArchiveOrganizerSavedAudienceCallablePayload",
    source:
      "callables/archive_organizer_saved_audience_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "archiveOrganizerSavedAudienceCallablePayload.ts",
  },
  {
    name: "OrganizerSavedAudienceCallableResponse",
    source:
      "callable_responses/organizer_saved_audience_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerSavedAudienceCallableResponse.ts",
  },
  {
    name: "ListOrganizerSavedAudiencesCallableResponse",
    source:
      "callable_responses/list_organizer_saved_audiences_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerSavedAudiencesCallableResponse.ts",
  },
  {
    name: "PreviewOrganizerSavedAudienceCallableResponse",
    source:
      "callable_responses/preview_organizer_saved_audience_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "previewOrganizerSavedAudienceCallableResponse.ts",
  },
  {
    name: "PrepareOrganizerManualSendTaskCallablePayload",
    source:
      "callables/prepare_organizer_manual_send_task_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "prepareOrganizerManualSendTaskCallablePayload.ts",
  },
  {
    name: "ListOrganizerManualSendTasksCallablePayload",
    source:
      "callables/list_organizer_manual_send_tasks_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerManualSendTasksCallablePayload.ts",
  },
  {
    name: "OpenOrganizerManualSendTaskCallablePayload",
    source:
      "callables/open_organizer_manual_send_task_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "openOrganizerManualSendTaskCallablePayload.ts",
  },
  {
    name: "ValidateOrganizerManualSendTaskLaunchCallablePayload",
    source:
      "callables/validate_organizer_manual_send_task_launch_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "validateOrganizerManualSendTaskLaunchCallablePayload.ts",
  },
  {
    name: "MarkOrganizerManualSendTaskCallablePayload",
    source:
      "callables/mark_organizer_manual_send_task_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "markOrganizerManualSendTaskCallablePayload.ts",
  },
  {
    name: "ReplanOrganizerManualSendTasksCallablePayload",
    source:
      "callables/replan_organizer_manual_send_tasks_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "replanOrganizerManualSendTasksCallablePayload.ts",
  },
  {
    name: "OrganizerManualSendTaskCallableResponse",
    source:
      "callable_responses/organizer_manual_send_task_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerManualSendTaskCallableResponse.ts",
  },
  {
    name: "ListOrganizerManualSendTasksCallableResponse",
    source:
      "callable_responses/list_organizer_manual_send_tasks_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerManualSendTasksCallableResponse.ts",
  },
  {
    name: "ReplanOrganizerManualSendTasksCallableResponse",
    source:
      "callable_responses/replan_organizer_manual_send_tasks_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "replanOrganizerManualSendTasksCallableResponse.ts",
  },
  {
    name: "OrganizerCampaignActionCallablePayload",
    source: "callables/organizer_campaign_action_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerCampaignActionCallablePayload.ts",
  },
  {
    name: "CompleteOrganizerWhatsappConnectionCallablePayload",
    source:
      "callables/complete_organizer_whatsapp_connection_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "completeOrganizerWhatsappConnectionCallablePayload.ts",
  },
  {
    name: "OrganizerSenderConnectionActionCallablePayload",
    source:
      "callables/organizer_sender_connection_action_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerSenderConnectionActionCallablePayload.ts",
  },
  {
    name: "SendOrganizerWhatsappTestCallablePayload",
    source: "callables/send_organizer_whatsapp_test_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/sendOrganizerWhatsappTestCallablePayload.ts",
  },
  {
    name: "OrganizerCampaignCallableResponse",
    source: "callable_responses/organizer_campaign_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerCampaignCallableResponse.ts",
  },
  {
    name: "ListOrganizerCampaignsCallablePayload",
    source: "callables/list_organizer_campaigns_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerCampaignsCallablePayload.ts",
  },
  {
    name: "ListOrganizerCampaignsCallableResponse",
    source: "callable_responses/list_organizer_campaigns_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerCampaignsCallableResponse.ts",
  },
  {
    name: "OrganizerMessagingSetupCallableResponse",
    source:
      "callable_responses/organizer_messaging_setup_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/organizerMessagingSetupCallableResponse.ts",
  },
  {
    name: "GetOrganizerProviderSetupCallablePayload",
    source: "callables/get_organizer_provider_setup_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerProviderSetupCallablePayload.ts",
  },
  {
    name: "ConnectOrganizerLumaProviderCallablePayload",
    source: "callables/connect_organizer_luma_provider_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "connectOrganizerLumaProviderCallablePayload.ts",
  },
  {
    name: "ListOrganizerLumaEventsCallablePayload",
    source: "callables/list_organizer_luma_events_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerLumaEventsCallablePayload.ts",
  },
  {
    name: "SyncOrganizerProviderEventCallablePayload",
    source: "callables/sync_organizer_provider_event_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "syncOrganizerProviderEventCallablePayload.ts",
  },
  {
    name: "DisconnectOrganizerProviderCallablePayload",
    source: "callables/disconnect_organizer_provider_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "disconnectOrganizerProviderCallablePayload.ts",
  },
  {
    name: "OrganizerProviderSetupCallableResponse",
    source:
      "callable_responses/organizer_provider_setup_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerProviderSetupCallableResponse.ts",
  },
  {
    name: "ListOrganizerLumaEventsCallableResponse",
    source:
      "callable_responses/list_organizer_luma_events_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerLumaEventsCallableResponse.ts",
  },
  {
    name: "SyncOrganizerProviderEventCallableResponse",
    source:
      "callable_responses/sync_organizer_provider_event_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "syncOrganizerProviderEventCallableResponse.ts",
  },
  {
    name: "RecordOrganizerAnalyticsEventCallablePayload",
    source:
      "callables/record_organizer_analytics_event_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordOrganizerAnalyticsEventCallablePayload.ts",
  },
  {
    name: "RecordOrganizerAnalyticsEventCallableResponse",
    source:
      "callable_responses/record_organizer_analytics_event_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordOrganizerAnalyticsEventCallableResponse.ts",
  },
  {
    name: "MarkEventAttendanceCallablePayload",
    source: "callables/mark_event_attendance_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/markEventAttendanceCallablePayload.ts",
  },
  {
    name: "ImportEventAttendeesCallablePayload",
    source: "callables/import_event_attendees_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/importEventAttendeesCallablePayload.ts",
  },
  {
    name: "MarkEventAttendeeAttendanceCallablePayload",
    source:
      "callables/mark_event_attendee_attendance_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "markEventAttendeeAttendanceCallablePayload.ts",
  },
  {
    name: "SetEventAttendeeAttendanceCallablePayload",
    source:
      "callables/set_event_attendee_attendance_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setEventAttendeeAttendanceCallablePayload.ts",
  },
  {
    name: "SetEventAttendeeAttendanceCallableResponse",
    source:
      "callable_responses/set_event_attendee_attendance_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setEventAttendeeAttendanceCallableResponse.ts",
  },
  {
    name: "EventOperatorAccessCallablePayload",
    source: "callables/event_operator_access_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventOperatorAccessCallablePayload.ts",
  },
  {
    name: "EventOperatorAccessCallableResponse",
    source: "callable_responses/event_operator_access_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventOperatorAccessCallableResponse.ts",
  },
  {
    name: "GrantEventStaffCallablePayload",
    source: "callables/grant_event_staff_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/grantEventStaffCallablePayload.ts",
  },
  {
    name: "RevokeEventStaffCallablePayload",
    source: "callables/revoke_event_staff_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/revokeEventStaffCallablePayload.ts",
  },
  {
    name: "EventStaffListCallableResponse",
    source: "callable_responses/event_staff_list_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventStaffListCallableResponse.ts",
  },
  {
    name: "RegisterPublicEventCallablePayload",
    source: "callables/register_public_event_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/registerPublicEventCallablePayload.ts",
  },
  {
    name: "RegisterPublicEventCallableResponse",
    source: "callable_responses/register_public_event_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/registerPublicEventCallableResponse.ts",
  },
  {
    name: "GetEventRuntimeBootstrapCallablePayload",
    source: "callables/get_event_runtime_bootstrap_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getEventRuntimeBootstrapCallablePayload.ts",
  },
  {
    name: "CreateEventRehearsalCallablePayload",
    source: "callables/create_event_rehearsal_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createEventRehearsalCallablePayload.ts",
  },
  {
    name: "CreateEventRehearsalCallableResponse",
    source: "callable_responses/create_event_rehearsal_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createEventRehearsalCallableResponse.ts",
  },
  {
    name: "GetEventRehearsalBootstrapCallablePayload",
    source: "callables/get_event_rehearsal_bootstrap_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getEventRehearsalBootstrapCallablePayload.ts",
  },
  {
    name: "EventRehearsalBootstrapCallableResponse",
    source:
      "callable_responses/event_rehearsal_bootstrap_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalBootstrapCallableResponse.ts",
  },
  {
    name: "UpdateEventRehearsalSetupCallablePayload",
    source: "callables/update_event_rehearsal_setup_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/updateEventRehearsalSetupCallablePayload.ts",
  },
  {
    name: "ControlEventRehearsalCallablePayload",
    source: "callables/control_event_rehearsal_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/controlEventRehearsalCallablePayload.ts",
  },
  {
    name: "InjectEventRehearsalBehaviorCallablePayload",
    source:
      "callables/inject_event_rehearsal_behavior_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/injectEventRehearsalBehaviorCallablePayload.ts",
  },
  {
    name: "ControlEventRehearsalSpatialCallablePayload",
    source:
      "callables/control_event_rehearsal_spatial_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/controlEventRehearsalSpatialCallablePayload.ts",
  },
  {
    name: "ResetEventRehearsalCallablePayload",
    source: "callables/reset_event_rehearsal_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/resetEventRehearsalCallablePayload.ts",
  },
  {
    name: "RotateEventRehearsalGuestLinkCallablePayload",
    source:
      "callables/rotate_event_rehearsal_guest_link_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/rotateEventRehearsalGuestLinkCallablePayload.ts",
  },
  {
    name: "GetEventRehearsalGuestBootstrapCallablePayload",
    source:
      "callables/get_event_rehearsal_guest_bootstrap_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getEventRehearsalGuestBootstrapCallablePayload.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/" +
      "getEventRehearsalGuestBootstrapCallablePayload.ts",
    ],
  },
  {
    name: "EventRehearsalGuestBootstrapCallableResponse",
    source:
      "callable_responses/event_rehearsal_guest_bootstrap_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalGuestBootstrapCallableResponse.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/" +
      "eventRehearsalGuestBootstrapCallableResponse.ts",
    ],
  },
  {
    name: "SubmitEventRehearsalGuestActionCallablePayload",
    source:
      "callables/submit_event_rehearsal_guest_action_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/submitEventRehearsalGuestActionCallablePayload.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/" +
      "submitEventRehearsalGuestActionCallablePayload.ts",
    ],
  },
  {
    name: "EventRehearsalReproductionCallableResponse",
    source:
      "callable_responses/event_rehearsal_reproduction_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventRehearsalReproductionCallableResponse.ts",
  },
  {
    name: "UpsertEventSuccessLayoutCallablePayload",
    source: "callables/upsert_event_success_layout_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertEventSuccessLayoutCallablePayload.ts",
  },
  {
    name: "UpsertOrganizerEventVenueCallablePayload",
    source: "callables/upsert_organizer_event_venue_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertOrganizerEventVenueCallablePayload.ts",
  },
  {
    name: "UpsertOrganizerEventVenueCallableResponse",
    source:
      "callable_responses/upsert_organizer_event_venue_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertOrganizerEventVenueCallableResponse.ts",
  },
  {
    name: "UpsertEventSuccessLayoutCallableResponse",
    source:
      "callable_responses/upsert_event_success_layout_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "upsertEventSuccessLayoutCallableResponse.ts",
  },
  {
    name: "GetEventSuccessSpatialLayoutCallablePayload",
    source:
      "callables/get_event_success_spatial_layout_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getEventSuccessSpatialLayoutCallablePayload.ts",
  },
  {
    name: "GetEventSuccessSpatialLayoutCallableResponse",
    source:
      "callable_responses/" +
      "get_event_success_spatial_layout_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getEventSuccessSpatialLayoutCallableResponse.ts",
  },
  {
    name: "EventSuccessSpatialActionCallablePayload",
    source: "callables/event_success_spatial_action_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventSuccessSpatialActionCallablePayload.ts",
  },
  {
    name: "EventSuccessSpatialActionCallableResponse",
    source:
      "callable_responses/event_success_spatial_action_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventSuccessSpatialActionCallableResponse.ts",
  },
  {
    name: "GetEventRuntimeBootstrapCallableResponse",
    source:
      "callable_responses/get_event_runtime_bootstrap_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/getEventRuntimeBootstrapCallableResponse.ts",
  },
  {
    name: "GetEventSuccessConversationGraphCallableResponse",
    source:
      "callable_responses/" +
      "get_event_success_conversation_graph_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getEventSuccessConversationGraphCallableResponse.ts",
  },
  {
    name: "SubmitEventSuccessConversationGraphCallablePayload",
    source:
      "callables/submit_event_success_conversation_graph_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitEventSuccessConversationGraphCallablePayload.ts",
  },
  {
    name: "SubmitEventSuccessConversationGraphCallableResponse",
    source:
      "callable_responses/" +
      "submit_event_success_conversation_graph_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitEventSuccessConversationGraphCallableResponse.ts",
  },
  {
    name: "ClaimEventRuntimeAccessCallablePayload",
    source: "callables/claim_event_runtime_access_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/claimEventRuntimeAccessCallablePayload.ts",
  },
  {
    name: "ClaimEventRuntimeAccessCallableResponse",
    source:
      "callable_responses/claim_event_runtime_access_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/claimEventRuntimeAccessCallableResponse.ts",
  },
  {
    name: "SubmitEventRuntimeProfileCallablePayload",
    source: "callables/submit_event_runtime_profile_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/submitEventRuntimeProfileCallablePayload.ts",
  },
  {
    name: "SubmitEventRuntimeProfileCallableResponse",
    source:
      "callable_responses/submit_event_runtime_profile_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/submitEventRuntimeProfileCallableResponse.ts",
  },
  {
    name: "CheckInEventRuntimeCallablePayload",
    source: "callables/check_in_event_runtime_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/checkInEventRuntimeCallablePayload.ts",
  },
  {
    name: "CheckInEventRuntimeCallableResponse",
    source:
      "callable_responses/check_in_event_runtime_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/checkInEventRuntimeCallableResponse.ts",
  },
  {
    name: "CreateEventVenueSessionCallablePayload",
    source: "callables/create_event_venue_session_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createEventVenueSessionCallablePayload.ts",
  },
  {
    name: "CreateEventVenueSessionCallableResponse",
    source:
      "callable_responses/create_event_venue_session_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createEventVenueSessionCallableResponse.ts",
  },
  {
    name: "ApproveEventRuntimeClaimCallablePayload",
    source: "callables/approve_event_runtime_claim_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/approveEventRuntimeClaimCallablePayload.ts",
  },
  {
    name: "ApproveEventRuntimeClaimCallableResponse",
    source:
      "callable_responses/approve_event_runtime_claim_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/approveEventRuntimeClaimCallableResponse.ts",
  },
  {
    name: "CreateEventRosterHandoffCallablePayload",
    source: "callables/create_event_roster_handoff_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createEventRosterHandoffCallablePayload.ts",
  },
  {
    name: "CreateEventRosterHandoffCallableResponse",
    source:
      "callable_responses/create_event_roster_handoff_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createEventRosterHandoffCallableResponse.ts",
  },
  {
    name: "GetOrganizerCrmSummaryCallablePayload",
    source: "callables/get_organizer_crm_summary_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerCrmSummaryCallablePayload.ts",
  },
  {
    name: "GetEventRosterInsightsCallablePayload",
    source: "callables/get_event_roster_insights_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getEventRosterInsightsCallablePayload.ts",
  },
  {
    name: "GetEventRosterInsightsCallableResponse",
    source:
      "callable_responses/get_event_roster_insights_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/getEventRosterInsightsCallableResponse.ts",
  },
  {
    name: "GetOrganizerCrmSummaryCallableResponse",
    source:
      "callable_responses/get_organizer_crm_summary_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerCrmSummaryCallableResponse.ts",
  },
  {
    name: "ListOrganizerContactsCallablePayload",
    source: "callables/list_organizer_contacts_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerContactsCallablePayload.ts",
  },
  {
    name: "CreateOrganizerFormCallablePayload",
    source: "callables/create_organizer_form_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerFormCallablePayload.ts",
  },
  {
    name: "ManageOrganizerFormDomainCallablePayload",
    source: "callables/manage_organizer_form_domain_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/manageOrganizerFormDomainCallablePayload.ts",
  },
  {
    name: "ManageOrganizerFormDomainCallableResponse",
    source:
      "callable_responses/manage_organizer_form_domain_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/manageOrganizerFormDomainCallableResponse.ts",
  },
  {
    name: "CreateOrganizerFormCallableResponse",
    source: "callable_responses/create_organizer_form_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerFormCallableResponse.ts",
  },
  {
    name: "UpdateOrganizerFormDraftCallablePayload",
    source: "callables/update_organizer_form_draft_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "updateOrganizerFormDraftCallablePayload.ts",
  },
  {
    name: "UpdateOrganizerFormDraftCallableResponse",
    source:
      "callable_responses/update_organizer_form_draft_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "updateOrganizerFormDraftCallableResponse.ts",
  },
  {
    name: "GetOrganizerFormEditorCallablePayload",
    source: "callables/get_organizer_form_editor_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerFormEditorCallablePayload.ts",
  },
  {
    name: "GetOrganizerFormEditorCallableResponse",
    source:
      "callable_responses/get_organizer_form_editor_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerFormEditorCallableResponse.ts",
  },
  {
    name: "ListOrganizerFormsCallablePayload",
    source: "callables/list_organizer_forms_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerFormsCallablePayload.ts",
  },
  {
    name: "ListOrganizerFormsCallableResponse",
    source: "callable_responses/list_organizer_forms_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerFormsCallableResponse.ts",
  },
  {
    name: "ValidateOrganizerFormDraftCallablePayload",
    source: "callables/validate_organizer_form_draft_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "validateOrganizerFormDraftCallablePayload.ts",
  },
  {
    name: "ValidateOrganizerFormDraftCallableResponse",
    source:
      "callable_responses/validate_organizer_form_draft_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "validateOrganizerFormDraftCallableResponse.ts",
  },
  {
    name: "PublishOrganizerFormCallablePayload",
    source: "callables/publish_organizer_form_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/publishOrganizerFormCallablePayload.ts",
  },
  {
    name: "PublishOrganizerFormCallableResponse",
    source: "callable_responses/publish_organizer_form_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/publishOrganizerFormCallableResponse.ts",
  },
  {
    name: "SetOrganizerFormLifecycleCallablePayload",
    source: "callables/set_organizer_form_lifecycle_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setOrganizerFormLifecycleCallablePayload.ts",
  },
  {
    name: "SetOrganizerFormLifecycleCallableResponse",
    source:
      "callable_responses/set_organizer_form_lifecycle_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setOrganizerFormLifecycleCallableResponse.ts",
  },
  {
    name: "DuplicateOrganizerFormCallablePayload",
    source: "callables/duplicate_organizer_form_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/duplicateOrganizerFormCallablePayload.ts",
  },
  {
    name: "DuplicateOrganizerFormCallableResponse",
    source: "callable_responses/duplicate_organizer_form_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/duplicateOrganizerFormCallableResponse.ts",
  },
  {
    name: "DeleteOrganizerFormDraftCallablePayload",
    source: "callables/delete_organizer_form_draft_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "deleteOrganizerFormDraftCallablePayload.ts",
  },
  {
    name: "DeleteOrganizerFormDraftCallableResponse",
    source:
      "callable_responses/delete_organizer_form_draft_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "deleteOrganizerFormDraftCallableResponse.ts",
  },
  {
    name: "ListOrganizerFormTemplatesCallablePayload",
    source: "callables/list_organizer_form_templates_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerFormTemplatesCallablePayload.ts",
  },
  {
    name: "ListOrganizerFormTemplatesCallableResponse",
    source:
      "callable_responses/list_organizer_form_templates_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerFormTemplatesCallableResponse.ts",
  },
  {
    name: "GetPublicOrganizerFormCallablePayload",
    source: "callables/get_public_organizer_form_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getPublicOrganizerFormCallablePayload.ts",
  },
  {
    name: "GetPublicOrganizerFormCallableResponse",
    source:
      "callable_responses/get_public_organizer_form_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/getPublicOrganizerFormCallableResponse.ts",
  },
  {
    name: "BeginOrganizerFormResponseCallablePayload",
    source:
      "callables/begin_organizer_form_response_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "beginOrganizerFormResponseCallablePayload.ts",
  },
  {
    name: "BeginOrganizerFormResponseCallableResponse",
    source:
      "callable_responses/" +
      "begin_organizer_form_response_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "beginOrganizerFormResponseCallableResponse.ts",
  },
  {
    name: "SaveOrganizerFormResponseDraftCallablePayload",
    source:
      "callables/save_organizer_form_response_draft_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "saveOrganizerFormResponseDraftCallablePayload.ts",
  },
  {
    name: "SaveOrganizerFormResponseDraftCallableResponse",
    source:
      "callable_responses/" +
      "save_organizer_form_response_draft_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "saveOrganizerFormResponseDraftCallableResponse.ts",
  },
  {
    name: "CreateOrganizerFormAssetIntentCallablePayload",
    source:
      "callables/create_organizer_form_asset_intent_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createOrganizerFormAssetIntentCallablePayload.ts",
  },
  {
    name: "CreateOrganizerFormAssetIntentCallableResponse",
    source:
      "callable_responses/" +
      "create_organizer_form_asset_intent_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createOrganizerFormAssetIntentCallableResponse.ts",
  },
  {
    name: "FinalizeOrganizerFormAssetCallablePayload",
    source: "callables/finalize_organizer_form_asset_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "finalizeOrganizerFormAssetCallablePayload.ts",
  },
  {
    name: "FinalizeOrganizerFormAssetCallableResponse",
    source:
      "callable_responses/finalize_organizer_form_asset_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "finalizeOrganizerFormAssetCallableResponse.ts",
  },
  {
    name: "PrepareOrganizerFormPaymentCallablePayload",
    source: "callables/prepare_organizer_form_payment_payload.schema.json",
    typeOutput: "functions/src/shared/generated/prepareOrganizerFormPaymentCallablePayload.ts",
  },
  {
    name: "PrepareOrganizerFormPaymentCallableResponse",
    source: "callable_responses/prepare_organizer_form_payment_response.schema.json",
    typeOutput: "functions/src/shared/generated/prepareOrganizerFormPaymentCallableResponse.ts",
  },
  {
    name: "FindOrganizerFormPaymentCallablePayload",
    source: "callables/find_organizer_form_payment_payload.schema.json",
    typeOutput: "functions/src/shared/generated/findOrganizerFormPaymentCallablePayload.ts",
  },
  {
    name: "FindOrganizerFormPaymentCallableResponse",
    source: "callable_responses/find_organizer_form_payment_response.schema.json",
    typeOutput: "functions/src/shared/generated/findOrganizerFormPaymentCallableResponse.ts",
  },
  {
    name: "GetOrganizerFormPaymentCallablePayload",
    source: "callables/get_organizer_form_payment_payload.schema.json",
    typeOutput: "functions/src/shared/generated/getOrganizerFormPaymentCallablePayload.ts",
  },
  {
    name: "GetOrganizerFormPaymentCallableResponse",
    source: "callable_responses/get_organizer_form_payment_response.schema.json",
    typeOutput: "functions/src/shared/generated/getOrganizerFormPaymentCallableResponse.ts",
  },
  {
    name: "ListOrganizerFormPaymentsCallablePayload",
    source: "callables/list_organizer_form_payments_payload.schema.json",
    typeOutput: "functions/src/shared/generated/listOrganizerFormPaymentsCallablePayload.ts",
  },
  {
    name: "ListOrganizerFormPaymentsCallableResponse",
    source: "callable_responses/list_organizer_form_payments_response.schema.json",
    typeOutput: "functions/src/shared/generated/listOrganizerFormPaymentsCallableResponse.ts",
  },
  {
    name: "ManageOrganizerFormPaymentConnectionCallablePayload",
    source: "callables/manage_organizer_form_payment_connection_payload.schema.json",
    typeOutput: "functions/src/shared/generated/manageOrganizerFormPaymentConnectionCallablePayload.ts",
  },
  {
    name: "ManageOrganizerFormPaymentConnectionCallableResponse",
    source: "callable_responses/manage_organizer_form_payment_connection_response.schema.json",
    typeOutput: "functions/src/shared/generated/manageOrganizerFormPaymentConnectionCallableResponse.ts",
  },
  {
    name: "SubmitOrganizerFormResponseCallablePayload",
    source: "callables/submit_organizer_form_response_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitOrganizerFormResponseCallablePayload.ts",
  },
  {
    name: "SubmitOrganizerFormResponseCallableResponse",
    source:
      "callable_responses/" +
      "submit_organizer_form_response_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitOrganizerFormResponseCallableResponse.ts",
  },
  {
    name: "WithdrawOrganizerFormResponseCallablePayload",
    source:
      "callables/withdraw_organizer_form_response_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "withdrawOrganizerFormResponseCallablePayload.ts",
  },
  {
    name: "WithdrawOrganizerFormResponseCallableResponse",
    source:
      "callable_responses/" +
      "withdraw_organizer_form_response_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "withdrawOrganizerFormResponseCallableResponse.ts",
  },
  {
    name: "CreateOrganizerFormShareLinkCallablePayload",
    source:
      "callables/create_organizer_form_share_link_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createOrganizerFormShareLinkCallablePayload.ts",
  },
  {
    name: "CreateOrganizerFormShareLinkCallableResponse",
    source:
      "callable_responses/" +
      "create_organizer_form_share_link_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createOrganizerFormShareLinkCallableResponse.ts",
  },
  {
    name: "GetOrganizerFormShareAssetsCallablePayload",
    source:
      "callables/get_organizer_form_share_assets_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerFormShareAssetsCallablePayload.ts",
  },
  {
    name: "GetOrganizerFormShareAssetsCallableResponse",
    source:
      "callable_responses/" +
      "get_organizer_form_share_assets_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerFormShareAssetsCallableResponse.ts",
  },
  {
    name: "ListOrganizerFormResponsesCallablePayload",
    source: "callables/list_organizer_form_responses_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerFormResponsesCallablePayload.ts",
  },
  {
    name: "ListOrganizerFormResponsesCallableResponse",
    source:
      "callable_responses/list_organizer_form_responses_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerFormResponsesCallableResponse.ts",
  },
  {
    name: "GetOrganizerFormResponseDetailCallablePayload",
    source:
      "callables/get_organizer_form_response_detail_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerFormResponseDetailCallablePayload.ts",
  },
  {
    name: "GetOrganizerFormResponseDetailCallableResponse",
    source:
      "callable_responses/get_organizer_form_response_detail_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerFormResponseDetailCallableResponse.ts",
  },
  {
    name: "GetOrganizerFormAnalyticsCallablePayload",
    source: "callables/get_organizer_form_analytics_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerFormAnalyticsCallablePayload.ts",
  },
  {
    name: "GetOrganizerFormAnalyticsCallableResponse",
    source:
      "callable_responses/get_organizer_form_analytics_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerFormAnalyticsCallableResponse.ts",
  },
  {
    name: "RequestOrganizerFormExportCallablePayload",
    source: "callables/request_organizer_form_export_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/requestOrganizerFormExportCallablePayload.ts",
  },
  {
    name: "RequestOrganizerFormExportCallableResponse",
    source:
      "callable_responses/request_organizer_form_export_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/requestOrganizerFormExportCallableResponse.ts",
  },
  {
    name: "CreateOrganizerFormAutomationCallablePayload",
    source:
      "callables/create_organizer_form_automation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerFormAutomationCallablePayload.ts",
  },
  {
    name: "CreateOrganizerFormAutomationCallableResponse",
    source:
      "callable_responses/create_organizer_form_automation_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerFormAutomationCallableResponse.ts",
  },
  {
    name: "SetOrganizerFormAutomationStateCallablePayload",
    source:
      "callables/set_organizer_form_automation_state_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/setOrganizerFormAutomationStateCallablePayload.ts",
  },
  {
    name: "SetOrganizerFormAutomationStateCallableResponse",
    source:
      "callable_responses/set_organizer_form_automation_state_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/setOrganizerFormAutomationStateCallableResponse.ts",
  },
  {
    name: "ListOrganizerFormAutomationRunsCallablePayload",
    source:
      "callables/list_organizer_form_automation_runs_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerFormAutomationRunsCallablePayload.ts",
  },
  {
    name: "ListOrganizerFormAutomationRunsCallableResponse",
    source:
      "callable_responses/list_organizer_form_automation_runs_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerFormAutomationRunsCallableResponse.ts",
  },
  {
    name: "PreviewOrganizerFormConversionCallablePayload",
    source:
      "callables/preview_organizer_form_conversion_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/previewOrganizerFormConversionCallablePayload.ts",
  },
  {
    name: "PreviewOrganizerFormConversionCallableResponse",
    source:
      "callable_responses/preview_organizer_form_conversion_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/previewOrganizerFormConversionCallableResponse.ts",
  },
  {
    name: "ConvertOrganizerFormResponseCallablePayload",
    source:
      "callables/convert_organizer_form_response_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/convertOrganizerFormResponseCallablePayload.ts",
  },
  {
    name: "ConvertOrganizerFormResponseCallableResponse",
    source:
      "callable_responses/convert_organizer_form_response_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/convertOrganizerFormResponseCallableResponse.ts",
  },
  {
    name: "PublishOrganizerApplicationFormCallablePayload",
    source:
      "callables/publish_organizer_application_form_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "publishOrganizerApplicationFormCallablePayload.ts",
  },
  {
    name: "GetParticipantOrganizerApplicationFormCallablePayload",
    source:
      "callables/get_participant_organizer_application_form_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getParticipantOrganizerApplicationFormCallablePayload.ts",
  },
  {
    name: "GetParticipantOrganizerApplicationFormCallableResponse",
    source:
      "callable_responses/" +
      "get_participant_organizer_application_form_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getParticipantOrganizerApplicationFormCallableResponse.ts",
  },
  {
    name: "SubmitParticipantOrganizerApplicationCallablePayload",
    source:
      "callables/submit_participant_organizer_application_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitParticipantOrganizerApplicationCallablePayload.ts",
  },
  {
    name: "SubmitParticipantOrganizerApplicationCallableResponse",
    source:
      "callable_responses/" +
      "submit_participant_organizer_application_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitParticipantOrganizerApplicationCallableResponse.ts",
  },
  {
    name: "RevokeParticipantOrganizerDataGrantCallablePayload",
    source:
      "callables/revoke_participant_organizer_data_grant_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "revokeParticipantOrganizerDataGrantCallablePayload.ts",
  },
  {
    name: "RevokeParticipantOrganizerDataGrantCallableResponse",
    source:
      "callable_responses/" +
      "revoke_participant_organizer_data_grant_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "revokeParticipantOrganizerDataGrantCallableResponse.ts",
  },
  {
    name: "PublishOrganizerApplicationFormCallableResponse",
    source:
      "callable_responses/" +
      "publish_organizer_application_form_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "publishOrganizerApplicationFormCallableResponse.ts",
  },
  {
    name: "PreviewOrganizerApplicationImportCallablePayload",
    source:
      "callables/preview_organizer_application_import_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "previewOrganizerApplicationImportCallablePayload.ts",
  },
  {
    name: "PreviewOrganizerApplicationImportCallableResponse",
    source:
      "callable_responses/" +
      "preview_organizer_application_import_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "previewOrganizerApplicationImportCallableResponse.ts",
  },
  {
    name: "ImportOrganizerApplicationsCallablePayload",
    source: "callables/import_organizer_applications_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "importOrganizerApplicationsCallablePayload.ts",
  },
  {
    name: "ImportOrganizerApplicationsCallableResponse",
    source:
      "callable_responses/import_organizer_applications_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "importOrganizerApplicationsCallableResponse.ts",
  },
  {
    name: "ListOrganizerApplicationsCallablePayload",
    source: "callables/list_organizer_applications_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerApplicationsCallablePayload.ts",
  },
  {
    name: "ListOrganizerApplicationsCallableResponse",
    source:
      "callable_responses/list_organizer_applications_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerApplicationsCallableResponse.ts",
  },
  {
    name: "ListOrganizerAttentionItemsCallablePayload",
    source: "callables/list_organizer_attention_items_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerAttentionItemsCallablePayload.ts",
  },
  {
    name: "ListOrganizerAttentionItemsCallableResponse",
    source:
      "callable_responses/list_organizer_attention_items_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerAttentionItemsCallableResponse.ts",
  },
  {
    name: "GetOrganizerApplicationDetailCallablePayload",
    source:
      "callables/get_organizer_application_detail_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerApplicationDetailCallablePayload.ts",
  },
  {
    name: "GetOrganizerApplicationDetailCallableResponse",
    source:
      "callable_responses/" +
      "get_organizer_application_detail_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerApplicationDetailCallableResponse.ts",
  },
  {
    name: "ReviewOrganizerApplicationCallablePayload",
    source: "callables/review_organizer_application_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "reviewOrganizerApplicationCallablePayload.ts",
  },
  {
    name: "ReviewOrganizerApplicationCallableResponse",
    source:
      "callable_responses/review_organizer_application_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "reviewOrganizerApplicationCallableResponse.ts",
  },
  {
    name: "CreateOrganizerContactCallablePayload",
    source: "callables/create_organizer_contact_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerContactCallablePayload.ts",
  },
  {
    name: "CreateOrganizerContactCallableResponse",
    source:
      "callable_responses/create_organizer_contact_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createOrganizerContactCallableResponse.ts",
  },
  {
    name: "ListOrganizerContactsCallableResponse",
    source:
      "callable_responses/list_organizer_contacts_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listOrganizerContactsCallableResponse.ts",
  },
  {
    name: "GetOrganizerContactDetailCallablePayload",
    source: "callables/get_organizer_contact_detail_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerContactDetailCallablePayload.ts",
  },
  {
    name: "GetOrganizerContactDetailCallableResponse",
    source:
      "callable_responses/get_organizer_contact_detail_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/getOrganizerContactDetailCallableResponse.ts",
  },
  {
    name: "ResolveOrganizerCommunicationPlanCallablePayload",
    source:
      "callables/resolve_organizer_communication_plan_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "resolveOrganizerCommunicationPlanCallablePayload.ts",
  },
  {
    name: "ResolveOrganizerCommunicationPlanCallableResponse",
    source:
      "callable_responses/" +
      "resolve_organizer_communication_plan_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "resolveOrganizerCommunicationPlanCallableResponse.ts",
  },
  {
    name: "MutateOrganizerContactCallablePayload",
    source: "callables/mutate_organizer_contact_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/mutateOrganizerContactCallablePayload.ts",
  },
  {
    name: "MutateOrganizerContactCallableResponse",
    source: "callable_responses/mutate_organizer_contact_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/mutateOrganizerContactCallableResponse.ts",
  },
  {
    name: "CreateOrganizerContactNoteCallablePayload",
    source: "callables/create_organizer_contact_note_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createOrganizerContactNoteCallablePayload.ts",
  },
  {
    name: "MutateOrganizerContactNoteCallablePayload",
    source: "callables/mutate_organizer_contact_note_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "mutateOrganizerContactNoteCallablePayload.ts",
  },
  {
    name: "OrganizerContactNoteCallableResponse",
    source:
      "callable_responses/organizer_contact_note_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerContactNoteCallableResponse.ts",
  },
  {
    name: "RecordOrganizerContactOutreachCallablePayload",
    source:
      "callables/record_organizer_contact_outreach_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordOrganizerContactOutreachCallablePayload.ts",
  },
  {
    name: "OrganizerContactOutreachCallableResponse",
    source:
      "callable_responses/organizer_contact_outreach_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "organizerContactOutreachCallableResponse.ts",
  },
  {
    name: "ExportOrganizerContactsCallablePayload",
    source: "callables/export_organizer_contacts_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/exportOrganizerContactsCallablePayload.ts",
  },
  {
    name: "ExportOrganizerContactsCallableResponse",
    source: "callable_responses/export_organizer_contacts_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/exportOrganizerContactsCallableResponse.ts",
  },
  {
    name: "MergeOrganizerContactsCallablePayload",
    source: "callables/merge_organizer_contacts_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/mergeOrganizerContactsCallablePayload.ts",
  },
  {
    name: "ListOrganizerContactMergeCandidatesCallablePayload",
    source:
      "callables/list_organizer_contact_merge_candidates_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerContactMergeCandidatesCallablePayload.ts",
  },
  {
    name: "ListOrganizerContactMergeCandidatesCallableResponse",
    source:
      "callable_responses/" +
      "list_organizer_contact_merge_candidates_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerContactMergeCandidatesCallableResponse.ts",
  },
  {
    name: "ReviewOrganizerContactMergeCandidateCallablePayload",
    source:
      "callables/review_organizer_contact_merge_candidate_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "reviewOrganizerContactMergeCandidateCallablePayload.ts",
  },
  {
    name: "ReviewOrganizerContactMergeCandidateCallableResponse",
    source:
      "callable_responses/" +
      "review_organizer_contact_merge_candidate_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "reviewOrganizerContactMergeCandidateCallableResponse.ts",
  },
  {
    name: "ListOrganizerWhatsappThreadsCallablePayload",
    source: "callables/list_organizer_whatsapp_threads_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerWhatsappThreadsCallablePayload.ts",
  },
  {
    name: "ListOrganizerWhatsappThreadsCallableResponse",
    source:
      "callable_responses/list_organizer_whatsapp_threads_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "listOrganizerWhatsappThreadsCallableResponse.ts",
  },
  {
    name: "GetOrganizerWhatsappThreadCallablePayload",
    source: "callables/get_organizer_whatsapp_thread_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerWhatsappThreadCallablePayload.ts",
  },
  {
    name: "GetOrganizerWhatsappThreadCallableResponse",
    source:
      "callable_responses/get_organizer_whatsapp_thread_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getOrganizerWhatsappThreadCallableResponse.ts",
  },
  {
    name: "SendOrganizerWhatsappReplyCallablePayload",
    source: "callables/send_organizer_whatsapp_reply_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "sendOrganizerWhatsappReplyCallablePayload.ts",
  },
  {
    name: "SendOrganizerWhatsappReplyCallableResponse",
    source:
      "callable_responses/send_organizer_whatsapp_reply_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "sendOrganizerWhatsappReplyCallableResponse.ts",
  },
  {
    name: "UnmergeOrganizerContactsCallablePayload",
    source: "callables/unmerge_organizer_contacts_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/unmergeOrganizerContactsCallablePayload.ts",
  },
  {
    name: "MutateOrganizerContactMergeCallableResponse",
    source:
      "callable_responses/mutate_organizer_contact_merge_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "mutateOrganizerContactMergeCallableResponse.ts",
  },
  {
    name: "EventJoinRequestDecisionCallablePayload",
    source: "callables/event_join_request_decision_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventJoinRequestDecisionCallablePayload.ts",
  },
  {
    name: "OverrideEventSuccessRotationsCallablePayload",
    source: "callables/override_event_success_rotations_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "overrideEventSuccessRotationsCallablePayload.ts",
  },
  {
    name: "PrepareEventSuccessRotationDraftCallablePayload",
    source:
      "callables/prepare_event_success_rotation_draft_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "prepareEventSuccessRotationDraftCallablePayload.ts",
  },
  {
    name: "PublishEventSuccessRotationRoundCallablePayload",
    source:
      "callables/publish_event_success_rotation_round_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "publishEventSuccessRotationRoundCallablePayload.ts",
  },
  {
    name: "EventSuccessLiveActionCallablePayload",
    source: "callables/event_success_live_action_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "eventSuccessLiveActionCallablePayload.ts",
  },
  {
    name: "SetEventSuccessAccountabilityResolutionCallablePayload",
    source:
      "callables/" +
      "set_event_success_accountability_resolution_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setEventSuccessAccountabilityResolutionCallablePayload.ts",
  },
  {
    name: "RecordEventSuccessUnitOutcomesCallablePayload",
    source:
      "callables/record_event_success_unit_outcomes_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordEventSuccessUnitOutcomesCallablePayload.ts",
  },
  {
    name: "RecordEventSuccessUnitOutcomesCallableResponse",
    source:
      "callable_responses/" +
      "record_event_success_unit_outcomes_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "recordEventSuccessUnitOutcomesCallableResponse.ts",
  },
  {
    name: "HeartbeatEventSuccessPresenceCallablePayload",
    source:
      "callables/heartbeat_event_success_presence_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "heartbeatEventSuccessPresenceCallablePayload.ts",
  },
  {
    name: "HeartbeatEventSuccessPresenceCallableResponse",
    source:
      "callable_responses/" +
      "heartbeat_event_success_presence_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "heartbeatEventSuccessPresenceCallableResponse.ts",
  },
  {
    name: "PublishEventLivePositionCallablePayload",
    source: "callables/publish_event_live_position_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "publishEventLivePositionCallablePayload.ts",
  },
  {
    name: "PublishEventLivePositionCallableResponse",
    source:
      "callable_responses/publish_event_live_position_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "publishEventLivePositionCallableResponse.ts",
  },
  {
    name: "GetEventSuccessPresenceSummaryCallableResponse",
    source:
      "callable_responses/" +
      "get_event_success_presence_summary_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getEventSuccessPresenceSummaryCallableResponse.ts",
  },
  {
    name: "ResolveEventSuccessLateArrivalCallablePayload",
    source:
      "callables/resolve_event_success_late_arrival_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "resolveEventSuccessLateArrivalCallablePayload.ts",
  },
  {
    name: "ResolveEventSuccessLateArrivalCallableResponse",
    source:
      "callable_responses/" +
      "resolve_event_success_late_arrival_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "resolveEventSuccessLateArrivalCallableResponse.ts",
  },
  {
    name: "OverrideEventSuccessGroupsCallablePayload",
    source: "callables/override_event_success_groups_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "overrideEventSuccessGroupsCallablePayload.ts",
  },
  {
    name: "SubmitEventSuccessWingmanRequestCallablePayload",
    source:
      "callables/submit_event_success_wingman_request_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "submitEventSuccessWingmanRequestCallablePayload.ts",
  },
  {
    name: "StartEventSuccessFirstHelloMissionCallablePayload",
    source:
      "callables/start_event_success_first_hello_mission_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "startEventSuccessFirstHelloMissionCallablePayload.ts",
  },
  {
    name: "CompleteEventSuccessFirstHelloMissionCallablePayload",
    source:
      "callables/complete_event_success_first_hello_mission_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "completeEventSuccessFirstHelloMissionCallablePayload.ts",
  },
  {
    name: "MarkEventAttendanceCallableResponse",
    source: "callable_responses/mark_event_attendance_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/markEventAttendanceCallableResponse.ts",
  },
  {
    name: "SelfCheckInAttendanceCallablePayload",
    source: "callables/self_check_in_attendance_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/selfCheckInAttendanceCallablePayload.ts",
  },
  {
    name: "CreateEventReviewCallablePayload",
    source: "callables/create_event_review_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createEventReviewCallablePayload.ts",
  },
  {
    name: "CreatePublicClubReviewCallablePayload",
    source: "callables/create_public_club_review_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createPublicClubReviewCallablePayload.ts",
  },
  {
    name: "CreatePublicClubReviewCallableResponse",
    source: "callable_responses/create_public_club_review_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createPublicClubReviewCallableResponse.ts",
  },
  {
    name: "ListPublicClubReviewsCallablePayload",
    source: "callables/list_public_club_reviews_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listPublicClubReviewsCallablePayload.ts",
  },
  {
    name: "ListPublicClubReviewsCallableResponse",
    source: "callable_responses/list_public_club_reviews_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listPublicClubReviewsCallableResponse.ts",
  },
  {
    name: "CreatePublicOrganizerReviewCallablePayload",
    source: "callables/create_public_organizer_review_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createPublicOrganizerReviewCallablePayload.ts",
  },
  {
    name: "CreatePublicOrganizerReviewCallableResponse",
    source:
      "callable_responses/create_public_organizer_review_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/createPublicOrganizerReviewCallableResponse.ts",
  },
  {
    name: "ListPublicOrganizerReviewsCallablePayload",
    source: "callables/list_public_organizer_reviews_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/listPublicOrganizerReviewsCallablePayload.ts",
  },
  {
    name: "ListPublicOrganizerReviewsCallableResponse",
    source:
      "callable_responses/list_public_organizer_reviews_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listPublicOrganizerReviewsCallableResponse.ts",
  },
  {
    name: "UpdateEventReviewCallablePayload",
    source: "callables/update_event_review_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/updateEventReviewCallablePayload.ts",
  },
  {
    name: "DeleteEventReviewCallablePayload",
    source: "callables/delete_event_review_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/deleteEventReviewCallablePayload.ts",
  },
  {
    name: "SetReviewResponseCallablePayload",
    source: "callables/set_review_response_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/setReviewResponseCallablePayload.ts",
  },
  {
    name: "BlockUserCallablePayload",
    source: "callables/block_user_payload.schema.json",
    typeOutput: "functions/src/shared/generated/blockUserCallablePayload.ts",
  },
  {
    name: "UnblockUserCallablePayload",
    source: "callables/unblock_user_payload.schema.json",
    typeOutput: "functions/src/shared/generated/unblockUserCallablePayload.ts",
  },
  {
    name: "ReportUserCallablePayload",
    source: "callables/report_user_payload.schema.json",
    typeOutput: "functions/src/shared/generated/reportUserCallablePayload.ts",
  },
  {
    name: "RequestSuvbotDemoOperationCallablePayload",
    source: "callables/request_suvbot_demo_operation_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "requestSuvbotDemoOperationCallablePayload.ts",
  },
  {
    name: "ListSuvbotDemoActionsCallableResponse",
    source: "callable_responses/list_suvbot_demo_actions_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/listSuvbotDemoActionsCallableResponse.ts",
  },
  {
    name: "VerifyRazorpayPaymentCallablePayload",
    source: "callables/verify_razorpay_payment_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/verifyRazorpayPaymentCallablePayload.ts",
  },
  {
    name: "EventBookingCallablePayload",
    source: "callables/event_booking_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/eventBookingCallablePayload.ts",
  },
  {
    name: "CreateRazorpayOrderCallablePayload",
    source: "callables/create_razorpay_order_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/createRazorpayOrderCallablePayload.ts",
  },
  {
    name: "RazorpayOrderCallableResponse",
    source: "callable_responses/razorpay_order_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/razorpayOrderCallableResponse.ts",
  },
  {
    name: "CreateStripeCheckoutSessionCallablePayload",
    source: "callables/create_stripe_checkout_session_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createStripeCheckoutSessionCallablePayload.ts",
  },
  {
    name: "StripeCheckoutSessionCallableResponse",
    source: "callable_responses/stripe_checkout_session_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "stripeCheckoutSessionCallableResponse.ts",
  },
  {
    name: "CreateStripeHostOnboardingLinkCallablePayload",
    source: "callables/create_stripe_host_onboarding_link_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createStripeHostOnboardingLinkCallablePayload.ts",
  },
  {
    name: "RefreshStripeHostPaymentAccountCallablePayload",
    source:
      "callables/refresh_stripe_host_payment_account_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "refreshStripeHostPaymentAccountCallablePayload.ts",
  },
  {
    name: "CreateRazorpayHostPaymentAccountCallablePayload",
    source:
      "callables/create_razorpay_host_payment_account_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "createRazorpayHostPaymentAccountCallablePayload.ts",
  },
  {
    name: "RefreshRazorpayHostPaymentAccountCallablePayload",
    source:
      "callables/refresh_razorpay_host_payment_account_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "refreshRazorpayHostPaymentAccountCallablePayload.ts",
  },
  {
    name: "StripeHostOnboardingLinkCallableResponse",
    source:
      "callable_responses/stripe_host_onboarding_link_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "stripeHostOnboardingLinkCallableResponse.ts",
  },
  {
    name: "PlacesAutocompleteCallablePayload",
    source: "callables/places_autocomplete_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/placesAutocompleteCallablePayload.ts",
  },
  {
    name: "PlacesAutocompleteCallableResponse",
    source: "callable_responses/places_autocomplete_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/placesAutocompleteCallableResponse.ts",
  },
  {
    name: "PlaceDetailsCallablePayload",
    source: "callables/place_details_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/placeDetailsCallablePayload.ts",
  },
  {
    name: "PlaceDetailsCallableResponse",
    source: "callable_responses/place_details_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/placeDetailsCallableResponse.ts",
  },
  {
    name: "ExploreSearchCallablePayload",
    source: "callables/explore_search_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/exploreSearchCallablePayload.ts",
  },
  {
    name: "ExploreSearchCallableResponse",
    source: "callable_responses/explore_search_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/exploreSearchCallableResponse.ts",
  },
  {
    name: "WebsiteHostListingProjection",
    source: "public/website_host_listing_projection.schema.json",
    typeOutput:
      "functions/src/shared/generated/websiteHostListingProjection.ts",
  },
  {
    name: "FetchEventSuccessWingmanCandidatesCallableResponse",
    source:
      "callable_responses/fetch_event_success_wingman_candidates_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "fetchEventSuccessWingmanCandidatesCallableResponse.ts",
  },
  {
    name: "FetchSwipeCandidatesCallableResponse",
    source: "callable_responses/fetch_swipe_candidates_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/fetchSwipeCandidatesCallableResponse.ts",
  },
  {
    name: "SetCrossPathsEventConsentCallableResponse",
    source:
      "callable_responses/set_cross_paths_event_consent_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "setCrossPathsEventConsentCallableResponse.ts",
  },
  {
    name: "GetCrossPathsSuggestionsCallableResponse",
    source:
      "callable_responses/get_cross_paths_suggestions_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "getCrossPathsSuggestionsCallableResponse.ts",
  },
  {
    name: "SendCrossPathsInvitationCallableResponse",
    source:
      "callable_responses/send_cross_paths_invitation_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "sendCrossPathsInvitationCallableResponse.ts",
  },
  {
    name: "RespondCrossPathsInvitationCallableResponse",
    source:
      "callable_responses/respond_cross_paths_invitation_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "respondCrossPathsInvitationCallableResponse.ts",
  },
  {
    name: "CancelCrossPathsInvitationOrPlanCallableResponse",
    source:
      "callable_responses/" +
      "cancel_cross_paths_invitation_or_plan_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "cancelCrossPathsInvitationOrPlanCallableResponse.ts",
  },
  {
    name: "CreateProfileDecisionClientWrite",
    source: "client_writes/create_profile_decision.schema.json",
    typeOutput:
      "functions/src/shared/generated/createProfileDecisionClientWrite.ts",
  },
  {
    name: "CreateChatMessageClientWrite",
    source: "client_writes/create_chat_message.schema.json",
    typeOutput:
      "functions/src/shared/generated/createChatMessageClientWrite.ts",
  },
  {
    name: "CreateSavedEventClientWrite",
    source: "client_writes/create_saved_event.schema.json",
    typeOutput:
      "functions/src/shared/generated/createSavedEventClientWrite.ts",
  },
  {
    name: "DeleteSavedEventClientWrite",
    source: "client_writes/delete_saved_event.schema.json",
    typeOutput:
      "functions/src/shared/generated/deleteSavedEventClientWrite.ts",
  },
  {
    name: "MarkNotificationReadClientWrite",
    source: "client_writes/mark_notification_read.schema.json",
    typeOutput:
      "functions/src/shared/generated/markNotificationReadClientWrite.ts",
  },
  {
    name: "ResetMatchUnreadCountClientWrite",
    source: "client_writes/reset_match_unread_count.schema.json",
    typeOutput:
      "functions/src/shared/generated/resetMatchUnreadCountClientWrite.ts",
  },
  {
    name: "AdminGetOverviewCallablePayload",
    source: "callables/admin_get_overview_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminGetOverviewCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/adminGetOverviewCallablePayload.ts",
    ],
  },
  {
    name: "AdminGetOverviewCallableResponse",
    source: "callable_responses/admin_get_overview_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminGetOverviewCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/adminGetOverviewCallableResponse.ts",
    ],
  },
  {
    name: "AdminDecideAccessApplicationCallablePayload",
    source:
      "callables/admin_decide_access_application_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminDecideAccessApplicationCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminDecideAccessApplicationCallablePayload.ts",
    ],
  },
  {
    name: "AdminDecideAccessApplicationCallableResponse",
    source:
      "callable_responses/" +
      "admin_decide_access_application_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminDecideAccessApplicationCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminDecideAccessApplicationCallableResponse.ts",
    ],
  },
  {
    name: "AdminSetAdminUserRolesCallablePayload",
    source: "callables/admin_set_admin_user_roles_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminSetAdminUserRolesCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/adminSetAdminUserRolesCallablePayload.ts",
    ],
  },
  {
    name: "AdminSetAdminUserRolesCallableResponse",
    source:
      "callable_responses/admin_set_admin_user_roles_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/adminSetAdminUserRolesCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/adminSetAdminUserRolesCallableResponse.ts",
    ],
  },
  {
    name: "AdminDecideSafetyTriageItemCallablePayload",
    source:
      "callables/admin_decide_safety_triage_item_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminDecideSafetyTriageItemCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminDecideSafetyTriageItemCallablePayload.ts",
    ],
  },
  {
    name: "AdminDecideSafetyTriageItemCallableResponse",
    source:
      "callable_responses/" +
      "admin_decide_safety_triage_item_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminDecideSafetyTriageItemCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminDecideSafetyTriageItemCallableResponse.ts",
    ],
  },
  {
    name: "AdminAssignSafetyTriageItemCallablePayload",
    source:
      "callables/admin_assign_safety_triage_item_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminAssignSafetyTriageItemCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminAssignSafetyTriageItemCallablePayload.ts",
    ],
  },
  {
    name: "AdminAssignSafetyTriageItemCallableResponse",
    source:
      "callable_responses/" +
      "admin_assign_safety_triage_item_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminAssignSafetyTriageItemCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminAssignSafetyTriageItemCallableResponse.ts",
    ],
  },
  {
    name: "AdminCreateOrganizerDraftFromCandidateCallablePayload",
    source:
      "callables/" +
      "admin_create_organizer_draft_from_candidate_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminCreateOrganizerDraftFromCandidateCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminCreateOrganizerDraftFromCandidateCallablePayload.ts",
    ],
  },
  {
    name: "AdminCreateOrganizerDraftFromCandidateCallableResponse",
    source:
      "callable_responses/" +
      "admin_create_organizer_draft_from_candidate_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminCreateOrganizerDraftFromCandidateCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminCreateOrganizerDraftFromCandidateCallableResponse.ts",
    ],
  },
  {
    name: "AdminCreateMarketingContentDraftCallablePayload",
    source:
      "callables/admin_create_marketing_content_draft_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminCreateMarketingContentDraftCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminCreateMarketingContentDraftCallablePayload.ts",
    ],
  },
  {
    name: "AdminCreateMarketingContentDraftCallableResponse",
    source:
      "callable_responses/" +
      "admin_create_marketing_content_draft_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminCreateMarketingContentDraftCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminCreateMarketingContentDraftCallableResponse.ts",
    ],
  },
  {
    name: "AdminRecordMarketingReviewDecisionCallablePayload",
    source:
      "callables/" +
      "admin_record_marketing_review_decision_payload.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminRecordMarketingReviewDecisionCallablePayload.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminRecordMarketingReviewDecisionCallablePayload.ts",
    ],
  },
  {
    name: "AdminRecordMarketingReviewDecisionCallableResponse",
    source:
      "callable_responses/" +
      "admin_record_marketing_review_decision_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminRecordMarketingReviewDecisionCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminRecordMarketingReviewDecisionCallableResponse.ts",
    ],
  },
  {
    name: "AdminListCrossPathsShowcaseCandidatesCallableResponse",
    source:
      "callable_responses/" +
      "admin_list_cross_paths_showcase_candidates_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminListCrossPathsShowcaseCandidatesCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminListCrossPathsShowcaseCandidatesCallableResponse.ts",
    ],
  },
  {
    name: "AdminSetCrossPathsShowcaseEligibilityCallableResponse",
    source:
      "callable_responses/" +
      "admin_set_cross_paths_showcase_eligibility_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/" +
      "adminSetCrossPathsShowcaseEligibilityCallableResponse.ts",
    additionalTypeOutputs: [
      "admin/src/generated/contracts/" +
      "adminSetCrossPathsShowcaseEligibilityCallableResponse.ts",
    ],
  },
  {
    name: "HostAcquisitionConsentHTTPRequest",
    source: "http/host_acquisition_consent_request.schema.json",
    typeOutput:
      "functions/src/shared/generated/hostAcquisitionConsentHttpRequest.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/hostAcquisitionConsentHttpRequest.ts",
    ],
  },
  {
    name: "HostAcquisitionConsentHTTPResponse",
    source: "http/host_acquisition_consent_response.schema.json",
    typeOutput:
      "functions/src/shared/generated/hostAcquisitionConsentHttpResponse.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/hostAcquisitionConsentHttpResponse.ts",
    ],
  },
  {
    name: "JoinWaitlistHTTPRequest",
    source: "http/join_waitlist_request.schema.json",
    typeOutput: "functions/src/shared/generated/joinWaitlistHttpRequest.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/joinWaitlistHttpRequest.ts",
    ],
  },
  {
    name: "JoinWaitlistHTTPResponse",
    source: "http/join_waitlist_response.schema.json",
    typeOutput: "functions/src/shared/generated/joinWaitlistHttpResponse.ts",
    additionalTypeOutputs: [
      "website/src/shared/contracts/generated/joinWaitlistHttpResponse.ts",
    ],
  },
];

const FIRESTORE_ADMIN_EMBEDDED_SPECS = [
  {
    name: "Gender",
    source: "shared/profile_common.schema.json",
    pointer: "/definitions/gender",
  },
  {
    name: "PaymentStatus",
    source: "firestore/payments.schema.json",
    pointer: "/properties/status",
  },
  {
    name: "ProfilePromptAnswer",
    source: "embedded/profile_prompt_answer.schema.json",
  },
  {
    name: "PhotoPromptAnswer",
    source: "embedded/photo_prompt_answer.schema.json",
  },
  {
    name: "ProfilePhoto",
    source: "embedded/profile_photo.schema.json",
  },
  {
    name: "UploadedPhoto",
    source: "embedded/uploaded_photo.schema.json",
  },
  {
    name: "ActivityPreferences",
    source: "embedded/activity_preferences.schema.json",
  },
  {
    name: "OrganizerSupplyCapabilities",
    source: "embedded/organizer_supply_capabilities.schema.json",
  },
  {
    name: "EventMeetingLocation",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventMeetingLocation",
  },
  {
    name: "EventFormatSnapshot",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventFormatSnapshot",
  },
  {
    name: "EventSuccessFormatPrimitives",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessFormatPrimitives",
  },
  {
    name: "EventSuccessStructureConfig",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessStructureConfig",
  },
  {
    name: "EventSuccessQuestionnaireConfig",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessQuestionnaireConfig",
  },
  {
    name: "EventSuccessDefaults",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessDefaults",
  },
  {
    name: "EventPolicyDefaults",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyDefaults",
  },
  {
    name: "ClubHostDefaults",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/clubHostDefaults",
  },
  {
    name: "ClubHostProfile",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/clubHostProfile",
  },
  {
    name: "EventConstraints",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventConstraints",
  },
  {
    name: "EventPolicyBundleDocument",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyBundle",
  },
  {
    name: "EventPolicyAdmissionDocument",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyBundle/properties/admission",
  },
  {
    name: "EventPolicyPrivateAccessDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/admission/" +
      "properties/privateAccessPolicy",
  },
  {
    name: "EventPolicyWaitlistDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/admission/" +
      "properties/waitlistPolicy",
  },
  {
    name: "EventPolicyBalancedRatioDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/admission/" +
      "properties/balancedRatioPolicy",
  },
  {
    name: "EventPolicyPricingDocument",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyBundle/properties/pricing",
  },
  {
    name: "EventPolicyDemandPricingRuleDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/pricing/" +
      "properties/demandPricingRules/items",
  },
];

const FIRESTORE_ADMIN_FIELD_OVERRIDES = new Map([
  ["ClubDocument.hostProfiles", "ClubHostProfile[]"],
  ["ClubDocument.hostDefaults", "ClubHostDefaults"],
  ["EventDocument.meetingLocation", "EventMeetingLocation"],
  ["EventDocument.eventFormat", "EventFormatSnapshot"],
  ["EventDocument.constraints", "EventConstraints"],
  ["EventDocument.eventPolicy", "EventPolicyBundleDocument | null"],
  ["EventFormatSnapshot.version", "number"],
  [
    "EventFormatSnapshot.eventSuccessPrimitives",
    "EventSuccessFormatPrimitives",
  ],
  ["EventSuccessDefaults.structureConfig", "EventSuccessStructureConfig"],
  [
    "EventSuccessDefaults.questionnaireConfig",
    "EventSuccessQuestionnaireConfig",
  ],
  ["ClubHostDefaults.eventPolicy", "EventPolicyDefaults"],
  ["ClubHostDefaults.eventSuccess", "EventSuccessDefaults"],
  [
    "ClubHostDefaults.eventSuccessByActivityKind",
    "Record<string, EventSuccessDefaults>",
  ],
  ["EventPolicyBundleDocument.version", "number"],
  ["EventPolicyBundleDocument.admission", "EventPolicyAdmissionDocument"],
  ["EventPolicyBundleDocument.pricing", "EventPolicyPricingDocument"],
  ["EventPolicyAdmissionDocument.waitlistPolicy", "EventPolicyWaitlistDocument"],
  [
    "EventPolicyAdmissionDocument.privateAccessPolicy",
    "EventPolicyPrivateAccessDocument",
  ],
  [
    "EventPolicyAdmissionDocument.balancedRatioPolicy",
    "EventPolicyBalancedRatioDocument | null",
  ],
  ["EventPolicyPricingDocument.demandPricingRules", "EventPolicyDemandPricingRuleDocument[]"],
]);

const FIRESTORE_ADMIN_OPTIONAL_FIELDS = new Map([
  ["EventConstraints", ["maxMen", "maxWomen"]],
  [
    "EventDocument",
    [
      "locationDetails",
      "bookedCount",
      "checkedInCount",
      "waitlistedCount",
      "cancelledAt",
      "cancellationReason",
    ],
  ],
  [
    "MatchDocument",
    [
      "lastMessageAt",
      "lastMessagePreview",
      "lastMessageSenderId",
      "blockedBy",
      "blockedAt",
    ],
  ],
  [
    "EventPolicyAdmissionDocument",
    [
      "waitlistPolicy",
      "inviteRequired",
      "membershipRequired",
      "manualApprovalRequired",
      "privateAccessPolicy",
      "cohortCapacityLimits",
      "balancedRatioPolicy",
    ],
  ],
  [
    "EventPolicyPricingDocument",
    [
      "cohortAdjustmentsInPaise",
      "demandPricingRules",
    ],
  ],
]);

const generatedFiles = [];

async function main() {
  generatedFiles.push(...profileRequirementsOutputs(
    readContractJson("catalogs/profile_requirements.json"),
    readContractJson("firestore/users.schema.json")
  ));
  const profileCatalog = readContractJson("catalogs/profile_prompts.json");
  const personFieldCatalog = readContractJson("catalogs/person_fields.json");
  const organizerFormTemplateCatalog = readContractJson(
    "catalogs/organizer_form_templates.json"
  );
  assertOrganizerFormTemplateCatalog(organizerFormTemplateCatalog);
  const hostAttentionPolicyCatalog = readContractJson(
    "catalogs/host_attention_policies.json"
  );
  const organizerEntitlementSkuCatalog = readContractJson(
    "catalogs/organizer_entitlement_skus.json"
  );
  const eventSuccessMomentPresentationCatalog = readContractJson(
    "catalogs/event_success_moment_presentations.json"
  );
  assertEventSuccessMomentPresentationCatalog(
    eventSuccessMomentPresentationCatalog
  );
  const profilePhotoPolicy = readContractJson(
    "catalogs/profile_photo_policy.json"
  );
  const photoCatalog = withProfilePhotoPolicy(
    readContractJson("catalogs/photo_prompts.json"),
    profilePhotoPolicy
  );
  const profileDecisionMigration = readContractJson(
    "migrations/swipes_to_profile_decisions.json"
  );
  const eventAssistanceCatalog = readContractJson(
    "catalogs/event_assistance_workflows.json"
  );
  const eventAssistanceCommandBindingCatalog = readContractJson(
    "catalogs/event_assistance_command_bindings.json"
  );
  const assistanceCommon = readContractJson(
    "shared/event_assistance_common.schema.json"
  );
  const workflowKinds = assistanceCommon.definitions.workflowKind.enum;
  const commandSchema = resolveRefs(assistanceCommon.definitions.Command,
    path.join(contractRoot, "shared/event_assistance_common.schema.json"),
    false);
  const commandKinds = commandSchema.oneOf.map(
    (variant) => variant.properties.kind.const
  );
  const commandCoverageFields = new Set(["intent"]);
  for (const row of eventAssistanceCommandBindingCatalog.definitions) {
    for (const mode of [row.live, row.rehearsal]) {
      if (mode.coverage?.variantField) {
        commandCoverageFields.add(mode.coverage.variantField);
      }
    }
  }
  const commandCoverageVariants = [...new Set(commandSchema.oneOf.flatMap(
    (variant) => [...commandCoverageFields].flatMap((field) =>
      variant.properties.payload?.properties?.[field]?.enum ?? [])
  ))];
  addTextOutput(
    "lib/core/schema_contracts/generated/event_assistance_kinds.g.dart",
    renderDartEventAssistanceCatalog({
      catalog: eventAssistanceCatalog,
      commandBindingCatalog: eventAssistanceCommandBindingCatalog,
      workflowKinds,
      commandKinds,
      coverageVariants: commandCoverageVariants,
    })
  );
  const bundledSchemas = new Map();

  for (const spec of schemaSpecs) {
    const file = path.join(contractRoot, spec.source);
    const schema = applyProfilePhotoPolicy(
      bundleSchema(file),
      profilePhotoPolicy
    );
    bundledSchemas.set(spec.name, schema);
    await addTypeOutput(spec, schema);
  }

  addTextOutput(
    "functions/src/shared/generated/schemaRegistry.ts",
    renderTsSchemaRegistry({
      schemaMap: bundledSchemas,
      eventAssistanceCatalog,
      eventAssistanceCommandBindingCatalog,
      profileCatalog,
      personFieldCatalog,
      organizerFormTemplateCatalog,
      hostAttentionPolicyCatalog,
      organizerEntitlementSkuCatalog,
      photoCatalog,
      profilePhotoPolicy,
    })
  );
  addTextOutput(
    "functions/src/shared/generated/schemaValidators.ts",
    renderTsValidators()
  );
  addTextOutput(
    "functions/src/shared/generated/firestoreAdminTypes.ts",
    await renderTsFirestoreAdminTypes({
      schemaSpecs,
      profilePhotoPolicy,
    })
  );
  addTextOutput(
    "functions/src/shared/generated/schemaPaths.ts",
    renderTsPathConstants({
      profileDecisionSchema: bundledSchemas.get("SwipeDocument"),
      profileDecisionMigration,
    })
  );
  addTextOutput(
    "tool/contracts/generated/schema_contract_registry.mjs",
    renderToolSchemaRegistry({
      schemaMap: bundledSchemas,
      eventAssistanceCatalog,
      eventAssistanceCommandBindingCatalog,
      profileCatalog,
      personFieldCatalog,
      organizerFormTemplateCatalog,
      hostAttentionPolicyCatalog,
      organizerEntitlementSkuCatalog,
      photoCatalog,
      profilePhotoPolicy,
    })
  );
  addTextOutput(
    "tool/contracts/generated/schema_contract_validators.mjs",
    renderToolValidators()
  );
  const eventDisplayProperties = bundledSchemas.get("WebsiteHostListingProjection")
    .definitions.catchEvent.properties;
  addTextOutput(
    "website/src/shared/contracts/generated/publicEventDisplaySchemas.ts",
    "// GENERATED CODE - DO NOT MODIFY BY HAND.\n" +
    "// Regenerate with: node tool/contracts/generate_schema_contracts.mjs\n" +
    "export const publicEventDisplaySchemas = " + JSON.stringify({
      photoUrl: eventDisplayProperties.photoUrl,
      meetingLocation: eventDisplayProperties.meetingLocation,
      itinerary: eventDisplayProperties.itinerary,
    }, null, 2) + " as const;\n"
  );
  addTextOutput(
    "website/src/shared/contracts/generated/joinWaitlistSchemas.ts",
    renderWebsiteJoinWaitlistSchemas({
      requestSchema: bundledSchemas.get("JoinWaitlistHTTPRequest"),
      responseSchema: bundledSchemas.get("JoinWaitlistHTTPResponse"),
    })
  );
  addTextOutput(
    "functions/src/shared/generated/eventSuccessMomentPresentations.ts",
    renderTsEventSuccessMomentPresentations(
      eventSuccessMomentPresentationCatalog
    )
  );
  addTextOutput(
    "lib/core/schema_contracts/generated/" +
      "event_success_moment_presentations.g.dart",
    renderDartEventSuccessMomentPresentations(
      eventSuccessMomentPresentationCatalog
    )
  );
  addTextOutput(
    "lib/core/schema_contracts/generated/profile_schema_contracts.g.dart",
    renderDartContracts({
      profileCatalog,
      personFieldCatalog,
      photoCatalog,
      profilePhotoPolicy,
      profilePromptSchema: bundledSchemas.get("ProfilePromptAnswer"),
      photoPromptSchema: bundledSchemas.get("PhotoPromptAnswer"),
      profilePhotoSchema: bundledSchemas.get("ProfilePhoto"),
      updateUserProfileSchema: bundledSchemas.get(
        "UpdateUserProfileCallablePayload"
      ),
      profileDecisionSchema: bundledSchemas.get("SwipeDocument"),
      profileDecisionMigration,
      commonSchema: readContractJson("shared/profile_common.schema.json"),
    })
  );
  const dartSchemaContracts = renderDartSchemaContracts({
    schemaMap: bundledSchemas,
  });
  addTextOutput(
    "lib/core/schema_contracts/generated/schema_contracts.g.dart",
    dartSchemaContracts.text
  );
  for (const file of dartSchemaContracts.files) {
    addTextOutput(file.path, file.content);
  }

  addTextOutput(
    "lib/core/schema_contracts/generated/field_constraints.g.dart",
    renderDartFieldConstraints({
      schemaSpecs,
      schemaMap: bundledSchemas,
    })
  );

  const dartCallableRequests = renderDartCallableRequestClasses({
    schemaSpecs,
    schemaMap: bundledSchemas,
    commonSchema: readContractJson("shared/profile_common.schema.json"),
  });
  addTextOutput(
    "lib/core/schema_contracts/generated/callable_request_dtos.g.dart",
    dartCallableRequests.text
  );
  for (const file of dartCallableRequests.files) {
    addTextOutput(file.path, file.content);
  }
  addTextOutput(
    "lib/core/schema_contracts/generated/INDEX.md",
    renderGeneratedIndex({dartSchemaContracts, dartCallableRequests})
  );
  if (!checkOnly && dartCallableRequests.ungenerable.length > 0) {
    console.log(
      `[callable_request_dtos.g.dart] ${dartCallableRequests.ungenerable.length} ` +
      `schemas not yet generatable (hand-written callable helpers still own them):`
    );
    for (const entry of dartCallableRequests.ungenerable) {
      console.log(`  - ${entry.name}: ${entry.reason}`);
    }
  }

  const staleFiles = publishSchemaOutputs({
    root: repoRoot, files: generatedFiles, checkOnly,
  });

  if (staleFiles.length > 0) {
    console.error("Generated schema contract outputs are stale:");
    for (const file of staleFiles) console.error(`- ${file}`);
    console.error("Run: node tool/contracts/generate_schema_contracts.mjs");
    process.exitCode = 1;
    return;
  }

  console.log(
    checkOnly ?
      "Generated schema contract outputs are current." :
      `Generated ${generatedFiles.length} schema contract files.`
  );
}

/** Check or publish only this generator's declared outputs and exclusive dirs. */
export function publishSchemaOutputs({root, files, checkOnly}) {
  const staleFiles = [];
  const expectedFiles = new Set(files.map((file) => file.path));
  const ownedDirectories = [
    "functions/src/shared/generated/schemas",
    "functions/src/shared/generated/validators",
    "functions/src/shared/generated/catalogs",
    ...(checkOnly ? [DART_SCHEMA_OUTPUT_DIR, DART_CALLABLE_REQUEST_OUTPUT_DIR] : []),
  ];
  for (const relativeDirectory of ownedDirectories) {
    const absoluteDirectory = path.join(root, relativeDirectory);
    if (!fs.existsSync(absoluteDirectory)) continue;
    for (const file of fs.readdirSync(absoluteDirectory, {recursive: true})) {
      const relativeFile = `${relativeDirectory}/${file}`;
      const absoluteFile = path.join(root, relativeFile);
      if (!fs.statSync(absoluteFile).isFile() || expectedFiles.has(relativeFile)) continue;
      if (checkOnly) staleFiles.push(relativeFile);
      else fs.unlinkSync(absoluteFile);
    }
  }
  if (!checkOnly) {
    fs.rmSync(
      path.join(root, "lib/core/schema_contracts/generated/callables"),
      {recursive: true, force: true}
    );
    fs.rmSync(
      path.join(root, "lib/core/schema_contracts/generated/schemas"),
      {recursive: true, force: true}
    );
  }
  for (const file of files) {
    const absolutePath = path.join(root, file.path);
    if (checkOnly) {
      const current = fs.existsSync(absolutePath) ?
        fs.readFileSync(absolutePath, "utf8") :
        null;
      if (current !== file.content) staleFiles.push(file.path);
    } else {
      fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
      fs.writeFileSync(absolutePath, file.content);
    }
  }

  return staleFiles;
}

const ORGANIZER_FORM_TEMPLATE_IDS = [
  "event-application",
  "event-registration",
  "dinner-guest-intake",
  "run-walk-participation",
  "racket-session",
  "quiz-team-night",
  "event-waiver",
  "post-event-feedback",
  "blank",
];
const ORGANIZER_FORM_PURPOSES = new Set([
  "application",
  "registration",
  "intake",
  "waiver",
  "feedback",
  "survey",
]);
const ORGANIZER_FORM_IDENTITY_POLICIES = new Set([
  "anonymous",
  "emailVerified",
  "phoneVerified",
  "emailOrPhoneVerified",
  "catchAccount",
]);

function assertOrganizerFormTemplateCatalog(catalog) {
  if (catalog?.schemaVersion !== 1 ||
      catalog?.kind !== "organizerFormTemplates") {
    throw new Error("Organizer form template catalog identity is invalid.");
  }
  if (!Array.isArray(catalog.templates) ||
      catalog.templates.length !== ORGANIZER_FORM_TEMPLATE_IDS.length) {
    throw new Error("Organizer form template catalog coverage is incomplete.");
  }
  const ids = new Set();
  for (const template of catalog.templates) {
    if (!ORGANIZER_FORM_TEMPLATE_IDS.includes(template?.id) ||
        ids.has(template.id)) {
      throw new Error(`Invalid organizer form template id: ${template?.id}`);
    }
    ids.add(template.id);
    if (!Number.isInteger(template.version) || template.version < 1 ||
        typeof template.title !== "string" || !template.title.trim() ||
        typeof template.description !== "string" ||
        !ORGANIZER_FORM_PURPOSES.has(template.purpose) ||
        !ORGANIZER_FORM_IDENTITY_POLICIES.has(template.identityPolicy) ||
        !Array.isArray(template.sections) || template.sections.length === 0) {
      throw new Error(`Organizer form template ${template.id} is malformed.`);
    }
    const sectionIds = new Set();
    const questionKeys = new Set();
    for (const section of template.sections) {
      if (typeof section?.id !== "string" || !section.id ||
          sectionIds.has(section.id) ||
          typeof section.title !== "string" || !section.title.trim() ||
          !Array.isArray(section.questions)) {
        throw new Error(
          `Organizer form template ${template.id} has an invalid section.`
        );
      }
      sectionIds.add(section.id);
      for (const question of section.questions) {
        if (typeof question?.key !== "string" ||
            !/^[A-Za-z][A-Za-z0-9_]{0,79}$/u.test(question.key) ||
            questionKeys.has(question.key) ||
            typeof question.label !== "string" || !question.label.trim() ||
            typeof question.kind !== "string" ||
            typeof question.required !== "boolean") {
          throw new Error(
            `Organizer form template ${template.id} has an invalid question.`
          );
        }
        questionKeys.add(question.key);
      }
    }
  }
}

const EVENT_SUCCESS_MOMENT_KINDS = [
  "none",
  "preArrival",
  "selfCheckIn",
  "firstHelloCheckIn",
  "compatibilityQuestionnaire",
  "liveStepContext",
  "socialPrompt",
  "conversationCues",
  "assignment",
  "liveReveal",
  "wingmanRequest",
  "postEvent",
];
const EVENT_SUCCESS_SEED_RULE = "fnv1a32-utf8-fields-v1";
const EVENT_SUCCESS_REVEAL_CLOCK =
  "revealStartedAtPlusStructureRevealCountdown";
const EVENT_SUCCESS_INTERACTION_MODELS = [
  "pacePods",
  "pairedRotations",
  "teamRotations",
  "seatedTable",
  "freeFormMixer",
  "hostLedProgram",
  "openFormat",
];
const EVENT_SUCCESS_DISCLOSURE_LEVELS = ["light", "personal", "reflective"];

function assertEventSuccessMomentPresentationCatalog(catalog) {
  if (catalog?.schemaVersion !== 1 ||
      catalog?.kind !== "eventSuccessMomentPresentations") {
    throw new Error(
      "Event Success moment presentation catalog identity is invalid."
    );
  }
  if (!Array.isArray(catalog.moments) ||
      catalog.moments.length !== EVENT_SUCCESS_MOMENT_KINDS.length) {
    throw new Error(
      "Event Success moment presentation catalog must cover every moment."
    );
  }
  const momentsByKind = new Map();
  const motifIds = new Set([
    "path", "gate", "spark", "rhythm", "orbit", "reveal", "signal",
    "afterglow",
  ]);
  const accentPolicies = new Set([
    "primary", "secondary", "secondaryUntilReveal",
  ]);
  const ambientBedIds = new Set([
    "theatrical", "pulse", "sunrise", "silent",
  ]);
  for (const moment of catalog.moments) {
    if (!EVENT_SUCCESS_MOMENT_KINDS.includes(moment?.momentKind)) {
      throw new Error(
        `Unknown Event Success moment presentation: ${moment?.momentKind}`
      );
    }
    if (momentsByKind.has(moment.momentKind)) {
      throw new Error(
        `Duplicate Event Success moment presentation: ${moment.momentKind}`
      );
    }
    momentsByKind.set(moment.momentKind, moment);
    if (typeof moment.paletteTokenId !== "string" ||
        moment.paletteTokenId.length === 0) {
      throw new Error(`${moment.momentKind} requires a palette token id.`);
    }
    if (moment.accentPaletteTokenId !== null &&
        (typeof moment.accentPaletteTokenId !== "string" ||
         moment.accentPaletteTokenId.length === 0)) {
      throw new Error(
        `${moment.momentKind} has an invalid accent palette token id.`
      );
    }
    if (!accentPolicies.has(moment.accentPalettePolicyId)) {
      throw new Error(
        `${moment.momentKind} has an invalid accent palette policy.`
      );
    }
    if (moment.accentPalettePolicyId !== "primary" &&
        moment.accentPaletteTokenId === null) {
      throw new Error(
        `${moment.momentKind} requires its secondary palette token.`
      );
    }
    if (!motifIds.has(moment.motifId)) {
      throw new Error(`${moment.momentKind} has an invalid motif id.`);
    }
    const durations = moment.phaseDurationsMs;
    for (const phase of ["anticipation", "climax", "settle"]) {
      if (!Number.isInteger(durations?.[phase]) || durations[phase] < 0) {
        throw new Error(
          `${moment.momentKind} has an invalid ${phase} duration.`
        );
      }
    }
    if (typeof moment.tempoBpm !== "number" ||
        !Number.isFinite(moment.tempoBpm) || moment.tempoBpm <= 0) {
      throw new Error(`${moment.momentKind} has an invalid tempo.`);
    }
    if (!Number.isInteger(moment.idlePulsePeriodMs) ||
        moment.idlePulsePeriodMs <= 0) {
      throw new Error(
        `${moment.momentKind} has an invalid idle-pulse period.`
      );
    }
    if (!Number.isInteger(moment.particleDensity) ||
        moment.particleDensity < 0) {
      throw new Error(
        `${moment.momentKind} has an invalid particle density.`
      );
    }
    if (moment.seedDerivationRuleId !== EVENT_SUCCESS_SEED_RULE) {
      throw new Error(
        `${moment.momentKind} has an unsupported deterministic seed rule.`
      );
    }
    if (moment.clockReferenceId !== "none" &&
        moment.clockReferenceId !== EVENT_SUCCESS_REVEAL_CLOCK) {
      throw new Error(
        `${moment.momentKind} has an unsupported server clock reference.`
      );
    }
    if (!ambientBedIds.has(moment.ambientBedId) ||
        (moment.ambientBedWhenEventEndedId !== null &&
         !ambientBedIds.has(moment.ambientBedWhenEventEndedId))) {
      throw new Error(`${moment.momentKind} has an invalid ambient bed id.`);
    }
  }
  for (const momentKind of EVENT_SUCCESS_MOMENT_KINDS) {
    if (!momentsByKind.has(momentKind)) {
      throw new Error(
        `Missing Event Success moment presentation: ${momentKind}`
      );
    }
  }
  const reveal = momentsByKind.get("liveReveal");
  if (reveal.clockReferenceId !== EVENT_SUCCESS_REVEAL_CLOCK ||
      reveal.phaseDurationsMs.anticipation <= 0 ||
      reveal.phaseDurationsMs.climax <= 0 ||
      reveal.phaseDurationsMs.settle <= 0 ||
      reveal.particleDensity <= 0) {
    throw new Error(
      "Live reveal must own its server clock, phases, and particle density."
    );
  }
  for (const [momentKind, moment] of momentsByKind) {
    if (momentKind === "liveReveal") continue;
    if (moment.clockReferenceId !== "none" || moment.particleDensity !== 0) {
      throw new Error(
        `${momentKind} cannot inherit the live-reveal ceremony.`
      );
    }
  }
  assertEventSuccessSocialMissionPromptSets(catalog.socialMissionPromptSets);
  assertEventSuccessMomentParityFixture(catalog.parityFixture, reveal);
}

function assertEventSuccessSocialMissionPromptSets(promptSets) {
  if (!Array.isArray(promptSets) ||
      promptSets.length !== EVENT_SUCCESS_INTERACTION_MODELS.length) {
    throw new Error(
      "Event Success social missions must cover every interaction model."
    );
  }
  const models = new Set();
  for (const promptSet of promptSets) {
    if (!EVENT_SUCCESS_INTERACTION_MODELS.includes(
      promptSet?.interactionModel
    ) || models.has(promptSet.interactionModel)) {
      throw new Error(
        `Invalid Event Success social mission model: ${
          promptSet?.interactionModel
        }`
      );
    }
    models.add(promptSet.interactionModel);
    if (!Array.isArray(promptSet.prompts) ||
        promptSet.prompts.length !== EVENT_SUCCESS_DISCLOSURE_LEVELS.length) {
      throw new Error(
        `${promptSet.interactionModel} requires three social mission prompts.`
      );
    }
    promptSet.prompts.forEach((prompt, index) => {
      if (prompt?.disclosureLevel !== EVENT_SUCCESS_DISCLOSURE_LEVELS[index] ||
          typeof prompt?.promptId !== "string" ||
          !/^[A-Za-z][A-Za-z0-9.]{2,79}$/u.test(prompt.promptId)) {
        throw new Error(
          `${promptSet.interactionModel} social mission ${index} is invalid.`
        );
      }
    });
  }
}

function assertEventSuccessMomentParityFixture(fixture, presentation) {
  if (fixture?.momentKind !== presentation.momentKind ||
      !Number.isInteger(fixture.activeRevealRoundIndex) ||
      !Number.isSafeInteger(fixture.serverAnchorMillis) ||
      !Number.isInteger(fixture.revealCountdownMs) ||
      fixture.revealCountdownMs < 0 || typeof fixture.eventId !== "string" ||
      fixture.eventId.length === 0) {
    throw new Error("Event Success moment parity fixture input is invalid.");
  }
  const timeline = resolveEventSuccessMomentTimelineFixture({
    presentation,
    serverAnchorMillis: fixture.serverAnchorMillis,
    revealCountdownMs: fixture.revealCountdownMs,
  });
  const seed = deriveEventSuccessMomentSeedFixture({
    presentation,
    eventId: fixture.eventId,
    activeRevealRoundIndex: fixture.activeRevealRoundIndex,
    serverAnchorMillis: fixture.serverAnchorMillis,
  });
  const expected = {...timeline, seed};
  if (JSON.stringify(fixture.expected) !== JSON.stringify(expected)) {
    throw new Error(
      "Event Success moment parity fixture expected output is stale."
    );
  }
}

function resolveEventSuccessMomentTimelineFixture({
  presentation,
  serverAnchorMillis,
  revealCountdownMs,
}) {
  const anticipationDurationMs =
    presentation.clockReferenceId === EVENT_SUCCESS_REVEAL_CLOCK ?
      revealCountdownMs : presentation.phaseDurationsMs.anticipation;
  const climaxStartsAtMillis = serverAnchorMillis + anticipationDurationMs;
  const settleStartsAtMillis =
    climaxStartsAtMillis + presentation.phaseDurationsMs.climax;
  return {
    anticipationStartsAtMillis: serverAnchorMillis,
    climaxStartsAtMillis,
    settleStartsAtMillis,
    completesAtMillis:
      settleStartsAtMillis + presentation.phaseDurationsMs.settle,
  };
}

function deriveEventSuccessMomentSeedFixture({
  presentation,
  eventId,
  activeRevealRoundIndex,
  serverAnchorMillis,
}) {
  if (presentation.seedDerivationRuleId !== EVENT_SUCCESS_SEED_RULE) {
    throw new Error(
      `Unsupported Event Success seed rule: ${
        presentation.seedDerivationRuleId
      }`
    );
  }
  let hash = 0x811c9dc5;
  const fields = [
    eventId,
    presentation.momentKind,
    String(activeRevealRoundIndex),
    String(serverAnchorMillis),
  ];
  for (const field of fields) {
    for (const byte of new TextEncoder().encode(field)) {
      hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
    }
    hash = Math.imul(hash ^ 0xff, 0x01000193) >>> 0;
  }
  return hash;
}

function renderTsEventSuccessMomentPresentations(catalog) {
  const momentKindType = EVENT_SUCCESS_MOMENT_KINDS
    .map((value) => JSON.stringify(value))
    .join(" | ");
  const interactionModelType = EVENT_SUCCESS_INTERACTION_MODELS
    .map((value) => JSON.stringify(value))
    .join(" | ");
  return `${tsGeneratedHeader()}export type EventSuccessMomentKind =
  ${momentKindType};
export type EventSuccessInteractionModel =
  ${interactionModelType};
export type EventSuccessDisclosureLevel =
  "light" | "personal" | "reflective";
export type EventSuccessAccentPalettePolicyId =
  "primary" | "secondary" | "secondaryUntilReveal";
export type EventSuccessMomentClockReferenceId =
  "none" | "${EVENT_SUCCESS_REVEAL_CLOCK}";
export type EventSuccessMomentSeedDerivationRuleId =
  "${EVENT_SUCCESS_SEED_RULE}";
export type EventSuccessAmbientBedId =
  "theatrical" | "pulse" | "sunrise" | "silent";

export interface EventSuccessMomentPhaseDurations {
  readonly anticipation: number;
  readonly climax: number;
  readonly settle: number;
}

export interface EventSuccessMomentPresentationContract {
  readonly momentKind: EventSuccessMomentKind;
  readonly paletteTokenId: string;
  readonly accentPaletteTokenId: string | null;
  readonly accentPalettePolicyId: EventSuccessAccentPalettePolicyId;
  readonly motifId: string;
  readonly phaseDurationsMs: EventSuccessMomentPhaseDurations;
  readonly tempoBpm: number;
  readonly idlePulsePeriodMs: number;
  readonly particleDensity: number;
  readonly seedDerivationRuleId: EventSuccessMomentSeedDerivationRuleId;
  readonly clockReferenceId: EventSuccessMomentClockReferenceId;
  readonly ambientBedId: EventSuccessAmbientBedId;
  readonly ambientBedWhenEventEndedId: EventSuccessAmbientBedId | null;
}

export interface EventSuccessSocialMissionPromptContract {
  readonly promptId: string;
  readonly disclosureLevel: EventSuccessDisclosureLevel;
}

export interface EventSuccessSocialMissionPromptSetContract {
  readonly interactionModel: EventSuccessInteractionModel;
  readonly prompts: readonly EventSuccessSocialMissionPromptContract[];
}

export interface EventSuccessMomentPresentationCatalog {
  readonly schemaVersion: 1;
  readonly kind: "eventSuccessMomentPresentations";
  readonly moments: readonly EventSuccessMomentPresentationContract[];
  readonly socialMissionPromptSets:
    readonly EventSuccessSocialMissionPromptSetContract[];
  readonly parityFixture: {
    readonly eventId: string;
    readonly momentKind: EventSuccessMomentKind;
    readonly activeRevealRoundIndex: number;
    readonly serverAnchorMillis: number;
    readonly revealCountdownMs: number;
    readonly expected: EventSuccessCeremonyTimeline & {readonly seed: number};
  };
}

export interface EventSuccessCeremonyTimeline {
  readonly anticipationStartsAtMillis: number;
  readonly climaxStartsAtMillis: number;
  readonly settleStartsAtMillis: number;
  readonly completesAtMillis: number;
}

export const eventSuccessMomentPresentationCatalog:
  EventSuccessMomentPresentationCatalog =
  ${jsonForTs(catalog)};

const eventSuccessMomentPresentationsByKind = new Map<
  EventSuccessMomentKind,
  EventSuccessMomentPresentationContract
>(eventSuccessMomentPresentationCatalog.moments.map((presentation) => [
  presentation.momentKind,
  presentation,
]));

export function eventSuccessMomentPresentationFor(
  momentKind: EventSuccessMomentKind
): EventSuccessMomentPresentationContract {
  const presentation = eventSuccessMomentPresentationsByKind.get(momentKind);
  if (!presentation) {
    throw new Error("Missing Event Success moment presentation: " + momentKind);
  }
  return presentation;
}

const eventSuccessSocialMissionPromptsByInteractionModel = new Map<
  EventSuccessInteractionModel,
  EventSuccessSocialMissionPromptSetContract
>(eventSuccessMomentPresentationCatalog.socialMissionPromptSets.map((set) => [
  set.interactionModel,
  set,
]));

export function eventSuccessSocialMissionPromptFor(input: {
  interactionModel: EventSuccessInteractionModel;
  activeStepIndex: number;
}): EventSuccessSocialMissionPromptContract {
  const promptSet = eventSuccessSocialMissionPromptsByInteractionModel.get(
    input.interactionModel
  );
  if (!promptSet || promptSet.prompts.length !== 3) {
    throw new Error(
      "Missing Event Success social missions: " + input.interactionModel
    );
  }
  const disclosureIndex = Math.max(0, Math.min(2, input.activeStepIndex));
  return promptSet.prompts[disclosureIndex];
}

export function resolveEventSuccessCeremonyTimeline(input: {
  presentation: EventSuccessMomentPresentationContract;
  serverAnchorMillis: number;
  revealCountdownMs?: number | null;
}): EventSuccessCeremonyTimeline {
  const configuredAnticipationMs =
    input.presentation.phaseDurationsMs.anticipation;
  const anticipationDurationMs =
    input.presentation.clockReferenceId ===
      "${EVENT_SUCCESS_REVEAL_CLOCK}" ?
      input.revealCountdownMs ?? configuredAnticipationMs :
      configuredAnticipationMs;
  if (!Number.isSafeInteger(input.serverAnchorMillis) ||
      !Number.isInteger(anticipationDurationMs) ||
      anticipationDurationMs < 0) {
    throw new Error("Event Success ceremony timing input is invalid.");
  }
  const climaxStartsAtMillis =
    input.serverAnchorMillis + anticipationDurationMs;
  const settleStartsAtMillis =
    climaxStartsAtMillis + input.presentation.phaseDurationsMs.climax;
  return {
    anticipationStartsAtMillis: input.serverAnchorMillis,
    climaxStartsAtMillis,
    settleStartsAtMillis,
    completesAtMillis:
      settleStartsAtMillis + input.presentation.phaseDurationsMs.settle,
  };
}

export function deriveEventSuccessMomentSeed(input: {
  presentation: EventSuccessMomentPresentationContract;
  eventId: string;
  activeRevealRoundIndex: number;
  serverAnchorMillis: number;
}): number {
  if (input.presentation.seedDerivationRuleId !==
      "${EVENT_SUCCESS_SEED_RULE}") {
    throw new Error(
      "Unsupported Event Success seed rule: " +
        input.presentation.seedDerivationRuleId
    );
  }
  let hash = 0x811c9dc5;
  const fields = [
    input.eventId,
    input.presentation.momentKind,
    String(input.activeRevealRoundIndex),
    String(input.serverAnchorMillis),
  ];
  for (const field of fields) {
    for (const byte of new TextEncoder().encode(field)) {
      hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
    }
    hash = Math.imul(hash ^ 0xff, 0x01000193) >>> 0;
  }
  return hash;
}
`;
}

function renderDartEventAssistanceCatalog({
  catalog,
  commandBindingCatalog,
  workflowKinds,
  commandKinds,
  coverageVariants,
}) {
  const enumText = (name, values) => {
    const compact = `enum ${name} { ${
      values.map(lowerCamelCase).join(", ")
    } }`;
    return compact.length <= 80 ? compact :
      `enum ${name} {\n` +
      values.map((value) => `  ${lowerCamelCase(value)},`).join("\n") +
      "\n}";
  };
  const enumList = (name, values, spaces = 6) => values.length === 0 ?
    `<${name}>[]` :
    `<${name}>[\n` + values.map((value) =>
      `${" ".repeat(spaces)}${name}.${lowerCamelCase(value)},`
    ).join("\n") + `\n${" ".repeat(spaces - 2)}]`;
  const stringList = (values, spaces = 6) => values.length === 0 ?
    "<String>[]" :
    "<String>[\n" + values.map((value) =>
      `${" ".repeat(spaces)}${dartString(value)},`
    ).join("\n") + `\n${" ".repeat(spaces - 2)}]`;
  const families = [...new Set(catalog.definitions.map((row) => row.family))];
  const applicability = [...new Set(
    catalog.definitions.map((row) => row.applicability)
  )];
  const scopes = [...new Set(catalog.definitions.map((row) => row.scope))];
  const overridePolicies = [...new Set(
    catalog.definitions.map((row) => row.overridePolicy)
  )];
  const resolutionBoundaries = [...new Set(
    catalog.definitions.map((row) => row.resolutionBoundary)
  )];
  const surfaces = [...new Set(catalog.definitions.flatMap(
    (row) => row.hostProjection.surfaces
  ))];
  const presentations = [...new Set(catalog.definitions.map(
    (row) => row.hostProjection.presentation
  ))];
  const bindingTypes = [...new Set(commandBindingCatalog.definitions.flatMap(
    (row) => [row.live.bindingType, row.rehearsal.bindingType]
  ))];
  const bindingCoverages = ["none", "partial", "complete"];
  const coverageKind = (binding) => binding.coverage?.kind ??
    (binding.bindingType === "contractOnly" ? "none" : "complete");
  const missingCapabilities = [...new Set(
    commandBindingCatalog.definitions.flatMap((row) =>
      [row.live.missingCapability, row.rehearsal.missingCapability]
        .filter((value) => value !== null)
    )
  )];
  const rows = catalog.definitions.map((row) =>
    "  EventAssistanceWorkflowDescriptor(\n" +
    `    kind: EventAssistanceWorkflowKind.${row.kind},\n` +
    `    version: ${row.version},\n` +
    `    family: EventAssistanceWorkflowFamily.${
      lowerCamelCase(row.family)
    },\n` +
    `    applicability: EventAssistanceApplicability.${
      lowerCamelCase(row.applicability)
    },\n` +
    `    scope: EventAssistanceWorkflowScope.${lowerCamelCase(row.scope)},\n` +
    `    automaticCommands: ${enumList(
      "EventAssistanceCommandKind",
      row.commands.automatic
    )},\n` +
    `    hostCommands: ${enumList(
      "EventAssistanceCommandKind",
      row.commands.host
    )},\n` +
    `    guestCommands: ${enumList(
      "EventAssistanceCommandKind",
      row.commands.guest
    )},\n` +
    `    overridePolicy: EventAssistanceOverridePolicy.${
      lowerCamelCase(row.overridePolicy)
    },\n` +
    `    resolutionBoundary:\n        EventAssistanceResolutionBoundary.${
      lowerCamelCase(row.resolutionBoundary)
    },\n` +
    "    hostProjection: EventAssistanceHostProjection(\n" +
    `      surfaces: ${enumList(
      "EventAssistanceHostSurface",
      row.hostProjection.surfaces,
      8
    )},\n` +
    `      presentation: EventAssistanceHostPresentation.${
      lowerCamelCase(row.hostProjection.presentation)
    },\n` +
    "    ),\n" +
    "  ),"
  ).join("\n");
  const bindingRows = commandBindingCatalog.definitions.map((row) =>
    "  EventAssistanceCommandBindingDescriptor(\n" +
    `    commandKind: EventAssistanceCommandKind.${row.commandKind},\n` +
    "    live: EventAssistanceModeBinding(\n" +
    `      bindingType: EventAssistanceCommandBindingType.${
      lowerCamelCase(row.live.bindingType)
    },\n` +
    `      coverage: EventAssistanceCommandCoverage.${
      coverageKind(row.live)
    },\n` +
    `      variantField: ${dartLiteral(
      row.live.coverage?.variantField ?? null
    )},\n` +
    `      implementedVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.live.coverage?.implementedVariants ?? [],
      8
    )},\n` +
    `      missingVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.live.coverage?.missingVariants ?? [],
      8
    )},\n` +
    `      operations: ${stringList(row.live.operations, 8)},\n` +
    `      missingCapability: ${row.live.missingCapability === null ?
      "null" :
      `EventAssistanceMissingCapability.${row.live.missingCapability}`},\n` +
    "    ),\n" +
    "    rehearsal: EventAssistanceModeBinding(\n" +
    `      bindingType: EventAssistanceCommandBindingType.${
      lowerCamelCase(row.rehearsal.bindingType)
    },\n` +
    `      coverage: EventAssistanceCommandCoverage.${
      coverageKind(row.rehearsal)
    },\n` +
    `      variantField: ${dartLiteral(
      row.rehearsal.coverage?.variantField ?? null
    )},\n` +
    `      implementedVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.rehearsal.coverage?.implementedVariants ?? [],
      8
    )},\n` +
    `      missingVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.rehearsal.coverage?.missingVariants ?? [],
      8
    )},\n` +
    `      operations: ${stringList(row.rehearsal.operations, 8)},\n` +
    `      missingCapability: ${row.rehearsal.missingCapability === null ?
      "null" :
      `EventAssistanceMissingCapability.${row.rehearsal.missingCapability}`},\n` +
    "    ),\n" +
    "  ),"
  ).join("\n");
  return `${dartGeneratedHeader()}${enumText(
    "EventAssistanceWorkflowKind",
    workflowKinds
  )}

${enumText("EventAssistanceCommandKind", commandKinds)}

${enumText("EventAssistanceWorkflowFamily", families)}

${enumText("EventAssistanceApplicability", applicability)}

${enumText("EventAssistanceWorkflowScope", scopes)}

${enumText("EventAssistanceOverridePolicy", overridePolicies)}

${enumText("EventAssistanceResolutionBoundary", resolutionBoundaries)}

${enumText("EventAssistanceHostSurface", surfaces)}

${enumText("EventAssistanceHostPresentation", presentations)}

${enumText("EventAssistanceCommandBindingType", bindingTypes)}

${enumText("EventAssistanceCommandCoverage", bindingCoverages)}

${enumText("EventAssistanceCommandCoverageVariant", coverageVariants)}

${enumText("EventAssistanceMissingCapability", missingCapabilities)}

final class EventAssistanceHostProjection {
  const EventAssistanceHostProjection({
    required this.surfaces,
    required this.presentation,
  });

  final List<EventAssistanceHostSurface> surfaces;
  final EventAssistanceHostPresentation presentation;
}

final class EventAssistanceWorkflowDescriptor {
  const EventAssistanceWorkflowDescriptor({
    required this.kind,
    required this.version,
    required this.family,
    required this.applicability,
    required this.scope,
    required this.automaticCommands,
    required this.hostCommands,
    required this.guestCommands,
    required this.overridePolicy,
    required this.resolutionBoundary,
    required this.hostProjection,
  });

  final EventAssistanceWorkflowKind kind;
  final int version;
  final EventAssistanceWorkflowFamily family;
  final EventAssistanceApplicability applicability;
  final EventAssistanceWorkflowScope scope;
  final List<EventAssistanceCommandKind> automaticCommands;
  final List<EventAssistanceCommandKind> hostCommands;
  final List<EventAssistanceCommandKind> guestCommands;
  final EventAssistanceOverridePolicy overridePolicy;
  final EventAssistanceResolutionBoundary resolutionBoundary;
  final EventAssistanceHostProjection hostProjection;

  bool get hasCommandContract =>
      automaticCommands.isNotEmpty ||
      hostCommands.isNotEmpty ||
      guestCommands.isNotEmpty;
}

const eventAssistanceWorkflowCatalog = <EventAssistanceWorkflowDescriptor>[
${rows}
];

extension EventAssistanceWorkflowCatalogLookup on EventAssistanceWorkflowKind {
  EventAssistanceWorkflowDescriptor get descriptor =>
      eventAssistanceWorkflowCatalog[index];
}

final class EventAssistanceModeBinding {
  const EventAssistanceModeBinding({
    required this.bindingType,
    required this.coverage,
    required this.variantField,
    required this.implementedVariants,
    required this.missingVariants,
    required this.operations,
    required this.missingCapability,
  });

  final EventAssistanceCommandBindingType bindingType;
  final EventAssistanceCommandCoverage coverage;
  final String? variantField;
  final List<EventAssistanceCommandCoverageVariant> implementedVariants;
  final List<EventAssistanceCommandCoverageVariant> missingVariants;
  final List<String> operations;
  final EventAssistanceMissingCapability? missingCapability;

  bool get isImplemented =>
      coverage != EventAssistanceCommandCoverage.none;

  bool get isFullyImplemented =>
      coverage == EventAssistanceCommandCoverage.complete;
}

final class EventAssistanceCommandBindingDescriptor {
  const EventAssistanceCommandBindingDescriptor({
    required this.commandKind,
    required this.live,
    required this.rehearsal,
  });

  final EventAssistanceCommandKind commandKind;
  final EventAssistanceModeBinding live;
  final EventAssistanceModeBinding rehearsal;
}

const eventAssistanceCommandBindingCatalog =
    <EventAssistanceCommandBindingDescriptor>[
${bindingRows}
];

extension EventAssistanceCommandBindingCatalogLookup
    on EventAssistanceCommandKind {
  EventAssistanceCommandBindingDescriptor get binding =>
      eventAssistanceCommandBindingCatalog[index];
}
`;
}

function renderDartEventSuccessMomentPresentations(catalog) {
  const moments = catalog.moments.map((moment) =>
    `  EventSuccessMomentPresentationContract(\n` +
    `    momentKind: ${dartString(moment.momentKind)},\n` +
    `    paletteTokenId: ${dartString(moment.paletteTokenId)},\n` +
    `    accentPaletteTokenId: ${dartLiteral(moment.accentPaletteTokenId)},\n` +
    `    accentPalettePolicyId: ${
      dartString(moment.accentPalettePolicyId)
    },\n` +
    `    motifId: ${dartString(moment.motifId)},\n` +
    `    phaseDurationsMs: EventSuccessMomentPhaseDurations(\n` +
    `      anticipation: ${moment.phaseDurationsMs.anticipation},\n` +
    `      climax: ${moment.phaseDurationsMs.climax},\n` +
    `      settle: ${moment.phaseDurationsMs.settle},\n` +
    `    ),\n` +
    `    tempoBpm: ${moment.tempoBpm},\n` +
    `    idlePulsePeriodMs: ${moment.idlePulsePeriodMs},\n` +
    `    particleDensity: ${moment.particleDensity},\n` +
    `    seedDerivationRuleId: ${
      dartString(moment.seedDerivationRuleId)
    },\n` +
    `    clockReferenceId: ${dartString(moment.clockReferenceId)},\n` +
    `    ambientBedId: ${dartString(moment.ambientBedId)},\n` +
    `    ambientBedWhenEventEndedId: ${
      dartLiteral(moment.ambientBedWhenEventEndedId)
    },\n` +
    `  ),`
  ).join("\n");
  const byKind = catalog.moments.map((moment) =>
    `  ${dartString(moment.momentKind)}: ` +
      `eventSuccessMomentPresentations[${
        EVENT_SUCCESS_MOMENT_KINDS.indexOf(moment.momentKind)
      }],`
  ).join("\n");
  const promptSets = catalog.socialMissionPromptSets.map((promptSet) =>
    `  EventSuccessSocialMissionPromptSetContract(\n` +
    `    interactionModel: ${dartString(promptSet.interactionModel)},\n` +
    `    prompts: <EventSuccessSocialMissionPromptContract>[\n` +
    promptSet.prompts.map((prompt) =>
      `      EventSuccessSocialMissionPromptContract(` +
      `promptId: ${dartString(prompt.promptId)}, ` +
      `disclosureLevel: ${dartString(prompt.disclosureLevel)}),`
    ).join("\n") + `\n    ],\n  ),`
  ).join("\n");
  const promptSetsByModel = catalog.socialMissionPromptSets.map((promptSet) =>
    `  ${dartString(promptSet.interactionModel)}: ` +
      `eventSuccessSocialMissionPromptSets[${
        EVENT_SUCCESS_INTERACTION_MODELS.indexOf(promptSet.interactionModel)
      }],`
  ).join("\n");
  return `${dartGeneratedHeader()}
import 'dart:convert';

class EventSuccessMomentPhaseDurations {
  const EventSuccessMomentPhaseDurations({
    required this.anticipation,
    required this.climax,
    required this.settle,
  });

  final int anticipation;
  final int climax;
  final int settle;
}

class EventSuccessMomentPresentationContract {
  const EventSuccessMomentPresentationContract({
    required this.momentKind,
    required this.paletteTokenId,
    required this.accentPaletteTokenId,
    required this.accentPalettePolicyId,
    required this.motifId,
    required this.phaseDurationsMs,
    required this.tempoBpm,
    required this.idlePulsePeriodMs,
    required this.particleDensity,
    required this.seedDerivationRuleId,
    required this.clockReferenceId,
    required this.ambientBedId,
    required this.ambientBedWhenEventEndedId,
  });

  final String momentKind;
  final String paletteTokenId;
  final String? accentPaletteTokenId;
  final String accentPalettePolicyId;
  final String motifId;
  final EventSuccessMomentPhaseDurations phaseDurationsMs;
  final double tempoBpm;
  final int idlePulsePeriodMs;
  final int particleDensity;
  final String seedDerivationRuleId;
  final String clockReferenceId;
  final String ambientBedId;
  final String? ambientBedWhenEventEndedId;
}

class EventSuccessSocialMissionPromptContract {
  const EventSuccessSocialMissionPromptContract({
    required this.promptId,
    required this.disclosureLevel,
  });

  final String promptId;
  final String disclosureLevel;
}

class EventSuccessSocialMissionPromptSetContract {
  const EventSuccessSocialMissionPromptSetContract({
    required this.interactionModel,
    required this.prompts,
  });

  final String interactionModel;
  final List<EventSuccessSocialMissionPromptContract> prompts;
}

class EventSuccessCeremonyTimeline {
  const EventSuccessCeremonyTimeline({
    required this.anticipationStartsAtMillis,
    required this.climaxStartsAtMillis,
    required this.settleStartsAtMillis,
    required this.completesAtMillis,
  });

  final int anticipationStartsAtMillis;
  final int climaxStartsAtMillis;
  final int settleStartsAtMillis;
  final int completesAtMillis;

  Map<String, Object?> toJson() => <String, Object?>{
    'anticipationStartsAtMillis': anticipationStartsAtMillis,
    'climaxStartsAtMillis': climaxStartsAtMillis,
    'settleStartsAtMillis': settleStartsAtMillis,
    'completesAtMillis': completesAtMillis,
  };
}

const eventSuccessMomentPresentationCatalogJson =
    ${dartLiteral(catalog)};

const eventSuccessMomentPresentations =
    <EventSuccessMomentPresentationContract>[
${moments}
];

final eventSuccessMomentPresentationsByKind =
    <String, EventSuccessMomentPresentationContract>{
${byKind}
};

const eventSuccessSocialMissionPromptSets =
    <EventSuccessSocialMissionPromptSetContract>[
${promptSets}
];

final eventSuccessSocialMissionPromptsByInteractionModel =
    <String, EventSuccessSocialMissionPromptSetContract>{
${promptSetsByModel}
};

EventSuccessMomentPresentationContract eventSuccessMomentPresentationFor(
  String momentKind,
) {
  final presentation = eventSuccessMomentPresentationsByKind[momentKind];
  if (presentation == null) {
    throw StateError('Missing Event Success moment presentation: \$momentKind');
  }
  return presentation;
}

EventSuccessSocialMissionPromptContract eventSuccessSocialMissionPromptFor({
  required String interactionModel,
  required int activeStepIndex,
}) {
  final promptSet =
      eventSuccessSocialMissionPromptsByInteractionModel[interactionModel];
  if (promptSet == null || promptSet.prompts.length != 3) {
    throw StateError(
      'Missing Event Success social missions: \$interactionModel',
    );
  }
  final disclosureIndex = activeStepIndex < 0
      ? 0
      : activeStepIndex > 2
      ? 2
      : activeStepIndex;
  return promptSet.prompts[disclosureIndex];
}

EventSuccessCeremonyTimeline resolveEventSuccessCeremonyTimeline({
  required EventSuccessMomentPresentationContract presentation,
  required int serverAnchorMillis,
  int? revealCountdownMs,
}) {
  final configuredAnticipationMs = presentation.phaseDurationsMs.anticipation;
  final anticipationDurationMs = presentation.clockReferenceId ==
          '${EVENT_SUCCESS_REVEAL_CLOCK}'
      ? revealCountdownMs ?? configuredAnticipationMs
      : configuredAnticipationMs;
  if (anticipationDurationMs < 0) {
    throw ArgumentError.value(
      anticipationDurationMs,
      'revealCountdownMs',
      'must not be negative',
    );
  }
  final climaxStartsAtMillis = serverAnchorMillis + anticipationDurationMs;
  final settleStartsAtMillis =
      climaxStartsAtMillis + presentation.phaseDurationsMs.climax;
  return EventSuccessCeremonyTimeline(
    anticipationStartsAtMillis: serverAnchorMillis,
    climaxStartsAtMillis: climaxStartsAtMillis,
    settleStartsAtMillis: settleStartsAtMillis,
    completesAtMillis:
        settleStartsAtMillis + presentation.phaseDurationsMs.settle,
  );
}

int deriveEventSuccessMomentSeed({
  required EventSuccessMomentPresentationContract presentation,
  required String eventId,
  required int activeRevealRoundIndex,
  required int serverAnchorMillis,
}) {
  if (presentation.seedDerivationRuleId != '${EVENT_SUCCESS_SEED_RULE}') {
    throw UnsupportedError(
      'Unsupported Event Success seed rule: '
      '\${presentation.seedDerivationRuleId}',
    );
  }
  var hash = 0x811c9dc5;
  final fields = <String>[
    eventId,
    presentation.momentKind,
    activeRevealRoundIndex.toString(),
    serverAnchorMillis.toString(),
  ];
  for (final field in fields) {
    for (final byte in utf8.encode(field)) {
      hash = ((hash ^ byte) * 0x01000193) & 0xffffffff;
    }
    hash = ((hash ^ 0xff) * 0x01000193) & 0xffffffff;
  }
  return hash;
}
`;
}

function withProfilePhotoPolicy(photoCatalog, profilePhotoPolicy) {
  return {
    ...photoCatalog,
    limits: {
      ...photoCatalog.limits,
      maxCaptions: profilePhotoPolicy.maxPhotos,
    },
  };
}

function applyProfilePhotoPolicy(schema, profilePhotoPolicy) {
  const cloned = structuredClone(schema);
  applyDerivedProfilePhotoPolicyValues(cloned, profilePhotoPolicy);
  return cloned;
}

function applyDerivedProfilePhotoPolicyValues(value, profilePhotoPolicy) {
  if (Array.isArray(value)) {
    for (const item of value) {
      applyDerivedProfilePhotoPolicyValues(item, profilePhotoPolicy);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (
    value["x-catch-maximumFrom"] ===
    "profilePhotoPolicy.maxPhotosMinusOne"
  ) {
    value.maximum = profilePhotoPolicy.maxPhotos - 1;
    delete value["x-catch-maximumFrom"];
  }
  for (const child of Object.values(value)) {
    applyDerivedProfilePhotoPolicyValues(child, profilePhotoPolicy);
  }
}

async function addTypeOutput(spec, schema) {
  let types = await compileTs({...schema, title: spec.name}, spec.name);
  types = normalizeExternalTypeReferences(spec.name, types);
  const imports = tsTypeImports(spec.name, types);
  const content = `${tsGeneratedHeader()}${imports}${types.trim()}\n`;
  for (const output of [
    spec.typeOutput,
    ...(spec.additionalTypeOutputs ?? []),
  ]) {
    addTextOutput(output, content);
  }
}

function compileTs(schema, name) {
  return compile(schema, name, {
    bannerComment: "",
    cwd: repoRoot,
    declareExternallyReferenced: false,
    enableConstEnums: false,
    format: true,
    ignoreMinAndMaxItems: true,
    style: {
      bracketSpacing: false,
      printWidth: 80,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      trailingComma: "es5",
      useTabs: false,
    },
  });
}

async function renderTsFirestoreAdminTypes({schemaSpecs, profilePhotoPolicy}) {
  const firestoreSpecs = schemaSpecs
    .filter((spec) => spec.source.startsWith("firestore/"));
  const allAdminTypeNames = [
    ...FIRESTORE_ADMIN_EMBEDDED_SPECS.map((spec) => spec.name),
    ...firestoreSpecs.map((spec) => firestoreAdminTypeName(spec.name)),
  ];
  const sections = [];

  for (const spec of FIRESTORE_ADMIN_EMBEDDED_SPECS) {
    const schema = firestoreAdminNamedSchema(spec, profilePhotoPolicy);
    applyFirestoreAdminFieldOverrides(schema, spec.name);
    applyFirestoreAdminOptionalFields(schema, spec.name);
    sections.push(await compileFirestoreAdminType(
      schema,
      spec.name,
      allAdminTypeNames
    ));
  }

  for (const spec of firestoreSpecs) {
    const file = path.join(contractRoot, spec.source);
    const schema = applyProfilePhotoPolicy(
      bundleSchema(file),
      profilePhotoPolicy
    );
    stripInternalDemoFields(schema);
    stripTopLevelStructuralValidation(schema);
    const adminName = firestoreAdminTypeName(spec.name);
    schema.title = adminName;
    applyFirestoreAdminFieldOverrides(schema, adminName);
    applyFirestoreAdminOptionalFields(schema, adminName);
    sections.push(await compileFirestoreAdminType(
      withAdminTimestamps(schema),
      adminName,
      allAdminTypeNames
    ));
  }

  const sectionSource = sections.join("\n\n");
  const externalImports = schemaSpecs
    .filter((spec) => !allAdminTypeNames.includes(spec.name))
    .filter((spec) => new RegExp(`\\b${spec.name}\\b`).test(sectionSource))
    .map((spec) => `import type {${spec.name}} from "${typeImportPath(spec)}";`)
    .join("\n");
  const importBlock = externalImports.length === 0 ?
    "" : `${externalImports}\n\n`;

  return `${tsGeneratedHeader()}${importBlock}` +
`/**
 * Schema-derived Admin SDK Firestore document types.
 *
 * The sibling generated document files model serialized JSON fixture
 * timestamps as {_seconds, _nanoseconds}. These types keep the same
 * schema-owned fields, but project Firestore timestamp values as live
 * FirebaseFirestore.Timestamp instances for Cloud Functions code that reads
 * and writes through the Admin SDK.
 */

// FirebaseFirestore.Timestamp is available globally through firebase-admin's
// @google-cloud/firestore dependency.

${sectionSource}\n`;
}

async function compileFirestoreAdminType(schema, name, allAdminTypeNames) {
  let types = await compileTs(schema, name);
  types = normalizeTypeReferences(name, types, allAdminTypeNames);
  return types.trim();
}

function firestoreAdminNamedSchema(spec, profilePhotoPolicy) {
  const file = path.join(contractRoot, spec.source);
  const bundled = applyProfilePhotoPolicy(bundleSchema(file), profilePhotoPolicy);
  const source = spec.pointer ?
    resolveJsonPointer(bundled, spec.pointer) :
    bundled;
  return withAdminTimestamps({
    ...structuredClone(source),
    title: spec.name,
  });
}

function firestoreAdminTypeName(schemaName) {
  return schemaName;
}

function withAdminTimestamps(schema) {
  const cloned = structuredClone(schema);
  replaceSerializedTimestampSchemas(cloned);
  return cloned;
}

function replaceSerializedTimestampSchemas(value) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (isSerializedTimestampSchema(item)) {
        value[i] = {tsType: "FirebaseFirestore.Timestamp"};
      } else {
        replaceSerializedTimestampSchemas(item);
      }
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (isSerializedTimestampSchema(value)) {
    for (const key of Object.keys(value)) delete value[key];
    value.tsType = "FirebaseFirestore.Timestamp";
    return;
  }
  for (const child of Object.values(value)) {
    replaceSerializedTimestampSchemas(child);
  }
}

function isSerializedTimestampSchema(value) {
  if (!value || typeof value !== "object" || value.type !== "object") {
    return false;
  }
  const properties = value.properties;
  if (!properties || typeof properties !== "object") return false;
  return Boolean(
    properties._seconds?.type === "integer" &&
    properties._nanoseconds?.type === "integer"
  );
}

function stripInternalDemoFields(schema) {
  const fields = schema["x-internal-demo-fields"];
  if (!Array.isArray(fields) || !schema.properties) return;
  for (const field of fields) {
    delete schema.properties[field];
  }
  if (Array.isArray(schema.required)) {
    schema.required = schema.required.filter((field) => !fields.includes(field));
  }
}

function stripTopLevelStructuralValidation(schema) {
  delete schema.anyOf;
  delete schema.oneOf;
  delete schema.allOf;
}

function applyFirestoreAdminFieldOverrides(schema, typeName) {
  if (!schema.properties) return;
  for (const [key, tsType] of FIRESTORE_ADMIN_FIELD_OVERRIDES) {
    const [targetTypeName, fieldName] = key.split(".");
    if (targetTypeName !== typeName || !schema.properties[fieldName]) {
      continue;
    }
    schema.properties[fieldName] = {tsType};
  }
}

function applyFirestoreAdminOptionalFields(schema, typeName) {
  const fields = FIRESTORE_ADMIN_OPTIONAL_FIELDS.get(typeName);
  if (!fields || !Array.isArray(schema.required)) return;
  schema.required = schema.required.filter((field) => !fields.includes(field));
}

function normalizeTypeReferences(currentTypeName, source, typeNames) {
  let normalized = source;
  for (const name of typeNames) {
    if (currentTypeName === name) continue;
    normalized = normalized.replace(
      new RegExp(`\\b${name}\\d+\\b`, "g"),
      name
    );
  }
  return normalized;
}

function normalizeExternalTypeReferences(currentTypeName, source) {
  return normalizeTypeReferences(
    currentTypeName,
    source,
    schemaSpecs.map((spec) => spec.name)
  );
}

function tsTypeImports(currentTypeName, source) {
  const imports = [];
  const typeSource = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const spec of schemaSpecs) {
    if (currentTypeName === spec.name) continue;
    const pattern = new RegExp(`\\b${spec.name}\\b`);
    if (!pattern.test(typeSource)) continue;
    imports.push(`import type {${spec.name}} from "${typeImportPath(spec)}";`);
  }
  return imports.length === 0 ? "" : `${imports.join("\n")}\n\n`;
}

function addTextOutput(relativePath, content) {
  generatedFiles.push({path: relativePath, content});
}

function schemaRegistryEntries(schemaMap) {
  return schemaSpecs.map((spec) => [
    schemaConstName(spec),
    schemaMap.get(spec.name),
  ]);
}

function schemaConstName(spec) {
  return `${spec.name.charAt(0).toLowerCase()}${spec.name.slice(1)}Schema`;
}

function validatorName(spec) {
  return `validate${spec.name}`;
}

function typeImportPath(spec) {
  return `./${path.basename(spec.typeOutput, ".ts")}`;
}

function runtimeSchemaModuleName(spec) {
  return path.basename(spec.typeOutput, ".ts")
    .replace(/CallablePayload$/, "Input")
    .replace(/CallableResponse$/, "Output");
}

function renderTsSchemaRegistry({
  schemaMap,
  eventAssistanceCatalog,
  eventAssistanceCommandBindingCatalog,
  profileCatalog,
  personFieldCatalog,
  organizerFormTemplateCatalog,
  hostAttentionPolicyCatalog,
  organizerEntitlementSkuCatalog,
  photoCatalog,
  profilePhotoPolicy,
}) {
  const exports = [];
  const moduleNames = new Set();
  for (const spec of schemaSpecs) {
    const key = runtimeSchemaModuleName(spec);
    if (moduleNames.has(key)) throw new Error(`Duplicate runtime schema module: ${key}`);
    moduleNames.add(key);
    const name = schemaConstName(spec);
    const module = runtimeSchemaModuleName(spec);
    addTextOutput(
      `functions/src/shared/generated/schemas/${module}.ts`,
      `${tsGeneratedHeader()}export const ${name}: Record<string, unknown> = ` +
        `${jsonForTs(schemaMap.get(spec.name))};\n`
    );
    exports.push(`export {${name}} from "./schemas/${module}";`);
  }
  const catalogEntries = [
    ["eventAssistanceWorkflowCatalog", eventAssistanceCatalog],
    ["eventAssistanceCommandBindingCatalog",
      eventAssistanceCommandBindingCatalog],
    ["profilePromptCatalog", profileCatalog],
    ["personFieldCatalog", personFieldCatalog],
    ["organizerFormTemplateCatalog", organizerFormTemplateCatalog],
    ["hostAttentionPolicyCatalog", hostAttentionPolicyCatalog],
    ["organizerEntitlementSkuCatalog", organizerEntitlementSkuCatalog],
    ["photoPromptCatalog", photoCatalog],
    ["profilePromptLimits", profileCatalog.limits],
    ["photoPromptLimits", photoCatalog.limits],
    ["profilePhotoPolicy", profilePhotoPolicy],
    ["defaultProfilePromptIds", profileCatalog.defaultPromptIds],
  ];
  for (const [name, value] of catalogEntries) {
    addTextOutput(
      `functions/src/shared/generated/catalogs/${name}.ts`,
      `${tsGeneratedHeader()}export const ${name} = ${jsonForTs(value)};\n`
    );
    exports.push(`export {${name}} from "./catalogs/${name}";`);
  }
  return `${tsGeneratedHeader()}// Aggregate inventory for tests and tools only.\n` +
    `// Runtime consumers import individual schemas or catalogs.\n\n` +
    `${exports.join("\n")}\n`;
}

function renderTsValidators() {
  const exports = [];
  for (const spec of schemaSpecs) {
    const module = runtimeSchemaModuleName(spec);
    const schema = schemaConstName(spec);
    const validator = validatorName(spec);
    addTextOutput(
      `functions/src/shared/generated/validators/${module}.ts`,
      `${tsGeneratedHeader()}import type {${spec.name}} from ".${typeImportPath(spec)}";\n` +
        `import {${schema}} from "../schemas/${module}";\n` +
        `import {lazyValidator} from "../schemaValidationRuntime";\n\n` +
        `export const ${validator} =\n` +
        `  lazyValidator<${spec.name}>(${schema});\n`
    );
    exports.push(`export {${validator}} from "./validators/${module}";`);
  }
  addTextOutput(
    "functions/src/shared/generated/schemaValidationRuntime.ts",
    renderTsValidationRuntime()
  );
  return `${tsGeneratedHeader()}// Aggregate inventory for tests and tools only.\n` +
    `// Runtime consumers import individual validators.\n\n` +
    `${exports.join("\n")}\n\n` +
    `export {schemaErrorMessages} from "./schemaValidationRuntime";\n`;
}

function renderTsValidationRuntime() {
  return `${tsGeneratedHeader()}import Ajv from "ajv";
import type {ValidateFunction} from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);

export function lazyValidator<T>(
  schema: Record<string, unknown>
): ValidateFunction<T> {
  let compiled: ValidateFunction<T> | null = null;
  const validate = ((data: unknown) => {
    compiled ??= ajv.compile(schema) as ValidateFunction<T>;
    return compiled(data);
  }) as ValidateFunction<T>;
  Object.defineProperty(validate, "errors", {
    get: () => compiled?.errors ?? null,
  });
  return validate;
}

export function schemaErrorMessages(
  validator: ValidateFunction<unknown>
): string[] {
  return (validator.errors ?? []).map((error) => {
    const location = error.instancePath || "/";
    return \`\${location} \${error.message ?? "failed validation"}\`;
  });
}
`;
}

function renderTsPathConstants({
  profileDecisionSchema,
  profileDecisionMigration,
}) {
  const pathParts = profileDecisionPathParts(profileDecisionSchema);
  const futurePathParts = profileDecisionPathParts(
    profileDecisionMigration?.candidatePrimaryStoragePath
  );
  return `${tsGeneratedHeader()}export const schemaProfileDecisionLogicalName =
  ${JSON.stringify(profileDecisionSchema["x-logical-name"] ?? "profileDecision")};
export const schemaProfileDecisionPathTemplate =
  ${JSON.stringify(pathParts.pathTemplate)};
export const schemaProfileDecisionTriggerPath =
  ${JSON.stringify(pathParts.triggerPath)};
export const schemaProfileDecisionCollectionPath =
  ${JSON.stringify(pathParts.collectionPath)};
export const schemaProfileDecisionOutgoingSubcollectionPath =
  ${JSON.stringify(pathParts.outgoingSubcollectionPath)};
export const schemaProfileDecisionFuturePathTemplate =
  ${JSON.stringify(futurePathParts.pathTemplate)};
export const schemaProfileDecisionFutureCollectionPath =
  ${JSON.stringify(futurePathParts.collectionPath)};
export const schemaProfileDecisionFutureOutgoingSubcollectionPath =
  ${JSON.stringify(futurePathParts.outgoingSubcollectionPath)};
`;
}

function renderToolSchemaRegistry({
  schemaMap,
  eventAssistanceCatalog,
  eventAssistanceCommandBindingCatalog,
  profileCatalog,
  personFieldCatalog,
  organizerFormTemplateCatalog,
  hostAttentionPolicyCatalog,
  organizerEntitlementSkuCatalog,
  photoCatalog,
  profilePhotoPolicy,
}) {
  const entries = schemaRegistryEntries(schemaMap);
  const catalogEntries = [
    ["eventAssistanceWorkflowCatalog", eventAssistanceCatalog],
    ["eventAssistanceCommandBindingCatalog",
      eventAssistanceCommandBindingCatalog],
    ["profilePromptCatalog", profileCatalog],
    ["personFieldCatalog", personFieldCatalog],
    ["organizerFormTemplateCatalog", organizerFormTemplateCatalog],
    ["hostAttentionPolicyCatalog", hostAttentionPolicyCatalog],
    ["organizerEntitlementSkuCatalog", organizerEntitlementSkuCatalog],
    ["photoPromptCatalog", photoCatalog],
    ["profilePromptLimits", profileCatalog.limits],
    ["photoPromptLimits", photoCatalog.limits],
    ["profilePhotoPolicy", profilePhotoPolicy],
    ["defaultProfilePromptIds", profileCatalog.defaultPromptIds],
  ];
  return `${mjsGeneratedHeader()}${entries.map(([name, schema]) =>
    `export const ${name} = ${jsonForJs(schema)};\n`
  ).join("\n")}\n${catalogEntries.map(([name, value]) =>
    `export const ${name} = ${jsonForJs(value)};\n`
  ).join("\n")}`;
}

function renderToolValidators() {
  const schemaImports = schemaSpecs.map((spec) =>
    `  ${schemaConstName(spec)},`
  ).join("\n");
  const validators = schemaSpecs.map((spec) =>
    `export const ${validatorName(spec)} = ajv.compile(${schemaConstName(spec)});`
  ).join("\n");

  return `${mjsGeneratedHeader()}import {createRequire} from "node:module";
import {
${schemaImports}
} from "./schema_contract_registry.mjs";

const requireFromRepo = createRequire(
  new URL("../../../package.json", import.meta.url)
);
const requireFromFunctions = createRequire(
  new URL("../../../functions/package.json", import.meta.url)
);

function requireContractDependency(name) {
  try {
    return requireFromRepo(name);
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
    return requireFromFunctions(name);
  }
}

const Ajv = requireContractDependency("ajv");
const addFormats = requireContractDependency("ajv-formats");

const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);

${validators}

export function schemaErrorMessages(validator) {
  return (validator.errors ?? []).map((error) => {
    const location = error.instancePath || "/";
    return \`\${location} \${error.message ?? "failed validation"}\`;
  });
}

export function assertValidSchemaPayload(validator, payload, label) {
  if (validator(payload)) return;
  const details = schemaErrorMessages(validator).join("; ");
  throw new Error(\`\${label} failed schema validation: \${details}\`);
}
`;
}

function renderWebsiteJoinWaitlistSchemas({requestSchema, responseSchema}) {
  return `${tsGeneratedHeader()}` +
`export const joinWaitlistRequestSchema: Record<string, unknown> =
  ${jsonForTs(requestSchema)};

export const joinWaitlistResponseSchema: Record<string, unknown> =
  ${jsonForTs(responseSchema)};
`;
}

function renderDartContracts({
  profileCatalog,
  personFieldCatalog,
  photoCatalog,
  profilePhotoPolicy,
  profilePromptSchema,
  photoPromptSchema,
  profilePhotoSchema,
  updateUserProfileSchema,
  profileDecisionSchema,
  profileDecisionMigration,
  commonSchema,
}) {
  const profileLimits = profileCatalog.limits;
  const photoLimits = photoCatalog.limits;
  const height = commonSchema.definitions.heightCm;
  const profileDecisionPath = profileDecisionPathParts(profileDecisionSchema);
  const profileDecisionFuturePath = profileDecisionPathParts(
    profileDecisionMigration?.candidatePrimaryStoragePath
  );
  const preferredAge = updateUserProfileSchema.properties.fields.properties
    .minAgePreference;
  const profilePrompts = profileCatalog.prompts.map((prompt) =>
    `  SchemaProfilePromptDefinition(` +
    `id: ${dartString(prompt.id)}, ` +
    `title: ${dartString(prompt.title)}, ` +
    `placeholder: ${dartString(prompt.placeholder)},` +
    `),`
  ).join("\n");
  const photoPrompts = photoCatalog.prompts.map((prompt) =>
    `  SchemaPhotoPromptDefinition(` +
    `id: ${dartString(prompt.id)}, ` +
    `title: ${dartString(prompt.title)}, ` +
    `placeholder: ${dartString(prompt.placeholder)},` +
    `),`
  ).join("\n");
  const defaultPromptIds = profileCatalog.defaultPromptIds
    .map((id) => `  ${dartString(id)},`)
    .join("\n");
  const personFields = personFieldCatalog.fields.map((field) =>
    `  SchemaPersonFieldDefinition(` +
    `id: ${dartString(field.id)}, ` +
    `aliases: <String>[${field.aliases.map(dartString).join(", ")}], ` +
    `questionKind: ${dartString(field.questionKind)}, ` +
    `transform: ${dartString(field.transform)}, ` +
    `privacyClass: ${dartString(field.privacyClass)}, ` +
    `prefillPolicy: ${dartString(field.prefillPolicy)}, ` +
    `hostPresentation: ${dartString(field.hostPresentation)}, ` +
    `authority: ${dartString(field.authority)}, ` +
    `privateProfilePath: ${dartLiteral(field.privateProfilePath)}, ` +
    `derivedFrom: ${dartLiteral(field.derivedFrom)}, ` +
    `publicProfileProjection: ` +
    `${dartString(field.publicProfileProjection)}, ` +
    `publicProfilePath: ${dartLiteral(field.publicProfilePath)},` +
    `),`
  ).join("\n");
  const personFieldAliases = personFieldCatalog.fields.flatMap((field) =>
    field.aliases.map((alias) =>
      `  ${dartString(alias)}: ${dartString(field.id)},`
    )
  ).join("\n");

  return `${dartGeneratedHeader()}
class SchemaProfilePromptDefinition {
  const SchemaProfilePromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

class SchemaPhotoPromptDefinition {
  const SchemaPhotoPromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

class SchemaPersonFieldDefinition {
  const SchemaPersonFieldDefinition({
    required this.id,
    required this.aliases,
    required this.questionKind,
    required this.transform,
    required this.privacyClass,
    required this.prefillPolicy,
    required this.hostPresentation,
    required this.authority,
    required this.privateProfilePath,
    required this.derivedFrom,
    required this.publicProfileProjection,
    required this.publicProfilePath,
  });

  final String id;
  final List<String> aliases;
  final String questionKind;
  final String transform;
  final String privacyClass;
  final String prefillPolicy;
  final String hostPresentation;
  final String authority;
  final String? privateProfilePath;
  final String? derivedFrom;
  final String publicProfileProjection;
  final String? publicProfilePath;
}

const schemaPersonFieldOrganizerAccessPolicy = ${dartString(
  personFieldCatalog.organizerAccessPolicy
)};
const schemaPersonFieldPublicProfileMetadataPolicy = ${dartString(
  personFieldCatalog.publicProfileMetadataPolicy
)};
const schemaPersonFieldTabularChoiceImportPolicy = ${dartString(
  personFieldCatalog.tabularChoiceImportPolicy
)};

const schemaProfilePromptPerfectEventId = ${dartString(
  profileCatalog.defaultPromptIds[0]
)};
const schemaMaxProfilePromptAnswers = ${profileLimits.maxAnswers};
const schemaMaxPhotoPromptCaptions = ${photoLimits.maxCaptions};
const schemaMinimumProfilePhotos = ${profilePhotoPolicy.minPhotos};
const schemaMaximumProfilePhotos = ${profilePhotoPolicy.maxPhotos};
const schemaProfilePhotoAspectRatioWidth =
    ${profilePhotoPolicy.displayAspectRatio.width};
const schemaProfilePhotoAspectRatioHeight =
    ${profilePhotoPolicy.displayAspectRatio.height};
const schemaProfilePhotoThumbnailSize = ${profilePhotoPolicy.thumbnailSize};
const schemaProfilePhotoMaxUploadBytes = ${profilePhotoPolicy.maxUploadBytes};
const schemaMaximumProfilePromptAnswerLength =
    ${profileLimits.maxAnswerLength};
const schemaMaximumPhotoPromptCaptionLength = ${photoLimits.maxCaptionLength};
const schemaMinimumProfileAge = ${preferredAge.minimum};
const schemaMaximumPreferredMatchAge = ${preferredAge.maximum};
const schemaMinimumHeightCm = ${height.minimum};
const schemaMaximumHeightCm = ${height.maximum};
const schemaProfileDecisionLogicalName =
    ${dartString(profileDecisionSchema["x-logical-name"] ?? "profileDecision")};
const schemaProfileDecisionPathTemplate =
    ${dartString(profileDecisionPath.pathTemplate)};
const schemaProfileDecisionCollectionPath =
    ${dartString(profileDecisionPath.collectionPath)};
const schemaProfileDecisionOutgoingSubcollectionPath =
    ${dartString(profileDecisionPath.outgoingSubcollectionPath)};
const schemaProfileDecisionFuturePathTemplate =
    ${dartString(profileDecisionFuturePath.pathTemplate)};
const schemaProfileDecisionFutureCollectionPath =
    ${dartString(profileDecisionFuturePath.collectionPath)};
const schemaProfileDecisionFutureOutgoingSubcollectionPath =
    ${dartString(profileDecisionFuturePath.outgoingSubcollectionPath)};

const schemaDefaultProfilePromptIds = <String>[
${defaultPromptIds}
];

const schemaProfilePromptCatalog = <SchemaProfilePromptDefinition>[
${profilePrompts}
];

const schemaPhotoPromptCatalog = <SchemaPhotoPromptDefinition>[
${photoPrompts}
];

const schemaPersonFieldCatalog = <SchemaPersonFieldDefinition>[
${personFields}
];

const schemaPersonFieldIdByNormalizedAlias = <String, String>{
${personFieldAliases}
};

String? schemaPersonFieldIdForNormalizedAlias(String alias) =>
    schemaPersonFieldIdByNormalizedAlias[alias];

SchemaPersonFieldDefinition? schemaPersonFieldForId(String id) {
  for (final field in schemaPersonFieldCatalog) {
    if (field.id == id) return field;
  }
  return null;
}

const schemaProfilePromptAnswerSchema = ${dartLiteral(profilePromptSchema)};

const schemaPhotoPromptAnswerSchema = ${dartLiteral(photoPromptSchema)};

const schemaProfilePhotoSchema = ${dartLiteral(profilePhotoSchema)};

const schemaUpdateUserProfileCallablePayloadSchema =
    ${dartLiteral(updateUserProfileSchema)};
`;
}

const DART_SCHEMA_OUTPUT_DIR = "lib/core/schema_contracts/generated/schemas";

function renderDartSchemaContracts({schemaMap}) {
  const files = [];
  const generatedConstants = [];
  const schemaExports = [];

  for (const spec of schemaSpecs) {
    const constName = dartSchemaConstName(spec.name);
    const output = dartSchemaOutputPath(spec.name);
    generatedConstants.push({
      constName,
      schemaName: spec.name,
      source: spec.source,
      output,
    });
    schemaExports.push(dartSchemaGeneratedExportPath(output));
    files.push({
      path: output,
      content: renderDartSchemaConstantFile({
        constName,
        source: spec.source,
        schema: schemaMap.get(spec.name),
      }),
    });
  }

  const definitions = schemaSpecs.map((spec) => {
    const schemaName = dartSchemaConstName(spec.name);
    return `  SchemaContractDefinition(
    name: ${dartString(spec.name)},
    source: ${dartString(spec.source)},
    schema: ${schemaName},
  ),`;
  }).join("\n");
  const byName = schemaSpecs.map((spec) =>
    `  ${dartString(spec.name)}: ${dartSchemaConstName(spec.name)},`
  ).join("\n");
  const bySource = schemaSpecs.map((spec) =>
    `  ${dartString(spec.source)}: ${dartSchemaConstName(spec.name)},`
  ).join("\n");

  files.push({
    path: `${DART_SCHEMA_OUTPUT_DIR}/schema_constants.g.dart`,
    content: `${dartGeneratedHeader()}
// Barrel for generated Dart JSON Schema constants.

${[...new Set(schemaExports)]
    .sort()
    .map((item) => `export '${item}';`)
    .join("\n")}
`,
  });

  files.push({
    path: `${DART_SCHEMA_OUTPUT_DIR}/schema_registry.g.dart`,
    content: `${dartGeneratedHeader()}import 'schema_constants.g.dart';

class SchemaContractDefinition {
  const SchemaContractDefinition({
    required this.name,
    required this.source,
    required this.schema,
  });

  final String name;
  final String source;
  final Map<String, Object?> schema;
}

const schemaContractDefinitions = <SchemaContractDefinition>[
${definitions}
];

const schemaContractsByName = <String, Map<String, Object?>>{
${byName}
};

const schemaContractsBySource = <String, Map<String, Object?>>{
${bySource}
};
`,
  });

  return {
    text: `${dartGeneratedHeader()}
// Stable barrel for generated Dart JSON Schema contracts.

export 'event_assistance_kinds.g.dart';
export 'event_success_moment_presentations.g.dart';
export 'field_constraints.g.dart';
export 'schemas/schema_constants.g.dart';
export 'schemas/schema_registry.g.dart';
`,
    files,
    generatedConstants,
  };
}

function renderDartFieldConstraints({schemaSpecs, schemaMap}) {
  const constraints = [];
  for (const spec of schemaSpecs) {
    const schema = schemaMap.get(spec.name);
    if (!schema) continue;

    const patchConfig = schema["x-callable-shape"] === "patch" ?
      dartPatchClassConfig(spec.name) :
      null;
    const rootName = lowerCamelCase(patchConfig?.className ?? spec.name);
    const rootSchema = patchConfig ? schema.properties?.fields : schema;
    if (!rootSchema || typeof rootSchema !== "object") continue;
    collectFieldConstraints({
      schema: rootSchema,
      rootName,
      segments: [],
      constraints,
    });
  }

  constraints.sort((a, b) => a.path.localeCompare(b.path));
  disambiguateFieldConstraintNames(constraints);
  const declarations = constraints.map((entry) => {
    const args = [
      `path: ${dartString(entry.path)}`,
      entry.maxLength == null ? null : `maxLength: ${entry.maxLength}`,
      entry.minLength == null ? null : `minLength: ${entry.minLength}`,
      entry.required ? "required: true" : null,
      entry.valueTypes == null ? null :
        `valueTypes: <String>[${entry.valueTypes.map(dartString).join(", ")}]`,
      entry.format == null ? null : `format: ${dartString(entry.format)}`,
      entry.pattern == null ? null : `pattern: ${dartString(entry.pattern)}`,
      entry.enumValues == null ? null :
        `enumValues: <String>[${entry.enumValues.map(dartString).join(", ")}]`,
      entry.itemValueTypes == null ? null :
        `itemValueTypes: <String>[${
          entry.itemValueTypes.map(dartString).join(", ")
        }]`,
      entry.itemEnumValues == null ? null :
        `itemEnumValues: <String>[${
          entry.itemEnumValues.map(dartString).join(", ")
        }]`,
      entry.minItems == null ? null : `minItems: ${entry.minItems}`,
      entry.maxItems == null ? null : `maxItems: ${entry.maxItems}`,
      entry.uniqueItems ? "uniqueItems: true" : null,
      entry.minimum == null ? null : `minimum: ${entry.minimum}`,
      entry.maximum == null ? null : `maximum: ${entry.maximum}`,
      entry.multipleOf == null ? null : `multipleOf: ${entry.multipleOf}`,
    ].filter(Boolean);
    return `  static const ${entry.constName} = CatchContractFieldConstraints(\n` +
      `${args.map((arg) => `    ${arg},`).join("\n")}\n` +
      "  );";
  }).join("\n\n");
  const allEntries = constraints.map((entry) =>
    `    ${dartString(entry.path)}: ${entry.constName},`
  ).join("\n");

  return `${dartGeneratedHeader()}
import 'package:catch_ui/catch_ui.dart' show CatchContractFieldConstraints;

/// App-owned field constraints projected from every generated JSON Schema.

abstract final class CatchContractConstraints {
${declarations}

  static const all = <String, CatchContractFieldConstraints>{
${allEntries}
  };
}
`;
}

function disambiguateFieldConstraintNames(constraints) {
  const entriesByName = new Map();
  for (const entry of constraints) {
    const entries = entriesByName.get(entry.constName) ?? [];
    entries.push(entry);
    entriesByName.set(entry.constName, entries);
  }

  const usedNames = new Set(
    constraints
      .filter((entry) => entriesByName.get(entry.constName)?.length === 1)
      .map((entry) => entry.constName),
  );
  for (const entries of entriesByName.values()) {
    if (entries.length === 1) continue;
    for (const entry of entries) {
      const pathSuffix = entry.segments.map(pascalCase).join("Property");
      const candidate = `${entry.constName}At${pathSuffix}`;
      let uniqueName = candidate;
      let suffix = 2;
      while (usedNames.has(uniqueName)) {
        uniqueName = `${candidate}${suffix}`;
        suffix += 1;
      }
      entry.constName = uniqueName;
      usedNames.add(uniqueName);
    }
  }
}

function collectFieldConstraints({schema, rootName, segments, constraints}) {
  const objectSchema = constraintObjectSchema(schema);
  const properties = objectSchema?.properties;
  if (!properties || typeof properties !== "object") return;
  const requiredFields = new Set(objectSchema.required ?? []);

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const nextSegments = [...segments, fieldName];
    const nestedObject = constraintObjectSchema(fieldSchema);
    if (nestedObject?.properties) {
      collectFieldConstraints({
        schema: nestedObject,
        rootName,
        segments: nextSegments,
        constraints,
      });
      continue;
    }

    const projected = projectFieldConstraint(
      fieldSchema,
      requiredFields.has(fieldName)
    );
    if (projected) {
      const path = `${rootName}.${nextSegments.join(".")}`;
      constraints.push({
        ...projected,
        path,
        segments: nextSegments,
        constName: `${rootName}${nextSegments.map(pascalCase).join("")}`,
      });
    }

    const itemObject = constraintObjectSchema(fieldSchema?.items);
    if (itemObject?.properties) {
      collectFieldConstraints({
        schema: itemObject,
        rootName,
        segments: [...nextSegments, "items"],
        constraints,
      });
    } else if (fieldSchema?.items && typeof fieldSchema.items === "object") {
      const itemConstraint = projectFieldConstraint(fieldSchema.items, true);
      if (itemConstraint) {
        const itemSegments = [...nextSegments, "items"];
        constraints.push({
          ...itemConstraint,
          path: `${rootName}.${itemSegments.join(".")}`,
          segments: itemSegments,
          constName: `${rootName}${itemSegments.map(pascalCase).join("")}`,
        });
      }
    }
  }
}

function constraintObjectSchema(schema) {
  if (!schema || typeof schema !== "object") return null;
  if (schema.type === "object" || schema.properties) return schema;
  const objectBranches = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]
    .filter((branch) => branch?.type === "object" || branch?.properties);
  if (objectBranches.length === 0) return null;
  return {
    properties: Object.assign(
      {},
      ...objectBranches.map((branch) => branch.properties ?? {}),
    ),
    required: [...new Set(
      objectBranches.flatMap((branch) => branch.required ?? []),
    )],
  };
}

function projectFieldConstraint(schema, parentRequired) {
  const branches = [schema, ...(schema?.anyOf ?? []), ...(schema?.oneOf ?? [])]
    .filter((branch) => branch && typeof branch === "object");
  const values = (key) => branches
    .map((branch) => branch[key])
    .filter((value) => value != null);
  const numberValue = (key, choose) => {
    const candidates = values(key).filter((value) => typeof value === "number");
    return candidates.length === 0 ? null : choose(...candidates);
  };
  const stringValues = values("pattern")
    .filter((value) => typeof value === "string");
  const patterns = [...new Set(stringValues)];
  const enumValues = [...new Set(
    branches.flatMap((branch) => Array.isArray(branch.enum) ? branch.enum : [])
      .filter((value) => typeof value === "string")
  )];
  const types = [...new Set(branches.flatMap((branch) => Array.isArray(branch.type) ?
    branch.type :
    [branch.type]
  ).filter((value) => typeof value === "string"))];
  const valueTypes = types.filter((type) => type !== "null");
  const formats = [...new Set(values("format")
    .filter((value) => typeof value === "string"))];
  const itemBranches = branches.flatMap((branch) => {
    const items = branch.items;
    if (!items || Array.isArray(items) || typeof items !== "object") return [];
    return [items, ...(items.anyOf ?? []), ...(items.oneOf ?? [])]
      .filter((item) => item && typeof item === "object");
  });
  const itemValueTypes = [...new Set(itemBranches.flatMap((item) =>
    Array.isArray(item.type) ? item.type : [item.type]
  ).filter((value) => typeof value === "string" && value !== "null"))];
  const itemEnumValues = [...new Set(itemBranches.flatMap((item) =>
    Array.isArray(item.enum) ? item.enum : []
  ).filter((value) => typeof value === "string"))];
  const allowsNull = types.includes("null") ||
    branches.some((branch) => branch.const === null);
  const allowsEmpty = branches.some((branch) => branch.const === "") ||
    branches.some((branch) => branch.minLength === 0);
  const minLength = numberValue("minLength", Math.min);
  const maxLength = numberValue("maxLength", Math.max);
  const required = (parentRequired || (minLength ?? 0) > 0) &&
    !allowsNull && !allowsEmpty;
  const result = {
    maxLength,
    minLength,
    required,
    valueTypes: valueTypes.length > 0 ? valueTypes : null,
    format: formats.length === 1 ? formats[0] : null,
    pattern: patterns.length === 1 ? patterns[0] : null,
    enumValues: enumValues.length > 0 ? enumValues : null,
    itemValueTypes: itemValueTypes.length > 0 ? itemValueTypes : null,
    itemEnumValues: itemEnumValues.length > 0 ? itemEnumValues : null,
    minItems: numberValue("minItems", Math.min),
    maxItems: numberValue("maxItems", Math.max),
    uniqueItems: values("uniqueItems").includes(true),
    minimum: numberValue("minimum", Math.min),
    maximum: numberValue("maximum", Math.max),
    multipleOf: numberValue("multipleOf", Math.min),
  };
  return Object.values(result).some((value) => value != null && value !== false) ?
    result :
    null;
}

function lowerCamelCase(value) {
  const converted = pascalCase(value);
  return converted.length === 0 ? converted :
    `${converted[0].toLowerCase()}${converted.slice(1)}`;
}

function dartSchemaOutputPath(name) {
  return `${DART_SCHEMA_OUTPUT_DIR}/${snakeCase(name)}.g.dart`;
}

function dartSchemaGeneratedExportPath(outputPath) {
  return outputPath.replace(`${DART_SCHEMA_OUTPUT_DIR}/`, "");
}

function renderDartSchemaConstantFile({constName, source, schema}) {
  return `${dartGeneratedHeader()}
// JSON Schema constant emitted from ${source}.

const ${constName} = ${dartLiteral(schema)};
`;
}

function renderGeneratedIndex({dartSchemaContracts, dartCallableRequests}) {
  const tsRows = schemaSpecs.map((spec) =>
    `| ${spec.name} | \`${spec.source}\` | \`${spec.typeOutput}\` |`
  ).join("\n");
  const dartSchemaRows = dartSchemaContracts.generatedConstants.map((entry) =>
    `| \`${entry.constName}\` | ${entry.schemaName} | ` +
    `\`${entry.source}\` | \`${entry.output}\` |`
  ).join("\n");
  const callableRows = dartCallableRequests.generatedClasses.length === 0 ?
    "| _None_ | _None_ | _None_ | _None_ |" :
    dartCallableRequests.generatedClasses.map((entry) =>
      `| ${entry.className} | ${entry.schemaName} | ` +
      `\`${entry.source}\` | \`${entry.output}\` |`
    ).join("\n");
  const ungenerableRows = dartCallableRequests.ungenerable.length === 0 ?
    "| _None_ | _None_ |" :
    dartCallableRequests.ungenerable.map((entry) =>
      `| ${entry.name} | ${entry.reason} |`
    ).join("\n");

  return `${markdownGeneratedHeader()}# Generated Schema Contracts Index

This file is generated by \`tool/contracts/generate_schema_contracts.mjs\`.
Do not edit it by hand.

## TypeScript Schema Types

| Generated Type | Source Schema | Output |
|---|---|---|
${tsRows}

## Dart Schema Constants

| Dart Constant | Schema Name | Source Schema | Output |
|---|---|---|---|
${dartSchemaRows}

## Dart Callable Classes

| Generated Class | Schema Name | Source Schema | Output |
|---|---|---|---|
${callableRows}

## Callable Schemas Still Hand-Written In Dart

| Schema | Reason |
|---|---|
${ungenerableRows}

## Registry And Validator Outputs

| Output | Purpose |
|---|---|
| \`functions/src/shared/generated/schemaRegistry.ts\` | TypeScript schema registry for Functions runtime code. |
| \`functions/src/shared/generated/schemaValidators.ts\` | Ajv validators compiled from callable/schema contracts. |
| \`functions/src/shared/generated/firestoreAdminTypes.ts\` | Admin SDK Timestamp-aware Firestore projection types. |
| \`functions/src/shared/generated/schemaPaths.ts\` | Generated storage/path constants for migrated logical paths. |
| \`tool/contracts/generated/schema_contract_registry.mjs\` | Node-side schema registry for validation tooling. |
| \`tool/contracts/generated/schema_contract_validators.mjs\` | Node-side Ajv validators for contract checks. |
| \`lib/core/schema_contracts/generated/profile_schema_contracts.g.dart\` | Dart profile catalog and storage policy constants. |
| \`lib/core/schema_contracts/generated/field_constraints.g.dart\` | UI-relevant constraints projected from patch and Firestore document schemas. |
| \`lib/core/schema_contracts/generated/schema_contracts.g.dart\` | Dart schema contract barrel. |
| \`lib/core/schema_contracts/generated/schemas/*.g.dart\` | One generated Dart JSON Schema constant file per schema, plus lookup registry files. |
| \`lib/core/schema_contracts/generated/callable_request_dtos.g.dart\` | Generated Dart callable request and patch helper barrel. |
| \`lib/core/schema_contracts/generated/callables/*.g.dart\` | One generated Dart callable request or patch helper file per schema-owned class. |
`;
}

function dartSchemaConstName(name) {
  return `schema${name}Schema`;
}

// ────────────────────────────────────────────────────────────────────────────
// Dart callable request DTO generation.
//
// Walks every callable payload schema (and the update_user_profile patch),
// emits a Dart class with constructor, fields, and toJson(). Classes for
// schemas that are still too rich (nested objects without inline class
// emission yet, anyOf with multiple non-null branches, etc.) are skipped and
// reported via the `dartUngenerable` list returned alongside the rendered
// text — the caller logs it so contributors see what's still hand-written.
// ────────────────────────────────────────────────────────────────────────────

// Callable schemas whose generated patch helper owns the callable wrapper via
// toCallableJson(), so emitting a separate *CallableRequest would duplicate the
// same payload shape:
//   - schemas with x-callable-shape: patch
//
// Callable schemas where the generator's projection would shadow a
// hand-written class that adds behavior the generator can't reproduce:
//   - EventBookingCallablePayload / CreateRazorpayOrderCallablePayload:
//     hand-written DTOs apply `inviteCode?.trim()` at serialization time.
//     The schemas exist for validation and as the contract source of truth;
//     the Dart classes stay hand-written so the trim normalization remains
//     attached to the boundary.
const DART_CALLABLE_REQUEST_SKIP = new Set([
  "EventBookingCallablePayload",
  "CreateRazorpayOrderCallablePayload",
]);

const DART_CALLABLE_REQUEST_OUTPUT_DIR =
  "lib/core/schema_contracts/generated/callables";

const DART_CALLABLE_FIELD_OVERRIDES = new Map([
  [
    "CreateClubCallableRequest.hostDefaults",
    {
      dartType: "ClubHostDefaults",
      imports: [
        "import 'package:catch_dating_app/clubs/domain/club_host_defaults.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.meetingLocation",
    {
      dartType: "EventMeetingLocation",
      imports: [
        "import 'package:catch_dating_app/events/domain/event_meeting_location.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.eventPolicy",
    {
      dartType: "EventPolicyBundle",
      imports: [
        "import 'package:catch_dating_app/event_policies/domain/event_policy.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.privateAccess",
    {
      dartType: "CreateEventPrivateAccess",
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.eventFormat",
    {
      dartType: "EventFormatSnapshot",
      imports: [
        "import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.eventSuccessDefaults",
    {
      dartType: "EventSuccessDefaults",
      imports: [
        "import 'package:catch_dating_app/event_success/domain/event_success_defaults.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.constraints",
    {
      dartType: "EventConstraints",
      imports: [
        "import 'package:catch_dating_app/events/domain/event_constraints.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
]);

function renderDartCallableRequestClasses({schemaSpecs, schemaMap, commonSchema}) {
  const files = [];
  const barrelExports = [];
  const ungenerable = [];
  const generatedClasses = [];
  const enumTypesBySignature = dartProfileEnumTypesBySignature(commonSchema);

  for (const spec of schemaSpecs) {
    if (!isCallableRequestSpec(spec)) continue;
    const schema = schemaMap.get(spec.name);
    if (!schema) continue;

    const callableShape = schema["x-callable-shape"];
    const isPatchShape = callableShape === "patch";

    if (isPatchShape) {
      if (!isPatchCallableSchema(schema)) {
        ungenerable.push({
          name: `${spec.name}Patch`,
          reason: "x-callable-shape patch requires a top-level required fields object",
        });
      } else {
        const patchResult = tryEmitDartPatchClass(
          spec,
          schema,
          enumTypesBySignature
        );
        if (patchResult.ok) {
          const output = dartCallableRequestOutputPath(patchResult.className);
          files.push({
            path: output,
            content: renderDartCallableRequestClassFile({
              imports: patchResult.imports,
              schemaSource: spec.source,
              body: patchResult.text,
            }),
          });
          barrelExports.push(dartGeneratedExportPath(output));
          generatedClasses.push({
            className: patchResult.className,
            schemaName: spec.name,
            source: spec.source,
            output,
          });
        } else {
          ungenerable.push({
            name: `${spec.name}Patch`,
            reason: patchResult.reason,
          });
        }
      }
    }

    if (isPatchShape || DART_CALLABLE_REQUEST_SKIP.has(spec.name)) continue;

    const result = tryEmitDartCallableClass(spec, schema);
    if (result.ok) {
      const output = dartCallableRequestOutputPath(result.className);
      files.push({
        path: output,
        content: renderDartCallableRequestClassFile({
          imports: result.imports,
          schemaSource: spec.source,
          body: result.text,
        }),
      });
      barrelExports.push(dartGeneratedExportPath(output));
      for (const className of result.classNames) {
        generatedClasses.push({
          className,
          schemaName: spec.name,
          source: spec.source,
          output,
        });
      }
    } else {
      ungenerable.push({name: spec.name, reason: result.reason});
    }
  }

  const body = barrelExports.length === 0 ?
    "// No callable request classes are currently generatable.\n" :
    [...new Set(barrelExports)]
      .sort()
      .map((item) => `export '${item}';`)
      .join("\n");
  const text = `${dartGeneratedHeader()}
// Typed callable request DTOs emitted from contracts/callables/ and
// contracts/patches/. The toJson() output of each class is validated against
// the corresponding JSON Schema by test/core/callable_dto_contracts_test.dart.
// Patch helper classes are emitted for schemas with x-callable-shape: patch.
// This file is a stable barrel; individual generated classes live under
// lib/core/schema_contracts/generated/callables/.
//
// Hand-written callable request/response helpers may still exist for schemas
// that need custom normalization or response parsing beyond generated request
// toJson() classes.

${body}
`;

  return {text, files, ungenerable, generatedClasses};
}

function dartCallableRequestOutputPath(className) {
  return `${DART_CALLABLE_REQUEST_OUTPUT_DIR}/${snakeCase(className)}.g.dart`;
}

function dartGeneratedExportPath(outputPath) {
  return outputPath.replace("lib/core/schema_contracts/generated/", "");
}

function renderDartCallableRequestClassFile({imports, schemaSource, body}) {
  const importBlock = [...(imports ?? [])].sort().join("\n");
  const normalizedBody = body.trimEnd();
  return `${dartGeneratedHeader()}${importBlock ? `${importBlock}\n\n` : ""}
// Typed callable request DTO emitted from ${schemaSource}.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

${normalizedBody}
`;
}

function isCallableRequestSpec(spec) {
  if (typeof spec.source !== "string") return false;
  if (spec.source.startsWith("callables/")) return true;
  if (spec.source === "patches/update_user_profile.schema.json") return true;
  return false;
}

function isPatchCallableSchema(schema) {
  return schema?.type === "object" &&
    schema?.properties?.fields?.type === "object" &&
    schema?.properties?.fields?.properties &&
    schema?.required?.includes("fields");
}

function tryEmitDartCallableClass(spec, schema) {
  if (schema.type !== "object" || !schema.properties) {
    return {ok: false, reason: "not an object schema"};
  }

  // BlockUserCallablePayload → BlockUserCallableRequest
  // CreateClubCallablePayload → CreateClubCallableRequest
  const className = spec.name.replace(/Payload$/, "Request");
  const required = new Set(schema.required ?? []);

  const fields = [];
  const imports = new Set();
  for (const [fieldName, prop] of Object.entries(schema.properties)) {
    const override = dartCallableFieldOverride(className, fieldName);
    const mapped = override?.dartType ?? mapDartType(prop);
    if (mapped === null) {
      return {
        ok: false,
        reason: `cannot map field "${fieldName}" (${describeSchemaType(prop)})`,
      };
    }
    for (const item of override?.imports ?? []) imports.add(item);
    const isRequired = required.has(fieldName);
    // Optional schema fields ("not in required") map to nullable Dart fields,
    // even when the schema type itself is non-null. JSON-side "omitted" is
    // Dart-side null. The map literal uses `?name` to drop entries when null.
    const dartType = isRequired || mapped.endsWith("?") ? mapped : `${mapped}?`;
    fields.push({
      name: fieldName,
      dartType,
      isRequired,
      jsonExpression: override?.jsonExpression?.(fieldName),
      nullableJsonExpression: override?.nullableJsonExpression?.(fieldName),
    });
  }

  if (fields.length === 0) {
    return {ok: false, reason: "no properties"};
  }

  const extraText = dartCallableExtraClassText(className);
  const text = formatDartCallableClass(className, fields, schema.description);
  const extraClassNames = dartCallableExtraClassNames(className);

  return {
    ok: true,
    className,
    imports,
    classNames: [...extraClassNames, className],
    text: extraText ? `${extraText}\n\n${text}` : text,
  };
}

function dartCallableFieldOverride(className, fieldName) {
  return DART_CALLABLE_FIELD_OVERRIDES.get(`${className}.${fieldName}`) ?? null;
}

function dartCallableExtraClassText(className) {
  if (className !== "CreateEventCallableRequest") return "";
  return `/// Nested private-access payload accepted by createEvent.
final class CreateEventPrivateAccess {
  const CreateEventPrivateAccess({this.inviteCode});

  final String? inviteCode;

  Map<String, Object?> toJson() => {
    'inviteCode': ?inviteCode,
  };
}`;
}

function dartCallableExtraClassNames(className) {
  if (className !== "CreateEventCallableRequest") return [];
  return ["CreateEventPrivateAccess"];
}

function tryEmitDartPatchClass(spec, schema, enumTypesBySignature) {
  const config = dartPatchClassConfig(spec.name);
  if (!config) {
    return {ok: false, reason: "no Dart patch config"};
  }
  const fieldsSchema = schema.properties.fields;
  const patchProperties = fieldsSchema.properties;
  if (!patchProperties || Object.keys(patchProperties).length === 0) {
    return {ok: false, reason: "patch fields object has no properties"};
  }

  const fields = [];
  for (const [fieldName, prop] of Object.entries(patchProperties)) {
    const mapped = mapDartPatchField(fieldName, prop, enumTypesBySignature, config);
    if (mapped === null) {
      return {
        ok: false,
        reason: `cannot map patch field "${fieldName}" (${describeSchemaType(prop)})`,
      };
    }
    fields.push({name: fieldName, ...mapped});
  }

  const callableFields = [];
  const callableRequired = new Set(schema.required ?? []);
  for (const [fieldName, prop] of Object.entries(schema.properties ?? {})) {
    if (fieldName === "fields") continue;
    const mapped = mapDartType(prop);
    if (mapped === null) {
      return {
        ok: false,
        reason: `cannot map callable wrapper field "${fieldName}" (${describeSchemaType(prop)})`,
      };
    }
    const isRequired = callableRequired.has(fieldName);
    const dartType = isRequired || mapped.endsWith("?") ? mapped : `${mapped}?`;
    callableFields.push({
      name: fieldName,
      dartType,
      isRequired,
    });
  }

  return {
    ok: true,
    className: config.className,
    imports: config.imports,
    text: formatDartPatchClass(config, fields, callableFields, schema.description),
  };
}

function dartPatchClassConfig(specName) {
  const className = specName
    .replace(/CallablePayload$/, "")
    .replace(/Payload$/, "") + "Patch";
  switch (specName) {
    case "UpdateUserProfileCallablePayload":
      return {
        className,
        sentinelName: "unsetSentinel",
        jsonValueHelperName: "_updateUserProfilePatchJsonValue",
        includeTimestampJsonHelper: true,
        imports: [
          "import 'package:catch_dating_app/core/sentinels.dart';",
          "import 'package:catch_dating_app/user_profile/domain/profile_photo.dart';",
          "import 'package:catch_dating_app/user_profile/domain/profile_prompts.dart';",
          "import 'package:catch_dating_app/user_profile/domain/user_profile.dart';",
          "import 'package:cloud_firestore/cloud_firestore.dart';",
        ],
        objectFields: new Map([["activityPreferences", "ActivityPreferences"]]),
        listObjectFields: new Map([
          ["profilePrompts", "ProfilePromptAnswer"],
          ["profilePhotos", "ProfilePhoto"],
        ]),
      };
    case "UpdateClubCallablePayload":
      return {
        className,
        sentinelName: "unsetSentinel",
        jsonValueHelperName: "_updateClubPatchJsonValue",
        includeTimestampJsonHelper: false,
        imports: [
          "import 'package:catch_dating_app/core/sentinels.dart';",
          "import 'package:catch_dating_app/clubs/domain/club_host_defaults.dart';",
        ],
        objectFields: new Map([["hostDefaults", "ClubHostDefaults"]]),
        listObjectFields: new Map(),
      };
    default:
      return null;
  }
}

function dartProfileEnumTypesBySignature(commonSchema) {
  const definitions = commonSchema?.definitions ?? {};
  const typesBySignature = new Map();
  for (const [name, definition] of Object.entries(definitions)) {
    if (!Array.isArray(definition?.enum)) continue;
    const values = definition.enum.filter((value) => value !== null);
    if (values.length === 0 || !values.every((value) => typeof value === "string")) {
      continue;
    }
    typesBySignature.set(enumSignature(values), pascalCase(name));
  }
  return typesBySignature;
}

function mapDartPatchField(fieldName, prop, enumTypesBySignature, config) {
  if (!prop || typeof prop !== "object") return null;
  const nullable = schemaAllowsNull(prop);
  const enumType = dartEnumTypeForSchema(prop, enumTypesBySignature);
  const dateTime = isMillisSinceEpochInteger(prop);
  const list = prop.type === "array" ? mapDartPatchListField(
    fieldName,
    prop,
    enumTypesBySignature,
    config
  ) : null;
  const objectType = config.objectFields.get(fieldName);

  if (list) {
    return {
      paramType: `${list.dartType}?`,
      nullable,
      jsonExpression: `${fieldName}.map((e) => ${list.itemJsonExpression("e")}).toList()`,
      usesJsonValueHelper: list.usesJsonValueHelper,
    };
  }
  if (enumType) {
    return {
      paramType: nullable ? "Object?" : `${enumType}?`,
      nullable,
      jsonExpression: nullable ?
        `(${fieldName} as ${enumType}?)?.name` :
        `${fieldName}.name`,
    };
  }
  if (dateTime) {
    return {
      paramType: "DateTime?",
      nullable,
      jsonExpression: `${fieldName}.millisecondsSinceEpoch`,
    };
  }
  if (objectType) {
    return {
      paramType: `${objectType}?`,
      nullable,
      jsonExpression: `${fieldName}.toJson()`,
    };
  }

  const scalarType = dartScalarPatchType(prop);
  if (scalarType) {
    return {
      paramType: nullable ? "Object?" : `${scalarType}?`,
      nullable,
      jsonExpression: nullable ? fieldName : fieldName,
    };
  }

  return null;
}

function mapDartPatchListField(fieldName, prop, enumTypesBySignature, config) {
  const items = prop.items;
  if (!items || typeof items !== "object") return null;
  const enumType = dartEnumTypeForSchema(items, enumTypesBySignature);
  if (enumType) {
    return {
      dartType: `List<${enumType}>`,
      itemJsonExpression: (value) => `${value}.name`,
    };
  }
  const objectType = config.listObjectFields.get(fieldName);
  if (objectType) {
    return {
      dartType: `List<${objectType}>`,
      itemJsonExpression: (value) =>
        `${config.jsonValueHelperName}(${value}.toJson())`,
      usesJsonValueHelper: true,
    };
  }
  const scalarType = dartScalarPatchType(items);
  if (scalarType) {
    return {
      dartType: `List<${scalarType}>`,
      itemJsonExpression: (value) => value,
    };
  }
  return null;
}

function dartScalarPatchType(prop) {
  if (!prop || typeof prop !== "object") return null;
  if (Array.isArray(prop.type)) {
    const nonNull = prop.type.filter((value) => value !== "null");
    if (nonNull.length !== 1) return null;
    return dartScalarPatchType({...prop, type: nonNull[0]});
  }
  if (Array.isArray(prop.anyOf) && !prop.type) {
    const nonNull = prop.anyOf.filter((item) => item?.type !== "null");
    const scalarTypes = new Set(nonNull.map(dartScalarPatchType).filter(Boolean));
    return scalarTypes.size === 1 ? [...scalarTypes][0] : null;
  }
  if (Object.hasOwn(prop, "const")) {
    if (typeof prop.const === "string") return "String";
    if (typeof prop.const === "number") {
      return Number.isInteger(prop.const) ? "int" : "double";
    }
    if (typeof prop.const === "boolean") return "bool";
  }
  switch (prop.type) {
    case "string": return "String";
    case "integer": return "int";
    case "number": return "double";
    case "boolean": return "bool";
    default: return null;
  }
}

function dartEnumTypeForSchema(prop, enumTypesBySignature) {
  if (!prop || typeof prop !== "object") return null;
  if (Array.isArray(prop.enum)) {
    const values = prop.enum.filter((value) => value !== null);
    if (values.length > 0 && values.every((value) => typeof value === "string")) {
      return enumTypesBySignature.get(enumSignature(values)) ?? null;
    }
  }
  if (Array.isArray(prop.anyOf)) {
    for (const item of prop.anyOf) {
      const type = dartEnumTypeForSchema(item, enumTypesBySignature);
      if (type) return type;
    }
  }
  return null;
}

function schemaAllowsNull(prop) {
  if (!prop || typeof prop !== "object") return false;
  if (Array.isArray(prop.type) && prop.type.includes("null")) return true;
  if (Array.isArray(prop.enum) && prop.enum.includes(null)) return true;
  if (Array.isArray(prop.anyOf)) return prop.anyOf.some(schemaAllowsNull);
  return prop.type === "null";
}

function isMillisSinceEpochInteger(prop) {
  if (!prop || typeof prop !== "object") return false;
  const type = Array.isArray(prop.type) ?
    prop.type.filter((value) => value !== "null")[0] :
    prop.type;
  return type === "integer" &&
    typeof prop.description === "string" &&
    /milliseconds since epoch/i.test(prop.description);
}

function enumSignature(values) {
  return values.join("\u0000");
}

function pascalCase(value) {
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .flatMap((part) => part.split(/(?=[A-Z])/))
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
}

function snakeCase(value) {
  return String(value)
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function formatDartPatchClass(config, fields, callableFields, description) {
  const helperBlock = fields.some((field) => field.usesJsonValueHelper) ?
    `\n${formatDartPatchJsonValueHelper(config)}` :
    "";
  const ctorParams = fields.map((field) => {
    const defaultValue = field.nullable ? ` = ${config.sentinelName}` : "";
    return `    ${field.paramType} ${field.name}${defaultValue},`;
  }).join("\n");

  const jsonEntries = fields.map((field) => {
    if (field.nullable) {
      return `         if (!identical(${field.name}, ${config.sentinelName}))
           ${dartString(field.name)}: ${field.jsonExpression},`;
    }
    return `         if (${field.name} != null)
           ${dartString(field.name)}: ${field.jsonExpression},`;
  }).join("\n");

  const docComment = description ?
    `/// Typed patch helper generated from ${description}\n` :
    "/// Typed patch helper generated from the updateUserProfile schema.\n";
  const callableJsonMethod = formatDartPatchCallableJsonMethod(callableFields);

  return `${docComment}final class ${config.className} {
  ${config.className}({
${ctorParams}
  }) : _fields = {
${jsonEntries}
       };

  /// Escape hatch for callers that compute the field key dynamically.
  /// Prefer the typed constructor for app presentation and repository code.
  ${config.className}.raw(Map<String, Object?> fields)
    : _fields = Map<String, Object?>.from(fields);

  final Map<String, Object?> _fields;

  Iterable<String> get keys => _fields.keys;

  bool get isEmpty => _fields.isEmpty;
  bool get isNotEmpty => _fields.isNotEmpty;

  Map<String, Object?> toFieldsJson() =>
      Map<String, Object?>.unmodifiable(_fields);
${callableJsonMethod}
}

${helperBlock}
`;
}

function formatDartPatchCallableJsonMethod(callableFields) {
  const params = callableFields.map((field) =>
    `    ${field.isRequired ? "required " : ""}${field.dartType} ${field.name},`
  ).join("\n");
  const signature = callableFields.length === 0 ?
    "toCallableJson()" :
    `toCallableJson({\n${params}\n  })`;
  const wrapperEntries = callableFields.map((field) => {
    const value = field.isRequired ? field.name : `?${field.name}`;
    return `    ${dartString(field.name)}: ${value},`;
  }).join("\n");
  const entries = [
    wrapperEntries,
    "    'fields': toFieldsJson(),",
  ].filter(Boolean).join("\n");
  return `
  Map<String, Object?> ${signature} => {
${entries}
  };`;
}

function formatDartPatchJsonValueHelper(config) {
  return `Object? ${config.jsonValueHelperName}(Object? value) {
  ${config.includeTimestampJsonHelper ? "if (value is Timestamp) return value.millisecondsSinceEpoch;\n  " : ""}if (value is DateTime) return value.millisecondsSinceEpoch;
  if (value is Iterable) {
    return value.map(${config.jsonValueHelperName}).toList();
  }
  if (value is Map) {
    return value.map(
      (key, child) => MapEntry(key, ${config.jsonValueHelperName}(child)),
    );
  }
  return value;
}`;
}

function mapDartType(prop) {
  if (!prop || typeof prop !== "object") return null;

  // Type union including null → nullable scalar.
  if (Array.isArray(prop.type)) {
    const isNullable = prop.type.includes("null");
    const nonNull = prop.type.filter((t) => t !== "null");
    if (nonNull.length !== 1) return null;
    const base = mapDartType({...prop, type: nonNull[0]});
    if (!base) return null;
    const baseStripped = base.endsWith("?") ? base.slice(0, -1) : base;
    return isNullable ? `${baseStripped}?` : base;
  }

  // anyOf with a "null" branch → nullable of the single non-null branch.
  if (Array.isArray(prop.anyOf) && !prop.type) {
    const hasNull = prop.anyOf.some((s) => s && s.type === "null");
    const nonNull = prop.anyOf.filter((s) => s && s.type !== "null");
    if (nonNull.length !== 1) return null;
    const inner = mapDartType(nonNull[0]);
    if (!inner) return null;
    const innerStripped = inner.endsWith("?") ? inner.slice(0, -1) : inner;
    return hasNull ? `${innerStripped}?` : inner;
  }

  // Enum (string with const list of values) → String for now.
  // The JSON Schema validates the value; Dart side stays String.

  switch (prop.type) {
    case "string": return "String";
    case "integer": return "int";
    case "number": return "double";
    case "boolean": return "bool";
    case "array": {
      if (!prop.items || typeof prop.items !== "object") return null;
      const innerType = mapDartType(prop.items);
      if (!innerType) return null;
      // Dart Lists drop the inner nullability suffix for the element type.
      const innerStripped = innerType.endsWith("?") ?
        innerType.slice(0, -1) :
        innerType;
      return `List<${innerStripped}>`;
    }
    case "object": {
      // Strictly-typed nested objects would ideally each get their own emitted
      // Dart class. For now, project them as Map<String, Object?> — matching
      // the choice the hand-written DTOs make for nested payloads. This keeps
      // the toJson() output schema-conformant while losing field-level Dart
      // typing for the nested shape. Future work: emit nested classes.
      return "Map<String, Object?>";
    }
    default: return null;
  }
}

function describeSchemaType(prop) {
  if (!prop || typeof prop !== "object") return "non-object";
  if (Array.isArray(prop.type)) return `type=[${prop.type.join(", ")}]`;
  if (Array.isArray(prop.anyOf)) return "anyOf";
  if (prop.type === "object" && prop.properties) return "nested object";
  return prop.type ? `type=${prop.type}` : "no type";
}

function formatDartCallableClass(className, fields, description) {
  const ctorParams = fields.map((f) =>
    f.isRequired ?
      `    required this.${f.name},` :
      `    this.${f.name},`
  ).join("\n");

  const fieldDecls = fields.map((f) =>
    `  final ${f.dartType} ${f.name};`
  ).join("\n");

  const jsonEntries = fields.map((f) => {
    const jsonExpression = f.jsonExpression ?? f.name;
    const nullableJsonExpression = f.nullableJsonExpression ?? jsonExpression;
    return f.isRequired ?
      `    ${dartString(f.name)}: ${jsonExpression},` :
      `    ${dartString(f.name)}: ?${nullableJsonExpression},`;
  }).join("\n");

  const docComment = description ?
    `/// ${description}\n` :
    "";

  return `${docComment}final class ${className} {
  const ${className}({
${ctorParams}
  });

${fieldDecls}

  Map<String, Object?> toJson() => {
${jsonEntries}
  };
}`;
}

function profileDecisionPathParts(schemaOrPath) {
  const pathTemplate = typeof schemaOrPath === "string" ?
    schemaOrPath :
    schemaOrPath?.["x-firestore-path"];
  if (typeof pathTemplate !== "string") {
    throw new Error("Profile decision path template is missing.");
  }
  const parts = pathTemplate.split("/");
  if (parts.length !== 4 || parts[2] !== "outgoing") {
    throw new Error(
      `Unexpected profile decision path template: ${pathTemplate}`
    );
  }
  return {
    pathTemplate,
    triggerPath: pathTemplate
      .replace("{userId}", "{swiperId}")
      .replace("{targetId}", "{targetId}"),
    collectionPath: parts[0],
    outgoingSubcollectionPath: parts[2],
  };
}

function bundleSchema(file) {
  const absoluteFile = path.resolve(file);
  const schema = readJsonFile(absoluteFile);
  return resolveRefs(schema, absoluteFile, true);
}

function resolveRefs(node, currentFile, keepSchemaMeta) {
  if (Array.isArray(node)) {
    return node.map((item) => resolveRefs(item, currentFile, false));
  }
  if (!node || typeof node !== "object") return node;

  if (typeof node.$ref === "string") {
    const {$ref, ...siblings} = node;
    const resolved = resolveReference($ref, currentFile);
    const merged = {
      ...stripSchemaMeta(resolveRefs(resolved.value, resolved.file, false)),
      ...resolveRefs(siblings, currentFile, false),
    };
    return Object.keys(merged).length === 0 ? true : merged;
  }

  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (!keepSchemaMeta && (key === "$schema" || key === "$id")) continue;
    result[key] = resolveRefs(value, currentFile, false);
  }
  return result;
}

function resolveReference(ref, currentFile) {
  if (/^[a-z]+:\/\//i.test(ref)) {
    throw new Error(`Remote schema refs are not supported by this generator: ${
      ref
    }`);
  }
  const [target, pointer = ""] = ref.split("#");
  const file = target ?
    path.resolve(path.dirname(currentFile), target) :
    currentFile;
  const json = readJsonFile(file);
  return {file, value: resolveJsonPointer(json, pointer)};
}

function resolveJsonPointer(document, pointer) {
  if (!pointer || pointer === "/") return document;
  if (!pointer.startsWith("/")) {
    throw new Error(`Unsupported JSON pointer: #${pointer}`);
  }
  return pointer
    .slice(1)
    .split("/")
    .reduce((value, token) => {
      const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
      if (value === undefined || value === null ||
          !Object.prototype.hasOwnProperty.call(value, key)) {
        throw new Error(`JSON pointer segment not found: ${key}`);
      }
      return value[key];
    }, document);
}

function stripSchemaMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const {$schema, $id, ...rest} = value;
  return rest;
}

function readContractJson(relativePath) {
  return readJsonFile(path.join(contractRoot, relativePath));
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function tsGeneratedHeader() {
  return `/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

`;
}

function mjsGeneratedHeader() {
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

`;
}

function dartGeneratedHeader() {
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements
`;
}

function markdownGeneratedHeader() {
  return `<!--
GENERATED CODE - DO NOT MODIFY BY HAND.
Regenerate with: node tool/contracts/generate_schema_contracts.mjs
-->

`;
}

function jsonForTs(value) {
  return `${JSON.stringify(value, null, 2)} as const`;
}

function jsonForJs(value) {
  return JSON.stringify(value, null, 2);
}

function dartLiteral(value) {
  if (value === null) return "null";
  if (typeof value === "string") return dartString(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "<Object?>[]";
    return `<Object?>[
${value.map((item) => indent(dartLiteral(item), 2)).join(",\n")},
]`;
  }
  const entries = Object.entries(value).map(([key, item]) =>
    `${indent(`${dartString(key)}: ${dartLiteral(item)}`, 2)}`
  );
  if (entries.length === 0) return "<String, Object?>{}";
  return `<String, Object?>{
${entries.join(",\n")},
}`;
}

function dartString(value) {
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}'`;
}

function indent(value, spaces) {
  const pad = " ".repeat(spaces);
  return String(value)
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

/** Render capability policy for every client from the same authored catalog. */
export function profileRequirementsOutputs(catalog, userSchema) {
  if (catalog.schemaVersion !== 1 || catalog.kind !== "profileRequirements") {
    throw new Error("Unsupported profile requirements catalog");
  }
  const fields = new Set(Object.keys(userSchema.properties));
  const resolve = (key, ancestors = []) => {
    const entry = catalog.capabilities[key];
    if (!entry || ancestors.includes(key)) {
      throw new Error(`Invalid profile capability inheritance: ${key}`);
    }
    const required = [...new Set([
      ...(entry.extends ? resolve(entry.extends, [...ancestors, key]) : []),
      ...entry.required,
    ])];
    for (const field of required) {
      if (!fields.has(field)) throw new Error(`Unknown profile field: ${field}`);
    }
    return required;
  };
  const capabilities = Object.fromEntries(Object.keys(catalog.capabilities)
    .map((key) => [key, resolve(key)]));
  for (const field of [...catalog.optionalAccountFields,
    ...Object.values(catalog.eventRequirements).flat()]) {
    if (!fields.has(field)) throw new Error(`Unknown profile field: ${field}`);
  }
  if (catalog.optionalAccountFields.some((field) =>
    capabilities.account.includes(field))) {
    throw new Error("Optional account fields cannot be required");
  }
  const header = "// GENERATED from contracts/catalogs/profile_requirements.json. Do not edit.\n";
  const json = (value) => JSON.stringify(value, null, 2);
  const ts = `${header}
export const profileRequiredFields = ${json(capabilities)} as const;
export const eventProfileRequirements = ${json(catalog.eventRequirements)} as const;
export const optionalAccountFields = ${json(catalog.optionalAccountFields)} as const;
export const eventAgePolicy = ${json(catalog.eventAgePolicy)} as const;
export type ProfileCapability = keyof typeof profileRequiredFields;
export type EventProfileRequirement = keyof typeof eventProfileRequirements;
export type ProfileRequirementField =
  (typeof profileRequiredFields)[ProfileCapability][number];

export function missingProfileFields(
  capability: ProfileCapability,
  hasField: (field: ProfileRequirementField) => boolean,
  eventRequirements: readonly EventProfileRequirement[] = [],
): ProfileRequirementField[] {
  const fields = new Set<ProfileRequirementField>(profileRequiredFields[capability]);
  if (capability === "eventBooking") {
    for (const requirement of eventRequirements) {
      for (const field of eventProfileRequirements[requirement]) fields.add(field);
    }
  }
  return [...fields].filter((field) => !hasField(field));
}
`;
  const dartMap = (value) => Object.entries(value).map(([key, values]) => {
    const prefix = `  '${key}': <String>[`;
    const line = `${prefix}${values.map((v) => `'${v}'`).join(', ')}],`;
    return line.length <= 80 ? line :
      `${prefix}\n${values.map((v) => `    '${v}',`).join('\n')}\n  ],`;
  }).join('\n');
  const dart = `${header}
const unrestrictedEventMinimumAge = ${catalog.eventAgePolicy.unrestrictedMinimum};
const openEndedEventMaximumAge = ${catalog.eventAgePolicy.openEndedMaximum};
const profileRequiredFields = <String, List<String>>{
${dartMap(capabilities)}
};
const eventProfileRequirements = <String, List<String>>{
${dartMap(catalog.eventRequirements)}
};
const optionalAccountFields = <String>[${catalog.optionalAccountFields.map((v) => `'${v}'`).join(', ')}];

List<String> missingProfileFields(
  String capability,
  bool Function(String field) hasField, {
  Iterable<String> eventRequirements = const [],
}) {
  final required = profileRequiredFields[capability];
  if (required == null) throw ArgumentError.value(capability, 'capability');
  final fields = <String>{...required};
  if (capability == 'eventBooking') {
    for (final requirement in eventRequirements) {
      final extra = eventProfileRequirements[requirement];
      if (extra == null) throw ArgumentError.value(requirement, 'requirement');
      fields.addAll(extra);
    }
  }
  return fields.where((field) => !hasField(field)).toList(growable: false);
}
`;
  return [
    {path: "functions/src/shared/generated/profileRequirements.ts", content: ts},
    {path: "website/src/shared/contracts/generated/profileRequirements.ts", content: ts},
    {path: "lib/core/schema_contracts/generated/profile_requirements.g.dart", content: dart},
  ];
}
