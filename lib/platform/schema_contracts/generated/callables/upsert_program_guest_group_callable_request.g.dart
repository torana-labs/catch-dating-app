// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_guest_group_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update an organizer-defined guest group for a program. label and dimension are always supplied; sortOrder preserves the existing value when omitted.
final class UpsertProgramGuestGroupCallableRequest {
  const UpsertProgramGuestGroupCallableRequest({
    required this.programId,
    this.groupId,
    this.expectedRevision,
    required this.label,
    required this.dimension,
    this.sortOrder,
    this.hotelId,
  });

  final String programId;
  final String? groupId;
  final int? expectedRevision;
  final String label;
  final String dimension;
  final int? sortOrder;
  final String? hotelId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'groupId': ?groupId,
    'expectedRevision': ?expectedRevision,
    'label': label,
    'dimension': dimension,
    'sortOrder': ?sortOrder,
    'hotelId': ?hotelId,
  };
}
