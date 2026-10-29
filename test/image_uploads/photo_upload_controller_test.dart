import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

import '../events/events_test_helpers.dart';

class FakePhotoUserProfileRepository extends Fake
    implements UserProfileRepository {
  FakePhotoUserProfileRepository(this.currentUser, {this.updateError});

  UserProfile currentUser;
  final Object? updateError;
  final updatedProfilePhotos = <List<ProfilePhoto>>[];

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async =>
      currentUser;

  @override
  Future<void> updateProfilePhotos({
    required String uid,
    required List<ProfilePhoto> profilePhotos,
  }) async {
    if (updateError != null) throw updateError!;
    updatedProfilePhotos.add(List<ProfilePhoto>.from(profilePhotos));
    currentUser = currentUser.copyWith(
      profilePhotos: List<ProfilePhoto>.from(profilePhotos),
    );
  }
}

class ControlledImageUploadRepository extends Fake
    implements ImageUploadRepository {
  final uploadCompleters = <Completer<UploadedImage>>[];
  final uploadedIndices = <int>[];
  final deletedPaths = <String>[];

  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) async => XFile('picked-photo.jpg');

  @override
  Future<UploadedImage> uploadUserProfilePhoto({
    required String uid,
    required int index,
    required XFile image,
    void Function(ImageUploadProgress)? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) {
    uploadedIndices.add(index);
    final completer = Completer<UploadedImage>();
    uploadCompleters.add(completer);
    return completer.future;
  }

  @override
  Future<void> deleteByPath(String storagePath) async {
    deletedPaths.add(storagePath);
  }
}

class SlowPickingImageUploadRepository extends Fake
    implements ImageUploadRepository {
  final pickCompleter = Completer<XFile?>();
  int pickImageCallCount = 0;

  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) {
    pickImageCallCount += 1;
    return pickCompleter.future;
  }
}

void main() {
  ProfilePhoto profilePhoto(
    int position, {
    String? url,
    PhotoPromptAnswer? prompt,
  }) {
    return ProfilePhoto.uploaded(
      position: position,
      url: url ?? 'https://img.example/$position.jpg',
      storagePath: 'users/runner-1/photos/${position}_test.jpg',
      prompt: prompt,
      now: DateTime(2026, 5, 17),
    );
  }

  PhotoPromptAnswer prompt(int index, String caption) => PhotoPromptAnswer(
    photoIndex: index,
    promptId: 'proofIRun',
    prompt: 'Proof I actually event',
    caption: caption,
  );

  PhotoPromptAnswer catalogPrompt(int index, String promptId, String caption) =>
      photoPromptAnswerFor(
        photoIndex: index,
        definition: photoPromptDefinition(promptId),
        caption: caption,
      );

  test('image upload policies keep picked media bounded by surface', () {
    expect(ImageUploadRepository.profilePhotoPolicy.maxWidth, 1600);
    expect(ImageUploadRepository.profilePhotoPolicy.quality, 85);
    expect(ImageUploadRepository.chatImagePolicy.maxWidth, 1440);
    expect(ImageUploadRepository.chatImagePolicy.quality, 78);
    expect(ImageUploadRepository.clubCoverPolicy.maxHeight, 1200);
    expect(ImageUploadRepository.eventPhotoPolicy.maxWidth, 1800);
    expect(
      ImageUploadRepository.policyForPurpose(
        ImageUploadPurpose.eventPhoto,
      ).quality,
      82,
    );
  });

  test(
    'rejects out-of-range photo slots before starting upload work',
    () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await expectLater(
        container.read(photoUploadControllerProvider.notifier).pickAndUpload(6),
        throwsRangeError,
      );
    },
  );

  test(
    'serializes overlapping photo writes so newer state is preserved',
    () async {
      final userProfileRepository = FakePhotoUserProfileRepository(
        buildUser(photoUrls: const ['https://img.example/old-0.jpg']),
      );
      final imageUploadRepository = ControlledImageUploadRepository();
      final container = ProviderContainer(
        overrides: [
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => imageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      final uploadSubscription = container.listen(
        photoUploadControllerProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uploadSubscription.close);
      await container.pump();

      final controller = container.read(photoUploadControllerProvider.notifier);
      final firstUpload = controller.pickAndUpload(0);
      await container.pump();
      final secondUpload = controller.pickAndUpload(1);
      await container.pump();

      expect(imageUploadRepository.uploadedIndices, [0, 1]);

      imageUploadRepository.uploadCompleters[1].complete(
        const UploadedImage(
          url: 'https://img.example/new-1.jpg',
          storagePath: 'users/runner-1/photos/1_test.jpg',
        ),
      );
      await container.pump();
      imageUploadRepository.uploadCompleters[0].complete(
        const UploadedImage(
          url: 'https://img.example/new-0.jpg',
          storagePath: 'users/runner-1/photos/0_test.jpg',
        ),
      );

      await Future.wait([firstUpload, secondUpload]);

      expect(
        userProfileRepository.updatedProfilePhotos
            .map((photos) => photos.map((photo) => photo.url).toList())
            .toList(),
        [
          ['https://img.example/old-0.jpg', 'https://img.example/new-1.jpg'],
          ['https://img.example/new-0.jpg', 'https://img.example/new-1.jpg'],
        ],
      );
      expect(
        userProfileRepository.currentUser.effectiveProfilePhotos.map(
          (photo) => photo.url,
        ),
        ['https://img.example/new-0.jpg', 'https://img.example/new-1.jpg'],
      );
      expect(
        container.read(photoUploadControllerProvider).loadingIndices,
        isEmpty,
      );
    },
  );

  test('ignores a second picker request while the first is open', () async {
    final userProfileRepository = FakePhotoUserProfileRepository(buildUser());
    final imageUploadRepository = SlowPickingImageUploadRepository();
    final container = ProviderContainer(
      overrides: [
        userProfileRepositoryProvider.overrideWith(
          (ref) => userProfileRepository,
        ),
        imageUploadRepositoryProvider.overrideWith(
          (ref) => imageUploadRepository,
        ),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      ],
    );
    addTearDown(container.dispose);
    final uidSubscription = container.listen(
      uidProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uidSubscription.close);
    final uploadSubscription = container.listen(
      photoUploadControllerProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uploadSubscription.close);
    await container.pump();

    final controller = container.read(photoUploadControllerProvider.notifier);
    final firstPick = controller.pickAndUpload(0);
    await container.pump();
    final ignoredPick = controller.pickAndUpload(1);
    await container.pump();

    expect(imageUploadRepository.pickImageCallCount, 1);
    expect(container.read(photoUploadControllerProvider).loadingIndices, {0});

    imageUploadRepository.pickCompleter.complete(null);

    await Future.wait([firstPick, ignoredPick]);

    expect(
      container.read(photoUploadControllerProvider).loadingIndices,
      isEmpty,
    );
    expect(userProfileRepository.updatedProfilePhotos, isEmpty);
  });

  test('completes safely if the provider is disposed mid-upload', () async {
    final userProfileRepository = FakePhotoUserProfileRepository(buildUser());
    final imageUploadRepository = ControlledImageUploadRepository();
    final container = ProviderContainer(
      overrides: [
        userProfileRepositoryProvider.overrideWith(
          (ref) => userProfileRepository,
        ),
        imageUploadRepositoryProvider.overrideWith(
          (ref) => imageUploadRepository,
        ),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      ],
    );
    final uidSubscription = container.listen(
      uidProvider,
      (_, _) {},
      fireImmediately: true,
    );
    final uploadSubscription = container.listen(
      photoUploadControllerProvider,
      (_, _) {},
      fireImmediately: true,
    );
    await container.pump();

    final controller = container.read(photoUploadControllerProvider.notifier);
    final upload = controller.pickAndUpload(0);
    await container.pump();
    expect(imageUploadRepository.uploadCompleters, hasLength(1));

    container.dispose();
    uidSubscription.close();
    uploadSubscription.close();
    imageUploadRepository.uploadCompleters.single.complete(
      const UploadedImage(
        url: 'https://img.example/disposed.jpg',
        storagePath: 'users/runner-1/photos/0_test.jpg',
      ),
    );

    await expectLater(upload, completes);
  });

  test('deletes a new upload when attaching it to the profile fails', () async {
    final userProfileRepository = FakePhotoUserProfileRepository(
      buildUser(),
      updateError: StateError('profile write failed'),
    );
    final imageUploadRepository = ControlledImageUploadRepository();
    final container = ProviderContainer(
      overrides: [
        userProfileRepositoryProvider.overrideWith(
          (ref) => userProfileRepository,
        ),
        imageUploadRepositoryProvider.overrideWith(
          (ref) => imageUploadRepository,
        ),
        errorLoggerProvider.overrideWithValue(_SilentErrorLogger()),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      ],
    );
    addTearDown(container.dispose);
    final uidSubscription = container.listen(
      uidProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uidSubscription.close);
    final uploadSubscription = container.listen(
      photoUploadControllerProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uploadSubscription.close);
    await container.pump();

    final upload = container
        .read(photoUploadControllerProvider.notifier)
        .pickAndUpload(0);
    await container.pump();
    imageUploadRepository.uploadCompleters.single.complete(
      const UploadedImage(
        url: 'https://img.example/new.jpg',
        storagePath: 'users/runner-1/photos/0_new.jpg',
      ),
    );
    await upload;

    expect(imageUploadRepository.deletedPaths, [
      'users/runner-1/photos/0_new.jpg',
    ]);
    expect(
      container.read(photoUploadControllerProvider).jobFor(0)?.stage,
      ImageUploadJobStage.failed,
    );
  });

  test(
    'deletePhoto compacts grouped photos and compatibility arrays',
    () async {
      final userProfileRepository = FakePhotoUserProfileRepository(
        buildUser().copyWith(
          profileComplete: true,
          profilePhotos: [
            profilePhoto(0),
            profilePhoto(1),
            profilePhoto(2, prompt: prompt(2, 'Hill repeat')),
          ],
        ),
      );
      final container = ProviderContainer(
        overrides: [
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await container
          .read(photoUploadControllerProvider.notifier)
          .deletePhoto(1);

      final updatedPhotos = userProfileRepository.updatedProfilePhotos.single;
      expect(updatedPhotos.map((photo) => photo.url), [
        'https://img.example/0.jpg',
        'https://img.example/2.jpg',
      ]);
      expect(updatedPhotos.map((photo) => photo.position), [0, 1]);
      expect(updatedPhotos.last.prompt?.photoIndex, 1);
    },
  );

  test('deletePhoto keeps completed profiles above the photo floor', () async {
    final userProfileRepository = FakePhotoUserProfileRepository(
      buildUser().copyWith(
        profileComplete: true,
        profilePhotos: [profilePhoto(0), profilePhoto(1)],
      ),
    );
    final container = ProviderContainer(
      overrides: [
        userProfileRepositoryProvider.overrideWith(
          (ref) => userProfileRepository,
        ),
        errorLoggerProvider.overrideWithValue(_SilentErrorLogger()),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      ],
    );
    addTearDown(container.dispose);
    final uidSubscription = container.listen(
      uidProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uidSubscription.close);
    await container.pump();

    await expectLater(
      container.read(photoUploadControllerProvider.notifier).deletePhoto(1),
      throwsStateError,
    );
    expect(userProfileRepository.updatedProfilePhotos, isEmpty);
  });

  test('reorderPhoto moves photos and keeps prompts aligned', () async {
    final userProfileRepository = FakePhotoUserProfileRepository(
      buildUser().copyWith(
        profilePhotos: [
          profilePhoto(0, prompt: prompt(0, 'Coffee')),
          profilePhoto(1),
          profilePhoto(2),
        ],
      ),
    );
    final container = ProviderContainer(
      overrides: [
        userProfileRepositoryProvider.overrideWith(
          (ref) => userProfileRepository,
        ),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      ],
    );
    addTearDown(container.dispose);
    final uidSubscription = container.listen(
      uidProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uidSubscription.close);
    await container.pump();

    await container
        .read(photoUploadControllerProvider.notifier)
        .reorderPhoto(fromIndex: 0, toIndex: 2);

    final updatedPhotos = userProfileRepository.updatedProfilePhotos.single;
    expect(updatedPhotos.map((photo) => photo.url), [
      'https://img.example/1.jpg',
      'https://img.example/2.jpg',
      'https://img.example/0.jpg',
    ]);
    expect(updatedPhotos.map((photo) => photo.position), [0, 1, 2]);
    expect(updatedPhotos.last.prompt?.photoIndex, 2);
  });

  test(
    'savePhoto updates an existing photo caption without uploading',
    () async {
      final userProfileRepository = FakePhotoUserProfileRepository(
        buildUser().copyWith(profilePhotos: [profilePhoto(0)]),
      );
      final imageUploadRepository = ControlledImageUploadRepository();
      final container = ProviderContainer(
        overrides: [
          userProfileRepositoryProvider.overrideWith(
            (ref) => userProfileRepository,
          ),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => imageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await container
          .read(photoUploadControllerProvider.notifier)
          .savePhoto(index: 0, prompt: prompt(0, 'Finish line'));

      expect(imageUploadRepository.uploadedIndices, isEmpty);
      expect(
        userProfileRepository
            .updatedProfilePhotos
            .single
            .single
            .prompt
            ?.caption,
        'Finish line',
      );
    },
  );

  test('savePhoto clears the same prompt from other photos', () async {
    final userProfileRepository = FakePhotoUserProfileRepository(
      buildUser().copyWith(
        profilePhotos: [
          profilePhoto(0, prompt: prompt(0, 'Track day')),
          profilePhoto(1, prompt: catalogPrompt(1, 'postRunGlow', 'Cafe stop')),
        ],
      ),
    );
    final imageUploadRepository = ControlledImageUploadRepository();
    final container = ProviderContainer(
      overrides: [
        userProfileRepositoryProvider.overrideWith(
          (ref) => userProfileRepository,
        ),
        imageUploadRepositoryProvider.overrideWith(
          (ref) => imageUploadRepository,
        ),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      ],
    );
    addTearDown(container.dispose);
    final uidSubscription = container.listen(
      uidProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uidSubscription.close);
    await container.pump();

    await container
        .read(photoUploadControllerProvider.notifier)
        .savePhoto(index: 1, prompt: prompt(1, 'Finish line'));

    final updatedPhotos = userProfileRepository.updatedProfilePhotos.single;
    expect(imageUploadRepository.uploadedIndices, isEmpty);
    expect(updatedPhotos.map((photo) => photo.prompt?.promptId), [
      null,
      'proofIRun',
    ]);
    expect(updatedPhotos.last.prompt?.caption, 'Finish line');
  });
}

class _SilentErrorLogger extends ErrorLogger {
  _SilentErrorLogger() : super(crashReporter: null, shouldReportErrors: false);

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {}
}
