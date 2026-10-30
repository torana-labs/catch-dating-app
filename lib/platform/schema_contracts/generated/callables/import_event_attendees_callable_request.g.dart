// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/import_event_attendees_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by importEventAttendees.
final class ImportEventAttendeesCallableRequest {
  const ImportEventAttendeesCallableRequest({
    required this.eventId,
    required this.importKey,
    required this.fileName,
    required this.format,
    required this.rows,
  });

  final String eventId;
  final String importKey;
  final String fileName;
  final String format;
  final List<Map<String, Object?>> rows;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'importKey': importKey,
    'fileName': fileName,
    'format': format,
    'rows': rows,
  };
}
