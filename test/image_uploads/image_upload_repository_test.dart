import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

class TestFirebaseStorage extends Fake implements FirebaseStorage {
  final refs = <String, TestReference>{};

  @override
  Reference ref([String? path]) {
    final normalized = path ?? '/';
    return refs.putIfAbsent(normalized, () => TestReference(normalized));
  }

  int get putDataCallCount =>
      refs.values.fold(0, (total, ref) => total + ref.putDataCalls.length);
}

class TestReference extends Fake implements Reference {
  TestReference(this.path);

  final String path;
  final putDataCalls = <TestPutDataCall>[];
  Object? deleteFailure;
  int deleteCalls = 0;

  @override
  Future<void> delete() async {
    deleteCalls++;
    if (deleteFailure case final error?) throw error;
  }

  @override
  UploadTask putData(Uint8List data, [SettableMetadata? metadata]) {
    putDataCalls.add(TestPutDataCall(data: data, metadata: metadata));
    return TestUploadTask();
  }

  @override
  Future<String> getDownloadURL() async => 'https://storage.test/$path';
}

class TestPutDataCall {
  const TestPutDataCall({required this.data, required this.metadata});

  final Uint8List data;
  final SettableMetadata? metadata;
}

class TestUploadTask extends Fake implements UploadTask {
  final TaskSnapshot _snapshot = TestTaskSnapshot();

  @override
  Stream<TaskSnapshot> get snapshotEvents => Stream.value(_snapshot);

  @override
  Future<bool> cancel() async => true;

  @override
  Stream<TaskSnapshot> asStream() => Stream.value(_snapshot);

  @override
  Future<TaskSnapshot> catchError(
    Function onError, {
    bool Function(Object error)? test,
  }) async => _snapshot;

  @override
  Future<R> then<R>(
    FutureOr<R> Function(TaskSnapshot value) onValue, {
    Function? onError,
  }) => Future<TaskSnapshot>.value(_snapshot).then(onValue, onError: onError);

  @override
  Future<TaskSnapshot> timeout(
    Duration timeLimit, {
    FutureOr<TaskSnapshot> Function()? onTimeout,
  }) => Future<TaskSnapshot>.value(
    _snapshot,
  ).timeout(timeLimit, onTimeout: onTimeout);

  @override
  Future<TaskSnapshot> whenComplete(FutureOr<void> Function() action) async {
    await action();
    return _snapshot;
  }
}

class TestTaskSnapshot extends Fake implements TaskSnapshot {
  @override
  int get bytesTransferred => 3;

  @override
  int get totalBytes => 3;
}

class RecordingImagePicker extends Fake implements ImagePicker {
  double? maxWidth;
  double? maxHeight;
  int? imageQuality;
  int? limit;
  bool? requestFullMetadata;
  List<XFile> result = const [];

  @override
  Future<List<XFile>> pickMultiImage({
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    int? limit,
    bool requestFullMetadata = true,
  }) async {
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this.imageQuality = imageQuality;
    this.limit = limit;
    this.requestFullMetadata = requestFullMetadata;
    return result;
  }
}

typedef UploadInvoker =
    Future<Object?> Function(ImageUploadRepository repository, XFile image);

class UploadCase {
  const UploadCase({
    required this.name,
    required this.schemaFileName,
    required this.expectedPathPrefix,
    required this.invoke,
  });

  final String name;
  final String schemaFileName;
  final String expectedPathPrefix;
  final UploadInvoker invoke;
}

void main() {
  test(
    'recovery rejects PNG decoder fallback before any Storage upload',
    () async {
      final storage = TestFirebaseStorage();
      final repository = ImageUploadRepository(storage);
      final directory = await Directory.systemTemp.createTemp('cat58-png-');
      addTearDown(() => directory.delete(recursive: true));
      final file = await File(
        '${directory.path}/undecodable.png',
      ).writeAsBytes([137, 80, 78, 71]);
      await expectLater(
        repository.uploadEventPhotoForRecovery(
          eventId: 'saved-event',
          position: 0,
          mediaId: 'photo-0001',
          image: XFile(file.path, mimeType: 'image/png'),
        ),
        throwsA(
          isA<ValidationException>().having(
            (error) => error.code,
            'code',
            'event-photo-preparation-failed',
          ),
        ),
      );
      expect(storage.putDataCallCount, 0);
      expect(storage.refs, isEmpty);
    },
  );

  group('observable compensation', () {
    test('checked deletion confirms success and skips an empty path', () async {
      final storage = TestFirebaseStorage();
      final repository = ImageUploadRepository(storage);
      await repository.deleteByPathChecked(
        'events/event-1/media/photo-0001/original.jpg',
      );
      expect(storage.refs.values.single.deleteCalls, 1);
      await repository.deleteByPathChecked('');
      expect(storage.refs, hasLength(1));
    });

    test('checked deletion treats confirmed absence as success', () async {
      final storage = TestFirebaseStorage();
      (storage.ref('already-deleted') as TestReference).deleteFailure =
          FirebaseException(
            plugin: 'firebase_storage',
            code: 'object-not-found',
          );
      await ImageUploadRepository(
        storage,
      ).deleteByPathChecked('already-deleted');
      expect(storage.refs.values.single.deleteCalls, 1);
    });

    for (final failure in [
      FirebaseException(plugin: 'firebase_storage', code: 'unauthorized'),
      StateError('transport failed'),
    ]) {
      test(
        'checked deletion exposes ${failure.runtimeType} while best-effort deletion retains its behavior',
        () async {
          final storage = TestFirebaseStorage();
          (storage.ref('unattached') as TestReference).deleteFailure = failure;
          final repository = ImageUploadRepository(storage);
          await expectLater(
            repository.deleteByPathChecked('unattached'),
            throwsA(isA<AppException>()),
          );
          await repository.deleteByPath('unattached');
          expect(storage.refs.values.single.deleteCalls, 2);
        },
      );
    }
  });

  test('pickImages applies purpose policy and requested limit', () async {
    final picker = RecordingImagePicker()
      ..result = [
        XFile.fromData(Uint8List.fromList(const [1]), name: 'one.jpg'),
      ];
    final repository = ImageUploadRepository(
      TestFirebaseStorage(),
      picker: picker,
    );

    final picked = await repository.pickImages(
      purpose: ImageUploadPurpose.eventPhoto,
      limit: 4,
    );

    expect(picked, picker.result);
    expect(picker.maxWidth, ImageUploadRepository.eventPhotoPolicy.maxWidth);
    expect(picker.maxHeight, ImageUploadRepository.eventPhotoPolicy.maxHeight);
    expect(picker.imageQuality, ImageUploadRepository.eventPhotoPolicy.quality);
    expect(picker.limit, 4);
    expect(picker.requestFullMetadata, false);
  });

  group('ImageUploadRepository storage contract preflight', () {
    for (final uploadCase in _uploadCases) {
      test('${uploadCase.name} uploads valid images', () async {
        final storage = TestFirebaseStorage();
        final repository = ImageUploadRepository(storage);
        final image = _xFile(
          bytes: Uint8List.fromList([1, 2, 3]),
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
        );

        final result = await uploadCase.invoke(repository, image);

        expect(result, isNotNull);
        expect(storage.putDataCallCount, 1);
        final entry = storage.refs.entries.single;
        expect(entry.key, startsWith(uploadCase.expectedPathPrefix));
        expect(entry.key, endsWith('.jpg'));
        expect(
          entry.value.putDataCalls.single.metadata?.contentType,
          'image/jpeg',
        );
      });

      test('${uploadCase.name} rejects oversize files before upload', () async {
        final storage = TestFirebaseStorage();
        final repository = ImageUploadRepository(storage);
        final maxBytes = _schemaInt(
          uploadCase.schemaFileName,
          'x-storage-max-bytes',
        );
        final image = _xFile(
          bytes: Uint8List(maxBytes + 1),
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
        );

        await expectLater(
          uploadCase.invoke(repository, image),
          throwsA(
            isA<StorageUploadPreflightException>()
                .having((e) => e.constraint, 'constraint', 'max-bytes')
                .having(
                  (e) => e.context?.resource,
                  'resource',
                  _schemaResourceName(uploadCase.schemaFileName),
                ),
          ),
        );
        expect(storage.putDataCallCount, 0);
      });

      test(
        '${uploadCase.name} rejects non-image content type before upload',
        () async {
          final storage = TestFirebaseStorage();
          final repository = ImageUploadRepository(storage);
          final pattern = _schemaString(
            uploadCase.schemaFileName,
            'x-storage-content-type-pattern',
          );
          expect(RegExp('^$pattern\$').hasMatch('text/plain'), isFalse);
          final image = _xFile(
            bytes: Uint8List.fromList([1, 2, 3]),
            name: 'photo.jpg',
            mimeType: 'text/plain',
          );

          await expectLater(
            uploadCase.invoke(repository, image),
            throwsA(
              isA<StorageUploadPreflightException>()
                  .having((e) => e.constraint, 'constraint', 'content-type')
                  .having(
                    (e) => e.context?.resource,
                    'resource',
                    _schemaResourceName(uploadCase.schemaFileName),
                  ),
            ),
          );
          expect(storage.putDataCallCount, 0);
        },
      );
    }

    test('chat images persist immutable uploader ownership metadata', () async {
      final storage = TestFirebaseStorage();
      final repository = ImageUploadRepository(storage);
      final image = _xFile(
        bytes: Uint8List.fromList([1, 2, 3]),
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      );

      await repository.uploadChatImage(
        matchId: 'match-1',
        messageId: 'message-1',
        uploaderUid: 'user-1',
        image: image,
      );

      expect(
        storage.refs.values.single.putDataCalls.single.metadata?.customMetadata,
        {'uploaderUid': 'user-1'},
      );
    });

    test('reports preparation, byte progress, and attach stages', () async {
      final progress = <ImageUploadProgress>[];
      final repository = ImageUploadRepository(TestFirebaseStorage());

      await repository.uploadWithMetadata(
        storagePath: 'users/user-1/photos/0_123',
        image: _xFile(
          bytes: Uint8List.fromList([1, 2, 3]),
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
        ),
        onProgress: progress.add,
      );

      expect(progress.first.stage, ImageUploadJobStage.preparing);
      expect(
        progress.where((item) => item.stage == ImageUploadJobStage.uploading),
        isNotEmpty,
      );
      expect(progress.last.stage, ImageUploadJobStage.attaching);
      expect(progress.last.fraction, 1);
    });

    test('uses a stable media id instead of encoding gallery order', () async {
      final storage = TestFirebaseStorage();
      final repository = ImageUploadRepository(storage);

      await repository.uploadClubPhoto(
        clubId: 'club-1',
        position: 24,
        mediaId: 'abcdefghijklmnopqrstuvwx',
        image: _xFile(
          bytes: Uint8List.fromList([1, 2, 3]),
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
        ),
      );

      expect(
        storage.refs.keys.single,
        'organizers/club-1/media/abcdefghijklmnopqrstuvwx/original.jpg',
      );
    });
  });
}

final _uploadCases = <UploadCase>[
  UploadCase(
    name: 'uploadUserPhoto',
    schemaFileName: 'profile_photos.schema.json',
    expectedPathPrefix: 'users/user-1/photos/0_',
    invoke: (repository, image) =>
        repository.uploadUserPhoto(uid: 'user-1', index: 0, image: image),
  ),
  UploadCase(
    name: 'uploadUserProfilePhoto',
    schemaFileName: 'profile_photos.schema.json',
    expectedPathPrefix: 'users/user-1/photos/0_',
    invoke: (repository, image) => repository.uploadUserProfilePhoto(
      uid: 'user-1',
      index: 0,
      image: image,
    ),
  ),
  UploadCase(
    name: 'uploadClubCover',
    schemaFileName: 'organizer_media_objects.schema.json',
    expectedPathPrefix: 'organizers/club-1/media/',
    invoke: (repository, image) => repository.uploadClubCover(
      uid: 'user-1',
      clubId: 'club-1',
      image: image,
    ),
  ),
  UploadCase(
    name: 'uploadClubProfileImage',
    schemaFileName: 'organizer_logo_media_objects.schema.json',
    expectedPathPrefix: 'organizers/club-1/logo/',
    invoke: (repository, image) => repository.uploadClubProfileImage(
      uid: 'user-1',
      clubId: 'club-1',
      image: image,
    ),
  ),
  UploadCase(
    name: 'uploadEventPhoto',
    schemaFileName: 'event_photos.schema.json',
    expectedPathPrefix: 'events/event-1/media/',
    invoke: (repository, image) => repository.uploadEventPhoto(
      uid: 'user-1',
      clubId: 'club-1',
      eventId: 'event-1',
      image: image,
    ),
  ),
  UploadCase(
    name: 'uploadChatImage',
    schemaFileName: 'match_chat_images.schema.json',
    expectedPathPrefix: 'matches/match-1/images/message-1_',
    invoke: (repository, image) => repository.uploadChatImage(
      matchId: 'match-1',
      messageId: 'message-1',
      uploaderUid: 'user-1',
      image: image,
    ),
  ),
];

XFile _xFile({
  required Uint8List bytes,
  required String name,
  required String mimeType,
}) {
  return XFile.fromData(bytes, name: name, mimeType: mimeType);
}

Map<String, Object?> _schema(String fileName) {
  return jsonDecode(File('contracts/storage/$fileName').readAsStringSync())
      as Map<String, Object?>;
}

int _schemaInt(String fileName, String key) => _schema(fileName)[key] as int;

String _schemaString(String fileName, String key) =>
    _schema(fileName)[key] as String;

String _schemaResourceName(String fileName) =>
    fileName.replaceFirst('.schema.json', '');
