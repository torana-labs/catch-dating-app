// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/unmerge_organizer_contacts_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager request to reverse one organizer contact merge receipt.
final class UnmergeOrganizerContactsCallableRequest {
  const UnmergeOrganizerContactsCallableRequest({
    required this.organizerId,
    required this.mergeReceiptId,
    required this.idempotencyKey,
  });

  final String organizerId;
  final String mergeReceiptId;
  final String idempotencyKey;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'mergeReceiptId': mergeReceiptId,
    'idempotencyKey': idempotencyKey,
  };
}
