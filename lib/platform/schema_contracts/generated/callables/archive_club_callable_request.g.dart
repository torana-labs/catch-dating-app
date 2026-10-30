// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/archive_club_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by archiveClub.
final class ArchiveClubCallableRequest {
  const ArchiveClubCallableRequest({
    required this.clubId,
    this.reason,
  });

  final String clubId;
  final String? reason;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
    'reason': ?reason,
  };
}
