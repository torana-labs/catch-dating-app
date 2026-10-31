import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/platform/schema_contracts/generated/event_assistance_kinds.g.dart'
    as schema_contracts;
import 'package:catch_dating_app/platform/schema_contracts/generated/profile_schema_contracts.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';

void main() {
  test('generated event assistance catalog is exhaustive and typed', () {
    expect(
      schema_contracts.eventAssistanceWorkflowCatalog.length,
      schema_contracts.EventAssistanceWorkflowKind.values.length,
    );
    for (final kind in schema_contracts.EventAssistanceWorkflowKind.values) {
      expect(
        schema_contracts.eventAssistanceWorkflowCatalog[kind.index].kind,
        kind,
      );
    }
    expect(
      schema_contracts.eventAssistanceWorkflowCatalog
          .expand(
            (definition) => <schema_contracts.EventAssistanceCommandKind>[
              ...definition.automaticCommands,
              ...definition.hostCommands,
              ...definition.guestCommands,
            ],
          )
          .toSet(),
      schema_contracts.EventAssistanceCommandKind.values.toSet(),
    );
    expect(
      schema_contracts.eventAssistanceWorkflowCatalog
          .expand((definition) => definition.hostProjection.surfaces)
          .toSet(),
      schema_contracts.EventAssistanceHostSurface.values.toSet(),
    );
    expect(
      schema_contracts.eventAssistanceWorkflowCatalog
          .map((definition) => definition.resolutionBoundary)
          .toSet(),
      schema_contracts.EventAssistanceResolutionBoundary.values.toSet(),
    );
    for (final definition in schema_contracts.eventAssistanceWorkflowCatalog) {
      expect(
        definition.hasCommandContract,
        definition.resolutionBoundary ==
            schema_contracts
                .EventAssistanceResolutionBoundary
                .eventAssistanceCommand,
      );
    }
  });

  test('generated event assistance command bindings are exhaustive', () {
    expect(
      schema_contracts.eventAssistanceCommandBindingCatalog.length,
      schema_contracts.EventAssistanceCommandKind.values.length,
    );
    for (final kind in schema_contracts.EventAssistanceCommandKind.values) {
      final binding = kind.binding;
      expect(binding.commandKind, kind);
      for (final mode in [binding.live, binding.rehearsal]) {
        expect(
          mode.operations.isEmpty,
          mode.bindingType ==
              schema_contracts.EventAssistanceCommandBindingType.contractOnly,
        );
        expect(
          mode.isImplemented,
          mode.coverage != schema_contracts.EventAssistanceCommandCoverage.none,
        );
        expect(
          mode.isFullyImplemented,
          mode.coverage ==
              schema_contracts.EventAssistanceCommandCoverage.complete,
        );
        expect(
          mode.missingCapability != null,
          mode.coverage !=
              schema_contracts.EventAssistanceCommandCoverage.complete,
        );
      }
    }
    final messageBinding = schema_contracts
        .EventAssistanceCommandKind
        .sendOperationalMessage
        .binding
        .live;
    expect(
      messageBinding.coverage,
      schema_contracts.EventAssistanceCommandCoverage.complete,
    );
    expect(messageBinding.variantField, isNull);
    expect(messageBinding.implementedVariants, isEmpty);
    expect(messageBinding.missingVariants, isEmpty);
  });

  test('generated profile prompt constants match contract limits', () {
    expect(schemaProfilePromptPerfectEventId, 'perfectRun');
    expect(schemaMaxProfilePromptAnswers, 3);
    expect(schemaMaxPhotoPromptCaptions, 6);
    expect(schemaMinimumProfilePhotos, 2);
    expect(schemaMaximumProfilePhotos, 6);
    expect(schemaProfilePhotoAspectRatioWidth, 3);
    expect(schemaProfilePhotoAspectRatioHeight, 4);
    expect(schemaProfilePhotoThumbnailSize, 160);
    expect(schemaProfilePhotoMaxUploadBytes, 8388608);
    expect(schemaMaximumProfilePromptAnswerLength, 300);
    expect(schemaMaximumPhotoPromptCaptionLength, 140);
    expect(schemaMinimumHeightCm, 120);
    expect(schemaMaximumHeightCm, 220);
    expect(schemaDefaultProfilePromptIds, [
      'perfectRun',
      'afterEvent',
      'greenFlag',
    ]);
  });

  test('prompt catalog copy is free of run->event rename corruption', () {
    // Regression guard for COPY-SWEEP-001: the automated run->event rename
    // produced broken copy like "Proof I actually event" and placeholders that
    // mixed "runners" with "event". Run-themed prompts (finishLine, notRunning,
    // running route) are intentional and allowed; only the corruption signature
    // is rejected.
    final copy = <String>[
      for (final p in schemaProfilePromptCatalog) ...[p.title, p.placeholder],
      for (final p in schemaPhotoPromptCatalog) ...[p.title, p.placeholder],
    ];
    for (final text in copy) {
      final lower = text.toLowerCase();
      expect(
        lower.contains('actually event'),
        isFalse,
        reason: 'Corrupted run->event copy: "$text"',
      );
      expect(
        lower.contains('runners') && lower.contains('event'),
        isFalse,
        reason: 'Mixed runner/event copy from a half-applied rename: "$text"',
      );
    }
  });

  test('generated Dart schemas validate prompt payloads', () {
    final profilePromptSchema = JsonSchema.create(
      schemaProfilePromptAnswerSchema,
    );
    final photoPromptSchema = JsonSchema.create(schemaPhotoPromptAnswerSchema);
    final profilePhotoSchema = JsonSchema.create(schemaProfilePhotoSchema);

    expect(
      profilePromptSchema.validate({
        'promptId': 'perfectRun',
        'prompt': 'A perfect event with me looks like...',
        'answer': 'Coffee after an easy 5K.',
      }).isValid,
      isTrue,
    );
    expect(
      profilePromptSchema.validate({
        'promptId': 'perfectRun',
        'prompt': 'A perfect event with me looks like...',
        'answer': 'x' * (schemaMaximumProfilePromptAnswerLength + 1),
      }).isValid,
      isFalse,
    );
    expect(
      photoPromptSchema.validate({
        'photoIndex': 0,
        'promptId': 'proofIRun',
        'prompt': 'Proof I actually run',
        'caption': 'Finish line.',
      }).isValid,
      isTrue,
    );
    expect(
      profilePhotoSchema
          .validate(_readFixture('valid/profile_photo.json'))
          .isValid,
      isTrue,
    );
    expect(
      profilePhotoSchema
          .validate(
            _readFixture('invalid/profile_photo_invalid_storage_path.json'),
          )
          .isValid,
      isFalse,
    );
  });

  test('generated Dart schemas validate shared contract fixtures', () {
    final profilePromptSchema = JsonSchema.create(
      schemaProfilePromptAnswerSchema,
    );
    final updateProfileSchema = JsonSchema.create(
      schemaUpdateUserProfileCallablePayloadSchema,
    );

    expect(
      profilePromptSchema
          .validate(_readFixture('valid/profile_prompt_answer.json'))
          .isValid,
      isTrue,
    );
    expect(
      profilePromptSchema
          .validate(_readFixture('invalid/profile_prompt_answer_overlong.json'))
          .isValid,
      isFalse,
    );
    expect(
      updateProfileSchema
          .validate(_readFixture('valid/update_user_profile_patch.json'))
          .isValid,
      isTrue,
    );
    expect(
      updateProfileSchema
          .validate(
            _readFixture(
              'invalid/update_user_profile_height_out_of_range.json',
            ),
          )
          .isValid,
      isFalse,
    );
    expect(
      updateProfileSchema
          .validate(
            _readFixture('invalid/update_user_profile_invalid_email.json'),
          )
          .isValid,
      isFalse,
    );
    expect(
      updateProfileSchema
          .validate(
            _readFixture('invalid/update_user_profile_empty_patch.json'),
          )
          .isValid,
      isFalse,
    );
  });

  test('core schema contracts load from contracts/ by title and source', () {
    for (final title in <String>[
      'ConfigCitiesDocument',
      'OnboardingDraftDocument',
      'UserProfileDocument',
      'PublicProfileDocument',
      'HostProfileDocument',
      'OrganizerDocument',
      'OrganizerMembershipDocument',
      'OrganizerHostClaimDocument',
      'OrganizerClaimRequestDocument',
      'EventDocument',
      'ExternalEventDocument',
      'EventPrivateAccessDocument',
      'EventInviteLinkDocument',
      'EventParticipationDocument',
      'EventWaitlistOfferDocument',
      'EventSuccessPlanDocument',
      'EventSuccessFeedbackDocument',
      'EventSuccessPreferenceDocument',
      'EventSuccessCompatibilityResponseDocument',
      'EventSuccessWingmanRequestDocument',
      'EventSuccessArrivalMissionDocument',
      'EventSuccessAssignmentDocument',
      'EventSuccessScorecardDocument',
      'EventSafetyReportDocument',
      'OrganizerScheduleLockDocument',
      'UserEventScheduleLockDocument',
      'SavedEventDocument',
      'SwipeDocument',
      'PaymentDocument',
      'HostPaymentAccountDocument',
      'RazorpayPendingOrderDocument',
      'MatchDocument',
      'ChatMessageDocument',
      'ActivityNotificationDocument',
      'ReviewDocument',
      'BlockDocument',
      'ReportDocument',
      'ModerationFlagDocument',
      'DeletedUserTombstoneDocument',
      'RateLimitDocument',
      'FunctionEventReceiptDocument',
      'PublicRouteReservationDocument',
      'SeedEventManifestDocument',
      'OrganizerIntakeReviewDecisionDocument',
      'EventIntakeReviewDecisionDocument',
      'OrganizerIntakeCurationDecisionDocument',
      'OrganizerPolicyGapReviewDecisionDocument',
      'ProfilePromptAnswer',
      'PhotoPromptAnswer',
      'ProfilePhoto',
      'UploadedPhoto',
      'ActivityPreferences',
      'CreateEventCallablePayload',
      'SubmitEventSuccessWingmanRequestCallablePayload',
      'CreateProfileDecisionClientWrite',
      'CreateChatMessageClientWrite',
      'CreateSavedEventClientWrite',
      'DeleteSavedEventClientWrite',
      'MarkNotificationReadClientWrite',
      'ResetMatchUnreadCountClientWrite',
    ]) {
      expect(contractSchema(title)['title'], title);
    }
    for (final source in <String>[
      'firestore/config_cities.schema.json',
      'firestore/onboarding_drafts.schema.json',
      'embedded/profile_prompt_answer.schema.json',
      'embedded/photo_prompt_answer.schema.json',
      'embedded/profile_photo.schema.json',
      'embedded/uploaded_photo.schema.json',
      'embedded/activity_preferences.schema.json',
      'firestore/users.schema.json',
      'firestore/public_profiles.schema.json',
      'firestore/host_profiles.schema.json',
      'firestore/organizers.schema.json',
      'firestore/organizer_memberships.schema.json',
      'firestore/organizer_host_claims.schema.json',
      'firestore/organizer_claim_requests.schema.json',
      'firestore/events.schema.json',
      'firestore/external_events.schema.json',
      'firestore/event_private_access.schema.json',
      'firestore/event_invite_links.schema.json',
      'firestore/event_participations.schema.json',
      'firestore/event_waitlist_offers.schema.json',
      'firestore/event_success_plans.schema.json',
      'firestore/event_success_feedback.schema.json',
      'firestore/event_success_preferences.schema.json',
      'firestore/event_success_compatibility_responses.schema.json',
      'firestore/event_success_wingman_requests.schema.json',
      'firestore/event_success_arrival_missions.schema.json',
      'firestore/event_success_assignments.schema.json',
      'firestore/event_success_scorecards.schema.json',
      'firestore/event_safety_reports.schema.json',
      'firestore/organizer_schedule_locks.schema.json',
      'firestore/user_event_schedule_locks.schema.json',
      'firestore/saved_events.schema.json',
      'firestore/payments.schema.json',
      'firestore/host_payment_accounts.schema.json',
      'firestore/razorpay_pending_orders.schema.json',
      'callables/submit_event_success_wingman_request_payload.schema.json',
      'firestore/swipes.schema.json',
      'firestore/matches.schema.json',
      'firestore/chat_messages.schema.json',
      'firestore/activity_notifications.schema.json',
      'firestore/reviews.schema.json',
      'firestore/blocks.schema.json',
      'firestore/reports.schema.json',
      'firestore/moderation_flags.schema.json',
      'firestore/deleted_users.schema.json',
      'firestore/rate_limits.schema.json',
      'firestore/function_event_receipts.schema.json',
      'firestore/public_route_reservations.schema.json',
      'firestore/seed_events.schema.json',
      'firestore/organizer_intake_review_decisions.schema.json',
      'firestore/event_intake_review_decisions.schema.json',
      'firestore/organizer_intake_curation_decisions.schema.json',
      'firestore/organizer_policy_gap_review_decisions.schema.json',
      'client_writes/create_profile_decision.schema.json',
      'client_writes/create_chat_message.schema.json',
      'client_writes/create_saved_event.schema.json',
      'client_writes/delete_saved_event.schema.json',
      'client_writes/mark_notification_read.schema.json',
      'client_writes/reset_match_unread_count.schema.json',
    ]) {
      expect(contractSchemaAt(source)['title'], isA<String>(), reason: source);
    }
  });

  test('generated Dart registry validates representative shared fixtures', () {
    final cases = <_SchemaFixtureCase>[
      _SchemaFixtureCase.valid(
        'ConfigCitiesDocument',
        'valid/config_cities_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'OnboardingDraftDocument',
        'valid/onboarding_draft_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'UserProfileDocument',
        'valid/user_profile_doc.json',
      ),
      _SchemaFixtureCase.invalid(
        'UserProfileDocument',
        'invalid/user_profile_legacy_bio.json',
      ),
      _SchemaFixtureCase.valid(
        'PublicProfileDocument',
        'valid/public_profile_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'HostProfileDocument',
        'valid/host_profile_doc.json',
      ),
      _SchemaFixtureCase.valid('OrganizerDocument', 'valid/organizer_doc.json'),
      _SchemaFixtureCase.valid(
        'OrganizerMembershipDocument',
        'valid/organizer_membership_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'OrganizerHostClaimDocument',
        'valid/organizer_host_claim_doc.json',
      ),
      _SchemaFixtureCase.valid('EventDocument', 'valid/event_doc.json'),
      _SchemaFixtureCase.valid(
        'ExternalEventDocument',
        'valid/external_event_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventPrivateAccessDocument',
        'valid/event_private_access_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventInviteLinkDocument',
        'valid/event_invite_link_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventParticipationDocument',
        'valid/event_participation_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventWaitlistOfferDocument',
        'valid/event_waitlist_offer_doc.json',
      ),
      _SchemaFixtureCase.invalid(
        'EventDocument',
        'invalid/event_doc_invalid_pace.json',
      ),
      _SchemaFixtureCase.invalid(
        'ExternalEventDocument',
        'invalid/external_event_doc_enables_catch_booking.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSuccessPlanDocument',
        'valid/event_success_plan_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSuccessFeedbackDocument',
        'valid/event_success_feedback_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSuccessPreferenceDocument',
        'valid/event_success_preference_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSuccessCompatibilityResponseDocument',
        'valid/event_success_compatibility_response_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSuccessWingmanRequestDocument',
        'valid/event_success_wingman_request_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSuccessAssignmentDocument',
        'valid/event_success_assignment_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSuccessScorecardDocument',
        'valid/event_success_scorecard_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'EventSafetyReportDocument',
        'valid/event_safety_report_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'OrganizerScheduleLockDocument',
        'valid/organizer_schedule_lock_doc.json',
      ),
      _SchemaFixtureCase.invalid(
        'OrganizerScheduleLockDocument',
        'invalid/organizer_schedule_lock_invalid_owner.json',
      ),
      _SchemaFixtureCase.valid(
        'UserEventScheduleLockDocument',
        'valid/user_event_schedule_lock_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'SavedEventDocument',
        'valid/saved_event_doc.json',
      ),
      _SchemaFixtureCase.valid('PaymentDocument', 'valid/payment_doc.json'),
      _SchemaFixtureCase.valid('SwipeDocument', 'valid/swipe_doc.json'),
      _SchemaFixtureCase.valid('MatchDocument', 'valid/match_doc.json'),
      _SchemaFixtureCase.valid(
        'ChatMessageDocument',
        'valid/chat_message_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'ActivityNotificationDocument',
        'valid/activity_notification_doc.json',
      ),
      _SchemaFixtureCase.valid('ReviewDocument', 'valid/review_doc.json'),
      _SchemaFixtureCase.valid('BlockDocument', 'valid/block_doc.json'),
      _SchemaFixtureCase.valid('ReportDocument', 'valid/report_doc.json'),
      _SchemaFixtureCase.valid(
        'ModerationFlagDocument',
        'valid/moderation_flag_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'DeletedUserTombstoneDocument',
        'valid/deleted_user_tombstone_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'RateLimitDocument',
        'valid/rate_limit_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'FunctionEventReceiptDocument',
        'valid/function_event_receipt_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'SeedEventManifestDocument',
        'valid/seed_event_manifest_doc.json',
      ),
      _SchemaFixtureCase.valid(
        'SubmitEventSuccessWingmanRequestCallablePayload',
        'valid/submit_event_success_wingman_request_payload.json',
      ),
      _SchemaFixtureCase.invalid(
        'SwipeDocument',
        'invalid/swipe_doc_invalid_reaction_target.json',
      ),
      _SchemaFixtureCase.valid(
        'ProfilePromptAnswer',
        'valid/profile_prompt_answer.json',
      ),
      _SchemaFixtureCase.invalid(
        'ProfilePromptAnswer',
        'invalid/profile_prompt_answer_overlong.json',
      ),
      _SchemaFixtureCase.valid(
        'PhotoPromptAnswer',
        'valid/photo_prompt_answer.json',
      ),
      _SchemaFixtureCase.valid('ProfilePhoto', 'valid/profile_photo.json'),
      _SchemaFixtureCase.invalid(
        'ProfilePhoto',
        'invalid/profile_photo_invalid_storage_path.json',
      ),
      _SchemaFixtureCase.valid('UploadedPhoto', 'valid/uploaded_photo.json'),
      _SchemaFixtureCase.invalid(
        'UploadedPhoto',
        'invalid/uploaded_photo_invalid_position.json',
      ),
      _SchemaFixtureCase.valid(
        'ActivityPreferences',
        'valid/activity_preferences.json',
      ),
      _SchemaFixtureCase.invalid(
        'ActivityPreferences',
        'invalid/activity_preferences_invalid_version.json',
      ),
      _SchemaFixtureCase.valid(
        'CreateProfileDecisionClientWrite',
        'valid/create_profile_decision_client_write.json',
      ),
      _SchemaFixtureCase.valid(
        'CreateChatMessageClientWrite',
        'valid/create_chat_message_client_write.json',
      ),
      _SchemaFixtureCase.invalid(
        'CreateChatMessageClientWrite',
        'invalid/create_chat_message_empty_client_write.json',
      ),
      _SchemaFixtureCase.valid(
        'CreateSavedEventClientWrite',
        'valid/create_saved_event_client_write.json',
      ),
      _SchemaFixtureCase.valid(
        'DeleteSavedEventClientWrite',
        'valid/delete_saved_event_client_write.json',
      ),
      _SchemaFixtureCase.valid(
        'MarkNotificationReadClientWrite',
        'valid/mark_notification_read_client_write.json',
      ),
      _SchemaFixtureCase.valid(
        'ResetMatchUnreadCountClientWrite',
        'valid/reset_match_unread_count_client_write.json',
      ),
      _SchemaFixtureCase.invalid(
        'ResetMatchUnreadCountClientWrite',
        'invalid/reset_match_unread_count_multiple_users.json',
      ),
      _SchemaFixtureCase.invalid(
        'CreateEventReviewCallablePayload',
        'invalid/create_event_review_invalid_rating.json',
      ),
      _SchemaFixtureCase.invalid(
        'UpdateEventCallablePayload',
        'invalid/update_event_empty_fields.json',
      ),
      _SchemaFixtureCase.invalid(
        'UpdateOrganizerCallablePayload',
        'invalid/update_organizer_empty_fields.json',
      ),
    ];

    for (final fixtureCase in cases) {
      final result = JsonSchema.create(
        contractSchema(fixtureCase.schemaName),
      ).validate(_readFixture(fixtureCase.fixturePath));
      expect(
        result.isValid,
        fixtureCase.isValid,
        reason:
            '${fixtureCase.schemaName} should validate '
            '${fixtureCase.fixturePath}: ${result.errors}',
      );
    }
  });
}

Object? _readFixture(String path) {
  return jsonDecode(File('contracts/fixtures/$path').readAsStringSync());
}

class _SchemaFixtureCase {
  const _SchemaFixtureCase._({
    required this.schemaName,
    required this.fixturePath,
    required this.isValid,
  });

  factory _SchemaFixtureCase.valid(String schemaName, String fixturePath) {
    return _SchemaFixtureCase._(
      schemaName: schemaName,
      fixturePath: fixturePath,
      isValid: true,
    );
  }

  factory _SchemaFixtureCase.invalid(String schemaName, String fixturePath) {
    return _SchemaFixtureCase._(
      schemaName: schemaName,
      fixturePath: fixturePath,
      isValid: false,
    );
  }

  final String schemaName;
  final String fixturePath;
  final bool isValid;
}
