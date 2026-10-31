#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import * as schemaRegistry from "./generated/schema_contract_registry.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromRepo = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);

const Ajv = requireFromRepo("ajv");
const addFormats = requireFromRepo("ajv-formats");

export const fixtureSchemaCases = Object.freeze([
  ["valid/host_contact_summary.json", "hostContactSummaryDocumentSchema"],
  ["valid/host_directory_summary.json", "hostDirectorySummaryDocumentSchema"],
  ["valid/organizer_setup_preferences_sparse.json", "organizerEventSetupPreferencesSchema"],
  ["invalid/organizer_setup_preferences_null.json", "organizerEventSetupPreferencesSchema"],
  ["invalid/organizer_setup_preferences_secret.json", "organizerEventSetupPreferencesSchema"],
  ["invalid/organizer_setup_preferences_unattested.json", "organizerEventSetupPreferencesSchema"],
  ["valid/update_organizer_setup_defaults_clear.json", "updateOrganizerEventSetupDefaultsCallablePayloadSchema"],
  ["invalid/update_organizer_setup_defaults_clear_value.json", "updateOrganizerEventSetupDefaultsCallablePayloadSchema"],

  ["valid/activity_notification_doc.json", "activityNotificationDocumentSchema"],
  ["valid/host_membership_doc.json", "hostMembershipDocumentSchema"],
  ["valid/host_membership_plan_doc.json", "hostMembershipPlanDocumentSchema"],
  ["valid/event_membership_rules_doc.json", "eventMembershipRulesDocumentSchema"],
  ["valid/manage_host_membership_plans_save_payload.json", "manageHostMembershipPlansCallablePayloadSchema"],
  ["invalid/host_membership_doc_unknown_status.json", "hostMembershipDocumentSchema"],
  ["invalid/manage_host_membership_plans_payload_over_mandate_limit.json", "manageHostMembershipPlansCallablePayloadSchema"],
  ["valid/activity_preferences.json", "activityPreferencesSchema"],
  ["valid/archive_club_payload.json", "archiveClubCallablePayloadSchema"],
  ["valid/block_doc.json", "blockDocumentSchema"],
  ["valid/block_user_payload.json", "blockUserCallablePayloadSchema"],
  ["valid/cancel_event_payload.json", "cancelEventCallablePayloadSchema"],
  ["valid/chat_message_doc.json", "chatMessageDocumentSchema"],
  ["valid/club_doc.json", "clubDocumentSchema"],
  ["valid/club_host_claim_doc.json", "clubHostClaimDocumentSchema"],
  ["valid/club_membership_doc.json", "clubMembershipDocumentSchema"],
  ["valid/club_membership_payload.json", "clubMembershipCallablePayloadSchema"],
  ["valid/club_post_doc.json", "clubPostDocumentSchema"],
  ["valid/club_schedule_lock_doc.json", "clubScheduleLockDocumentSchema"],
  ["valid/config_cities_doc.json", "configCitiesDocumentSchema"],
  ["valid/create_chat_message_client_write.json", "createChatMessageClientWriteSchema"],
  ["valid/create_club_payload.json", "createClubCallablePayloadSchema"],
  ["valid/create_club_response.json", "createClubCallableResponseSchema"],
  ["valid/create_event_invite_link_payload.json", "createEventInviteLinkCallablePayloadSchema"],
  ["valid/create_event_payload.json", "createEventCallablePayloadSchema"],
  ["valid/create_event_review_payload.json", "createEventReviewCallablePayloadSchema"],
  ["valid/create_event_waitlist_offers_payload.json", "createEventWaitlistOffersCallablePayloadSchema"],
  ["valid/create_profile_decision_client_write.json", "createProfileDecisionClientWriteSchema"],
  ["valid/create_saved_event_client_write.json", "createSavedEventClientWriteSchema"],
  ["valid/delete_club_payload.json", "deleteClubCallablePayloadSchema"],
  ["valid/delete_event_payload.json", "deleteEventCallablePayloadSchema"],
  ["valid/delete_event_review_payload.json", "deleteEventReviewCallablePayloadSchema"],
  ["valid/delete_saved_event_client_write.json", "deleteSavedEventClientWriteSchema"],
  ["valid/deleted_user_tombstone_doc.json", "deletedUserTombstoneDocumentSchema"],
  ["valid/disable_event_invite_link_payload.json", "disableEventInviteLinkCallablePayloadSchema"],
  ["valid/event_doc.json", "eventDocumentSchema"],
  ["valid/event_broadcast_doc.json", "eventBroadcastDocumentSchema"],
  ["valid/event_attendee_doc.json", "eventAttendeeDocumentSchema"],
  ["valid/event_id_payload.json", "eventIdCallablePayloadSchema"],
  ["valid/event_invite_link_doc.json", "eventInviteLinkDocumentSchema"],
  ["valid/event_live_position_doc.json", "eventLivePositionDocumentSchema"],
  ["valid/event_participation_doc.json", "eventParticipationDocumentSchema"],
  ["valid/event_private_access_doc.json", "eventPrivateAccessDocumentSchema"],
  ["valid/event_safety_report_doc.json", "eventSafetyReportDocumentSchema"],
  ["valid/event_success_assignment_doc.json", "eventSuccessAssignmentDocumentSchema"],
  ["valid/event_success_compatibility_response_doc.json", "eventSuccessCompatibilityResponseDocumentSchema"],
  ["valid/event_success_conversation_graph_doc.json", "eventSuccessConversationGraphDocumentSchema"],
  ["valid/event_success_feedback_doc.json", "eventSuccessFeedbackDocumentSchema"],
  ["valid/event_success_late_arrival_doc.json", "eventSuccessLateArrivalDocumentSchema"],
  ["valid/event_success_plan_doc.json", "eventSuccessPlanDocumentSchema"],
  ["valid/event_success_presence_doc.json", "eventSuccessPresenceDocumentSchema"],
  ["valid/event_success_preference_doc.json", "eventSuccessPreferenceDocumentSchema"],
  ["valid/event_success_scorecard_doc.json", "eventSuccessScorecardDocumentSchema"],
  ["valid/event_success_standings_doc.json", "eventSuccessStandingsDocumentSchema"],
  ["valid/event_success_unit_outcomes_doc.json", "eventSuccessUnitOutcomesDocumentSchema"],
  ["valid/event_success_wingman_request_doc.json", "eventSuccessWingmanRequestDocumentSchema"],
  ["valid/event_waitlist_offer_doc.json", "eventWaitlistOfferDocumentSchema"],
  ["valid/explore_search_response.json", "exploreSearchCallableResponseSchema"],
  ["valid/external_event_doc.json", "externalEventDocumentSchema"],
  ["valid/organizer_public_page_doc.json", "organizerPublicPageDocumentSchema"],
  ["valid/event_public_page_doc.json", "eventPublicPageDocumentSchema"],
  ["valid/public_page_build_doc.json", "publicPageBuildDocumentSchema"],
  ["valid/city_plans_doc.json", "cityPlansDocumentSchema"],
  ["valid/fetch_event_success_wingman_candidates_response.json", "fetchEventSuccessWingmanCandidatesCallableResponseSchema"],
  ["valid/fetch_swipe_candidates_response.json", "fetchSwipeCandidatesCallableResponseSchema"],
  ["valid/function_event_receipt_doc.json", "functionEventReceiptDocumentSchema"],
  ["valid/host_profile_doc.json", "hostProfileDocumentSchema"],
  ["valid/join_waitlist_request_host.json", "joinWaitlistHTTPRequestSchema"],
  ["valid/join_waitlist_request_member.json", "joinWaitlistHTTPRequestSchema"],
  ["valid/join_waitlist_request_runner_compatibility.json", "joinWaitlistHTTPRequestSchema"],
  ["valid/join_waitlist_request_whatsapp.json", "joinWaitlistHTTPRequestSchema"],
  ["valid/admin_grant_organizer_entitlement_payload.json", "adminGrantOrganizerEntitlementCallablePayloadSchema"],
  ["valid/admin_revoke_organizer_entitlement_grant_payload.json", "adminRevokeOrganizerEntitlementGrantCallablePayloadSchema"],
  ["valid/get_organizer_entitlement_payload.json", "getOrganizerEntitlementCallablePayloadSchema"],
  ["valid/join_waitlist_response_error.json", "joinWaitlistHTTPResponseSchema"],
  ["valid/join_waitlist_response_success.json", "joinWaitlistHTTPResponseSchema"],
  ["valid/list_suvbot_demo_actions_response.json", "listSuvbotDemoActionsCallableResponseSchema"],
  ["valid/mark_event_attendance_payload.json", "markEventAttendanceCallablePayloadSchema"],
  ["valid/mark_event_attendance_response.json", "markEventAttendanceCallableResponseSchema"],
  ["valid/mark_notification_read_client_write.json", "markNotificationReadClientWriteSchema"],
  ["valid/match_doc.json", "matchDocumentSchema"],
  ["valid/moderation_flag_doc.json", "moderationFlagDocumentSchema"],
  ["valid/native_refund_recovery_cursor.json", "nativeRefundRecoveryCursorDocumentSchema"],
  ["valid/onboarding_draft_doc.json", "onboardingDraftDocumentSchema"],
  ["valid/organizer_attention_item_doc.json", "organizerAttentionItemDocumentSchema"],
  ["valid/organizer_campaign_recipient_program_doc.json", "organizerCampaignRecipientDocumentSchema"],
  ["valid/organizer_entitlement_doc.json", "organizerEntitlementsDocumentSchema"],
  ["valid/organizer_entitlement_mutation_response.json", "organizerEntitlementMutationCallableResponseSchema"],
  ["valid/organizer_entitlement_receipt_doc.json", "organizerEntitlementReceiptDocumentSchema"],
  ["valid/organizer_entitlement_response.json", "organizerEntitlementCallableResponseSchema"],
  ["valid/organizer_program_doc.json", "organizerProgramDocumentSchema"],
  ["valid/payment_doc.json", "paymentDocumentSchema"],
  ["valid/photo_prompt_answer.json", "photoPromptAnswerSchema"],
  ["valid/place_details_payload.json", "placeDetailsCallablePayloadSchema"],
  ["valid/place_details_response.json", "placeDetailsCallableResponseSchema"],
  ["valid/places_autocomplete_payload.json", "placesAutocompleteCallablePayloadSchema"],
  ["valid/places_autocomplete_response.json", "placesAutocompleteCallableResponseSchema"],
  ["valid/profile_photo.json", "profilePhotoSchema"],
  ["valid/profile_prompt_answer.json", "profilePromptAnswerSchema"],
  ["valid/apply_program_function_invitations_payload.json",
    "applyProgramFunctionInvitationsCallablePayloadSchema"],
  ["valid/issue_program_household_rsvp_link_payload.json",
    "issueProgramHouseholdRsvpLinkCallablePayloadSchema"],
  ["valid/submit_program_household_rsvp_payload.json",
    "submitProgramHouseholdRsvpCallablePayloadSchema"],
  ["valid/record_program_function_rsvp_payload.json",
    "recordProgramFunctionRsvpCallablePayloadSchema"],
  ["valid/program_function_doc.json", "programFunctionDocumentSchema"],
  ["valid/program_door_journal_doc.json", "programDoorJournalDocumentSchema"],
  ["valid/program_function_guest_doc.json", "programFunctionGuestDocumentSchema"],
  ["valid/program_guest_doc.json", "programGuestDocumentSchema"],
  ["valid/program_guest_group_doc.json", "programGuestGroupDocumentSchema"],
  ["valid/program_household_doc.json", "programHouseholdDocumentSchema"],
  ["valid/program_staff_grant_doc.json", "programStaffGrantDocumentSchema"],
  ["valid/program_staff_invite_doc.json", "programStaffInviteDocumentSchema"],
  ["valid/program_room_block_doc.json", "programRoomBlockDocumentSchema"],
  ["valid/program_stay_doc.json", "programStayDocumentSchema"],
  ["valid/program_travel_leg_doc.json", "programTravelLegDocumentSchema"],
  ["valid/record_program_door_journal_payload.json", "recordProgramDoorJournalCallablePayloadSchema"],
  ["valid/public_profile_doc.json", "publicProfileDocumentSchema"],
  ["valid/rate_limit_doc.json", "rateLimitDocumentSchema"],
  ["valid/razorpay_order_response.json", "razorpayOrderCallableResponseSchema"],
  ["valid/record_event_invite_link_open_payload.json", "recordEventInviteLinkOpenCallablePayloadSchema"],
  ["valid/report_doc.json", "reportDocumentSchema"],
  ["valid/report_user_payload.json", "reportUserCallablePayloadSchema"],
  ["valid/reset_match_unread_count_client_write.json", "resetMatchUnreadCountClientWriteSchema"],
  ["valid/review_doc.json", "reviewDocumentSchema"],
  ["valid/saved_event_doc.json", "savedEventDocumentSchema"],
  ["valid/seed_event_manifest_doc.json", "seedEventManifestDocumentSchema"],
  ["valid/self_check_in_attendance_payload.json", "selfCheckInAttendanceCallablePayloadSchema"],
  ["valid/set_event_success_accountability_resolution_payload.json", "setEventSuccessAccountabilityResolutionCallablePayloadSchema"],
  ["valid/send_event_broadcast_payload.json", "sendEventBroadcastCallablePayloadSchema"],
  ["valid/send_event_broadcast_response.json", "sendEventBroadcastCallableResponseSchema"],
  ["valid/set_club_notification_preference_payload.json", "setClubNotificationPreferenceCallablePayloadSchema"],
  ["valid/stripe_checkout_session_response.json", "stripeCheckoutSessionCallableResponseSchema"],
  ["valid/stripe_host_onboarding_link_response.json", "stripeHostOnboardingLinkCallableResponseSchema"],
  ["valid/submit_event_success_wingman_request_payload.json", "submitEventSuccessWingmanRequestCallablePayloadSchema"],
  ["valid/swipe_doc.json", "swipeDocumentSchema"],
  ["valid/transport_trip_doc.json", "transportTripDocumentSchema"],
  ["valid/transport_trip_snapshot_doc.json", "transportTripDocumentSchema"],
  ["valid/transport_vehicle_assignment_doc.json", "transportVehicleAssignmentDocumentSchema"],
  ["valid/unblock_user_payload.json", "unblockUserCallablePayloadSchema"],
  ["valid/update_club_payload.json", "updateClubCallablePayloadSchema"],
  ["valid/update_event_payload.json", "updateEventCallablePayloadSchema"],
  ["valid/update_event_review_payload.json", "updateEventReviewCallablePayloadSchema"],
  ["valid/update_user_profile_patch.json", "updateUserProfileCallablePayloadSchema"],
  ["valid/uploaded_photo.json", "uploadedPhotoSchema"],
  ["valid/upsert_organizer_campaign_program_selection_payload.json", "upsertOrganizerCampaignCallablePayloadSchema"],
  ["valid/organizer_moment_doc.json", "organizerMomentDocumentSchema"],
  ["valid/organizer_moment_run_doc.json", "organizerMomentRunDocumentSchema"],
  ["valid/organizer_moment_send_doc.json", "organizerMomentSendDocumentSchema"],
  ["valid/upsert_organizer_moment_payload.json", "upsertOrganizerMomentCallablePayloadSchema"],
  ["valid/organizer_moment_action_payload.json", "organizerMomentActionCallablePayloadSchema"],
  ["valid/run_organizer_moment_payload.json", "runOrganizerMomentCallablePayloadSchema"],
  ["valid/list_organizer_moments_payload.json", "listOrganizerMomentsCallablePayloadSchema"],
  ["valid/organizer_moment_response.json", "organizerMomentCallableResponseSchema"],
  ["valid/list_organizer_moments_response.json", "listOrganizerMomentsCallableResponseSchema"],
  ["valid/run_organizer_moment_response.json", "runOrganizerMomentCallableResponseSchema"],
  ["valid/user_analytics_response.json", "userAnalyticsCallableResponseSchema"],
  ["valid/user_event_schedule_lock_doc.json", "userEventScheduleLockDocumentSchema"],
  ["valid/user_profile_doc.json", "userProfileDocumentSchema"],
  ["valid/verify_razorpay_payment_payload.json", "verifyRazorpayPaymentCallablePayloadSchema"],
  ["invalid/activity_preferences_invalid_version.json", "activityPreferencesSchema"],
  ["invalid/admin_grant_organizer_entitlement_payload_bad_sku.json", "adminGrantOrganizerEntitlementCallablePayloadSchema"],
  ["invalid/admin_revoke_organizer_entitlement_grant_payload_missing_grant.json", "adminRevokeOrganizerEntitlementGrantCallablePayloadSchema"],
  ["invalid/get_organizer_entitlement_payload_missing_organizer.json", "getOrganizerEntitlementCallablePayloadSchema"],
  ["invalid/club_schedule_lock_invalid_owner.json", "clubScheduleLockDocumentSchema"],
  ["invalid/create_chat_message_empty_client_write.json", "createChatMessageClientWriteSchema"],
  ["invalid/create_event_review_invalid_rating.json", "createEventReviewCallablePayloadSchema"],
  ["invalid/event_doc_invalid_pace.json", "eventDocumentSchema"],
  ["invalid/event_live_position_invalid_latitude.json", "eventLivePositionDocumentSchema"],
  ["invalid/event_success_unit_outcomes_multiple_values.json", "eventSuccessUnitOutcomesDocumentSchema"],
  ["invalid/external_event_doc_enables_catch_booking.json", "externalEventDocumentSchema"],
  ["invalid/organizer_public_page_doc_with_events_in_listing.json", "organizerPublicPageDocumentSchema"],
  ["invalid/organizer_public_page_doc_contact_field.json", "organizerPublicPageDocumentSchema"],
  ["invalid/event_public_page_doc_balanced_label.json", "eventPublicPageDocumentSchema"],
  ["invalid/event_public_page_doc_dating_field.json", "eventPublicPageDocumentSchema"],
  ["invalid/city_plans_doc_dating_activity.json", "cityPlansDocumentSchema"],
  ["invalid/city_plans_doc_contact_field.json", "cityPlansDocumentSchema"],
  ["invalid/join_waitlist_request_missing_city.json", "joinWaitlistHTTPRequestSchema"],
  ["invalid/join_waitlist_request_member_missing_email.json", "joinWaitlistHTTPRequestSchema"],
  ["invalid/join_waitlist_request_whatsapp_host.json", "joinWaitlistHTTPRequestSchema"],
  ["invalid/join_waitlist_request_whatsapp_marketing_unset.json", "joinWaitlistHTTPRequestSchema"],
  ["invalid/join_waitlist_response_missing_ok.json", "joinWaitlistHTTPResponseSchema"],
  ["invalid/organizer_attention_item_embedded_predicate.json", "organizerAttentionItemDocumentSchema"],
  ["invalid/organizer_entitlement_doc_unknown_sku.json", "organizerEntitlementsDocumentSchema"],
  ["invalid/organizer_entitlement_doc_negative_meter.json", "organizerEntitlementsDocumentSchema"],
  ["invalid/organizer_entitlement_receipt_doc_bad_action.json", "organizerEntitlementReceiptDocumentSchema"],
  ["invalid/organizer_entitlement_response_missing_catalog.json", "organizerEntitlementCallableResponseSchema"],
  ["invalid/places_autocomplete_short_input.json", "placesAutocompleteCallablePayloadSchema"],
  ["invalid/profile_photo_invalid_storage_path.json", "profilePhotoSchema"],
  ["invalid/profile_prompt_answer_overlong.json", "profilePromptAnswerSchema"],
  ["invalid/program_function_guest_doc_bad_rsvp.json", "programFunctionGuestDocumentSchema"],
  ["invalid/record_program_function_rsvp_payload_bad_status.json",
    "recordProgramFunctionRsvpCallablePayloadSchema"],
  ["invalid/organizer_moment_doc_bad_status.json",
    "organizerMomentDocumentSchema"],
  ["invalid/upsert_organizer_moment_payload_bad_initiation.json",
    "upsertOrganizerMomentCallablePayloadSchema"],
  ["invalid/organizer_moment_send_doc_bad_reason.json",
    "organizerMomentSendDocumentSchema"],
  ["invalid/program_door_journal_doc_bad_action.json", "programDoorJournalDocumentSchema"],
  ["invalid/program_function_guest_doc_missing_function.json", "programFunctionGuestDocumentSchema"],
  ["invalid/program_guest_group_doc_bad_count.json", "programGuestGroupDocumentSchema"],
  ["invalid/program_stay_doc_bad_status.json", "programStayDocumentSchema"],
  ["invalid/razorpay_order_response_missing_amount.json", "razorpayOrderCallableResponseSchema"],
  ["invalid/record_program_door_journal_payload_empty_operations.json", "recordProgramDoorJournalCallablePayloadSchema"],
  ["invalid/reset_match_unread_count_multiple_users.json", "resetMatchUnreadCountClientWriteSchema"],
  ["invalid/send_event_broadcast_invalid_audience.json", "sendEventBroadcastCallablePayloadSchema"],
  ["invalid/swipe_doc_invalid_reaction_target.json", "swipeDocumentSchema"],
  ["invalid/update_club_empty_fields.json", "updateClubCallablePayloadSchema"],
  ["invalid/update_event_empty_fields.json", "updateEventCallablePayloadSchema"],
  ["invalid/update_user_profile_empty_patch.json", "updateUserProfileCallablePayloadSchema"],
  ["invalid/update_user_profile_height_out_of_range.json", "updateUserProfileCallablePayloadSchema"],
  ["invalid/update_user_profile_invalid_email.json", "updateUserProfileCallablePayloadSchema"],
  ["invalid/uploaded_photo_invalid_position.json", "uploadedPhotoSchema"],
  ["invalid/user_profile_legacy_bio.json", "userProfileDocumentSchema"],
]);

export function checkSchemaFixtures({root = repoRoot} = {}) {
  const errors = [];
  const fixtureRoot = path.join(root, "contracts/fixtures");
  const actualFixturePaths = collectFixturePaths(fixtureRoot);
  const declaredFixturePaths = fixtureSchemaCases.map(([fixturePath]) => fixturePath);
  const declaredSet = new Set(declaredFixturePaths);
  const actualSet = new Set(actualFixturePaths);

  for (const fixturePath of declaredFixturePaths) {
    if (declaredFixturePaths.indexOf(fixturePath) !== declaredFixturePaths.lastIndexOf(fixturePath)) {
      errors.push(`${fixturePath}: fixture is declared more than once.`);
    }
    if (!actualSet.has(fixturePath)) {
      errors.push(`${fixturePath}: fixture declaration has no matching file.`);
    }
  }
  for (const fixturePath of actualFixturePaths) {
    if (!declaredSet.has(fixturePath)) {
      errors.push(`${fixturePath}: fixture is not declared in check_schema_fixtures.mjs.`);
    }
  }

  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  const validators = new Map();

  for (const [fixturePath, schemaExportName] of fixtureSchemaCases) {
    const schema = schemaRegistry[schemaExportName];
    if (schema == null) {
      errors.push(`${fixturePath}: schema export ${schemaExportName} does not exist.`);
      continue;
    }
    const absoluteFixturePath = path.join(fixtureRoot, fixturePath);
    if (!fs.existsSync(absoluteFixturePath)) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(absoluteFixturePath, "utf8"));
    } catch (error) {
      errors.push(`${fixturePath}: ${error.message}`);
      continue;
    }

    let validate = validators.get(schemaExportName);
    if (!validate) {
      validate = ajv.compile(schema);
      validators.set(schemaExportName, validate);
    }
    const expectedValid = fixturePath.startsWith("valid/");
    const isValid = validate(data);
    if (isValid !== expectedValid) {
      errors.push(
        `${fixturePath}: expected ${expectedValid ? "valid" : "invalid"} ` +
        `for ${schemaExportName}; got ${isValid ? "valid" : "invalid"} ` +
        `${formatAjvErrors(validate.errors)}`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    fixtureCount: actualFixturePaths.length,
    validFixtureCount: actualFixturePaths.filter((fixturePath) =>
      fixturePath.startsWith("valid/")
    ).length,
    invalidFixtureCount: actualFixturePaths.filter((fixturePath) =>
      fixturePath.startsWith("invalid/")
    ).length,
  };
}

function collectFixturePaths(fixtureRoot) {
  return ["valid", "invalid"].flatMap((kind) => {
    const directory = path.join(fixtureRoot, kind);
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory)
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => `${kind}/${entry}`)
      .sort((a, b) => a.localeCompare(b));
  });
}

function formatAjvErrors(errors) {
  if (!errors || errors.length === 0) return "";
  return errors
    .slice(0, 5)
    .map((error) => {
      const location = error.instancePath || "/";
      return `${location} ${error.message ?? "failed validation"}`;
    })
    .join("; ");
}

function runCli() {
  const result = checkSchemaFixtures();
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Schema fixture check passed ` +
    `(fixtures=${result.fixtureCount}, valid=${result.validFixtureCount}, ` +
    `invalid=${result.invalidFixtureCount}).`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
