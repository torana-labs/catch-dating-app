// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_commercial_terms_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Finance/Admin Owner read of commercial terms for the Admin console: the platform defaults, one scope's stored record and recent revisions (organizerId null for the platform), every organizer override, and an optional organizer name search for adding an override. Read-only; writes go through manageCommercialTerms.
final class AdminListCommercialTermsCallableRequest {
  const AdminListCommercialTermsCallableRequest({
    required this.organizerId,
    required this.organizerQuery,
  });

  final String? organizerId;
  final String? organizerQuery;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'organizerQuery': organizerQuery,
  };
}
