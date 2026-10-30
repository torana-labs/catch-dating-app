// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/mark_event_attendance_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by markEventAttendance.
final class MarkEventAttendanceCallableRequest {
  const MarkEventAttendanceCallableRequest({
    required this.eventId,
    required this.userId,
  });

  final String eventId;
  final String userId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'userId': userId,
  };
}
