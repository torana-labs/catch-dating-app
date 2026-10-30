// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_event_success_wingman_request_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by submitEventSuccessWingmanRequest.
final class SubmitEventSuccessWingmanRequestCallableRequest {
  const SubmitEventSuccessWingmanRequestCallableRequest({
    required this.eventId,
    required this.targetUid,
    this.note,
  });

  final String eventId;
  final String targetUid;
  final String? note;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'targetUid': targetUid,
    'note': ?note,
  };
}
