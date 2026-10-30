// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/merge_organizer_contacts_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-confirmed, revision-checked organizer contact merge.
final class MergeOrganizerContactsCallableRequest {
  const MergeOrganizerContactsCallableRequest({
    required this.organizerId,
    required this.survivorContactId,
    required this.sourceContactId,
    required this.survivorRevision,
    required this.sourceRevision,
    required this.confirmConflicts,
    required this.idempotencyKey,
  });

  final String organizerId;
  final String survivorContactId;
  final String sourceContactId;
  final int survivorRevision;
  final int sourceRevision;
  final bool confirmConflicts;
  final String idempotencyKey;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'survivorContactId': survivorContactId,
    'sourceContactId': sourceContactId,
    'survivorRevision': survivorRevision,
    'sourceRevision': sourceRevision,
    'confirmConflicts': confirmConflicts,
    'idempotencyKey': idempotencyKey,
  };
}
