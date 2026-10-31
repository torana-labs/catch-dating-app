import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  schemaErrorMessages,
  validateActivityNotificationDocument,
  validateArchiveOrganizerCallablePayload,
  validateBlockUserCallablePayload,
  validateBlockDocument,
  validateCancelEventCallablePayload,
  validateChatMessageDocument,
  validateConfigCitiesDocument,
  validateCreateEventCallablePayload,
  validateCreateOrganizerCallablePayload,
  validateCreateOrganizerCallableResponse,
  validateCreateEventReviewCallablePayload,
  validateCreateChatMessageClientWrite,
  validateCreateProfileDecisionClientWrite,
  validateCreateSavedEventClientWrite,
  validateDeleteEventCallablePayload,
  validateDeleteOrganizerCallablePayload,
  validateDeleteEventReviewCallablePayload,
  validateDeleteSavedEventClientWrite,
  validateDeletedUserTombstoneDocument,
  validateFunctionEventReceiptDocument,
  validateFetchSwipeCandidatesCallableResponse,
  validateMarkNotificationReadClientWrite,
  validateMarkEventAttendanceCallablePayload,
  validateMarkEventAttendanceCallableResponse,
  validateMatchDocument,
  validateModerationFlagDocument,
  validateOnboardingDraftDocument,
  validatePaymentDocument,
  validatePlaceDetailsCallablePayload,
  validatePlaceDetailsCallableResponse,
  validatePlacesAutocompleteCallablePayload,
  validatePlacesAutocompleteCallableResponse,
  validatePhotoPromptAnswer,
  validateProfilePhoto,
  validateProfilePromptAnswer,
  validatePublicProfileDocument,
  validateRateLimitDocument,
  validateReportDocument,
  validateReportUserCallablePayload,
  validateReviewDocument,
  validateResetMatchUnreadCountClientWrite,
  validateOrganizerHostClaimDocument,
  validateOrganizerScheduleLockDocument,
  validateEventIdCallablePayload,
  validateOrganizerDocument,
  validateOrganizerMembershipDocument,
  validateEventDocument,
  validateExternalEventDocument,
  validateEventParticipationDocument,
  validateEventSafetyReportDocument,
  validateEventSuccessAssignmentDocument,
  validateEventSuccessCompatibilityResponseDocument,
  validateEventSuccessConversationGraphDocument,
  validateEventSuccessFeedbackDocument,
  validateEventSuccessPlanDocument,
  validateEventSuccessPreferenceDocument,
  validateEventSuccessScorecardDocument,
  validateEventSuccessWingmanRequestDocument,
  validateSubmitEventSuccessWingmanRequestCallablePayload,
  validateSavedEventDocument,
  validateSeedEventManifestDocument,
  validateOrganizerMembershipCallablePayload,
  validateSelfCheckInAttendanceCallablePayload,
  validateSetOrganizerNotificationPreferenceCallablePayload,
  validateSwipeDocument,
  validateUpdateUserProfileCallablePayload,
  validateUpdateEventCallablePayload,
  validateUpdateOrganizerCallablePayload,
  validateUpdateEventReviewCallablePayload,
  validateUnblockUserCallablePayload,
  validateUserEventScheduleLockDocument,
  validateUserProfileDocument,
  validateVerifyRazorpayPaymentCallablePayload,
  validateRazorpayOrderCallableResponse,
} from "./generated/schemaValidators";

type Validator = Parameters<typeof schemaErrorMessages>[0];
const contractRoot = fs.existsSync(path.resolve(process.cwd(), "contracts")) ?
  path.resolve(process.cwd(), "contracts") :
  path.resolve(process.cwd(), "..", "contracts");

function readFixture(relativePath: string): unknown {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(contractRoot, relativePath),
      "utf8"
    )
  );
}

function assertValid(validator: Validator, payload: unknown) {
  assert.equal(validator(payload), true, schemaErrorMessages(validator).join(
    "\n"
  ));
}

function assertInvalid(validator: Validator, payload: unknown) {
  assert.equal(validator(payload), false);
}

function eventPolicyFixture(
  basePriceInPaise: number,
  policyId: "notApplicable" | "standard"
) {
  return {
    version: 2,
    admission: {
      format: "open",
      capacityLimit: 12,
      waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: false,
      privateAccessPolicy: {
        mode: "none",
        inviteCodeHint: null,
        privateLinkEnabled: false,
      },
      cohortCapacityLimits: {},
      balancedRatioPolicy: null,
    },
    pricing: {
      basePriceInPaise,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  };
}

test("event policy v2 models cancellation applicability from price", () => {
  const fixture = readFixture(
    "fixtures/valid/create_event_payload.json"
  ) as Record<string, unknown>;
  const validate = validateCreateEventCallablePayload as Validator;

  assertValid(validate, {
    ...fixture,
    eventPolicy: eventPolicyFixture(0, "notApplicable"),
  });
  assertInvalid(validate, {
    ...fixture,
    eventPolicy: eventPolicyFixture(0, "standard"),
  });
  assertValid(validate, {
    ...fixture,
    eventPolicy: eventPolicyFixture(25000, "standard"),
  });
  assertInvalid(validate, {
    ...fixture,
    eventPolicy: eventPolicyFixture(25000, "notApplicable"),
  });
});

test("generated schema validators accept valid contract fixtures", () => {
  assertValid(
    validateProfilePromptAnswer as Validator,
    readFixture("fixtures/valid/profile_prompt_answer.json")
  );
  assertValid(
    validatePhotoPromptAnswer as Validator,
    readFixture("fixtures/valid/photo_prompt_answer.json")
  );
  assertValid(
    validateProfilePhoto as Validator,
    readFixture("fixtures/valid/profile_photo.json")
  );
  assertValid(
    validateConfigCitiesDocument as Validator,
    readFixture("fixtures/valid/config_cities_doc.json")
  );
  assertValid(
    validateOnboardingDraftDocument as Validator,
    readFixture("fixtures/valid/onboarding_draft_doc.json")
  );
  assertValid(
    validateUserProfileDocument as Validator,
    readFixture("fixtures/valid/user_profile_doc.json")
  );
  assertValid(
    validatePublicProfileDocument as Validator,
    readFixture("fixtures/valid/public_profile_doc.json")
  );
  assertValid(
    validateOrganizerDocument as Validator,
    readFixture("fixtures/valid/organizer_doc.json")
  );
  assertValid(
    validateOrganizerMembershipDocument as Validator,
    readFixture("fixtures/valid/organizer_membership_doc.json")
  );
  assertValid(
    validateOrganizerHostClaimDocument as Validator,
    readFixture("fixtures/valid/organizer_host_claim_doc.json")
  );
  assertValid(
    validateEventDocument as Validator,
    readFixture("fixtures/valid/event_doc.json")
  );
  assertValid(
    validateExternalEventDocument as Validator,
    readFixture("fixtures/valid/external_event_doc.json")
  );
  assertValid(
    validateEventParticipationDocument as Validator,
    readFixture("fixtures/valid/event_participation_doc.json")
  );
  assertValid(
    validateEventSuccessPlanDocument as Validator,
    readFixture("fixtures/valid/event_success_plan_doc.json")
  );
  assertValid(
    validateEventSuccessFeedbackDocument as Validator,
    readFixture("fixtures/valid/event_success_feedback_doc.json")
  );
  assertValid(
    validateEventSuccessPreferenceDocument as Validator,
    readFixture("fixtures/valid/event_success_preference_doc.json")
  );
  assertValid(
    validateEventSuccessCompatibilityResponseDocument as Validator,
    readFixture(
      "fixtures/valid/event_success_compatibility_response_doc.json"
    )
  );
  assertValid(
    validateEventSuccessConversationGraphDocument as Validator,
    readFixture("fixtures/valid/event_success_conversation_graph_doc.json")
  );
  assertValid(
    validateEventSuccessWingmanRequestDocument as Validator,
    readFixture("fixtures/valid/event_success_wingman_request_doc.json")
  );
  assertValid(
    validateEventSuccessAssignmentDocument as Validator,
    readFixture("fixtures/valid/event_success_assignment_doc.json")
  );
  assertValid(
    validateEventSuccessScorecardDocument as Validator,
    readFixture("fixtures/valid/event_success_scorecard_doc.json")
  );
  assertValid(
    validateEventSafetyReportDocument as Validator,
    readFixture("fixtures/valid/event_safety_report_doc.json")
  );
  assertValid(
    validateOrganizerScheduleLockDocument as Validator,
    readFixture("fixtures/valid/organizer_schedule_lock_doc.json")
  );
  assertValid(
    validateUserEventScheduleLockDocument as Validator,
    readFixture("fixtures/valid/user_event_schedule_lock_doc.json")
  );
  assertValid(
    validateSavedEventDocument as Validator,
    readFixture("fixtures/valid/saved_event_doc.json")
  );
  assertValid(
    validatePaymentDocument as Validator,
    readFixture("fixtures/valid/payment_doc.json")
  );
  assertValid(
    validateSwipeDocument as Validator,
    readFixture("fixtures/valid/swipe_doc.json")
  );
  assertValid(
    validateMatchDocument as Validator,
    readFixture("fixtures/valid/match_doc.json")
  );
  assertValid(
    validateChatMessageDocument as Validator,
    readFixture("fixtures/valid/chat_message_doc.json")
  );
  assertValid(
    validateActivityNotificationDocument as Validator,
    readFixture("fixtures/valid/activity_notification_doc.json")
  );
  assertValid(
    validateReviewDocument as Validator,
    readFixture("fixtures/valid/review_doc.json")
  );
  assertValid(
    validateBlockDocument as Validator,
    readFixture("fixtures/valid/block_doc.json")
  );
  assertValid(
    validateReportDocument as Validator,
    readFixture("fixtures/valid/report_doc.json")
  );
  assertValid(
    validateModerationFlagDocument as Validator,
    readFixture("fixtures/valid/moderation_flag_doc.json")
  );
  assertValid(
    validateDeletedUserTombstoneDocument as Validator,
    readFixture("fixtures/valid/deleted_user_tombstone_doc.json")
  );
  assertValid(
    validateRateLimitDocument as Validator,
    readFixture("fixtures/valid/rate_limit_doc.json")
  );
  assertValid(
    validateFunctionEventReceiptDocument as Validator,
    readFixture("fixtures/valid/function_event_receipt_doc.json")
  );
  assertValid(
    validateSeedEventManifestDocument as Validator,
    readFixture("fixtures/valid/seed_event_manifest_doc.json")
  );
  assertValid(
    validateUpdateUserProfileCallablePayload as Validator,
    readFixture("fixtures/valid/update_user_profile_patch.json")
  );
  assertValid(
    validateCreateOrganizerCallablePayload as Validator,
    readFixture("fixtures/valid/create_organizer_payload.json")
  );
  assertValid(
    validateCreateOrganizerCallableResponse as Validator,
    readFixture("fixtures/valid/create_organizer_response.json")
  );
  assertValid(
    validateUpdateOrganizerCallablePayload as Validator,
    readFixture("fixtures/valid/update_organizer_payload.json")
  );
  assertValid(
    validateArchiveOrganizerCallablePayload as Validator,
    readFixture("fixtures/valid/archive_organizer_payload.json")
  );
  assertValid(
    validateDeleteOrganizerCallablePayload as Validator,
    readFixture("fixtures/valid/delete_organizer_payload.json")
  );
  assertValid(
    validateOrganizerMembershipCallablePayload as Validator,
    readFixture("fixtures/valid/organizer_membership_payload.json")
  );
  assertValid(
    validateSetOrganizerNotificationPreferenceCallablePayload as Validator,
    readFixture(
      "fixtures/valid/set_organizer_notification_preference_payload.json"
    )
  );
  assertValid(
    validateCreateEventCallablePayload as Validator,
    readFixture("fixtures/valid/create_event_payload.json")
  );
  assertValid(
    validateUpdateEventCallablePayload as Validator,
    readFixture("fixtures/valid/update_event_payload.json")
  );
  assertValid(
    validateCancelEventCallablePayload as Validator,
    readFixture("fixtures/valid/cancel_event_payload.json")
  );
  assertValid(
    validateDeleteEventCallablePayload as Validator,
    readFixture("fixtures/valid/delete_event_payload.json")
  );
  assertValid(
    validateEventIdCallablePayload as Validator,
    readFixture("fixtures/valid/event_id_payload.json")
  );
  assertValid(
    validateMarkEventAttendanceCallablePayload as Validator,
    readFixture("fixtures/valid/mark_event_attendance_payload.json")
  );
  assertValid(
    validateSubmitEventSuccessWingmanRequestCallablePayload as Validator,
    readFixture(
      "fixtures/valid/submit_event_success_wingman_request_payload.json"
    )
  );
  assertValid(
    validateMarkEventAttendanceCallableResponse as Validator,
    readFixture("fixtures/valid/mark_event_attendance_response.json")
  );
  assertValid(
    validateFetchSwipeCandidatesCallableResponse as Validator,
    readFixture("fixtures/valid/fetch_swipe_candidates_response.json")
  );
  assertValid(
    validateSelfCheckInAttendanceCallablePayload as Validator,
    readFixture("fixtures/valid/self_check_in_attendance_payload.json")
  );
  assertValid(
    validateCreateEventReviewCallablePayload as Validator,
    readFixture("fixtures/valid/create_event_review_payload.json")
  );
  assertValid(
    validateUpdateEventReviewCallablePayload as Validator,
    readFixture("fixtures/valid/update_event_review_payload.json")
  );
  assertValid(
    validateDeleteEventReviewCallablePayload as Validator,
    readFixture("fixtures/valid/delete_event_review_payload.json")
  );
  assertValid(
    validateBlockUserCallablePayload as Validator,
    readFixture("fixtures/valid/block_user_payload.json")
  );
  assertValid(
    validateUnblockUserCallablePayload as Validator,
    readFixture("fixtures/valid/unblock_user_payload.json")
  );
  assertValid(
    validateReportUserCallablePayload as Validator,
    readFixture("fixtures/valid/report_user_payload.json")
  );
  assertValid(
    validateVerifyRazorpayPaymentCallablePayload as Validator,
    readFixture("fixtures/valid/verify_razorpay_payment_payload.json")
  );
  assertValid(
    validateRazorpayOrderCallableResponse as Validator,
    readFixture("fixtures/valid/razorpay_order_response.json")
  );
  assertValid(
    validatePlacesAutocompleteCallablePayload as Validator,
    readFixture("fixtures/valid/places_autocomplete_payload.json")
  );
  assertValid(
    validatePlacesAutocompleteCallableResponse as Validator,
    readFixture("fixtures/valid/places_autocomplete_response.json")
  );
  assertValid(
    validatePlaceDetailsCallablePayload as Validator,
    readFixture("fixtures/valid/place_details_payload.json")
  );
  assertValid(
    validatePlaceDetailsCallableResponse as Validator,
    readFixture("fixtures/valid/place_details_response.json")
  );
  assertValid(
    validateCreateProfileDecisionClientWrite as Validator,
    readFixture("fixtures/valid/create_profile_decision_client_write.json")
  );
  assertValid(
    validateCreateChatMessageClientWrite as Validator,
    readFixture("fixtures/valid/create_chat_message_client_write.json")
  );
  assertValid(
    validateCreateSavedEventClientWrite as Validator,
    readFixture("fixtures/valid/create_saved_event_client_write.json")
  );
  assertValid(
    validateDeleteSavedEventClientWrite as Validator,
    readFixture("fixtures/valid/delete_saved_event_client_write.json")
  );
  assertValid(
    validateMarkNotificationReadClientWrite as Validator,
    readFixture("fixtures/valid/mark_notification_read_client_write.json")
  );
  assertValid(
    validateResetMatchUnreadCountClientWrite as Validator,
    readFixture("fixtures/valid/reset_match_unread_count_client_write.json")
  );
});

test("generated schema validators reject invalid contract fixtures", () => {
  assertInvalid(
    validateProfilePromptAnswer as Validator,
    readFixture("fixtures/invalid/profile_prompt_answer_overlong.json")
  );
  assertInvalid(
    validateProfilePhoto as Validator,
    readFixture("fixtures/invalid/profile_photo_invalid_storage_path.json")
  );
  assertInvalid(
    validateUserProfileDocument as Validator,
    readFixture("fixtures/invalid/user_profile_legacy_bio.json")
  );
  assertInvalid(
    validateUpdateUserProfileCallablePayload as Validator,
    readFixture("fixtures/invalid/update_user_profile_empty_patch.json")
  );
  assertInvalid(
    validateUpdateUserProfileCallablePayload as Validator,
    readFixture("fixtures/invalid/update_user_profile_height_out_of_range.json")
  );
  assertInvalid(
    validateUpdateUserProfileCallablePayload as Validator,
    readFixture("fixtures/invalid/update_user_profile_invalid_email.json")
  );
  assertInvalid(
    validateEventDocument as Validator,
    readFixture("fixtures/invalid/event_doc_invalid_pace.json")
  );
  assertInvalid(
    validateSwipeDocument as Validator,
    readFixture("fixtures/invalid/swipe_doc_invalid_reaction_target.json")
  );
  assertInvalid(
    validateOrganizerScheduleLockDocument as Validator,
    readFixture("fixtures/invalid/organizer_schedule_lock_invalid_owner.json")
  );
  assertInvalid(
    validateUpdateOrganizerCallablePayload as Validator,
    readFixture("fixtures/invalid/update_organizer_empty_fields.json")
  );
  assertInvalid(
    validateUpdateEventCallablePayload as Validator,
    readFixture("fixtures/invalid/update_event_empty_fields.json")
  );
  assertInvalid(
    validateExternalEventDocument as Validator,
    readFixture(
      "fixtures/invalid/external_event_doc_enables_catch_booking.json"
    )
  );
  assertInvalid(
    validateCreateEventReviewCallablePayload as Validator,
    readFixture("fixtures/invalid/create_event_review_invalid_rating.json")
  );
  assertInvalid(
    validatePlacesAutocompleteCallablePayload as Validator,
    readFixture("fixtures/invalid/places_autocomplete_short_input.json")
  );
  assertInvalid(
    validateRazorpayOrderCallableResponse as Validator,
    readFixture("fixtures/invalid/razorpay_order_response_missing_amount.json")
  );
  assertInvalid(
    validateCreateChatMessageClientWrite as Validator,
    readFixture("fixtures/invalid/create_chat_message_empty_client_write.json")
  );
  assertInvalid(
    validateResetMatchUnreadCountClientWrite as Validator,
    readFixture("fixtures/invalid/reset_match_unread_count_multiple_users.json")
  );
});
