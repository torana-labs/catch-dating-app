import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_team_management_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart';

void main() {
  group('HostTeamManagementController', () {
    test('forwards owner host-management actions to the repository', () async {
      final fakeRepository = FakeOrganizersRepository();
      final container = ProviderContainer(
        overrides: [
          organizersRepositoryProvider.overrideWith((ref) => fakeRepository),
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
        organizerId: 'club-1',
        phoneNumber: '98765 43210',
      );
      await controller.removeHost(organizerId: 'club-1', uid: 'host-2');
      await controller.transferOwnership(organizerId: 'club-1', uid: 'host-2');

      expect(fakeRepository.addedHostOrganizerId, 'club-1');
      expect(fakeRepository.addedHostPhoneNumber, '98765 43210');
      expect(fakeRepository.removedHostOrganizerId, 'club-1');
      expect(fakeRepository.removedHostUid, 'host-2');
      expect(fakeRepository.transferredOwnershipOrganizerId, 'club-1');
      expect(fakeRepository.transferredOwnershipUid, 'host-2');
    });
  });
}
