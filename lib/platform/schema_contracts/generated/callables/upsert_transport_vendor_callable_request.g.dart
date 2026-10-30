// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_transport_vendor_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update an organizer-level transport vendor and bind it to programs.
final class UpsertTransportVendorCallableRequest {
  const UpsertTransportVendorCallableRequest({
    required this.organizerId,
    this.vendorId,
    this.expectedRevision,
    required this.name,
    this.contactName,
    this.phoneE164,
    this.programIds,
    this.active,
    this.notes,
  });

  final String organizerId;
  final String? vendorId;
  final int? expectedRevision;
  final String name;
  final String? contactName;
  final String? phoneE164;
  final List<String>? programIds;
  final bool? active;
  final String? notes;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'vendorId': ?vendorId,
    'expectedRevision': ?expectedRevision,
    'name': name,
    'contactName': ?contactName,
    'phoneE164': ?phoneE164,
    'programIds': ?programIds,
    'active': ?active,
    'notes': ?notes,
  };
}
