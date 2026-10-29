import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/launch_access_repository.dart';
import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('LaunchAccessController', () {
    test('edits and submits the current user application draft', () async {
      final repository = FakeLaunchAccessRepository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          launchAccessRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      LaunchAccessController.submitMutation.reset(container);

      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      await container.pump();
      uidSubscription.close();
      final controller = container.read(launchAccessControllerProvider.notifier)
        ..setCity('mumbai')
        ..setRole(LaunchAccessRole.both)
        ..setEventTypes({LaunchAccessEventType.runClub})
        ..setAvailabilityWindows({
          LaunchAccessAvailabilityWindow.sundayMornings,
        })
        ..setInviteCode('HOST-1')
        ..setInstagramHandle('catchrunner')
        ..setWhyCatch('I want a warmer way to meet people.');

      await controller.submit();

      expect(repository.lastUid, 'runner-1');
      expect(repository.lastDraft, isNotNull);
      expect(repository.lastDraft!.city, 'mumbai');
      expect(repository.lastDraft!.role, LaunchAccessRole.both);
      expect(repository.lastDraft!.inviteCode, 'HOST-1');
    });

    test('draft resets after route listener disposal', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final subscription = container.listen(
        launchAccessControllerProvider,
        (_, _) {},
      );
      container.read(launchAccessControllerProvider.notifier).setCity('mumbai');
      expect(subscription.read().city, 'mumbai');

      subscription.close();
      await container.pump();

      expect(container.read(launchAccessControllerProvider).city, isEmpty);
    });
  });
}

class FakeLaunchAccessRepository extends Fake
    implements LaunchAccessRepository {
  String? lastUid;
  LaunchAccessApplicationDraft? lastDraft;

  @override
  Future<void> submitApplication({
    required String uid,
    required LaunchAccessApplicationDraft draft,
  }) async {
    lastUid = uid;
    lastDraft = draft;
  }
}
