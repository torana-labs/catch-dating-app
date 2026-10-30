// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_programs_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-scoped listing of an organizer's private programs.
final class ListOrganizerProgramsCallableRequest {
  const ListOrganizerProgramsCallableRequest({
    required this.organizerId,
    this.limit,
    this.cursor,
    this.programId,
  });

  final String organizerId;
  final int? limit;
  final String? cursor;
  final String? programId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'limit': ?limit,
    'cursor': ?cursor,
    'programId': ?programId,
  };
}
