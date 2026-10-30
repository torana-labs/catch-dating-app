// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_program_trips_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Scoped trip ledger page, ordered by departure time descending.
final class ListProgramTripsCallableRequest {
  const ListProgramTripsCallableRequest({
    required this.programId,
    this.limit,
    this.cursor,
  });

  final String programId;
  final int? limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'limit': ?limit,
    'cursor': ?cursor,
  };
}
