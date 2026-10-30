// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_function_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update a private program function (ceremony, reception, session).
final class UpsertProgramFunctionCallableRequest {
  const UpsertProgramFunctionCallableRequest({
    required this.programId,
    this.functionId,
    this.expectedRevision,
    required this.name,
    required this.startsAtMillis,
    required this.endsAtMillis,
    required this.venueName,
    this.venueNotes,
    this.status,
  });

  final String programId;
  final String? functionId;
  final int? expectedRevision;
  final String name;
  final int startsAtMillis;
  final int endsAtMillis;
  final String venueName;
  final String? venueNotes;
  final String? status;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'functionId': ?functionId,
    'expectedRevision': ?expectedRevision,
    'name': name,
    'startsAtMillis': startsAtMillis,
    'endsAtMillis': endsAtMillis,
    'venueName': venueName,
    'venueNotes': ?venueNotes,
    'status': ?status,
  };
}
