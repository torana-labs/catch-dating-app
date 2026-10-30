// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_event_assistance_guest_choice_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class SubmitEventAssistanceGuestChoiceCallableRequest {
  const SubmitEventAssistanceGuestChoiceCallableRequest({
    required this.linkId,
    required this.secret,
    required this.intentId,
    required this.intentRevision,
    required this.expectedGuestRevision,
    required this.choiceId,
    required this.requestId,
  });

  final String linkId;
  final String secret;
  final String intentId;
  final int intentRevision;
  final int expectedGuestRevision;
  final String choiceId;
  final String requestId;

  Map<String, Object?> toJson() => {
    'linkId': linkId,
    'secret': secret,
    'intentId': intentId,
    'intentRevision': intentRevision,
    'expectedGuestRevision': expectedGuestRevision,
    'choiceId': choiceId,
    'requestId': requestId,
  };
}
