// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_event_chat_access_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class UpdateEventChatAccessCallableRequest {
  const UpdateEventChatAccessCallableRequest({
    required this.eventId,
    required this.action,
    required this.expectedRevision,
    required this.requestId,
    required this.termsVersion,
    required this.expectedUid,
    this.opensAtMillis,
    this.closesAtMillis,
  });

  final String eventId;
  final String action;
  final int expectedRevision;
  final String requestId;
  final String? termsVersion;
  final String expectedUid;
  final int? opensAtMillis;
  final int? closesAtMillis;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'action': action,
    'expectedRevision': expectedRevision,
    'requestId': requestId,
    'termsVersion': termsVersion,
    'expectedUid': expectedUid,
    'opensAtMillis': ?opensAtMillis,
    'closesAtMillis': ?closesAtMillis,
  };
}
