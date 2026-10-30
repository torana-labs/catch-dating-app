// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/club_membership_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Retired legacy membership payload retained only for schema-history decoding.
final class ClubMembershipCallableRequest {
  const ClubMembershipCallableRequest({
    required this.clubId,
  });

  final String clubId;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
  };
}
