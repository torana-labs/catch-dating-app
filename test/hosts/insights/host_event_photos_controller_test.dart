import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_host_photos_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_controller.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_state.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

EventHostPhoto _photo(String id) => EventHostPhoto(
  photoId: id,
  thumbnailUrl: 'https://signed.test/$id/thumbnail.jpg',
  displayUrl: 'https://signed.test/$id/display.jpg',
  width: 2048,
  height: 1536,
  uploadedByUid: 'host-1',
  createdAt: DateTime(2026, 11, 12),
);

EventHostPhotoAlbum _album({
  List<EventHostPhoto> photos = const [],
  EventHostPhotoAccess access = EventHostPhotoAccess.host,
  int maxPhotos = 100,
}) => EventHostPhotoAlbum(
  eventId: 'event-1',
  organizerName: 'Saturday Supper Club',
  access: access,
  maxPhotos: maxPhotos,
  photos: photos,
  urlsExpireAt: DateTime(2026, 11, 12, 1),
);

class _Photos implements EventHostPhotosRepository {
  _Photos(this.album);

  EventHostPhotoAlbum album;
  final added = <String>[];
  final removed = <String>[];
  final failures = <String, Object>{};
  final pending = <String, Completer<void>>{};

  @override
  Future<EventHostPhotoAlbum> listPhotos(String eventId) async => album;

  @override
  Future<EventHostPhoto> addPhoto({
    required String eventId,
    required String photoId,
    required String uploaderUid,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    onProgress?.call(
      const ImageUploadProgress(
        stage: ImageUploadJobStage.uploading,
        fraction: 0.5,
      ),
    );
    await pending[image.name]?.future;
    if (failures.remove(image.name) case final error?) throw error;
    added.add('$uploaderUid:${image.name}');
    return _photo(photoId);
  }

  @override
  Future<void> deletePhoto({
    required String eventId,
    required String photoId,
  }) async => removed.add(photoId);
}

class _Uploads extends Fake implements ImageUploadRepository {
  _Uploads(this.picked);

  final List<XFile> picked;
  int? limit;
  ImageUploadPurpose? purpose;

  @override
  Future<List<XFile>> pickImages({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
    int? limit,
  }) async {
    this.purpose = purpose;
    this.limit = limit;
    return picked;
  }
}

XFile _file(String name) => XFile(name);

Future<ProviderContainer> _container(_Photos photos, _Uploads uploads) async {
  final container = ProviderContainer(
    overrides: [
      eventHostPhotosRepositoryProvider.overrideWithValue(photos),
      imageUploadRepositoryProvider.overrideWithValue(uploads),
      uidProvider.overrideWith((ref) => Stream.value('host-1')),
    ],
  );
  addTearDown(container.dispose);
  final uid = container.listen(uidProvider, (_, _) {}, fireImmediately: true);
  addTearDown(uid.close);
  final state = container.listen(
    hostEventPhotosControllerProvider('event-1'),
    (_, _) {},
    fireImmediately: true,
  );
  addTearDown(state.close);
  await container.read(hostEventPhotosControllerProvider('event-1').future);
  return container;
}

HostEventPhotosState _state(ProviderContainer container) =>
    container.read(hostEventPhotosControllerProvider('event-1')).requireValue;

void main() {
  test(
    'picks photos within the remaining slots and shares each in turn',
    () async {
      final photos = _Photos(_album(photos: [_photo('old')], maxPhotos: 3));
      final uploads = _Uploads([_file('a.jpg'), _file('b.jpg')]);
      final container = await _container(photos, uploads);

      await container
          .read(hostEventPhotosControllerProvider('event-1').notifier)
          .addPhotos();

      expect(uploads.purpose, ImageUploadPurpose.eventHostPhoto);
      expect(uploads.limit, 2);
      expect(photos.added, ['host-1:a.jpg', 'host-1:b.jpg']);
      final state = _state(container);
      expect(state.photos, hasLength(3));
      expect(state.photos.last.photoId, 'old');
      expect(state.uploads, isEmpty);
      expect(state.canAdd, isFalse);
      expect(state.isFull, isTrue);
    },
  );

  test('shows upload progress while a photo is on its way', () async {
    final photos = _Photos(_album())..pending['a.jpg'] = Completer<void>();
    final container = await _container(photos, _Uploads([_file('a.jpg')]));

    final adding = container
        .read(hostEventPhotosControllerProvider('event-1').notifier)
        .addPhotos();
    await container.pump();

    final upload = _state(container).uploads.single;
    expect(upload.stage, HostEventPhotoUploadStage.uploading);
    expect(upload.progress, 0.5);

    photos.pending['a.jpg']!.complete();
    await adding;
    expect(_state(container).uploads, isEmpty);
    expect(_state(container).photos, hasLength(1));
  });

  test('a failed upload stays visible, retries under the same id and can be '
      'dismissed', () async {
    final photos = _Photos(_album())..failures['a.jpg'] = StateError('offline');
    final container = await _container(photos, _Uploads([_file('a.jpg')]));
    final controller = container.read(
      hostEventPhotosControllerProvider('event-1').notifier,
    );

    await controller.addPhotos();
    final failed = _state(container).uploads.single;
    expect(failed.stage, HostEventPhotoUploadStage.failed);
    expect(_state(container).photos, isEmpty);

    await controller.retry(failed.photoId);
    expect(_state(container).uploads, isEmpty);
    expect(_state(container).photos.single.photoId, failed.photoId);

    photos.failures['b.jpg'] = StateError('offline');
    final second = await _container(photos, _Uploads([_file('b.jpg')]));
    final secondController = second.read(
      hostEventPhotosControllerProvider('event-1').notifier,
    );
    await secondController.addPhotos();
    secondController.dismiss(_state(second).uploads.single.photoId);
    expect(_state(second).uploads, isEmpty);
  });

  test('removing a photo drops it from the album', () async {
    final photos = _Photos(_album(photos: [_photo('one'), _photo('two')]));
    final container = await _container(photos, _Uploads(const []));

    await container
        .read(hostEventPhotosControllerProvider('event-1').notifier)
        .remove('one');

    expect(photos.removed, ['one']);
    expect(_state(container).photos.map((photo) => photo.photoId), ['two']);
  });

  test('guests cannot add photos', () async {
    final photos = _Photos(_album(access: EventHostPhotoAccess.guest));
    final uploads = _Uploads([_file('a.jpg')]);
    final container = await _container(photos, uploads);

    await container
        .read(hostEventPhotosControllerProvider('event-1').notifier)
        .addPhotos();

    expect(uploads.limit, isNull);
    expect(photos.added, isEmpty);
  });
}
