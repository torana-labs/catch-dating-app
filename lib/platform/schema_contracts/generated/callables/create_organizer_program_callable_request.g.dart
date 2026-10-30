// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_program_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create a private wedding/corporate program. Manager-only.
final class CreateOrganizerProgramCallableRequest {
  const CreateOrganizerProgramCallableRequest({
    required this.organizerId,
    required this.kind,
    required this.title,
    required this.timezone,
    required this.startsAtMillis,
    required this.endsAtMillis,
    this.rsvpDeadlineAtMillis,
    required this.capabilities,
    this.requestId,
    this.transportSettings,
  });

  final String organizerId;
  final String kind;
  final String title;
  final String timezone;
  final int startsAtMillis;
  final int endsAtMillis;
  final int? rsvpDeadlineAtMillis;
  final List<String> capabilities;
  final String? requestId;
  final Map<String, Object?>? transportSettings;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'kind': kind,
    'title': title,
    'timezone': timezone,
    'startsAtMillis': startsAtMillis,
    'endsAtMillis': endsAtMillis,
    'rsvpDeadlineAtMillis': ?rsvpDeadlineAtMillis,
    'capabilities': capabilities,
    'requestId': ?requestId,
    'transportSettings': ?transportSettings,
  };
}
