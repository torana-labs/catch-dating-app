// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';


// Typed callable request DTO emitted from callables/create_club_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createClub.
final class CreateClubCallableRequest {
  const CreateClubCallableRequest({
    this.clubId,
    required this.name,
    required this.description,
    required this.location,
    required this.area,
    this.organizerType,
    this.imageUrl,
    this.profileImageUrl,
    this.clubPhotos,
    this.logoPhoto,
    this.instagramHandle,
    this.phoneNumber,
    this.email,
    this.hostDefaults,
  });

  final String? clubId;
  final String name;
  final String description;
  final String location;
  final String area;
  final String? organizerType;
  final String? imageUrl;
  final String? profileImageUrl;
  final List<Map<String, Object?>>? clubPhotos;
  final Map<String, Object?>? logoPhoto;
  final String? instagramHandle;
  final String? phoneNumber;
  final String? email;
  final ClubHostDefaults? hostDefaults;

  Map<String, Object?> toJson() => {
    'clubId': ?clubId,
    'name': name,
    'description': description,
    'location': location,
    'area': area,
    'organizerType': ?organizerType,
    'imageUrl': ?imageUrl,
    'profileImageUrl': ?profileImageUrl,
    'clubPhotos': ?clubPhotos,
    'logoPhoto': ?logoPhoto,
    'instagramHandle': ?instagramHandle,
    'phoneNumber': ?phoneNumber,
    'email': ?email,
    'hostDefaults': ?hostDefaults?.toJson(),
  };
}
