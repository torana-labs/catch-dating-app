// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createOrganizer.
final class CreateOrganizerCallableRequest {
  const CreateOrganizerCallableRequest({
    this.organizerId,
    required this.name,
    required this.description,
    required this.location,
    required this.area,
    this.organizerType,
    this.imageUrl,
    this.profileImageUrl,
    this.organizerPhotos,
    this.logoPhoto,
    this.instagramHandle,
    this.phoneNumber,
    this.email,
    this.hostDefaults,
  });

  final String? organizerId;
  final String name;
  final String description;
  final String location;
  final String area;
  final String? organizerType;
  final String? imageUrl;
  final String? profileImageUrl;
  final List<Map<String, Object?>>? organizerPhotos;
  final Map<String, Object?>? logoPhoto;
  final String? instagramHandle;
  final String? phoneNumber;
  final String? email;
  final Map<String, Object?>? hostDefaults;

  Map<String, Object?> toJson() => {
    'organizerId': ?organizerId,
    'name': name,
    'description': description,
    'location': location,
    'area': area,
    'organizerType': ?organizerType,
    'imageUrl': ?imageUrl,
    'profileImageUrl': ?profileImageUrl,
    'organizerPhotos': ?organizerPhotos,
    'logoPhoto': ?logoPhoto,
    'instagramHandle': ?instagramHandle,
    'phoneNumber': ?phoneNumber,
    'email': ?email,
    'hostDefaults': ?hostDefaults,
  };
}
