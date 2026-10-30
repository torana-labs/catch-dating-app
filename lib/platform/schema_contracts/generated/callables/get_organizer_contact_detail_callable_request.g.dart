// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_contact_detail_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized organizer contact detail request.
final class GetOrganizerContactDetailCallableRequest {
  const GetOrganizerContactDetailCallableRequest({
    required this.organizerId,
    required this.contactId,
    this.includeHistory,
  });

  final String organizerId;
  final String contactId;
  final bool? includeHistory;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactId': contactId,
    'includeHistory': ?includeHistory,
  };
}
