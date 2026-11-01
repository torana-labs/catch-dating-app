// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/report_guest_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// An organizer, their manager or the event's team reports a guest, including what happened at an event. It lands in the Safety queue like any report.
final class ReportGuestCallableRequest {
  const ReportGuestCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.targetUserId,
    required this.reasonCode,
    required this.notes,
  });

  final String organizerId;
  final String? eventId;
  final String targetUserId;
  final String reasonCode;
  final String? notes;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'targetUserId': targetUserId,
    'reasonCode': reasonCode,
    'notes': notes,
  };
}
