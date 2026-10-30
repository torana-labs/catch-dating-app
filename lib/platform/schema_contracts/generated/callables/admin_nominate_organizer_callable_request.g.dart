// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_nominate_organizer_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// A Catch sales associate nominates an organizer. Supply Intake builds the listing from the name and links; nothing is published until staff review it.
final class AdminNominateOrganizerCallableRequest {
  const AdminNominateOrganizerCallableRequest({
    required this.requestId,
    required this.name,
    required this.market,
    required this.urls,
    required this.notes,
    required this.categories,
  });

  final String requestId;
  final String? name;
  final String market;
  final List<String> urls;
  final String? notes;
  final List<String> categories;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'name': name,
    'market': market,
    'urls': urls,
    'notes': notes,
    'categories': categories,
  };
}
