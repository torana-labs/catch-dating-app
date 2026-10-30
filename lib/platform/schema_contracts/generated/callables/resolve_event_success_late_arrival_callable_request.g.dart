// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/resolve_event_success_late_arrival_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ResolveEventSuccessLateArrivalCallableRequest {
  const ResolveEventSuccessLateArrivalCallableRequest({
    required this.eventId,
    required this.uid,
    required this.expectedRevision,
    required this.confirmed,
  });

  final String eventId;
  final String uid;
  final int expectedRevision;
  final bool confirmed;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'uid': uid,
    'expectedRevision': expectedRevision,
    'confirmed': confirmed,
  };
}
