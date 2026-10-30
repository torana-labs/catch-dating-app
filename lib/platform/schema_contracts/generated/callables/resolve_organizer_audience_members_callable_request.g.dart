// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/resolve_organizer_audience_members_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Resolves the explicitly selected organizer contact ids for a static audience editor.
final class ResolveOrganizerAudienceMembersCallableRequest {
  const ResolveOrganizerAudienceMembersCallableRequest({
    required this.organizerId,
    required this.contactIds,
  });

  final String organizerId;
  final List<String> contactIds;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactIds': contactIds,
  };
}
