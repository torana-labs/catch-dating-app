// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_program_staff_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-only staff inventory in stable staff-identity order.
final class ListProgramStaffCallableRequest {
  const ListProgramStaffCallableRequest({
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
