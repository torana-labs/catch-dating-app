import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/safety/presentation/settings_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../auth/auth_test_helpers.dart';

Future<void> _primeUidProvider(ProviderContainer container) async {
  final uidSubscription = container.listen(
    uidProvider,
    (_, _) {},
    fireImmediately: true,
  );
  addTearDown(uidSubscription.close);
  await container.pump();
}

void main() {
  test('savePreference writes the selected settings field', () async {
    final userRepository = _SettingsUserProfileRepository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        userProfileRepositoryProvider.overrideWith((ref) => userRepository),
      ],
    );
    addTearDown(container.dispose);
    await _primeUidProvider(container);

    await container
        .read(settingsControllerProvider.notifier)
        .savePreference(
          preference: SettingsPreference.weeklyDigest,
          value: true,
        );

    expect(userRepository.updatedUid, 'runner-1');
    expect(userRepository.updatedFields, {'prefsWeeklyDigest': true});
  });

  test(
    'Cross Paths preference uses the private global-consent field',
    () async {
      final userRepository = _SettingsUserProfileRepository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          userProfileRepositoryProvider.overrideWith((ref) => userRepository),
        ],
      );
      addTearDown(container.dispose);
      await _primeUidProvider(container);

      await container
          .read(settingsControllerProvider.notifier)
          .savePreference(
            preference: SettingsPreference.showInCrossPaths,
            value: true,
          );

      expect(userRepository.updatedFields, {'prefsShowInCrossPaths': true});
    },
  );

  test(
    'one active settings write freezes every controller write domain',
    () async {
      final updateCompleter = Completer<void>();
      final userRepository = _SettingsUserProfileRepository(
        updateCompleter: updateCompleter,
      );
      final safetyRepository = _FakeSafetyRepository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          userProfileRepositoryProvider.overrideWith((ref) => userRepository),
          safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
        ],
      );
      addTearDown(container.dispose);
      await _primeUidProvider(container);
      final controllerSubscription = container.listen(
        settingsControllerProvider,
        (_, _) {},
      );
      addTearDown(controllerSubscription.close);

      final controller = container.read(settingsControllerProvider.notifier);
      final first = controller.savePreference(
        preference: SettingsPreference.weeklyDigest,
        value: true,
      );
      final overlapping = controller.unblockUser(targetUserId: 'blocked-1');

      expect(identical(first, overlapping), isTrue);
      expect(userRepository.updateCallCount, 1);
      expect(safetyRepository.unblockedUserId, isNull);

      updateCompleter.complete();
      await Future.wait([first, overlapping]);
      await container.pump();

      await controller.unblockUser(targetUserId: 'blocked-1');
      expect(safetyRepository.unblockedUserId, 'blocked-1');
    },
  );

  test('unblockUser delegates to SafetyRepository', () async {
    final safetyRepository = _FakeSafetyRepository();
    final container = ProviderContainer(
      overrides: [
        safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
      ],
    );
    addTearDown(container.dispose);

    await container
        .read(settingsControllerProvider.notifier)
        .unblockUser(targetUserId: 'blocked-1');

    expect(safetyRepository.unblockedUserId, 'blocked-1');
  });

  test(
    'requestAccountDeletion clears local flow state after repository call',
    () async {
      final safetyRepository = _FakeSafetyRepository();
      final authRepository = FakeAuthRepository();
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
        ],
      );
      addTearDown(authRepository.dispose);
      addTearDown(container.dispose);

      await container
          .read(settingsControllerProvider.notifier)
          .requestAccountDeletion();

      expect(safetyRepository.requestDeletionCallCount, 1);
    },
  );

  test('watchBlockedUsersProvider auto-disposes settings listeners', () async {
    final blockedUsers = [
      BlockedUser(
        uid: 'blocked-1',
        source: 'settings',
        createdAt: DateTime(2026, 5, 6),
      ),
    ];
    final cancelCompleter = Completer<void>();
    final blockedUsersController = StreamController<List<BlockedUser>>(
      onCancel: () {
        if (!cancelCompleter.isCompleted) cancelCompleter.complete();
      },
    );
    addTearDown(() async {
      if (!cancelCompleter.isCompleted) await blockedUsersController.close();
    });
    final safetyRepository = _FakeSafetyRepository(
      blockedUsersStream: blockedUsersController.stream,
    );
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
      ],
    );
    addTearDown(container.dispose);
    await _primeUidProvider(container);

    final subscription = container.listen(watchBlockedUsersProvider, (_, _) {});

    blockedUsersController.add(blockedUsers);
    await container.pump();
    expect(subscription.read().value, blockedUsers);

    subscription.close();
    await container.pump();

    await expectLater(cancelCompleter.future, completes);
  });

  test('watchBlockedUsersProvider propagates uid auth errors', () async {
    final error = StateError('auth failed');
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(
          AsyncError<String?>(error, StackTrace.empty),
        ),
      ],
    );
    addTearDown(container.dispose);

    final subscription = container.listen(
      watchBlockedUsersProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(subscription.close);
    await container.pump();

    expect(subscription.read().hasError, isTrue);
    expect(subscription.read().error, same(error));
  });
}

class _SettingsUserProfileRepository extends Fake
    implements UserProfileRepository {
  _SettingsUserProfileRepository({this.updateCompleter});

  final Completer<void>? updateCompleter;
  int updateCallCount = 0;
  String? updatedUid;
  Map<String, dynamic>? updatedFields;

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update_profile',
  }) async {
    updateCallCount += 1;
    updatedUid = uid;
    updatedFields = Map<String, dynamic>.from(patch.toFieldsJson());
    await updateCompleter?.future;
  }
}

class _FakeSafetyRepository extends Fake implements SafetyRepository {
  _FakeSafetyRepository({this.blockedUsersStream});

  final Stream<List<BlockedUser>>? blockedUsersStream;
  int requestDeletionCallCount = 0;
  String? unblockedUserId;

  @override
  Stream<List<BlockedUser>> watchBlockedUsers({required String uid}) =>
      blockedUsersStream ?? const Stream.empty();

  @override
  Future<void> requestAccountDeletion() async {
    requestDeletionCallCount += 1;
  }

  @override
  Future<void> unblockUser({required String targetUserId}) async {
    unblockedUserId = targetUserId;
  }
}
