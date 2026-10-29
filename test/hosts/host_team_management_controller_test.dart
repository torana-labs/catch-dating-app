import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/host_team_management_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../clubs/clubs_test_helpers.dart';

void main() {
  group('HostTeamManagementController', () {
    test('forwards owner host-management actions to the repository', () async {
      final fakeRepository = FakeClubsRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          uidProvider.overrideWith((ref) => Stream.value('owner-1')),
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

      final controller = container.read(
        hostTeamManagementControllerProvider.notifier,
      );
      await controller.addHostByPhone(
        clubId: 'club-1',
        phoneNumber: '98765 43210',
      );
      await controller.removeHost(clubId: 'club-1', uid: 'host-2');
      await controller.transferOwnership(clubId: 'club-1', uid: 'host-2');

      expect(fakeRepository.addedHostClubId, 'club-1');
      expect(fakeRepository.addedHostPhoneNumber, '98765 43210');
      expect(fakeRepository.removedHostClubId, 'club-1');
      expect(fakeRepository.removedHostUid, 'host-2');
      expect(fakeRepository.transferredOwnershipClubId, 'club-1');
      expect(fakeRepository.transferredOwnershipUid, 'host-2');
    });
  });
}
