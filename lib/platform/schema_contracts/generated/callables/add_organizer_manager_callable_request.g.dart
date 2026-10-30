// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/add_organizer_manager_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by addOrganizerManager.
final class AddOrganizerManagerCallableRequest {
  const AddOrganizerManagerCallableRequest({
    required this.organizerId,
    this.uid,
    this.phoneNumber,
  });

  final String organizerId;
  final String? uid;
  final String? phoneNumber;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'uid': ?uid,
    'phoneNumber': ?phoneNumber,
  };
}
