// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_entitlement_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Requests the bounded entitlement projection (grants, meters, SKU catalog) for one managed organizer.
final class GetOrganizerEntitlementCallableRequest {
  const GetOrganizerEntitlementCallableRequest({
    required this.organizerId,
  });

  final String organizerId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
  };
}
