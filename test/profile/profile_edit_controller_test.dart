import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/user_profile/presentation/profile_edit_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../support/profile_test_helpers.dart';

void main() {
  group('ProfileEditController', () {
    test('skips empty patches before enqueueing a profile save', () async {
      final repository = FakeProfileRepository();
      final errorLogger = SilentErrorLogger();
      final container = _container(
        repository: repository,
        errorLogger: errorLogger,
        uid: 'runner-1',
      );
      addTearDown(container.dispose);
      final controllerSubscription = container.listen(
        profileEditControllerProvider,
        (_, _) {},
      );
      addTearDown(controllerSubscription.close);

      await container
          .read(profileEditControllerProvider.notifier)
          .saveFields(UpdateUserProfilePatch.raw(const {}));

      expect(repository.updatedPatches, isEmpty);
    });

    test('does not run queued profile saves after the uid changes', () async {
      final errorLogger = SilentErrorLogger();
      final repository = FakeProfileRepository()
        ..updateCompleter = Completer<void>();
      final container = _container(
        repository: repository,
        errorLogger: errorLogger,
        uid: 'runner-1',
      );
      addTearDown(container.dispose);
      final controllerSubscription = container.listen(
        profileEditControllerProvider,
        (_, _) {},
      );
      addTearDown(controllerSubscription.close);

      final controller = container.read(profileEditControllerProvider.notifier);
      final firstSave = controller.saveFields(
        UpdateUserProfilePatch(displayName: 'Asha'),
      );
      await waitForRepositoryUpdates(repository, 1);

      final secondSave = controller.saveFields(
        UpdateUserProfilePatch(name: 'Different user name'),
      );
      _updateUid(
        container,
        repository: repository,
        errorLogger: errorLogger,
        uid: 'runner-2',
      );

      repository.updateCompleter?.complete();

      await firstSave;
      await expectLater(secondSave, throwsA(isA<BackendOperationException>()));
      expect(repository.updatedUids, ['runner-1']);
      expect(repository.updatedPatches, hasLength(1));
    });

    test('latest profile saves preserve earlier nested queued edits', () async {
      final errorLogger = SilentErrorLogger();
      final initialProfile = buildUser();
      final repository = FakeProfileRepository()
        ..latestProfile = initialProfile
        ..updateCompleter = Completer<void>();
      final container = _container(
        repository: repository,
        errorLogger: errorLogger,
        uid: 'runner-1',
      );
      addTearDown(container.dispose);
      final controllerSubscription = container.listen(
        profileEditControllerProvider,
        (_, _) {},
      );
      addTearDown(controllerSubscription.close);

      final controller = container.read(profileEditControllerProvider.notifier);
      final firstSave = controller.saveFieldsFromLatest((latest) {
        return UpdateUserProfilePatch(
          activityPreferences: latest.activityPreferences.copyWith(
            running: latest.runningPreferences.copyWith(
              preferredDistances: const [PreferredDistance.fiveK],
              version: currentRunPreferencesVersion,
            ),
          ),
        );
      });
      await waitForRepositoryUpdates(repository, 1);

      final secondSave = controller.saveFieldsFromLatest((latest) {
        return UpdateUserProfilePatch(
          activityPreferences: latest.activityPreferences.copyWith(
            running: latest.runningPreferences.copyWith(
              runningReasons: const [RunReason.social],
              version: currentRunPreferencesVersion,
            ),
          ),
        );
      });

      repository.updateCompleter?.complete();

      await firstSave;
      await secondSave;

      expect(repository.fetchCount, 2);
      expect(repository.updatedPatches, hasLength(2));
      expect(repository.latestProfile?.preferredDistances, [
        PreferredDistance.fiveK,
      ]);
      expect(repository.latestProfile?.runningReasons, [RunReason.social]);
    });
  });
}

ProviderContainer _container({
  required FakeProfileRepository repository,
  required SilentErrorLogger errorLogger,
  required String uid,
}) => ProviderContainer(
  overrides: [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    errorLoggerProvider.overrideWithValue(errorLogger),
    userProfileRepositoryProvider.overrideWithValue(repository),
  ],
);

void _updateUid(
  ProviderContainer container, {
  required FakeProfileRepository repository,
  required SilentErrorLogger errorLogger,
  required String uid,
}) {
  container.updateOverrides([
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    errorLoggerProvider.overrideWithValue(errorLogger),
    userProfileRepositoryProvider.overrideWithValue(repository),
  ]);
}
