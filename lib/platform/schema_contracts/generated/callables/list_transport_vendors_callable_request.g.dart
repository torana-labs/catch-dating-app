// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_transport_vendors_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// List organizer vendors, optionally narrowed to those bound to a program.
final class ListTransportVendorsCallableRequest {
  const ListTransportVendorsCallableRequest({
    required this.organizerId,
    this.programId,
  });

  final String organizerId;
  final String? programId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'programId': ?programId,
  };
}
