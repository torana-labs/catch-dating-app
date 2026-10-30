// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_event_attendee_attendance_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Absolute, revision-checked Host attendance mutation with an idempotent client operation id.
final class SetEventAttendeeAttendanceCallableRequest {
  const SetEventAttendeeAttendanceCallableRequest({
    required this.eventId,
    required this.attendeeId,
    required this.desiredCheckedIn,
    required this.expectedRevision,
    required this.clientOperationId,
  });

  final String eventId;
  final String attendeeId;
  final bool desiredCheckedIn;
  final int expectedRevision;
  final String clientOperationId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'attendeeId': attendeeId,
    'desiredCheckedIn': desiredCheckedIn,
    'expectedRevision': expectedRevision,
    'clientOperationId': clientOperationId,
  };
}
