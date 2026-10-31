// ignore_for_file: use_null_aware_elements

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/kernel/sentinels.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';

/// Typed patch helper for the canonical `updateOrganizer` callable.
///
/// This remains handwritten because the schema generator cannot currently emit
/// patch helpers for array fields that contain embedded objects.
final class UpdateOrganizerPatch {
  UpdateOrganizerPatch({
    String? name,
    String? description,
    OrganizerType? organizerType,
    Object? location = unsetSentinel,
    String? area,
    String? hostName,
    Object? hostAvatarUrl = unsetSentinel,
    Object? imageUrl = unsetSentinel,
    Object? profileImageUrl = unsetSentinel,
    List<UploadedPhoto>? organizerPhotos,
    Object? logoPhoto = unsetSentinel,
    List<String>? tags,
    Object? instagramHandle = unsetSentinel,
    Object? phoneNumber = unsetSentinel,
    Object? email = unsetSentinel,
    OrganizerHostDefaults? hostDefaults,
    bool? publicListingEnabled,
  }) : _fields = {
         if (name != null) 'name': name,
         if (description != null) 'description': description,
         if (organizerType != null) 'organizerType': organizerType.name,
         if (!identical(location, unsetSentinel)) 'location': location,
         if (area != null) 'area': area,
         if (hostName != null) 'hostName': hostName,
         if (!identical(hostAvatarUrl, unsetSentinel))
           'hostAvatarUrl': hostAvatarUrl,
         if (!identical(imageUrl, unsetSentinel)) 'imageUrl': imageUrl,
         if (!identical(profileImageUrl, unsetSentinel))
           'profileImageUrl': profileImageUrl,
         if (organizerPhotos != null)
           'organizerPhotos': organizerPhotos
               .map((photo) => firestoreCallableJsonValue(photo.toJson()))
               .toList(),
         if (!identical(logoPhoto, unsetSentinel))
           'logoPhoto': firestoreCallableJsonValue(
             (logoPhoto as UploadedPhoto?)?.toJson(),
           ),
         if (tags != null) 'tags': tags,
         if (!identical(instagramHandle, unsetSentinel))
           'instagramHandle': instagramHandle,
         if (!identical(phoneNumber, unsetSentinel)) 'phoneNumber': phoneNumber,
         if (!identical(email, unsetSentinel)) 'email': email,
         if (hostDefaults != null) 'hostDefaults': hostDefaults.toJson(),
         if (publicListingEnabled != null)
           'publicListingEnabled': publicListingEnabled,
       };

  /// Escape hatch for callers that compute the field key dynamically.
  /// Prefer the typed constructor for app presentation and repository code.
  UpdateOrganizerPatch.raw(Map<String, Object?> fields)
    : _fields = Map<String, Object?>.from(fields);

  final Map<String, Object?> _fields;

  Iterable<String> get keys => _fields.keys;

  bool get isEmpty => _fields.isEmpty;
  bool get isNotEmpty => _fields.isNotEmpty;

  Map<String, Object?> toFieldsJson() =>
      Map<String, Object?>.unmodifiable(_fields);

  Map<String, Object?> toCallableJson({required String organizerId}) => {
    'organizerId': organizerId,
    'fields': toFieldsJson(),
  };
}
