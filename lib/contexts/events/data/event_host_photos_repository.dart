import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_host_photos_repository.g.dart';

/// Photos an event's host team shares with the guests who checked in.
///
/// The host team stages an original in private Storage, then
/// `addEventHostPhoto` re-encodes it without EXIF or location metadata.
/// Guests and hosts read photos only through short-lived signed URLs.
abstract interface class EventHostPhotosRepository {
  Future<EventHostPhotoAlbum> listPhotos(String eventId);

  /// Stages [image] and shares it. [photoId] makes a retry replay safely.
  Future<EventHostPhoto> addPhoto({
    required String eventId,
    required String photoId,
    required String uploaderUid,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  });

  Future<void> deletePhoto({required String eventId, required String photoId});
}

class FirebaseEventHostPhotosRepository implements EventHostPhotosRepository {
  const FirebaseEventHostPhotosRepository(this._functions, this._uploads);

  final FirebaseFunctions _functions;
  final ImageUploadRepository _uploads;

  @override
  Future<EventHostPhotoAlbum> listPhotos(String eventId) => _call(
    name: 'listEventHostPhotos',
    payload: ListEventHostPhotosCallableRequest(eventId: eventId).toJson(),
    action: 'load host photos',
    parse: (data) => EventHostPhotoAlbum.fromMap(_requiredMap(data)),
  );

  @override
  Future<EventHostPhoto> addPhoto({
    required String eventId,
    required String photoId,
    required String uploaderUid,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    await _uploads.stageEventHostPhoto(
      eventId: eventId,
      photoId: photoId,
      uploaderUid: uploaderUid,
      image: image,
      onProgress: onProgress,
      cancellationToken: cancellationToken,
    );
    return _call(
      name: 'addEventHostPhoto',
      payload: AddEventHostPhotoCallableRequest(
        eventId: eventId,
        photoId: photoId,
      ).toJson(),
      action: 'share host photo',
      parse: (data) =>
          EventHostPhoto.fromMap(_requiredMap(_requiredMap(data)['photo'])),
    );
  }

  @override
  Future<void> deletePhoto({
    required String eventId,
    required String photoId,
  }) => _call(
    name: 'deleteEventHostPhoto',
    payload: DeleteEventHostPhotoCallableRequest(
      eventId: eventId,
      photoId: photoId,
    ).toJson(),
    action: 'remove host photo',
    parse: (_) {},
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

/// One stateless callable facade shared by the host and guest photo surfaces.
@riverpod
EventHostPhotosRepository eventHostPhotosRepository(Ref ref) =>
    FirebaseEventHostPhotosRepository(
      ref.watch(firebaseFunctionsProvider),
      ref.watch(imageUploadRepositoryProvider),
    );

/// The event's shared host photos for the signed-in viewer.
@riverpod
Future<EventHostPhotoAlbum> eventHostPhotoAlbum(Ref ref, String eventId) =>
    ref.watch(eventHostPhotosRepositoryProvider).listPhotos(eventId);

Map<Object?, Object?> _requiredMap(Object? value) {
  if (value is Map<Object?, Object?>) return value;
  throw const FormatException('Invalid host photo payload.');
}
