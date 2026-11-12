import 'dart:typed_data';

import 'package:catch_dating_app/contexts/events/data/event_host_photos_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

const _photo = {
  'photoId': 'hostPhoto0000000001',
  'thumbnailUrl': 'https://signed.test/thumbnail.jpg',
  'displayUrl': 'https://signed.test/display.jpg',
  'width': 2048,
  'height': 1536,
  'uploadedByUid': 'host-1',
  'createdAtMillis': 1800000000000,
};

void main() {
  test('lists the album with access, organizer and signed photos', () async {
    final functions = _Functions()
      ..responses['listEventHostPhotos'] = {
        'eventId': 'event-1',
        'organizerName': 'Saturday Supper Club',
        'access': 'guest',
        'maxPhotos': 100,
        'photos': [_photo],
        'urlsExpireAtMillis': 1800000900000,
      };
    final repository = FirebaseEventHostPhotosRepository(functions, _Uploads());

    final album = await repository.listPhotos('event-1');

    expect(functions.payloads['listEventHostPhotos'], {'eventId': 'event-1'});
    expect(album.access, EventHostPhotoAccess.guest);
    expect(album.canManage, isFalse);
    expect(album.organizerName, 'Saturday Supper Club');
    expect(album.photos.single.displayUrl, 'https://signed.test/display.jpg');
    expect(album.photos.single.aspectRatio, closeTo(4 / 3, 0.001));
    expect(album.remainingSlots, 99);
  });

  test('an outsider album is empty and cannot be managed', () {
    final album = EventHostPhotoAlbum.fromMap({
      'eventId': 'event-1',
      'organizerName': null,
      'access': 'none',
      'maxPhotos': 100,
      'photos': <Object?>[],
      'urlsExpireAtMillis': 1800000900000,
    });
    expect(album.isEmpty, isTrue);
    expect(album.canManage, isFalse);
    expect(album.organizerName, isNull);
  });

  test('rejects a malformed album payload', () {
    expect(
      () => EventHostPhotoAlbum.fromMap({
        'eventId': 'event-1',
        'access': 'host',
        'maxPhotos': 100,
        'photos': [
          {..._photo, 'displayUrl': ''},
        ],
        'urlsExpireAtMillis': 1,
      }),
      throwsFormatException,
    );
  });

  test('stages the original before sharing it under the same id', () async {
    final functions = _Functions()
      ..responses['addEventHostPhoto'] = {
        'eventId': 'event-1',
        'photo': _photo,
        'urlsExpireAtMillis': 1800000900000,
      };
    final uploads = _Uploads();
    final repository = FirebaseEventHostPhotosRepository(functions, uploads);
    final progress = <ImageUploadProgress>[];

    final photo = await repository.addPhoto(
      eventId: 'event-1',
      photoId: 'hostPhoto0000000001',
      uploaderUid: 'host-1',
      image: XFile.fromData(Uint8List(3), name: 'photo.jpg'),
      onProgress: progress.add,
    );

    expect(uploads.staged, ['event-1/hostPhoto0000000001/host-1']);
    expect(progress.single.stage, ImageUploadJobStage.uploading);
    expect(functions.calls, ['addEventHostPhoto']);
    expect(functions.payloads['addEventHostPhoto'], {
      'eventId': 'event-1',
      'photoId': 'hostPhoto0000000001',
    });
    expect(photo.photoId, 'hostPhoto0000000001');
  });

  test('a failed staging upload never calls the add callable', () async {
    final functions = _Functions();
    final uploads = _Uploads()..failure = StateError('offline');
    final repository = FirebaseEventHostPhotosRepository(functions, uploads);

    await expectLater(
      repository.addPhoto(
        eventId: 'event-1',
        photoId: 'hostPhoto0000000001',
        uploaderUid: 'host-1',
        image: XFile.fromData(Uint8List(3), name: 'photo.jpg'),
      ),
      throwsStateError,
    );
    expect(functions.calls, isEmpty);
  });

  test('removes a photo by event and id', () async {
    final functions = _Functions()
      ..responses['deleteEventHostPhoto'] = {
        'eventId': 'event-1',
        'photoId': 'hostPhoto0000000001',
        'deleted': true,
      };
    final repository = FirebaseEventHostPhotosRepository(functions, _Uploads());

    await repository.deletePhoto(
      eventId: 'event-1',
      photoId: 'hostPhoto0000000001',
    );

    expect(functions.payloads['deleteEventHostPhoto'], {
      'eventId': 'event-1',
      'photoId': 'hostPhoto0000000001',
    });
  });
}

class _Uploads extends Fake implements ImageUploadRepository {
  final staged = <String>[];
  Object? failure;

  @override
  Future<String> stageEventHostPhoto({
    required String eventId,
    required String photoId,
    required String uploaderUid,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    if (failure case final error?) throw error;
    staged.add('$eventId/$photoId/$uploaderUid');
    onProgress?.call(
      const ImageUploadProgress(
        stage: ImageUploadJobStage.uploading,
        fraction: 1,
      ),
    );
    return 'events/$eventId/hostPhotoUploads/$photoId/original.jpg';
  }
}

class _Functions extends Fake implements FirebaseFunctions {
  final responses = <String, Object?>{};
  final payloads = <String, Object?>{};
  final calls = <String>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    calls.add(name);
    return _Callable((value) {
      payloads[name] = value;
      return responses[name];
    });
  }
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);
  final Object? Function(Object?) respond;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);

  @override
  final T data;
}
