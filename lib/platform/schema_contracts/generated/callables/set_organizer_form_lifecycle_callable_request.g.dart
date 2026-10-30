// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_organizer_form_lifecycle_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Pauses, resumes, or archives one organizer form with an expected-state guard.
final class SetOrganizerFormLifecycleCallableRequest {
  const SetOrganizerFormLifecycleCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.expectedStatus,
    required this.action,
  });

  final String organizerId;
  final String formId;
  final String expectedStatus;
  final String action;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'expectedStatus': expectedStatus,
    'action': action,
  };
}
