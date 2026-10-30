// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/mutate_organizer_contact_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-only organizer-scoped contact correction, manual identity detail update, suppression, or hiding request.
final class MutateOrganizerContactCallableRequest {
  const MutateOrganizerContactCallableRequest({
    required this.organizerId,
    required this.contactId,
    required this.expectedRevision,
    this.displayNameOverride,
    this.phoneE164,
    this.email,
    this.whatsappAdminSuppressed,
    this.hidden,
    this.manualTags,
  });

  final String organizerId;
  final String contactId;
  final int expectedRevision;
  final String? displayNameOverride;
  final String? phoneE164;
  final String? email;
  final bool? whatsappAdminSuppressed;
  final bool? hidden;
  final List<String>? manualTags;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactId': contactId,
    'expectedRevision': expectedRevision,
    'displayNameOverride': ?displayNameOverride,
    'phoneE164': ?phoneE164,
    'email': ?email,
    'whatsappAdminSuppressed': ?whatsappAdminSuppressed,
    'hidden': ?hidden,
    'manualTags': ?manualTags,
  };
}
