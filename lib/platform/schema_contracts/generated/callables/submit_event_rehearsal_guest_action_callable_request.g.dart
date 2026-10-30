// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_event_rehearsal_guest_action_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Applies a bounded action from an anonymous rehearsal guest slot.
final class SubmitEventRehearsalGuestActionCallableRequest {
  const SubmitEventRehearsalGuestActionCallableRequest({
    required this.publicRehearsalId,
    required this.slotToken,
    required this.clientActionId,
    required this.action,
    this.messageId,
    this.intentRevision,
    this.choiceId,
    this.requiredData,
  });

  final String publicRehearsalId;
  final String slotToken;
  final String clientActionId;
  final String action;
  final String? messageId;
  final int? intentRevision;
  final String? choiceId;
  final Map<String, Object?>? requiredData;

  Map<String, Object?> toJson() => {
    'publicRehearsalId': publicRehearsalId,
    'slotToken': slotToken,
    'clientActionId': clientActionId,
    'action': action,
    'messageId': ?messageId,
    'intentRevision': ?intentRevision,
    'choiceId': ?choiceId,
    'requiredData': ?requiredData,
  };
}
