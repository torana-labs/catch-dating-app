// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/transfer_organizer_ownership_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by transferOrganizerOwnership.
final class TransferOrganizerOwnershipCallableRequest {
  const TransferOrganizerOwnershipCallableRequest({
    required this.organizerId,
    required this.uid,
  });

  final String organizerId;
  final String uid;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'uid': uid,
  };
}
