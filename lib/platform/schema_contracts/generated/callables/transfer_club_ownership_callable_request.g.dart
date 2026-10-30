// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/transfer_club_ownership_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by transferClubOwnership.
final class TransferClubOwnershipCallableRequest {
  const TransferClubOwnershipCallableRequest({
    required this.clubId,
    required this.uid,
  });

  final String clubId;
  final String uid;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
    'uid': uid,
  };
}
