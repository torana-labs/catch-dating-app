// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_organizer_program_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Patch program fields. Omitted fields are unchanged; expectedRevision fences concurrent edits.
final class UpdateOrganizerProgramCallableRequest {
  const UpdateOrganizerProgramCallableRequest({
    required this.programId,
    required this.expectedRevision,
    this.title,
    this.timezone,
    this.startsAtMillis,
    this.endsAtMillis,
    this.rsvpDeadlineAtMillis,
    this.status,
    this.capabilities,
    this.transportSettings,
  });

  final String programId;
  final int expectedRevision;
  final String? title;
  final String? timezone;
  final int? startsAtMillis;
  final int? endsAtMillis;
  final int? rsvpDeadlineAtMillis;
  final String? status;
  final List<String>? capabilities;
  final Map<String, Object?>? transportSettings;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'expectedRevision': expectedRevision,
    'title': ?title,
    'timezone': ?timezone,
    'startsAtMillis': ?startsAtMillis,
    'endsAtMillis': ?endsAtMillis,
    'rsvpDeadlineAtMillis': ?rsvpDeadlineAtMillis,
    'status': ?status,
    'capabilities': ?capabilities,
    'transportSettings': ?transportSettings,
  };
}
